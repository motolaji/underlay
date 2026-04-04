"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { erc20Abi } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { WorldIdVerifyButton } from "@/components/world/WorldIdVerifyButton";
import { POSITION_RULES, TESTNET_VAULT_CONFIG } from "@/lib/constants";
import { buildRiskEngineSubmission } from "@/lib/contracts/adapters/riskEngine";
import { riskEngineAbi } from "@/lib/contracts/abi/riskEngine";
import { contractAddresses } from "@/lib/contracts/addresses";
import {
  formatCountLabel,
  formatUsdc,
  parseUsdcInput,
  shortenHash,
} from "@/lib/format";
import { calculateQuote } from "@/lib/pricing";
import { reownConfigured } from "@/lib/wagmi";
import { useSlipValidation } from "@/hooks/useSlipValidation";
import { useVaultStateQuery } from "@/hooks/queries/useVaultStateQuery";
import { useSlipStore } from "@/stores/slipStore";
import type {
  RiskAssessmentRequestDto,
  RiskAssessmentResponseDto,
} from "@/types/dto";
import type { VaultCategory } from "@/types/domain";

const stakePresets = ["1", "2"];

export function CartDrawer() {
  const { address, isConnected } = useAccount();
  const {
    selectedLegs,
    stakeInput,
    risk,
    worldIdProof,
    worldIdVerified,
    submissionStatus,
    submissionError,
    lastSubmissionHash,
    setStakeInput,
    removeLeg,
    clearLegs,
    setValidation,
    setRisk,
    setWorldIdProof,
    setWorldIdVerified,
    setSubmissionState,
  } = useSlipStore();

  const validation = useSlipValidation(selectedLegs, stakeInput);
  const vaultStateQuery = useVaultStateQuery();
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [txMode, setTxMode] = useState<"approve" | "submit" | null>(null);
  const [optimisticAllowance, setOptimisticAllowance] = useState<bigint>(0n);
  const [autoSubmitAfterApproval, setAutoSubmitAfterApproval] = useState(false);

  const usdcAddress = contractAddresses.baseSepolia.usdc;
  const riskEngineAddress = contractAddresses.baseSepolia.riskEngine;

  const parsedStake = useMemo(() => {
    try {
      return parseUsdcInput(stakeInput || "0");
    } catch {
      return 0n;
    }
  }, [stakeInput]);

  const routeCategory = useMemo<VaultCategory>(() => {
    const categories = new Set(selectedLegs.map((leg) => leg.category));

    if (categories.size === 1) {
      const [singleCategory] = Array.from(categories);
      if (singleCategory === "other") {
        return "mixed";
      }

      return singleCategory as VaultCategory;
    }

    return "mixed";
  }, [selectedLegs]);

  const utilization = useMemo(() => {
    const liveState = vaultStateQuery.data as
      | { utilizationBps?: bigint }
      | undefined;

    if (!liveState?.utilizationBps) {
      return 0;
    }

    return Number(liveState.utilizationBps) / 10_000;
  }, [vaultStateQuery.data]);

  const availableLiabilityRaw = useMemo(() => {
    const liveState = vaultStateQuery.data as
      | { availableLiability?: bigint }
      | undefined;

    return liveState?.availableLiability ?? 0n;
  }, [vaultStateQuery.data]);

  const quote = useMemo(() => {
    return calculateQuote({
      legs: selectedLegs,
      stake: Number(parsedStake) / 1_000_000,
      utilization,
      riskScore: risk?.riskScore ?? 0,
    });
  }, [parsedStake, risk?.riskScore, selectedLegs, utilization]);

  const quotePayoutRaw = useMemo(() => {
    if (!quote) {
      return 0n;
    }

    return BigInt(Math.round(quote.payout * 1_000_000));
  }, [quote]);

  const allowanceQuery = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && riskEngineAddress ? [address, riskEngineAddress] : undefined,
    query: {
      enabled: Boolean(usdcAddress && address && riskEngineAddress),
      staleTime: 10_000,
    },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const receiptQuery = useWaitForTransactionReceipt({ hash: txHash });

  const worldIdRequired = parsedStake > TESTNET_VAULT_CONFIG.worldIdGateRaw;
  const currentAllowance = allowanceQuery.data ?? 0n;
  const effectiveAllowance =
    optimisticAllowance > currentAllowance
      ? optimisticAllowance
      : currentAllowance;
  const needsApproval = parsedStake > 0n && effectiveAllowance < parsedStake;
  const requiresWorldIdStep = worldIdRequired && !worldIdVerified;
  const liabilityBlockedReason = useMemo(() => {
    if (!quote || parsedStake === 0n) {
      return null;
    }

    if (availableLiabilityRaw === 0n) {
      return "Vault temporarily full. Add LP capital or wait for settlement before placing another position.";
    }

    if (quotePayoutRaw > availableLiabilityRaw) {
      return `This quote needs ${formatUsdc(
        quotePayoutRaw
      )} of liability, but only ${formatUsdc(
        availableLiabilityRaw
      )} is available.`;
    }

    return null;
  }, [availableLiabilityRaw, parsedStake, quote, quotePayoutRaw]);

  const canRequestRisk =
    validation.canRequestRisk && selectedLegs.length > 0 && parsedStake > 0n;
  const canSubmit =
    isConnected &&
    Boolean(address) &&
    Boolean(riskEngineAddress) &&
    Boolean(usdcAddress) &&
    Boolean(risk) &&
    Boolean(quote) &&
    !needsApproval &&
    !liabilityBlockedReason &&
    validation.blockingReasons.length === 0 &&
    (!worldIdRequired || Boolean(worldIdProof));

  useEffect(() => {
    setValidation(validation);
  }, [setValidation, validation]);

  useEffect(() => {
    if (!worldIdRequired) {
      setWorldIdProof(null);
      setWorldIdVerified(false);
    }
  }, [setWorldIdProof, setWorldIdVerified, worldIdRequired]);

  useEffect(() => {
    setOptimisticAllowance(0n);
    setAutoSubmitAfterApproval(false);
  }, [address, parsedStake]);

  useEffect(() => {
    if (!canRequestRisk) {
      setRisk(null);
      setRiskError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setRiskLoading(true);
      setRiskError(null);

      try {
        const payload: RiskAssessmentRequestDto = {
          walletAddress: (address ??
            "0x0000000000000000000000000000000000000000") as `0x${string}`,
          routeCategory,
          selectedLegs,
          stakeRaw: parsedStake.toString(),
        };

        const response = await fetch("/api/risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const body = (await response.json()) as
          | RiskAssessmentResponseDto
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            (body as { error?: string }).error ?? "Risk scoring failed."
          );
        }

        if ("error" in body && typeof body.error === "string") {
          throw new Error(body.error);
        }

        setRisk(body as RiskAssessmentResponseDto);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setRisk(null);
        setRiskError(
          error instanceof Error ? error.message : "Risk scoring failed."
        );
      } finally {
        if (!controller.signal.aborted) {
          setRiskLoading(false);
        }
      }
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [
    address,
    canRequestRisk,
    parsedStake,
    routeCategory,
    selectedLegs,
    setRisk,
  ]);

  const handleSubmit = useCallback(async () => {
    if (
      !riskEngineAddress ||
      !risk ||
      !quote ||
      !address ||
      liabilityBlockedReason
    ) {
      return;
    }

    try {
      setSubmissionState("submitting", undefined, null);
      const payload = buildRiskEngineSubmission({
        selectedLegs,
        stakeRaw: parsedStake,
        quote,
        risk,
        worldIdProof,
      });

      setTxMode("submit");
      const hash = await writeContractAsync({
        address: riskEngineAddress,
        abi: riskEngineAbi,
        functionName: "submitPosition",
        args: [
          payload.marketIds,
          payload.outcomes,
          payload.lockedOdds,
          payload.resolutionTimes,
          payload.stake,
          payload.combinedOdds,
          payload.riskTier,
          payload.riskAuditHash,
          payload.aiStakeLimit,
          payload.root,
          payload.nullifierHash,
          payload.proof,
        ],
      });
      setTxHash(hash);
    } catch (error) {
      setSubmissionState(
        "error",
        undefined,
        error instanceof Error ? error.message : "Position submission failed."
      );
      setTxMode(null);
    }
  }, [
    address,
    parsedStake,
    quote,
    risk,
    riskEngineAddress,
    selectedLegs,
    setSubmissionState,
    worldIdProof,
    liabilityBlockedReason,
    writeContractAsync,
  ]);

  useEffect(() => {
    if (!receiptQuery.isSuccess || !txMode) {
      return;
    }

    if (txMode === "approve") {
      setOptimisticAllowance(parsedStake);
      setSubmissionState("idle");
      setTxHash(undefined);
      setTxMode(null);
      setAutoSubmitAfterApproval(true);
      void allowanceQuery.refetch();
      return;
    }

    setSubmissionState("success", txHash);
    setTxMode(null);
  }, [
    allowanceQuery,
    parsedStake,
    receiptQuery.isSuccess,
    setSubmissionState,
    txHash,
    txMode,
  ]);

  useEffect(() => {
    if (!autoSubmitAfterApproval || txMode || isPending) {
      return;
    }

    if (!canSubmit) {
      return;
    }

    setAutoSubmitAfterApproval(false);
    void handleSubmit();
  }, [autoSubmitAfterApproval, canSubmit, handleSubmit, isPending, txMode]);

  const maxAllowedStakeRaw = useMemo(() => {
    if (!risk) {
      return TESTNET_VAULT_CONFIG.maxStakeRaw;
    }

    return BigInt(risk.maxAllowedStakeRaw);
  }, [risk]);

  async function handleApprove() {
    if (!usdcAddress || !riskEngineAddress || parsedStake === 0n) {
      return;
    }

    try {
      setSubmissionState("approving", undefined, null);
      setTxMode("approve");
      const hash = await writeContractAsync({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [riskEngineAddress, parsedStake],
      });
      setTxHash(hash);
    } catch (error) {
      setSubmissionState(
        "error",
        undefined,
        error instanceof Error ? error.message : "Approval failed."
      );
      setTxMode(null);
    }
  }

  return (
    <aside className="flex h-full flex-col border-l border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]">
      <div className="border-b border-[color:var(--border-subtle)] px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Betslip</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-[color:var(--text-primary)]">
              {selectedLegs.length === 0
                ? "Add outcomes"
                : formatCountLabel(
                    selectedLegs.length,
                    POSITION_RULES.maxLegsPerPosition
                  )}
            </p>
          </div>
          {selectedLegs.length > 0 && (
            <button
              type="button"
              onClick={clearLegs}
              className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-secondary)]"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {selectedLegs.length === 0 ? (
          <div className="border border-dashed border-[color:var(--border-default)] p-4">
            <p className="text-sm leading-7 text-[color:var(--text-tertiary)]">
              Select outcomes from the market browser to build a multi-leg
              position.
            </p>
          </div>
        ) : (
          <>
            {quote && (
              <div className="border border-[color:var(--border-subtle)] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                    Combined odds
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[color:var(--text-primary)]">
                    {quote.combinedOdds.toFixed(2)}x
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {selectedLegs.map((leg) => (
                <div
                  key={`${leg.marketId}:${leg.outcomeId}`}
                  className="border border-[color:var(--border-subtle)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                        {leg.category}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">
                        {leg.outcomeLabel}
                      </p>
                      <p className="mt-0.5 truncate text-xs leading-5 text-[color:var(--text-secondary)]">
                        {leg.question}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                          Implied
                        </span>
                        <span className="font-mono text-[10px] text-[color:var(--text-primary)]">
                          {Math.round(leg.referenceProbability * 100)}%
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLeg(leg.marketId, leg.outcomeId)}
                      className="shrink-0 font-mono text-[10px] text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--accent-red)]"
                    >
                      x
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border border-[color:var(--border-subtle)] p-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
              Stake (USDC)
            </span>
            <input
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              placeholder="0.00"
              className="focus-ring mt-2 w-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 py-2.5 font-mono text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)]"
            />
            <p className="mt-1 font-mono text-[10px] text-[color:var(--text-tertiary)]">
              Max: {formatUsdc(maxAllowedStakeRaw)}
            </p>
          </label>

          <div className="mt-3 flex gap-1.5">
            {stakePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setStakeInput(preset)}
                className="border border-[color:var(--border-default)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {quote && parsedStake > 0n && (
          <div className="border border-[color:var(--border-subtle)] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Potential payout
              </span>
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[color:var(--text-primary)]">
                ${quote.payout.toFixed(2)}
              </span>
            </div>
            {quote.payoutCapped && (
              <p className="mt-1.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                Capped at {formatUsdc(TESTNET_VAULT_CONFIG.maxPayoutRaw)}
              </p>
            )}
          </div>
        )}

        <div className="border border-[color:var(--border-subtle)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                AI risk assessment
              </p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                {riskLoading
                  ? "Scoring with 0G compute..."
                  : risk
                  ? `${risk.riskTier} tier · ${
                      risk.source === "0g_compute"
                        ? "0G compute"
                        : "fallback model"
                    }`
                  : "Enter a valid stake to score this position."}
              </p>
            </div>
            {risk && (
              <span className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-primary)]">
                {risk.riskTier}
              </span>
            )}
          </div>

          {risk && (
            <>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                  Settlement delay
                </span>
                <span className="font-mono text-[10px] text-[color:var(--text-primary)]">
                  {risk.riskTier === "LOW"
                    ? "15 min"
                    : risk.riskTier === "MEDIUM"
                    ? "1 hour"
                    : "24 hours"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                  Audit receipt
                </span>
                <span className="font-mono text-[10px] text-[color:var(--text-primary)]">
                  {risk.audit.provider === "0g-storage"
                    ? "0G stored"
                    : "Local hash"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[color:var(--text-secondary)]">
                {risk.explanation.headline}
              </p>
            </>
          )}

          {riskError && (
            <p className="mt-3 text-xs leading-5 text-[color:var(--accent-red)]">
              {riskError}
            </p>
          )}
        </div>

        {worldIdRequired && (
          <div className="border border-[color:var(--border-subtle)] p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
              World ID
            </p>
            <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)]">
              Stakes above {formatUsdc(TESTNET_VAULT_CONFIG.worldIdGateRaw)}{" "}
              require World ID proof.
            </p>
            {worldIdVerified ? (
              <p className="mt-3 text-sm text-[color:var(--data-positive)]">
                World ID proof captured.
              </p>
            ) : address ? (
              <div className="mt-3 rounded-sm border border-[color:rgba(217,119,6,0.2)] bg-[color:rgba(217,119,6,0.06)] p-3 text-xs leading-5 text-[color:var(--text-secondary)]">
                Verify with World ID below before approving or placing a
                position.
              </div>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
                Connect a wallet to verify.
              </p>
            )}
          </div>
        )}

        {validation.blockingReasons.length > 0 && (
          <div className="border border-[color:var(--badge-warning-border)] bg-[color:var(--badge-warning-bg)] p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--badge-warning-text)]">
              Check
            </p>
            <ul className="mt-2 space-y-1.5">
              {validation.blockingReasons.map((reason) => (
                <li
                  key={reason}
                  className="text-xs leading-5 text-[color:var(--text-secondary)]"
                >
                  - {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {liabilityBlockedReason && (
          <div className="border border-[color:rgba(220,38,38,0.2)] bg-[color:rgba(220,38,38,0.06)] p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--risk-high)]">
              Vault capacity
            </p>
            <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)]">
              {liabilityBlockedReason}
            </p>
            <p className="mt-2 font-mono text-[10px] text-[color:var(--text-tertiary)]">
              Available liability: {formatUsdc(availableLiabilityRaw)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-[color:var(--border-subtle)] p-2.5">
            <p className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
              World ID gate
            </p>
            <p className="mt-1 font-mono text-xs text-[color:var(--text-primary)]">
              {formatUsdc(TESTNET_VAULT_CONFIG.worldIdGateRaw)}
            </p>
          </div>
          <div className="border border-[color:var(--border-subtle)] p-2.5">
            <p className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
              Risk approval
            </p>
            <p className="mt-1 font-mono text-xs text-[color:var(--text-primary)]">
              {requiresWorldIdStep
                ? "World ID first"
                : liabilityBlockedReason
                ? "Vault full"
                : needsApproval
                ? "Allowance needed"
                : "Ready"}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[color:var(--border-subtle)] px-4 py-4">
        {!reownConfigured ? (
          <p className="mb-3 text-sm text-[color:var(--text-secondary)]">
            Wallet connect requires `NEXT_PUBLIC_REOWN_PROJECT_ID`.
          </p>
        ) : null}

        {submissionError && (
          <p className="mb-3 text-sm text-[color:var(--risk-high)]">
            {submissionError}
          </p>
        )}

        {lastSubmissionHash && submissionStatus === "success" && (
          <div className="mb-3 border border-[color:rgba(22,163,74,0.2)] bg-[color:rgba(22,163,74,0.06)] p-3">
            <p className="text-sm text-[color:var(--text-primary)]">
              Position submitted successfully.
            </p>
            <p className="mt-1 font-mono text-[10px] text-[color:var(--text-secondary)]">
              Tx {shortenHash(lastSubmissionHash)}
            </p>
            <Link
              href="/app/positions"
              className="mt-2 inline-block text-sm text-[color:var(--accent-blue)]"
            >
              Open positions ledger
            </Link>
          </div>
        )}

        {requiresWorldIdStep ? (
          address ? (
            <WorldIdVerifyButton
              walletAddress={address}
              onVerified={(proof) => {
                setWorldIdProof(proof);
                setWorldIdVerified(true);
              }}
            />
          ) : (
            <button
              type="button"
              disabled
              className="w-full border border-[color:var(--border-default)] py-3 text-sm font-medium text-[color:var(--text-primary)] opacity-40"
            >
              Connect wallet to verify
            </button>
          )
        ) : needsApproval ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={
              !isConnected ||
              !reownConfigured ||
              !riskEngineAddress ||
              isPending ||
              parsedStake === 0n
            }
            className="w-full border border-[color:var(--border-default)] py-3 text-sm font-medium text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submissionStatus === "approving"
              ? "Approving USDC..."
              : "Approve USDC"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || !reownConfigured || isPending}
            className="w-full bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submissionStatus === "submitting"
              ? "Submitting position..."
              : "Place Position"}
          </button>
        )}
        <p className="mt-2 text-center font-mono text-[10px] text-[color:var(--text-tertiary)]">
          {requiresWorldIdStep
            ? "World ID verification is required before approval and submission."
            : liabilityBlockedReason
            ? "This vault has no remaining liability headroom for a new position."
            : autoSubmitAfterApproval
            ? "Approval confirmed. Submitting automatically..."
            : "Submissions are sent directly to the live RiskEngine on Base Sepolia."}
        </p>
      </div>
    </aside>
  );
}
