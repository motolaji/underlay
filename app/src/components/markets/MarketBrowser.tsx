"use client";

import { previewMarkets } from "@/lib/demo-presets";
import { useMarketsStore } from "@/stores/marketsStore";
import { useSlipStore } from "@/stores/slipStore";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

const CATEGORIES = ["all", "crypto", "politics", "sports", "mixed"] as const;

export function MarketBrowser() {
  const { filters, setCategory, setSearch } = useMarketsStore();
  const selectedLegs = useSlipStore((state) => state.selectedLegs);
  const addLeg = useSlipStore((state) => state.addLeg);
  const removeLeg = useSlipStore((state) => state.removeLeg);

  const filteredMarkets = previewMarkets.filter((market) => {
    const matchesCategory =
      filters.category === "all" || filters.category === market.category;
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
      {/* Page header */}
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
          <div className="flex items-center gap-1.5 rounded-sm border border-[color:rgba(217,119,6,0.3)] bg-[color:rgba(217,119,6,0.08)] px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:#fbbf24]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[color:#fbbf24]">
              Preview feed
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-[color:var(--text-secondary)]">
          Add legs to the betslip. Combined odds update as you build.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markets…"
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

      {/* Market list */}
      {filteredMarkets.length === 0 ? (
        <EmptyState
          title="No markets match this view"
          body="Try another search or category. Once the Gamma API route is live, this workspace will switch from demo presets to a live market stream."
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
                  hasSelectedLeg && "border-l-2 border-l-[color:var(--accent-blue)]"
                )}
              >
                {/* Header row */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="flex-1 text-sm font-medium leading-snug text-[color:var(--text-primary)]">
                    {market.question}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                      {market.category}
                    </span>
                    <span
                      className={cn(
                        "rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        market.riskBand === "High"
                          ? "border-[color:rgba(220,38,38,0.3)] text-[color:#f87171]"
                          : market.riskBand === "Medium"
                          ? "border-[color:rgba(217,119,6,0.3)] text-[color:#fbbf24]"
                          : "border-[color:rgba(22,163,74,0.3)] text-[color:#4ade80]"
                      )}
                    >
                      {market.riskBand}
                    </span>
                  </div>
                </div>

                {/* Outcome rows with probability bars */}
                <div className="mb-3 space-y-2">
                  {market.outcomes.map((outcome) => {
                    const isSelected = selectedLegs.some(
                      (leg) =>
                        leg.marketId === market.marketId &&
                        leg.outcomeId === outcome.outcomeId
                    );
                    const pct = Math.round(outcome.referenceProbability * 100);

                    return (
                      <div key={outcome.outcomeId} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 font-mono text-[11px] text-[color:var(--text-secondary)]">
                          {outcome.label.toUpperCase()}
                        </span>
                        <div className="flex-1">
                          <div className="prob-bar">
                            <div
                              className={cn(
                                "h-full transition-all duration-300",
                                outcome.outcomeId === "yes" || outcome.outcomeId === "approve" || outcome.referenceProbability >= 0.5
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
                                question: market.question,
                                outcomeLabel: outcome.label,
                                category: market.category,
                                referenceProbability: outcome.referenceProbability,
                                closesAtLabel: market.closesAtLabel,
                              });
                            }
                          }}
                          className={cn(
                            "shrink-0 font-mono text-[10px] uppercase tracking-wider transition-colors duration-150",
                            isSelected
                              ? "text-[color:#60a5fa]"
                              : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
                          )}
                        >
                          {isSelected ? "✓ Added" : "+ Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">
                    {market.availableCapacityLabel}
                  </span>
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
