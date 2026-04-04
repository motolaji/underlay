import "server-only";

import { createHash } from "node:crypto";

import { POSITION_RULES, TESTNET_VAULT_CONFIG } from "@/lib/constants";
import { parseUsdcInput } from "@/lib/format";
import type {
  RiskAssessmentRequestDto,
  RiskAssessmentResponseDto,
} from "@/types/dto";
import type { SelectedLeg } from "@/types/domain";

type RuleBasedRiskOutput = Omit<
  RiskAssessmentResponseDto,
  "audit" | "generatedAt" | "validUntil"
>;

type RiskAuditEntry = {
  requestId: string;
  walletAddress: `0x${string}`;
  routeCategory: string;
  selectedLegs: SelectedLeg[];
  riskScore: number;
  riskTier: RuleBasedRiskOutput["riskTier"];
  explanation: RuleBasedRiskOutput["explanation"];
  generatedAt: string;
  source: "0g_compute" | "rule_based";
};

export async function assessRisk(
  payload: RiskAssessmentRequestDto
): Promise<RiskAssessmentResponseDto> {
  validateRiskRequest(payload);

  const requestId = createRequestId(payload);

  try {
    const ogResult = await scoreWith0GCompute(payload, requestId);
    return ogResult;
  } catch (error) {
    console.warn(
      "[0G] risk scoring unavailable, using rule-based fallback:",
      error instanceof Error ? error.message : error
    );
    return scoreRuleBased(payload, requestId);
  }
}

export function validateRiskRequest(payload: RiskAssessmentRequestDto) {
  if (
    payload.selectedLegs.length < POSITION_RULES.minLegsPerPosition ||
    payload.selectedLegs.length > POSITION_RULES.maxLegsPerPosition
  ) {
    throw new Error("Leg count is outside the configured bounds.");
  }

  const stakeRaw = parseUsdcInput(rawStakeToDecimal(payload.stakeRaw));

  if (stakeRaw == 0n) {
    throw new Error("Stake must be greater than zero.");
  }

  if (stakeRaw > TESTNET_VAULT_CONFIG.maxStakeRaw) {
    throw new Error("Stake exceeds the configured max stake.");
  }
}

