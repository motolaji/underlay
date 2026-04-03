# Skill: Market Browser Page

## When to Use This Skill
Use when building app/page.tsx — the main bettor-facing page that displays Polymarket markets and lets users build a position slip.

## Context
This is the bettor home page. It fetches live markets from the Polymarket Gamma API via our Next.js proxy route (/api/markets). Markets display as cards in a grid. Users click to add legs to their betslip. The betslip lives as a fixed panel on the right side — never a modal. Read FRONTEND_DESIGN_PROMPT.md before building this.

---

## Page Layout

```
Desktop (≥1024px):
┌──────────────────────────────────────────────────────┐
│ Header                                               │
├───────────────────────────────────┬──────────────────┤
│ Market Browser (flex-1)           │ BetSlip (360px)  │
│                                   │ fixed right      │
│ [category filters]                │                  │
│ [market grid 2-col]               │ [legs list]      │
│                                   │ [odds display]   │
│                                   │ [stake + cta]    │
└───────────────────────────────────┴──────────────────┘

Mobile (<1024px):
Market browser full width
BetSlip slides up from bottom as a drawer
```

---

## /api/markets/route.ts

The Gamma API proxy — keeps API calls server-side:

```typescript
// app/api/markets/route.ts
import { NextRequest, NextResponse } from "next/server"
import type { PolymarketMarket } from "@/types/market"

const GAMMA_BASE = "https://gamma-api.polymarket.com"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const limit = searchParams.get("limit") ?? "20"

  try {
    // Build Gamma API URL
    const params = new URLSearchParams({
      active: "true",
      closed: "false",
      limit,
      order: "volume",
      ascending: "false"
    })

    if (category && category !== "all") {
      params.set("tag", category)
    }

    const res = await fetch(
      `${GAMMA_BASE}/markets?${params.toString()}`,
      {
        headers: { "Accept": "application/json" },
        next: { revalidate: 30 } // cache for 30 seconds
      }
    )

    if (!res.ok) {
      throw new Error(`Gamma API error: ${res.status}`)
    }

    const markets: PolymarketMarket[] = await res.json()

    // Filter out markets without valid prices
    const validMarkets = markets.filter(m =>
      m.outcomePrices &&
      m.active &&
      !m.closed &&
      m.outcomes?.length === 2
    )

    return NextResponse.json({ markets: validMarkets })
  } catch (error) {
    console.error("Gamma API fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch markets", markets: [] },
      { status: 500 }
    )
  }
}
```

---

## lib/polymarket.ts

Helper functions for working with Polymarket data:

```typescript
import type { PolymarketMarket, MarketWithProbability, MarketCategory } from "@/types/market"

const CATEGORY_KEYWORDS: Record<MarketCategory, string[]> = {
  crypto:   ["bitcoin", "btc", "eth", "ethereum", "crypto", "sol", "price"],
  sports:   ["win", "championship", "nfl", "nba", "premier", "match", "game", "beats"],
  politics: ["election", "president", "senate", "congress", "vote", "political"],
  macro:    ["fed", "rate", "cpi", "gdp", "inflation", "recession", "treasury"],
  other:    []
}

export function detectCategory(market: PolymarketMarket): MarketCategory {
  const q = market.question.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") continue
    if (keywords.some(k => q.includes(k))) {
      return category as MarketCategory
    }
  }
  return "other"
}

export function parseOutcomePrices(outcomePrices: string): {
  yes: number
  no: number
} {
  try {
    const [yes, no] = JSON.parse(outcomePrices) as string[]
    return {
      yes: parseFloat(yes),
      no: parseFloat(no)
    }
  } catch {
    return { yes: 0.5, no: 0.5 }
  }
}

export function enrichMarket(market: PolymarketMarket): MarketWithProbability {
  const { yes, no } = parseOutcomePrices(market.outcomePrices)
  return {
    ...market,
    yesProbability: yes,
    noProbability: no,
    category: detectCategory(market)
  }
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`
  return `$${volume.toFixed(0)}`
}

