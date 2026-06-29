import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PatientStatTone = "primary" | "emerald" | "amber" | "sky" | "red" | "violet" | "slate";

export interface PatientStatItem {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: PatientStatTone;
}

const TONE_CLASS: Record<PatientStatTone, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  sky: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  red: "bg-red-500/10 text-red-600 border-red-500/20",
  violet: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  slate: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export function PatientStatsGrid({ items }: { items: PatientStatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        const tone = item.tone ?? "primary";
        return (
          <div
            key={item.label}
            className="rounded-[6px] border border-border/70 bg-card p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2  leading-none font-bold text-foreground text-sm">
                  {item.value}
                </p>
                {item.helper && (
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">
                    {item.helper}
                  </p>
                )}
              </div>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border", TONE_CLASS[tone])}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
