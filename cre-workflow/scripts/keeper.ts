/**
 * Underlay Settlement Keeper
 *
 * Mirrors the CRE workflow logic but actually lands on-chain.
 * Run as a cron every minute — safe to call repeatedly.
 *
 * Every tick:
 *   1. RESOLVE  — read open positions from PositionBook, check each leg
 *                 against Polymarket CLOB, call resolveLeg() for closed markets
 *   2. EXECUTE  — scan recent SettlementInitiated events, call executeSettlement()
 *                 for any pending settlement whose delay has elapsed
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx tsx scripts/keeper.ts
 *
 * As a cron (every minute):
 *   * * * * * cd /path/to/cre-workflow && PRIVATE_KEY=0x... npx tsx scripts/keeper.ts >> /tmp/keeper.log 2>&1
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  decodeFunctionResult,
  encodeFunctionData,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const POSITION_BOOK = (
  process.env.POSITION_BOOK_ADDRESS ?? "0x29141D2762654786734421705F448C0EF4057366"
) as `0x${string}`;
const SETTLEMENT_MANAGER = (
  process.env.SETTLEMENT_MANAGER_ADDRESS ?? "0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A"
) as `0x${string}`;
const CLOB_BASE = "https://clob.polymarket.com";

// How far back to scan for SettlementInitiated events (~2s blocks on Base Sepolia)
// Public RPC limits eth_getLogs to 10,000 block range
const LOOKBACK_BLOCKS = 9_000n;

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("PRIVATE_KEY env var is required");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// ABIs
// ---------------------------------------------------------------------------

const POSITION_BOOK_ABI: Abi = [
  {
    type: "function",
    name: "getOpenPositions",
    inputs: [],
    outputs: [{ type: "bytes32[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPositionLegs",
    inputs: [{ type: "bytes32", name: "positionId" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { type: "bytes32", name: "marketId" },
          { type: "uint8", name: "outcome" },
          { type: "uint64", name: "lockedOdds" },
          { type: "uint64", name: "resolutionTime" },
          { type: "uint8", name: "status" },
        ],
      },
    ],
    stateMutability: "view",
  },
];

const SETTLEMENT_ABI: Abi = [
  {
    type: "function",
    name: "resolveLeg",
    inputs: [
      { type: "bytes32", name: "positionId" },
      { type: "uint8", name: "legIndex" },
      { type: "bool", name: "won" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isReadyToSettle",
    inputs: [{ type: "bytes32", name: "positionId" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "executeSettlement",
    inputs: [{ type: "bytes32", name: "positionId" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "SettlementInitiated",
    inputs: [
      { name: "positionId", type: "bytes32", indexed: true },
      { name: "settleAfter", type: "uint256", indexed: false },
      { name: "riskTier", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
];

type Leg = {
  marketId: `0x${string}`;
  outcome: number;
  lockedOdds: bigint;
  resolutionTime: bigint;
  status: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function checkMarket(conditionId: `0x${string}`, bettorOutcome: number): Promise<boolean | null> {
  try {
    const res = await fetch(`${CLOB_BASE}/markets/${conditionId}`);
    if (!res.ok) return null;

    const market = (await res.json()) as {
      closed?: boolean;
      question?: string;
      tokens?: Array<{ outcome: string; price: number; winner: boolean }>;
    };

    if (!market.closed || !market.tokens?.length) return null;

    // tokens[0] is always the YES-equivalent (Up/Yes/Approve/etc.)
    const firstToken = market.tokens[0];
    const yesWon = firstToken.winner === true || firstToken.price > 0.99;
    const won = bettorOutcome === 0 ? yesWon : !yesWon;

    console.log(
      `  "${market.question}" → yesWon=${yesWon} | outcome=${bettorOutcome === 0 ? "YES" : "NO"} | won=${won}`
    );
    return won;
  } catch {
    return null;
  }
}

async function sendAndConfirm(
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  to: `0x${string}`,
  data: `0x${string}`,
  label: string
): Promise<boolean> {
  const hash = await walletClient.sendTransaction({ to, data });
  console.log(`  ${label} tx: https://sepolia.basescan.org/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    console.error(`  REVERTED — check Basescan`);
    return false;
  }
  console.log(`  Confirmed in block ${receipt.blockNumber}`);
  return true;
}

// ---------------------------------------------------------------------------
// Step 1: Resolve open legs against Polymarket
// ---------------------------------------------------------------------------

async function resolveStep(
  publicClient: ReturnType<typeof createPublicClient>,
  walletClient: ReturnType<typeof createWalletClient>
) {
  console.log("\n[RESOLVE] Checking open positions...");

  const data = encodeFunctionData({ abi: POSITION_BOOK_ABI, functionName: "getOpenPositions" });
  const result = await publicClient.call({ to: POSITION_BOOK, data });
  const openPositions = decodeFunctionResult({
    abi: POSITION_BOOK_ABI,
    functionName: "getOpenPositions",
    data: result.data!,
  }) as `0x${string}`[];

  if (openPositions.length === 0) {
    console.log("  No open positions.");
    return;
  }

  console.log(`  Found ${openPositions.length} open position(s)`);

  for (const positionId of openPositions) {
    const legsData = encodeFunctionData({
      abi: POSITION_BOOK_ABI,
      functionName: "getPositionLegs",
      args: [positionId],
    });
    const legsResult = await publicClient.call({ to: POSITION_BOOK, data: legsData });
    const legs = decodeFunctionResult({
      abi: POSITION_BOOK_ABI,
      functionName: "getPositionLegs",
      data: legsResult.data!,
    }) as Leg[];

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      if (leg.status !== 0) continue; // already resolved

      console.log(`  Position ${positionId.slice(0, 10)}... Leg ${i}: ${leg.marketId.slice(0, 10)}...`);
      const won = await checkMarket(leg.marketId, leg.outcome);
      if (won === null) continue;

      const callData = encodeFunctionData({
        abi: SETTLEMENT_ABI,
        functionName: "resolveLeg",
        args: [positionId, i, won],
      });
      await sendAndConfirm(walletClient, publicClient, SETTLEMENT_MANAGER, callData, `resolveLeg leg ${i}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 2: Execute pending settlements whose delay has elapsed
// ---------------------------------------------------------------------------

async function executeStep(
  publicClient: ReturnType<typeof createPublicClient>,
  walletClient: ReturnType<typeof createWalletClient>
) {
  console.log("\n[EXECUTE] Scanning for pending settlements...");

  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;

  const logs = await publicClient.getLogs({
    address: SETTLEMENT_MANAGER,
    event: SETTLEMENT_ABI.find((x) => (x as { name?: string }).name === "SettlementInitiated") as never,
    fromBlock,
    toBlock: "latest",
  });

  if (logs.length === 0) {
    console.log("  No pending settlements found.");
    return;
  }

  // Deduplicate by positionId (take latest event per position)
  const seen = new Set<string>();
  const unique = logs.filter((log) => {
    const id = (log.args as { positionId?: string }).positionId ?? "";
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  console.log(`  Found ${unique.length} candidate(s)`);

  for (const log of unique) {
    const positionId = (log.args as { positionId?: `0x${string}` }).positionId;
    if (!positionId) continue;

    const readyData = encodeFunctionData({
      abi: SETTLEMENT_ABI,
      functionName: "isReadyToSettle",
      args: [positionId],
    });
    const readyResult = await publicClient.call({ to: SETTLEMENT_MANAGER, data: readyData });
    const ready = decodeFunctionResult({
      abi: SETTLEMENT_ABI,
      functionName: "isReadyToSettle",
      data: readyResult.data!,
    }) as boolean;

    if (!ready) {
      console.log(`  ${positionId.slice(0, 10)}... not ready yet`);
      continue;
    }

    console.log(`  Executing settlement for ${positionId.slice(0, 10)}...`);
    const execData = encodeFunctionData({
      abi: SETTLEMENT_ABI,
      functionName: "executeSettlement",
      args: [positionId],
    });
    await sendAndConfirm(walletClient, publicClient, SETTLEMENT_MANAGER, execData, "executeSettlement");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  const now = new Date().toISOString();
  console.log(`\n=== Underlay Keeper — ${now} ===`);
  console.log(`Account: ${account.address}`);

  await resolveStep(publicClient, walletClient);
  await executeStep(publicClient, walletClient);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
