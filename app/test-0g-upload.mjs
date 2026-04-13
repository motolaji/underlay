// Quick test: upload a 262144-byte file to 0G Storage
// Usage: node test-0g-upload.mjs
import { XMLHttpRequest as XHR } from "xmlhttprequest";
globalThis.XMLHttpRequest = XHR;

import { MemData, Indexer } from "@0glabs/0g-ts-sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai";
const OG_INDEXER_RPC = "https://indexer-storage-testnet-turbo.0g.ai";
const PRIVATE_KEY = process.env.OG_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("Set OG_PRIVATE_KEY env var");
  process.exit(1);
}

const MIN_SEGMENT_SIZE = 262144;
const raw = Buffer.from(JSON.stringify({ test: "hello 0G", ts: new Date().toISOString() }, null, 2), "utf-8");
const padded = raw.length < MIN_SEGMENT_SIZE
  ? Buffer.concat([raw, Buffer.alloc(MIN_SEGMENT_SIZE - raw.length)])
  : raw;

console.log("Padded size:", padded.length);

const file = new MemData(padded);
const [tree, treeError] = await file.merkleTree();

if (treeError || !tree) {
  console.error("Merkle tree failed:", treeError);
  process.exit(1);
}

console.log("Merkle root:", tree.rootHash());

const provider = new JsonRpcProvider(OG_EVM_RPC);
const signer = new Wallet(PRIVATE_KEY, provider);
const indexer = new Indexer(OG_INDEXER_RPC);

console.log("Uploading...");
const [result, err] = await indexer.upload(file, OG_EVM_RPC, signer);
console.log("Result:", result);
console.log("Error:", err);

const isRealError = err && (typeof err === "string" || Object.keys(err).length > 0);
if (isRealError) {
  console.error("UPLOAD FAILED:", err);
  process.exit(1);
} else {
  console.log("SUCCESS! Root hash:", tree.rootHash());
}
