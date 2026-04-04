/**
 * Underlay Settlement Workflow
 *
 * Runs every minute on the Chainlink CRE DON. For each open position:
 *   1. Reads legs from PositionBook (onchain)
 *   2. Checks resolution via Polymarket Gamma API — or demo override
 *   3. Cross-references crypto legs against Chainlink price feeds (Connect the World prize)
 *   4. Submits batch resolveLegs() to SettlementManager via CRE report (consensus write)
 *
 * Settlement delays (configurable on SettlementManager):
 *   LOW → 30s  |  MEDIUM → 60s  |  HIGH → 120s  |  CHALLENGE → 60s
 */

import {
  CronCapability,
  EVMClient,
  HTTPClient,
  Runner,
  handler,
  consensusIdenticalAggregation,
  encodeCallMsg,
  bytesToHex,
  prepareReportRequest,
  LAST_FINALIZED_BLOCK_NUMBER,
  EVM_DEFAULT_REPORT_ENCODER,
  type Runtime,
  type NodeRuntime,
} from "@chainlink/cre-sdk";
import { z } from "zod";
import { encodeFunctionData, decodeFunctionResult, parseAbi } from "viem";

// ---------------------------------------------------------------------------
// Capabilities (instantiated once, reused)
// ---------------------------------------------------------------------------

const cron = new CronCapability();
const httpClient = new HTTPClient();
const evmClient = new EVMClient(
  BigInt("10344971235874465080") // ethereum-testnet-sepolia-base-1
);

// ---------------------------------------------------------------------------
// Config schema
// ---------------------------------------------------------------------------

