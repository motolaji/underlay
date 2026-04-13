"use client";

type Partner = {
  label: string;
  variant: "chainlink" | "og" | "worldid" | "polymarket" | "base";
};

type Step = {
  phase: string;
  title: string;
  body: string;
  partners: Partner[];
  tag?: string;
};

const VARIANT: Record<Partner["variant"], string> = {
  chainlink: "border-[#375BD2] text-[#6B9EFF]  bg-[#0D1628]",
  og:        "border-[#7C3AED] text-[#A78BFA]  bg-[#130D1E]",
  worldid:   "border-[#6B7280] text-[#D1D5DB]  bg-[#111111]",
  polymarket:"border-[#0EA5E9] text-[#38BDF8]  bg-[#071520]",
  base:      "border-[#2563EB] text-[#93C5FD]  bg-[#071020]",
};

const STEPS: Step[] = [
  {
    phase: "01",
    title: "Market discovery",
    body: "Trader browses live Polymarket markets. Outcomes and real-time probabilities are fetched from the CLOB API.",
    partners: [{ label: "Polymarket CLOB", variant: "polymarket" }],
  },
  {
    phase: "02",
    title: "AI risk scoring",
    body: "The position payload is sent to a 0G Compute LLM node. It returns a risk tier (LOW / MEDIUM / HIGH), correlation score, stake limit, and reasoning flags. The full payload is pinned to 0G Storage and the merkle root is recorded as a tamper-evident audit receipt.",
    partners: [
      { label: "0G Compute", variant: "og" },
      { label: "0G Storage", variant: "og" },
    ],
  },
  {
    phase: "03",
    title: "Identity verification",
    body: "Stakes above the protocol threshold require a World ID proof. The onchain verifier checks the nullifier hash — one proof per action, replay-resistant.",
    partners: [{ label: "World ID", variant: "worldid" }],
    tag: "stake > $5",
  },
  {
    phase: "04",
    title: "Position locked onchain",
    body: "Stake is transferred to the vault. Legs are written to PositionBook and a risk-tier settlement timer starts in SettlementManager.",
    partners: [{ label: "Base Sepolia", variant: "base" }],
  },
  {
    phase: "05",
    title: "Chainlink CRE resolves legs",
    body: "The CRE workflow runs every minute on Chainlink's DON. It reads open legs from PositionBook, queries Polymarket CLOB for resolution, and cross-references crypto market legs against Chainlink Price Feeds. Resolved legs are committed onchain via resolveLegs().",
    partners: [
      { label: "Chainlink CRE", variant: "chainlink" },
      { label: "Chainlink Price Feeds", variant: "chainlink" },
    ],
  },
  {
    phase: "06",
    title: "Settlement delay elapses",
    body: "After all legs resolve the risk-tier delay window runs: 30 s LOW · 1 m MEDIUM · 2 m HIGH. executeSettlement() is then called by the keeper.",
    partners: [
      { label: "Chainlink CRE", variant: "chainlink" },
      { label: "Base Sepolia", variant: "base" },
    ],
  },
];

function Badge({ p }: { p: Partner }) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border px-2 py-[3px] font-mono text-[9px] uppercase tracking-widest ${VARIANT[p.variant]}`}
    >
      {p.label}
    </span>
  );
}

function Arrow({ tag }: { tag?: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="h-4 w-px bg-[color:var(--border-subtle)]" />
      {tag && (
        <div className="my-1 flex items-center gap-1.5 rounded-[2px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-canvas)] px-2.5 py-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
            conditional
          </span>
          <span className="font-mono text-[9px] text-[color:var(--risk-medium)]">
            {tag}
          </span>
        </div>
      )}
      {tag && <div className="h-4 w-px bg-[color:var(--border-subtle)]" />}
      <svg width="8" height="5" viewBox="0 0 8 5" className="shrink-0">
        <path d="M4 5L0.5 0.5H7.5L4 5Z" fill="var(--text-tertiary)" />
      </svg>
    </div>
  );
}

export function ProtocolFlowchart() {
  return (
    <div className="border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]">
      {/* Header */}
      <div className="border-b border-[color:var(--border-subtle)] px-6 py-5">
        <p className="data-label">Full stack flowchart</p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)]">
          Every partner maps to a specific step in the position lifecycle — from market discovery to settled payout.
        </p>
      </div>

      <div className="flex flex-col items-center px-4 py-8 sm:px-8">
        {/* Start pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-canvas)] px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-blue)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--text-secondary)]">
            Trader initiates
          </span>
        </div>

        {STEPS.map((step, i) => (
          <div key={step.phase} className="flex w-full max-w-lg flex-col items-center">
            <Arrow tag={step.tag} />

            {/* Step card */}
            <div className="w-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-canvas)] p-4 hover:border-[color:var(--text-tertiary)] transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
                  Step {step.phase}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {step.partners.map((p) => (
                    <Badge key={p.label} p={p} />
                  ))}
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-[color:var(--text-primary)]">
                {step.title}
              </p>
              <p className="mt-1 text-[13px] leading-[1.65] text-[color:var(--text-secondary)]">
                {step.body}
              </p>
            </div>
          </div>
        ))}

        {/* Final arrow */}
        <div className="flex flex-col items-center py-1">
          <div className="h-4 w-px bg-[color:var(--border-subtle)]" />
          <svg width="8" height="5" viewBox="0 0 8 5">
            <path d="M4 5L0.5 0.5H7.5L4 5Z" fill="var(--text-tertiary)" />
          </svg>
        </div>

        {/* Outcome split */}
        <div className="w-full max-w-lg">
          <div className="grid grid-cols-2 gap-px border border-[color:var(--border-subtle)]">
            <div className="flex flex-col gap-1.5 border-r border-[color:var(--border-subtle)] bg-[color:var(--bg-canvas)] p-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--data-positive)]" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--data-positive)]">
                  All legs win
                </span>
              </div>
              <p className="text-[12px] leading-5 text-[color:var(--text-secondary)]">
                Reserve pays out stake × combined odds
              </p>
            </div>
            <div className="flex flex-col gap-1.5 bg-[color:var(--bg-canvas)] p-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--data-negative)]" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--data-negative)]">
                  Any leg loses
                </span>
              </div>
              <p className="text-[12px] leading-5 text-[color:var(--text-secondary)]">
                Stake sweeps into vault as LP yield
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
