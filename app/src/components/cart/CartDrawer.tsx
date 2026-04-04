"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { POSITION_RULES, TESTNET_VAULT_CONFIG } from "@/lib/constants";
import { formatUsdc, parseUsdcInput } from "@/lib/format";
import { calculateQuote } from "@/lib/pricing";
import { useSlipValidation } from "@/hooks/useSlipValidation";
import { useVaultStateQuery } from "@/hooks/queries/useVaultStateQuery";
import { useSlipStore } from "@/stores/slipStore";
import type {
  RiskAssessmentRequestDto,
  RiskAssessmentResponseDto,
} from "@/types/dto";
import type { VaultCategory } from "@/types/domain";

const stakePresets = ["1", "2", "5"];

export function CartDrawer() {
  const { address } = useAccount();
  const {
    selectedLegs,
    stakeInput,
    risk,
    setStakeInput,
    removeLeg,
    clearLegs,
    setValidation,
    setRisk,
  } = useSlipStore();
  const validation = useSlipValidation(selectedLegs, stakeInput);
  const vaultStateQuery = useVaultStateQuery();
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

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
      | {
          utilizationBps?: bigint;
        }
      | undefined;

    if (!liveState?.utilizationBps) {
      return 0;
    }

    return Number(liveState.utilizationBps) / 10_000;
  }, [vaultStateQuery.data]);

  const quote = useMemo(() => {
    return calculateQuote({
      legs: selectedLegs,
      stake: Number(parsedStake) / 1_000_000,
      utilization,
      riskScore: risk?.riskScore ?? 0,
    });
  }, [parsedStake, risk?.riskScore, selectedLegs, utilization]);

  useEffect(() => {
    setValidation(validation);
  }, [setValidation, validation]);

  useEffect(() => {
    if (
      !validation.canRequestRisk ||
      parsedStake === 0n ||
      selectedLegs.length === 0
    ) {
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
          headers: {
            "Content-Type": "application/json",
          },
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
    parsedStake,
    routeCategory,
    selectedLegs,
    setRisk,
    validation.canRequestRisk,
  ]);

  const maxAllowedStakeRaw = useMemo(() => {
    if (!risk) {
      return TESTNET_VAULT_CONFIG.maxStakeRaw;
    }

    return BigInt(risk.maxAllowedStakeRaw);
  }, [risk]);

  return (
    <aside className="flex h-full flex-col border-l border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]">
      <div className="border-b border-[color:var(--border-subtle)] px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Betslip</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-[color:var(--text-primary)]">
              {selectedLegs.length === 0
                ? "Add outcomes"
                : `${selectedLegs.length} / ${POSITION_RULES.maxLegsPerPosition} legs`}
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
              {risk.explanation.factors.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {risk.explanation.factors.map((factor) => (
                    <li
                      key={factor.label}
                      className="text-xs leading-5 text-[color:var(--text-secondary)]"
                    >
                      <span className="font-medium text-[color:var(--text-primary)]">
                        {factor.label}:
                      </span>{" "}
                      {factor.value}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {riskError && (
            <p className="mt-3 text-xs leading-5 text-[color:var(--accent-red)]">
              {riskError}
            </p>
          )}
        </div>

        {validation && validation.blockingReasons.length > 0 && (
          <div className="border border-[color:rgba(217,119,6,0.25)] bg-[color:rgba(217,119,6,0.05)] p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:#fbbf24]">
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
              Vault utilisation
            </p>
            <p className="mt-1 font-mono text-xs text-[color:var(--text-primary)]">
              {(utilization * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[color:var(--border-subtle)] px-4 py-4">
        <button
          type="button"
          disabled={!risk || !quote || validation.blockingReasons.length > 0}
          className="w-full bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Place Position
        </button>
        <p className="mt-2 text-center font-mono text-[10px] text-[color:var(--text-tertiary)]">
          Contract write flow lands after address wiring and World ID frontend
          integration.
        </p>
      </div>
    </aside>
  );
}