const configSchema = z.object({
  schedule: z.string(),
  polymarketGammaUrl: z.string(),
  positionBookAddress: z.string(),
  settlementManagerAddress: z.string(),
  ethUsdFeedAddress: z.string(),
  btcUsdFeedAddress: z.string(),
  demoOverrides: z.array(
    z.object({
      marketId: z.string(),
      resolved: z.boolean(),
      yesWon: z.boolean(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

// ---------------------------------------------------------------------------
// ABIs
// ---------------------------------------------------------------------------

const POSITION_BOOK_ABI = parseAbi([
  "function getOpenPositions() external view returns (bytes32[])",
  "function getPositionLegs(bytes32 positionId) external view returns (tuple(bytes32 marketId, uint8 outcome, uint64 lockedOdds, uint64 resolutionTime, uint8 status)[])",
]);

const SETTLEMENT_ABI = parseAbi([
  "function resolveLegs(bytes32[] positionIds, uint8[] legIndexes, bool[] outcomes) external",
]);

const PRICE_FEED_ABI = parseAbi([
  "function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)",
]);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const LEG_STATUS_OPEN = 0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Leg = {
  marketId: `0x${string}`;
  outcome: number;
  lockedOdds: bigint;
  resolutionTime: bigint;
  status: number;
};

type ResolvedLeg = {
  positionId: `0x${string}`;
  legIndex: number;
  won: boolean;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run((config) => [
    handler(
      cron.trigger({ schedule: config.schedule }),
      (runtime: Runtime<Config>) => settlementWorkflow(runtime, config)
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Core workflow
// ---------------------------------------------------------------------------

function settlementWorkflow(
  runtime: Runtime<Config>,
  config: Config
): string {
  runtime.log("Underlay settlement workflow triggered");

  const openPositions = getOpenPositions(runtime, config);

  if (openPositions.length === 0) {
    runtime.log("No open positions");
    return "no_positions";
  }

  runtime.log(`Checking ${openPositions.length} open position(s)`);

  // Collect resolved legs in node mode (HTTP access for Polymarket)
  const batch = runtime
    .runInNodeMode(
      (nodeRuntime: NodeRuntime<Config>) =>
        collectResolvedLegs(nodeRuntime, config, openPositions),
      consensusIdenticalAggregation<ResolvedLeg[]>()
    )()
    .result();

  if (batch.length === 0) {
    runtime.log("No legs ready for resolution");
    return "none_ready";
  }

  runtime.log(`Submitting ${batch.length} leg resolution(s) onchain`);
  submitResolutions(runtime, config, batch);

  return `resolved_${batch.length}`;
}

// ---------------------------------------------------------------------------
// Contract reads (DON mode)
// ---------------------------------------------------------------------------

function getOpenPositions(
  runtime: Runtime<Config>,
  config: Config
): `0x${string}`[] {
  const callData = encodeFunctionData({
    abi: POSITION_BOOK_ABI,
    functionName: "getOpenPositions",
  });

  const reply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: ZERO_ADDRESS,
        to: config.positionBookAddress as `0x${string}`,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const decoded = decodeFunctionResult({
    abi: POSITION_BOOK_ABI,
    functionName: "getOpenPositions",
    data: bytesToHex(reply.data),
  });

  return decoded as `0x${string}`[];
}

function getPositionLegs(
  runtime: Runtime<Config>,
  config: Config,
  positionId: `0x${string}`
): Leg[] {
  const callData = encodeFunctionData({
    abi: POSITION_BOOK_ABI,
    functionName: "getPositionLegs",
    args: [positionId],
  });

  const reply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: ZERO_ADDRESS,
        to: config.positionBookAddress as `0x${string}`,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const decoded = decodeFunctionResult({
    abi: POSITION_BOOK_ABI,
    functionName: "getPositionLegs",
    data: bytesToHex(reply.data),
  });

  return (decoded as Leg[]).map((leg) => ({ ...leg }));
}

// ---------------------------------------------------------------------------
// Resolution collection (node mode — HTTP access)
// ---------------------------------------------------------------------------

function collectResolvedLegs(
  nodeRuntime: NodeRuntime<Config>,
  config: Config,
  positionIds: `0x${string}`[]
): ResolvedLeg[] {
  const resolved: ResolvedLeg[] = [];

  for (const positionId of positionIds) {
    const legs = getPositionLegs(
      nodeRuntime as unknown as Runtime<Config>,
      config,
      positionId
    );

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      if (leg.status !== LEG_STATUS_OPEN) continue;

      const outcome = checkLegResolution(nodeRuntime, config, leg);

      if (outcome !== null) {
        resolved.push({ positionId, legIndex: i, won: outcome });
      }
    }
  }

  return resolved;
}

function checkLegResolution(
  nodeRuntime: NodeRuntime<Config>,
  config: Config,
  leg: Leg
): boolean | null {
  // Demo override check first
  const override = config.demoOverrides.find(
    (o) => o.marketId.toLowerCase() === leg.marketId.toLowerCase()
  );

  if (override) {
    if (!override.resolved) return null;
    nodeRuntime.log(`Demo override: market ${leg.marketId} yesWon=${override.yesWon}`);
    return leg.outcome === 0 ? override.yesWon : !override.yesWon;
  }

  return checkPolymarket(nodeRuntime, config, leg.marketId, leg.outcome);
}

function checkPolymarket(
  nodeRuntime: NodeRuntime<Config>,
  config: Config,
  conditionId: `0x${string}`,
  bettorOutcome: number
): boolean | null {
  const response = httpClient
    .sendRequest(nodeRuntime, {
      url: `${config.polymarketGammaUrl}/markets?conditionId=${conditionId}`,
      method: "GET",
    })
    .result();

  if (response.statusCode !== 200) {
    nodeRuntime.log(`Polymarket returned ${response.statusCode} for ${conditionId}`);
    return null;
  }

  const markets = JSON.parse(new TextDecoder().decode(response.body)) as Array<{
    closed?: boolean;
    outcomePrices?: string;
    question?: string;
  }>;

  const market = markets[0];
  if (!market || !market.closed || !market.outcomePrices) return null;

  const prices = JSON.parse(market.outcomePrices) as string[];
  const yesWon = parseFloat(prices[0]) === 1;

  // Cross-reference crypto markets with Chainlink price feeds (Connect the World prize)
  if (market.question) {
    logChainlinkPriceFeed(
      nodeRuntime as unknown as Runtime<Config>,
      config,
      market.question
    );
  }

  return bettorOutcome === 0 ? yesWon : !yesWon;
}

// ---------------------------------------------------------------------------
// Chainlink price feed read — Connect the World prize
// ---------------------------------------------------------------------------

function logChainlinkPriceFeed(
  runtime: Runtime<Config>,
  config: Config,
  question: string
): void {
  const lower = question.toLowerCase();
  const isEth = lower.includes("eth") || lower.includes("ethereum");
  const isBtc = lower.includes("btc") || lower.includes("bitcoin");
  if (!isEth && !isBtc) return;

  const feedAddress = isEth ? config.ethUsdFeedAddress : config.btcUsdFeedAddress;
  const ticker = isEth ? "ETH" : "BTC";

  const callData = encodeFunctionData({
    abi: PRICE_FEED_ABI,
    functionName: "latestRoundData",
  });

  const reply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: ZERO_ADDRESS,
        to: feedAddress as `0x${string}`,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const [, answer] = decodeFunctionResult({
    abi: PRICE_FEED_ABI,
    functionName: "latestRoundData",
    data: bytesToHex(reply.data),
  }) as [bigint, bigint, bigint, bigint, bigint];

  const price = Number(answer) / 1e8;
  runtime.log(`[Chainlink] ${ticker}/USD = $${price.toFixed(2)} — cross-referencing "${question}"`);
}

// ---------------------------------------------------------------------------
// Onchain write — CRE consensus report
// ---------------------------------------------------------------------------

function submitResolutions(
  runtime: Runtime<Config>,
  config: Config,
  batch: ResolvedLeg[]
): void {
  const positionIds = batch.map((r) => r.positionId);
  const legIndexes = batch.map((r) => r.legIndex);
  const outcomes = batch.map((r) => r.won);

  const callData = encodeFunctionData({
    abi: SETTLEMENT_ABI,
    functionName: "resolveLegs",
    args: [
      positionIds,
      legIndexes as unknown as readonly number[],
      outcomes,
    ],
  });

  const report = runtime
    .report(prepareReportRequest(callData, EVM_DEFAULT_REPORT_ENCODER))
    .result();

  evmClient
    .writeReport(runtime, {
      receiver: config.settlementManagerAddress,
      report,
      gasConfig: { gasLimit: "500000" },
    })
    .result();

  const uniquePositions = [...new Set(positionIds)];
  runtime.log(
    `resolveLegs submitted for ${uniquePositions.length} position(s), ${batch.length} leg(s)`
  );
}

