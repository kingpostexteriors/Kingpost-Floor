import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  children,
}: {
  className?: string;
  tone?: "muted" | "ok" | "warn" | "danger" | "live";
  children: ReactNode;
}) {
  const tones = {
    muted: "text-muted border-border",
    ok: "text-ok border-ok/40",
    warn: "text-warn border-warn/40",
    danger: "text-danger border-danger/40",
    live: "text-copper border-copper/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-sans text-[0.62rem] tracking-[0.14em] uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
