import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: "primary" | "info" | "warning" | "success";
}

export const StatCard = ({
  label,
  value,
  icon: Icon,
  accent = "primary",
}: StatCardProps) => {
  const accentMap = {
    primary: "bg-primary/10 text-primary border-primary/20",
    info: "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
    warning: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    success: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  };

  return (
    <div className="rounded-sm border border-border/70 bg-card p-3 shadow-sm hover:shadow transition-all duration-150">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">
            {label}
          </p>
          <p className="mt-1 text-base font-bold tabular-nums text-foreground">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "h-7 w-7 rounded-sm flex items-center justify-center shrink-0 border",
              accentMap[accent],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );
};
