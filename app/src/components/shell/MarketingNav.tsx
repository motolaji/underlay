import Link from "next/link";

const navItems = [
  { href: "/protocol", label: "Mechanics" },
  { href: "/app/lp", label: "LP Vault" },
  { href: "/app/positions", label: "Positions" },
];

export function MarketingNav() {
  return (
    <header className="section-shell pt-4">
      <div className="toolbar flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-xs font-bold text-[color:var(--text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}>
            U
          </div>
          <span
            className="text-sm font-semibold tracking-tight text-[color:var(--text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Underlay
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm text-[color:var(--text-secondary)] transition-colors duration-150 hover:text-[color:var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-sm border border-[color:rgba(37,99,235,0.3)] bg-[color:rgba(37,99,235,0.08)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[color:#60a5fa] sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Base Sepolia
          </span>
          <Link
            href="/app"
            className="border border-[color:var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-150 hover:bg-gray-100"
          >
            Open App
          </Link>
        </div>
      </div>
    </header>
  );
}
