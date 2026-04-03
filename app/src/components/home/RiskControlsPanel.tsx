type RiskControlsPanelProps = {
  items: Array<{ title: string; body: string }>;
};

export function RiskControlsPanel({ items }: RiskControlsPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.title}
          className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.42)] p-6"
        >
          <p className="data-label">Risk control</p>
          <h3 className="mt-4 text-2xl text-[color:var(--ink)]">
            {item.title}
          </h3>
          <p className="mt-3 text-sm leading-7">{item.body}</p>
        </article>
      ))}
    </div>
  );
}
