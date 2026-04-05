import type {
  MarketCardModel,
  MarketCategory,
  PolymarketEvent,
  MarketOutcomeView,
  PolymarketMarket,
  PolymarketTag,
} from "@/types/market";

const CATEGORY_KEYWORDS: Record<Exclude<MarketCategory, "other">, string[]> = {
  mixed: [
    "billboard",
    "song",
    "album",
    "movie",
    "film",
    "box office",
    "tv",
    "television",
    "streaming",
    "celebrity",
    "music",
    "artist",
  ],
  crypto: [
    "bitcoin",
    "btc",
    "eth",
    "ethereum",
    "crypto",
    "sol",
    "solana",
    "price",
    "defi",
  ],
  sports: [
    "win",
    "wins",
    "beat",
    "beats",
    "championship",
    "nfl",
    "nba",
    "nhl",
    "mlb",
    "premier",
    "match",
    "game",
    "league",
    "cup",
    "season",
  ],
  politics: [
    "election",
    "president",
    "senate",
    "congress",
    "vote",
    "political",
    "governor",
    "prime minister",
    "parliament",
  ],
  macro: [
    "fed",
    "rate",
    "cpi",
    "gdp",
    "inflation",
    "recession",
    "treasury",
    "interest rate",
    "economy",
    "jobs",
    "temperature",
    "weather",
    "hottest",
    "coldest",
    "rainfall",
    "storm",
    "transit",
    "transits",
    "shipping",
    "shipments",
    "hormuz",
    "strait",
    "tariff",
    "sanction",
    "opec",
    "oil",
    "natural gas",
    "inflation",
    "commodity",
  ],
};

export const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

const TAG_TO_CATEGORY: Record<string, MarketCategory> = {
  entertainment: "mixed",
  culture: "mixed",
  music: "mixed",
  movies: "mixed",
  film: "mixed",
  weather: "macro",
  climate: "macro",
  economy: "macro",
  commodities: "macro",
  shipping: "macro",
  geopolitics: "macro",
  sports: "sports",
  sport: "sports",
  golf: "sports",
  nba: "sports",
  nfl: "sports",
  mlb: "sports",
  nhl: "sports",
  soccer: "sports",
  football: "sports",
  tennis: "sports",
  cricket: "sports",
  mma: "sports",
  boxing: "sports",
  crypto: "crypto",
  bitcoin: "crypto",
  ethereum: "crypto",
  solana: "crypto",
  altcoin: "crypto",
  politics: "politics",
  election: "politics",
  elections: "politics",
  trump: "politics",
  biden: "politics",
  congress: "politics",
  senate: "politics",
  president: "politics",
  macro: "macro",
  inflation: "macro",
  fed: "macro",
  rates: "macro",
};

export function parseOutcomePrices(outcomePrices: string) {
  try {
    const parsed = JSON.parse(outcomePrices) as string[];

    if (parsed.length < 2) {
      return { yes: 0.5, no: 0.5 };
    }

    return {
      yes: clampProbability(Number(parsed[0])),
      no: clampProbability(Number(parsed[1])),
    };
  } catch {
    return { yes: 0.5, no: 0.5 };
  }
}

export function parseStringArray(value?: string | string[]) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toNumber(value: number | string | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function detectCategory(
  market: Pick<PolymarketMarket, "question" | "description">
): MarketCategory {
  const haystack = `${market.question} ${
    market.description ?? ""
  }`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => containsKeyword(haystack, keyword))) {
      return category as MarketCategory;
    }
  }

  return "other";
}

export function detectCategoryFromEvent(
  event?: PolymarketEvent
): MarketCategory | null {
  if (!event) {
    return null;
  }

  const eventCategory = normalizeCategoryString(event.category);

  if (eventCategory) {
    return eventCategory;
  }

  const tagCategory = detectCategoryFromTags(event.tags ?? []);

  if (tagCategory) {
    return tagCategory;
  }

  const haystack = `${event.title} ${event.description ?? ""} ${
    event.slug ?? ""
  }`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => containsKeyword(haystack, keyword))) {
      return category as MarketCategory;
    }
  }

  return null;
}

