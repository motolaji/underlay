import type { ReactNode } from "react";
import { TopNav } from "@/components/shell/TopNav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="pb-16">
      <TopNav />
      <main className="space-y-12 pb-12">{children}</main>
    </div>
  );
}
