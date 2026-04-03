# Skill: Polymarket API Integration

## When to Use This Skill
Use when building anything that reads from Polymarket — the /api/markets proxy route, the lib/polymarket.ts helpers, or the CRE workflow market resolution checks. Read _project-context.md first.

## Context
Polymarket is our odds reference signal and primary resolution feed. We use the Gamma API only — no CLOB API, no trading, no auth required. We read two things: current market prices (for odds) and resolved outcomes (for settlement). Polymarket runs on Polygon but we do not interact with their contracts directly — we read their public API.

---

## Three Polymarket APIs

```
Gamma API    https://gamma-api.polymarket.com
  Purpose:   Market discovery, prices, resolution status
  Auth:      NONE — fully public
  Use:       Everything we need

CLOB API     https://clob.polymarket.com
  Purpose:   Order placement, order book depth
  Auth:      Required (API key + HMAC)
  Use:       NOT needed — we do not trade

Data API     https://data-api.polymarket.com
  Purpose:   User positions, trade history
  Auth:      Required
  Use:       NOT needed
```

We only use the Gamma API. No API key required.

---

## Key Gamma API Endpoints

### List Active Markets
```
GET https://gamma-api.polymarket.com/markets
  ?active=true
  &closed=false
  &limit=20
  &order=volume
  &ascending=false

Response: PolymarketMarket[]
```

### Get Specific Market
```
GET https://gamma-api.polymarket.com/markets?id={conditionId}

Response: PolymarketMarket[]  (array with one item)
```

### Get Resolved Markets
```
GET https://gamma-api.polymarket.com/markets
  ?id={conditionId}
  &closed=true

Response: PolymarketMarket[] with resolution data
```

### Search Markets by Tag/Category
```
GET https://gamma-api.polymarket.com/markets
  ?active=true
  &tag=crypto       # or sports, politics, etc.
  &limit=20
```

---

## Full PolymarketMarket Type

```typescript
// types/market.ts
export interface PolymarketMarket {
  // Identity
  id: string               // condition ID — use this as our marketId
  conditionId: string      // same as id
  questionID: string
  slug: string

  // Display
  question: string         // the market question
  description: string
  category: string         // Polymarket's category tag

  // Trading
  outcomePrices: string    // JSON string: '["0.62", "0.38"]' [YES, NO]
  outcomes: string[]       // ["Yes", "No"]
  clobTokenIds: string[]   // token IDs for each outcome

  // Status
  active: boolean          // true if trading is live
  closed: boolean          // true if market has resolved
  archived: boolean

  // Resolution
  resolutionSource: string
  endDate: string          // ISO string of resolution deadline
  startDate: string

  // Volume/Liquidity
  volume: number           // total trading volume in USDC
  liquidity: number        // current liquidity
  volume24hr: number

  // Resolution result (only when closed=true)
  resolvedBy?: string
  resolution?: string      // "Yes" or "No" when resolved
}

export type MarketCategory = "crypto" | "sports" | "politics" | "macro" | "other"

export interface MarketWithProbability extends PolymarketMarket {
  yesProbability: number   // parsed from outcomePrices[0]
  noProbability: number    // parsed from outcomePrices[1]
  category: MarketCategory // our detected category
}
```

---

## lib/polymarket.ts — Complete Implementation

