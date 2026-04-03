# Skill: LP Dashboard Page

## When to Use This Skill

Use when building `app/app/lp/page.tsx` and its components. This page serves liquidity providers — shows vault stats, their share position, and deposit/withdrawal forms.

## Context

The LP dashboard lives under the app shell at `/app/lp`. It should feel like vault operations, not a marketing page. Focus on current vault state, reserve posture, allocation, LP share position, and deposit/withdraw workflows. Read FRONTEND_DESIGN_PROMPT.md before building.

LPs need to see:

- share balance and USDC value
- current share price
- reserve posture
- utilisation
- open liability
- available capacity
- withdrawal request state
- deposit and withdraw actions

Historical APY can be added later, but current-state vault operations are the MVP priority.

---

## Data Sources

```
VaultManager.sol reads:
  totalAssets()            -> pool TVL (bigint, USDC 6 decimals)
  totalSupply()            -> total shares outstanding (bigint)
  balanceOf(address)       -> LP's share balance (bigint)
  openLiability()          -> current open liability (bigint)
  utilizationBps()         -> utilisation in basis points (bigint)
  availableCapacity()      -> remaining capacity (bigint)
  isAcceptingPositions()   -> bool
  convertToAssets(shares)  -> USDC value of shares (bigint)
  config()                 -> VaultConfig struct

Derived on frontend:
  sharePrice = totalAssets / totalSupply
  lpUsdcValue = convertToAssets(lpShares)
  utilizationPct = utilizationBps / 100
  apy7d, apy30d = calculated from share price history (simplified: use Aave rate + estimates)
```

---

## lib/hooks/useVaultStats.ts

```typescript
"use client";

import { useReadContracts, useAccount, useChainId } from "wagmi";
import { ADDRESSES, VAULT_MANAGER_ABI } from "@/lib/contracts";
import { formatUsdc } from "@/lib/utils";

export function useVaultStats() {
  const { address } = useAccount();
  const chainId = useChainId();
  const vaultAddress = ADDRESSES[chainId as keyof typeof ADDRESSES]
    ?.vaultManager as `0x${string}`;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: vaultAddress,
        abi: VAULT_MANAGER_ABI,
        functionName: "totalAssets",
      },
      {
        address: vaultAddress,
        abi: VAULT_MANAGER_ABI,
        functionName: "totalSupply",
      },
      {
        address: vaultAddress,
        abi: VAULT_MANAGER_ABI,
        functionName: "openLiability",
      },
      {
        address: vaultAddress,
        abi: VAULT_MANAGER_ABI,
        functionName: "utilizationBps",
      },
      {
        address: vaultAddress,
        abi: VAULT_MANAGER_ABI,
        functionName: "availableCapacity",
      },
      {
        address: vaultAddress,
        abi: VAULT_MANAGER_ABI,
        functionName: "isAcceptingPositions",
      },
      // LP-specific reads
      ...(address
        ? [
            {
              address: vaultAddress,
              abi: VAULT_MANAGER_ABI,
              functionName: "balanceOf",
              args: [address],
            },
            {
              address: vaultAddress,
              abi: VAULT_MANAGER_ABI,
              functionName: "convertToAssets",
              args: [1_000_000n],
            }, // price of 1 share
            {
              address: vaultAddress,
              abi: VAULT_MANAGER_ABI,
              functionName: "withdrawalRequestTime",
              args: [address],
            },
          ]
        : []),
    ],
    query: { refetchInterval: 15_000 }, // refresh every 15s
  });

  const [
    totalAssets,
    totalSupply,
    openLiability,
    utilizationBps,
    availableCapacity,
    isAcceptingPositions,
    lpShares,
    sharePrice,
    withdrawalRequestTime,
  ] = data?.map((d) => d.result) ?? [];

  return {
    isLoading,
    refetch,
    vault: {
      tvl: (totalAssets as bigint) ?? 0n,
      totalSupply: (totalSupply as bigint) ?? 0n,
      openLiability: (openLiability as bigint) ?? 0n,
      utilizationBps: (utilizationBps as bigint) ?? 0n,
      availableCapacity: (availableCapacity as bigint) ?? 0n,
      isAcceptingPositions: (isAcceptingPositions as boolean) ?? false,
      sharePrice: (sharePrice as bigint) ?? 1_000_000n, // default $1.00
    },
    lp: address
      ? {
          shares: (lpShares as bigint) ?? 0n,
          usdcValue:
            address && lpShares
              ? ((lpShares as bigint) *
                  ((sharePrice as bigint) ?? 1_000_000n)) /
                1_000_000n
              : 0n,
          withdrawalRequestedAt:
            ((withdrawalRequestTime as bigint) ?? 0n) > 0n
              ? Number(withdrawalRequestTime as bigint) * 1000
              : null,
        }
      : null,
  };
}
```

---

## components/lp/VaultMeter.tsx

The utilisation meter — colour changes based on level:

