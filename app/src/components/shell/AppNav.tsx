"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppKitButton } from "@reown/appkit/react";
import { reownConfigured } from "@/lib/wagmi";
import { useSlipStore } from "@/stores/slipStore";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Markets" },
  { href: "/app/positions", label: "Positions" },
  { href: "/app/lp", label: "LP Vault" },
  { href: "/protocol", label: "Mechanics" },
];

export function AppNav() {
  const pathname = usePathname();
  const selectedCount = useSlipStore((state) => state.selectedLegs.length);

  return (
    <header className="section-shell sticky top-0 z-40 pt-4">
      <div className="toolbar flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-xs font-bold text-[color:var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              U
            </div>
            <span
              className="text-sm font-semibold tracking-tight text-[color:var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Underlay
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm transition-colors duration-150",
                    active
                      ? "text-[color:var(--text-primary)]"
                      : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                  )}
                >
                  {item.label}
                  {item.href === "/app" && selectedCount > 0 && (
                    <span className="ml-1.5 font-mono text-[10px] text-[color:#60a5fa]">
                      {selectedCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-sm border border-[color:rgba(37,99,235,0.3)] bg-[color:rgba(37,99,235,0.08)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[color:#60a5fa] sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Base Sepolia
          </span>
          {reownConfigured ? (
            <AppKitButton balance="hide" />
          ) : (
            <button
              type="button"
              disabled
              className="border border-[color:var(--border-default)] px-4 py-2 text-sm text-[color:var(--text-secondary)]"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
