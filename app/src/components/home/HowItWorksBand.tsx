type HowItWorksBandProps = {
  steps: Array<{ title: string; body: string }>;
};

export function HowItWorksBand({ steps }: HowItWorksBandProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {steps.map((step, index) => (
        <article
          key={step.title}
          className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.4)] p-5"
        >
          <p className="data-label">Step 0{index + 1}</p>
          <h3 className="mt-4 text-2xl text-[color:var(--ink)]">
            {step.title}
          </h3>
          <p className="mt-3 text-sm leading-7">{step.body}</p>
        </article>
      ))}
    </div>
  );
}
