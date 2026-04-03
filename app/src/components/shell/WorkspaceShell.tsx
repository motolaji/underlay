import type { ReactNode } from "react";
import { AppNav } from "@/components/shell/AppNav";

type WorkspaceShellProps = {
  children: ReactNode;
};

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--bg-base)]">
      <AppNav />
      <main>{children}</main>
    </div>
  );
}
