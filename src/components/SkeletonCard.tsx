import { cn } from "@/lib/utils";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 animate-pulse space-y-3 shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-sm bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 bg-muted rounded" />
          <div className="h-2.5 w-1/4 bg-muted rounded" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-2.5 w-full bg-muted rounded" />
        <div className="h-2.5 w-5/6 bg-muted rounded" />
        <div className="h-2.5 w-4/6 bg-muted rounded" />
      </div>
    </div>
  );
}
