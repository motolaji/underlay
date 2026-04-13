// Decode the Submit event properly using the correct ABI
import { JsonRpcProvider, Contract, id, AbiCoder } from "ethers";

const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai";
const FLOW_ADDRESS = "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";

const provider = new JsonRpcProvider(OG_EVM_RPC);
const latest = await provider.getBlockNumber();

// Get the correct event topic from the actual ABI
const FLOW_ABI = [
  "event Submit(address indexed sender, uint256 indexed submissionIndex, uint256 startPos, uint256 length, tuple(uint256 length, bytes tags, tuple(bytes32 root, uint256 height)[] nodes) submission)",
];
const iface = new Contract(FLOW_ADDRESS, FLOW_ABI, provider).interface;
const submitEvent = iface.getEvent("Submit");
console.log("Expected Submit topic:", submitEvent?.topicHash);

// Get all events
const logs = await provider.getLogs({
  address: FLOW_ADDRESS,
  fromBlock: latest - 500,
  toBlock: latest,
});
console.log(`Found ${logs.length} events in last 500 blocks`);

for (const log of logs.slice(-5)) {
  console.log("Event topic:", log.topics[0]);
  // Try to parse as Submit
  try {
    const decoded = iface.parseLog(log);
    console.log("  => Submit:", decoded?.name);
    if (decoded) {
      console.log("  length:", decoded.args[3]?.toString());
      const sub = decoded.args[4];
      console.log("  sub.length:", sub?.length?.toString());
      console.log("  nodes:", sub?.nodes?.length);
      if (sub?.nodes?.length > 0) {
        console.log("  first node height:", sub.nodes[0].height?.toString());
      }
    }
  } catch(e) {}
}

// Let's look at the actual event ABI from the SDK
import { FixedPriceFlow__factory } from "@0glabs/0g-ts-sdk/lib.esm/contracts/flow/index.js";
const factory = FixedPriceFlow__factory;
console.log("\nFactory interface events:");
const sdkIface = factory.createInterface();
// List events
for (const [, event] of Object.entries(sdkIface.fragments || {})) {
  if (event?.type === "event") {
    console.log(" ", event.format(), "=>", sdkIface.getEvent(event.name)?.topicHash);
  }
}
