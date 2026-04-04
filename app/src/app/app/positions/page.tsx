"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

import { EmptyState } from "@/components/common/EmptyState";
import { positionBookAbi } from "@/lib/contracts/abi/positionBook";
import { contractAddresses } from "@/lib/contracts/addresses";
import { formatUsdc, shortenHash } from "@/lib/format";

const columns = ["State", "Position", "Stake", "Payout", "Risk", "Placed"];

type PositionRow = {
  id: `0x${string}`;
  stake: bigint;
  payout: bigint;
  riskTier: number;
  status: number;
  placedAt: bigint;
  worldIdVerified: boolean;
};

const STATUS_LABELS = ["Open", "Partial", "Won", "Lost", "Voided"];
const RISK_LABELS = ["Low", "Medium", "High"];

export default function AppPositionsPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const positionBookAddress = contractAddresses.baseSepolia.positionBook;
  const [rows, setRows] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            const position = (await client.readContract({
              address: bookAddress,
              abi: positionBookAbi,
              functionName: "getPosition",
              args: [id],
            })) as {
              id: `0x${string}`;
              stake: bigint;
              potentialPayout: bigint;
              riskTier: number;
              status: number;
              placedAt: bigint;
              worldIdVerified: boolean;
            };

            return {
              id: position.id,
              stake: position.stake,
              payout: position.potentialPayout,
              riskTier: position.riskTier,
              status: position.status,
              placedAt: position.placedAt,
              worldIdVerified: position.worldIdVerified,
            } satisfies PositionRow;
          })
        );

        if (!cancelled) {
          setRows(details.reverse());
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Failed to load positions.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPositions();

    return () => {
      cancelled = true;
    };
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
          Submitted positions now load directly from the live PositionBook on Base Sepolia.
        </p>
      </div>

      <div className="border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
        {isConnected
          ? "Wallet connected. Loading positions from the live deployment."
          : "Connect a wallet to load your submitted positions."}
      </div>

      <div className="border border-[color:var(--border-subtle)]">
        <div className="grid grid-cols-2 gap-4 border-b border-[color:var(--border-subtle)] px-4 py-3 md:grid-cols-6">
          {columns.map((col) => (
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
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse bg-[color:var(--bg-elevated)]" />
              ))}
            </div>
          ) : error ? (
            <EmptyState title="Could not load positions" body={error} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No positions yet"
              body="Once you submit a position from the betslip, it will appear here with stake, payout, risk tier, and wallet-scoped state."
            />
          ) : (
            <div className="space-y-px">
              {rows.map((row) => (
                <article
                  key={row.id}
                  className="grid grid-cols-2 gap-4 border-b border-[color:var(--border-subtle)] px-4 py-4 text-sm md:grid-cols-6"
                >
                  <div>
                    <span className="font-medium text-[color:var(--text-primary)]">
                      {STATUS_LABELS[row.status] ?? "Unknown"}
                    </span>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] text-[color:var(--text-primary)]">
                      {shortenHash(row.id)}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                      {row.worldIdVerified ? "World ID" : "No gate proof"}
                    </div>
                  </div>
                  <div className="font-mono text-[color:var(--text-primary)]">{formatUsdc(row.stake)}</div>
                  <div className="font-mono text-[color:var(--text-primary)]">{formatUsdc(row.payout)}</div>
                  <div className="font-mono text-[color:var(--text-primary)]">
                    {RISK_LABELS[row.riskTier] ?? "Unknown"}
                  </div>
                  <div className="font-mono text-[color:var(--text-secondary)]">
                    {new Date(Number(row.placedAt) * 1000).toLocaleString()}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
