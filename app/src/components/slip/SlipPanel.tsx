"use client";

import { useEffect } from "react";
import { formatCountLabel, formatUsdc } from "@/lib/format";
import { POSITION_RULES, TESTNET_VAULT_CONFIG } from "@/lib/constants";
import { useSlipStore } from "@/stores/slipStore";
import { useSlipValidation } from "@/hooks/useSlipValidation";
import { StatusBadge } from "@/components/common/StatusBadge";

export function SlipPanel() {
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

  return (
    <aside className="paper-panel sticky top-28 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Underwriting slip</p>
          <h3 className="mt-3 text-3xl text-[color:var(--ink)]">
            Build the position
          </h3>
        </div>
        <StatusBadge label="Config-aware" tone="accent" />
      </div>

      <div className="mt-6 rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.42)] p-5">
        <p className="data-label">Leg count</p>
        <p className="mt-3 text-lg tabular text-[color:var(--ink)]">
          {formatCountLabel(
            selectedLegs.length,
            POSITION_RULES.maxLegsPerPosition
          )}
        </p>
        <p className="mt-2 text-sm leading-7">
          Minimum {POSITION_RULES.minLegsPerPosition}. Maximum{" "}
          {POSITION_RULES.maxLegsPerPosition}. The global rule is planned as
          protocol config.
        </p>
      </div>

      <label className="mt-6 block">
        <span className="data-label">Stake (USDC)</span>
        <input
          value={stakeInput}
          onChange={(event) => setStakeInput(event.target.value)}
          placeholder="0.00"
          className="mt-3 w-full rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.52)] px-4 py-4 text-base text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
        />
      </label>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.38)] p-4">
          <p className="data-label">Max stake</p>
          <p className="mt-3 text-lg text-[color:var(--ink)]">
            {formatUsdc(TESTNET_VAULT_CONFIG.maxStakeRaw)}
          </p>
        </div>
        <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.38)] p-4">
          <p className="data-label">World ID gate</p>
          <p className="mt-3 text-lg text-[color:var(--ink)]">
            {formatUsdc(TESTNET_VAULT_CONFIG.worldIdGateRaw)}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {selectedLegs.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[color:var(--border)] px-4 py-5 text-sm leading-7 text-[color:var(--muted)]">
            Select preview outcomes to see local validation. Risk scoring,
            locked quote math, and submission remain disabled until the live
            risk route and contracts are wired.
          </div>
        ) : (
          selectedLegs.map((leg) => (
            <div
              key={`${leg.marketId}:${leg.outcomeId}`}
              className="rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.38)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="data-label">{leg.category}</p>
                  <p className="mt-2 text-base text-[color:var(--ink)]">
                    {leg.outcomeLabel}
                  </p>
                  <p className="mt-2 text-sm leading-7">{leg.question}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLeg(leg.marketId, leg.outcomeId)}
                  className="text-sm text-[color:var(--muted)]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 rounded-[24px] border border-[color:rgba(185,133,59,0.22)] bg-[color:rgba(185,133,59,0.08)] p-5">
        <p className="data-label text-[color:var(--amber)]">Validation state</p>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--ink)]">
          {validation.blockingReasons.length > 0 ? (
            validation.blockingReasons.map((reason) => (
              <li key={reason}>- {reason}</li>
            ))
          ) : (
            <li>
              - Slip passes local config checks and is ready for later
              risk-route wiring.
            </li>
          )}
        </ul>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled
          className="flex-1 rounded-full bg-[color:var(--teal)] px-5 py-3 text-sm font-semibold text-white opacity-50"
        >
          Lock quote after /api/risk
        </button>
        <button
          type="button"
          onClick={clearLegs}
          className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm text-[color:var(--ink)]"
        >
          Clear
        </button>
      </div>
    </aside>
  );
}
