// ─────────────────────────────────────────────────────────────────────────────
// StepSaveStatusBadge
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { StepSaveState } from "./Types";

interface StepSaveStatusBadgeProps {
  state: StepSaveState;
}

export const StepSaveStatusBadge = React.memo(function StepSaveStatusBadge({
  state,
}: StepSaveStatusBadgeProps) {
  if (state === "idle") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
        state === "saving" && "bg-muted text-muted-foreground",
        state === "saved"  && "bg-primary/15 text-primary",
        state === "error"  && "bg-destructive/15 text-destructive",
        state === "dirty"  && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      )}
    >
      {state === "saving" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {state === "saved"  && <Check className="h-2.5 w-2.5" />}
      {state === "error"  && <AlertCircle className="h-2.5 w-2.5" />}
      {state === "dirty"  && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      {state === "saving"
        ? "Saving…"
        : state === "saved"
        ? "Saved"
        : state === "error"
        ? "Error"
        : "Unsaved"}
    </span>
  );
});
