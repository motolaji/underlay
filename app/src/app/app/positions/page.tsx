import { EmptyState } from "@/components/common/EmptyState";

const columns = ["State", "Legs", "Stake", "Payout", "Settlement", "Receipt"];

const statusLegend = [
  { icon: "⏳", label: "Pending", desc: "Awaiting resolution data" },
  { icon: "✅", label: "Confirmed", desc: "Verification complete, payout queued" },
  { icon: "❌", label: "Lost", desc: "Position resolved against bettor" },
  { icon: "⚪", label: "Voided", desc: "Position cancelled, stake returned" },
];

export default function AppPositionsPage() {
  return (
    <div className="section-shell py-6 space-y-6">
      {/* Page header */}
      <div>
        <p className="eyebrow mb-2">Settlement Ledger</p>
        <h1
          className="text-3xl text-[color:var(--text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Positions
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-7">
          Every submitted position shows lock state, per-leg status, settlement countdown, and audit receipt reference.
        </p>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-4 border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-4 py-3">
        {statusLegend.map(({ icon, label, desc }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-sm">{icon}</span>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-primary)]">
                {label}
              </span>
              <span className="ml-2 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                — {desc}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-[color:var(--border-subtle)]">
        <div className="grid grid-cols-2 gap-4 border-b border-[color:var(--border-subtle)] px-4 py-3 md:grid-cols-6">
          {columns.map((col) => (
            <div
              key={col}
              className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)]"
            >
              {col}
            </div>
          ))}
        </div>

        <div className="p-6">
          <EmptyState
            title="No positions yet"
            body="Submitted positions appear here once PositionBook and SettlementManager contracts are live. Each row shows settlement countdown, per-leg resolution, and audit receipt hash."
          />
        </div>
      </div>
    </div>
  );
}
