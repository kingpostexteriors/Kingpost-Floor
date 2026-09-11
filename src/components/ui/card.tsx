import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4 shadow-panel sm:p-5",
        className,
      )}
      {...props}
    />
  );
}