export function formatResolutionDate(endDate: string): string {
  const date = new Date(endDate)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
```

---

## components/ui/MarketCard.tsx

```typescript
"use client"

import { cn } from "@/lib/utils"
import { formatVolume, formatResolutionDate } from "@/lib/polymarket"
import type { MarketWithProbability } from "@/types/market"
import type { Leg } from "@/types/position"
import { useBetslip } from "@/lib/store/betslip"

interface MarketCardProps {
  market: MarketWithProbability
}

export function MarketCard({ market }: MarketCardProps) {
  const { legs, addLeg } = useBetslip()
  const isInSlip = legs.some(l => l.marketId === market.id)
  const slipFull = legs.length >= 4

  function handleAdd(outcome: "yes" | "no") {
    if (isInSlip || slipFull) return

    const probability = outcome === "yes"
      ? market.yesProbability
      : market.noProbability

    const leg: Leg = {
      marketId: market.id,
      question: market.question,
      outcome,
      probability,
      adjustedOdds: 0,  // calculated in BetSlip after risk score
      category: market.category,
      resolutionDate: market.endDate
    }

    addLeg(leg)
  }

  return (
    <div className={cn(
      "p-4 border transition-colors duration-150 cursor-default",
      isInSlip
        ? "border-l-2 border-l-blue-600 border-t-border-subtle border-r-border-subtle border-b-border-subtle bg-bg-surface"
        : "border-border-subtle hover:border-border-default bg-bg-surface"
    )}>
      {/* Category + Resolution */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-text-tertiary uppercase tracking-wider">
          {market.category}
        </span>
        <span className="text-xs font-mono text-text-tertiary">
          {formatResolutionDate(market.endDate)}
        </span>
      </div>

      {/* Question */}
      <p className="text-sm font-medium text-text-primary leading-snug mb-3 min-h-[40px]">
        {market.question}
      </p>

      {/* YES/NO Probability Bars */}
      <div className="space-y-1.5 mb-3">
        <OutcomeRow
          label="YES"
          probability={market.yesProbability}
          colour="bg-green-500"
          disabled={isInSlip || slipFull}
          onAdd={() => handleAdd("yes")}
        />
        <OutcomeRow
          label="NO"
          probability={market.noProbability}
          colour="bg-red-500"
          disabled={isInSlip || slipFull}
          onAdd={() => handleAdd("no")}
        />
      </div>

      {/* Volume + Status */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-text-tertiary">
          Vol {formatVolume(market.volume)}
        </span>
        {isInSlip ? (
          <span className="text-xs font-mono text-blue-400">
            ✓ In slip
          </span>
        ) : slipFull ? (
          <span className="text-xs font-mono text-text-tertiary">
            Slip full (4 max)
          </span>
        ) : null}
      </div>
    </div>
  )
}

interface OutcomeRowProps {
  label: string
  probability: number
  colour: string
  disabled: boolean
  onAdd: () => void
}

function OutcomeRow({ label, probability, colour, disabled, onAdd }: OutcomeRowProps) {
  const pct = `${(probability * 100).toFixed(0)}%`

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-xs font-mono text-text-secondary w-7 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1 bg-bg-elevated relative overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", colour)}
          style={{ width: pct }}
        />
      </div>
      <span className="text-xs font-mono text-text-primary w-8 text-right shrink-0">
        {pct}
      </span>
      {!disabled && (
        <button
          onClick={onAdd}
          className="
            text-xs font-mono text-text-tertiary
            group-hover:text-text-primary
            transition-colors duration-150
            shrink-0 ml-1
          "
        >
          +
        </button>
      )}
    </div>
  )
}
```

---

## app/page.tsx

```typescript
"use client"

import { useState, useEffect } from "react"
import { MarketCard } from "@/components/ui/MarketCard"
import { BetSlip } from "@/components/betslip/BetSlip"
import { enrichMarket } from "@/lib/polymarket"
import type { MarketWithProbability, MarketCategory } from "@/types/market"
import { useBetslip } from "@/lib/store/betslip"

const CATEGORIES: { label: string; value: MarketCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Crypto", value: "crypto" },
  { label: "Sports", value: "sports" },
  { label: "Politics", value: "politics" },
  { label: "Macro", value: "macro" },
]

export default function MarketBrowserPage() {
  const [markets, setMarkets] = useState<MarketWithProbability[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<MarketCategory | "all">("all")
  const { legs } = useBetslip()
  const slipOpen = legs.length > 0

  useEffect(() => {
    async function fetchMarkets() {
      setLoading(true)
      try {
        const res = await fetch(`/api/markets?category=${category}&limit=20`)
        const { markets: raw } = await res.json()
        setMarkets(raw.map(enrichMarket))
      } catch (err) {
        console.error("Failed to fetch markets:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMarkets()
  }, [category])

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Category filters */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border-subtle shrink-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors duration-150",
                category === cat.value
                  ? "text-text-primary border-b border-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Market grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <MarketGridSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {markets.map(market => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          )}
          {!loading && markets.length === 0 && (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm font-mono text-text-tertiary">
                No active markets
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BetSlip — fixed right panel */}
      {slipOpen && (
        <div className="w-[360px] shrink-0 border-l border-border-subtle overflow-y-auto">
          <BetSlip />
        </div>
      )}
    </div>
  )
}

function MarketGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="p-4 border border-border-subtle bg-bg-surface h-[140px] animate-pulse"
        />
      ))}
    </div>
  )
}
```

---

## Gotchas

- Polymarket Gamma API returns `outcomePrices` as a JSON string — always parse it
- Markets can have `active: true` but `closed: true` — filter both
- Category detection is keyword-based — some markets will fall into "other"
- The betslip panel pushes the market grid — it does not overlay it
- On mobile the betslip is a bottom drawer — handle with a different layout breakpoint
- Always show the volume — it signals how reliable the market's probability is
- Markets with very low volume (under $10k) should show a low-liquidity warning in the MarketCard
