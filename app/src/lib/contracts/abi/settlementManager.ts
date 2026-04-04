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
] as const;
