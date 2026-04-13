// Manual test: bypass SDK and send the tx directly with explicit gasLimit
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import { XMLHttpRequest as XHR } from "xmlhttprequest";
globalThis.XMLHttpRequest = XHR;

import { MemData } from "@0glabs/0g-ts-sdk";

const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai";
const FLOW_ADDRESS = "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";
const PRIVATE_KEY = process.env.OG_PRIVATE_KEY;

const FLOW_ABI = [
  "function submit(tuple(uint256 length, bytes tags, tuple(bytes32 root, uint256 height)[] nodes) submission) payable returns (uint256, bytes32, uint256, uint256)",
  "function market() view returns (address)",
];
const MARKET_ABI = ["function pricePerSector() view returns (uint256)"];

const provider = new JsonRpcProvider(OG_EVM_RPC);
const signer = new Wallet(PRIVATE_KEY, provider);
const flow = new Contract(FLOW_ADDRESS, FLOW_ABI, signer);

const marketAddr = await flow.market();
const market = new Contract(marketAddr, MARKET_ABI, provider);
const pricePerSector = await market.pricePerSector();

// Try with a tiny file that's already at least 256 bytes
const tiny = Buffer.alloc(256, 0x41); // 256 bytes of 'A'
const tinyFile = new MemData(tiny);
const [tinyTree] = await tinyFile.merkleTree();
console.log("256-byte file merkle root:", tinyTree?.rootHash());

// The submission struct for tiny file: 1 chunk, height = 0
const submissionTiny = {
  length: 256n,
  tags: "0x",
  nodes: [{ root: tinyTree?.rootHash(), height: 0n }],
};
const feeForTiny = (1n << 0n) * pricePerSector; // 1 sector
console.log("Fee for tiny (256b):", feeForTiny.toString());

try {
  const txTiny = await flow.submit.populateTransaction(submissionTiny, { value: feeForTiny });
  console.log("Populated tx for tiny:", { to: txTiny.to, value: txTiny.value?.toString() });
  // Try with explicit gas limit
  const sentTiny = await signer.sendTransaction({ ...txTiny, gasLimit: 500000n });
  console.log("Tiny tx hash:", sentTiny.hash);
  const receipt = await sentTiny.wait();
  console.log("Tiny status:", receipt?.status);
} catch(e) {
  console.error("Tiny tx failed:", e.shortMessage || e.message?.slice(0, 300));
}

// Check account balance
const balance = await provider.getBalance(signer.address);
console.log("Account balance:", balance.toString(), "wei =", (Number(balance) / 1e18).toFixed(4), "A0GI");
console.log("Account:", signer.address);