export function formatCompactUsd(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }

  return `$${Math.round(value)}`;
}

export function formatResolutionDate(isoDate: string) {
  const date = new Date(isoDate);
  const diffMs = date.getTime() - Date.now();

  if (!Number.isFinite(diffMs)) {
    return "Resolution TBD";
  }

  if (diffMs <= 0) {
    return "Resolved";
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 24) {
    return `Closes in ${diffHours}h`;
  }

  if (diffDays < 14) {
    return `Closes in ${diffDays}d`;
  }

  return `Closes ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

export function isValidLegMarket(market: PolymarketMarket) {
  const outcomes = parseStringArray(market.outcomes);
  const liquidity = toNumber(market.liquidity);

  if (!market.active || market.closed || market.archived) {
    return false;
  }

  // Exclude markets whose scheduled end date has already passed
  if (market.endDate && new Date(market.endDate).getTime() < Date.now()) {
    return false;
  }

  if (!market.outcomePrices || outcomes.length !== 2) {
    return false;
  }

  if (liquidity < 1_000) {
    return false;
  }

  const { yes } = parseOutcomePrices(market.outcomePrices);

  return yes >= 0.05 && yes <= 0.95;
}

export function toOutcomeViews(market: PolymarketMarket): MarketOutcomeView[] {
  const { yes, no } = parseOutcomePrices(market.outcomePrices);
  const outcomes = parseStringArray(market.outcomes);
  const tokenIds = parseStringArray(market.clobTokenIds);
  const outcomeIds = tokenIds.length === 2 ? tokenIds : ["yes", "no"];

  return [
    {
      outcomeId: outcomeIds[0] ?? "yes",
      label: outcomes[0] ?? "Yes",
      referenceProbability: yes,
      isTradable: true,
    },
    {
      outcomeId: outcomeIds[1] ?? "no",
      label: outcomes[1] ?? "No",
      referenceProbability: no,
      isTradable: true,
    },
  ];
}

export function normalizeMarket(
  market: PolymarketMarket,
  event?: PolymarketEvent
): MarketCardModel {
  const detectedCategory =
    detectCategoryFromEvent(event) ?? detectCategory(market);
  const category = detectedCategory === "macro" ? "mixed" : detectedCategory;
  const routeLabel =
    category === "other" ? "Mixed vault" : `${capitalize(category)} vault`;
  const liquidity = toNumber(market.liquidity);
  const volume = toNumber(market.volume);
  const riskBand = deriveRiskBand(liquidity, market.endDate);

  return {
    marketId: market.conditionId ?? market.id,
    slug: market.slug ?? market.id,
    question: market.question,
    description: market.description,
    category,
    closesAt: market.endDate,
    closesAtLabel: formatResolutionDate(market.endDate),
    note:
      market.description?.trim() ||
      "Live Polymarket signal routed through the Gamma API. Pricing and final quote remain Underlay-native.",
    routeLabel,
    liquidityLabel: `${formatCompactUsd(liquidity)} liquidity`,
    volumeLabel: `${formatCompactUsd(volume)} volume`,
    riskBand,
    outcomes: toOutcomeViews(market),
    source: "live",
  };
}

function deriveRiskBand(
  liquidity: number,
  endDate: string
): "Low" | "Medium" | "High" {
  const diffMs = new Date(endDate).getTime() - Date.now();

  if (diffMs < 2 * 60 * 60 * 1000 || liquidity < 10_000) {
    return "High";
  }

  if (liquidity < 50_000) {
    return "Medium";
  }

  return "Low";
}

function clampProbability(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function detectCategoryFromTags(tags: PolymarketTag[]) {
  for (const tag of tags) {
    const normalized =
      normalizeCategoryString(tag.slug) ?? normalizeCategoryString(tag.label);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeCategoryString(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (TAG_TO_CATEGORY[normalized]) {
    return TAG_TO_CATEGORY[normalized];
  }

  return null;
}

function containsKeyword(haystack: string, keyword: string) {
  if (keyword.includes(" ")) {
    return haystack.includes(keyword);
  }

  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}
