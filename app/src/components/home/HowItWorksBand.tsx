const PARTNER_STYLE: Record<string, string> = {
  "Polymarket CLOB":      "border-[#0EA5E9] text-[#38BDF8]  bg-[#071520]",
  "0G Compute":           "border-[#7C3AED] text-[#A78BFA]  bg-[#130D1E]",
  "0G Storage":           "border-[#7C3AED] text-[#A78BFA]  bg-[#130D1E]",
  "World ID":             "border-[#6B7280] text-[#D1D5DB]  bg-[#111111]",
  "Base Sepolia":         "border-[#2563EB] text-[#93C5FD]  bg-[#071020]",
  "Chainlink CRE":        "border-[#375BD2] text-[#6B9EFF]  bg-[#0D1628]",
  "Chainlink Price Feeds":"border-[#375BD2] text-[#6B9EFF]  bg-[#0D1628]",
};

type Step = {
  step: string;
  title: string;
  body: string;
  partners: string[];
  conditional?: string;
};

type HowItWorksBandProps = {
  steps: Step[];
};

export function HowItWorksBand({ steps }: HowItWorksBandProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <div key={step.step} className="relative">
          {/* Connector line between cards */}
          {index < steps.length - 1 && (
            <div className="absolute bottom-0 left-[2.35rem] top-full z-10 flex flex-col items-center sm:left-[2.6rem]">
              <div className="w-px flex-1 bg-[color:var(--border-subtle)]" style={{ minHeight: 1 }} />
            </div>
          )}

          <article className="flex gap-4 border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5 transition-colors hover:bg-[color:var(--bg-canvas)] sm:gap-6 sm:p-6"
            style={{ marginTop: index === 0 ? 0 : -1 }}
          >
            {/* Step number + connector */}
            <div className="flex flex-col items-center gap-2 pt-0.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-canvas)]">
                <span className="font-mono text-[9px] text-[color:var(--text-tertiary)]">
                  {step.step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-px flex-1 bg-[color:var(--border-subtle)]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-1">
              {/* Conditional tag */}
              {step.conditional && (
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-[2px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-canvas)] px-2 py-0.5">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
                    conditional
                  </span>
                  <span className="font-mono text-[9px] text-[color:var(--risk-medium)]">
                    {step.conditional}
                  </span>
                </div>
              )}

              {/* Title + badges row */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
                  {step.title}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {step.partners.map((p) => (
                    <span
                      key={p}
                      className={`inline-flex items-center rounded-[2px] border px-2 py-[3px] font-mono text-[9px] uppercase tracking-widest ${PARTNER_STYLE[p] ?? "border-[color:var(--border-subtle)] text-[color:var(--text-tertiary)]"}`}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <p className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">
                {step.body}
              </p>
            </div>
          </article>
        </div>
      ))}

      {/* Outcome row */}
      <div className="mt-0 grid grid-cols-2 gap-px border border-t-0 border-[color:var(--border-subtle)]">
        <div className="flex items-center gap-3 bg-[color:var(--bg-surface)] px-5 py-4">
          <div className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--data-positive)]" />
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--data-positive)]">
              All legs win
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-[color:var(--text-secondary)]">
              Reserve pays out stake × combined odds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-l border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-5 py-4">
          <div className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--data-negative)]" />
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--data-negative)]">
              Any leg loses
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-[color:var(--text-secondary)]">
              Stake sweeps into vault as LP yield
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
