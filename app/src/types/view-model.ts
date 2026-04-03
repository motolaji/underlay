export type PreviewMarket = {
  marketId: string;
  category: "sports" | "crypto" | "politics";
  question: string;
  closesAtLabel: string;
  note: string;
  outcomes: Array<{
    outcomeId: string;
    label: string;
    referenceProbability: number;
  }>;
};

export type ProtocolMetric = {
  label: string;
  value: string;
  source: "onchain" | "configured" | "polymarket" | "0g";
  tone?: "default" | "accent" | "warning";
};
