# Skill: BetSlip Component

## When to Use This Skill
Use when building components/betslip/BetSlip.tsx and its child components. This is the core bettor interaction component — where legs combine into a position, odds are shown, risk is scored, and the position is submitted.

## Context
The betslip is a fixed right panel (360px wide) that appears when the first leg is added. It shows all legs, combined odds, AI risk score, stake input, World ID gate, and the submit button. It calls /api/risk to get the AI risk score with a 500ms debounce after any leg change. Read FRONTEND_DESIGN_PROMPT.md before building.

---

## Component Tree

```
BetSlip.tsx                  Main container
  LegCard.tsx                Individual leg display
  OddsDisplay.tsx            Combined odds + payout
  RiskBadge.tsx              AI risk tier indicator
  StakeInput.tsx             USDC stake input
  WorldIDButton.tsx          World ID verification (conditional)
  SubmitButton.tsx           Place position CTA
```

---

## /api/risk/route.ts

AI risk scorer proxy — calls 0G Compute:

```typescript
// app/api/risk/route.ts
import { NextRequest, NextResponse } from "next/server"

interface RiskRequest {
  legs: Array<{
    marketId: string
    question: string
    outcome: string
    probability: number
    category: string
    resolutionDate: string
  }>
  wallet: string
  stake: number
}

interface RiskResponse {
  risk_tier: "LOW" | "MEDIUM" | "HIGH"
  stake_limit: number
  correlation_score: number
  flags: string[]
  effective_legs: number
  settlement_delay: string
  confidence: number
}

export async function POST(request: NextRequest) {
  try {
    const body: RiskRequest = await request.json()

    // Validate input
    if (!body.legs || body.legs.length < 2) {
      return NextResponse.json(
        { error: "Minimum 2 legs required" },
        { status: 400 }
      )
    }

    // TODO: Replace with 0G Compute call when integrated
    // For now: rule-based scoring that mirrors AI logic
    const riskScore = calculateRuleBasedRisk(body)

    return NextResponse.json(riskScore)
  } catch (error) {
    console.error("Risk scoring error:", error)
    return NextResponse.json(
      {
        risk_tier: "HIGH",
        stake_limit: 1,
        correlation_score: 0.5,
        flags: ["scoring_error"],
        effective_legs: body.legs?.length ?? 0,
        settlement_delay: "24hr",
        confidence: 0
      },
      { status: 200 } // return HIGH risk on error, not 500
    )
  }
}

function calculateRuleBasedRisk(input: RiskRequest): RiskResponse {
  const { legs, stake } = input

  // Check correlation — same category counts as correlated
  const categories = legs.map(l => l.category)
  const uniqueCategories = new Set(categories).size
  const correlationScore = uniqueCategories === 1
    ? 0.8  // all same category — high correlation
    : uniqueCategories === legs.length
    ? 0.1  // all different — low correlation
    : 0.4  // mixed

  // Timing risk — any leg resolving in under 2 hours
  const now = Date.now()
  const hasTimingRisk = legs.some(leg => {
    const resolutionTime = new Date(leg.resolutionDate).getTime()
    return resolutionTime - now < 2 * 60 * 60 * 1000
  })

  // Determine risk tier
  const flags: string[] = []
  let riskTier: "LOW" | "MEDIUM" | "HIGH" = "LOW"

  if (correlationScore >= 0.7) {
    flags.push("high_correlation_detected")
    riskTier = "HIGH"
  } else if (correlationScore >= 0.4) {
    flags.push("moderate_correlation_detected")
    riskTier = "MEDIUM"
  }

  if (hasTimingRisk) {
    flags.push("timing_anomaly_detected")
    riskTier = "HIGH"
  }

  if (legs.length >= 4) {
    flags.push("maximum_legs")
    if (riskTier === "LOW") riskTier = "MEDIUM"
  }

  // Stake limit based on risk tier
  const stakeLimits = { LOW: 5, MEDIUM: 3, HIGH: 1 } // testnet values
  const stakeLimit = stakeLimits[riskTier]

  // Effective legs accounting for correlation
  const effectiveLegs = legs.length * (1 - correlationScore * 0.3)

  // Settlement delay
  const delays = { LOW: "15 min", MEDIUM: "1 hour", HIGH: "24 hours" }

  return {
    risk_tier: riskTier,
    stake_limit: stakeLimit,
    correlation_score: correlationScore,
    flags,
    effective_legs: Math.round(effectiveLegs * 10) / 10,
    settlement_delay: delays[riskTier],
    confidence: 0.85
  }
}
```

