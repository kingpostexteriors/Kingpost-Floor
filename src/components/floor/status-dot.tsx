import { cn } from "@/lib/utils";
import type { AgentStatus, ShopMode } from "@/lib/floor/types";

const map: Record<AgentStatus | ShopMode, string> = {
  idle: "bg-ok",
  working: "bg-copper",
  held: "bg-warn",
  offline: "bg-subtle",
  open: "bg-ok",
  closed: "bg-subtle",
  kid: "bg-warn",
  night: "bg-subtle",
  creed: "bg-copper",
};

export function StatusDot({
  status,
  pulse,
}: {
  status: AgentStatus | ShopMode;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full",
        map[status],
        pulse && status === "working" && "animate-pulse",
      )}
      aria-hidden
    />
  );
}