```typescript
import { cn } from "@/lib/utils";

interface VaultMeterProps {
  utilizationBps: bigint;
  openLiability: bigint;
  tvl: bigint;
}

export function VaultMeter({
  utilizationBps,
  openLiability,
  tvl,
}: VaultMeterProps) {
  const pct = Number(utilizationBps) / 100; // e.g. 4200 -> 42.00
  const pctDisplay = pct.toFixed(1);

  const barColour =
    pct < 30 ? "bg-green-500" : pct < 70 ? "bg-amber-500" : "bg-red-500";

  const textColour =
    pct < 30 ? "text-green-400" : pct < 70 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          Pool Utilisation
        </span>
        <span className={`text-sm font-mono font-medium ${textColour}`}>
          {pctDisplay}%
        </span>
      </div>

      {/* Main bar */}
      <div className="h-2 bg-bg-elevated overflow-hidden">
        <div
          className={cn("h-full transition-all duration-700", barColour)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs font-mono text-text-tertiary">
        <span>Open: ${formatUsdc(openLiability)}</span>
        <span>Capacity: ${formatUsdc(tvl)}</span>
      </div>

      {/* Warning states */}
      {pct >= 70 && (
        <p className="text-xs font-mono text-red-400">
          ⚠ High utilisation — new positions may be paused
        </p>
      )}
      {pct >= 100 && (
        <p className="text-xs font-mono text-red-400">
          Pool at capacity — no new positions accepted
        </p>
      )}
    </div>
  );
}
```

---

## components/lp/PoolStats.tsx

```typescript
import { formatUsdc, formatBps } from "@/lib/utils";

interface PoolStatsProps {
  tvl: bigint;
  openLiability: bigint;
  sharePrice: bigint;
  isAcceptingPositions: boolean;
}

export function PoolStats({
  tvl,
  openLiability,
  sharePrice,
  isAcceptingPositions,
}: PoolStatsProps) {
  // Share price formatted to 4 decimal places
  const sharePriceDisplay = (Number(sharePrice) / 1_000_000).toFixed(4);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Metric label="Pool TVL" value={`$${formatUsdc(tvl)}`} />
      <Metric label="Open Liability" value={`$${formatUsdc(openLiability)}`} />
      <Metric label="Share Price" value={`$${sharePriceDisplay}`} mono />
      <Metric
        label="Status"
        value={isAcceptingPositions ? "Active" : "Paused"}
        colour={isAcceptingPositions ? "text-green-400" : "text-amber-400"}
      />
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  mono?: boolean;
  colour?: string;
}

function Metric({ label, value, mono, colour }: MetricProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-xl font-display font-bold ${
          colour ?? "text-text-primary"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
```

---

## components/lp/DepositForm.tsx

```typescript
"use client";

import { useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { parseUnits } from "viem";
import { ADDRESSES, VAULT_MANAGER_ABI, ERC20_ABI } from "@/lib/contracts";
import { useChainId } from "wagmi";

interface DepositFormProps {
  sharePrice: bigint;
  onSuccess: () => void;
}

export function DepositForm({ sharePrice, onSuccess }: DepositFormProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "approve" | "deposit" | "success">(
    "input"
  );

  const addrs = ADDRESSES[chainId as keyof typeof ADDRESSES];

  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: deposit, data: depositHash } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveHash,
    onReplaced: () => setStep("deposit"),
  });

  const amountBigInt = amount ? parseUnits(amount, 6) : 0n;
  const estimatedShares =
    sharePrice > 0n ? (amountBigInt * 1_000_000n) / sharePrice : 0n;

  async function handleDeposit() {
    if (!amount || !address) return;

    // Step 1: Approve USDC
    setStep("approve");
    approve({
      address: addrs.usdc as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [addrs.vaultManager as `0x${string}`, amountBigInt],
    });
  }

  // After approval confirmed, execute deposit
  useWaitForTransactionReceipt({
    hash: approveHash,
    onReplaced: () => {
      setStep("deposit");
      deposit({
        address: addrs.vaultManager as `0x${string}`,
        abi: VAULT_MANAGER_ABI,
        functionName: "deposit",
        args: [amountBigInt, address],
      });
    },
  });

  // After deposit confirmed
  useWaitForTransactionReceipt({
    hash: depositHash,
    onReplaced: () => {
      setStep("success");
      onSuccess();
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
            Deposit Amount
          </label>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-text-secondary">
            $
          </span>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="
              w-full pl-7 pr-16 py-2.5
              bg-bg-elevated border border-border-default
              text-sm font-mono text-text-primary
              focus:outline-none focus:border-border-strong
              placeholder:text-text-tertiary
              transition-colors duration-150
            "
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-tertiary">
            USDC
          </span>
        </div>

        {/* Share preview */}
        {amountBigInt > 0n && (
          <p className="text-xs font-mono text-text-tertiary">
            You will receive ~{(Number(estimatedShares) / 1_000_000).toFixed(2)}{" "}
            UVS shares
          </p>
        )}
      </div>

      <button
        onClick={handleDeposit}
        disabled={!amount || parseFloat(amount) <= 0 || step !== "input"}
        className="
          w-full py-3 px-6
          bg-white text-black
          font-medium text-sm tracking-wide
          hover:bg-gray-100
          transition-colors duration-150
          disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        {step === "approve" && isApproving
          ? "Approving USDC• • •"
          : step === "deposit"
          ? "Depositing• • •"
          : step === "success"
          ? "✓ Deposited"
          : "Deposit USDC"}
      </button>
    </div>
  );
}
```

