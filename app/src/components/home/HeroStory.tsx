type HeroStoryProps = {
  eyebrow: string;
  headline: string;
  deck: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export function HeroStory({
  eyebrow,
  headline,
  deck,
  primaryCta,
  secondaryCta,
}: HeroStoryProps) {
  return (
    <section className="paper-panel grain overflow-hidden px-6 py-10 sm:px-8 sm:py-12 lg:px-12">
      <div className="grid gap-12 lg:grid-cols-[1.45fr_0.95fr] lg:items-end">
        <div className="space-y-6">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="max-w-4xl text-balance text-5xl leading-[0.92] text-[color:var(--ink)] sm:text-6xl lg:text-7xl">
            {headline}
          </h1>
          <p className="max-w-2xl text-lg leading-8 sm:text-xl">{deck}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={primaryCta.href}
              className="rounded-full bg-[color:var(--teal)] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              {primaryCta.label}
            </a>
            <a
              href={secondaryCta.href}
              className="rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.5)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)]"
            >
              {secondaryCta.label}
            </a>
          </div>
        </div>
        <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.52)] p-6">
          <p className="data-label">Protocol frame</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-[22px] border border-[color:rgba(31,90,90,0.18)] bg-[color:rgba(31,90,90,0.08)] p-5">
              <p className="data-label text-[color:var(--teal)]">
                What Underlay is
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--ink)]">
                The vault that underwrites a multi-outcome position after it has
                been selected and scored.
              </p>
            </div>
            <div className="rounded-[22px] border border-[color:rgba(185,133,59,0.2)] bg-[color:rgba(185,133,59,0.08)] p-5">
              <p className="data-label text-[color:var(--amber)]">
                What Underlay is not
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--ink)]">
                Not a prediction market, not a CLOB, and not a sportsbook-style
                parlay front-end.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
