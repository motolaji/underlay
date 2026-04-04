"use client";

import { useSlipStore } from "@/stores/slipStore";
import { MarketBrowser } from "@/components/markets/MarketBrowser";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartDock } from "@/components/cart/CartDock";

export function MarketWorkspace() {
  const selectedCount = useSlipStore((state) => state.selectedLegs.length);
  const slipVisible = selectedCount > 0;

  return (
    <div className="section-shell pb-24 pt-6 lg:pb-10">
      <div className="flex items-start gap-6">
        {/* Market browser — fills available space */}
        <div className="min-w-0 flex-1">
          <MarketBrowser />
        </div>

        {/* Betslip panel — fixed width, slides in */}
        {slipVisible && (
          <div
            className="hidden w-[360px] shrink-0 animate-slide-in-right lg:block"
            style={{ position: "sticky", top: "88px", height: "calc(100vh - 104px)" }}
          >
            <CartDrawer />
          </div>
        )}
      </div>

      {/* Mobile dock */}
      <CartDock />
    </div>
  );
}
