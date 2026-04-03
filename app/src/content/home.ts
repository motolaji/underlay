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
  headline: "The onchain underwriting desk for multi-outcome positions.",
  deck: "Underlay is the vault layer behind a position, not the market itself. It prices risk, gates high-stakes flow, records audit receipts, and settles with delay-aware orchestration.",
  primaryCta: { label: "Explore Live Markets", href: "#market-browser" },
  secondaryCta: { label: "See How Underlay Works", href: "#how-it-works" },
};

export const protocolMetrics: ProtocolMetric[] = [
  {
    label: "Testnet Max TVL",
    value: formatUsdc(TESTNET_VAULT_CONFIG.maxTVLRaw),
    source: "configured",
  },
  {
    label: "Reserve Split",
    value: formatBps(TESTNET_VAULT_CONFIG.reserveBps),
    source: "configured",
    tone: "accent",
  },
  {
    label: "Max Liability",
    value: formatBps(TESTNET_VAULT_CONFIG.maxLiabilityBps),
    source: "configured",
  },
  {
    label: "Max Payout",
    value: formatUsdc(TESTNET_VAULT_CONFIG.maxPayoutRaw),
    source: "configured",
  },
  {
    label: "World ID Gate",
    value: formatUsdc(TESTNET_VAULT_CONFIG.worldIdGateRaw),
    source: "configured",
    tone: "warning",
  },
  {
    label: "High Risk Delay",
    value: `${Math.floor(DELAY_CONFIG.highDelaySeconds / 3600)}h`,
    source: "configured",
  },
];

export const howItWorksSteps = [
  {
    title: "Polymarket signal",
    body: "Reference probabilities and resolution signals enter from the Gamma API, not from a market built by Underlay.",
  },
  {
    title: "AI score",
    body: "0G Compute produces a verifiable risk assessment and 0G Storage keeps the audit payload tied to the position.",
  },
  {
    title: "Vault pricing",
    body: "The vault prices the position with its own formula, caps payout, and enforces reserve-aware liability limits.",
  },
  {
    title: "Delay-aware settlement",
    body: "Chainlink CRE respects risk-tier delay windows before payout or stake sweep is finalized.",
  },
];

export const riskControlItems = [
  {
    title: "Config-driven caps",
    body: "All dollar-value controls live in VaultConfig so testnet and mainnet differ only by deployment config.",
  },
  {
    title: "Fixed reserve policy",
    body: "The protocol keeps 20% active reserve and can route 80% of idle capital into Aave for base yield.",
  },
  {
    title: "World ID gating",
    body: "High-stakes flow stays frictionless until stake crosses the configured threshold, then sybil resistance becomes mandatory.",
  },
  {
    title: "Audit-first workflow",
    body: "Positions carry an audit receipt hash so risk decisions can be reconstructed without relying on a traditional database.",
  },
];

export const capabilityRail = [...PROTOCOL_CAPABILITY_RAIL];
export const infrastructureItems = [...INFRASTRUCTURE_ITEMS];
