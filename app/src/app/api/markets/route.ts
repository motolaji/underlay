import { NextRequest, NextResponse } from "next/server";

import { previewMarkets } from "@/lib/demo-presets";
import {
  detectCategoryFromEvent,
  GAMMA_API_BASE,
  isValidLegMarket,
  normalizeMarket,
} from "@/lib/polymarket";
import type {
  MarketsResponseDto,
  PolymarketEvent,
  PolymarketMarket,
} from "@/types/market";

const FALLBACK_RESPONSE: MarketsResponseDto = {
  markets: previewMarkets.map((market) => ({
    ...market,
    outcomes: market.outcomes.map((outcome) => ({
      ...outcome,
      isTradable: true,
    })),
    source: "preview",
  })),
  total: previewMarkets.length,
  source: "preview",
  fetchedAt: new Date().toISOString(),
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "all";
  const limit = Number(searchParams.get("limit") ?? 24);
  const marketId = searchParams.get("id");
  const requestedLimit = Math.min(Math.max(limit, 1), 50);
  const upstreamLimit = marketId
    ? 1
    : Math.min(Math.max(requestedLimit * 5, 60), 200);

  try {
    const params = new URLSearchParams();

    if (marketId) {
      params.set("id", marketId);
    } else {
      params.set("active", "true");
      params.set("closed", "false");
      params.set("limit", String(upstreamLimit));
      params.set("order", "volume");
      params.set("ascending", "false");
    }

    const response = await fetch(
      `${GAMMA_API_BASE}/markets?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: {
          revalidate: 30,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const markets = (await response.json()) as PolymarketMarket[];
    const eventMap = await fetchEventMap(markets);
    let normalizedMarkets = markets
      .filter(isValidLegMarket)
      .map((market) =>
        normalizeMarket(market, getBestEventMatch(market, eventMap))
      );

    if (category !== "all") {
      normalizedMarkets = normalizedMarkets.filter((market) => {
        if (category === "mixed") {
          return market.category === "mixed" || market.category === "other";
        }

        return market.category === category;
      });
    }

    normalizedMarkets = normalizedMarkets.slice(0, requestedLimit);

    return NextResponse.json<MarketsResponseDto>({
      markets: normalizedMarkets,
      total: normalizedMarkets.length,
      source: "live",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("/api/markets failed, falling back to preview feed", error);

    return NextResponse.json<MarketsResponseDto>(
      {
        ...FALLBACK_RESPONSE,
        fetchedAt: new Date().toISOString(),
        error: "Live Polymarket feed unavailable. Showing preview markets.",
      },
      {
        status: 200,
      }
    );
  }
}

async function fetchEventMap(markets: PolymarketMarket[]) {
  const eventIds = Array.from(
    new Set(
      markets
        .flatMap((market) => market.events ?? [])
        .map((event) => event.id)
        .filter(Boolean)
    )
  );

  if (eventIds.length === 0) {
    return new Map<string, PolymarketEvent>();
  }

  const chunks = chunk(eventIds, 20);
  const events = await Promise.all(
    chunks.map(async (ids) => {
      const params = new URLSearchParams();

      ids.forEach((id) => params.append("id", id));

      const response = await fetch(
        `${GAMMA_API_BASE}/events?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
          next: {
            revalidate: 60,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Gamma events API error: ${response.status}`);
      }

      return (await response.json()) as PolymarketEvent[];
    })
  );

  return new Map(events.flat().map((event) => [event.id, event]));
}

function getBestEventMatch(
  market: PolymarketMarket,
  eventMap: Map<string, PolymarketEvent>
) {
  const embeddedEvents = market.events ?? [];

  for (const embeddedEvent of embeddedEvents) {
    const enriched = eventMap.get(embeddedEvent.id);

    if (enriched && detectCategoryFromEvent(enriched)) {
      return enriched;
    }
  }

  return embeddedEvents.length > 0
    ? eventMap.get(embeddedEvents[0].id) ?? embeddedEvents[0]
    : undefined;
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}
