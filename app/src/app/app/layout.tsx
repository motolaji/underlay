import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
