import { Video, MapPin, Calendar, Clock, FileText, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Appointment } from "@/hooks/doctor/use-doctor-appointment";
import { STATUS_STYLES, STATUS_DOT, type UIStatus } from "./types";
import { fmtDate, fmtTime, apptLabel, statusLabel } from "./helpers";

interface Props {
  appt: Appointment;
  onStart: (appt: Appointment) => void;
  onRejoin: (appt: Appointment) => void;
  onView: (appt: Appointment) => void;
  hasNotes: boolean;
}

export function AppointmentCard({ appt, onStart, onRejoin, onView, hasNotes }: Props) {
  const status      = appt.status as UIStatus;
  const canStart    = status === "confirmed" || status === "pending";
  const isInProgress = status === "in_progress";

  return (
    <div className="bg-card border border-border/70 rounded-sm p-3.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10">
        {appt.patient?.name?.slice(0, 2).toUpperCase() || "PT"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-foreground">{apptLabel(appt)}</span>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium border", STATUS_STYLES[status])}>
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[status])} />
            {statusLabel(status)}
          </Badge>
          {hasNotes && (
            <span className="text-[9px] text-emerald-600 dark:text-emerald-500 flex items-center gap-0.5">
              <FileText className="h-2.5 w-2.5" />notes
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-1">
          {appt.type === "online"
            ? <Video className="h-3 w-3 text-sky-500" />
            : <MapPin className="h-3 w-3 text-amber-500" />}
          {appt.type === "online" ? "Video consult" : "In-person"}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-[11px] font-medium text-foreground flex items-center justify-end gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground/50" />
            {fmtDate(appt.appointment_date)}
          </p>
          <p className="text-[10px] text-muted-foreground/70 flex items-center justify-end gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {fmtTime(appt.appointment_time)}
          </p>
        </div>

        <button
          onClick={() => onView(appt)}
          className="h-7 w-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/30 transition-colors"
          title="View details"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>

        {/* Rejoin — in_progress only */}
        {isInProgress && (
          <Button
            size="sm"
            onClick={() => onRejoin(appt)}
            className="h-7 px-3 text-[10px] font-semibold rounded-sm bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-sm flex items-center gap-1"
          >
            <Video className="h-3 w-3" />
            Rejoin
          </Button>
        )}

        {/* Start — pending / confirmed */}
        {canStart && (
          <Button
            size="sm"
            onClick={() => onStart(appt)}
            className="h-7 px-3 text-[10px] font-semibold rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            Start
          </Button>
        )}

        {/* Notes — completed */}
        {!canStart && !isInProgress && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm"
          >
            Notes
          </Button>
        )}
      </div>
    </div>
  );
}
