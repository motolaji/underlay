import { AppShell } from "@/components/shell/AppShell";
import { SectionMasthead } from "@/components/common/SectionMasthead";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatBps, formatUsdc } from "@/lib/format";
import { TESTNET_VAULT_CONFIG } from "@/lib/constants";

export default function LpPage() {
  return (
    <AppShell>
      <section className="section-shell pt-4">
        <div className="paper-panel p-8 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label="ERC-4626" tone="accent" />
            <StatusBadge label="80/20 reserve model" tone="warning" />
          </div>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <SectionMasthead
              eyebrow="LP vault"
              title="Fund the underwriting desk, not a generic yield dashboard."
              body="This page establishes the LP story before contract writes are live: reserve posture, configured guardrails, and the share-price mental model behind the ERC-4626 vault."
            />
            <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.4)] p-6">
              <p className="data-label">Configured posture</p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-[color:var(--ink)]">
                <p>
                  Reserve ratio: {formatBps(TESTNET_VAULT_CONFIG.reserveBps)}
                </p>
                <p>
                  Max liability:{" "}
                  {formatBps(TESTNET_VAULT_CONFIG.maxLiabilityBps)}
                </p>
                <p>
                  Max payout: {formatUsdc(TESTNET_VAULT_CONFIG.maxPayoutRaw)}
                </p>
                <p>
                  Min activation:{" "}
                  {formatUsdc(TESTNET_VAULT_CONFIG.minActivationRaw)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell grid gap-6 lg:grid-cols-3">
        <article className="paper-panel p-6 lg:col-span-2">
          <p className="data-label">Capital at work</p>
          <div className="mt-6 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.45)]">
            <div className="flex h-6 w-full">
              <div className="h-full w-[20%] bg-[color:var(--amber)]" />
              <div className="h-full w-[80%] bg-[color:var(--teal)]" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-[color:var(--muted)]">
            <span>20% active reserve for payouts</span>
            <span>80% idle capital available for Aave routing</span>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-7">
            The live deposit, withdraw, and share accounting flows are deferred
            until the ERC-4626 contract exists. The layout is ready for reserve
            health, share price, pending withdrawals, and utilization-aware
            messaging.
          </p>
        </article>
        <article className="paper-panel p-6">
          <p className="data-label">What changes share value</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--ink)]">
            <li>
              - Bettors lose: stake sweeps into the vault and share price
              appreciates.
            </li>
            <li>
              - Bettors win: reserve pays out and share price drops
              proportionally.
            </li>
            <li>
              - Aave yield: idle capital increases total assets over time.
            </li>
          </ul>
        </article>
      </section>
    </AppShell>
  );
}
