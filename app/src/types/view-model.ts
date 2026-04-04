export type PreviewMarket = {
  marketId: string;
  slug: string;
  category: "sports" | "crypto" | "politics";
  question: string;
  closesAt: string;
  closesAtLabel: string;
  note: string;
  routeLabel: string;
  liquidityLabel: string;
  volumeLabel: string;
  riskBand: "Low" | "Medium" | "High";
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
