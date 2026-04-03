import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "default" | "accent" | "warning";
};

const toneClassNames = {
  default: "border-[color:var(--border)] text-[color:var(--muted)]",
  accent:
    "border-[color:rgba(31,90,90,0.25)] bg-[color:rgba(31,90,90,0.08)] text-[color:var(--teal)]",
  warning:
    "border-[color:rgba(185,133,59,0.3)] bg-[color:rgba(185,133,59,0.08)] text-[color:var(--amber)]",
};

export function StatusBadge({ label, tone = "default" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        toneClassNames[tone]
      )}
    >
      {label}
    </span>
  );
}
