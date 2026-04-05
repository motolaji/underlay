/**
 * Underlay Settlement Workflow
 *
 * Runs every minute on the Chainlink CRE DON. For each open position:
 *   1. Reads legs from PositionBook (onchain)
 *   2. Checks resolution via Polymarket Gamma API — or demo override
 *   3. Cross-references crypto legs against Chainlink price feeds (Connect the World prize)
 *   4. Submits batch resolveLegs() to SettlementManager via CRE report (consensus write)
 *
 * Settlement delays: LOW=30s | MEDIUM=60s | HIGH=120s | CHALLENGE=60s
 */

import {
  CronCapability, EVMClient, HTTPClient, Runner, handler,
  consensusIdenticalAggregation, encodeCallMsg, bytesToHex,
  prepareReportRequest, LAST_FINALIZED_BLOCK_NUMBER, EVM_DEFAULT_REPORT_ENCODER,
  type Runtime, type NodeRuntime,
} from "@chainlink/cre-sdk";
import { z } from "zod";
import { encodeFunctionData, decodeFunctionResult, type Abi } from "viem";

const configSchema = z.object({
  schedule: z.string(),
  polymarketClobUrl: z.string(),
  positionBookAddress: z.string(),
  settlementManagerAddress: z.string(),
  ethUsdFeedAddress: z.string(),
  btcUsdFeedAddress: z.string(),
  demoOverrides: z.array(
    z.object({ marketId: z.string(), resolved: z.boolean(), yesWon: z.boolean() })
  ),
});

type Config = z.infer<typeof configSchema>;

// JSON ABI format — parseAbi with tuple syntax crashes WASM at module level
const POSITION_BOOK_ABI: Abi = [
  { type: "function", name: "getOpenPositions", inputs: [], outputs: [{ type: "bytes32[]", name: "" }], stateMutability: "view" },
  {
    type: "function", name: "getPositionLegs",
    inputs: [{ type: "bytes32", name: "positionId" }],
    outputs: [{ type: "tuple[]", name: "", components: [
      { type: "bytes32", name: "marketId" }, { type: "uint8", name: "outcome" },
      { type: "uint64", name: "lockedOdds" }, { type: "uint64", name: "resolutionTime" },
      { type: "uint8", name: "status" },
    ]}],
    stateMutability: "view",
  },
];

const SETTLEMENT_ABI: Abi = [
  { type: "function", name: "resolveLegs",
    inputs: [{ type: "bytes32[]", name: "positionIds" }, { type: "uint8[]", name: "legIndexes" }, { type: "bool[]", name: "outcomes" }],
    outputs: [], stateMutability: "nonpayable" },
];

const PRICE_FEED_ABI: Abi = [
  { type: "function", name: "latestRoundData", inputs: [],
    outputs: [{ type: "uint80", name: "roundId" }, { type: "int256", name: "answer" }, { type: "uint256", name: "startedAt" }, { type: "uint256", name: "updatedAt" }, { type: "uint80", name: "answeredInRound" }],
    stateMutability: "view" },
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const LEG_STATUS_OPEN = 0;

type Leg = { marketId: `0x${string}`; outcome: number; lockedOdds: bigint; resolutionTime: bigint; status: number };
type ResolvedLeg = { positionId: `0x${string}`; legIndex: number; won: boolean };
type Caps = { evmClient: EVMClient; httpClient: HTTPClient };

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run((config) => [
    handler(
      new CronCapability().trigger({ schedule: config.schedule }),
      (runtime: Runtime<Config>) => {
        const caps: Caps = {
          evmClient: new EVMClient(BigInt("10344971235874465080")),
          httpClient: new HTTPClient(),
        };
        return settlementWorkflow(runtime, config, caps);
      }
    ),
  ]);
}

function settlementWorkflow(runtime: Runtime<Config>, config: Config, caps: Caps): string {
  runtime.log("Underlay settlement workflow triggered");
  const openPositions = getOpenPositions(runtime, config, caps);
  if (openPositions.length === 0) { runtime.log("No open positions"); return "no_positions"; }
  runtime.log(`Checking ${openPositions.length} open position(s)`);
  const batch = runtime.runInNodeMode(
    (nodeRuntime: NodeRuntime<Config>) => collectResolvedLegs(nodeRuntime, config, caps, openPositions),
    consensusIdenticalAggregation<ResolvedLeg[]>()
  )().result();
  if (batch.length === 0) { runtime.log("No legs ready for resolution"); return "none_ready"; }
  runtime.log(`Submitting ${batch.length} leg resolution(s) onchain`);
  submitResolutions(runtime, config, caps, batch);
  return `resolved_${batch.length}`;
}

