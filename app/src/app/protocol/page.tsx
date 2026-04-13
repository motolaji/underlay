import { InfrastructureRail } from "@/components/home/InfrastructureRail";
import { SectionMasthead } from "@/components/common/SectionMasthead";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { infrastructureItems } from "@/content/home";
import {
  DELAY_CONFIG,
  POSITION_RULES,
  TESTNET_VAULT_CONFIG,
} from "@/lib/constants";
import { formatBps, formatUsdc } from "@/lib/format";

const configRows = [
  ["Max TVL", formatUsdc(TESTNET_VAULT_CONFIG.maxTVLRaw)],
  ["Min activation", formatUsdc(TESTNET_VAULT_CONFIG.minActivationRaw)],
  ["Max liability", formatBps(TESTNET_VAULT_CONFIG.maxLiabilityBps)],
  ["Reserve split", formatBps(TESTNET_VAULT_CONFIG.reserveBps)],
  ["Max payout", formatUsdc(TESTNET_VAULT_CONFIG.maxPayoutRaw)],
  ["Max stake", formatUsdc(TESTNET_VAULT_CONFIG.maxStakeRaw)],
  ["World ID gate", formatUsdc(TESTNET_VAULT_CONFIG.worldIdGateRaw)],
  [
    "Leg rules",
    `${POSITION_RULES.minLegsPerPosition}–${POSITION_RULES.maxLegsPerPosition} outcomes per position`,
  ],
  ["Low-risk delay", `${DELAY_CONFIG.lowDelaySeconds}s`],
  ["High-risk delay", `${DELAY_CONFIG.highDelaySeconds}s`],
] as const;

export default function ProtocolPage() {
  return (
    <MarketingShell>
      <section className="section-shell space-y-8 pt-4">
        <SectionMasthead
          eyebrow="Mechanics"
          title="The vault, the reserve, and the settlement layer."
          body="Underlay prices multi-outcome positions, holds reserves for payout exposure, and settles through a delay-aware onchain workflow. All parameters are protocol config — nothing is hidden."
        />

        {/* What it is / isn't */}
        <div className="grid gap-px border border-[color:var(--border-subtle)] lg:grid-cols-2">
          <article className="bg-[color:var(--bg-surface)] p-6">
            <p className="data-label">What Underlay is</p>
            <p className="mt-4 text-base leading-8 text-[color:var(--text-primary)]">
              An ERC-4626 vault and settlement layer that underwrites
              multi-outcome positions. It prices risk, enforces reserve and
              liability limits, and releases settlement through Chainlink CRE.
            </p>
          </article>
          <article className="bg-[color:var(--bg-surface)] p-6">
            <p className="data-label">What Underlay is not</p>
            <p className="mt-4 text-base leading-8 text-[color:var(--text-primary)]">
              Not a prediction market, not an offchain bookmaker, not a parlay
              platform. Underlay does not set odds or run markets — prediction
              markets do that. Underlay underwrites the combined exposure.
            </p>
          </article>
        </div>

        {/* Vault config */}
        <div className="border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-6 sm:p-8">
          <p className="data-label">Vault Config</p>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            All parameters are set at deployment and readable onchain.
          </p>
          <div className="mt-6 divide-y divide-[color:var(--border-subtle)]">
            {configRows.map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
                  {label}
                </p>
                <p className="tabular text-sm text-[color:var(--text-primary)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quote lifecycle + trust boundaries */}
        <div className="grid gap-px border border-[color:var(--border-subtle)] lg:grid-cols-2">
          <article className="bg-[color:var(--bg-surface)] p-6">
            <p className="data-label">Position lifecycle</p>
            <div className="mt-5 space-y-2.5">
              {[
                "Trader selects outcomes from prediction markets via CLOB API.",
                "0G Compute scores position risk via AI inference. 0G Storage pins the audit payload.",
                "Vault prices the combined position using utilisation, correlation factor, and config caps.",
                "Position is locked with a quote and stake is transferred.",
                "Chainlink CRE waits through the risk-tier delay window.",
                "Reserve pays out winning positions. Losing stakes sweep into the vault.",
              ].map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </article>
          <article className="bg-[color:var(--bg-surface)] p-6">
            <p className="data-label">Trust model</p>
            <div className="mt-5 space-y-2.5">
              {[
                "Canonical position state lives onchain — no offchain database required.",
                "Audit receipts and risk payloads are pinned to 0G Storage.",
                "World ID prevents Sybil attacks above the stake gate.",
                "Draft position state lives only in the browser until submission.",
                "Reserve ratio and liability cap are enforced by smart contract, not application logic.",
                "Settlement delay windows are encoded in protocol config, not business rules.",
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                    —
                  </span>
                  <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Capital model */}
        <div className="border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-6">
          <p className="data-label">Capital model</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-5 flex-1 overflow-hidden">
              <div
                className="flex h-full items-center justify-center bg-[color:var(--risk-medium)] text-[10px] font-mono text-white"
                style={{ width: `${TESTNET_VAULT_CONFIG.reserveBps / 100}%` }}
              >
                Reserve
              </div>
              <div
                className="flex h-full items-center justify-center bg-[color:var(--accent-blue)] text-[10px] font-mono text-white"
                style={{
                  width: `${100 - TESTNET_VAULT_CONFIG.reserveBps / 100}%`,
                }}
              >
                Idle / Deployed
              </div>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-[color:var(--text-secondary)]">
              {formatBps(TESTNET_VAULT_CONFIG.reserveBps)} reserve
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
            A fixed reserve portion of vault TVL is held as immediate payout
            liquidity. The remaining idle capital is eligible for Aave yield
            routing once integration is live.
          </p>
          <p className="mt-4 border-t border-[color:var(--border-subtle)] pt-4 text-sm leading-7 text-[color:var(--text-secondary)]">
            Testnet exception: this Base Sepolia deployment uses faucet USDC so
            the demo can be activated with public faucet liquidity. Because that
            asset is not the Aave-listed reserve on Base Sepolia, Aave routing
            is disabled on this environment while the vault, reserve, liability,
            and settlement flows remain the same.
          </p>
        </div>

        <InfrastructureRail items={infrastructureItems} />
      </section>
    </MarketingShell>
  );
}
