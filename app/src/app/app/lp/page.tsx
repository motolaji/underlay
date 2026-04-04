"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { erc20Abi, formatUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { TESTNET_VAULT_CONFIG } from "@/lib/constants";
import { contractAddresses } from "@/lib/contracts/addresses";
import { vaultManagerAbi } from "@/lib/contracts/abi/vaultManager";
import { formatUsdc, parseUsdcInput } from "@/lib/format";
import { reownConfigured } from "@/lib/wagmi";

function liabilityColor(pct: number) {
  if (pct < 30) return "var(--risk-low)";
  if (pct <= 70) return "var(--risk-medium)";
  return "var(--risk-high)";
}

export default function AppLpPage() {
  const { address, isConnected } = useAccount();
  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionHash, setActionHash] = useState<`0x${string}` | undefined>();
  const [actionLabel, setActionLabel] = useState<
    "approve" | "deposit" | "request" | "redeem" | null
  >(null);
  const [optimisticAllowance, setOptimisticAllowance] = useState<bigint>(0n);
  const [optimisticUserSharesDelta, setOptimisticUserSharesDelta] =
    useState<bigint>(0n);
  const [optimisticVaultAssetsDelta, setOptimisticVaultAssetsDelta] =
    useState<bigint>(0n);
  const [optimisticUsdcBalanceDelta, setOptimisticUsdcBalanceDelta] =
    useState<bigint>(0n);
  const [
    optimisticPendingWithdrawalShares,
    setOptimisticPendingWithdrawalShares,
  ] = useState<bigint>(0n);
  const [
    optimisticPendingWithdrawalAssets,
    setOptimisticPendingWithdrawalAssets,
  ] = useState<bigint>(0n);
  const [
    optimisticPendingUnlockTimestamp,
    setOptimisticPendingUnlockTimestamp,
  ] = useState<bigint>(0n);

  const vaultAddress = contractAddresses.baseSepolia.vaultManager;
  const usdcAddress = contractAddresses.baseSepolia.usdc;

  const vaultStateQuery = useReadContract({
    address: vaultAddress,
    abi: vaultManagerAbi,
    functionName: "getVaultState",
    query: {
      enabled: Boolean(vaultAddress),
      staleTime: 15_000,
    },
  });

  const userSharesQuery = useReadContract({
    address: vaultAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(vaultAddress && address),
      staleTime: 15_000,
    },
  });

  const userUsdcBalanceQuery = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(usdcAddress && address),
      staleTime: 15_000,
    },
  });

  const allowanceQuery = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && vaultAddress ? [address, vaultAddress] : undefined,
    query: {
      enabled: Boolean(usdcAddress && vaultAddress && address),
      staleTime: 15_000,
    },
  });

  const pendingWithdrawalQuery = useReadContract({
    address: vaultAddress,
    abi: vaultManagerAbi,
    functionName: "getPendingWithdrawal",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(vaultAddress && address),
      staleTime: 15_000,
    },
  });

  const maxRedeemQuery = useReadContract({
    address: vaultAddress,
    abi: vaultManagerAbi,
    functionName: "maxRedeem",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(vaultAddress && address),
      staleTime: 15_000,
    },
  });

  const maxWithdrawQuery = useReadContract({
    address: vaultAddress,
    abi: vaultManagerAbi,
    functionName: "maxWithdraw",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(vaultAddress && address),
      staleTime: 15_000,
    },
  });

  const withdrawalDelayQuery = useReadContract({
    address: vaultAddress,
    abi: vaultManagerAbi,
    functionName: "withdrawalDelay",
    query: {
      enabled: Boolean(vaultAddress),
      staleTime: 15_000,
    },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const receiptQuery = useWaitForTransactionReceipt({ hash: actionHash });

  const vaultState = vaultStateQuery.data as
    | {
        totalAssets?: bigint;
        totalSupply?: bigint;
        reserveAssets?: bigint;
        aaveDeployedAssets?: bigint;
        openLiability?: bigint;
        availableLiability?: bigint;
        sharePriceE18?: bigint;
        utilizationBps?: bigint;
        active?: boolean;
        withdrawalsBlocked?: boolean;
        aaveEnabled?: boolean;
      }
    | undefined;

  const pendingWithdrawal = pendingWithdrawalQuery.data as
    | readonly [bigint, bigint, bigint]
    | undefined;

  const depositRaw = useMemo(() => {
    try {
      return parseUsdcInput(depositInput || "0");
    } catch {
      return 0n;
    }
  }, [depositInput]);

  const withdrawSharesRaw = useMemo(() => {
    try {
      return parseUsdcInput(withdrawInput || "0");
    } catch {
      return 0n;
    }
  }, [withdrawInput]);

  const totalAssets = vaultState?.totalAssets ?? 0n;
  const totalSupply = vaultState?.totalSupply ?? 0n;
  const sharePriceE18 = vaultState?.sharePriceE18 ?? 1_000_000_000_000_000_000n;
  const userShares = (userSharesQuery.data ?? 0n) + optimisticUserSharesDelta;
  const userUsdcBalance =
    (userUsdcBalanceQuery.data ?? 0n) + optimisticUsdcBalanceDelta;
  const currentAllowance = allowanceQuery.data ?? 0n;
  const allowance =
    optimisticAllowance > currentAllowance
      ? optimisticAllowance
      : currentAllowance;
  const userValueRaw =
    (userShares * sharePriceE18) / 1_000_000_000_000_000_000n;
  const estimatedShares =
    depositRaw > 0n
      ? totalAssets === 0n || totalSupply === 0n
        ? depositRaw
        : (depositRaw * totalSupply) / totalAssets
      : 0n;
  const needsApproval = depositRaw > 0n && allowance < depositRaw;
  const canDeposit =
    isConnected &&
    Boolean(vaultAddress) &&
    Boolean(usdcAddress) &&
    depositRaw > 0n &&
    userUsdcBalance >= depositRaw;
  const pendingWithdrawalAssets = pendingWithdrawal?.[0] ?? 0n;
  const pendingWithdrawalShares = pendingWithdrawal?.[1] ?? 0n;
  const pendingUnlockTimestamp = pendingWithdrawal?.[2] ?? 0n;
  const displayPendingWithdrawalAssets =
    optimisticPendingWithdrawalAssets > pendingWithdrawalAssets
      ? optimisticPendingWithdrawalAssets
      : pendingWithdrawalAssets;
  const displayPendingWithdrawalShares =
    optimisticPendingWithdrawalShares > pendingWithdrawalShares
      ? optimisticPendingWithdrawalShares
      : pendingWithdrawalShares;
  const displayPendingUnlockTimestamp =
    optimisticPendingUnlockTimestamp > pendingUnlockTimestamp
      ? optimisticPendingUnlockTimestamp
      : pendingUnlockTimestamp;
  const maxRedeemShares = maxRedeemQuery.data ?? 0n;
  const maxWithdrawAssets = maxWithdrawQuery.data ?? 0n;
  const withdrawalDelay = withdrawalDelayQuery.data ?? 0n;
  const canRequestWithdrawal =
    isConnected &&
    Boolean(vaultAddress) &&
    withdrawSharesRaw > 0n &&
    withdrawSharesRaw <= userShares;
  const canRedeem =
    isConnected &&
    Boolean(vaultAddress) &&
    Boolean(address) &&
    maxRedeemShares > 0n &&
    pendingWithdrawalShares > 0n;

  const utilisationPct = Number(vaultState?.utilizationBps ?? 0n) / 100;
  const reserveRatioPct =
    totalAssets === 0n || !vaultState?.reserveAssets
      ? TESTNET_VAULT_CONFIG.reserveBps / 100
      : Number((vaultState.reserveAssets * 10_000n) / totalAssets) / 100;

  async function handleApprove() {
    if (!usdcAddress || !vaultAddress || !canDeposit) {
      return;
    }

    try {
      setActionError(null);
      setActionLabel("approve");
      const hash = await writeContractAsync({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultAddress, depositRaw],
      });
      setActionHash(hash);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Approve failed."
      );
    }
  }

  const handleDeposit = useCallback(async () => {
    if (!vaultAddress || !address || !canDeposit || needsApproval) {
      return;
    }

    try {
      setActionError(null);
      setActionLabel("deposit");
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: vaultManagerAbi,
        functionName: "deposit",
        args: [depositRaw, address],
      });
      setActionHash(hash);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Deposit failed."
      );
    }
  }, [
    address,
    canDeposit,
    needsApproval,
    depositRaw,
    vaultAddress,
    writeContractAsync,
  ]);

  async function handleRequestWithdrawal() {
    if (!vaultAddress || !canRequestWithdrawal) {
      return;
    }

    try {
      setActionError(null);
      setActionLabel("request");
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: vaultManagerAbi,
        functionName: "requestWithdrawal",
        args: [withdrawSharesRaw],
      });
      setActionHash(hash);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Withdrawal request failed."
      );
    }
  }

  async function handleRedeem() {
    if (!vaultAddress || !address || !canRedeem) {
      return;
    }

    try {
      setActionError(null);
      setActionLabel("redeem");
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: vaultManagerAbi,
        functionName: "redeem",
        args: [maxRedeemShares, address, address],
      });
      setActionHash(hash);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Redeem failed.");
    }
  }

  const pendingMessage =
    actionLabel === "approve"
      ? "Approval pending..."
      : actionLabel === "deposit"
      ? "Deposit pending..."
      : actionLabel === "request"
      ? "Withdrawal request pending..."
      : actionLabel === "redeem"
      ? "Withdrawal completion pending..."
      : null;

  const transactionComplete = receiptQuery.isSuccess;

  useEffect(() => {
    if (!transactionComplete) {
      return;
    }

    if (actionLabel === "approve") {
      setOptimisticAllowance(depositRaw);
      setActionLabel(null);
      setActionHash(undefined);
      void allowanceQuery.refetch();
      return;
    }

    if (actionLabel === "deposit") {
      setOptimisticUserSharesDelta((value) => value + estimatedShares);
      setOptimisticVaultAssetsDelta((value) => value + depositRaw);
      setOptimisticUsdcBalanceDelta((value) => value - depositRaw);
      setDepositInput("");
      setOptimisticAllowance(0n);
    }

    if (actionLabel === "request") {
      setOptimisticPendingWithdrawalShares(withdrawSharesRaw);
      setOptimisticPendingWithdrawalAssets(
        (withdrawSharesRaw * sharePriceE18) / 1_000_000_000_000_000_000n
      );
      setOptimisticPendingUnlockTimestamp(
        BigInt(Math.floor(Date.now() / 1000)) + withdrawalDelay
      );
      setWithdrawInput("");
    }

    if (actionLabel === "redeem") {
      setOptimisticUserSharesDelta((value) => value - maxRedeemShares);
      setOptimisticVaultAssetsDelta((value) => value - maxWithdrawAssets);
      setOptimisticUsdcBalanceDelta((value) => value + maxWithdrawAssets);
      setOptimisticPendingWithdrawalShares(0n);
      setOptimisticPendingWithdrawalAssets(0n);
      setOptimisticPendingUnlockTimestamp(0n);
      setWithdrawInput("");
    }

    setActionLabel(null);
    setActionHash(undefined);
    void vaultStateQuery.refetch();
    void userSharesQuery.refetch();
    void userUsdcBalanceQuery.refetch();
    void allowanceQuery.refetch();
    void pendingWithdrawalQuery.refetch();
    void maxRedeemQuery.refetch();
    void maxWithdrawQuery.refetch();
  }, [
    actionLabel,
    allowanceQuery,
    depositRaw,
    maxRedeemQuery,
    maxWithdrawQuery,
    pendingWithdrawalQuery,
    estimatedShares,
    sharePriceE18,
    transactionComplete,
    userSharesQuery,
    userUsdcBalanceQuery,
    vaultStateQuery,
    withdrawSharesRaw,
    maxRedeemShares,
    maxWithdrawAssets,
    withdrawalDelay,
  ]);

  useEffect(() => {
    if (
      !transactionComplete ||
      actionLabel === "approve" ||
      actionLabel === null
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setOptimisticUserSharesDelta(0n);
      setOptimisticVaultAssetsDelta(0n);
      setOptimisticUsdcBalanceDelta(0n);
      if (actionLabel === "redeem") {
        setOptimisticPendingWithdrawalShares(0n);
        setOptimisticPendingWithdrawalAssets(0n);
        setOptimisticPendingUnlockTimestamp(0n);
      }
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [actionLabel, transactionComplete]);

  return (
    <div className="section-shell space-y-px py-6">
      <div className="border border-[color:var(--badge-warning-border)] bg-[color:var(--badge-warning-bg)] p-4 text-sm leading-7 text-[color:var(--text-secondary)]">
        <span className="font-medium text-[color:var(--text-primary)]">
          Faucet-mode deployment:
        </span>{" "}
        This Base Sepolia vault uses the public faucet USDC for practical LP
        activation. Because that asset is not the Aave-listed reserve on Base
        Sepolia, idle capital remains in-vault on this testnet deployment. The
        Aave routing path stays part of the protocol architecture for richer
        testnet and mainnet setups.
      </div>

      <div className="grid gap-px lg:grid-cols-2">
        <div className="bg-[color:var(--bg-surface)] p-6">
          <p className="eyebrow">Your Position</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <MetricBlock
              label="Shares"
              value={formatUnits(userShares, 6)}
              meta="UVS"
            />
            <MetricBlock
              label="Value"
              value={formatUsdc(userValueRaw)}
              meta="USDC"
            />
            <MetricBlock
              label="Share price"
              value={`$${(Number(sharePriceE18) / 1e18).toFixed(4)}`}
              meta="per UVS"
            />
          </div>
          <div className="mt-5 flex gap-6 border-t border-[color:var(--border-subtle)] pt-4">
            <MiniStat label="Wallet USDC" value={formatUsdc(userUsdcBalance)} />
            <MiniStat label="Allowance" value={formatUsdc(allowance)} />
          </div>
        </div>

        <div className="bg-[color:var(--bg-surface)] p-6">
          <p className="eyebrow">Pool Stats</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <MetricBlock
              label="TVL"
              value={formatUsdc(totalAssets + optimisticVaultAssetsDelta)}
              meta="USDC"
            />
            <MetricBlock
              label="Utilisation"
              value={`${utilisationPct.toFixed(1)}%`}
              style={{ color: liabilityColor(utilisationPct) }}
              meta="of capacity"
            />
            <MetricBlock
              label="Mode"
              value={vaultState?.active ? "Active" : "Inactive"}
              meta={vaultState?.aaveEnabled ? "Aave on" : "Aave off"}
            />
          </div>
          <div className="mt-5 flex gap-6 border-t border-[color:var(--border-subtle)] pt-4">
            <MiniStat
              label="Reserve ratio"
              value={`${reserveRatioPct.toFixed(1)}%`}
            />
            <MiniStat
              label="Open liability"
              value={formatUsdc(vaultState?.openLiability ?? 0n)}
            />
            <MiniStat
              label="Max payout"
              value={formatUsdc(TESTNET_VAULT_CONFIG.maxPayoutRaw)}
            />
          </div>
        </div>
      </div>

      <div className="bg-[color:var(--bg-surface)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Vault Liability</p>
          <span
            className="font-[family-name:var(--font-display)] text-lg font-bold"
            style={{ color: liabilityColor(utilisationPct) }}
          >
            {utilisationPct.toFixed(1)}%
          </span>
        </div>
        <div className="liability-bar w-full">
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${utilisationPct}%`,
              backgroundColor: liabilityColor(utilisationPct),
            }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-[color:var(--text-tertiary)]">
          <span>0%</span>
          <span className="text-[color:var(--risk-low)]">30% — Low</span>
          <span className="text-[color:var(--risk-medium)]">70% — Med</span>
          <span className="text-[color:var(--risk-high)]">100% — High</span>
        </div>
      </div>

      <div className="grid gap-px lg:grid-cols-2">
        <div className="bg-[color:var(--bg-surface)] p-6">
          <p className="eyebrow mb-4">Deposit USDC</p>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
              Amount
            </span>
            <input
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              placeholder="0.00"
              className="mt-2 w-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 py-3 font-mono text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] outline-none focus:border-[color:var(--accent-blue)]"
            />
          </label>
          {estimatedShares > 0n && (
            <p className="mt-2 font-mono text-[11px] text-[color:var(--text-secondary)]">
              You will receive ~{formatUnits(estimatedShares, 6)} UVS shares
            </p>
          )}
          {!reownConfigured && (
            <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
              Wallet connect is disabled until `NEXT_PUBLIC_REOWN_PROJECT_ID` is
              set.
            </p>
          )}
          {pendingMessage && (
            <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
              {pendingMessage}
            </p>
          )}
          {transactionComplete && (
            <p className="mt-3 text-sm text-[color:var(--data-positive)]">
              {actionLabel === "deposit"
                ? "Deposit confirmed. Refreshing vault reads."
                : actionLabel === "request"
                ? "Withdrawal request confirmed. Refreshing vault reads."
                : actionLabel === "redeem"
                ? "Withdrawal completed. Refreshing vault reads."
                : "Transaction confirmed. Refreshing vault reads."}
            </p>
          )}
          {actionError && (
            <p className="mt-3 text-sm text-[color:var(--risk-high)]">
              {actionError}
            </p>
          )}
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={!canDeposit || !needsApproval || isPending}
              className="w-full border border-[color:var(--border-default)] py-3 text-sm font-medium text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLabel === "approve"
                ? "Approving USDC..."
                : needsApproval
                ? "Approve USDC"
                : "Approval confirmed"}
            </button>
            <button
              type="button"
              onClick={handleDeposit}
              disabled={!canDeposit || needsApproval || isPending}
              className="w-full bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLabel === "deposit" ? "Depositing..." : "Deposit"}
            </button>
          </div>
          {!needsApproval && depositRaw > 0n && canDeposit && (
            <p className="mt-3 text-sm text-[color:var(--data-positive)]">
              Approval confirmed. You can deposit now without refreshing.
            </p>
          )}
          <p className="mt-1.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
            Min activation: {formatUsdc(TESTNET_VAULT_CONFIG.minActivationRaw)}
          </p>
        </div>

        <div className="bg-[color:var(--bg-surface)] p-6">
          <p className="eyebrow mb-4">Withdrawal State</p>
          <div className="space-y-3">
            <InfoRow
              label="Pending assets"
              value={formatUsdc(displayPendingWithdrawalAssets)}
            />
            <InfoRow
              label="Pending shares"
              value={formatUnits(displayPendingWithdrawalShares, 6)}
            />
            <InfoRow
              label="Unlock"
              value={
                displayPendingUnlockTimestamp > 0n
                  ? new Date(
                      Number(displayPendingUnlockTimestamp) * 1000
                    ).toLocaleString()
                  : "No request"
              }
            />
            <InfoRow
              label="Redeemable shares"
              value={formatUnits(maxRedeemShares, 6)}
            />
            <InfoRow
              label="Redeemable assets"
              value={formatUsdc(maxWithdrawAssets)}
            />
            <InfoRow
              label="Withdrawals blocked"
              value={vaultState?.withdrawalsBlocked ? "Yes" : "No"}
            />
          </div>

          <div className="mt-5 border-t border-[color:var(--border-subtle)] pt-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Shares to withdraw
              </span>
              <input
                value={withdrawInput}
                onChange={(e) => setWithdrawInput(e.target.value)}
                placeholder="0.00"
                className="mt-2 w-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 py-3 font-mono text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] outline-none focus:border-[color:var(--accent-blue)]"
              />
            </label>
            <p className="mt-2 font-mono text-[10px] text-[color:var(--text-tertiary)]">
              Available shares: {formatUnits(userShares, 6)}
            </p>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={handleRequestWithdrawal}
                disabled={!canRequestWithdrawal || isPending}
                className="w-full border border-[color:var(--border-default)] py-3 text-sm font-medium text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLabel === "request"
                  ? "Requesting..."
                  : "Request withdrawal"}
              </button>
              <button
                type="button"
                onClick={handleRedeem}
                disabled={!canRedeem || isPending}
                className="w-full bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLabel === "redeem"
                  ? "Completing..."
                  : "Complete withdrawal"}
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)]">
            Withdrawals use a shortened demo delay on Base Sepolia. Request
            first, then complete once redeemable shares become available.
            Current demo delay:{" "}
            {withdrawalDelay > 0n
              ? `${Number(withdrawalDelay) / 60} minutes`
              : "loading..."}
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  meta,
  style,
}: {
  label: string;
  value: string;
  meta: string;
  style?: CSSProperties;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
        {label}
      </p>
      <p
        className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[color:var(--text-primary)]"
        style={style}
      >
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
        {meta}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-medium text-[color:var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] pb-3 text-sm">
      <span className="text-[color:var(--text-secondary)]">{label}</span>
      <span className="font-mono text-[color:var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}
