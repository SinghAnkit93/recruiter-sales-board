// Pure sales-pipeline rules shared by the board UI and tests. No I/O here.

export const STAGES = [
  { id: "lead", label: "New Lead", hint: "Companies worth approaching", progress: 0 },
  {
    id: "contacted",
    label: "Contacted",
    hint: "Reached out — waiting for a reply",
    progress: 0.25,
  },
  {
    id: "discovery",
    label: "Discovery Call",
    hint: "Meeting to learn their hiring needs",
    progress: 0.5,
  },
  {
    id: "proposal",
    label: "Proposal Sent",
    hint: "Fee terms shared — negotiating",
    progress: 0.75,
  },
  { id: "won", label: "Won", hint: "Terms signed, roles received", progress: 1 },
  { id: "lost", label: "Lost", hint: "Not now — revisit later", progress: -1 },
] as const;

export type StageId = (typeof STAGES)[number]["id"];
export const STAGE_IDS = STAGES.map((s) => s.id) as StageId[];

export const PRIORITIES = [
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
] as const;
export type PriorityId = (typeof PRIORITIES)[number]["id"];

export const SOURCES = [
  "LinkedIn",
  "Referral",
  "Cold call",
  "Email campaign",
  "Inbound / website",
  "Event",
  "Existing client",
] as const;

export const SERVICES = ["Permanent", "Contract / Temp", "Executive search", "RPO"] as const;

export const ACTIVITY_TYPES = [
  { id: "call", label: "Call" },
  { id: "email", label: "Email" },
  { id: "meeting", label: "Meeting" },
  { id: "note", label: "Note" },
] as const;
export type ActivityTypeId = (typeof ACTIVITY_TYPES)[number]["id"] | "stage";

export function stageLabel(id: string): string {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}

export function isClosed(stage: string): boolean {
  return stage === "won" || stage === "lost";
}

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type FollowUpStatus = "overdue" | "today" | "upcoming" | "none";

/** Follow-ups only matter on open deals. Dates are YYYY-MM-DD strings. */
export function followUpStatus(
  deal: { stage: string; follow_up_date: string | null },
  today: string,
): FollowUpStatus {
  if (isClosed(deal.stage) || !deal.follow_up_date) return "none";
  if (deal.follow_up_date < today) return "overdue";
  if (deal.follow_up_date === today) return "today";
  return "upcoming";
}

export interface PipelineSummary {
  openValue: number;
  openCount: number;
  wonValue: number;
  wonCount: number;
  dueCount: number;
  winRate: number | null;
}

export function summarize(
  deals: { stage: string; value: number; follow_up_date: string | null }[],
  today: string,
): PipelineSummary {
  let openValue = 0;
  let openCount = 0;
  let wonValue = 0;
  let wonCount = 0;
  let lostCount = 0;
  let dueCount = 0;
  for (const d of deals) {
    const value = Number(d.value) || 0;
    if (d.stage === "won") {
      wonValue += value;
      wonCount++;
    } else if (d.stage === "lost") {
      lostCount++;
    } else {
      openValue += value;
      openCount++;
    }
    const s = followUpStatus(d, today);
    if (s === "overdue" || s === "today") dueCount++;
  }
  const closed = wonCount + lostCount;
  return {
    openValue,
    openCount,
    wonValue,
    wonCount,
    dueCount,
    winRate: closed === 0 ? null : Math.round((wonCount / closed) * 100),
  };
}

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const inrFull = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number, compact = false): string {
  return (compact ? inrCompact : inrFull).format(Number(value) || 0);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const AVATAR_TONES = [
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
] as const;

export function toneFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length] ?? "bg-avatar-6";
}
