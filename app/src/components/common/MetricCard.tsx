import type { ProtocolMetric } from "@/types/view-model";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  metric: ProtocolMetric;
};

const valueClassNames: Record<string, string> = {
  default: "text-[color:var(--text-primary)]",
  accent:  "text-[color:#60a5fa]",
  warning: "text-[color:#fbbf24]",
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className="metric-tile">
      <p className="data-label">{metric.label}</p>
      <p
        className={cn(
          "mt-4 font-[family-name:var(--font-display)] text-2xl font-bold tabular",
          valueClassNames[metric.tone ?? "default"]
        )}
      >
        {metric.value}
      </p>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)]">
        {metric.source}
      </p>
    </article>
  );
}
