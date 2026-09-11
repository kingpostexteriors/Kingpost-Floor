import { cn } from "@/lib/utils";

export function Meter({
  label,
  value,
  max,
  unit,
  warnAt,
  hotAt,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  warnAt?: number;
  hotAt?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const tone =
    hotAt && value >= hotAt ? "bg-danger" : warnAt && value >= warnAt ? "bg-warn" : "bg-copper";
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">{label}</span>
        <span className="tabular font-sans text-sm text-fg">
          {value.toFixed(unit === "°C" || unit === "%" ? 0 : 1)}
          {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
