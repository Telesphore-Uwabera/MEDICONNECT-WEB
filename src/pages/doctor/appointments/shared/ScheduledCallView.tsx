import { useState, useEffect } from "react";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallStore } from "@/context/CallStore";
import { AppointmentNotesPanel } from "@/components/AppointmentNotesPanel";
import { ActiveCallPanel } from "./ActiveCallPanel";
import { fmt, fmtDate, fmtTime } from "./helpers";

interface Props {
  onExit: () => void;
}

export function ScheduledCallView({ onExit }: Props) {
  const call = useCallStore();
  const [notesOpen, setNotesOpen] = useState(true);
  const appt = call.activeAppointment;

  useEffect(() => {
    if (call.phase === "ended") {
      const t = setTimeout(onExit, 1800);
      return () => clearTimeout(t);
    }
  }, [call.phase, onExit]);

  if (!appt) return null;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-card/50 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[12px] font-semibold text-foreground shrink-0">{appt.patientLabel}</span>
            <span className="text-[11px] text-muted-foreground truncate">
              — {appt.specialty} · {fmtDate(appt.date)} {fmtTime(appt.time)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {fmt(call.elapsed)}
            </span>
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors",
                notesOpen
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              {notesOpen ? "Hide notes" : "Notes"}
            </button>
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Back
            </button>
          </div>
        </div>

        {/* Call panel */}
        <div className="flex-1 min-h-0 p-4">
          <ActiveCallPanel />
        </div>
      </div>

      {/* Notes sidebar */}
      {notesOpen && (
        <div className="w-80 flex-shrink-0 border-l border-border overflow-hidden flex flex-col">
          <AppointmentNotesPanel appt={appt} onClose={() => setNotesOpen(false)} />
        </div>
      )}
    </div>
  );
}
