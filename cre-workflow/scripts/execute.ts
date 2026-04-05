/**
 * Underlay Settlement Executor
 *
 * Calls executeSettlement() for all WON positions that have passed their
 * challenge delay. Safe to run repeatedly — already-executed positions revert
 * and are caught silently.
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx tsx scripts/execute.ts
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

const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const POSITION_BOOK =
  (process.env.POSITION_BOOK_ADDRESS ??
    "0x29141D2762654786734421705F448C0EF4057366") as `0x${string}`;
const SETTLEMENT_MANAGER =
  (process.env.SETTLEMENT_MANAGER_ADDRESS ??
    "0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A") as `0x${string}`;

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("PRIVATE_KEY env var is required");
  process.exit(1);
}

const POSITION_BOOK_ABI: Abi = [
  {
    type: "function",
    name: "getOpenPositions",
    inputs: [],
    outputs: [{ type: "bytes32[]", name: "" }],
    stateMutability: "view",
  },
];

const SETTLEMENT_ABI: Abi = [
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
];

async function main() {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  console.log(`Executor account: ${account.address}\n`);

  const envId = process.env.POSITION_ID as `0x${string}` | undefined;

  let candidates: `0x${string}`[];
  if (envId) {
    candidates = [envId];
  } else {
    // Fall back to open positions — note WON positions won't appear here,
    // so always pass POSITION_ID after settle.ts runs.
    const openData = encodeFunctionData({
      abi: POSITION_BOOK_ABI,
      functionName: "getOpenPositions",
    });
    const openResult = await publicClient.call({ to: POSITION_BOOK, data: openData });
    candidates = decodeFunctionResult({
      abi: POSITION_BOOK_ABI,
      functionName: "getOpenPositions",
      data: openResult.data!,
    }) as `0x${string}`[];
  }

  if (candidates.length === 0) {
    console.log("No positions found. Pass POSITION_ID=0x... to target a specific position.");
    return;
  }

  for (const positionId of candidates) {
    // Check isReadyToSettle
    const readyData = encodeFunctionData({
      abi: SETTLEMENT_ABI,
      functionName: "isReadyToSettle",
      args: [positionId],
    });
    const readyResult = await publicClient.call({
      to: SETTLEMENT_MANAGER,
      data: readyData,
    });
    const ready = decodeFunctionResult({
      abi: SETTLEMENT_ABI,
      functionName: "isReadyToSettle",
      data: readyResult.data!,
    }) as boolean;

    if (!ready) {
      console.log(`Position ${positionId}: not ready (delay not elapsed or not resolved)`);
      continue;
    }

    console.log(`Executing settlement for ${positionId}...`);
    const execData = encodeFunctionData({
      abi: SETTLEMENT_ABI,
      functionName: "executeSettlement",
      args: [positionId],
    });

    const hash = await walletClient.sendTransaction({
      to: SETTLEMENT_MANAGER,
      data: execData,
    });

    console.log(`tx: ${hash}`);
    console.log(`https://sepolia.basescan.org/tx/${hash}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
