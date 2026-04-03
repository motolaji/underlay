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
    provider: "0g-storage";
    uri?: string;
  };
  generatedAt: string;
  validUntil?: string;
};
