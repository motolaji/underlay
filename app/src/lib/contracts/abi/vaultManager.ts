export const vaultManagerAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "getVaultState",
    inputs: [],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "vault", type: "address" },
          { name: "totalAssets", type: "uint256" },
          { name: "totalSupply", type: "uint256" },
          { name: "reserveAssets", type: "uint256" },
          { name: "aaveDeployedAssets", type: "uint256" },
          { name: "openLiability", type: "uint256" },
          { name: "availableLiability", type: "uint256" },
          { name: "sharePriceE18", type: "uint256" },
          { name: "utilizationBps", type: "uint256" },
          { name: "active", type: "bool" },
          { name: "withdrawalsBlocked", type: "bool" },
          { name: "aaveEnabled", type: "bool" },
        ],
      },
    ],
  },
] as const;
