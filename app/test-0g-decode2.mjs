// Check Submit event topic from SDK ABI
import { JsonRpcProvider, Contract, id } from "ethers";
import { XMLHttpRequest as XHR } from "xmlhttprequest";
globalThis.XMLHttpRequest = XHR;

const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai";
const FLOW_ADDRESS = "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";

// Compute expected topic hash manually
const submitSig = "Submit(address,uint256,uint256,uint256,(uint256,bytes,(bytes32,uint256)[]))";
const expectedTopic = id(submitSig);
console.log("Submit topic hash:", expectedTopic);

const provider = new JsonRpcProvider(OG_EVM_RPC);
const latest = await provider.getBlockNumber();
const logs = await provider.getLogs({
  address: FLOW_ADDRESS,
  fromBlock: latest - 200,
  toBlock: latest,
});

console.log(`Found ${logs.length} logs`);
for (const log of logs) {
  console.log("topic0:", log.topics[0]);
}

// If we found the right topic, decode it
if (logs.length > 0 && logs[0].topics[0] === expectedTopic) {
  console.log("Topic matches!");
}

// Let's look at what the actual topic is for Submit in a recent known-working tx
// Try the 0G explorer API
try {
  const resp = await fetch(`https://chainscan-galileo.0g.ai/api?module=account&action=txlist&address=${FLOW_ADDRESS}&startblock=${latest - 200}&endblock=${latest}&sort=desc&limit=5`);
  const data = await resp.text();
  console.log("\n0G API response:", data.slice(0, 500));
} catch(e) {
  console.log("0G API failed:", e.message);
}
