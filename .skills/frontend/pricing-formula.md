# Skill: Pricing Formula (Client-Side)

## When to Use This Skill
Use when implementing the client-side pricing formula in lib/pricing.ts. This runs in the browser to show bettors their odds preview before submitting. The same formula logic is also enforced onchain in the contracts.

## Context
Polymarket prices are implied probabilities (0.0 to 1.0). We apply our own formula on top — adjusting for pool utilisation, AI correlation score, and our 5% vig. The result is the combined odds for the bettor's position. Payout is capped at config.maxPayout. All amounts in JavaScript numbers for display (not BigInt — that is for contract interactions).

---

## lib/pricing.ts

```typescript
import type { Leg } from "@/types/position"

export interface PricingConfig {
  maxPayout: number    // in USDC dollars e.g. 100 (testnet) or 1000 (mainnet)
  maxStake: number     // in USDC dollars e.g. 5 (testnet) or 50 (mainnet)
  vig: number          // protocol edge e.g. 0.05 (5%)
}

export interface PricingInput {
  legs: Leg[]
  poolUtilisation: number    // 0.0 to 1.0 (openLiability / poolTVL)
  correlationScore: number   // 0.0 to 1.0 from AI risk engine
  stake: number              // bettor's stake in USDC dollars
  config: PricingConfig
}

export interface PricingOutput {
  legOdds: number[]          // individual adjusted odds per leg
  combinedOdds: number       // product of all leg odds
  potentialPayout: number    // min(stake * combinedOdds, maxPayout)
  isCapped: boolean          // true if payout was capped
  effectiveOdds: number      // combinedOdds adjusted for cap if needed
}

// --- Core Formula ---

export function calculateLegOdds(
  baseProbability: number,
  utilisation: number,
  correlationFactor: number,
  vig: number
): number {
  // Adjust probability upward (worse for bettor) based on
  // pool utilisation and correlation risk
  const adjustedProbability =
    baseProbability *
    (1 + utilisation * 0.3) *
    (1 + correlationFactor * 0.1)

  // Clamp to valid range — probability cannot exceed 1
  const clampedProbability = Math.min(adjustedProbability, 0.99)

  // Convert probability to decimal odds and apply vig
  const rawOdds = 1 / clampedProbability
  const adjustedOdds = rawOdds * (1 - vig)

  // Minimum odds of 1.01 — bettor always gets at least something
  return Math.max(adjustedOdds, 1.01)
}

export function calculatePricing(input: PricingInput): PricingOutput {
  const { legs, poolUtilisation, correlationScore, stake, config } = input

  // Calculate individual leg odds
  const legOdds = legs.map(leg =>
    calculateLegOdds(
      leg.probability,
      poolUtilisation,
      correlationScore,
      config.vig
    )
  )

  // Combined odds = product of all leg odds
  const combinedOdds = legOdds.reduce((acc, odds) => acc * odds, 1)

  // Raw payout before cap
  const rawPayout = stake * combinedOdds

  // Apply max payout cap
  const potentialPayout = Math.min(rawPayout, config.maxPayout)
  const isCapped = rawPayout > config.maxPayout

  // Effective odds accounting for cap
  const effectiveOdds = stake > 0 ? potentialPayout / stake : combinedOdds

  return {
    legOdds,
    combinedOdds,
    potentialPayout,
    isCapped,
    effectiveOdds
  }
}

// --- Display Helpers ---

// Format odds for display e.g. 4.32 -> "4.32x"
export function formatOdds(odds: number): string {
  return `${odds.toFixed(2)}x`
}

// Format probability for display e.g. 0.62 -> "62%"
export function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(0)}%`
}

// Format payout for display e.g. 86.4 -> "$86.40"
export function formatPayout(amount: number): string {
  return `$${amount.toFixed(2)}`
}

// Format stake for display
export function formatStake(amount: number): string {
  return `$${amount.toFixed(2)}`
}

// Get implied probability from Polymarket price string
// Polymarket returns outcomePrices as JSON string e.g. '["0.62", "0.38"]'
export function parsePolymarketProbability(
  outcomePrices: string,
  outcomeIndex: number // 0 for YES, 1 for NO
): number {
  try {
    const prices = JSON.parse(outcomePrices) as string[]
    return parseFloat(prices[outcomeIndex])
  } catch {
    return 0.5 // fallback to 50/50
  }
}

// Get pool utilisation from contract data
export function calculateUtilisation(
  openLiability: bigint,
  poolTVL: bigint
): number {
  if (poolTVL === 0n) return 0
  return Number(openLiability) / Number(poolTVL)
}

// --- Config Helpers ---

// Testnet config (scaled for faucet availability)
export const TESTNET_CONFIG: PricingConfig = {
  maxPayout: 100,   // $100
  maxStake: 5,      // $5
  vig: 0.05
}

// Mainnet config
export const MAINNET_CONFIG: PricingConfig = {
  maxPayout: 1000,  // $1,000
  maxStake: 50,     // $50
  vig: 0.05
}

// Get config based on chain ID
export function getPricingConfig(chainId: number): PricingConfig {
  // Base Sepolia = 84532, 0G Testnet = 16600
  const isTestnet = chainId === 84532 || chainId === 16600
  return isTestnet ? TESTNET_CONFIG : MAINNET_CONFIG
}
```

---

## Usage in BetSlip Component

```typescript
import { calculatePricing, getPricingConfig, formatOdds, formatPayout } from "@/lib/pricing"
import { useChainId } from "wagmi"

// Inside BetSlip component:
const chainId = useChainId()
const config = getPricingConfig(chainId)

const pricing = calculatePricing({
  legs,
  poolUtilisation: 0.42,      // from vault contract read
  correlationScore: riskScore?.correlationScore ?? 0,
  stake: parseFloat(stakeInput),
  config
})

// Display
<span>{formatOdds(pricing.combinedOdds)}</span>
<span>{formatPayout(pricing.potentialPayout)}</span>
{pricing.isCapped && (
  <span className="text-xs text-amber-500">
    Capped at {formatPayout(config.maxPayout)}
  </span>
)}
```

---

## Gotchas

- Polymarket probability can be 0 or 1 on resolved markets — filter these out before calculating
- Combined odds grow fast with many legs — always show the cap warning prominently
- Pool utilisation from contract is in basis points (bigint) — divide by 10000 before using
- Stake input is a string from the input field — always parseFloat and validate before calculating
- Do not calculate pricing if legs array is empty — return zero/null state
- correlationScore comes from the AI risk API call — use 0 as default while loading
