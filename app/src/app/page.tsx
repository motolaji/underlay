import Link from "next/link";
import { CapabilityRail } from "@/components/shell/CapabilityRail";
import { ProtocolStrip } from "@/components/shell/ProtocolStrip";
import { InfrastructureRail } from "@/components/home/InfrastructureRail";
import { HowItWorksBand } from "@/components/home/HowItWorksBand";
import { SectionMasthead } from "@/components/common/SectionMasthead";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { NodeBackground } from "@/components/common/NodeBackground";
import {
  audienceSplit,
  capabilityRail,
  heroContent,
  homeHighlights,
  howItWorksSteps,
  infrastructureItems,
  protocolMetrics,
} from "@/content/home";

function GlobeVisual() {
  return (
    <div className="flex items-center justify-center py-8 lg:py-0">
      <svg
        viewBox="0 0 480 480"
        width="100%"
        height="auto"
        style={{ maxWidth: 400 }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Sphere outline */}
        <circle
          cx="240"
          cy="240"
          r="220"
          stroke="var(--border-default)"
          strokeWidth="0.8"
          fill="none"
        />

        {/* Latitude ellipses */}
        <ellipse cx="240" cy="180" rx="210" ry="60" stroke="var(--border-subtle)" strokeWidth="0.5" fill="none" />
        <ellipse cx="240" cy="240" rx="220" ry="50" stroke="var(--border-subtle)" strokeWidth="0.5" fill="none" />
        <ellipse cx="240" cy="300" rx="210" ry="60" stroke="var(--border-subtle)" strokeWidth="0.5" fill="none" />
        <ellipse cx="240" cy="160" rx="160" ry="35" stroke="var(--border-subtle)" strokeWidth="0.5" fill="none" />
        <ellipse cx="240" cy="320" rx="160" ry="35" stroke="var(--border-subtle)" strokeWidth="0.5" fill="none" />

        {/* Longitude ellipses */}
        <ellipse cx="240" cy="240" rx="70" ry="220" stroke="var(--border-subtle)" strokeWidth="0.5" fill="none" />
        <ellipse cx="240" cy="240" rx="140" ry="220" stroke="var(--border-subtle)" strokeWidth="0.5" fill="none" />
        <ellipse cx="240" cy="240" rx="220" ry="220" stroke="var(--border-subtle)" strokeWidth="0.5" fill="none" transform="rotate(60 240 240)" />

        {/* Connection lines */}
        {/* A-B */}
        <line x1="160" y1="165" x2="295" y2="155" stroke="var(--border-default)" strokeWidth="0.6" opacity="0.5" />
        {/* B-C */}
        <line x1="295" y1="155" x2="345" y2="200" stroke="var(--border-default)" strokeWidth="0.6" opacity="0.5" />
        {/* C-D */}
        <line x1="345" y1="200" x2="390" y2="270" stroke="var(--border-default)" strokeWidth="0.6" opacity="0.5" />
        {/* B-E */}
        <line x1="295" y1="155" x2="310" y2="330" stroke="var(--border-default)" strokeWidth="0.6" opacity="0.5" />
        {/* A-F */}
        <line x1="160" y1="165" x2="175" y2="310" stroke="var(--border-default)" strokeWidth="0.6" opacity="0.5" />
        {/* E-F */}
        <line x1="310" y1="330" x2="175" y2="310" stroke="var(--border-default)" strokeWidth="0.6" opacity="0.5" />
        {/* B-G */}
        <line x1="295" y1="155" x2="240" y2="130" stroke="var(--border-default)" strokeWidth="0.6" opacity="0.5" />

        {/* Node B glow (primary node) */}
        <circle cx="295" cy="155" r="16" fill="var(--accent-blue)" opacity="0.08" />

        {/* Node A: blue, r=4 */}
        <circle cx="160" cy="165" r="4" fill="var(--accent-blue)" opacity="0.9" />

        {/* Node B: blue, r=5 — primary node with pulse ring */}
        <circle cx="295" cy="155" r="9" stroke="var(--accent-blue)" strokeWidth="0.8" fill="none" opacity="0.3" />
        <circle cx="295" cy="155" r="5" fill="var(--accent-blue)" opacity="0.95" />

        {/* Node C: green, r=3.5 */}
        <circle cx="345" cy="200" r="3.5" fill="var(--data-positive)" opacity="0.9" />

        {/* Node D: amber, r=3 */}
        <circle cx="390" cy="270" r="3" fill="var(--accent-amber)" opacity="0.9" />

        {/* Node E: green, r=3.5 with pulse ring */}
        <circle cx="310" cy="330" r="9" stroke="var(--data-positive)" strokeWidth="0.8" fill="none" opacity="0.25" />
        <circle cx="310" cy="330" r="3.5" fill="var(--data-positive)" opacity="0.9" />

        {/* Node F: amber, r=3 */}
        <circle cx="175" cy="310" r="3" fill="var(--accent-amber)" opacity="0.9" />

        {/* Node G: blue, r=3 */}
        <circle cx="240" cy="130" r="3" fill="var(--accent-blue)" opacity="0.9" />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="section-shell relative overflow-hidden pt-4">
        <NodeBackground />
        <div className="relative p-8 sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
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
              <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-tertiary)]">
                {heroContent.supporting}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={heroContent.primaryCta.href}
                  className="bg-[color:var(--text-primary)] px-5 py-3 text-sm font-medium text-[color:var(--bg-base)] transition-colors duration-150 hover:opacity-80"
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

            <GlobeVisual />
          </div>
        </div>
      </section>

      {/* Capability rail */}
      <section className="section-shell">
        <CapabilityRail items={capabilityRail} />
      </section>

      {/* Home highlights — 3-column feature grid */}
      <section className="section-shell">
        <div className="grid gap-px border border-[color:var(--border-subtle)] sm:grid-cols-3">
          {homeHighlights.map((item) => (
            <article key={item.title} className="bg-[color:var(--bg-surface)] p-6">
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
      </section>

      {/* Trader / LP split */}
      <section className="section-shell">
        <div className="mb-6">
          <p className="eyebrow mb-3">Two audiences, one protocol</p>
          <h2
            className="text-2xl text-[color:var(--text-primary)] sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Traders build positions. LPs earn yield.
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
          title="From market signal to onchain settlement."
          body="Six steps, six partner integrations. Every part of the lifecycle has a verifiable onchain or cryptographic counterpart — nothing runs in an opaque database."
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
