import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-md bg-transparent px-2 py-1 -mx-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors hover:bg-accent focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring";

/** Click-to-edit text that saves when you leave the field or press Enter. */
export function InlineText({
  value,
  onSave,
  placeholder,
  className,
  type = "text",
  ariaLabel,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: "text" | "number" | "date" | "email" | "tel";
  ariaLabel?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      type={type}
      aria-label={ariaLabel}
      value={v}
      placeholder={placeholder}
      onChange={(e) => {
        setV(e.target.value);
        if (type === "date") onSave(e.target.value);
      }}
      onBlur={() => {
        if (type !== "date" && v !== value) onSave(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setV(value);
          e.currentTarget.blur();
        }
      }}
      className={cn(base, className)}
    />
  );
}

export function InlineTextarea({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <textarea
      value={v}
      placeholder={placeholder}
      rows={3}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      className={cn(base, "mx-0 resize-none border border-border px-3 py-2 leading-relaxed")}
    />
  );
}
