import { useMemo } from "react";
import { POSITION_RULES, TESTNET_VAULT_CONFIG } from "@/lib/constants";
import { parseUsdcInput } from "@/lib/format";
import type { SelectedLeg, SlipValidationState } from "@/types/domain";

export function useSlipValidation(
  selectedLegs: SelectedLeg[],
  stakeInput: string
) {
  return useMemo<SlipValidationState>(() => {
    const selectedCount = selectedLegs.length;
    const minLegs = POSITION_RULES.minLegsPerPosition;
    const maxLegs = POSITION_RULES.maxLegsPerPosition;
    const remainingSlots = Math.max(maxLegs - selectedCount, 0);
    const uniqueLegs = new Set(
      selectedLegs.map((leg) => `${leg.marketId}:${leg.outcomeId}`)
    );
    const hasDuplicateLeg = uniqueLegs.size !== selectedCount;
    const hasStake = stakeInput.trim().length > 0;

    let isStakeValidNumber = true;
    let parsedStake = 0n;

    try {
      parsedStake = parseUsdcInput(stakeInput || "0");
    } catch {
      isStakeValidNumber = false;
    }

    const isBelowMinLegs = selectedCount < minLegs;
    const isAtMaxLegs = selectedCount >= maxLegs;
    const isOverMaxStake = parsedStake > TESTNET_VAULT_CONFIG.maxStakeRaw;
    const requiresWorldId = parsedStake > TESTNET_VAULT_CONFIG.worldIdGateRaw;

    const blockingReasons = [
      isBelowMinLegs
        ? `Select at least ${minLegs} outcome${minLegs === 1 ? "" : "s"}.`
        : null,
      hasDuplicateLeg ? "Duplicate legs are not allowed." : null,
      hasStake && !isStakeValidNumber
        ? "Enter a valid USDC amount with up to 6 decimals."
        : null,
      isOverMaxStake ? "Stake exceeds the configured max stake." : null,
      selectedCount > 0
        ? "AI risk scoring and quote locking will unlock once /api/risk is wired."
        : null,
    ].filter(Boolean) as string[];

    return {
      selectedCount,
      minLegs,
      maxLegs,
      remainingSlots,
      isBelowMinLegs,
      isAtMaxLegs,
      hasDuplicateLeg,
      hasStake,
      isStakeValidNumber,
      isOverMaxStake,
      requiresWorldId,
      hasEligibleVault: true,
      riskDecision: "idle",
      isOverAiStakeLimit: false,
      isOverMaxPayout: false,
      isOverLiabilityCap: false,
      canRequestRisk:
        selectedCount >= minLegs &&
        !hasDuplicateLeg &&
        isStakeValidNumber &&
        !isOverMaxStake,
      canLockQuote: false,
      canSubmit: false,
      blockingReasons,
    };
  }, [selectedLegs, stakeInput]);
}
