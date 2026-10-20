import { Video, MapPin, Calendar, Clock, FileText, Eye, Mail, Phone, CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Appointment, useConfirmAppointment } from "@/hooks/doctor/use-doctor-appointment";
import { STATUS_STYLES, STATUS_DOT, type UIStatus } from "./types";
import { fmtDate, fmtTime, apptLabel, statusLabel, getErrMsg } from "./helpers";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface Props {
  appt: Appointment;
  onStart: (appt: Appointment) => void;
  onRejoin: (appt: Appointment) => void;
  onView: (appt: Appointment) => void;
  hasNotes: boolean;
}

export function AppointmentCard({ appt, onStart, onRejoin, onView, hasNotes }: Props) {
  const { t } = useTranslation();
  const confirmAppointment = useConfirmAppointment();
  const status = appt.status as UIStatus;
  const canStart = status === "confirmed";
  const isInProgress = status === "in_progress";

  type ExtendedAppointment = Appointment & {
    consultation_fee?: string;
    patient_pays?: string;
    currency?: string;
    payment_status?: string;
  };
  const raw = appt as ExtendedAppointment;
  const fee = Number(raw.patient_pays || raw.consultation_fee || 0);
  const currency = raw.currency || "RWF";
  const isPaid = String(raw.payment_status || "").toLowerCase() === "paid" || !(fee > 0);
  const canConfirm = status === "pending" && isPaid;

  const patientEmail = appt.patient?.email?.trim();
  const patientPhone = appt.patient?.phone?.trim();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView(appt)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onView(appt); }}
      className="bg-card border border-border/70 rounded-[6px] p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
    >
      <div className="w-10 h-10 rounded-[6px] bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/10">
        {appt.patient?.name?.slice(0, 2).toUpperCase() || "PT"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{apptLabel(appt)}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-muted/60 border border-border/50 text-[10px] font-mono font-semibold text-muted-foreground">
            #{appt.id}
          </span>
          <Badge variant="outline" className={cn("text-xs px-2.5 py-0.5 font-medium border", STATUS_STYLES[status])}>
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", STATUS_DOT[status])} />
            {statusLabel(status, t)}
          </Badge>
          {hasNotes && (
            <span className="text-xs text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {t("consult.booking.has_notes")}
            </span>
          )}
        </div>

        {/* Patient contact info & fee */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground/80 mt-1.5">
          <span className="inline-flex items-center gap-1">
            {appt.type === "online"
              ? <Video className="h-3.5 w-3.5 text-sky-500" />
              : <MapPin className="h-3.5 w-3.5 text-amber-500" />}
            {appt.type === "online" ? t("pages.doctor.video_consult") : t("pages.doctor.in_person")}
          </span>

          {patientEmail && (
            <span className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span className="truncate max-w-[180px]">{patientEmail}</span>
            </span>
          )}

          {patientPhone && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>{patientPhone}</span>
            </span>
          )}

          {fee > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground/90">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>{Math.round(fee).toLocaleString()} {currency}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
          className="h-9 w-9 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/30 transition-colors"
          title={t("pages.doctor.view_details")}
        >
          <Eye className="h-4 w-4" />
        </button>

        {/* Rejoin — in_progress only */}
        {isInProgress && (
          <Button
            size="sm"
            onClick={() => onRejoin(appt)}
            className="h-9 px-4 text-sm font-semibold rounded-[6px] bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-sm flex items-center gap-1.5"
          >
            <Video className="h-4 w-4" />
            {t("consult.booking.rejoin")}
          </Button>
        )}

        {/* Start — confirmed only */}
        {canStart && (
          <Button
            size="sm"
            onClick={() => onStart(appt)}
            className="h-9 px-4 text-sm font-semibold rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {t("consult.booking.start")}
          </Button>
        )}

        {/* Pending: Confirm appointment if paid; otherwise Awaiting payment */}
        {status === "pending" && canConfirm && (
          <Button
            size="sm"
            onClick={() => confirmAppointment.mutate(appt.id, {
              onSuccess: () => toast.success(t("pages.doctor.confirm_appointment", { defaultValue: "Appointment confirmed" })),
              onError: (err: unknown) => toast.error(getErrMsg(err, t("pages.doctor.confirm_failed", { defaultValue: "Failed to confirm appointment" }))),
            })}
            disabled={confirmAppointment.isPending}
            className="h-9 px-4 text-sm font-semibold rounded-[6px] bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5"
          >
            {confirmAppointment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {t("pages.doctor.confirm_appointment", { defaultValue: "Confirm appointment" })}
          </Button>
        )}

        {status === "pending" && !canConfirm && (
          <span className="h-9 px-3 rounded-[6px] border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 flex items-center">
            {t("pages.doctor.awaiting_payment")}
          </span>
        )}

        {!canStart && !isInProgress && status !== "pending" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView(appt)}
            className="h-9 px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-[6px]"
          >
            {t("consult.booking.notes")}
          </Button>
        )}
      </div>
    </div>
  );
}
