export const positionBookAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "getPositionsByOwner",
    inputs: [
      { name: "owner", type: "address" },
      { name: "cursor", type: "uint256" },
      { name: "size", type: "uint256" },
    ],
    outputs: [
      { name: "ids", type: "bytes32[]" },
      { name: "nextCursor", type: "uint256" },
      { name: "hasMore", type: "bool" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getPosition",
    inputs: [{ name: "positionId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "bytes32" },
          { name: "bettor", type: "address" },
          { name: "vault", type: "address" },
          { name: "stake", type: "uint256" },
          { name: "potentialPayout", type: "uint256" },
          { name: "combinedOdds", type: "uint64" },
          { name: "riskTier", type: "uint8" },
          { name: "riskAuditHash", type: "bytes32" },
          { name: "placedAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "legsWon", type: "uint8" },
          { name: "legsTotal", type: "uint8" },
          { name: "worldIdVerified", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getPositionLegs",
    inputs: [{ name: "positionId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "marketId", type: "bytes32" },
          { name: "outcome", type: "uint8" },
          { name: "lockedOdds", type: "uint64" },
          { name: "resolutionTime", type: "uint64" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
] as const;
