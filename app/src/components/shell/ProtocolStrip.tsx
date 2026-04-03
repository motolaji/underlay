import { MetricCard } from "@/components/common/MetricCard";
import type { ProtocolMetric } from "@/types/view-model";

type ProtocolStripProps = {
  metrics: ProtocolMetric[];
};

export function ProtocolStrip({ metrics }: ProtocolStripProps) {
  return (
    <section className="paper-panel grain p-6 sm:p-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}
