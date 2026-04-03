"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppKitButton } from "@reown/appkit/react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { reownConfigured } from "@/lib/wagmi";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Markets" },
  { href: "/lp", label: "LP Vault" },
  { href: "/positions", label: "Positions" },
  { href: "/protocol", label: "Mechanics" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="section-shell sticky top-0 z-40 py-4">
      <div className="paper-panel flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border border-[color:var(--border)] bg-[color:rgba(31,90,90,0.08)]" />
            <div>
              <p className="eyebrow">Underlay</p>
              <p className="text-sm text-[color:var(--muted)]">
                Community-owned risk vault
              </p>
            </div>
          </Link>
          <nav className="flex flex-wrap gap-2 lg:pl-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-[color:rgba(31,90,90,0.1)] text-[color:var(--teal)]"
                    : "text-[color:var(--muted)] hover:bg-[color:rgba(255,255,255,0.45)] hover:text-[color:var(--ink)]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge label="Base Sepolia" tone="accent" />
          {reownConfigured ? (
            <AppKitButton balance="hide" />
          ) : (
            <button
              type="button"
              disabled
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted)]"
            >
              Set NEXT_PUBLIC_REOWN_PROJECT_ID
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
