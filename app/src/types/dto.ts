import type { SelectedLeg, VaultCategory } from "@/types/domain";

export type RiskAssessmentRequestDto = {
  walletAddress: `0x${string}`;
  routeCategory: VaultCategory;
  selectedLegs: SelectedLeg[];
  stakeRaw: string;
};

export type RiskAssessmentResponseDto = {
  requestId: string;
  decision: "APPROVED" | "CONDITIONAL" | "REJECTED";
  riskScore: number;
  riskTier: "LOW" | "MEDIUM" | "HIGH";
  maxAllowedStakeRaw: string;
  requiresWorldId: boolean;
  reasonCodes: string[];
  explanation: {
    headline: string;
    factors: Array<{
      label: string;
      value: string;
      impact: "LOW" | "MEDIUM" | "HIGH";
      direction: "UP" | "DOWN" | "NEUTRAL";
    }>;
  };
  audit: {
    contentHash: `0x${string}`;
    provider: "0g-storage" | "local-hash";
    uri?: string;
  };
  generatedAt: string;
  validUntil?: string;
  source?: "0g_compute" | "rule_based";
};
