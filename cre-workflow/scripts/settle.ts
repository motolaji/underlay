/**
 * Underlay Settlement Keeper
 *
 * Reads open positions from PositionBook, checks each leg against the
 * Polymarket CLOB API for real resolution data, then calls resolveLegs()
 * with the correct outcomes. No manual WON flag — outcome is always derived
 * from live Polymarket data.
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx tsx scripts/settle.ts
 *
 * Optional env overrides:
 *   POSITION_BOOK_ADDRESS   — defaults to deployed address
 *   SETTLEMENT_MANAGER_ADDRESS — defaults to deployed address
 *   RPC_URL                 — defaults to Base Sepolia public RPC
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

const RPC_URL =
  process.env.RPC_URL ?? "https://sepolia.base.org";
const POSITION_BOOK =
  (process.env.POSITION_BOOK_ADDRESS ??
    "0x29141D2762654786734421705F448C0EF4057366") as `0x${string}`;
const SETTLEMENT_MANAGER =
  (process.env.SETTLEMENT_MANAGER_ADDRESS ??
    "0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A") as `0x${string}`;
const CLOB_BASE = "https://clob.polymarket.com";

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
    outputs: [{ type: "bytes32[]", name: "" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPositionLegs",
    inputs: [{ type: "bytes32", name: "positionId" }],
    outputs: [
      {
        type: "tuple[]",
        name: "",
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
];

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
// Polymarket CLOB lookup
// ---------------------------------------------------------------------------

async function checkMarket(
  conditionId: `0x${string}`,
  bettorOutcome: number
): Promise<boolean | null> {
  const res = await fetch(`${CLOB_BASE}/markets/${conditionId}`);
  if (!res.ok) {
    console.warn(`  CLOB ${res.status} for ${conditionId}`);
    return null;
  }

  const market = (await res.json()) as {
    closed?: boolean;
    question?: string;
    tokens?: Array<{ outcome: string; price: number; winner: boolean }>;
  };

  if (!market.closed) {
    console.log(`  Market not yet closed: "${market.question ?? conditionId}"`);
    return null;
  }

  // tokens[0] is always the YES-equivalent (Up/Yes/Approve/etc.)
  const firstToken = market.tokens?.[0];
  if (!firstToken) return null;

  const yesWon = firstToken.winner === true || firstToken.price > 0.99;
  const won = bettorOutcome === 0 ? yesWon : !yesWon;

  console.log(
    `  "${market.question}" → yesWon=${yesWon} | bettor outcome=${bettorOutcome === 0 ? "YES" : "NO"} | won=${won}`
  );

  return won;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  console.log(`Keeper account: ${account.address}`);
  console.log(`PositionBook:   ${POSITION_BOOK}`);
  console.log(`SettlementMgr:  ${SETTLEMENT_MANAGER}\n`);

  // 1. Read open positions
  const openPositionsData = encodeFunctionData({
    abi: POSITION_BOOK_ABI,
    functionName: "getOpenPositions",
  });
  const openResult = await publicClient.call({ to: POSITION_BOOK, data: openPositionsData });
  const openPositions = decodeFunctionResult({
    abi: POSITION_BOOK_ABI,
    functionName: "getOpenPositions",
    data: openResult.data!,
  }) as `0x${string}`[];

  if (openPositions.length === 0) {
    console.log("No open positions.");
    return;
  }

  console.log(`Found ${openPositions.length} open position(s)\n`);

  // 2. Check each leg against Polymarket
  const batch: ResolvedLeg[] = [];

  for (const positionId of openPositions) {
    console.log(`Position: ${positionId}`);

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
      if (leg.status !== 0) {
        console.log(`  Leg ${i}: already resolved (status=${leg.status}), skipping`);
        continue;
      }

      console.log(`  Leg ${i}: market ${leg.marketId}`);
      const won = await checkMarket(leg.marketId, leg.outcome);

      if (won !== null) {
        batch.push({ positionId, legIndex: i, won });
      }
    }
    console.log();
  }

  if (batch.length === 0) {
    console.log("No legs ready for resolution.");
    return;
  }

  // 3. Submit one resolveLeg tx per resolved leg
  console.log(`Submitting ${batch.length} resolution(s) on-chain...`);

  for (const leg of batch) {
    const callData = encodeFunctionData({
      abi: SETTLEMENT_ABI,
      functionName: "resolveLeg",
      args: [leg.positionId, leg.legIndex, leg.won],
    });

    const hash = await walletClient.sendTransaction({
      to: SETTLEMENT_MANAGER,
      data: callData,
    });

    console.log(`\nresolveLeg tx: ${hash}`);
    console.log(`https://sepolia.basescan.org/tx/${hash}`);
    console.log("Waiting for receipt...");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      console.error(`Transaction REVERTED for leg ${leg.legIndex}. Check Basescan.`);
      process.exit(1);
    }

    console.log(`Confirmed in block ${receipt.blockNumber}`);
  }

  console.log(`\nWait for the settlement delay, then run:`);
  console.log(`PRIVATE_KEY=... POSITION_ID=${batch[0].positionId} npx tsx scripts/execute.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
