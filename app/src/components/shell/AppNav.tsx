"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppKitButton } from "@reown/appkit/react";
import { reownConfigured } from "@/lib/wagmi";
import { useSlipStore } from "@/stores/slipStore";
import { useUiStore } from "@/stores/uiStore";
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
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return (
    <header className="section-shell sticky top-0 z-40 pt-4">
      <div className="nav-toolbar flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
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
                    <span className="ml-1.5 font-mono text-[10px] text-[color:var(--badge-accent-text)]">
                      {selectedCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-sm border border-[color:var(--badge-accent-border)] bg-[color:var(--badge-accent-bg)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--badge-accent-text)] sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Base Sepolia
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 items-center justify-center border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] transition-colors duration-150 hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
          >
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="3" fill="currentColor" />
                <line x1="7" y1="0.5" x2="7" y2="2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="7" y1="11.5" x2="7" y2="13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="0.5" y1="7" x2="2.5" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="11.5" y1="7" x2="13.5" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="2.4" y1="2.4" x2="3.8" y2="3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="10.2" y1="10.2" x2="11.6" y2="11.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="11.6" y1="2.4" x2="10.2" y2="3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="3.8" y1="10.2" x2="2.4" y2="11.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1.5A5.5 5.5 0 1 0 12.5 7 5.5 5.5 0 0 0 7 1.5zm0 9.5A4 4 0 0 1 5.2 3.6 4 4 0 1 0 10.4 8.8 4 4 0 0 1 7 11z" fill="currentColor" />
              </svg>
            )}
          </button>
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
