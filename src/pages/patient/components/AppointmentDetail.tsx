import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetPatientAppointment,
  ApiAppointmentStatus,
} from "@/hooks/patient/use-patient-appointment";
import { usePatientAppointmentSummary } from "@/hooks/patient/use-patient-consultation-summary";
import { SummaryDetails } from "@/components/consultatioRoom/SummaryDetails";
import { openSummaryDocument } from "@/lib/summary-document";
import { RichTextRenderer } from "@/components/ui/rich-textarea";
import { apiFetch } from "@/lib/api";
import { useCallContext } from "@/context/CallContext";
import { startInAppCallFromJoin } from "@/lib/scheduled-call";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInvoicePoller } from "@/hooks/patient/use-instant-consultations";
import { toast } from "sonner";
import {
  ArrowLeft,
  Video,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  Shield,
  User,
  Building2,
  FileText,
  Phone,
  Mail,
  Globe,
  Star,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  X,
  Loader2,
  Banknote,
  PhoneCall,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wifi,
  Download,
  Eye,
  CalendarClock,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { TFunction } from "i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayAppointmentResponse {
  message: string;
  invoice_number: string;
  public_key: string;
  amount: number;
  currency: string;
  payment_uuid: string;
}

interface JoinResponse {
  message: string;
  room_url: string;
  room_name: string;
  token: string;
  join_url: string;
}

interface RescheduleResponse {
  message: string;
  appointment: any;
}

// ─── API mutations ────────────────────────────────────────────────────────────

function usePayAppointment(appointmentId: string) {
  return useMutation<PayAppointmentResponse>({
    mutationFn: () =>
      apiFetch(`/patient/appointments/${appointmentId}/pay`, {
        method: "POST",
      }),
  });
}

function useJoinSession(appointmentId: string) {
  return useMutation<JoinResponse>({
    mutationFn: () =>
      apiFetch(`/patient/appointments/${appointmentId}/join`, { method: "POST" }),
  });
}

function useCancelAppointment(appointmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      apiFetch(`/patient/appointments/${appointmentId}`, {
        method: "DELETE",
        body: reason ? JSON.stringify({ reason }) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-appointment", appointmentId] });
      qc.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
  });
}

