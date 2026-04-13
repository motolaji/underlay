import { formatBps, formatUsdc } from "@/lib/format";
import {
  DELAY_CONFIG,
  INFRASTRUCTURE_ITEMS,
  PROTOCOL_CAPABILITY_RAIL,
  TESTNET_VAULT_CONFIG,
} from "@/lib/constants";
import type { ProtocolMetric } from "@/types/view-model";

export const heroContent = {
  eyebrow: "Community-Owned Risk Infrastructure",
  headline: "The house behind your multi-outcome position.",
  deck: "Underlay helps you bundle prediction market outcomes into one trade. Traders get a simpler way to take a position, and people who fund the pool can earn from the risk they back.",
  supporting: "Built on Polymarket interaction, Underlay helps you move from a single trade to something broader and easier to manage.",
  primaryCta: { label: "Open App", href: "/app" },
  secondaryCta: { label: "Read Mechanics", href: "/protocol" },
};

export const capabilityRail = [...PROTOCOL_CAPABILITY_RAIL];

export const protocolMetrics: ProtocolMetric[] = [
  {
    label: "Max testnet TVL",
    value: formatUsdc(TESTNET_VAULT_CONFIG.maxTVLRaw),
    source: "configured",
  },
  {
    label: "Reserve ratio",
    value: formatBps(TESTNET_VAULT_CONFIG.reserveBps),
    source: "configured",
    tone: "accent",
  },
  {
    label: "Max liability",
    value: formatBps(TESTNET_VAULT_CONFIG.maxLiabilityBps),
    source: "configured",
  },
  {
    label: "Max payout",
    value: formatUsdc(TESTNET_VAULT_CONFIG.maxPayoutRaw),
    source: "configured",
  },
  {
    label: "World ID gate",
    value: formatUsdc(TESTNET_VAULT_CONFIG.worldIdGateRaw),
    source: "configured",
    tone: "warning",
  },
  {
    label: "High-risk delay",
    value: `${DELAY_CONFIG.highDelaySeconds}s`,
    source: "configured",
  },
];

export const audienceSplit = [
  {
    role: "Traders",
    headline: "Build a multi-leg position",
    body: "Select outcomes across Polymarket markets and combine them into a single position. Your odds multiply across legs. Underlay prices the combined risk and underwrites the payout.",
    cta: { label: "Browse Markets", href: "/app" },
  },
  {
    role: "LPs",
    headline: "Earn yield as the house",
    body: "Deposit USDC into the vault. When traders lose, stakes sweep into the vault and your share price appreciates. When traders win, the reserve pays out. Idle capital routes to Aave.",
    cta: { label: "Open LP Vault", href: "/app/lp" },
  },
];

export const homeHighlights = [
  {
    title: "Transparent risk model",
    body: "Reserve ratio, payout caps, World ID gating, and liability utilisation are all protocol config — visible onchain, not hidden in an offchain database.",
  },
  {
    title: "AI-scored, not AI-themed",
    body: "0G Compute scores the position risk via AI inference and 0G Storage pins the audit receipt. The AI doesn't brand the product — it prices the position.",
  },
  {
    title: "Delayed settlement by design",
    body: "Chainlink CRE enforces risk-tier delay windows before reserve payout or stake sweep. High-risk positions wait 2 minutes. It is a feature, not a bug.",
  },
];

export const howItWorksSteps = [
  {
    step: "01",
    title: "Market discovery",
    body: "Trader picks outcomes from live Polymarket markets. Probabilities and resolution metadata come from the CLOB API — Underlay does not run the market.",
    partners: ["Polymarket CLOB"],
  },
  {
    step: "02",
    title: "AI risk scoring",
    body: "The position is sent to a 0G Compute LLM node. It returns a risk tier, correlation score, stake limit, and reasoning flags. The full audit payload is pinned to 0G Storage — the merkle root is recorded onchain as a tamper-evident receipt.",
    partners: ["0G Compute", "0G Storage"],
  },
  {
    step: "03",
    title: "Identity gate",
    body: "Stakes above the protocol threshold require a World ID proof — verified onchain via the nullifier hash. One proof per action, replay-resistant. Prevents Sybil attacks on the reserve.",
    partners: ["World ID"],
    conditional: "stake > $5",
  },
  {
    step: "04",
    title: "Position locked onchain",
    body: "Stake transfers into the ERC-4626 vault. Legs are written to PositionBook and a risk-tier settlement timer starts in SettlementManager. Nothing else is required from the trader.",
    partners: ["Base Sepolia"],
  },
  {
    step: "05",
    title: "Chainlink CRE resolves legs",
    body: "The CRE workflow runs every minute on Chainlink's DON. It reads open legs from PositionBook, queries Polymarket CLOB for resolution, and cross-references crypto legs against Chainlink Price Feeds. Resolved legs are committed onchain via resolveLegs().",
    partners: ["Chainlink CRE", "Chainlink Price Feeds"],
  },
  {
    step: "06",
    title: "Settlement executes",
    body: "After all legs resolve, the risk-tier delay window runs: 30 s LOW · 1 m MEDIUM · 2 m HIGH. executeSettlement() fires — winning positions are paid from vault reserves, losing stakes sweep back as LP yield.",
    partners: ["Chainlink CRE", "Base Sepolia"],
  },
];

export const infrastructureItems = [...INFRASTRUCTURE_ITEMS];
