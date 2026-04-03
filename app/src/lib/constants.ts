export const TESTNET_VAULT_CONFIG = {
  maxTVLRaw: 10_000_000_000n,
  minActivationRaw: 2_000_000_000n,
  maxLiabilityBps: 4_000,
  reserveBps: 2_000,
  maxPayoutRaw: 100_000_000n,
  maxStakeRaw: 5_000_000n,
  worldIdGateRaw: 2_000_000n,
} as const;

export const POSITION_RULES = {
  minLegsPerPosition: 1,
  maxLegsPerPosition: 10,
} as const;

export const DELAY_CONFIG = {
  lowDelaySeconds: 900,
  mediumDelaySeconds: 3_600,
  highDelaySeconds: 86_400,
} as const;

export const PROTOCOL_CAPABILITY_RAIL = [
  "ERC-4626 Vault",
  "AI-Scored",
  "World ID Gated",
  "0G Audited",
  "CRE Settled",
  "Aave Yield-Backed",
  "USDC Native",
] as const;

export const INFRASTRUCTURE_ITEMS = [
  {
    name: "Polymarket Gamma API",
    role: "Reference signal and resolution source",
  },
  { name: "0G Compute", role: "Verifiable inference for risk scoring" },
  { name: "0G Storage", role: "Immutable risk and audit receipts" },
  { name: "World ID", role: "Sybil resistance above the stake gate" },
  { name: "Chainlink CRE", role: "Settlement orchestration and delay flow" },
  { name: "Aave V3", role: "Yield routing for idle vault capital" },
  { name: "Reown AppKit", role: "Wallet connection through wagmi and viem" },
] as const;
