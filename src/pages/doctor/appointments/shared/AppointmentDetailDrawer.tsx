import {
  Video, MapPin, Calendar, Clock, X, FileText, Timer,
  UserCheck, Shield, CreditCard, Building2, AlertTriangle,
  CheckCircle2, CheckCheck, Loader2, Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Appointment } from "@/hooks/doctor/use-doctor-appointment";
import { STATUS_STYLES, STATUS_DOT, type UIStatus } from "./types";
import { fmtDate, fmtDateTime, fmtTime, fmtRelative, apptLabel, statusLabel, getErrMsg } from "./helpers";
import { toast } from "sonner";

// ─── Detail row ───────────────────────────────────────────────────────────────

export function DetailRow({
  label, value, icon, className,
}: { label: string; value: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-b-0", className)}>
      <div className="flex items-center gap-2 shrink-0">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

// ─── AppointmentDetailDrawer ──────────────────────────────────────────────────

interface Props {
  appt: Appointment;
  onClose: () => void;
  onStart: (appt: Appointment) => void;
  onRejoin: (appt: Appointment) => void;
  onRunningLate: (appt: Appointment) => void;
  onReadyNext: (appt: Appointment) => void;
  isReadyNextPending: boolean;
  isJoining?: boolean;
}

export function AppointmentDetailDrawer({
  appt, onClose, onStart, onRejoin, onRunningLate, onReadyNext, isReadyNextPending, isJoining,
}: Props) {
  const status = appt.status as UIStatus;
  const canStart = status === "confirmed" || status === "pending";
  const isInProgress = status === "in_progress";

  type ExtendedAppointment = Appointment & {
    duration_minutes?: string;
    consultation_fee?: string;
    patient_pays?: string;
    insurance_covered?: string;
    currency?: string;
    payment_status?: string;
    payment_method?: string;
    payment_reference?: string;
    paid_at?: string;
    daily_room_name?: string;
    daily_room_url?: string;
    session_started_at?: string;
    session_ended_at?: string;
    is_running_late?: boolean;
    estimated_delay_minutes?: string;
    completed_at?: string;
    created_at?: string;
  };

  const raw = appt as ExtendedAppointment;

  const formatPaymentMethod = (m?: string) => {
    if (!m) return "—";
    return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative flex flex-col bg-card border-l border-border shadow-2xl",
        "w-full max-w-md h-full overflow-hidden",
        "animate-in slide-in-from-right duration-300",
      )}>
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60 bg-card shrink-0">
          <div className="h-10 w-10 rounded-[6px] bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/10">
            {appt.patient?.name?.slice(0, 2).toUpperCase() || "PT"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{apptLabel(appt)}</p>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className={cn("text-xs px-2.5 py-0.5 font-medium border", STATUS_STYLES[status])}>
                <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", STATUS_DOT[status])} />
                {statusLabel(status)}
              </Badge>
              <span className="text-xs text-muted-foreground">#{appt.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-[6px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-5 py-3 border-b border-border/40 bg-secondary/20 flex items-center gap-3 flex-wrap shrink-0">
          {canStart && (
            <Button
              size="sm"
              onClick={() => { onStart(appt); onClose(); }}
              disabled={isJoining}
              className="h-9 px-4 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] shadow-sm flex items-center gap-2"
            >
              {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Start session
            </Button>
          )}

          {/* ── REJOIN button: only for in_progress ── */}
          {isInProgress && (
            <Button
              size="sm"
              onClick={() => { onRejoin(appt); onClose(); }}
              disabled={isJoining}
              className="h-9 px-4 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-[6px] shadow-sm flex items-center gap-2 border-0"
            >
              {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Rejoin session
            </Button>
          )}

          {isInProgress && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRunningLate(appt)}
                className="h-9 px-4 text-sm font-medium rounded-[6px] border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2"
              >
                <Timer className="h-4 w-4" />Running late
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReadyNext(appt)}
                disabled={isReadyNextPending}
                className="h-9 px-4 text-sm font-medium rounded-[6px] border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2"
              >
                {isReadyNextPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                Ready for next
              </Button>
            </>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Appointment info */}
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />Appointment
            </p>
            <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
              <DetailRow label="Date" value={fmtDate(appt.appointment_date)} icon={<Calendar className="h-4 w-4" />} />
              <DetailRow label="Time" value={fmtTime(appt.appointment_time)} icon={<Clock className="h-4 w-4" />} />
              {raw.duration_minutes && (
                <DetailRow label="Duration" value={`${raw.duration_minutes} min`} icon={<Timer className="h-4 w-4" />} />
              )}
              <DetailRow label="Type" value={
                <span className="inline-flex items-center gap-1.5">
                  {appt.type === "online"
                    ? <><Video className="h-4 w-4 text-sky-500" />Video consult</>
                    : <><MapPin className="h-4 w-4 text-amber-500" />In-person</>}
                </span>
              } />
              <DetailRow label="Booking type" value={<span className="capitalize">{appt.booking_type}</span>} />
              {raw.is_running_late && (
                <DetailRow label="Running late" value={
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />{raw.estimated_delay_minutes ?? 0}min delay
                  </span>
                } />
              )}
            </div>
          </div>

          {/* Patient */}
          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4" />Patient
            </p>
            <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
              <DetailRow label="Name" value={appt.patient?.name ?? "—"} />
              <DetailRow label="Email" value={appt.patient?.email ?? "—"} />
              <DetailRow label="Phone" value={appt.patient?.phone ?? "—"} />
            </div>
          </div>

          {/* Hospital */}
          {appt.hospital && (
            <div className="px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />Hospital
              </p>
              <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
                <DetailRow label="Name" value={appt.hospital.name} />
                {appt.hospital.address && <DetailRow label="Address" value={appt.hospital.address} />}
              </div>
            </div>
          )}

          {/* Insurance */}
          {appt.insurance && (
            <div className="px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />Insurance
              </p>
              <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
                <DetailRow label="Provider" value={
                  <span className="flex items-center gap-2">
                    {(appt.insurance as Appointment["insurance"] & { logo?: string })?.logo && (
                      <img src={(appt.insurance as Appointment["insurance"] & { logo?: string }).logo} alt="" className="h-5 w-5 rounded object-contain" />
                    )}
                    {(appt.insurance as Appointment["insurance"] & { name?: string })?.name ?? appt.insurance.provider ?? "—"}
                  </span>
                } />
                {appt.insurance.policy_number && <DetailRow label="Policy #" value={appt.insurance.policy_number} />}
                {(appt.insurance as Appointment["insurance"] & { coverage_percentage?: string })?.coverage_percentage && (
                  <DetailRow label="Coverage" value={`${(appt.insurance as Appointment["insurance"] & { coverage_percentage?: string }).coverage_percentage}%`} />
                )}
              </div>
            </div>
          )}

          {/* Payment */}
          {(raw.consultation_fee !== undefined || raw.payment_status) && (
            <div className="px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />Payment
              </p>
              <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
                {raw.consultation_fee !== undefined && (
                  <DetailRow label="Consultation fee" value={`${raw.consultation_fee} ${raw.currency ?? ""}`} />
                )}
                {raw.insurance_covered !== undefined && (
                  <DetailRow label="Insurance covered" value={`${raw.insurance_covered} ${raw.currency ?? ""}`} />
                )}
                {raw.patient_pays !== undefined && (
                  <DetailRow label="Patient pays" value={
                    <span className="font-semibold text-foreground">{raw.patient_pays} {raw.currency ?? ""}</span>
                  } />
                )}
                {raw.payment_status && (
                  <DetailRow label="Payment status" value={
                    <span className={cn("inline-flex items-center gap-1.5 capitalize",
                      raw.payment_status === "paid" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    )}>
                      {raw.payment_status === "paid" && <CheckCircle2 className="h-4 w-4" />}
                      {raw.payment_status}
                    </span>
                  } />
                )}
                {raw.payment_method && <DetailRow label="Method" value={formatPaymentMethod(raw.payment_method)} />}
                {raw.payment_reference && (
                  <DetailRow label="Reference" value={<span className="font-mono text-xs">{raw.payment_reference}</span>} />
                )}
                {raw.paid_at && <DetailRow label="Paid at" value={fmtDateTime(raw.paid_at)} />}
              </div>
            </div>
          )}

          {/* Session */}
          {(raw.session_started_at || raw.daily_room_name) && (
            <div className="px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
                <Video className="h-4 w-4" />Session
              </p>
              <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
                {raw.daily_room_name && (
                  <DetailRow label="Room" value={<span className="font-mono text-xs truncate max-w-[200px]">{raw.daily_room_name}</span>} />
                )}
                {raw.session_started_at && (
                  <DetailRow label="Started" value={
                    <span>
                      {fmtDateTime(raw.session_started_at)}
                      <span className="text-muted-foreground ml-1.5 text-xs">({fmtRelative(raw.session_started_at)})</span>
                    </span>
                  } />
                )}
                {raw.session_ended_at && <DetailRow label="Ended" value={fmtDateTime(raw.session_ended_at)} />}
              </div>
            </div>
          )}

          {/* Notes */}
          {appt.notes && (
            <div className="px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />Clinical notes
              </p>
              <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
                {appt.notes.chief_complaint && <DetailRow label="Chief complaint" value={appt.notes.chief_complaint} />}
                {appt.notes.diagnosis && <DetailRow label="Diagnosis" value={appt.notes.diagnosis} />}
                {appt.notes.treatment_plan && <DetailRow label="Treatment plan" value={appt.notes.treatment_plan} />}
                {appt.notes.blood_pressure && <DetailRow label="Blood pressure" value={appt.notes.blood_pressure} />}
                {appt.notes.temperature && <DetailRow label="Temperature" value={appt.notes.temperature} />}
                {appt.notes.pulse_rate && <DetailRow label="Pulse rate" value={appt.notes.pulse_rate} />}
                {appt.notes.follow_up_date && <DetailRow label="Follow-up" value={fmtDate(appt.notes.follow_up_date)} />}
              </div>
            </div>
          )}

          <div className="px-5 pt-3 pb-6">
            <p className="text-xs text-muted-foreground/50 text-center">
              Created {fmtRelative(raw.created_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