```typescript
import type {
  PolymarketMarket,
  MarketWithProbability,
  MarketCategory
} from "@/types/market"

const GAMMA_BASE = "https://gamma-api.polymarket.com"

// --- Category Detection ---

const CATEGORY_KEYWORDS: Record<Exclude<MarketCategory, "other">, string[]> = {
  crypto: [
    "bitcoin", "btc", "eth", "ethereum", "crypto", "sol", "solana",
    "price", "bnb", "xrp", "doge", "market cap", "dominance", "defi"
  ],
  sports: [
    "win", "wins", "beat", "beats", "championship", "nfl", "nba", "nhl",
    "mlb", "premier", "match", "game", "tournament", "cup", "super bowl",
    "world cup", "olympics", "league", "season", "playoffs"
  ],
  politics: [
    "election", "president", "senate", "congress", "vote", "political",
    "governor", "mayor", "legislation", "policy", "party", "democrat",
    "republican", "prime minister", "parliament"
  ],
  macro: [
    "fed", "federal reserve", "rate", "cpi", "gdp", "inflation",
    "recession", "treasury", "interest rate", "unemployment", "jobs",
    "economy", "economic", "ecb", "central bank"
  ]
}

export function detectCategory(market: PolymarketMarket): MarketCategory {
  const q = market.question.toLowerCase()
  const desc = (market.description ?? "").toLowerCase()
  const text = `${q} ${desc}`

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) {
      return category as MarketCategory
    }
  }
  return "other"
}

// --- Price Parsing ---

export function parseOutcomePrices(outcomePrices: string): {
  yes: number
  no: number
} {
  try {
    const prices = JSON.parse(outcomePrices) as string[]
    if (prices.length < 2) return { yes: 0.5, no: 0.5 }
    return {
      yes: Math.max(0, Math.min(1, parseFloat(prices[0]))),
      no: Math.max(0, Math.min(1, parseFloat(prices[1])))
    }
  } catch {
    return { yes: 0.5, no: 0.5 }
  }
}

// Check if a market's resolution is valid for use as a position leg
export function isValidLeg(market: PolymarketMarket): boolean {
  if (!market.active || market.closed || market.archived) return false
  if (!market.outcomePrices) return false
  if (!market.outcomes || market.outcomes.length !== 2) return false
  if (market.liquidity < 1000) return false  // min $1k liquidity

  const { yes, no } = parseOutcomePrices(market.outcomePrices)
  // Filter out markets that are already near-certain (>95% or <5%)
  // These have poor odds for bettors and skewed risk for pool
  if (yes > 0.95 || yes < 0.05) return false

  return true
}

// --- Enrichment ---

export function enrichMarket(market: PolymarketMarket): MarketWithProbability {
  const { yes, no } = parseOutcomePrices(market.outcomePrices)
  return {
    ...market,
    yesProbability: yes,
    noProbability: no,
    category: detectCategory(market)
  }
}

// --- Resolution Checking ---

export function isMarketResolved(market: PolymarketMarket): boolean {
  return market.closed && !!market.resolution
}

export function getMarketOutcome(market: PolymarketMarket): boolean | null {
  if (!isMarketResolved(market)) return null

  // resolution is "Yes" or "No"
  if (market.resolution === "Yes") return true
  if (market.resolution === "No") return false
  return null
}

// For crypto price markets, verify against Chainlink feed
// Returns true if outcome matches, false if contradicts, null if not applicable
export function extractPriceThreshold(question: string): {
  asset: "ETH" | "BTC" | null
  threshold: number | null
  direction: "above" | "below" | null
} {
  const q = question.toLowerCase()

  // Match patterns like "ETH above $4,000" or "BTC below $95,000"
  const ethMatch = q.match(/eth(?:ereum)?\s+(above|below)\s+\$?([\d,]+)/)
  const btcMatch = q.match(/btc|bitcoin\s+(above|below)\s+\$?([\d,]+)/)

  if (ethMatch) {
    return {
      asset: "ETH",
      threshold: parseFloat(ethMatch[2].replace(/,/g, "")),
      direction: ethMatch[1] as "above" | "below"
    }
  }
  if (btcMatch) {
    return {
      asset: "BTC",
      threshold: parseFloat(btcMatch[2].replace(/,/g, "")),
      direction: btcMatch[1] as "above" | "below"
    }
  }

  return { asset: null, threshold: null, direction: null }
}

// --- Display Helpers ---

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`
  return `$${volume.toFixed(0)}`
}

export function formatLiquidity(liquidity: number): string {
  if (liquidity >= 1_000_000) return `$${(liquidity / 1_000_000).toFixed(1)}M`
  if (liquidity >= 1_000) return `$${(liquidity / 1_000).toFixed(0)}K`
  return `$${liquidity.toFixed(0)}`
}