---

## components/betslip/BetSlip.tsx

```typescript
"use client"

import { useCallback, useEffect, useState } from "react"
import { useAccount, useChainId } from "wagmi"
import { useBetslip } from "@/lib/store/betslip"
import { calculatePricing, getPricingConfig, formatOdds, formatPayout } from "@/lib/pricing"
import { LegCard } from "./LegCard"
import { OddsDisplay } from "./OddsDisplay"
import { RiskBadge } from "./RiskBadge"
import { StakeInput } from "./StakeInput"
import { SubmitButton } from "./SubmitButton"

interface RiskScore {
  risk_tier: "LOW" | "MEDIUM" | "HIGH"
  stake_limit: number
  correlation_score: number
  flags: string[]
  effective_legs: number
  settlement_delay: string
}

export function BetSlip() {
  const { address } = useAccount()
  const chainId = useChainId()
  const config = getPricingConfig(chainId)

  const { legs, stake, setStake, setSlip, setScoring, clearSlip } = useBetslip()
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null)
  const [isScoring, setIsScoringLocal] = useState(false)
  const [poolUtilisation] = useState(0.42) // TODO: read from contract

  // Debounced risk scoring
  useEffect(() => {
    if (legs.length < 2) {
      setRiskScore(null)
      return
    }

    const timeout = setTimeout(async () => {
      setIsScoringLocal(true)
      setScoring(true)
      try {
        const res = await fetch("/api/risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legs,
            wallet: address ?? "0x0000",
            stake
          })
        })
        const score: RiskScore = await res.json()
        setRiskScore(score)
      } catch {
        // Keep previous score on error
      } finally {
        setIsScoringLocal(false)
        setScoring(false)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [legs, address])

  // Calculate pricing
  const pricing = legs.length >= 2
    ? calculatePricing({
        legs,
        poolUtilisation,
        correlationScore: riskScore?.correlation_score ?? 0,
        stake,
        config
      })
    : null

  // Update slip state
  useEffect(() => {
    if (pricing && riskScore) {
      setSlip({
        legs,
        combinedOdds: pricing.combinedOdds,
        stake,
        potentialPayout: pricing.potentialPayout,
        riskTier: riskScore.risk_tier,
        stakeLimit: riskScore.stake_limit,
        correlationScore: riskScore.correlation_score,
        flags: riskScore.flags,
        settlementDelay: riskScore.settlement_delay
      })
    }
  }, [pricing, riskScore])

  if (legs.length === 0) return null

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            Position Slip
          </span>
          <span className="text-xs font-mono text-text-tertiary">
            {legs.length}/4 legs
          </span>
        </div>
        <button
          onClick={clearSlip}
          className="text-xs font-mono text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Legs */}
        <div className="divide-y divide-border-subtle">
          {legs.map((leg, i) => (
            <LegCard key={leg.marketId} leg={leg} index={i} />
          ))}
        </div>

        {/* Need minimum 2 legs */}
        {legs.length === 1 && (
          <div className="px-4 py-3">
            <p className="text-xs font-mono text-text-tertiary">
              Add at least 1 more outcome to build a position
            </p>
          </div>
        )}

        {/* Odds + Risk (shown when 2+ legs) */}
        {legs.length >= 2 && (
          <div className="p-4 space-y-4 border-t border-border-subtle">

            {/* Risk Score */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                AI Risk Assessment
              </span>
              {isScoring ? (
                <span className="text-xs font-mono text-text-tertiary animate-pulse">
                  Scoring• • •
                </span>
              ) : riskScore ? (
                <RiskBadge tier={riskScore.risk_tier} />
              ) : null}
            </div>

            {/* Risk flags */}
            {riskScore?.flags && riskScore.flags.length > 0 && (
              <div className="space-y-1">
                {riskScore.flags.map(flag => (
                  <p key={flag} className="text-xs font-mono text-text-tertiary">
                    ⚠ {flag.replace(/_/g, " ")}
                  </p>
                ))}
              </div>
            )}

            {/* Odds display */}
            {pricing && (
              <OddsDisplay
                pricing={pricing}
                config={config}
                isLoading={isScoring}
              />
            )}

            {/* Settlement delay */}
            {riskScore && (
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-secondary">Verification delay</span>
                <span className="text-text-primary">~{riskScore.settlement_delay}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stake + Submit — pinned to bottom */}
      {legs.length >= 2 && (
        <div className="border-t border-border-subtle p-4 space-y-3 shrink-0">
          <StakeInput
            value={stake}
            onChange={setStake}
            max={riskScore?.stake_limit ?? config.maxStake}
            config={config}
          />
          <SubmitButton
            slip={null}
            riskScore={riskScore}
            pricing={pricing}
            config={config}
          />
        </div>
      )}
    </div>
  )
}
```

