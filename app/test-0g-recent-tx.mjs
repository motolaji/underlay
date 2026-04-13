// Find recent successful submit txs to understand the working format
import { JsonRpcProvider } from "ethers";

const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai";
const FLOW_ADDRESS = "0x22e03a6a89b950f1c82ec5e74f8eca321a105296";

const provider = new JsonRpcProvider(OG_EVM_RPC);
const latest = await provider.getBlockNumber();

// Scan recent blocks for txs to the flow contract
let foundTxs = [];
for (let b = latest; b >= latest - 50 && foundTxs.length < 3; b--) {
  const block = await provider.getBlock(b, true);
  if (!block?.prefetchedTransactions) continue;
  for (const tx of block.prefetchedTransactions) {
    if (tx.to?.toLowerCase() === FLOW_ADDRESS) {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      const success = receipt?.status === 1;
      console.log(`Block ${b}: ${tx.hash.slice(0,12)}... status=${receipt?.status} data=${tx.data.slice(0,10)}`);
      if (success) {
        foundTxs.push(tx);
        console.log("  => SUCCESS! Full calldata:", tx.data.slice(0, 400));
        console.log("  => value:", tx.value?.toString());
      }
    }
  }
}

if (foundTxs.length === 0) {
  console.log("No successful txs found in last 50 blocks. Checking last 200...");
  // Try eth_getLogs for any Submit events
  const logs = await provider.getLogs({
    address: FLOW_ADDRESS,
    fromBlock: latest - 200,
    toBlock: latest,
  });
  console.log("Events:", logs.length);
  for (const log of logs) {
    // Get the tx
    const tx = await provider.getTransaction(log.transactionHash);
    console.log("Tx from log:", log.transactionHash.slice(0,12), "data:", tx?.data.slice(0, 100));
    console.log("Value:", tx?.value?.toString());
  }
}
