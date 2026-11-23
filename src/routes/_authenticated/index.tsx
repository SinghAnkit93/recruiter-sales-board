import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { BellRing, LogOut, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  STAGES,
  dateKey,
  followUpStatus,
  formatMoney,
  stageLabel,
  summarize,
} from "@/lib/pipeline";
import { dealsQuery, profilesQuery, useUpdateDeal, type Deal } from "@/lib/deals-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BoardColumn } from "@/components/board/BoardColumn";
import { DealCardView } from "@/components/board/DealCard";
import { DealPanel } from "@/components/board/DealPanel";
import { NewDealDialog } from "@/components/board/NewDealDialog";
import { BrandMark } from "@/components/board/BrandMark";
import { PersonAvatar } from "@/components/board/bits";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Deals — Ankit Singh Sales Board" },
      {
        name: "description",
        content:
          "Kanban board of client deals, follow-ups and sales activity for the recruitment team.",
      },
      { property: "og:title", content: "Deals — Ankit Singh Sales Board" },
      {
        property: "og:description",
        content:
          "Kanban board of client deals, follow-ups and sales activity for the recruitment team.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(dealsQuery),
      context.queryClient.ensureQueryData(profilesQuery),
    ]),
  component: BoardPage,
});

function BoardPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: deals } = useSuspenseQuery(dealsQuery);
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const update = useUpdateDeal();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newDealStage, setNewDealStage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState<"all" | "me">("all");
  const [dueOnly, setDueOnly] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const today = dateKey();

  // Live updates so teammates see each other's changes.
  useEffect(() => {
    const channel = supabase
      .channel(`board-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["deals"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => {
        queryClient.invalidateQueries({ queryKey: ["activities"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const people = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const me = people.get(user.id);
  const myName = me?.full_name || user.email || "You";

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (owner === "me" && d.owner_id !== user.id) return false;
      if (dueOnly) {
        const s = followUpStatus(d, today);
        if (s !== "overdue" && s !== "today") return false;
      }
      if (!q) return true;
      return [d.company, d.title, d.contact_name, d.next_step].some((f) =>
        f.toLowerCase().includes(q),
      );
    });
  }, [deals, search, owner, dueOnly, user.id, today]);

  const byStage = useMemo(() => {
    const map = new Map<string, Deal[]>(STAGES.map((s) => [s.id, []]));
    const sorted = [...visible].sort((a, b) => {
      const pa = { high: 0, medium: 1, low: 2 }[a.priority] ?? 1;
      const pb = { high: 0, medium: 1, low: 2 }[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return (a.follow_up_date ?? "9999").localeCompare(b.follow_up_date ?? "9999");
    });
    for (const d of sorted) map.get(d.stage)?.push(d);
    return map;
  }, [visible]);

  const stats = summarize(deals, today);
  const selected = deals.find((d) => d.id === selectedId) ?? null;
  const dragging = deals.find((d) => d.id === dragId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  function onDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const deal = deals.find((d) => d.id === e.active.id);
    const to = e.over?.id ? String(e.over.id) : null;
    if (!deal || !to || deal.stage === to) return;
    update.mutate(
      { id: deal.id, patch: { stage: to } },
      {
        onSuccess: () => {
          if (to === "won") toast.success(`Nice one — ${deal.company} is won!`);
          else toast(`${deal.company} moved to ${stageLabel(to)}`);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't move deal"),
      },
    );
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }

  return (
    <div className="h-screen lg:p-4">
      <div className="flex h-full flex-col overflow-hidden bg-background shadow-window lg:rounded-2xl">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <BrandMark />
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">Ankit Singh</span>
            <span className="hidden text-muted-foreground/50 sm:inline">/</span>
            <h1 className="text-xl font-medium tracking-tight">Deals</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden -space-x-2 md:flex" aria-label="Team members">
              {profiles.slice(0, 5).map((p) => (
                <PersonAvatar key={p.id} name={p.full_name || p.email} seed={p.id} />
              ))}
            </div>
            <Button onClick={() => setNewDealStage("lead")} className="h-9 rounded-lg">
              <Plus />
              <span className="hidden sm:inline">New deal</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <PersonAvatar name={myName} seed={user.id} className="size-8 ring-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-medium">{myName}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Toolbar + quick numbers */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, contact…"
              className="h-8 w-56 rounded-lg pl-8 text-[13px]"
              aria-label="Search deals"
            />
          </div>
          <Select value={owner} onValueChange={(v) => setOwner(v as "all" | "me")}>
            <SelectTrigger
              className="h-8 w-auto gap-2 rounded-lg text-[13px] shadow-card"
              aria-label="Filter by owner"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone's deals</SelectItem>
              <SelectItem value="me">My deals</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="chip"
            size="sm"
            data-active={dueOnly}
            onClick={() => setDueOnly((v) => !v)}
          >
            <BellRing />
            Follow-ups due
            <span className="tabular rounded bg-priority-high/10 px-1.5 text-xs font-medium text-priority-high">
              {stats.dueCount}
            </span>
          </Button>

          <dl className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px]">
            <Stat
              label="Open pipeline"
              value={formatMoney(stats.openValue, true)}
              sub={`${stats.openCount} deals`}
            />
            <Stat
              label="Won"
              value={formatMoney(stats.wonValue, true)}
              sub={`${stats.wonCount} deals`}
            />
            <Stat label="Win rate" value={stats.winRate === null ? "—" : `${stats.winRate}%`} />
          </dl>
        </div>

        {/* Board + detail panel */}
        <div className="flex min-h-0 flex-1">
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDragId(null)}
          >
            <div className="scrollbar-thin flex min-w-0 flex-1 gap-5 overflow-x-auto bg-surface px-5 pt-5">
              {STAGES.map((stage) => (
                <BoardColumn
                  key={stage.id}
                  stage={stage}
                  deals={byStage.get(stage.id) ?? []}
                  profiles={people}
                  today={today}
                  selectedId={selectedId}
                  onOpen={setSelectedId}
                  onAdd={setNewDealStage}
                />
              ))}
              <div className="w-1 shrink-0" />
            </div>
            <DragOverlay dropAnimation={null}>
              {dragging ? (
                <div className="w-[288px]">
                  <DealCardView
                    deal={dragging}
                    owner={dragging.owner_id ? people.get(dragging.owner_id) : undefined}
                    today={today}
                    overlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {selected && (
            <DealPanel
              key={selected.id}
              deal={selected}
              profiles={profiles}
              currentUserId={user.id}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>

      <NewDealDialog
        stage={newDealStage}
        ownerId={user.id}
        onClose={() => setNewDealStage(null)}
        onCreated={(id) => {
          setNewDealStage(null);
          setSelectedId(id);
        }}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular font-medium">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">({sub})</dd>}
    </div>
  );
}