---

## components/betslip/LegCard.tsx

```typescript
"use client"

import { useBetslip } from "@/lib/store/betslip"
import { formatResolutionDate } from "@/lib/polymarket"
import type { Leg } from "@/types/position"

interface LegCardProps {
  leg: Leg
  index: number
}

export function LegCard({ leg, index }: LegCardProps) {
  const { removeLeg } = useBetslip()

  return (
    <div className="px-4 py-3 flex items-start gap-3 group">
      {/* Leg number */}
      <span className="text-xs font-mono text-text-tertiary mt-0.5 shrink-0 w-4">
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary leading-snug mb-1 line-clamp-2">
          {leg.question}
        </p>
        <div className="flex items-center gap-2">
          <span className={`
            text-xs font-mono uppercase tracking-wider px-1.5 py-0.5 border
            ${leg.outcome === "yes"
              ? "text-green-400 border-green-900 bg-green-950"
              : "text-red-400 border-red-900 bg-red-950"
            }
          `}>
            {leg.outcome}
          </span>
          <span className="text-xs font-mono text-text-tertiary">
            {(leg.probability * 100).toFixed(0)}% prob
          </span>
          <span className="text-xs font-mono text-text-tertiary">
            {formatResolutionDate(leg.resolutionDate)}
          </span>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => removeLeg(leg.marketId)}
        className="
          text-text-tertiary hover:text-text-secondary
          transition-colors shrink-0 mt-0.5
          opacity-0 group-hover:opacity-100
        "
        aria-label="Remove leg"
      >
        ×
      </button>
    </div>
  )
}
```

---

## components/betslip/OddsDisplay.tsx

```typescript
import { formatOdds, formatPayout } from "@/lib/pricing"
import type { PricingOutput, PricingConfig } from "@/lib/pricing"

interface OddsDisplayProps {
  pricing: PricingOutput
  config: PricingConfig
  isLoading: boolean
}

export function OddsDisplay({ pricing, config, isLoading }: OddsDisplayProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          Combined Odds
        </span>
        <span className={`text-lg font-display font-bold text-text-primary ${isLoading ? "opacity-50" : ""}`}>
          {formatOdds(pricing.combinedOdds)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          Potential Payout
        </span>
        <div className="text-right">
          <span className={`text-base font-mono font-medium text-text-primary ${isLoading ? "opacity-50" : ""}`}>
            {formatPayout(pricing.potentialPayout)}
          </span>
          {pricing.isCapped && (
            <p className="text-xs font-mono text-amber-500 mt-0.5">
              Capped at {formatPayout(config.maxPayout)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## components/betslip/RiskBadge.tsx

```typescript
const RISK_STYLES = {
  LOW:    "border-green-800 text-green-400 bg-green-950",
  MEDIUM: "border-amber-800 text-amber-400 bg-amber-950",
  HIGH:   "border-red-800 text-red-400 bg-red-950"
}

