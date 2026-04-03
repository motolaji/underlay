# Skill: Position Tracker Page

## When to Use This Skill
Use when building app/positions/page.tsx — the page where bettors track their active and historical positions. Shows each position with leg-by-leg resolution status and settlement countdown.

## Context
The position tracker reads onchain events from PositionBook.sol to find the user's positions. Each position shows its legs, their resolution status, potential payout, and settlement delay countdown. Read FRONTEND_DESIGN_PROMPT.md before building.

---

## Data Sources

```
PositionBook.sol events (read via getLogs):
  PositionPlaced(positionId, bettor, stake, riskTier, timestamp)
  LegResolved(positionId, legIndex, outcome, timestamp)
  PositionWon(positionId, payout, timestamp)
  PositionLost(positionId, timestamp)
  PositionVoided(positionId, timestamp)
  SettlementInitiated(positionId, delaySeconds, timestamp)
  SettlementExecuted(positionId, payout, timestamp)

Derived state:
  Position status = derived from leg statuses + settlement events
  Settlement ETA  = settlementInitiated.timestamp + delaySeconds
```

---

## lib/hooks/usePositions.ts

```typescript
"use client"

import { useEffect, useState } from "react"
import { usePublicClient, useAccount, useChainId } from "wagmi"
import { ADDRESSES, POSITION_BOOK_ABI } from "@/lib/contracts"
import type { ActivePosition } from "@/types/position"

export function usePositions() {
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [positions, setPositions] = useState<ActivePosition[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const positionBookAddress = ADDRESSES[chainId as keyof typeof ADDRESSES]
    ?.positionBook as `0x${string}`

  useEffect(() => {
    if (!address || !publicClient) return

    async function fetchPositions() {
      setIsLoading(true)
      try {
        // Read PositionPlaced events for this wallet
        const placedLogs = await publicClient.getLogs({
          address: positionBookAddress,
          event: {
            type: "event",
            name: "PositionPlaced",
            inputs: [
              { name: "positionId", type: "bytes32", indexed: true },
              { name: "bettor", type: "address", indexed: true },
              { name: "stake", type: "uint256", indexed: false },
              { name: "riskTier", type: "uint8", indexed: false },
              { name: "timestamp", type: "uint256", indexed: false }
            ]
          },
          args: { bettor: address },
          fromBlock: "earliest"
        })

        // For each position, read its current state
        const positionData = await Promise.all(
          placedLogs.map(async (log) => {
            const positionId = log.args.positionId as `0x${string}`

            // Read full position state from contract
            const position = await publicClient.readContract({
              address: positionBookAddress,
              abi: POSITION_BOOK_ABI,
              functionName: "getPosition",
              args: [positionId]
            }) as unknown

            return mapContractPositionToUI(positionId, position, log)
          })
        )

        // Sort by most recent first
        setPositions(
          positionData
            .filter(Boolean)
            .sort((a, b) => b.placedAt - a.placedAt)
        )
      } catch (error) {
        console.error("Failed to fetch positions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPositions()

    // Poll every 30 seconds for updates
    const interval = setInterval(fetchPositions, 30_000)
    return () => clearInterval(interval)
  }, [address, publicClient, positionBookAddress])

  return { positions, isLoading }
}

function mapContractPositionToUI(
  positionId: string,
  contractPosition: unknown,
  placedLog: unknown
): ActivePosition {
  // TODO: map actual contract return values to ActivePosition type
  // This depends on the exact ABI of getPosition()
  return {
    id: positionId,
    legs: [],       // populated from contract
    stake: 0,
    potentialPayout: 0,
    riskTier: "MEDIUM",
    placedAt: 0,
    status: "OPEN"
  }
}
```

---

## components/PositionCard.tsx

```typescript
"use client"

import { formatUsdc } from "@/lib/utils"
import type { ActivePosition } from "@/types/position"
import { LegStatusRow } from "./LegStatusRow"
import { SettlementCountdown } from "./SettlementCountdown"

interface PositionCardProps {
  position: ActivePosition
}

const STATUS_STYLES = {
  OPEN:    "border-border-default",
  PARTIAL: "border-blue-900",
  WON:     "border-green-900",
  LOST:    "border-red-900",
  VOIDED:  "border-border-subtle opacity-60"
}

const STATUS_LABELS = {
  OPEN:    { text: "Active", colour: "text-text-secondary" },
  PARTIAL: { text: "Resolving", colour: "text-blue-400" },
  WON:     { text: "Won", colour: "text-green-400" },
  LOST:    { text: "Lost", colour: "text-red-400" },
  VOIDED:  { text: "Voided", colour: "text-text-tertiary" }
}

export function PositionCard({ position }: PositionCardProps) {
  const statusStyle = STATUS_STYLES[position.status]
  const statusLabel = STATUS_LABELS[position.status]

  const placedDate = new Date(position.placedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  })

  return (
    <div className={`border bg-bg-surface transition-colors ${statusStyle}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono uppercase tracking-wider ${statusLabel.colour}`}>
            {statusLabel.text}
          </span>
          <span className="text-xs font-mono text-text-tertiary">
            {placedDate}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-secondary">
            Stake: ${position.stake.toFixed(2)}
          </span>
          {position.status === "WON" && position.settlementAt && (
            <SettlementCountdown settlementAt={position.settlementAt} />
          )}
        </div>
      </div>

      {/* Legs */}
      <div className="divide-y divide-border-subtle">
        {position.legs.map((leg, i) => (
          <LegStatusRow key={i} leg={leg} index={i} />
        ))}
      </div>

      {/* Footer — payout info */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
        {position.status === "WON" ? (
          <span className="text-sm font-mono font-medium text-green-400">
            Payout: ${position.potentialPayout.toFixed(2)} USDC
          </span>
        ) : position.status === "OPEN" || position.status === "PARTIAL" ? (
          <span className="text-sm font-mono text-text-tertiary">
            Potential: ${position.potentialPayout.toFixed(2)} USDC
          </span>
        ) : position.status === "LOST" ? (
          <span className="text-sm font-mono text-text-tertiary">
            Lost ${position.stake.toFixed(2)} USDC
          </span>
        ) : (
          <span className="text-sm font-mono text-text-tertiary">
            Refunded ${position.stake.toFixed(2)} USDC
          </span>
        )}

        <span className="text-xs font-mono text-text-tertiary">
          {position.legs.filter(l => l.status === "WON").length}/
          {position.legs.length} confirmed
        </span>
      </div>
    </div>
  )
}
```

