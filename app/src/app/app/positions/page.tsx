"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

import { EmptyState } from "@/components/common/EmptyState";
import { positionBookAbi } from "@/lib/contracts/abi/positionBook";
import { contractAddresses } from "@/lib/contracts/addresses";
import { formatUsdc, shortenHash } from "@/lib/format";

const POSITION_COLUMNS = ["State", "Position", "Legs", "Stake", "Payout", "Risk", "Placed"];

const STATUS_LABELS = ["Open", "Partial", "Won", "Lost", "Voided"];
const LEG_STATUS_LABELS = ["Open", "Won", "Lost", "Voided"];
const RISK_LABELS = ["Low", "Medium", "High"];

const STATUS_COLORS: Record<string, string> = {
  Open: "text-[color:var(--text-secondary)]",
  Partial: "text-[color:var(--metric-warning-text)]",
  Won: "text-[color:var(--metric-accent-text)]",
  Lost: "text-[color:var(--badge-danger-text)]",
  Voided: "text-[color:var(--text-tertiary)]",
};

const LEG_STATUS_COLORS: Record<string, string> = {
  Open: "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)]",
  Won: "border-[color:var(--badge-success-border)] text-[color:var(--badge-success-text)]",
  Lost: "border-[color:var(--badge-danger-border)] text-[color:var(--badge-danger-text)]",
  Voided: "border-[color:var(--border-subtle)] text-[color:var(--text-tertiary)]",
};

type Leg = {
  marketId: `0x${string}`;
  outcome: number;
  lockedOdds: bigint;
  resolutionTime: bigint;
  status: number;
};

type PositionRow = {
  id: `0x${string}`;
  stake: bigint;
  payout: bigint;
  combinedOdds: bigint;
  riskTier: number;
  riskAuditHash: `0x${string}`;
  status: number;
  placedAt: bigint;
  legsWon: number;
  legsTotal: number;
  worldIdVerified: boolean;
  legs: Leg[];
};

function formatOdds(raw: bigint) {
  return `${(Number(raw) / 1_000_000).toFixed(2)}x`;
}

