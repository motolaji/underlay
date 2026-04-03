type InfrastructureRailProps = {
  items: ReadonlyArray<{ name: string; role: string }>;
};

export function InfrastructureRail({ items }: InfrastructureRailProps) {
  return (
    <div className="grid gap-px border border-[color:var(--border-subtle)] lg:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.name}
          className="bg-[color:var(--bg-surface)] p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Infrastructure
          </p>
          <h3 className="mt-4 text-lg text-[color:var(--text-primary)]">
            {item.name}
          </h3>
          <p className="mt-2 text-sm leading-7">{item.role}</p>
        </article>
      ))}
    </div>
  );
}
