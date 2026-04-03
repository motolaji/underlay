type InfrastructureRailProps = {
  items: ReadonlyArray<{ name: string; role: string }>;
};

export function InfrastructureRail({ items }: InfrastructureRailProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.name}
          className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.4)] p-5"
        >
          <p className="data-label">Infrastructure</p>
          <h3 className="mt-4 text-xl text-[color:var(--ink)]">{item.name}</h3>
          <p className="mt-3 text-sm leading-7">{item.role}</p>
        </article>
      ))}
    </div>
  );
}
