import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarPlus,
  CircleUserRound,
  Hash,
  IndianRupee,
  Mail,
  Megaphone,
  Phone,
  PanelRightClose,
  Route as RouteIcon,
  Signal,
  StickyNote,
  Trash2,
  Users,
  History,
  Zap,
  Footprints,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_TYPES,
  PRIORITIES,
  SERVICES,
  SOURCES,
  STAGES,
  formatMoney,
  stageLabel,
  type ActivityTypeId,
} from "@/lib/pipeline";
import {
  activitiesQuery,
  useDeleteDeal,
  useLogActivity,
  useUpdateDeal,
  type Deal,
  type Profile,
} from "@/lib/deals-api";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InlineText, InlineTextarea } from "./fields";
import { PersonAvatar, PriorityPill } from "./bits";
import { StageIcon } from "./StageIcon";

const selectTrigger =
  "h-8 -mx-2 w-[calc(100%+1rem)] border-transparent bg-transparent px-2 shadow-none hover:bg-accent focus:ring-1";

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <>
      <div className="flex h-8 items-center gap-2.5 text-sm text-muted-foreground [&_svg]:size-4">
        {icon}
        {label}
      </div>
      <div className="flex min-h-8 min-w-0 items-center">{children}</div>
    </>
  );
}

const ACTIVITY_ICON: Record<string, ReactNode> = {
  call: <Phone />,
  email: <Mail />,
  meeting: <Users />,
  note: <StickyNote />,
  stage: <ArrowRight />,
};
const ACTIVITY_VERB: Record<string, string> = {
  call: "logged a call",
  email: "sent an email",
  meeting: "had a meeting",
  note: "added a note",
};