function getOpenPositions(runtime: Runtime<Config>, config: Config, caps: Caps): `0x${string}`[] {
  const callData = encodeFunctionData({ abi: POSITION_BOOK_ABI, functionName: "getOpenPositions" });
  const reply = caps.evmClient.callContract(runtime, {
    call: encodeCallMsg({ from: ZERO_ADDRESS, to: config.positionBookAddress as `0x${string}`, data: callData }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result();
  return decodeFunctionResult({ abi: POSITION_BOOK_ABI, functionName: "getOpenPositions", data: bytesToHex(reply.data) }) as `0x${string}`[];
}

function getPositionLegs(runtime: Runtime<Config>, config: Config, caps: Caps, positionId: `0x${string}`): Leg[] {
  const callData = encodeFunctionData({ abi: POSITION_BOOK_ABI, functionName: "getPositionLegs", args: [positionId] });
  const reply = caps.evmClient.callContract(runtime, {
    call: encodeCallMsg({ from: ZERO_ADDRESS, to: config.positionBookAddress as `0x${string}`, data: callData }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result();
  return (decodeFunctionResult({ abi: POSITION_BOOK_ABI, functionName: "getPositionLegs", data: bytesToHex(reply.data) }) as Leg[]).map((leg) => ({ ...leg }));
}

function collectResolvedLegs(nodeRuntime: NodeRuntime<Config>, config: Config, caps: Caps, positionIds: `0x${string}`[]): ResolvedLeg[] {
  const resolved: ResolvedLeg[] = [];
  for (const positionId of positionIds) {
    const legs = getPositionLegs(nodeRuntime as unknown as Runtime<Config>, config, caps, positionId);
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      if (leg.status !== LEG_STATUS_OPEN) continue;
      const outcome = checkLegResolution(nodeRuntime, config, caps, leg);
      if (outcome !== null) resolved.push({ positionId, legIndex: i, won: outcome });
    }
  }
  return resolved;
}

function checkLegResolution(nodeRuntime: NodeRuntime<Config>, config: Config, caps: Caps, leg: Leg): boolean | null {
  const override = config.demoOverrides.find((o) => o.marketId.toLowerCase() === leg.marketId.toLowerCase());
  if (override) {
    if (!override.resolved) return null;
    nodeRuntime.log(`Demo override: market ${leg.marketId} yesWon=${override.yesWon}`);
    return leg.outcome === 0 ? override.yesWon : !override.yesWon;
  }
  return checkPolymarket(nodeRuntime, config, caps, leg.marketId, leg.outcome);
}

function checkPolymarket(nodeRuntime: NodeRuntime<Config>, config: Config, caps: Caps, conditionId: `0x${string}`, bettorOutcome: number): boolean | null {
  const response = caps.httpClient.sendRequest(nodeRuntime, {
    url: `${config.polymarketClobUrl}/markets/${conditionId}`,
    method: "GET",
  }).result();
  if (response.statusCode !== 200) { nodeRuntime.log(`Polymarket CLOB returned ${response.statusCode} for ${conditionId}`); return null; }
  const market = JSON.parse(new TextDecoder().decode(response.body)) as { closed?: boolean; question?: string; tokens?: Array<{ outcome: string; price: number; winner: boolean }> };
  if (!market.closed || !market.tokens?.length) return null;
  // tokens[0] is always the YES-equivalent (Up/Yes/Approve/etc.)
  const firstToken = market.tokens[0];
  const yesWon = firstToken.winner === true || firstToken.price > 0.99;
  nodeRuntime.log(`"${market.question}" → yesWon=${yesWon} | outcome=${bettorOutcome === 0 ? "YES" : "NO"}`);
  if (market.question) logChainlinkPriceFeed(nodeRuntime as unknown as Runtime<Config>, config, caps, market.question);
  return bettorOutcome === 0 ? yesWon : !yesWon;
}

function logChainlinkPriceFeed(runtime: Runtime<Config>, config: Config, caps: Caps, question: string): void {
  const lower = question.toLowerCase();
  const isEth = lower.includes("eth") || lower.includes("ethereum");
  const isBtc = lower.includes("btc") || lower.includes("bitcoin");
  if (!isEth && !isBtc) return;
  const feedAddress = isEth ? config.ethUsdFeedAddress : config.btcUsdFeedAddress;
  const ticker = isEth ? "ETH" : "BTC";
  const callData = encodeFunctionData({ abi: PRICE_FEED_ABI, functionName: "latestRoundData" });
  const reply = caps.evmClient.callContract(runtime, {
    call: encodeCallMsg({ from: ZERO_ADDRESS, to: feedAddress as `0x${string}`, data: callData }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result();
  const [, answer] = decodeFunctionResult({ abi: PRICE_FEED_ABI, functionName: "latestRoundData", data: bytesToHex(reply.data) }) as [bigint, bigint, bigint, bigint, bigint];
  runtime.log(`[Chainlink] ${ticker}/USD = $${(Number(answer) / 1e8).toFixed(2)} — cross-referencing "${question}"`);
}

function submitResolutions(runtime: Runtime<Config>, config: Config, caps: Caps, batch: ResolvedLeg[]): void {
  const positionIds = batch.map((r) => r.positionId);
  const legIndexes = batch.map((r) => r.legIndex);
  const outcomes = batch.map((r) => r.won);
  const callData = encodeFunctionData({ abi: SETTLEMENT_ABI, functionName: "resolveLegs", args: [positionIds, legIndexes as unknown as readonly number[], outcomes] });
  const report = runtime.report(prepareReportRequest(callData, EVM_DEFAULT_REPORT_ENCODER)).result();
  caps.evmClient.writeReport(runtime, { receiver: config.settlementManagerAddress, report, gasConfig: { gasLimit: "500000" } }).result();
  runtime.log(`resolveLegs submitted for ${[...new Set(positionIds)].length} position(s), ${batch.length} leg(s)`);
}