---

## components/LegStatusRow.tsx

```typescript
import { formatResolutionDate } from "@/lib/polymarket"
import type { Leg, LegStatus } from "@/types/position"

interface LegStatusRowProps {
  leg: Leg & { status: LegStatus }
  index: number
}

const STATUS_ICONS: Record<LegStatus, string> = {
  OPEN:   "⏳",
  WON:    "✅",
  LOST:   "❌",
  VOIDED: "⚪"
}

const STATUS_COLOURS: Record<LegStatus, string> = {
  OPEN:   "text-text-tertiary",
  WON:    "text-green-400",
  LOST:   "text-red-400",
  VOIDED: "text-text-tertiary"
}

export function LegStatusRow({ leg, index }: LegStatusRowProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Index */}
      <span className="text-xs font-mono text-text-tertiary mt-0.5 w-4 shrink-0">
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary leading-snug line-clamp-2 mb-1">
          {leg.question}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono uppercase ${
            leg.outcome === "yes" ? "text-green-400" : "text-red-400"
          }`}>
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

      {/* Status */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm">{STATUS_ICONS[leg.status]}</span>
        <span className={`text-xs font-mono ${STATUS_COLOURS[leg.status]}`}>
          {leg.status === "OPEN" ? "Pending" : leg.status.toLowerCase()}
        </span>
      </div>
    </div>
  )
}
```

---

## components/SettlementCountdown.tsx

```typescript
"use client"

import { useEffect, useState } from "react"

interface SettlementCountdownProps {
  settlementAt: number  // unix timestamp in ms
}

export function SettlementCountdown({ settlementAt }: SettlementCountdownProps) {
  const [remaining, setRemaining] = useState("")

  useEffect(() => {
    function update() {
      const diff = settlementAt - Date.now()
      if (diff <= 0) {
        setRemaining("Settling• • •")
        return
      }

      const hours = Math.floor(diff / 3_600_000)
      const minutes = Math.floor((diff % 3_600_000) / 60_000)
      const seconds = Math.floor((diff % 60_000) / 1000)

      if (hours > 0) {
        setRemaining(`${hours}h ${minutes}m remaining`)
      } else if (minutes > 0) {
        setRemaining(`${minutes}m ${seconds}s remaining`)
      } else {
        setRemaining(`${seconds}s remaining`)
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [settlementAt])

  return (
    <span className="text-xs font-mono text-amber-400">
      ⏱ {remaining}
    </span>
  )
}
```

---

## app/positions/page.tsx

```typescript
"use client"

import { usePositions } from "@/lib/hooks/usePositions"
import { PositionCard } from "@/components/PositionCard"
import { useAccount } from "wagmi"

export default function PositionsPage() {
  const { isConnected } = useAccount()
  const { positions, isLoading } = usePositions()

  const activePositions = positions.filter(p =>
    p.status === "OPEN" || p.status === "PARTIAL"
  )
  const settledPositions = positions.filter(p =>
    p.status === "WON" || p.status === "LOST" || p.status === "VOIDED"
  )

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-sm font-mono text-text-secondary mb-4">
          Connect your wallet to view your positions
        </p>
        <w3m-button />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-text-primary">
          My Positions
        </h1>
        <span className="text-xs font-mono text-text-tertiary">
          {positions.length} total
        </span>
      </div>

      {isLoading ? (
        <PositionsSkeleton />
      ) : (
        <>
          {/* Active positions */}
          {activePositions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                Active ({activePositions.length})
              </h2>
              {activePositions.map(position => (
                <PositionCard key={position.id} position={position} />
              ))}
            </section>
          )}

          {/* Settled positions */}
          {settledPositions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                Settled ({settledPositions.length})
              </h2>
              {settledPositions.map(position => (
                <PositionCard key={position.id} position={position} />
              ))}
            </section>
          )}

          {/* Empty state */}
          {positions.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-mono text-text-tertiary mb-2">
                No positions yet
              </p>
              <a href="/" className="text-xs font-mono text-blue-400 hover:text-blue-300">
                Browse markets →
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PositionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="border border-border-subtle bg-bg-surface h-[180px] animate-pulse"
        />
      ))}
    </div>
  )
}
```

---

## Gotchas

- `getLogs` with `fromBlock: "earliest"` can be slow on mainnet — consider indexing with The Graph post-hackathon
- Settlement countdown must use `setInterval` with cleanup — always return cleanup function from useEffect
- Position status is derived from multiple events — build a state machine not a series of if statements
- Show potential payout for OPEN positions and actual payout for WON — these are different values
- Voided positions should show refund amount not payout
- Poll every 30s not every block — reduces RPC calls significantly
- On mobile all cards are full width — no grid layout needed for this page