export function DealPanel({
  deal,
  profiles,
  currentUserId,
  onClose,
}: {
  deal: Deal;
  profiles: Profile[];
  currentUserId: string;
  onClose: () => void;
}) {
  const update = useUpdateDeal();
  const remove = useDeleteDeal();
  const log = useLogActivity();
  const { data: activities = [] } = useQuery(activitiesQuery(deal.id));
  const [logging, setLogging] = useState(false);
  const [logType, setLogType] = useState<ActivityTypeId>("call");
  const [logBody, setLogBody] = useState("");

  const people = new Map(profiles.map((p) => [p.id, p]));
  const nameOf = (id: string | null) => {
    if (!id) return "Team";
    if (id === currentUserId) return "You";
    const p = people.get(id);
    return p?.full_name || p?.email || "Teammate";
  };

  const save = (patch: TablesUpdate<"deals">) =>
    update.mutate(
      { id: deal.id, patch },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save") },
    );

  const lastTouch = activities.find((a) => a.type !== "stage");

  function submitLog() {
    if (!logBody.trim()) return;
    log.mutate(
      { deal_id: deal.id, type: logType, body: logBody.trim() },
      {
        onSuccess: () => {
          setLogBody("");
          setLogging(false);
          toast.success("Activity logged");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't log activity"),
      },
    );
  }

  return (
    <aside className="fixed inset-0 z-40 flex flex-col bg-background lg:static lg:z-auto lg:w-[460px] lg:shrink-0 lg:border-l lg:border-border">
      <header className="flex items-center gap-2 border-b border-border px-6 py-4">
        <InlineText
          value={deal.title}
          onSave={(v) => save({ title: v })}
          placeholder="Deal title"
          ariaLabel="Deal title"
          className="text-lg font-medium"
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete deal"
              className="text-muted-foreground"
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
              <AlertDialogDescription>
                {deal.company} and its activity history will be removed for the whole team.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  remove.mutate(deal.id, {
                    onSuccess: () => {
                      toast.success("Deal deleted");
                      onClose();
                    },
                  })
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close panel"
          onClick={onClose}
          className="text-muted-foreground"
        >
          <PanelRightClose />
        </Button>
      </header>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-6 pb-10">
        <section className="border-b border-border py-6">
          <h3 className="mb-3 text-[15px] font-medium">Deal details</h3>
          <div className="grid grid-cols-[148px_1fr] gap-y-1">
            <Row icon={<Building2 />} label="Company">
              <InlineText
                value={deal.company}
                onSave={(v) => v.trim() && save({ company: v.trim() })}
                ariaLabel="Company"
              />
            </Row>
            <Row icon={<IndianRupee />} label="Est. fee">
              <div className="flex w-full items-center gap-2">
                <InlineText
                  type="number"
                  value={String(deal.value)}
                  onSave={(v) => save({ value: Math.max(0, Number(v) || 0) })}
                  ariaLabel="Estimated fee"
                  className="tabular"
                />
                <span className="tabular shrink-0 text-xs text-muted-foreground">
                  {formatMoney(deal.value, true)}
                </span>
              </div>
            </Row>
            <Row icon={<RouteIcon />} label="Stage">
              <Select value={deal.stage} onValueChange={(v) => save({ stage: v })}>
                <SelectTrigger className={selectTrigger} aria-label="Stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <StageIcon stage={s.id} />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<CalendarCheck />} label="Follow-up on">
              <InlineText
                type="date"
                value={deal.follow_up_date ?? ""}
                onSave={(v) => save({ follow_up_date: v || null })}
                ariaLabel="Follow-up date"
              />
            </Row>
            <Row icon={<Footprints />} label="Next step">
              <InlineText
                value={deal.next_step}
                onSave={(v) => save({ next_step: v })}
                placeholder="e.g. Send fee proposal"
                ariaLabel="Next step"
              />
            </Row>
            <Row icon={<CircleUserRound />} label="Assigned to">
              <Select
                value={deal.owner_id ?? "none"}
                onValueChange={(v) => save({ owner_id: v === "none" ? null : v })}
              >
                <SelectTrigger className={selectTrigger} aria-label="Assigned to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <PersonAvatar
                          name={p.full_name || p.email}
                          seed={p.id}
                          size="sm"
                          className="size-5 ring-0"
                        />
                        {p.full_name || p.email}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<Signal />} label="Priority">
              <Select value={deal.priority} onValueChange={(v) => save({ priority: v })}>
                <SelectTrigger className={selectTrigger} aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <PriorityPill priority={p.id} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<Megaphone />} label="Lead source">
              <Select value={deal.source} onValueChange={(v) => save({ source: v })}>
                <SelectTrigger className={selectTrigger} aria-label="Lead source">
                  <SelectValue placeholder="Where did it come from?" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<Briefcase />} label="Hiring type">
              <Select value={deal.service} onValueChange={(v) => save({ service: v })}>
                <SelectTrigger className={selectTrigger} aria-label="Hiring type">
                  <SelectValue placeholder="Permanent, contract…" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row icon={<Hash />} label="Open roles">
              <InlineText
                type="number"
                value={String(deal.openings)}
                onSave={(v) => save({ openings: Math.max(0, Math.round(Number(v) || 0)) })}
                ariaLabel="Number of open roles"
                className="tabular"
              />
            </Row>
            <Row icon={<History />} label="Last interaction">
              <span className="text-sm">
                {lastTouch
                  ? formatDistanceToNow(parseISO(lastTouch.created_at), { addSuffix: true })
                  : "No activity yet"}
              </span>
            </Row>
            <Row icon={<CalendarPlus />} label="Added on">
              <span className="text-sm">{format(parseISO(deal.created_at), "d MMMM yyyy")}</span>
            </Row>
          </div>
        </section>

        <section className="border-b border-border py-6">
          <h3 className="mb-3 text-[15px] font-medium">Main contact</h3>
          <div className="rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <PersonAvatar
                name={deal.contact_name || "?"}
                seed={deal.contact_name + deal.company}
                size="lg"
                className="ring-0"
              />
              <div className="min-w-0 flex-1">
                <InlineText
                  value={deal.contact_name}
                  onSave={(v) => save({ contact_name: v })}
                  placeholder="Contact name"
                  ariaLabel="Contact name"
                  className="font-medium"
                />
                <InlineText
                  value={deal.contact_role}
                  onSave={(v) => save({ contact_role: v })}
                  placeholder="Job title"
                  ariaLabel="Contact job title"
                  className="text-[13px] text-muted-foreground"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                asChild={!!deal.contact_email}
                disabled={!deal.contact_email}
                aria-label="Email contact"
              >
                {deal.contact_email ? (
                  <a href={`mailto:${deal.contact_email}`}>
                    <Mail />
                  </a>
                ) : (
                  <Mail />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                asChild={!!deal.contact_phone}
                disabled={!deal.contact_phone}
                aria-label="Call contact"
              >
                {deal.contact_phone ? (
                  <a href={`tel:${deal.contact_phone}`}>
                    <Phone />
                  </a>
                ) : (
                  <Phone />
                )}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-[64px_1fr] items-center gap-y-0.5 border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">Email</span>
              <InlineText
                type="email"
                value={deal.contact_email}
                onSave={(v) => save({ contact_email: v })}
                placeholder="name@company.com"
                ariaLabel="Contact email"
              />
              <span className="text-muted-foreground">Phone</span>
              <InlineText
                type="tel"
                value={deal.contact_phone}
                onSave={(v) => save({ contact_phone: v })}
                placeholder="+91 98765 43210"
                ariaLabel="Contact phone"
              />
            </div>
          </div>
        </section>

        <section className="border-b border-border py-6">
          <h3 className="mb-3 text-[15px] font-medium">Notes</h3>
          <InlineTextarea
            value={deal.notes}
            onSave={(v) => save({ notes: v })}
            placeholder="Hiring plans, fee discussions, who decides…"
          />
        </section>

        <section className="py-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-medium">Recent activity</h3>
            {!logging && (
              <Button variant="chip" size="sm" onClick={() => setLogging(true)}>
                <Zap />
                Log activity
              </Button>
            )}
          </div>

          {logging && (
            <div className="mb-6 rounded-xl border border-border p-3 shadow-card">
              <div className="mb-2 flex gap-1.5">
                {ACTIVITY_TYPES.map((t) => (
                  <Button
                    key={t.id}
                    variant="chip"
                    size="sm"
                    data-active={logType === t.id}
                    onClick={() => setLogType(t.id)}
                  >
                    {ACTIVITY_ICON[t.id]}
                    {t.label}
                  </Button>
                ))}
              </div>
              <Textarea
                autoFocus
                rows={3}
                value={logBody}
                onChange={(e) => setLogBody(e.target.value)}
                placeholder="What happened? e.g. Spoke to HR — 3 roles opening in January"
                className="resize-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setLogging(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submitLog} disabled={!logBody.trim() || log.isPending}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {activities.length === 0 && !logging && (
            <p className="text-sm text-muted-foreground">
              No activity yet. Log your first call or email.
            </p>
          )}

          <ol className="relative">
            {activities.map((a, i) => {
              const isStage = a.type === "stage";
              const [from, to] = isStage ? a.body.split(">") : [];
              return (
                <li key={a.id} className="relative flex gap-3 pb-6">
                  {i < activities.length - 1 && (
                    <span
                      className="absolute left-[17px] top-10 h-[calc(100%-2.5rem)] w-px bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-4",
                      !isStage && "bg-link/10 text-link",
                    )}
                  >
                    {ACTIVITY_ICON[a.type] ?? <StickyNote />}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm">
                      <span className="font-medium">{nameOf(a.created_by)}</span>{" "}
                      {isStage ? (
                        <>
                          moved this from {stageLabel(from ?? "")} to{" "}
                          <span className="font-medium">{stageLabel(to ?? "")}</span>
                        </>
                      ) : (
                        (ACTIVITY_VERB[a.type] ?? "added an update")
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(parseISO(a.created_at), "d MMM yyyy, h:mm a")}
                    </p>
                    {!isStage && a.body && (
                      <div className="mt-2 whitespace-pre-wrap rounded-xl border border-border px-3.5 py-2.5 text-sm leading-relaxed shadow-card">
                        {a.body}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </aside>
  );
}
