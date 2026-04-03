"use client";

import { previewMarkets } from "@/lib/demo-presets";
import { formatPercent } from "@/lib/format";
import { useMarketsStore } from "@/stores/marketsStore";
import { useSlipStore } from "@/stores/slipStore";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

export function MarketBrowser() {
  const {
    filters,
    expandedMarketId,
    setCategory,
    setExpandedMarketId,
    setSearch,
  } = useMarketsStore();
  const { selectedLegs, addLeg } = useSlipStore();

  const filteredMarkets = previewMarkets.filter((market) => {
    const matchesCategory =
      filters.category === "all" || filters.category === market.category;
    const matchesSearch =
      filters.search.length === 0 ||
      market.question.toLowerCase().includes(filters.search.toLowerCase()) ||
      market.category.includes(filters.search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="paper-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Preview browser</p>
            <p className="mt-2 max-w-2xl text-sm leading-7">
              The layout is live now, while the Gamma API proxy lands in a later
              round. Use this preview to validate the editorial browser and slip
              flow.
            </p>
          </div>
          <StatusBadge label="Static preview feed" tone="warning" />
        </div>
        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <input
            value={filters.search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search preview markets"
            className="w-full rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.55)] px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
          />
          <div className="flex flex-wrap gap-2">
            {(["all", "crypto", "politics", "sports"] as const).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={cn(
                    "rounded-full px-4 py-3 text-sm",
                    filters.category === option
                      ? "bg-[color:var(--teal)] text-white"
                      : "border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.4)] text-[color:var(--muted)]"
                  )}
                >
                  {option}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {filteredMarkets.length === 0 ? (
        <EmptyState
          title="No preview markets match this filter"
          body="Try resetting the category or search term. The live Gamma API route will replace this preview set in a later round."
        />
      ) : (
        <div className="space-y-4">
          {filteredMarkets.map((market) => {
            const isOpen = expandedMarketId === market.marketId;

            return (
              <article key={market.marketId} className="paper-panel p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge label={market.category} tone="accent" />
                      <span className="data-label">{market.closesAtLabel}</span>
                    </div>
                    <h3 className="max-w-3xl text-3xl leading-tight text-[color:var(--ink)]">
                      {market.question}
                    </h3>
                    <p className="max-w-2xl text-sm leading-7">{market.note}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMarketId(isOpen ? null : market.marketId)
                    }
                    className="self-start rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--ink)]"
                  >
                    {isOpen ? "Hide details" : "Open details"}
                  </button>
                </div>

                {isOpen ? (
                  <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    {market.outcomes.map((outcome) => {
                      const selected = selectedLegs.some(
                        (leg) =>
                          leg.marketId === market.marketId &&
                          leg.outcomeId === outcome.outcomeId
                      );

                      return (
                        <button
                          key={outcome.outcomeId}
                          type="button"
                          onClick={() =>
                            addLeg({
                              marketId: market.marketId,
                              outcomeId: outcome.outcomeId,
                              question: market.question,
                              outcomeLabel: outcome.label,
                              category: market.category,
                              referenceProbability:
                                outcome.referenceProbability,
                              closesAtLabel: market.closesAtLabel,
                            })
                          }
                          className={cn(
                            "rounded-[22px] border p-5 text-left transition-transform hover:-translate-y-0.5",
                            selected
                              ? "border-[color:rgba(31,90,90,0.28)] bg-[color:rgba(31,90,90,0.08)]"
                              : "border-[color:var(--border)] bg-[color:rgba(255,255,255,0.38)]"
                          )}
                        >
                          <p className="data-label">Reference probability</p>
                          <p className="mt-4 text-2xl text-[color:var(--ink)]">
                            {outcome.label}
                          </p>
                          <p className="mt-2 text-sm leading-7">
                            {formatPercent(outcome.referenceProbability * 100)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
