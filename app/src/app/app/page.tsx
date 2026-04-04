import { MarketWorkspace } from "@/components/markets/MarketWorkspace";
import { ProtocolStripLive } from "@/components/shell/ProtocolStripLive";

export default function AppPage() {
  return (
    <>
      <section className="section-shell pt-4">
        <div className="border border-[color:rgba(217,119,6,0.2)] bg-[color:rgba(217,119,6,0.06)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
          <span className="font-medium text-[color:var(--text-primary)]">
            Testnet note:
          </span>{" "}
          Base Sepolia runs in faucet mode for the demo. This deployment uses
          faucet USDC and keeps idle capital local, so Aave routing is
          intentionally disabled on this environment while reserve, liability,
          and settlement mechanics remain unchanged.
        </div>
      </section>

      {/* Compact stats bar */}
      <section className="section-shell pt-4">
        <ProtocolStripLive />
      </section>

      {/* Market workspace: browser + betslip */}
      <MarketWorkspace />
    </>
  );
}
