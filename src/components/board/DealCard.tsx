import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { followUpStatus, formatMoney } from "@/lib/pipeline";
import type { Deal, Profile } from "@/lib/deals-api";
import { Chip, CompanyLogo, FollowUpChip, PersonAvatar, PriorityPill } from "./bits";

interface ViewProps {
  deal: Deal;
  owner?: Profile | undefined;
  today: string;
  selected?: boolean | undefined;
  overlay?: boolean;
}

export function DealCardView({ deal, owner, today, selected, overlay }: ViewProps) {
  const status = followUpStatus(deal, today);
  return (
    <div
      className={cn(
        "group rounded-xl border border-border bg-card p-3.5 text-left shadow-card transition-shadow hover:shadow-card-hover",
        selected && "border-foreground/20 ring-2 ring-ring/25",
        overlay && "rotate-[1.5deg] cursor-grabbing shadow-lift",
      )}
    >
      <div className="flex items-center gap-2">
        <CompanyLogo name={deal.company} />
        <span className="truncate text-[13px] text-muted-foreground">{deal.company}</span>
        <span className="ml-auto">
          {owner ? (
            <PersonAvatar name={owner.full_name || owner.email} seed={owner.id} size="sm" />
          ) : (
            <span
              title="Unassigned"
              className="inline-flex size-6 rounded-full border border-dashed border-muted-foreground/40"
            />
          )}
        </span>
      </div>
      <div className="mt-2 text-[14px] font-medium leading-snug text-foreground">
        {deal.title || "Untitled deal"}
      </div>
      {deal.next_step && status !== "none" && (
        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          Next: {deal.next_step}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <PriorityPill priority={deal.priority} />
        {deal.follow_up_date && status !== "none" && (
          <FollowUpChip date={deal.follow_up_date} status={status} />
        )}
        <Chip>{formatMoney(deal.value)}</Chip>
      </div>
    </div>
  );
}

export function DealCard(props: ViewProps & { onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.deal.id,
    data: { stage: props.deal.stage },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => props.onOpen(props.deal.id)}
      className={cn(
        "block w-full cursor-grab touch-manipulation rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-40",
      )}
    >
      <DealCardView {...props} />
    </button>
  );
}
