export type VaultCategory = "mixed" | "sports" | "crypto" | "politics";

export type SelectedLeg = {
  marketId: string;
  outcomeId: string;
  outcomeIndex: number;
  question: string;
  outcomeLabel: string;
  category: VaultCategory | "other";
  referenceProbability: number;
  closesAt: string;
  closesAtLabel: string;
};

export type WorldIdProof = {
  root: bigint;
  nullifierHash: bigint;
  proof: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
};

export type SlipValidationState = {
  selectedCount: number;
  minLegs: number;
  maxLegs: number;
  remainingSlots: number;
  isBelowMinLegs: boolean;
  isAtMaxLegs: boolean;
  hasDuplicateLeg: boolean;
  hasStake: boolean;
  isStakeValidNumber: boolean;
  isOverMaxStake: boolean;
  requiresWorldId: boolean;
  hasEligibleVault: boolean;
  riskDecision: "idle" | "loading" | "approved" | "conditional" | "rejected";
  isOverAiStakeLimit: boolean;
  isOverMaxPayout: boolean;
  isOverLiabilityCap: boolean;
  canRequestRisk: boolean;
  canLockQuote: boolean;
  canSubmit: boolean;
  blockingReasons: string[];
};
