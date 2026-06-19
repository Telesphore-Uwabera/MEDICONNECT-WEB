import { cn } from "@/lib/utils";

export function PanelLoading({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("space-y-4 py-2 animate-pulse w-full", className)}>
      {label && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
          {label}
        </div>
      )}
      <div className="space-y-2.5">
        <div className="h-3 w-1/4 bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
      <div className="space-y-2.5">
        <div className="h-3 w-1/3 bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
      </div>
      <div className="space-y-2.5">
        <div className="h-3 w-1/5 bg-muted rounded" />
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>
    </div>
  );
}