export function RiskBadge({ tier }: { tier: "LOW" | "MEDIUM" | "HIGH" }) {
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2 py-0.5
      text-xs font-mono uppercase tracking-wider
      border ${RISK_STYLES[tier]}
    `}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {tier}
    </span>
  )
}
```

---

## components/betslip/StakeInput.tsx

```typescript
"use client"

import type { PricingConfig } from "@/lib/pricing"

interface StakeInputProps {
  value: number
  onChange: (amount: number) => void
  max: number
  config: PricingConfig
}

export function StakeInput({ value, onChange, max, config }: StakeInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
          Stake
        </label>
        <span className="text-xs font-mono text-text-tertiary">
          Max: ${max.toFixed(2)}
        </span>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-text-secondary">
          $
        </span>
        <input
          type="number"
          min="0.01"
          max={max}
          step="0.01"
          value={value || ""}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val)) onChange(Math.min(val, max))
          }}
          placeholder="0.00"
          className="
            w-full pl-7 pr-14 py-2.5
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

      {value > max && (
        <p className="text-xs font-mono text-red-400">
          Stake reduced to ${max.toFixed(2)} by AI risk limit
        </p>
      )}
    </div>
  )
}
```

---

## components/betslip/SubmitButton.tsx

```typescript
"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { WorldIDButton } from "@/components/WorldIDButton"
import type { PricingOutput, PricingConfig } from "@/lib/pricing"

interface SubmitButtonProps {
  slip: unknown
  riskScore: { stake_limit: number; risk_tier: string } | null
  pricing: PricingOutput | null
  config: PricingConfig
}

export function SubmitButton({ slip, riskScore, pricing, config }: SubmitButtonProps) {
  const { address, isConnected } = useAccount()
  const [worldIdProof, setWorldIdProof] = useState<unknown>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stake = pricing ? pricing.potentialPayout / pricing.combinedOdds : 0
  const needsWorldId = stake > config.maxStake * 0.4 // above worldIdGate

  if (!isConnected) {
    return (
      <w3m-button />
    )
  }

  if (needsWorldId && !worldIdProof) {
    return (
      <WorldIDButton
        stake={BigInt(Math.floor(stake * 1_000_000))}
        onVerified={setWorldIdProof}
      />
    )
  }

  return (
    <button
      disabled={!pricing || !riskScore || isSubmitting}
      onClick={async () => {
        setIsSubmitting(true)
        try {
          // TODO: call RiskEngine.sol submitPosition()
          // with locked odds + World ID proof if needed
          await new Promise(r => setTimeout(r, 1500)) // placeholder
        } finally {
          setIsSubmitting(false)
        }
      }}
      className="
        w-full py-3 px-6
        bg-white text-black
        font-medium text-sm tracking-wide
        hover:bg-gray-100
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
      "
    >
      {isSubmitting ? "Submitting• • •" : "Place Position"}
    </button>
  )
}
```

---

## Gotchas

- Risk scoring must debounce — do not call /api/risk on every keystroke
- Show `• • •` animated dots not a spinner for loading states
- Stake input max comes from AI risk limit, not just config.maxStake — use the lower of the two
- World ID button only shows when stake exceeds worldIdGate — not before
- The slip panel does not close after submission — shows a success state inline then lets user clear
- Remove button on LegCard is hidden until hover — use group-hover pattern
- Combined odds can go very high with 4 legs — always show the cap warning prominently
- On mobile convert the fixed right panel to a bottom drawer using a different layout