async function scoreWith0GCompute(
  payload: RiskAssessmentRequestDto,
  requestId: string
): Promise<RiskAssessmentResponseDto> {
  const rpcUrl = process.env.OG_EVM_RPC;
  const privateKey = process.env.OG_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("0G environment is not configured.");
  }

  const [brokerModule, ethersModule] = await Promise.all([
    import("@0glabs/0g-serving-broker"),
    import("ethers"),
  ]);
  const createZGComputeNetworkBroker =
    brokerModule.createZGComputeNetworkBroker;

  const provider = new ethersModule.JsonRpcProvider(rpcUrl);
  const signer = new ethersModule.Wallet(privateKey, provider);
  const broker = await createZGComputeNetworkBroker(signer);
  const services = await broker.inference.listService();

  // Prefer any chat/text model — exclude image-only services
  const IMAGE_KEYWORDS = ["image", "vision", "img", "clip", "diffusion"];
  const llmService = services.find(
    (service: { model?: string; provider?: string }) => {
      const model = service.model?.toLowerCase() ?? "";
      return !IMAGE_KEYWORDS.some((kw) => model.includes(kw));
    }
  );

  if (!llmService) {
    throw new Error("No suitable 0G LLM service was found.");
  }

  const prompt = buildRiskPrompt(payload);
  const metadata = await broker.inference.getServiceMetadata(
    llmService.provider
  );
  const headers = await broker.inference.getRequestHeaders(
    llmService.provider,
    prompt
  );

  const response = await fetch(`${metadata.endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      model: metadata.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`0G compute request failed with ${response.status}`);
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("0G compute returned an empty response.");
  }

  const chatId = response.headers.get("ZG-Res-Key") ?? undefined;
  await broker.inference.processResponse(llmService.provider, chatId, content);

  const parsed = parseRiskJson(content);
  const generatedAt = new Date().toISOString();
  const auditEntry: RiskAuditEntry = {
    requestId,
    walletAddress: payload.walletAddress,
    routeCategory: payload.routeCategory,
    selectedLegs: payload.selectedLegs,
    riskScore: parsed.correlation_score,
    riskTier: parsed.risk_tier,
    explanation: {
      headline: parsed.reasoning || "0G Compute scored this position.",
      factors: buildFactors(
        payload.selectedLegs,
        parsed.correlation_score,
        parsed.flags
      ),
    },
    generatedAt,
    source: "0g_compute",
  };

  const audit = await persistRiskAudit(auditEntry);
  const ogStakeLimitRaw = parseUsdcInput(String(parsed.stake_limit));
  const maxAllowedStakeRaw = (
    ogStakeLimitRaw < TESTNET_VAULT_CONFIG.maxStakeRaw
      ? ogStakeLimitRaw
      : TESTNET_VAULT_CONFIG.maxStakeRaw
  ).toString();

  return {
    requestId,
    decision: parsed.risk_tier === "HIGH" ? "CONDITIONAL" : "APPROVED",
    riskScore: parsed.correlation_score,
    riskTier: parsed.risk_tier,
    maxAllowedStakeRaw,
    requiresWorldId:
      parseUsdcInput(rawStakeToDecimal(payload.stakeRaw)) >
      TESTNET_VAULT_CONFIG.worldIdGateRaw,
    reasonCodes: parsed.flags,
    explanation: auditEntry.explanation,
    audit,
    generatedAt,
    validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    source: "0g_compute",
  };
}

function scoreRuleBased(
  payload: RiskAssessmentRequestDto,
  requestId: string
): RiskAssessmentResponseDto {
  const generatedAt = new Date().toISOString();
  const correlationScore = calculateCorrelationScore(payload.selectedLegs);
  const hasTimingRisk = payload.selectedLegs.some((leg) => {
    return new Date(leg.closesAt).getTime() - Date.now() < 2 * 60 * 60 * 1000;
  });

  const flags: string[] = [];
  let riskTier: RuleBasedRiskOutput["riskTier"] = "LOW";

  if (correlationScore >= 0.75) {
    flags.push("high_correlation_detected");
    riskTier = "HIGH";
  } else if (correlationScore >= 0.4) {
    flags.push("moderate_correlation_detected");
    riskTier = "MEDIUM";
  }

  if (hasTimingRisk) {
    flags.push("timing_anomaly_detected");
    riskTier = "HIGH";
  }

  if (payload.selectedLegs.length >= 6) {
    flags.push("high_leg_count");
    if (riskTier === "LOW") {
      riskTier = "MEDIUM";
    }
  }

  const stakeLimitRaw = getRuleBasedStakeLimit(riskTier);
  const decision: RiskAssessmentResponseDto["decision"] =
    riskTier === "HIGH" ? "CONDITIONAL" : "APPROVED";
  const explanation = {
    headline:
      riskTier === "HIGH"
        ? "This position concentrates risk and should be capped more aggressively."
        : riskTier === "MEDIUM"
        ? "This position remains acceptable, but the vault should price in some additional correlation risk."
        : "This position stays within the cleaner end of the risk envelope.",
    factors: buildFactors(payload.selectedLegs, correlationScore, flags),
  };

  const auditEntry: RiskAuditEntry = {
    requestId,
    walletAddress: payload.walletAddress,
    routeCategory: payload.routeCategory,
    selectedLegs: payload.selectedLegs,
    riskScore: correlationScore,
    riskTier,
    explanation,
    generatedAt,
    source: "rule_based",
  };

  const contentHash = hashAuditEntry(auditEntry);

  return {
    requestId,
    decision,
    riskScore: correlationScore,
    riskTier,
    maxAllowedStakeRaw: stakeLimitRaw.toString(),
    requiresWorldId:
      parseUsdcInput(rawStakeToDecimal(payload.stakeRaw)) >
      TESTNET_VAULT_CONFIG.worldIdGateRaw,
    reasonCodes: flags,
    explanation,
    audit: {
      contentHash,
      provider: "local-hash",
    },
    generatedAt,
    validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    source: "rule_based",
  };
}

async function persistRiskAudit(
  entry: RiskAuditEntry
): Promise<RiskAssessmentResponseDto["audit"]> {
  const rpcUrl = process.env.OG_EVM_RPC;
  const indexerRpc = process.env.OG_INDEXER_RPC;
  const privateKey = process.env.OG_PRIVATE_KEY;

  if (!rpcUrl || !indexerRpc || !privateKey) {
    return {
      contentHash: hashAuditEntry(entry),
      provider: "local-hash",
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdk: any = await import("@0glabs/0g-ts-sdk");
    const ethersModule = await import("ethers");
    const file = new sdk.MemData(
      Buffer.from(JSON.stringify(entry, null, 2), "utf-8")
    );
    const [tree, treeError] = await file.merkleTree();

    if (treeError || !tree) {
      throw new Error(String(treeError ?? "Failed to create 0G merkle tree."));
    }

    const provider = new ethersModule.JsonRpcProvider(rpcUrl);
    const signer = new ethersModule.Wallet(privateKey, provider);
    const indexer = new sdk.Indexer(indexerRpc);
    const [, uploadError] = await indexer.upload(file, rpcUrl, signer);

    if (uploadError) {
      throw new Error(String(uploadError));
    }

    return {
      contentHash: tree.rootHash() as `0x${string}`,
      provider: "0g-storage",
    };
  } catch (error) {
    console.warn("0G Storage upload failed, using local audit hash", error);
    return {
      contentHash: hashAuditEntry(entry),
      provider: "local-hash",
    };
  }
}

function buildRiskPrompt(payload: RiskAssessmentRequestDto) {
  const legsSummary = payload.selectedLegs
    .map(
      (leg, index) =>
        `Leg ${index + 1}: ${leg.question} | Outcome: ${
          leg.outcomeLabel
        } | Probability: ${(leg.referenceProbability * 100).toFixed(
          0
        )}% | Category: ${leg.category} | Resolves: ${leg.closesAt}`
    )
    .join("\n");

  return `You are the underwriting risk model for Underlay, an onchain vault for multi-outcome positions.

POSITION:
${legsSummary}

Stake raw (USDC 6 decimals): ${payload.stakeRaw}

Return ONLY valid JSON with this exact structure:
{
  "risk_tier": "LOW" | "MEDIUM" | "HIGH",
  "stake_limit": number,
  "correlation_score": number,
  "flags": string[],
  "effective_legs": number,
  "settlement_delay": "~30s" | "~1m" | "~2m",
  "confidence": number,
  "reasoning": string
}`;
}

function parseRiskJson(content: string) {
  const cleaned = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned) as {
    risk_tier: "LOW" | "MEDIUM" | "HIGH";
    stake_limit: number;
    correlation_score: number;
    flags: string[];
    effective_legs: number;
    settlement_delay: string;
    confidence: number;
    reasoning?: string;
  };
}

function buildFactors(
  legs: SelectedLeg[],
  correlationScore: number,
  flags: string[]
) {
  const uniqueCategories = new Set(legs.map((leg) => leg.category)).size;
  const timingRisk = legs.some(
    (leg) => new Date(leg.closesAt).getTime() - Date.now() < 2 * 60 * 60 * 1000
  );

  return [
    {
      label: "Leg count",
      value: `${legs.length} selected`,
      impact: legs.length >= 6 ? "HIGH" : legs.length >= 3 ? "MEDIUM" : "LOW",
      direction: legs.length >= 6 ? "UP" : "NEUTRAL",
    },
    {
      label: "Category overlap",
      value: `${uniqueCategories} distinct categories`,
      impact:
        correlationScore >= 0.75
          ? "HIGH"
          : correlationScore >= 0.4
          ? "MEDIUM"
          : "LOW",
      direction: correlationScore >= 0.4 ? "UP" : "NEUTRAL",
    },
    {
      label: "Timing risk",
      value: timingRisk
        ? "A leg resolves within 2 hours"
        : "No near-term resolution anomaly",
      impact: timingRisk ? "HIGH" : "LOW",
      direction: timingRisk ? "UP" : "NEUTRAL",
    },
    {
      label: "Flags",
      value: flags.length > 0 ? flags.join(", ") : "No elevated flags",
      impact: flags.length > 1 ? "HIGH" : flags.length === 1 ? "MEDIUM" : "LOW",
      direction: flags.length > 0 ? "UP" : "NEUTRAL",
    },
  ] as RiskAssessmentResponseDto["explanation"]["factors"];
}

function calculateCorrelationScore(legs: SelectedLeg[]) {
  const categories = legs.map((leg) => leg.category);
  const uniqueCategories = new Set(categories).size;

  if (uniqueCategories === 1) {
    return 0.8;
  }

  if (uniqueCategories === legs.length) {
    return 0.18;
  }

  return 0.45;
}

function getRuleBasedStakeLimit(riskTier: RuleBasedRiskOutput["riskTier"]) {
  if (riskTier === "HIGH") {
    return 1_000_000n;
  }

  if (riskTier === "MEDIUM") {
    return 3_000_000n;
  }

  return TESTNET_VAULT_CONFIG.maxStakeRaw;
}

function createRequestId(payload: RiskAssessmentRequestDto) {
  return `risk_${hashAuditEntry(payload).slice(2, 14)}`;
}

function hashAuditEntry(value: unknown) {
  return `0x${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}` as `0x${string}`;
}

function rawStakeToDecimal(stakeRaw: string) {
  const value = BigInt(stakeRaw);
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");

  return fraction.length > 0 ? `${whole}.${fraction}` : whole.toString();
}
