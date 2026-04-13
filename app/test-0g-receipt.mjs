// Check the reverted tx receipt to understand what happened
import { JsonRpcProvider } from "ethers";

const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai";
const TX_HASH = "0x294116b657a7df03167f4b400ca97285760889fd3699a4bf41fb4d796c3b6504";

const provider = new JsonRpcProvider(OG_EVM_RPC);
const receipt = await provider.getTransactionReceipt(TX_HASH);
console.log("Receipt:", JSON.stringify(receipt, null, 2));

// Check block for context
const tx = await provider.getTransaction(TX_HASH);
console.log("Gas limit:", tx?.gasLimit.toString());
console.log("Gas used:", receipt?.gasUsed.toString());

// Try eth_call with trace
try {
  const trace = await provider.send("debug_traceTransaction", [TX_HASH, { tracer: "callTracer" }]);
  console.log("Trace:", JSON.stringify(trace, null, 2));
} catch(e) {
  console.log("debug_traceTransaction not supported:", e.message?.slice(0, 100));
}

// Check if contract has any specific function for validation
const FLOW_ABI = [
  "function first() view returns (uint256)",
  "function numSubmissions() view returns (uint256)",
  "function getContext() view returns (tuple(bytes32 flowRoot, uint256 flowLength, bytes32 blockDigest, bytes32 digest, uint256 numEntries, uint256 mineStart))",
];
const { Contract } = await import("ethers");
const flow = new Contract("0x22E03a6A89B950F1c82ec5e74F8eCa321a105296", FLOW_ABI, provider);

try { console.log("numSubmissions:", (await flow.numSubmissions()).toString()); } catch(e) { console.log("numSubmissions failed:", e.message.slice(0,50)); }
try { console.log("first:", (await flow.first()).toString()); } catch(e) { console.log("first() failed:", e.message.slice(0,50)); }
try { console.log("context:", await flow.getContext()); } catch(e) { console.log("getContext failed:", e.message.slice(0,50)); }
