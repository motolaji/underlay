// Debug: simulate the submit() call using eth_call to get revert reason
import { JsonRpcProvider, Wallet, Contract } from "ethers";

const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai";
const FLOW_ADDRESS = "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";
const PRIVATE_KEY = process.env.OG_PRIVATE_KEY;

const FLOW_ABI = [
  "function submit(tuple(uint256 length, bytes tags, tuple(bytes32 root, uint256 height)[] nodes) submission) payable returns (uint256, bytes32, uint256, uint256)",
  "function market() view returns (address)",
  "function paused() view returns (bool)",
];

const MARKET_ABI = [
  "function pricePerSector() view returns (uint256)",
];

const provider = new JsonRpcProvider(OG_EVM_RPC);
const signer = new Wallet(PRIVATE_KEY, provider);
const flow = new Contract(FLOW_ADDRESS, FLOW_ABI, signer);

// Check if paused
try {
  const paused = await flow.paused();
  console.log("Contract paused:", paused);
} catch(e) {
  console.log("paused() failed:", e.message);
}

// Check market
const marketAddr = await flow.market();
console.log("Market address:", marketAddr);
const market = new Contract(marketAddr, MARKET_ABI, provider);
const pricePerSector = await market.pricePerSector();
console.log("Price per sector:", pricePerSector.toString());

// Build the submission for a 262144-byte file
// 1024 chunks, merkle tree height = 10
// Use a known root hash
import { MemData } from "@0glabs/0g-ts-sdk";
import { XMLHttpRequest as XHR } from "xmlhttprequest";
globalThis.XMLHttpRequest = XHR;

const raw = Buffer.from("A".repeat(100), "utf-8");
const padded = Buffer.concat([raw, Buffer.alloc(262144 - raw.length)]);
const file = new MemData(padded);
const [tree, err] = await file.merkleTree();
if (err) { console.error(err); process.exit(1); }
const rootHash = tree.rootHash();
console.log("Root hash:", rootHash);

// Try static call
const submission = {
  length: 262144n,
  tags: "0x",
  nodes: [{ root: rootHash, height: 10n }],
};

const sectors = 1n << 10n;  // 1024
const fee = sectors * pricePerSector;
console.log("Fee:", fee.toString());

try {
  const result = await flow.submit.staticCall(submission, { value: fee });
  console.log("Static call succeeded:", result);
} catch(e) {
  console.error("Static call failed:", e.message?.slice(0, 300));
  if (e.data) console.error("Revert data:", e.data);
}

// Try with different tags
try {
  const submission2 = { ...submission, tags: "0x0000000000000000000000000000000000000000000000000000000000000000" };
  const result2 = await flow.submit.staticCall(submission2, { value: fee });
  console.log("Static call with bytes32 tag succeeded:", result2);
} catch(e) {
  console.error("Static call with bytes32 tag failed:", e.message?.slice(0, 200));
}
