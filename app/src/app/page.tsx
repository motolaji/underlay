import { AppShell } from "@/components/shell/AppShell";
import { CapabilityRail } from "@/components/shell/CapabilityRail";
import { ProtocolStrip } from "@/components/shell/ProtocolStrip";
import { HeroStory } from "@/components/home/HeroStory";
import { HowItWorksBand } from "@/components/home/HowItWorksBand";
import { InfrastructureRail } from "@/components/home/InfrastructureRail";
import { RiskControlsPanel } from "@/components/home/RiskControlsPanel";
import { SectionMasthead } from "@/components/common/SectionMasthead";
import { MarketBrowser } from "@/components/markets/MarketBrowser";
import { SlipPanel } from "@/components/slip/SlipPanel";
import {
  capabilityRail,
  heroContent,
  howItWorksSteps,
  infrastructureItems,
  protocolMetrics,
  riskControlItems,
} from "@/content/home";

export default function Home() {
  return (
    <AppShell>
      <section className="section-shell pt-4">
        <HeroStory {...heroContent} />
      </section>

      <section className="section-shell">
        <CapabilityRail items={capabilityRail} />
      </section>

      <section className="section-shell">
        <ProtocolStrip metrics={protocolMetrics} />
      </section>

      <section id="how-it-works" className="section-shell space-y-8">
        <SectionMasthead
          eyebrow="How it works"
          title="Protocol mechanics first, trading surface second."
          body="The homepage leads with the risk desk itself: how input data becomes a scored position, how reserve and liability limits stay visible, and where settlement delay enters the flow."
        />
        <HowItWorksBand steps={howItWorksSteps} />
      </section>

      <section className="section-shell space-y-8">
        <SectionMasthead
          eyebrow="Risk controls"
          title="Visible safeguards beat hidden assumptions."
          body="Underlay exposes reserve policy, payout caps, world-ID gating, and liability controls as product features, not buried implementation details."
        />
        <RiskControlsPanel items={riskControlItems} />
      </section>

      <section id="market-browser" className="section-shell space-y-8">
        <SectionMasthead
          eyebrow="Live workspace"
          title="An editorial browser that becomes an underwriting slip."
          body="This scaffold already supports the warm newsprint layout, local slip validation, and wallet foundation. Live Gamma markets, AI scores, and onchain quote execution land in later rounds."
        />
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <MarketBrowser />
          <SlipPanel />
        </div>
      </section>

      <section className="section-shell space-y-8">
        <SectionMasthead
          eyebrow="Infrastructure"
          title="Every sponsor capability maps to a visible product responsibility."
          body="The interface frames integrations as protocol capabilities rather than a logo wall, keeping the story grounded in user trust and settlement correctness."
        />
        <InfrastructureRail items={infrastructureItems} />
      </section>
    </AppShell>
  );
}
