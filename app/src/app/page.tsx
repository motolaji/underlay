import Link from "next/link";
import { CapabilityRail } from "@/components/shell/CapabilityRail";
import { ProtocolStrip } from "@/components/shell/ProtocolStrip";
import { InfrastructureRail } from "@/components/home/InfrastructureRail";
import { HowItWorksBand } from "@/components/home/HowItWorksBand";
import { SectionMasthead } from "@/components/common/SectionMasthead";
import { MarketingShell } from "@/components/shell/MarketingShell";
import {
  audienceSplit,
  capabilityRail,
  heroContent,
  homeHighlights,
  howItWorksSteps,
  infrastructureItems,
  protocolMetrics,
} from "@/content/home";

export default function Home() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="section-shell pt-4">
        <div className="border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-8 sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div className="space-y-6">
              <p className="eyebrow">{heroContent.eyebrow}</p>
              <h1
                className="max-w-3xl text-balance text-5xl leading-[0.92] text-[color:var(--text-primary)] sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
              >
                {heroContent.headline}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[color:var(--text-secondary)] sm:text-lg">
                {heroContent.deck}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={heroContent.primaryCta.href}
                  className="bg-white px-5 py-3 text-sm font-medium text-black transition-colors duration-150 hover:bg-gray-100"
                >
                  {heroContent.primaryCta.label}
                </Link>
                <Link
                  href={heroContent.secondaryCta.href}
                  className="border border-[color:var(--border-default)] px-5 py-3 text-sm font-medium text-[color:var(--text-secondary)] transition-colors duration-150 hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
                >
                  {heroContent.secondaryCta.label}
                </Link>
              </div>
            </div>

            <div className="space-y-px border border-[color:var(--border-subtle)]">
              {homeHighlights.map((item) => (
                <article key={item.title} className="bg-[color:var(--bg-elevated)] p-5">
                  <h3
                    className="text-sm font-semibold text-[color:var(--text-primary)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capability rail */}
      <section className="section-shell">
        <CapabilityRail items={capabilityRail} />
      </section>

      {/* Bettor / LP split */}
      <section className="section-shell">
        <div className="mb-6">
          <p className="eyebrow mb-3">Two audiences, one protocol</p>
          <h2
            className="text-2xl text-[color:var(--text-primary)] sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Bettors build positions. LPs earn yield.
          </h2>
        </div>
        <div className="grid gap-px border border-[color:var(--border-subtle)] lg:grid-cols-2">
          {audienceSplit.map((audience) => (
            <div key={audience.role} className="bg-[color:var(--bg-surface)] p-6">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)]">
                {audience.role}
              </p>
              <h3
                className="mt-3 text-xl text-[color:var(--text-primary)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {audience.headline}
              </h3>
              <p className="mt-3 text-sm leading-7">{audience.body}</p>
              <div className="mt-6">
                <Link
                  href={audience.cta.href}
                  className="inline-block border border-[color:var(--border-default)] px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition-colors duration-150 hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
                >
                  {audience.cta.label} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Protocol metrics */}
      <section className="section-shell">
        <p className="eyebrow mb-4">Protocol config (testnet)</p>
        <ProtocolStrip metrics={protocolMetrics} />
      </section>

      {/* How it works */}
      <section className="section-shell space-y-6">
        <SectionMasthead
          eyebrow="How it works"
          title="From market signal to onchain settlement — four steps."
          body="Every step in the position lifecycle has a visible onchain or verifiable offchain counterpart. Nothing happens in an opaque database."
        />
        <HowItWorksBand steps={howItWorksSteps} />
      </section>

      {/* Infrastructure */}
      <section className="section-shell space-y-6 pb-4">
        <SectionMasthead
          eyebrow="Infrastructure"
          title="Every integration maps to a specific protocol responsibility."
          body="Seven protocol partners each handle a distinct layer. No single point of trust or failure."
        />
        <InfrastructureRail items={infrastructureItems} />
      </section>
    </MarketingShell>
  );
}
