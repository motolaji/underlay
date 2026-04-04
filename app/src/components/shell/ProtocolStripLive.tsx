"use client";

import { ProtocolStrip } from "@/components/shell/ProtocolStrip";
import { protocolMetrics as fallbackMetrics } from "@/content/home";
import { formatBps, formatUsdc } from "@/lib/format";
import { useVaultStateQuery } from "@/hooks/queries/useVaultStateQuery";

export function ProtocolStripLive() {
  const vaultStateQuery = useVaultStateQuery();
  const state = vaultStateQuery.data as
    | {
        totalAssets?: bigint;
        reserveAssets?: bigint;
        openLiability?: bigint;
        availableLiability?: bigint;
        utilizationBps?: bigint;
      }
    | undefined;

  if (!state?.totalAssets) {
    return <ProtocolStrip metrics={fallbackMetrics} />;
  }

  const metrics = [
    {
      label: "Vault TVL",
      value: formatUsdc(state.totalAssets),
      source: "onchain" as const,
    },
    {
      label: "Reserve assets",
      value: formatUsdc(state.reserveAssets ?? 0n),
      source: "onchain" as const,
      tone: "accent" as const,
    },
    {
      label: "Open liability",
      value: formatUsdc(state.openLiability ?? 0n),
      source: "onchain" as const,
    },
    {
      label: "Available liability",
      value: formatUsdc(state.availableLiability ?? 0n),
      source: "onchain" as const,
    },
    {
      label: "Utilisation",
      value: formatBps(Number(state.utilizationBps ?? 0n)),
      source: "onchain" as const,
    },
    fallbackMetrics[4],
  ];

  return <ProtocolStrip metrics={metrics} />;
}
