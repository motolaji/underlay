type CapabilityRailProps = {
  items: readonly string[];
};

export function CapabilityRail({ items }: CapabilityRailProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 border-y border-[color:var(--border)] py-4">
      {items.map((item) => (
        <span key={item} className="data-label text-[color:var(--ink)]">
          {item}
        </span>
      ))}
    </div>
  );
}
