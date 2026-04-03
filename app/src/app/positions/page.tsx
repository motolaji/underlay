import { AppShell } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionMasthead } from "@/components/common/SectionMasthead";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function PositionsPage() {
  return (
    <AppShell>
      <section className="section-shell pt-4">
        <div className="paper-panel p-8 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label="Settlement ledger" tone="accent" />
            <StatusBadge label="Audit-first" tone="warning" />
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <SectionMasthead
              eyebrow="Positions"
              title="Every position should read like a receipt, not a mystery."
              body="The positions experience is designed around locked quotes, per-leg resolution, settlement delay, and an audit reference that can survive without a traditional database."
            />
            <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.42)] p-6">
              <p className="data-label">Lifecycle plan</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[color:var(--ink)]">
                <li>- Draft quote lives in local client state.</li>
                <li>- Submitted position becomes canonical onchain state.</li>
                <li>- Risk receipt resolves through 0G Storage.</li>
                <li>- Settlement phase comes from SettlementManager.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <EmptyState
          title="No submitted positions yet"
          body="Once PositionBook, SettlementManager, and the risk receipt flow are live, this page will render wallet-scoped receipts, settlement timers, and audit-hash drawers without relying on a traditional database."
        />
      </section>
    </AppShell>
  );
}
