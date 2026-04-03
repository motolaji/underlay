import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "default" | "accent" | "warning" | "danger" | "success";
};

const toneClassNames: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  default:
    "border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)]",
  accent:
    "border-[color:rgba(37,99,235,0.3)] bg-[color:rgba(37,99,235,0.08)] text-[color:#60a5fa]",
  warning:
    "border-[color:rgba(217,119,6,0.35)] bg-[color:rgba(217,119,6,0.08)] text-[color:#fbbf24]",
  danger:
    "border-[color:rgba(220,38,38,0.35)] bg-[color:rgba(220,38,38,0.08)] text-[color:#f87171]",
  success:
    "border-[color:rgba(22,163,74,0.35)] bg-[color:rgba(22,163,74,0.08)] text-[color:#4ade80]",
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
