import type { VaultCategory } from "@/types/domain";

export type MarketCategory = VaultCategory | "macro" | "other";

export type PolymarketTag = {
  id: string;
  label: string;
  slug: string;
};

export type PolymarketEvent = {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  category?: string;
  tags?: PolymarketTag[];
};

export type PolymarketMarket = {
  id: string;
  conditionId?: string;
  questionID?: string;
  slug?: string;
  question: string;
  description?: string;
  category?: string;
  outcomePrices: string;
  outcomes: string | string[];
  clobTokenIds?: string | string[];
  active: boolean;
  closed: boolean;
  archived?: boolean;
  events?: PolymarketEvent[];
  resolutionSource?: string;
  endDate: string;
  startDate?: string;
  volume: number | string;
  liquidity: number | string;
  volume24hr?: number | string;
  resolvedBy?: string;
  resolution?: string;
};

export type MarketOutcomeView = {
  outcomeId: string;
  label: string;
  referenceProbability: number;
  isTradable: boolean;
};

export type MarketCardModel = {
  marketId: string;
  slug: string;
  question: string;
  description?: string;
  category: VaultCategory | "other";
  closesAt: string;
  closesAtLabel: string;
  note: string;
  routeLabel: string;
  liquidityLabel: string;
  volumeLabel: string;
  riskBand: "Low" | "Medium" | "High";
  outcomes: MarketOutcomeView[];
  source: "live" | "preview";
};

export type MarketsResponseDto = {
  markets: MarketCardModel[];
  total: number;
  source: "live" | "preview";
  fetchedAt: string;
  error?: string;
};
