import { TESTNET_VAULT_CONFIG } from "@/lib/constants";
import type { SelectedLeg } from "@/types/domain";

const PROTOCOL_VIG = 0.05;

export type QuoteResult = {
  combinedOdds: number;
  uncappedPayout: number;
  payout: number;
  payoutCapped: boolean;
  legOdds: number[];
};

export function calculateQuote({
  legs,
  stake,
  utilization = 0,
  riskScore = 0,
}: {
  legs: SelectedLeg[];
  stake: number;
  utilization?: number;
  riskScore?: number;
}): QuoteResult | null {
  if (legs.length === 0 || stake <= 0) {
    return null;
  }

  const legOdds = legs.map((leg) =>
    calculateLegOdds(leg.referenceProbability, utilization, riskScore)
  );
  const combinedOdds = legOdds.reduce((product, odds) => product * odds, 1);
  const uncappedPayout = stake * combinedOdds;
  const payoutCap = Number(TESTNET_VAULT_CONFIG.maxPayoutRaw) / 1_000_000;
  const payout = Math.min(uncappedPayout, payoutCap);

  return {
    combinedOdds,
    uncappedPayout,
    payout,
    payoutCapped: payout !== uncappedPayout,
    legOdds,
  };
}

export function calculateLegOdds(
  baseProbability: number,
  utilization: number,
  riskScore: number
) {
  const adjustedProbability =
    baseProbability * (1 + utilization * 0.3) * (1 + riskScore * 0.1);
  const normalizedProbability = clampProbability(adjustedProbability);

  return (1 / normalizedProbability) * (1 - PROTOCOL_VIG);
}

function clampProbability(value: number) {
  return Math.max(0.01, Math.min(0.99, value));
}
