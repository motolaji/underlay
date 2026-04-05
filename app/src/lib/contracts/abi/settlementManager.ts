export const settlementManagerAbi = [
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
  {
    type: "event",
    name: "SettlementExecuted",
    inputs: [
      { name: "positionId", type: "bytes32", indexed: true },
      { name: "payout", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;
