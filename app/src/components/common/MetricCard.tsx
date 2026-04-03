import type { ProtocolMetric } from "@/types/view-model";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  metric: ProtocolMetric;
};

const toneClassNames = {
  default: "text-[color:var(--ink)]",
  accent: "text-[color:var(--teal)]",
  warning: "text-[color:var(--amber)]",
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.45)] p-5">
      <p className="data-label">{metric.label}</p>
      <p
        className={cn(
          "mt-4 text-2xl font-semibold tabular",
          toneClassNames[metric.tone ?? "default"]
        )}
      >
        {metric.value}
      </p>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
        Source: {metric.source}
      </p>
    </article>
  );
}