function useRescheduleAppointment(appointmentId: string) {
  const qc = useQueryClient();
  return useMutation<
    RescheduleResponse,
    unknown,
    { appointment_date: string; appointment_time: string }
  >({
    mutationFn: (payload) =>
      apiFetch(`/patient/appointments/${appointmentId}/reschedule`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-appointment", appointmentId] });
      qc.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
  });
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ApiAppointmentStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  confirmed:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  in_progress:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<ApiAppointmentStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-sky-500",
  in_progress: "bg-violet-500 animate-pulse",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const STATUS_ACCENT: Record<ApiAppointmentStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-sky-500",
  in_progress: "bg-violet-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

function getStatusLabel(t: TFunction, status: ApiAppointmentStatus): string {
  return t(`consult.appointment_detail.status.${status}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str: string) {
  try {
    return format(parseISO(str), "EEEE, MMMM dd, yyyy");
  } catch {
    return str;
  }
}

function formatTime(str: string) {
  try {
    const t = str.length <= 8 ? `2000-01-01T${str}` : str;
    return format(parseISO(t), "hh:mm a");
  } catch {
    return str;
  }
}

function formatCurrency(amount: string, currency: string) {
  const n = parseFloat(amount);
  if (isNaN(n)) return `${amount} ${currency}`;
  return `${n.toLocaleString()} ${currency}`;
}

function prettyEnum(value: string) {
  return value.replace(/_/g, " ");
}

function translateEnum(t: TFunction, prefix: string, value?: string | null) {
  if (!value) return "\u2014";
  const key = value.toLowerCase().replace(/\s+/g, "_");
  return t(`${prefix}.${key}`, { defaultValue: prettyEnum(value) });
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-1.5 text-muted-foreground/50 hover:text-primary transition-colors"
      title={t("consult.appointment_detail.copy")}
      aria-label={t("consult.appointment_detail.copy")}
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/30 last:border-b-0">
      <Icon className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground/70 whitespace-nowrap">{label}</p>
        <p
          className={cn(
            "text-sm text-foreground text-right",
            mono && "font-mono"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/50 rounded-[6px] overflow-hidden bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground/50" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
        )}
      </button>
      {open && <div className="px-4 py-2">{children}</div>}
    </div>
  );
}

// ─── Notes (string OR structured doctor-notes object) ─────────────────────────

function NotesContent({ notes }: { notes: unknown }) {
  const { t } = useTranslation();
  if (!notes) return null;

  // Legacy: a plain string note.
  if (typeof notes === "string") {
    return notes.trim() ? <InfoRow icon={FileText} label={t("consult.appointment_detail.notes")} value={notes} /> : null;
  }
  if (typeof notes !== "object") return null;

  const n = notes as Record<string, unknown>;
  const str = (v: unknown) => (v == null ? "" : String(v));
  const textFields: Array<[string, unknown]> = [
    [t("consult.appointment_detail.chief_complaint"), n.chief_complaint],
    [t("consult.appointment_detail.diagnosis"), n.diagnosis],
    [t("consult.appointment_detail.treatment_plan"), n.treatment_plan],
    [t("consult.appointment_detail.recommendations"), n.recommendations],
    [t("consult.appointment_detail.additional_notes"), n.additional_notes],
    [t("consult.appointment_detail.follow_up_notes"), n.follow_up_notes],
  ].filter(([, v]) => str(v).trim());

  const vitals = [
    n.blood_pressure && t("consult.appointment_detail.vital_bp", { value: str(n.blood_pressure) }),
    n.temperature && t("consult.appointment_detail.vital_temp", { value: str(n.temperature) }),
    n.pulse_rate && t("consult.appointment_detail.vital_pulse", { value: str(n.pulse_rate) }),
    n.weight && t("consult.appointment_detail.vital_weight", { value: str(n.weight) }),
    n.height && t("consult.appointment_detail.vital_height", { value: str(n.height) }),
  ]
    .filter(Boolean)
    .join(" \u00b7 ");

  if (textFields.length === 0 && !vitals) return null;

  return (
    <div className="py-3 space-y-3">
      {textFields.map(([label, v]) => (
        <div key={label} className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {label}
          </p>
          <RichTextRenderer value={str(v)} className="text-sm text-foreground" />
        </div>
      ))}
      {vitals && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {t("consult.appointment_detail.vitals")}
          </p>
          <p className="text-sm text-foreground">{vitals}</p>
        </div>
      )}
    </div>
  );
}

// ─── Consultation summary section ─────────────────────────────────────────────

function SummarySection({ appointmentId }: { appointmentId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = usePatientAppointmentSummary(appointmentId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> {t("consult.appointment_detail.loading_summary")}
      </div>
    );
  }
  if (isError || !data?.summary) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {t("consult.appointment_detail.no_summary")}
      </p>
    );
  }

  const summary = data.summary;

  return (
    <div className="py-2 space-y-3">
      <SummaryDetails summary={summary} />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openSummaryDocument(summary)}
          className="h-9 rounded-[6px] text-sm gap-2"
        >
          <Eye className="w-4 h-4" /> {t("consult.appointment_detail.view_document")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openSummaryDocument(summary, true)}
          className="h-9 rounded-[6px] text-sm gap-2"
        >
          <Download className="w-4 h-4" /> {t("consult.appointment_detail.download_pdf")}
        </Button>
      </div>
    </div>
  );
}

// ─── Cancel Dialog ────────────────────────────────────────────────────────────

function CancelDialog({
  appointmentId,
  onClose,
}: {
  appointmentId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const { mutate, isPending, isSuccess, isError, error } = useCancelAppointment(appointmentId);

  const handleCancel = () => {
    mutate(reason.trim() || undefined, {
      onSuccess: () => setTimeout(onClose, 1500),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm bg-background border border-border/70 rounded-[6px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-base font-semibold">{t("consult.appointment_detail.cancel_title")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("consult.appointment_detail.cancel_desc")}
          </p>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2 block">
              {t("consult.appointment_detail.reason")} <span className="normal-case font-normal">({t("consult.booking.optional")})</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("consult.appointment_detail.cancel_reason_placeholder")}
              rows={3}
              className="w-full rounded-[6px] border border-border/60 bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
            />
          </div>

          {isError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {(error as any)?.message ?? t("consult.appointment_detail.cancel_error")}
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                {t("consult.appointment_detail.cancel_success")}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-10 rounded-[6px] text-sm"
            >
              {t("consult.appointment_detail.keep_it")}
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              disabled={isPending || isSuccess}
              className="flex-1 h-10 rounded-[6px] text-sm font-semibold bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 text-white gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {isPending ? t("consult.appointment_detail.cancelling") : t("consult.appointment_detail.yes_cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reschedule Dialog ────────────────────────────────────────────────────────

function RescheduleDialog({
  appointmentId,
  currentDate,
  currentTime,
  onClose,
}: {
  appointmentId: string;
  currentDate: string;
  currentTime: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState(currentDate?.slice(0, 10) ?? "");
  const [time, setTime] = useState(currentTime?.slice(0, 5) ?? "");
  const { mutate, isPending, isSuccess, isError, error } = useRescheduleAppointment(appointmentId);

  const handleReschedule = () => {
    if (!date || !time) return;
    mutate(
      { appointment_date: date, appointment_time: time },
      { onSuccess: () => setTimeout(onClose, 1500) }
    );
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm bg-background border border-border/70 rounded-[6px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50">
          <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 flex items-center justify-center mb-4">
            <CalendarClock className="w-6 h-6 text-sky-500" />
          </div>
          <p className="text-base font-semibold">{t("consult.appointment_detail.reschedule_title")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("consult.appointment_detail.reschedule_desc")}
          </p>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2 block">
                {t("consult.booking.date")}
              </label>
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-[6px] border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2 block">
                {t("consult.booking.time")}
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-[6px] border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          {isError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {(error as any)?.message ?? t("consult.appointment_detail.reschedule_error")}
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                {t("consult.appointment_detail.reschedule_success")}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-10 rounded-[6px] text-sm"
            >
              {t("consult.connect.close")}
            </Button>
            <Button
              size="sm"
              onClick={handleReschedule}
              disabled={isPending || isSuccess || !date || !time}
              className="flex-1 h-10 rounded-[6px] text-sm font-semibold bg-sky-600 hover:bg-sky-700 border-sky-600 hover:border-sky-700 text-white gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarClock className="w-4 h-4" />
              )}
              {isPending ? t("consult.appointment_detail.rescheduling") : t("consult.appointment_detail.confirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-5 space-y-5 animate-pulse">
      <div className="rounded-[6px] border border-border/50 bg-card p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-44 rounded-full bg-muted" />
            <div className="h-3 w-28 rounded-full bg-muted" />
            <div className="h-5 w-20 rounded-full bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-[6px] bg-muted" />
          ))}
        </div>
        <div className="h-10 rounded-[6px] bg-muted" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="rounded-[6px] border border-border/50 bg-card p-4 space-y-3">
          <div className="h-3 w-24 rounded-full bg-muted" />
          {[0, 1, 2].map((j) => (
            <div key={j} className="flex justify-between">
              <div className="h-2.5 w-24 rounded-full bg-muted" />
              <div className="h-2.5 w-28 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Action Bar ───────────────────────────────────────────────────────────────

function ActionBar({
  appt,
  onPay,
  onJoin,
  onCancel,
  onReschedule,
  joinPending,
  payPending,
}: {
  appt: any;
  onPay: () => void;
  onJoin: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  joinPending: boolean;
  payPending?: boolean;
}) {
  const { t } = useTranslation();
  const status: ApiAppointmentStatus = appt.status;
  const unpaid = appt.payment_status !== "paid" && appt.status == "pending";
  const canJoin = (status === "confirmed" || status === "in_progress") && appt.daily_room_url;
  const canCancel = status === "pending" || status === "confirmed";
  const canPay = unpaid && status !== "cancelled" && status !== "completed";
  const canReschedule =
    appt.payment_status === "paid" && (status === "pending" || status === "confirmed");

  if (!canPay && !canJoin && !canCancel && !canReschedule) return null;

  return (
    <div className="flex gap-3 flex-wrap">
      {canJoin && (
        <Button
          onClick={onJoin}
          disabled={joinPending}
          className="flex-1 h-10 rounded-[6px] text-sm font-semibold gap-2 bg-violet-600 hover:bg-violet-700 border-violet-600 hover:border-violet-700 text-white shadow-sm shadow-violet-500/20"
        >
          {joinPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Video className="w-4 h-4" />
          )}
          {joinPending ? t("consult.appointment_detail.joining") : t("consult.appointment_detail.join_session")}
        </Button>
      )}
      {canPay && (
        <Button
          onClick={onPay}
          disabled={payPending}
          className="flex-1 h-10 rounded-[6px] text-sm font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700 text-white shadow-sm shadow-emerald-500/20"
        >
          {payPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          {payPending ? t("consult.appointment_detail.processing") : t("consult.appointment_detail.pay_now")}
        </Button>
      )}
      {canReschedule && (
        <Button
          variant="outline"
          onClick={onReschedule}
          className="h-10 rounded-[6px] text-sm gap-2 text-sky-600 border-sky-200 dark:border-sky-900 hover:bg-sky-50 dark:hover:bg-sky-950/30 hover:border-sky-300 transition-all"
        >
          <CalendarClock className="w-4 h-4" />
          {t("consult.appointment_detail.reschedule")}
        </Button>
      )}
      {canCancel && (
        <Button
          variant="outline"
          onClick={onCancel}
          className="h-10 rounded-[6px] text-sm gap-2 text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 transition-all"
        >
          <XCircle className="w-4 h-4" />
          {t("consult.appointment_detail.cancel")}
        </Button>
      )}
    </div>
  );
}

// ─── AppointmentDetailContent ─────────────────────────────────────────────────

export function AppointmentDetailContent({
  appointmentId,
  onClose,
}: {
  appointmentId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const invoicePoller = useInvoicePoller();
  const { startCall } = useCallContext();
  const { data, isLoading, isError } = useGetPatientAppointment(appointmentId);

  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  const joinMutation = useJoinSession(appointmentId);
  const payMutation = usePayAppointment(appointmentId);

  const handleJoin = () => {
    joinMutation.mutate(undefined, {
      onSuccess: (res) => {
        console.log("[Appointment] patient join response:", res);
        // If it's our custom WebRTC token, open the in-app ConsultationRoom.
        const started = startInAppCallFromJoin(startCall, res, {
          consultationId: appointmentId,
          isOwner: false,
          appointmentDurationMinutes: data?.duration_minutes,
        });
        if (started) {
          onClose();
          return;
        }
        // Otherwise the session is hosted on Daily.co — open the room URL the
        // backend returned (it already carries the access token).
        const url = res.join_url || res.room_url;
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          toast.error(t("consult.booking.join_failed"));
        }
      },
      onError: (err: any) => {
        console.error("[Appointment] join failed:", err?.status, err?.data);
        toast.error(err?.message || t("consult.booking.join_failed"));
      },
    });
  };

  const handlePayIrembo = () => {
    payMutation.mutate(undefined, {
      onSuccess: (res) => {
        if (!(window as any).IremboPay) {
          toast.error("IremboPay widget is not loaded.");
          return;
        }

        (window as any).IremboPay.initiate({
          publicKey: res.public_key,
          invoiceNumber: res.invoice_number,
          locale: (window as any).IremboPay?.locale?.EN || "en",
          callback: (err: any) => {
            (window as any).IremboPay?.closeModal?.();
            if (err) {
              toast.error(t("consult.appointment_detail.payment_failed"), {
                description: t("consult.appointment_detail.payment_failed_desc"),
              });
            } else {
              setIsVerifyingPayment(true);
              invoicePoller.start(
                res.invoice_number,
                () => {
                  setIsVerifyingPayment(false);
                  toast.success(t("consult.appointment_detail.payment_success"));
                  queryClient.invalidateQueries({ queryKey: ["patient-appointment", appointmentId] });
                  queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
                },
                () => {
                  setIsVerifyingPayment(false);
                  toast.error(t("consult.appointment_detail.payment_verify_failed"));
                }
              );
            }
          },
        });
      },
      onError: (err: any) => {
        toast.error(err?.message || t("consult.appointment_detail.payment_initiate_failed"));
      },
    });
  };

  const appt = (data as any)?.appointment ?? data;
  const canReview = (data as any)?.can_review ?? false;
  const doctor = appt?.doctor ?? null;
  const hospital = appt?.hospital ?? null;
  const insurance = appt?.insurance ?? null;

  const doctorName = doctor
    ? doctor.designations || doctor.user?.name
    : hospital?.name_en ?? "—";

  const doctorAvatar = doctor?.image ?? doctor?.user?.avatar ?? null;
  const avatarSrc = doctorAvatar
    ? doctorAvatar.startsWith("http")
      ? doctorAvatar
      : `${import.meta.env.VITE_STORAGE_URL ?? ""}/${doctorAvatar}`
    : null;

  const status: ApiAppointmentStatus | undefined = appt?.status;
  const unpaid = appt && appt.payment_status !== "paid" && parseFloat(appt.patient_pays) > 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("consult.bookings.appointments")}
        </button>
        {status && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs px-3 py-1 font-semibold border rounded-full",
              STATUS_STYLES[status]
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full mr-2 inline-block",
                STATUS_DOT[status]
              )}
            />
            {getStatusLabel(t, status)}
          </Badge>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <DetailSkeleton />}

        {isError && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{t("consult.appointment_detail.failed_to_load")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("consult.appointment_detail.fetch_failed")}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="rounded-[6px] text-sm h-10 px-5"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("consult.appointment_detail.go_back")}
            </Button>
          </div>
        )}

        {!isLoading && !isError && appt && (
          <div className="p-4 lg:p-5 space-y-4 max-w-2xl mx-auto">

            {/* ── Hero card ── */}
            <div className="rounded-[6px] border border-border/50 bg-card shadow-sm overflow-hidden">


              <div className="p-5 space-y-5">
                {/* Provider row */}
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0 border border-primary/15 overflow-hidden ring-2 ring-background">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={doctorName} className="h-full w-full object-cover" />
                    ) : hospital ? (
                      <Building2 className="w-7 h-7" />
                    ) : (
                      <User className="w-7 h-7" />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 className="text-lg font-semibold text-foreground leading-tight truncate">
                      {doctorName}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {doctor
                        ? doctor.specialization || doctor.doctor_degree
                        : hospital
                          ? [hospital.city, hospital.address].filter(Boolean).join(" · ")
                          : "—"}
                    </p>
                    {doctor?.rating_avg && parseFloat(doctor.rating_avg) > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold text-foreground">
                          {parseFloat(doctor.rating_avg).toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground/60">{t("consult.appointment_detail.rating")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 divide-x divide-border/50 rounded-[6px] border border-border/50 overflow-hidden bg-muted/20">
                  {[
                    {
                      icon: appt.type === "online" ? Wifi : MapPin,
                      label: t("consult.booking.type"),
                      value: appt.type === "online" ? t("consult.appointment_detail.video") : t("consult.appointment_detail.in_person"),
                      color: appt.type === "online" ? "text-sky-500" : "text-amber-500",
                    },
                    {
                      icon: Calendar,
                      label: t("consult.booking.date"),
                      value: format(parseISO(appt.appointment_date), "MMM dd"),
                      color: "text-muted-foreground",
                    },
                    {
                      icon: Clock,
                      label: t("consult.booking.time"),
                      value: formatTime(appt.appointment_time),
                      color: "text-muted-foreground",
                    },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex flex-col items-center py-4 px-3">
                      <Icon className={cn("w-4 h-4 mb-1.5", color)} />
                      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/50">
                        {label}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Unpaid warning */}
                {unpaid && appt.status !== "cancelled" && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {t("consult.appointment_detail.payment_due", { amount: formatCurrency(appt.patient_pays, appt.currency) })}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <ActionBar
                  appt={appt}
                  onPay={handlePayIrembo}
                  onJoin={handleJoin}
                  onCancel={() => setShowCancel(true)}
                  onReschedule={() => setShowReschedule(true)}
                  joinPending={joinMutation.isPending}
                  payPending={payMutation.isPending || isVerifyingPayment}
                />

                {/* Join error */}
                {joinMutation.isError && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {(joinMutation.error as any)?.message ?? t("consult.appointment_detail.start_session_error")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Consultation summary (completed only) ── */}
            {appt.status === "completed" && (
              <Section title={t("consult.appointment_detail.consultation_summary")}>
                <SummarySection appointmentId={appointmentId} />
              </Section>
            )}

            {/* ── Appointment details ── */}
            <Section title={t("consult.appointment_detail.appointment")}>
              <InfoRow icon={FileText} label={t("consult.appointment_detail.booking_type")} value={translateEnum(t, "consult.appointment_detail.booking_type_values", appt.booking_type)} />
              <InfoRow
                icon={Clock}
                label={t("consult.appointment_detail.duration")}
                value={appt.duration_minutes ? t("consult.appointment_detail.minutes", { count: appt.duration_minutes }) : "\u2014"}
              />
              <InfoRow icon={Calendar} label={t("consult.booking.date")} value={formatDate(appt.appointment_date)} />
              <InfoRow icon={Clock} label={t("consult.booking.time")} value={formatTime(appt.appointment_time)} />
              <NotesContent notes={appt.notes} />
            </Section>

            {/* ── Payment ── */}
            <Section title={t("consult.appointment_detail.payment")}>
              <InfoRow
                icon={CreditCard}
                label={t("consult.appointment_detail.consultation_fee")}
                value={formatCurrency(appt.consultation_fee, appt.currency)}
              />
              {insurance && (
                <InfoRow
                  icon={Shield}
                  label={t("consult.appointment_detail.insurance_covers")}
                  value={formatCurrency(appt.insurance_covered, appt.currency)}
                />
              )}
              <InfoRow
                icon={CreditCard}
                label={t("consult.appointment_detail.you_pay")}
                value={
                  <span className="font-semibold">
                    {formatCurrency(appt.patient_pays, appt.currency)}
                  </span>
                }
              />
              <InfoRow
                icon={Check}
                label={t("consult.booking.status")}
                value={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-semibold",
                      appt.payment_status === "paid"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        appt.payment_status === "paid" ? "bg-emerald-500" : "bg-amber-500"
                      )}
                    />
                    {translateEnum(t, "consult.appointment_detail.payment_status", appt.payment_status)}
                  </span>
                }
              />
              {appt.payment_method && (
                <InfoRow
                  icon={Banknote}
                  label={t("consult.appointment_detail.method")}
                  value={translateEnum(t, "consult.appointment_detail.payment_method", appt.payment_method)}
                />
              )}
              {appt.payment_reference && (
                <InfoRow
                  icon={FileText}
                  label={t("consult.appointment_detail.reference")}
                  mono
                  value={
                    <span className="flex items-center gap-1">
                      {appt.payment_reference}
                      <CopyButton value={appt.payment_reference} />
                    </span>
                  }
                />
              )}
            </Section>

            {/* ── Doctor ── */}
            {doctor && (
              <Section title={t("consult.appointment_detail.doctor")}>
                <InfoRow icon={User} label={t("consult.appointment_detail.full_name")} value={doctor.user?.name ?? "—"} />
                <InfoRow icon={FileText} label={t("consult.appointment_detail.degree")} value={doctor.doctor_degree ?? "—"} />
                <InfoRow
                  icon={FileText}
                  label={t("consult.appointment_detail.license")}
                  value={doctor.medical_license ?? "—"}
                  mono
                />
                <InfoRow
                  icon={FileText}
                  label={t("consult.appointment_detail.specialization")}
                  value={doctor.specialization ?? "—"}
                />
                <InfoRow
                  icon={Globe}
                  label={t("consult.appointment_detail.consultation_type")}
                  value={translateEnum(t, "consult.appointment_detail.consultation_type_values", doctor.consultation_type)}
                />
                {parseFloat(doctor.consultation_fee) > 0 && (
                  <InfoRow
                    icon={CreditCard}
                    label={t("consult.appointment_detail.fee")}
                    value={formatCurrency(doctor.consultation_fee, doctor.currency)}
                  />
                )}
              </Section>
            )}

            {/* ── Hospital ── */}
            {hospital && (
              <Section title={t("consult.appointment_detail.hospital")}>
                <InfoRow icon={Building2} label={t("consult.appointment_detail.name")} value={hospital.name_en} />
                <InfoRow
                  icon={MapPin}
                  label={t("consult.appointment_detail.address")}
                  value={[hospital.address, hospital.city].filter(Boolean).join(", ")}
                />
                {hospital.phone && (
                  <InfoRow
                    icon={Phone}
                    label={t("consult.connect.phone_number")}
                    value={
                      <a href={`tel:${hospital.phone}`} className="text-primary hover:underline">
                        {hospital.phone}
                      </a>
                    }
                  />
                )}
                {hospital.email && (
                  <InfoRow
                    icon={Mail}
                    label={t("consult.connect.email_address")}
                    value={
                      <a
                        href={`mailto:${hospital.email}`}
                        className="text-primary hover:underline"
                      >
                        {hospital.email}
                      </a>
                    }
                  />
                )}
                {hospital.website && (
                  <InfoRow
                    icon={Globe}
                    label={t("consult.appointment_detail.website")}
                    value={
                      <a
                        href={hospital.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {hospital.website}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    }
                  />
                )}
              </Section>
            )}

            {/* ── Insurance ── */}
            {insurance && (
              <Section title={t("consult.appointment_detail.insurance")}>
                <div className="py-3 flex items-center gap-3 border-b border-border/30">
                  {insurance.logo && (
                    <img
                      src={insurance.logo}
                      alt={insurance.name}
                      className="h-10 w-10 object-contain rounded-[6px]"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{insurance.name}</p>
                    <p className="text-xs text-muted-foreground">{insurance.code}</p>
                  </div>
                </div>
                <InfoRow
                  icon={Shield}
                  label={t("consult.appointment_detail.coverage")}
                  value={`${parseFloat(insurance.coverage_percentage ?? 0).toFixed(0)}%`}
                />
                <InfoRow icon={Globe} label={t("consult.booking.type")} value={translateEnum(t, "consult.appointment_detail.insurance_type", insurance.type)} />
                {insurance.phone && (
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={
                      <a href={`tel:${insurance.phone}`} className="text-primary hover:underline">
                        {insurance.phone}
                      </a>
                    }
                  />
                )}
                {insurance.email && (
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    value={
                      <a
                        href={`mailto:${insurance.email}`}
                        className="text-primary hover:underline"
                      >
                        {insurance.email}
                      </a>
                    }
                  />
                )}
              </Section>
            )}

            {/* ── Session ── */}
            {appt.daily_room_url && (
              <Section title={t("consult.appointment_detail.session")}>
                <InfoRow
                  icon={Video}
                  label={t("consult.appointment_detail.room")}
                  value={
                    <span className="flex items-center gap-2 font-mono text-xs">
                      {appt.daily_room_name}
                      <CopyButton value={appt.daily_room_url} />
                    </span>
                  }
                />
                {appt.session_started_at && (
                  <InfoRow
                    icon={Clock}
                    label={t("consult.appointment_detail.started")}
                    value={format(parseISO(appt.session_started_at), "MMM dd · hh:mm a")}
                  />
                )}
                {appt.session_ended_at && (
                  <InfoRow
                    icon={Clock}
                    label={t("consult.appointment_detail.ended")}
                    value={format(parseISO(appt.session_ended_at), "MMM dd · hh:mm a")}
                  />
                )}
              </Section>
            )}

            {/* ── Review CTA ── */}
            {/* {canReview && (
              <div className="rounded-[6px] border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 px-5 py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      How was your visit?
                    </p>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-1">
                      Help others find the right doctor
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-9 px-4 text-sm font-semibold rounded-[6px] shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-sm gap-2"
                >
                  <Star className="w-4 h-4" />
                  Review
                </Button>
              </div>
            )} */}

            {/* ── Cancellation info ── */}
            {appt.status === "cancelled" && appt.cancellation_reason && (
              <div className="rounded-[6px] border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 px-5 py-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {t("consult.appointment_detail.cancellation_reason")}
                  </p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/70 mt-1">
                    {appt.cancellation_reason}
                  </p>
                  {appt.cancelled_at && (
                    <p className="text-xs text-red-500/60 mt-1.5">
                      {t("consult.appointment_detail.cancelled_on", { date: format(parseISO(appt.cancelled_at), "MMM dd, yyyy \u00b7 hh:mm a") })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="h-4" />
          </div>
        )}
      </div>

      {/* ── Cancel dialog ── */}
      {showCancel && (
        <CancelDialog
          appointmentId={appointmentId}
          onClose={() => setShowCancel(false)}
        />
      )}

      {/* ── Reschedule dialog ── */}
      {showReschedule && appt && (
        <RescheduleDialog
          appointmentId={appointmentId}
          currentDate={appt.appointment_date}
          currentTime={appt.appointment_time}
          onClose={() => setShowReschedule(false)}
        />
      )}
    </div>
  );
}

// ─── AppointmentDetailModal ───────────────────────────────────────────────────

export function AppointmentDetailModal({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isOpen = !!appointmentId;

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-background border-l border-border/60 shadow-2xl",
          "flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Close ✕ */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-[6px] bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border/60"
          aria-label={t("consult.connect.close")}
        >
          <X className="w-4 h-4" />
        </button>

        {appointmentId && (
          <AppointmentDetailContent
            appointmentId={appointmentId}
            onClose={onClose}
          />
        )}
      </div>
    </>
  );
}

export default AppointmentDetailModal;
