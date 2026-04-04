import { keccak256, stringToHex } from "viem";

import type { RiskAssessmentResponseDto } from "@/types/dto";
import type { SelectedLeg, WorldIdProof } from "@/types/domain";

type SubmissionPayload = {
  marketIds: `0x${string}`[];
  outcomes: number[];
  lockedOdds: bigint[];
  resolutionTimes: bigint[];
  stake: bigint;
  combinedOdds: bigint;
  riskTier: number;
  riskAuditHash: `0x${string}`;
  aiStakeLimit: bigint;
  root: bigint;
  nullifierHash: bigint;
  proof: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
};

export function buildRiskEngineSubmission({
  selectedLegs,
  stakeRaw,
  quote,
  risk,
  worldIdProof,
}: {
  selectedLegs: SelectedLeg[];
  stakeRaw: bigint;
  quote: {
    combinedOdds: number;
    legOdds: number[];
  };
  risk: RiskAssessmentResponseDto;
  worldIdProof: WorldIdProof | null;
}): SubmissionPayload {
  return {
    marketIds: selectedLegs.map((leg) => hashStringToBytes32(leg.marketId)),
    outcomes: selectedLegs.map((leg) => leg.outcomeIndex),
    lockedOdds: quote.legOdds.map(scaleOdds),
    resolutionTimes: selectedLegs.map((leg) =>
      BigInt(Math.floor(new Date(leg.closesAt).getTime() / 1000))
    ),
    stake: stakeRaw,
    combinedOdds: scaleOdds(quote.combinedOdds),
    riskTier: mapRiskTier(risk.riskTier),
    riskAuditHash: normalizeHash(risk.audit.contentHash),
    aiStakeLimit: BigInt(risk.maxAllowedStakeRaw),
    root: worldIdProof?.root ?? 0n,
    nullifierHash: worldIdProof?.nullifierHash ?? 0n,
    proof: worldIdProof?.proof ?? [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
  };
}

export function mapRiskTier(riskTier: RiskAssessmentResponseDto["riskTier"]) {
  if (riskTier === "LOW") return 0;
  if (riskTier === "MEDIUM") return 1;
  return 2;
}

export function scaleOdds(odds: number) {
  return BigInt(Math.round(odds * 1_000_000));
}

export function hashStringToBytes32(value: string) {
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) {
    return value as `0x${string}`;
  }

  return keccak256(stringToHex(value));
}

function normalizeHash(value: `0x${string}`) {
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) {
    return value;
  }

  return keccak256(stringToHex(value));
}
