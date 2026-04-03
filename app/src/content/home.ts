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
  deck: "Underlay is an onchain risk vault. Bettors combine Polymarket outcomes into a single position. LPs collectively underwrite the risk and earn yield when the house wins.",
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
    value: `${Math.floor(DELAY_CONFIG.highDelaySeconds / 3600)}h`,
    source: "configured",
  },
];

export const audienceSplit = [
  {
    role: "Bettors",
    headline: "Build a multi-leg position",
    body: "Select outcomes across Polymarket markets and combine them into a single position. Your odds multiply across legs. Underlay prices the combined risk and underwrites the payout.",
    cta: { label: "Browse Markets", href: "/app" },
  },
  {
    role: "LPs",
    headline: "Earn yield as the house",
    body: "Deposit USDC into the vault. When bettors lose, stakes sweep into the vault and your share price appreciates. When bettors win, the reserve pays out. Idle capital routes to Aave.",
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
    body: "0G Compute verifies the risk score and 0G Storage pins the audit receipt. The AI doesn't brand the product — it prices the position.",
  },
  {
    title: "Delayed settlement by design",
    body: "Chainlink CRE enforces risk-tier delay windows before reserve payout or stake sweep. High-risk positions wait 24h. It is a feature, not a bug.",
  },
];

export const howItWorksSteps = [
  {
    title: "Signal intake",
    body: "Reference probabilities and resolution signals enter from Polymarket's Gamma API. Underlay does not run the market.",
  },
  {
    title: "Risk inference",
    body: "0G Compute scores the combined position. 0G Storage pins the audit payload to the underwriting decision.",
  },
  {
    title: "Vault pricing",
    body: "Vault utilisation, AI correlation factor, and config caps shape the final quote and payout ceiling.",
  },
  {
    title: "Delayed settlement",
    body: "Chainlink CRE respects risk-tier delay windows before reserve payout or stake sweep finalises onchain.",
  },
];

export const infrastructureItems = [...INFRASTRUCTURE_ITEMS];
