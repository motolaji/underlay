"use client";

import { useEffect } from "react";
import { POSITION_RULES, TESTNET_VAULT_CONFIG } from "@/lib/constants";
import { formatUsdc } from "@/lib/format";
import { useSlipValidation } from "@/hooks/useSlipValidation";
import { useSlipStore } from "@/stores/slipStore";
import { cn } from "@/lib/utils";

const stakePresets = ["1", "2", "5"];

export function CartDrawer() {
  const {
    selectedLegs,
    stakeInput,
    setStakeInput,
    removeLeg,
    clearLegs,
    setValidation,
  } = useSlipStore();
  const validation = useSlipValidation(selectedLegs, stakeInput);

  useEffect(() => {
    setValidation(validation);
  }, [setValidation, validation]);

  const combinedOdds = selectedLegs.length > 0
    ? selectedLegs.reduce((acc, leg) => acc * (1 / leg.referenceProbability), 1)
    : null;

  const parsedStake = parseFloat(stakeInput) || 0;
  const potentialPayout = combinedOdds ? Math.min(parsedStake * combinedOdds, 100) : 0;

  return (
    <aside className="flex h-full flex-col border-l border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]">
      {/* Header */}
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
        {/* Empty state */}
        {selectedLegs.length === 0 ? (
          <div className="border border-dashed border-[color:var(--border-default)] p-4">
            <p className="text-sm leading-7 text-[color:var(--text-tertiary)]">
              Select outcomes from the market browser to build a multi-leg position.
            </p>
          </div>
        ) : (
          <>
            {/* Combined odds */}
            {combinedOdds && (
              <div className="border border-[color:var(--border-subtle)] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                    Combined odds
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[color:var(--text-primary)]">
                    {combinedOdds.toFixed(2)}×
                  </span>
                </div>
              </div>
            )}

            {/* Leg list */}
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
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Stake input */}
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
              Max: {formatUsdc(TESTNET_VAULT_CONFIG.maxStakeRaw)}
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

        {/* Payout preview */}
        {parsedStake > 0 && combinedOdds && (
          <div className="border border-[color:var(--border-subtle)] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                Potential payout
              </span>
              <span
                className={cn(
                  "font-[family-name:var(--font-display)] text-lg font-bold",
                  potentialPayout >= parsedStake * combinedOdds - 0.01
                    ? "text-[color:var(--data-positive)]"
                    : "text-[color:var(--text-secondary)]"
                )}
              >
                ${potentialPayout.toFixed(2)}
              </span>
            </div>
            {parsedStake * combinedOdds > 100 && (
              <p className="mt-1.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                Capped at $100 (testnet payout limit)
              </p>
            )}
          </div>
        )}

        {/* Validation */}
        {validation && validation.blockingReasons.length > 0 && (
          <div className="border border-[color:rgba(217,119,6,0.25)] bg-[color:rgba(217,119,6,0.05)] p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:#fbbf24]">
              Check
            </p>
            <ul className="mt-2 space-y-1.5">
              {validation.blockingReasons.map((reason) => (
                <li key={reason} className="text-xs leading-5 text-[color:var(--text-secondary)]">
                  — {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Config info */}
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-[color:var(--border-subtle)] p-2.5">
            <p className="font-mono text-[10px] text-[color:var(--text-tertiary)]">World ID gate</p>
            <p className="mt-1 font-mono text-xs text-[color:var(--text-primary)]">
              {formatUsdc(TESTNET_VAULT_CONFIG.worldIdGateRaw)}
            </p>
          </div>
          <div className="border border-[color:var(--border-subtle)] p-2.5">
            <p className="font-mono text-[10px] text-[color:var(--text-tertiary)]">Settlement</p>
            <p className="mt-1 font-mono text-xs text-[color:var(--text-primary)]">
              ~15 min delay
            </p>
          </div>
        </div>
      </div>

      {/* CTA footer */}
      <div className="border-t border-[color:var(--border-subtle)] px-4 py-4">
        <button
          type="button"
          disabled
          className="w-full bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Place Position
        </button>
        <p className="mt-2 text-center font-mono text-[10px] text-[color:var(--text-tertiary)]">
          Unlocks after /api/risk is wired
        </p>
      </div>
    </aside>
  );
}
