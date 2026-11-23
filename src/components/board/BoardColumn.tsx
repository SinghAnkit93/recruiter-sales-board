import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/pipeline";
import type { Deal, Profile } from "@/lib/deals-api";
import { DealCard } from "./DealCard";
import { StageIcon } from "./StageIcon";

interface Props {
  stage: { id: string; label: string; hint: string };
  deals: Deal[];
  profiles: Map<string, Profile>;
  today: string;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onAdd: (stage: string) => void;
}

export function BoardColumn({ stage, deals, profiles, today, selectedId, onOpen, onAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  return (
    <section className="flex w-[296px] shrink-0 flex-col">
      <header className="flex items-center gap-2 px-1 pb-1">
        <StageIcon stage={stage.id} />
        <h2 className="text-[15px] font-medium">{stage.label}</h2>
        <span className="tabular rounded-md bg-muted px-1.5 text-xs text-muted-foreground">
          {deals.length}
        </span>
        <button
          type="button"
          onClick={() => onAdd(stage.id)}
          className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`Add deal to ${stage.label}`}
        >
          <Plus className="size-4" />
        </button>
      </header>
      <p className="tabular px-1 pb-3 text-xs text-muted-foreground" title={stage.hint}>
        {formatMoney(total, true)} · {stage.hint}
      </p>
      <div
        ref={setNodeRef}
        className={cn(
          "scrollbar-thin -mx-1 flex min-h-[140px] flex-1 flex-col gap-2.5 overflow-y-auto rounded-xl p-1 pb-6 transition-colors",
          isOver && "bg-accent",
        )}
      >
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            owner={deal.owner_id ? profiles.get(deal.owner_id) : undefined}
            today={today}
            selected={deal.id === selectedId}
            onOpen={onOpen}
          />
        ))}
        {deals.length === 0 && (
          <button
            type="button"
            onClick={() => onAdd(stage.id)}
            className="rounded-xl border border-dashed border-border py-6 text-xs text-muted-foreground hover:border-foreground/20 hover:text-foreground"
          >
            Drop a deal here or add one
          </button>
        )}
      </div>
    </section>
  );
}
