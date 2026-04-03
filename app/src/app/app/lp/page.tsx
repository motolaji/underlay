"use client";

import { useState } from "react";
import { TESTNET_VAULT_CONFIG } from "@/lib/constants";
import { formatBps, formatUsdc } from "@/lib/format";

// Demo values — will be replaced with onchain reads
const DEMO = {
  tvl: 8420,
  utilisation: 62,
  openPositions: 24,
  userShares: 1240,
  userValueUsd: 1312,
  apy7d: 11.3,
  apy30d: 9.8,
  sharePrice: 1.0247,
  riskComposition: [
    { label: "Crypto", pct: 48 },
    { label: "Sports", pct: 31 },
    { label: "Other", pct: 21 },
  ],
};

function liabilityColor(pct: number) {
  if (pct < 30) return "var(--risk-low)";
  if (pct <= 70) return "var(--risk-medium)";
  return "var(--risk-high)";
}

export default function AppLpPage() {
  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");

  const depositAmount = parseFloat(depositInput) || 0;
  const estimatedShares = depositAmount > 0
    ? (depositAmount / DEMO.sharePrice).toFixed(0)
    : null;

  return (
    <div className="section-shell space-y-px py-6">
      {/* Row 1: Your Position + Pool Stats */}
      <div className="grid gap-px lg:grid-cols-2">
        <div className="bg-[color:var(--bg-surface)] p-6">
          <p className="eyebrow">Your Position</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Shares
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[color:var(--text-primary)]">
                {DEMO.userShares.toLocaleString()}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                UVS
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Value
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[color:var(--text-primary)]">
                ${DEMO.userValueUsd.toLocaleString()}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                USDC
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Share price
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[color:var(--text-primary)]">
                ${DEMO.sharePrice.toFixed(4)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                per UVS
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-6 border-t border-[color:var(--border-subtle)] pt-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                7d APY
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-[color:var(--data-positive)]">
                {DEMO.apy7d}%
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                30d APY
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-[color:var(--data-positive)]">
                {DEMO.apy30d}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[color:var(--bg-surface)] p-6">
          <p className="eyebrow">Pool Stats</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                TVL
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[color:var(--text-primary)]">
                ${DEMO.tvl.toLocaleString()}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                USDC
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Utilisation
              </p>
              <p
                className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold"
                style={{ color: liabilityColor(DEMO.utilisation) }}
              >
                {DEMO.utilisation}%
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                of capacity
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Open positions
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[color:var(--text-primary)]">
                {DEMO.openPositions}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                active
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-6 border-t border-[color:var(--border-subtle)] pt-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Reserve ratio
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-[color:var(--text-primary)]">
                {formatBps(TESTNET_VAULT_CONFIG.reserveBps)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Max liability
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-[color:var(--text-primary)]">
                {formatBps(TESTNET_VAULT_CONFIG.maxLiabilityBps)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Max payout
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-[color:var(--text-primary)]">
                {formatUsdc(TESTNET_VAULT_CONFIG.maxPayoutRaw)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Vault liability meter */}
      <div className="bg-[color:var(--bg-surface)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Vault Liability</p>
          <span
            className="font-[family-name:var(--font-display)] text-lg font-bold"
            style={{ color: liabilityColor(DEMO.utilisation) }}
          >
            {DEMO.utilisation}%
          </span>
        </div>
        <div className="liability-bar w-full">
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${DEMO.utilisation}%`,
              backgroundColor: liabilityColor(DEMO.utilisation),
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

      {/* Row 3: Risk composition */}
      <div className="bg-[color:var(--bg-surface)] p-5">
        <p className="eyebrow mb-4">Risk Composition</p>
        <div className="space-y-3">
          {DEMO.riskComposition.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-14 font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                {item.label}
              </span>
              <div className="flex-1">
                <div className="h-1.5 bg-[color:var(--bg-elevated)]">
                  <div
                    className="h-full bg-[color:var(--accent-blue)] transition-all duration-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
              <span className="w-8 text-right font-mono text-[10px] text-[color:var(--text-primary)]">
                {item.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Deposit + Withdraw */}
      <div className="grid gap-px lg:grid-cols-2">
        {/* Deposit */}
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
          {estimatedShares && (
            <p className="mt-2 font-mono text-[11px] text-[color:var(--text-secondary)]">
              You will receive ~{estimatedShares} UVS shares
            </p>
          )}
          <button
            type="button"
            disabled
            className="mt-4 w-full bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Deposit
          </button>
          <p className="mt-1.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
            Min activation: {formatUsdc(TESTNET_VAULT_CONFIG.minActivationRaw)}
          </p>
        </div>

        {/* Withdraw */}
        <div className="bg-[color:var(--bg-surface)] p-6">
          <p className="eyebrow mb-4">Request Withdrawal</p>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
              Shares to redeem
            </span>
            <input
              value={withdrawInput}
              onChange={(e) => setWithdrawInput(e.target.value)}
              placeholder="0"
              className="mt-2 w-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 py-3 font-mono text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] outline-none focus:border-[color:var(--accent-blue)]"
            />
          </label>
          {withdrawInput && parseFloat(withdrawInput) > 0 && (
            <p className="mt-2 font-mono text-[11px] text-[color:var(--text-secondary)]">
              ≈ ${(parseFloat(withdrawInput) * DEMO.sharePrice).toFixed(2)} USDC
            </p>
          )}
          <button
            type="button"
            disabled
            className="mt-4 w-full border border-[color:var(--border-default)] py-3 text-sm font-medium text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Request Withdrawal
          </button>
          <p className="mt-1.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
            24h countdown after request. Blocked if liability {">"} 70%.
          </p>
        </div>
      </div>
    </div>
  );
}