export default function AppPositionsPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const positionBookAddress = contractAddresses.baseSepolia.positionBook;
  const [rows, setRows] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!publicClient || !address || !positionBookAddress) {
      setRows([]);
      return;
    }

    const client = publicClient;
    const owner = address;
    const bookAddress = positionBookAddress as `0x${string}`;
    let cancelled = false;

    async function loadPositions() {
      setLoading(true);
      setError(null);

      try {
        const [ids] = (await client.readContract({
          address: bookAddress,
          abi: positionBookAbi,
          functionName: "getPositionsByOwner",
          args: [owner, 0n, 25n],
        })) as [readonly `0x${string}`[], bigint, boolean];

        if (ids.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const details = await Promise.all(
          ids.map(async (id) => {
            const [position, legs] = await Promise.all([
              client.readContract({
                address: bookAddress,
                abi: positionBookAbi,
                functionName: "getPosition",
                args: [id],
              }) as Promise<{
                id: `0x${string}`;
                stake: bigint;
                potentialPayout: bigint;
                combinedOdds: bigint;
                riskTier: number;
                riskAuditHash: `0x${string}`;
                placedAt: bigint;
                status: number;
                legsWon: number;
                legsTotal: number;
                worldIdVerified: boolean;
              }>,
              client.readContract({
                address: bookAddress,
                abi: positionBookAbi,
                functionName: "getPositionLegs",
                args: [id],
              }) as Promise<
                readonly {
                  marketId: `0x${string}`;
                  outcome: number;
                  lockedOdds: bigint;
                  resolutionTime: bigint;
                  status: number;
                }[]
              >,
            ]);

            return {
              id: position.id,
              stake: position.stake,
              payout: position.potentialPayout,
              combinedOdds: position.combinedOdds,
              riskTier: position.riskTier,
              riskAuditHash: position.riskAuditHash,
              status: position.status,
              placedAt: position.placedAt,
              legsWon: position.legsWon,
              legsTotal: position.legsTotal,
              worldIdVerified: position.worldIdVerified,
              legs: legs.map((leg) => ({ ...leg })),
            } satisfies PositionRow;
          })
        );

        if (!cancelled) {
          setRows(details.reverse());
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load positions."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPositions();
    return () => { cancelled = true; };
  }, [address, positionBookAddress, publicClient]);

  return (
    <div className="section-shell space-y-6 py-6">
      <div>
        <p className="eyebrow mb-2">Settlement Ledger</p>
        <h1
          className="text-3xl text-[color:var(--text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Positions
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-7">
          Wallet-scoped positions loaded live from PositionBook on Base Sepolia.
        </p>
      </div>

      <div className="border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
        {isConnected
          ? "Wallet connected — showing all submitted positions with leg detail."
          : "Connect a wallet to load your submitted positions."}
      </div>

      <div className="border border-[color:var(--border-subtle)]">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 border-b border-[color:var(--border-subtle)] px-4 py-3 md:grid-cols-7">
          {POSITION_COLUMNS.map((col) => (
            <div
              key={col}
              className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)]"
            >
              {col}
            </div>
          ))}
        </div>

        <div className="p-6">
          {!isConnected ? (
            <EmptyState
              title="Connect your wallet"
              body="The positions ledger reads wallet-scoped data from the live PositionBook contract."
            />
          ) : loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse bg-[color:var(--bg-elevated)]" />
              ))}
            </div>
          ) : error ? (
            <EmptyState title="Could not load positions" body={error} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No positions yet"
              body="Once you submit a position from the betslip, it will appear here with full leg detail."
            />
          ) : (
            <div className="space-y-px">
              {rows.map((row) => {
                const statusLabel = STATUS_LABELS[row.status] ?? "Unknown";
                const isOpen = expanded.has(row.id);

                return (
                  <div key={row.id}>
                    {/* Position row */}
                    <article
                      className="grid grid-cols-4 gap-4 border-b border-[color:var(--border-subtle)] px-4 py-4 text-sm md:grid-cols-7 cursor-pointer hover:bg-[color:var(--bg-elevated)] transition-colors"
                      onClick={() => toggleExpand(row.id)}
                    >
                      {/* Status */}
                      <div>
                        <span className={`font-medium ${STATUS_COLORS[statusLabel] ?? ""}`}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Position ID */}
                      <div>
                        <div className="font-mono text-[11px] text-[color:var(--text-primary)]">
                          {shortenHash(row.id)}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                          {row.worldIdVerified ? "World ID" : "No gate proof"}
                        </div>
                      </div>

                      {/* Legs progress */}
                      <div>
                        <div className="font-mono text-[11px] text-[color:var(--text-primary)]">
                          {row.legsWon}/{row.legsTotal} won
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                          {formatOdds(row.combinedOdds)} combined
                        </div>
                      </div>

                      {/* Stake */}
                      <div className="font-mono text-[color:var(--text-primary)]">
                        {formatUsdc(row.stake)}
                      </div>

                      {/* Payout */}
                      <div className="font-mono text-[color:var(--metric-accent-text)]">
                        {formatUsdc(row.payout)}
                      </div>

                      {/* Risk */}
                      <div className="font-mono text-[color:var(--text-primary)]">
                        {RISK_LABELS[row.riskTier] ?? "Unknown"}
                      </div>

                      {/* Placed + expand indicator */}
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[color:var(--text-secondary)]">
                          {new Date(Number(row.placedAt) * 1000).toLocaleString()}
                        </span>
                        <span className="ml-2 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                          {isOpen ? "▲" : "▼"}
                        </span>
                      </div>
                    </article>

                    {/* Expanded leg detail */}
                    {isOpen && (
                      <div className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-4">
                        {/* Legs */}
                        <div className="mb-4">
                          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)]">
                            Legs ({row.legs.length})
                          </p>
                          <div className="space-y-2">
                            {row.legs.map((leg, i) => {
                              const legStatusLabel = LEG_STATUS_LABELS[leg.status] ?? "Unknown";
                              return (
                                <div
                                  key={i}
                                  className="flex items-center justify-between border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                                      #{i + 1}
                                    </span>
                                    <div>
                                      <div className="font-mono text-[11px] text-[color:var(--text-primary)]">
                                        Market {shortenHash(leg.marketId)}
                                      </div>
                                      <div className="mt-0.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                                        Outcome {leg.outcome} · {formatOdds(leg.lockedOdds)} ·{" "}
                                        Resolves {new Date(Number(leg.resolutionTime) * 1000).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                  <span
                                    className={`border px-2 py-0.5 font-mono text-[10px] ${LEG_STATUS_COLORS[legStatusLabel] ?? ""}`}
                                  >
                                    {legStatusLabel}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Audit hash */}
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)]">
                            Risk audit
                          </span>
                          <span className="font-mono text-[10px] text-[color:var(--text-secondary)]">
                            {shortenHash(row.riskAuditHash, 10, 8)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
