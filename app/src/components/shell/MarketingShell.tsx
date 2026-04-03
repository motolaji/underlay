import type { ReactNode } from "react";
import { MarketingNav } from "@/components/shell/MarketingNav";

type MarketingShellProps = {
  children: ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--bg-base)]">
      <MarketingNav />
      <main className="space-y-16 pb-20 pt-2">{children}</main>
    </div>
  );
}
