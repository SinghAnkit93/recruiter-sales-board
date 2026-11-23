import { cn } from "@/lib/utils";
import type { StageId } from "@/lib/pipeline";

export const STAGE_TEXT: Record<StageId, string> = {
  lead: "text-stage-lead",
  contacted: "text-stage-contacted",
  discovery: "text-stage-discovery",
  proposal: "text-stage-proposal",
  won: "text-stage-won",
  lost: "text-stage-lost",
};

/** Progress ring like a status indicator: dashed → quarter → half → three-quarter → done. */
export function StageIcon({ stage, className }: { stage: string; className?: string }) {
  const id = (stage in STAGE_TEXT ? stage : "lead") as StageId;
  const color = STAGE_TEXT[id];
  const r = 6.25;
  const pieR = 2.25;
  const c = 2 * Math.PI * pieR;
  const progress = { lead: 0, contacted: 0.25, discovery: 0.5, proposal: 0.75, won: 1, lost: 1 }[
    id
  ];

  if (id === "won" || id === "lost") {
    return (
      <svg
        viewBox="0 0 16 16"
        className={cn("size-4 shrink-0", color, className)}
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        {id === "won" ? (
          <path
            d="M5 8.2l2 2 4-4.2"
            fill="none"
            stroke="var(--color-background)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5"
            fill="none"
            stroke="var(--color-background)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className={cn("size-4 shrink-0", color, className)} aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={progress === 0 ? "1.6 1.9" : undefined}
      />
      {progress > 0 && (
        <circle
          cx="8"
          cy="8"
          r={pieR}
          fill="none"
          stroke="currentColor"
          strokeWidth={pieR * 2}
          strokeDasharray={`${c * progress} ${c}`}
          transform="rotate(-90 8 8)"
        />
      )}
    </svg>
  );
}
