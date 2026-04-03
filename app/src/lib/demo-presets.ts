import type { PreviewMarket } from "@/types/view-model";

export const previewMarkets: PreviewMarket[] = [
  {
    marketId: "eth-july-above-4000",
    category: "crypto",
    question: "Will ETH settle above $4,000 by July 31?",
    closesAtLabel: "Closes in 18 days",
    note: "Preview feed. Gamma API wiring lands in a later round.",
    routeLabel: "Crypto vault",
    availableCapacityLabel: "$31k headroom",
    riskBand: "Medium",
    outcomes: [
      { outcomeId: "yes", label: "Yes", referenceProbability: 0.48 },
      { outcomeId: "no", label: "No", referenceProbability: 0.52 },
    ],
  },
  {
    marketId: "sol-etf-approval-2026",
    category: "crypto",
    question: "Will a spot SOL ETF receive US approval in 2026?",
    closesAtLabel: "Closes in 44 days",
    note: "Use this card to validate editorial market presentation before live odds arrive.",
    routeLabel: "Crypto vault",
    availableCapacityLabel: "$22k headroom",
    riskBand: "High",
    outcomes: [
      { outcomeId: "yes", label: "Approve", referenceProbability: 0.41 },
      { outcomeId: "no", label: "Reject", referenceProbability: 0.59 },
    ],
  },
  {
    marketId: "turnout-french-election",
    category: "politics",
    question:
      "Will turnout exceed 65% in the next French presidential election?",
    closesAtLabel: "Closes in 72 days",
    note: "Mixed-category underwriting routes to the mixed vault in later routing work.",
    routeLabel: "Mixed vault",
    availableCapacityLabel: "$18k headroom",
    riskBand: "Low",
    outcomes: [
      { outcomeId: "yes", label: "Above 65%", referenceProbability: 0.54 },
      { outcomeId: "no", label: "65% or lower", referenceProbability: 0.46 },
    ],
  },
];
