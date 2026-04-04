import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "default" | "accent" | "warning" | "danger" | "success";
};

const toneClassNames: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  default:
    "border-[color:var(--badge-default-border)] bg-[color:var(--badge-default-bg)] text-[color:var(--badge-default-text)]",
  accent:
    "border-[color:var(--badge-accent-border)] bg-[color:var(--badge-accent-bg)] text-[color:var(--badge-accent-text)]",
  warning:
    "border-[color:var(--badge-warning-border)] bg-[color:var(--badge-warning-bg)] text-[color:var(--badge-warning-text)]",
  danger:
    "border-[color:var(--badge-danger-border)] bg-[color:var(--badge-danger-bg)] text-[color:var(--badge-danger-text)]",
  success:
    "border-[color:var(--badge-success-border)] bg-[color:var(--badge-success-bg)] text-[color:var(--badge-success-text)]",
};

export function StatusBadge({ label, tone = "default" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider",
        toneClassNames[tone]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
