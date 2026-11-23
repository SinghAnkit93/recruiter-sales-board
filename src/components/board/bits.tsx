import { CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { initials, toneFor, type FollowUpStatus } from "@/lib/pipeline";

export function PersonAvatar({
  name,
  seed,
  size = "md",
  className,
}: {
  name: string;
  seed?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "size-6 text-[10px]", md: "size-7 text-[11px]", lg: "size-10 text-sm" };
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-primary-foreground ring-2 ring-background",
        sizes[size],
        toneFor(seed ?? name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function CompanyLogo({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] text-[10px] font-bold text-primary-foreground",
        toneFor(name),
        className,
      )}
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-priority-high/10 text-priority-high border-priority-high/15",
  medium: "bg-priority-medium/10 text-priority-medium border-priority-medium/15",
  low: "bg-priority-low/10 text-priority-low border-priority-low/15",
};
const PRIORITY_LABEL: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };

export function PriorityPill({ priority, className }: { priority: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
        PRIORITY_STYLES[priority] ?? PRIORITY_STYLES["medium"],
        className,
      )}
    >
      {PRIORITY_LABEL[priority] ?? priority}
    </span>
  );
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "tabular inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground/80",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FollowUpChip({ date, status }: { date: string; status: FollowUpStatus }) {
  const label = status === "today" ? "Today" : format(parseISO(date), "d MMM");
  return (
    <Chip
      className={cn(
        status === "overdue" && "border-priority-high/25 bg-priority-high/5 text-priority-high",
        status === "today" && "border-priority-medium/25 bg-priority-medium/5 text-priority-medium",
      )}
    >
      <CalendarDays className="size-3.5" />
      {label}
    </Chip>
  );
}
