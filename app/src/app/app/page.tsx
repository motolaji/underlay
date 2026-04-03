import { MarketWorkspace } from "@/components/markets/MarketWorkspace";
import { ProtocolStrip } from "@/components/shell/ProtocolStrip";
import { protocolMetrics } from "@/content/home";

export default function AppPage() {
  return (
    <>
      {/* Compact stats bar */}
      <section className="section-shell pt-4">
        <ProtocolStrip metrics={protocolMetrics} />
      </section>

      {/* Market workspace: browser + betslip */}
      <MarketWorkspace />
    </>
  );
}
