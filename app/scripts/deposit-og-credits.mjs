/**
 * One-off script to deposit compute credits into the 0G Galileo ledger.
 *
 * Run once after funding your wallet from https://faucet.0g.ai:
 *   node scripts/deposit-og-credits.mjs
 *
 * What it does:
 *   1. Connects to 0G Galileo using OG_PRIVATE_KEY from .env.local
 *   2. Creates (or tops up) your ledger account on the 0G LedgerManager contract
 *   3. Lists available inference services so you can confirm compute is reachable
 *
 * The deposit amount is 0.1 0G by default — enough for many thousands of risk
 * scoring requests on testnet. Edit DEPOSIT_AMOUNT below to change it.
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Load .env.local manually (no dotenv dependency needed) ---
const envPath = path.resolve(__dirname, "../.env.local");
const envVars = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const RPC_URL = envVars["OG_EVM_RPC"];
const PRIVATE_KEY = envVars["OG_PRIVATE_KEY"];

const DEPOSIT_AMOUNT = 3; // 0G tokens — minimum required to create a new ledger account

if (!RPC_URL || !PRIVATE_KEY) {
  console.error(
    "❌  OG_EVM_RPC and OG_PRIVATE_KEY must both be set in app/.env.local"
  );
  process.exit(1);
}

const { createZGComputeNetworkBroker } = require("@0glabs/0g-serving-broker");
const { JsonRpcProvider, Wallet } = require("ethers");

async function main() {
  console.log("Connecting to 0G Galileo...");
  console.log(`  RPC: ${RPC_URL}`);

  const provider = new JsonRpcProvider(RPC_URL);
  const signer = new Wallet(PRIVATE_KEY, provider);

  console.log(`  Wallet: ${signer.address}`);

  const balance = await provider.getBalance(signer.address);
  const balanceEth = Number(balance) / 1e18;
  console.log(`  0G balance: ${balanceEth.toFixed(4)} 0G`);

  if (balanceEth < DEPOSIT_AMOUNT) {
    console.error(
      `❌  Insufficient balance. Need at least ${DEPOSIT_AMOUNT} 0G to create a compute ledger.`
    );
    console.error(
      `   The public faucet gives 0.1 0G/day — request a larger amount in the 0G Discord: https://discord.gg/0glabs`
    );
    process.exit(1);
  }

  console.log("\nInitialising broker...");
  const broker = await createZGComputeNetworkBroker(signer);

  console.log(`\nDepositing ${DEPOSIT_AMOUNT} 0G into compute ledger...`);
  await broker.ledger.depositFund(DEPOSIT_AMOUNT);
  console.log("  ✓ Deposit confirmed");

  console.log("\nFetching available inference services...");
  const services = await broker.inference.listService();

  if (services.length === 0) {
    console.log("  No services found yet — the network may be warming up.");
  } else {
    console.log(`  Found ${services.length} service(s):`);
    for (const s of services) {
      console.log(`    • ${s.model} — provider ${s.provider}`);
    }
  }

  console.log("\n✓ 0G compute credits deposited. Risk scoring is now active.");
  console.log(
    "  Verify anytime: GET /api/og-status (restart dev server first)"
  );
}

main().catch((err) => {
  console.error("❌ ", err.message ?? err);
  process.exit(1);
});
