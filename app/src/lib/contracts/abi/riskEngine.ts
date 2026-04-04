export const riskEngineAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "requiresWorldId",
    inputs: [{ name: "stake", type: "uint256" }],
    outputs: [{ name: "required", type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "submitPosition",
    inputs: [
      { name: "marketIds", type: "bytes32[]" },
      { name: "outcomes", type: "uint8[]" },
      { name: "lockedOdds", type: "uint64[]" },
      { name: "resolutionTimes", type: "uint64[]" },
      { name: "stake", type: "uint256" },
      { name: "combinedOdds", type: "uint64" },
      { name: "riskTier", type: "uint8" },
      { name: "riskAuditHash", type: "bytes32" },
      { name: "aiStakeLimit", type: "uint256" },
      { name: "root", type: "uint256" },
      { name: "nullifierHash", type: "uint256" },
      { name: "proof", type: "uint256[8]" },
    ],
    outputs: [{ name: "positionId", type: "bytes32" }],
  },
] as const;
