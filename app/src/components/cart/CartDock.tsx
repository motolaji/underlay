"use client";

import { useSlipStore } from "@/stores/slipStore";
import { useUiStore } from "@/stores/uiStore";

export function CartDock() {
  const selectedCount = useSlipStore((state) => state.selectedLegs.length);
  const stakeInput = useSlipStore((state) => state.stakeInput);
  const cartOpen = useUiStore((state) => state.cartOpen);
  const setCartOpen = useUiStore((state) => state.setCartOpen);

  if (selectedCount === 0 || cartOpen) return null;

  return (
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      className="section-shell fixed bottom-0 left-0 right-0 z-30 block pb-4 lg:hidden"
    >
      <span className="flex w-full items-center justify-between border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-3">
        <span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]">
            Position Builder
          </span>
          <span className="mt-0.5 block font-mono text-sm font-medium text-[color:var(--text-primary)]">
            {selectedCount} leg{selectedCount !== 1 ? "s" : ""} selected
          </span>
        </span>
        <span className="font-mono text-xs text-[color:var(--text-secondary)]">
          {stakeInput.trim().length > 0 ? `${stakeInput} USDC` : "View slip →"}
        </span>
      </span>
    </button>
  );
}
