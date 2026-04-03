import { MetricCard } from "@/components/common/MetricCard";
import type { ProtocolMetric } from "@/types/view-model";

type ProtocolStripProps = {
  metrics: ProtocolMetric[];
};

export function ProtocolStrip({ metrics }: ProtocolStripProps) {
  return (
    <div className="border border-[color:var(--border-subtle)] p-1">
      <div className="grid gap-px md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </div>
  );
}