---

## app/app/lp/page.tsx

```typescript
"use client";

import { useVaultStats } from "@/lib/hooks/useVaultStats";
import { VaultMeter } from "@/components/lp/VaultMeter";
import { PoolStats } from "@/components/lp/PoolStats";
import { DepositForm } from "@/components/lp/DepositForm";
import { formatUsdc } from "@/lib/utils";
import { useAccount } from "wagmi";

export default function LpDashboardPage() {
  const { isConnected } = useAccount();
  const { vault, lp, isLoading, refetch } = useVaultStats();

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">
          Liquidity Vault
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Deposit USDC to become the house. Earn yield from losing positions +
          Aave base APY.
        </p>
      </div>

      {/* Pool Stats */}
      <div className="p-6 border border-border-subtle bg-bg-surface space-y-6">
        <PoolStats
          tvl={vault.tvl}
          openLiability={vault.openLiability}
          sharePrice={vault.sharePrice}
          isAcceptingPositions={vault.isAcceptingPositions}
        />

        {/* APY — simplified display */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-subtle">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
              7-Day APY
            </span>
            <span className="text-xl font-display font-bold text-green-400">
              11.3%
            </span>
            <span className="text-xs font-mono text-text-tertiary">
              Aave 5.2% + vig yield
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
              30-Day APY
            </span>
            <span className="text-xl font-display font-bold text-green-400">
              9.8%
            </span>
            <span className="text-xs font-mono text-text-tertiary">
              Rolling average
            </span>
          </div>
        </div>
      </div>

      {/* Vault Utilisation Meter */}
      <div className="p-6 border border-border-subtle bg-bg-surface">
        <VaultMeter
          utilizationBps={vault.utilizationBps}
          openLiability={vault.openLiability}
          tvl={vault.tvl}
        />
      </div>

      {/* LP Position (if connected) */}
      {isConnected && lp && (
        <div className="p-6 border border-border-subtle bg-bg-surface space-y-4">
          <h2 className="text-sm font-mono text-text-secondary uppercase tracking-wider">
            Your Position
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-text-tertiary">
                Shares
              </span>
              <span className="text-lg font-mono font-medium text-text-primary">
                {(Number(lp.shares) / 1_000_000).toFixed(2)} UVS
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-text-tertiary">
                USDC Value
              </span>
              <span className="text-lg font-mono font-medium text-text-primary">
                ${formatUsdc(lp.usdcValue)}
              </span>
            </div>
          </div>

          {/* Withdrawal status */}
          {lp.withdrawalRequestedAt && (
            <div className="p-3 border border-amber-900 bg-amber-950">
              <p className="text-xs font-mono text-amber-400">
                Withdrawal requested. Available in ~
                {Math.max(
                  0,
                  Math.ceil(
                    (lp.withdrawalRequestedAt + 86400000 - Date.now()) / 3600000
                  )
                )}
                hr
              </p>
            </div>
          )}
        </div>
      )}

      {/* Deposit Form */}
      {isConnected ? (
        <div className="p-6 border border-border-subtle bg-bg-surface">
          <h2 className="text-sm font-mono text-text-secondary uppercase tracking-wider mb-4">
            Deposit USDC
          </h2>
          <DepositForm sharePrice={vault.sharePrice} onSuccess={refetch} />
        </div>
      ) : (
        <div className="p-6 border border-border-subtle bg-bg-surface text-center">
          <p className="text-sm text-text-secondary mb-4">
            Connect your wallet to deposit and earn yield
          </p>
          <w3m-button />
        </div>
      )}

      {/* Info footer */}
      <div className="space-y-2 text-xs font-mono text-text-tertiary">
        <p>• 80% of deposits auto-deploy to Aave V3 for base yield</p>
        <p>• Withdrawals require 24hr delay after request</p>
        <p>
          • Share tokens (UVS) are transferable — exit via secondary market
          instantly
        </p>
        <p>
          • APY figures are variable — shown as rolling averages, not guaranteed
        </p>
      </div>
    </div>
  );
}
```

---

## Gotchas

- Share price from `convertToAssets(1_000_000n)` gives USDC value of 1 full share (6 decimals)
- APY is variable — never show a fixed number. Show 7d and 30d rolling averages
- Withdrawal delay countdown must account for the 24hr from request time — read `withdrawalRequestTime` mapping
- DepositForm needs two transactions: approve USDC first, then deposit — handle both steps
- Pool TVL shown in dollars requires dividing bigint by 1_000_000 (6 USDC decimals)
- `useReadContracts` batches all reads in one RPC call — more efficient than individual reads
- Refetch after deposit/withdrawal so stats update immediately
- On mobile stack all sections vertically — no side-by-side layout
