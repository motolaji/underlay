import { AppShell } from "@/components/shell/AppShell";
import { SectionMasthead } from "@/components/common/SectionMasthead";
import { InfrastructureRail } from "@/components/home/InfrastructureRail";
import { infrastructureItems } from "@/content/home";
import { POSITION_RULES, TESTNET_VAULT_CONFIG } from "@/lib/constants";
import { formatBps, formatUsdc } from "@/lib/format";

const configRows = [
  ["Max TVL", formatUsdc(TESTNET_VAULT_CONFIG.maxTVLRaw)],
  ["Min activation", formatUsdc(TESTNET_VAULT_CONFIG.minActivationRaw)],
  ["Max liability", formatBps(TESTNET_VAULT_CONFIG.maxLiabilityBps)],
  ["Reserve split", formatBps(TESTNET_VAULT_CONFIG.reserveBps)],
  ["Max payout", formatUsdc(TESTNET_VAULT_CONFIG.maxPayoutRaw)],
  ["Max stake", formatUsdc(TESTNET_VAULT_CONFIG.maxStakeRaw)],
  ["World ID gate", formatUsdc(TESTNET_VAULT_CONFIG.worldIdGateRaw)],
  [
    "Leg rules",
    `${POSITION_RULES.minLegsPerPosition}-${POSITION_RULES.maxLegsPerPosition} outcomes`,
  ],
] as const;

export default function ProtocolPage() {
  return (
    <AppShell>
      <section className="section-shell pt-4 space-y-8">
        <SectionMasthead
          eyebrow="Mechanics"
          title="Underlay is easier to trust when the machinery stays visible."
          body="This page exists for judges, builders, and first-time users who need a fast walkthrough of how pricing, reserve policy, identity gating, and settlement fit together."
        />

        <div className="paper-panel overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="data-label">What Underlay is</p>
              <p className="mt-4 text-base leading-8 text-[color:var(--ink)]">
                The vault and settlement infrastructure that underwrites a
                position after outcomes are selected.
              </p>
            </div>
            <div>
              <p className="data-label">What Underlay is not</p>
              <p className="mt-4 text-base leading-8 text-[color:var(--ink)]">
                Not a prediction market, not a parlay exchange, and not a
                database-backed offchain bookmaker.
              </p>
            </div>
          </div>
        </div>

        <div className="paper-panel p-6 sm:p-8">
          <p className="data-label">Vault config</p>
          <div className="mt-6 divide-y divide-[color:var(--border)]">
            {configRows.map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  {label}
                </p>
                <p className="tabular text-base text-[color:var(--ink)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <InfrastructureRail items={infrastructureItems} />
      </section>
    </AppShell>
  );
}
