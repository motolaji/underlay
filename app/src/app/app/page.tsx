import { MarketWorkspace } from "@/components/markets/MarketWorkspace";
import { ProtocolStripLive } from "@/components/shell/ProtocolStripLive";

export default function AppPage() {
  return (
    <>
      {/* Compact stats bar */}
      <section className="section-shell pt-4">
        <ProtocolStripLive />
      </section>

      {/* Market workspace: browser + betslip */}
      <MarketWorkspace />
    </>
  );
}
