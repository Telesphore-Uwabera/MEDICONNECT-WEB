// Patient — read-only consultation summary for an instant consultation.
// Opened from the instant list "Details" action.

import { useEffect } from "react";
import { X, Loader2, ClipboardList, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatientInstantSummary } from "@/hooks/patient/use-patient-consultation-summary";
import { SummaryDetails } from "@/components/consultatioRoom/SummaryDetails";
import { openSummaryDocument } from "@/lib/summary-document";

export function InstantSummaryModal({
  instantId,
  onClose,
}: {
  instantId: string | null;
  onClose: () => void;
}) {
  const isOpen = !!instantId;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg max-h-[88vh] flex flex-col rounded-[6px] border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-[6px] bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">Consultation summary</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Notes from your instant consultation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "h-8 w-8 rounded-[6px] flex items-center justify-center text-muted-foreground",
              "hover:bg-muted hover:text-foreground transition-colors",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <InstantSummaryBody instantId={instantId!} />
        </div>
      </div>
    </div>
  );
}

function InstantSummaryBody({ instantId }: { instantId: string }) {
  const { data, isLoading, isError } = usePatientInstantSummary(instantId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading summary…
      </div>
    );
  }
  if (isError || !data?.summary) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No consultation summary was recorded for this consultation yet.
      </p>
    );
  }

  const summary = data.summary;

  return (
    <div className="space-y-3">
      <SummaryDetails summary={summary} />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => openSummaryDocument(summary)}
          className="h-9 px-3 rounded-[6px] border border-border text-[12px] font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2"
        >
          <Eye className="h-4 w-4" /> View document
        </button>
        <button
          onClick={() => openSummaryDocument(summary, true)}
          className="h-9 px-3 rounded-[6px] border border-border text-[12px] font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>
    </div>
  );
}