export function formatResolutionDate(endDate: string): string {
  const date = new Date(endDate)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) return "Resolved"
  if (diffHours < 2) return `${diffHours}h` // timing risk flag territory
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function hasTimingRisk(endDate: string): boolean {
  const diffMs = new Date(endDate).getTime() - Date.now()
  return diffMs > 0 && diffMs < 2 * 60 * 60 * 1000 // within 2 hours
}

export function hasLowLiquidity(market: PolymarketMarket): boolean {
  return market.liquidity < 10_000 // below $10k
}
```

---

## /api/markets/route.ts — Full Implementation

```typescript
import { NextRequest, NextResponse } from "next/server"
import type { PolymarketMarket } from "@/types/market"

const GAMMA_BASE = "https://gamma-api.polymarket.com"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") ?? "all"
  const limit = parseInt(searchParams.get("limit") ?? "24")
  const marketId = searchParams.get("id")

  try {
    // Single market lookup
    if (marketId) {
      const res = await fetch(
        `${GAMMA_BASE}/markets?id=${marketId}`,
        { next: { revalidate: 10 } }
      )
      const markets: PolymarketMarket[] = await res.json()
      return NextResponse.json({ markets })
    }

    // Market listing
    const params = new URLSearchParams({
      active: "true",
      closed: "false",
      limit: String(limit),
      order: "volume",
      ascending: "false"
    })

    if (category !== "all") {
      params.set("tag_slug", category)
    }

    const res = await fetch(
      `${GAMMA_BASE}/markets?${params.toString()}`,
      {
        headers: { "Accept": "application/json" },
        next: { revalidate: 30 }
      }
    )

    if (!res.ok) {
      throw new Error(`Gamma API error: ${res.status}`)
    }

    const markets: PolymarketMarket[] = await res.json()

    // Filter for valid legs only
    const validMarkets = markets.filter(m =>
      m.active &&
      !m.closed &&
      !m.archived &&
      m.outcomePrices &&
      m.outcomes?.length === 2 &&
      m.liquidity >= 1000
    )

    return NextResponse.json({
      markets: validMarkets,
      total: validMarkets.length
    })

  } catch (error) {
    console.error("Gamma API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch markets", markets: [] },
      { status: 500 }
    )
  }
}
```

---

## Storing Market IDs in Contracts

When a bettor submits a position, we store Polymarket's conditionId (bytes32-compatible) in PositionBook.sol. This allows Chainlink CRE to look up the market later for resolution.

```solidity
// In PositionBook.sol
struct Leg {
    bytes32 marketId;       // Polymarket conditionId
    uint8 outcome;          // 0 = YES, 1 = NO
    uint256 lockedOdds;     // our formula output (scaled 1e6)
    uint256 resolutionTime; // market endDate as unix timestamp
    LegStatus status;
}
```

```typescript
// On frontend — convert string conditionId to bytes32
import { stringToHex, padHex } from "viem"

function marketIdToBytes32(conditionId: string): `0x${string}` {
  // Polymarket conditionIds are already hex strings starting with 0x
  // Pad to 32 bytes if needed
  return padHex(conditionId as `0x${string}`, { size: 32 })
}
```

---

## Gotchas

- `outcomePrices` is a JSON string not an array — always `JSON.parse()` it
- Markets with `active: true` and `closed: true` simultaneously — filter both
- Very low liquidity markets (<$1k) have unreliable prices — filter them out
- `endDate` is sometimes in the past for active markets — handle gracefully
- Markets resolving within 2 hours should trigger timing risk flag in AI scorer
- Near-certain markets (>95% YES or NO) should be excluded as legs — poor odds
- Polymarket rate limits apply at high frequency — cache responses for 30 seconds
- conditionId and id are the same field — use conditionId for clarity
- Some markets have more than 2 outcomes (categorical) — filter to binary only
- Resolution field is "Yes" or "No" as a string, not a boolean
