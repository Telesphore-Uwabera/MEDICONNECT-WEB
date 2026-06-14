import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetPatientAppointment,
  ApiAppointmentStatus,
} from "@/hooks/patient/use-patient-appointment";
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
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { t } from "i18next";

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

const STATUS_LABEL: Record<ApiAppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

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

// ─── Atoms ────────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
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
      title="Copy"
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
    <div className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-b-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
        <p className="text-[11px] text-muted-foreground/70 whitespace-nowrap">{label}</p>
        <p
          className={cn(
            "text-[12px] text-foreground text-right",
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
    <div className="border border-border/50 rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/50" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
        )}
      </button>
      {open && <div className="px-4 py-1">{children}</div>}
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
      <div className="relative z-10 w-full max-w-sm bg-background border border-border/70 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center justify-center mb-3">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-[13px] font-semibold">Cancel appointment?</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            This action cannot be undone. Refund policies may apply.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5 block">
              Reason <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. I can't make it at this time"
              rows={3}
              className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[12px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
            />
          </div>

          {isError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <p className="text-[11px] text-red-600 dark:text-red-400">
                {(error as any)?.message ?? "Could not cancel. Please try again."}
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Appointment cancelled.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-9 rounded-lg text-[12px]"
            >
              Keep it
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              disabled={isPending || isSuccess}
              className="flex-1 h-9 rounded-lg text-[12px] font-semibold bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 text-white gap-1.5"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {isPending ? "Cancelling…" : "Yes, cancel"}
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
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
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
            <div key={i} className="h-16 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-10 rounded-xl bg-muted" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
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
  joinPending,
  payPending,
}: {
  appt: any;
  onPay: () => void;
  onJoin: () => void;
  onCancel: () => void;
  joinPending: boolean;
  payPending?: boolean;
}) {
  const status: ApiAppointmentStatus = appt.status;
  const unpaid = appt.payment_status !== "paid" && appt.status == "pending";
  const canJoin = (status === "confirmed" || status === "in_progress") && appt.daily_room_url;
  const canCancel = status === "pending" || status === "confirmed";
  const canPay = unpaid && status !== "cancelled" && status !== "completed";

  if (!canPay && !canJoin && !canCancel) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {canJoin && (
        <Button
          onClick={onJoin}
          disabled={joinPending}
          className="flex-1 h-9 rounded-sm text-[12px] font-semibold gap-2 bg-violet-600 hover:bg-violet-700 border-violet-600 hover:border-violet-700 text-white shadow-sm shadow-violet-500/20"
        >
          {joinPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Video className="w-3.5 h-3.5" />
          )}
          {joinPending ? "Joining…" : "Join Session"}
        </Button>
      )}
      {canPay && (
        <Button
          onClick={onPay}
          disabled={payPending}
          className="flex-1 h-9 rounded-sm text-[12px] font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700 text-white shadow-sm shadow-emerald-500/20"
        >
          {payPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CreditCard className="w-3.5 h-3.5" />
          )}
          {payPending ? "Processing…" : "Pay Now"}
        </Button>
      )}
      {canCancel && (
        <Button
          variant="outline"
          onClick={onCancel}
          className="h-9 rounded-sm text-[12px] gap-1.5 text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 transition-all"
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancel
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
  const queryClient = useQueryClient();
  const invoicePoller = useInvoicePoller();
  const { startCall } = useCallContext();
  const { data, isLoading, isError } = useGetPatientAppointment(appointmentId);

  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

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
              toast.error("Payment failed", { description: "You can pay later from your dashboard." });
            } else {
              setIsVerifyingPayment(true);
              invoicePoller.start(
                res.invoice_number,
                () => {
                  setIsVerifyingPayment(false);
                  toast.success("Payment successful!");
                  queryClient.invalidateQueries({ queryKey: ["patient-appointment", appointmentId] });
                  queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
                },
                () => {
                  setIsVerifyingPayment(false);
                  toast.error("Could not verify payment status.");
                }
              );
            }
          },
        });
      },
      onError: (err: any) => {
        toast.error(err?.message || "Failed to initiate payment.");
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
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Appointments
        </button>
        {status && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-2.5 py-0.5 font-semibold border rounded-full",
              STATUS_STYLES[status]
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full mr-1.5 inline-block",
                STATUS_DOT[status]
              )}
            />
            {STATUS_LABEL[status]}
          </Badge>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <DetailSkeleton />}

        {isError && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Failed to load</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Couldn't fetch appointment details
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="rounded-lg text-[11px]"
            >
              <ArrowLeft className="w-3 h-3 mr-1.5" /> Go back
            </Button>
          </div>
        )}

        {!isLoading && !isError && appt && (
          <div className="p-4 lg:p-5 space-y-4 max-w-2xl mx-auto">

            {/* ── Hero card ── */}
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">


              <div className="p-5 space-y-4">
                {/* Provider row */}
                <div className="flex items-start gap-3.5">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 border border-primary/15 overflow-hidden ring-2 ring-background">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={doctorName} className="h-full w-full object-cover" />
                    ) : hospital ? (
                      <Building2 className="w-6 h-6" />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h2 className="text-[15px] font-semibold text-foreground leading-tight truncate">
                      {doctorName}
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {doctor
                        ? doctor.specialization || doctor.doctor_degree
                        : hospital
                          ? [hospital.city, hospital.address].filter(Boolean).join(" · ")
                          : "—"}
                    </p>
                    {doctor?.rating_avg && parseFloat(doctor.rating_avg) > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-semibold text-foreground">
                          {parseFloat(doctor.rating_avg).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">rating</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 divide-x divide-border/50 rounded-xl border border-border/50 overflow-hidden bg-muted/20">
                  {[
                    {
                      icon: appt.type === "online" ? Wifi : MapPin,
                      label: "Type",
                      value: appt.type === "online" ? "Video" : "In-person",
                      color: appt.type === "online" ? "text-sky-500" : "text-amber-500",
                    },
                    {
                      icon: Calendar,
                      label: "Date",
                      value: format(parseISO(appt.appointment_date), "MMM dd"),
                      color: "text-muted-foreground",
                    },
                    {
                      icon: Clock,
                      label: "Time",
                      value: formatTime(appt.appointment_time),
                      color: "text-muted-foreground",
                    },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex flex-col items-center py-3 px-2">
                      <Icon className={cn("w-3.5 h-3.5 mb-1", color)} />
                      <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground/50">
                        {label}
                      </p>
                      <p className="text-[11px] font-semibold text-foreground mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Unpaid warning */}
                {unpaid && appt.status !== "cancelled" && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Payment of{" "}
                      <span className="font-semibold">
                        {formatCurrency(appt.patient_pays, appt.currency)}
                      </span>{" "}
                      is due
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <ActionBar
                  appt={appt}
                  onPay={handlePayIrembo}
                  onJoin={handleJoin}
                  onCancel={() => setShowCancel(true)}
                  joinPending={joinMutation.isPending}
                  payPending={payMutation.isPending || isVerifyingPayment}
                />

                {/* Join error */}
                {joinMutation.isError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-[11px] text-red-600 dark:text-red-400">
                      {(joinMutation.error as any)?.message ?? "Could not start session."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Appointment details ── */}
            <Section title="Appointment">
              <InfoRow icon={FileText} label="Booking type" value={appt.booking_type ?? "—"} />
              <InfoRow
                icon={Clock}
                label="Duration"
                value={appt.duration_minutes ? `${appt.duration_minutes} min` : "—"}
              />
              <InfoRow icon={Calendar} label="Date" value={formatDate(appt.appointment_date)} />
              <InfoRow icon={Clock} label="Time" value={formatTime(appt.appointment_time)} />
              {appt.notes && <InfoRow icon={FileText} label="Notes" value={appt.notes} />}
            </Section>

            {/* ── Payment ── */}
            <Section title="Payment">
              <InfoRow
                icon={CreditCard}
                label="Consultation fee"
                value={formatCurrency(appt.consultation_fee, appt.currency)}
              />
              {insurance && (
                <InfoRow
                  icon={Shield}
                  label="Insurance covers"
                  value={formatCurrency(appt.insurance_covered, appt.currency)}
                />
              )}
              <InfoRow
                icon={CreditCard}
                label="You pay"
                value={
                  <span className="font-semibold">
                    {formatCurrency(appt.patient_pays, appt.currency)}
                  </span>
                }
              />
              <InfoRow
                icon={Check}
                label="Status"
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
                    {appt.payment_status ?? "—"}
                  </span>
                }
              />
              {appt.payment_method && (
                <InfoRow
                  icon={Banknote}
                  label="Method"
                  value={appt.payment_method.replace(/_/g, " ")}
                />
              )}
              {appt.payment_reference && (
                <InfoRow
                  icon={FileText}
                  label="Reference"
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
              <Section title="Doctor">
                <InfoRow icon={User} label="Full name" value={doctor.user?.name ?? "—"} />
                <InfoRow icon={FileText} label="Degree" value={doctor.doctor_degree ?? "—"} />
                <InfoRow
                  icon={FileText}
                  label="License"
                  value={doctor.medical_license ?? "—"}
                  mono
                />
                <InfoRow
                  icon={FileText}
                  label="Specialization"
                  value={doctor.specialization ?? "—"}
                />
                <InfoRow
                  icon={Globe}
                  label="Consultation type"
                  value={doctor.consultation_type?.replace(/_/g, " ") ?? "—"}
                />
                {parseFloat(doctor.consultation_fee) > 0 && (
                  <InfoRow
                    icon={CreditCard}
                    label="Fee"
                    value={formatCurrency(doctor.consultation_fee, doctor.currency)}
                  />
                )}
              </Section>
            )}

            {/* ── Hospital ── */}
            {hospital && (
              <Section title="Hospital">
                <InfoRow icon={Building2} label="Name" value={hospital.name_en} />
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={[hospital.address, hospital.city].filter(Boolean).join(", ")}
                />
                {hospital.phone && (
                  <InfoRow
                    icon={Phone}
                    label="Phone"
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
                    label="Email"
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
                    label="Website"
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
              <Section title="Insurance">
                <div className="py-2.5 flex items-center gap-3 border-b border-border/30">
                  {insurance.logo && (
                    <img
                      src={insurance.logo}
                      alt={insurance.name}
                      className="h-8 w-8 object-contain rounded-lg"
                    />
                  )}
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">{insurance.name}</p>
                    <p className="text-[10px] text-muted-foreground">{insurance.code}</p>
                  </div>
                </div>
                <InfoRow
                  icon={Shield}
                  label="Coverage"
                  value={`${parseFloat(insurance.coverage_percentage ?? 0).toFixed(0)}%`}
                />
                <InfoRow icon={Globe} label="Type" value={insurance.type ?? "—"} />
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
              <Section title="Session">
                <InfoRow
                  icon={Video}
                  label="Room"
                  value={
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      {appt.daily_room_name}
                      <CopyButton value={appt.daily_room_url} />
                    </span>
                  }
                />
                {appt.session_started_at && (
                  <InfoRow
                    icon={Clock}
                    label="Started"
                    value={format(parseISO(appt.session_started_at), "MMM dd · hh:mm a")}
                  />
                )}
                {appt.session_ended_at && (
                  <InfoRow
                    icon={Clock}
                    label="Ended"
                    value={format(parseISO(appt.session_ended_at), "MMM dd · hh:mm a")}
                  />
                )}
              </Section>
            )}

            {/* ── Review CTA ── */}
            {canReview && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 px-4 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                    <Star className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
                      How was your visit?
                    </p>
                    <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                      Help others find the right doctor
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-8 px-4 text-[11px] font-semibold rounded-lg shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-sm gap-1.5"
                >
                  <Star className="w-3 h-3" />
                  Review
                </Button>
              </div>
            )}

            {/* ── Cancellation info ── */}
            {appt.status === "cancelled" && appt.cancellation_reason && (
              <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 px-4 py-3.5 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-red-700 dark:text-red-400">
                    Cancellation reason
                  </p>
                  <p className="text-[11px] text-red-600/80 dark:text-red-400/70 mt-0.5">
                    {appt.cancellation_reason}
                  </p>
                  {appt.cancelled_at && (
                    <p className="text-[10px] text-red-500/60 mt-1">
                      Cancelled on {format(parseISO(appt.cancelled_at), "MMM dd, yyyy · hh:mm a")}
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
          className="absolute top-2.5 right-3 z-10 w-7 h-7 rounded-lg bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border/60"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
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
