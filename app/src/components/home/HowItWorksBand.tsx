type HowItWorksBandProps = {
  steps: Array<{ title: string; body: string }>;
};

export function HowItWorksBand({ steps }: HowItWorksBandProps) {
  return (
    <div className="grid gap-px border border-[color:var(--border-subtle)] xl:grid-cols-4">
      {steps.map((step, index) => (
        <article
          key={step.title}
          className="bg-[color:var(--bg-surface)] p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)]">
            0{index + 1}
          </p>
          <h3 className="mt-4 text-xl text-[color:var(--text-primary)]">
            {step.title}
          </h3>
          <p className="mt-3 text-sm leading-7">{step.body}</p>
        </article>
      ))}
    </div>
  );
}
