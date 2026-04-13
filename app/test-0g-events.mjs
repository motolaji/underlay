// Check recent successful Submit events to understand working parameters
import { JsonRpcProvider, Contract } from "ethers";

const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai";
const FLOW_ADDRESS = "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";

const provider = new JsonRpcProvider(OG_EVM_RPC);

// Get recent blocks
const latest = await provider.getBlockNumber();
console.log("Latest block:", latest);

// Submit event topic
// event Submit(address indexed sender, uint256 indexed submissionIndex, uint256 startPos, uint256 length, Submission submission)
const SUBMIT_TOPIC = "0x167dc6d6f0a4c82f84d85cde8f4e0fbf72da2c78bdc3d2b69e7640d9ad2c3e62";

// Scan last 100 blocks for Submit events
const logs = await provider.getLogs({
  address: FLOW_ADDRESS,
  fromBlock: latest - 100,
  toBlock: latest,
});

console.log(`Found ${logs.length} logs in last 100 blocks`);

if (logs.length > 0) {
  const FLOW_ABI = [
    "event Submit(address indexed sender, uint256 indexed submissionIndex, uint256 startPos, uint256 length, tuple(uint256 length, bytes tags, tuple(bytes32 root, uint256 height)[] nodes) submission)",
  ];
  const iface = new Contract(FLOW_ADDRESS, FLOW_ABI, provider).interface;

  for (const log of logs.slice(-3)) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "Submit") {
        console.log("\nSubmit event:");
        console.log("  submissionIndex:", parsed.args[1].toString());
        console.log("  startPos:", parsed.args[2].toString());
        console.log("  length:", parsed.args[3].toString());
        const sub = parsed.args[4];
        console.log("  submission.length:", sub.length.toString());
        console.log("  submission.tags:", sub.tags);
        console.log("  submission.nodes count:", sub.nodes.length);
        for (const node of sub.nodes) {
          console.log("    node root:", node.root, "height:", node.height.toString());
        }
      } else {
        console.log("Other event:", parsed?.name, log.topics[0]);
      }
    } catch(e) {
      console.log("Log parse failed:", log.topics[0].slice(0, 20));
    }
  }
}

// Also try to find a recent successful submit tx
const block = await provider.getBlock(latest - 5, true);
if (block?.prefetchedTransactions) {
  for (const tx of block.prefetchedTransactions.slice(0, 5)) {
    if (tx.to?.toLowerCase() === FLOW_ADDRESS.toLowerCase()) {
      console.log("\nRecent tx to flow:", tx.hash, "data prefix:", tx.data.slice(0, 10));
    }
  }
}
