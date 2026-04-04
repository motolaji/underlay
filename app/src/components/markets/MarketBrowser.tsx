"use client";

import { useMemo } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { useMarketsQuery } from "@/hooks/queries/useMarketsQuery";
import { previewMarkets } from "@/lib/demo-presets";
import { useMarketsStore } from "@/stores/marketsStore";
import { useSlipStore } from "@/stores/slipStore";
import { cn } from "@/lib/utils";

const CATEGORIES = ["all", "crypto", "politics", "sports", "mixed"] as const;

export function MarketBrowser() {
  const { filters, setCategory, setSearch } = useMarketsStore();
  const selectedLegs = useSlipStore((state) => state.selectedLegs);
  const addLeg = useSlipStore((state) => state.addLeg);
  const removeLeg = useSlipStore((state) => state.removeLeg);
  const marketsQuery = useMarketsQuery(filters.category);

  const markets = useMemo(() => {
    const liveMarkets = marketsQuery.data?.markets ?? [];

    if (liveMarkets.length > 0) {
      return liveMarkets;
    }

    return previewMarkets.map((market) => ({
      ...market,
      source: "preview" as const,
    }));
  }, [marketsQuery.data?.markets]);

  const filteredMarkets = markets.filter((market) => {
    const matchesCategory =
      filters.category === "all" ||
      filters.category === market.category ||
      (filters.category === "mixed" && market.category === "other");
    const query = filters.search.toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      market.question.toLowerCase().includes(query) ||
      market.category.includes(query) ||
      market.routeLabel.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow mb-1.5">Market Browser</p>
            <h2
              className="text-2xl text-[color:var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Select outcomes
            </h2>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-sm border px-2 py-1",
              marketsQuery.data?.source === "live"
                ? "border-[color:var(--badge-success-border)] bg-[color:var(--badge-success-bg)]"
                : "border-[color:var(--badge-warning-border)] bg-[color:var(--badge-warning-bg)]"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                marketsQuery.data?.source === "live"
                  ? "text-[color:var(--badge-success-text)] bg-current"
                  : "text-[color:var(--badge-warning-text)] bg-current"
              )}
            />
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-wider",
                marketsQuery.data?.source === "live"
                  ? "text-[color:var(--badge-success-text)]"
                  : "text-[color:var(--badge-warning-text)]"
              )}
            >
              {marketsQuery.data?.source === "live"
                ? "Live Gamma"
                : "Preview feed"}
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-[color:var(--text-secondary)]">
          Add legs to the position builder. Combined odds update as you build.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markets..."
          className="focus-ring w-full border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option as typeof filters.category)}
              className={cn(
                "px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-150",
                filters.category === option
                  ? "bg-[color:var(--text-primary)] text-[color:var(--bg-base)]"
                  : "border border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {marketsQuery.isLoading ? (
        <div className="space-y-px border border-[color:var(--border-subtle)]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[112px] animate-pulse bg-[color:var(--bg-surface)]"
            />
          ))}
        </div>
      ) : filteredMarkets.length === 0 ? (
        <EmptyState
          title="No markets match this view"
          body="Try another search or category. The workspace will fall back to preview markets if the live Gamma feed is unavailable."
        />
      ) : (
        <div className="space-y-px border border-[color:var(--border-subtle)]">
          {filteredMarkets.map((market) => {
            const hasSelectedLeg = selectedLegs.some(
              (leg) => leg.marketId === market.marketId
            );

            return (
              <article
                key={market.marketId}
                className={cn(
                  "group bg-[color:var(--bg-surface)] p-4 transition-colors duration-150 hover:bg-[color:var(--bg-elevated)]",
                  hasSelectedLeg &&
                    "border-l-2 border-l-[color:var(--accent-blue)]"
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-[color:var(--text-primary)]">
                      {market.question}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                      {market.note}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                      {market.category}
                    </span>
                    <span
                      className={cn(
                        "rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        market.riskBand === "High"
                          ? "border-[color:var(--badge-danger-border)] text-[color:var(--badge-danger-text)]"
                          : market.riskBand === "Medium"
                          ? "border-[color:var(--badge-warning-border)] text-[color:var(--badge-warning-text)]"
                          : "border-[color:var(--badge-success-border)] text-[color:var(--badge-success-text)]"
                      )}
                    >
                      {market.riskBand}
                    </span>
                  </div>
                </div>

                <div className="mb-3 space-y-2">
                  {market.outcomes.map((outcome, outcomeIndex) => {
                    const isSelected = selectedLegs.some(
                      (leg) =>
                        leg.marketId === market.marketId &&
                        leg.outcomeId === outcome.outcomeId
                    );
                    const pct = Math.round(outcome.referenceProbability * 100);

                    return (
                      <div
                        key={outcome.outcomeId}
                        className="flex items-center gap-2"
                      >
                        <span className="w-16 shrink-0 font-mono text-[11px] text-[color:var(--text-secondary)]">
                          {outcome.label.toUpperCase()}
                        </span>
                        <div className="flex-1">
                          <div className="prob-bar">
                            <div
                              className={cn(
                                "h-full transition-all duration-300",
                                outcome.outcomeId === "yes" ||
                                  outcome.outcomeId === "approve" ||
                                  outcome.referenceProbability >= 0.5
                                  ? "bg-[color:var(--data-positive)]"
                                  : "bg-[color:var(--data-negative)]"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-8 shrink-0 text-right font-mono text-[11px] text-[color:var(--text-primary)]">
                          {pct}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              removeLeg(market.marketId, outcome.outcomeId);
                            } else {
                              addLeg({
                                marketId: market.marketId,
                                outcomeId: outcome.outcomeId,
                                outcomeIndex,
                                question: market.question,
                                outcomeLabel: outcome.label,
                                category: market.category,
                                referenceProbability:
                                  outcome.referenceProbability,
                                closesAt: market.closesAt,
                                closesAtLabel: market.closesAtLabel,
                              });
                            }
                          }}
                          className={cn(
                            "shrink-0 font-mono text-[10px] uppercase tracking-wider transition-colors duration-150",
                            isSelected
                              ? "text-[color:var(--badge-accent-text)]"
                              : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
                          )}
                        >
                          {isSelected ? "✓ Added" : "+ Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                      {market.routeLabel}
                    </span>
                    <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                      {market.liquidityLabel}
                    </span>
                    <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                      {market.volumeLabel}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                    {market.closesAtLabel}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
