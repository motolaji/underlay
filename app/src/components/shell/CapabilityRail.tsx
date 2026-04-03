type CapabilityRailProps = {
  items: readonly string[];
};

export function CapabilityRail({ items }: CapabilityRailProps) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 border-y border-[color:var(--border-subtle)] py-4">
      {items.map((item) => (
        <span key={item} className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-secondary)]">
          {item}
        </span>
      ))}
    </div>
  );
}
