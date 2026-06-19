import { Video, MapPin, Calendar, Clock, FileText, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Appointment } from "@/hooks/doctor/use-doctor-appointment";
import { STATUS_STYLES, STATUS_DOT, type UIStatus } from "./types";
import { fmtDate, fmtTime, apptLabel, statusLabel } from "./helpers";
import { t } from "i18next";

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
    <div className="bg-card border border-border/70 rounded-md p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      <div className="w-10 h-10 rounded-md bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/10">
        {appt.patient?.name?.slice(0, 2).toUpperCase() || "PT"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{apptLabel(appt)}</span>
          <Badge variant="outline" className={cn("text-xs px-2.5 py-0.5 font-medium border", STATUS_STYLES[status])}>
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", STATUS_DOT[status])} />
            {statusLabel(status)}
          </Badge>
          {hasNotes && (
            <span className="text-xs text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {t("consult.booking.has_notes")}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80 mt-1">
          {appt.type === "online"
            ? <Video className="h-4 w-4 text-sky-500" />
            : <MapPin className="h-4 w-4 text-amber-500" />}
          {appt.type === "online" ? "Video consult" : "In-person"}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-foreground flex items-center justify-end gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground/50" />
            {fmtDate(appt.appointment_date)}
          </p>
          <p className="text-xs text-muted-foreground/70 flex items-center justify-end gap-1.5 mt-1">
            <Clock className="h-4 w-4" />
            {fmtTime(appt.appointment_time)}
          </p>
        </div>

        <button
          onClick={() => onView(appt)}
          className="h-9 w-9 flex items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/30 transition-colors"
          title="View details"
        >
          <Eye className="h-4 w-4" />
        </button>

        {/* Rejoin — in_progress only */}
        {isInProgress && (
          <Button
            size="sm"
            onClick={() => onRejoin(appt)}
            className="h-9 px-4 text-sm font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-sm flex items-center gap-1.5"
          >
            <Video className="h-4 w-4" />
            {t("consult.booking.rejoin")}
          </Button>
        )}

        {/* Start — pending / confirmed */}
        {canStart && (
          <Button
            size="sm"
            onClick={() => onStart(appt)}
            className="h-9 px-4 text-sm font-semibold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {t("consult.booking.start")}
          </Button>
        )}

        {/* Notes — completed */}
        {!canStart && !isInProgress && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md"
          >
            {t("consult.booking.notes")}
          </Button>
        )}
      </div>
    </div>
  );
}
