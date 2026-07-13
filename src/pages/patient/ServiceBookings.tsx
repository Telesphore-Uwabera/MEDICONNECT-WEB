import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/date";
  import{CalendarDays,
  Clock,
  Building2,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  FileText,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  Trash2,
  SlidersHorizontal,
  Eye,
  CreditCard,
  User,
  Phone,
  MapPin,
  Info,
  Receipt,
  ShieldCheck,
  Hash,
  HeartPulse,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { Card } from "@/components/ui/card";
import { MyMedicalInfoDrawer } from "./components/MyMedicalInfoDrawer";
import { PatientStatsGrid, type PatientStatItem } from "./components/PatientStatsGrid";
import {
  BookingStatus,
  useGetPatientServiceBookings,   //  plural: fetches list with filters
  useCancelPatientServiceBooking,
  type ApiServiceBooking,
  type ServiceBookingSearchParams,
  useGetPatientServiceBooking,
} from "@/hooks/patient/use-patient-service";
import { Link } from "react-router-dom";
import { t } from "i18next";
import { RichTextRenderer } from "@/components/ui/rich-textarea";

 

type SortOption = "date-desc" | "date-asc";
type ViewMode = "table" | "cards";

interface FilterState {
  status: BookingStatus | "all";
  q: string;
  sort: SortOption;
  page: number;
}

const INITIAL_FILTERS: FilterState = {
  status: "all",
  q: "",
  sort: "date-desc",
  page: 1,
};
 

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; icon: React.ElementType; badge: string; dot: string; bg: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    badge:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    badge:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800",
    dot: "bg-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/20",
  },
};

const STATUS_OPTIONS: Array<{ value: BookingStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

 

function formatDate(dateStr: string): string {
  try {
    return formatDateOnly(dateStr, undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return timeStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatPrice(amount: string | null, currency = "RWF"): string {
  if (!amount) return "-";
  return `${parseFloat(amount).toLocaleString()} ${currency}`;
}

function buildApiParams(filters: FilterState): ServiceBookingSearchParams {
  const params: ServiceBookingSearchParams = { page: filters.page };
  if (filters.status !== "all") params.status = filters.status as BookingStatus;
  return params;
}

function clientFilter(
  bookings: ApiServiceBooking[],
  q: string,
  sort: SortOption,
): ApiServiceBooking[] {
  const query = q.toLowerCase().trim();
  const filtered = query
    ? bookings.filter(
      (b) =>
        b.service.name_en.toLowerCase().includes(query) ||
        b.hospital.name_en.toLowerCase().includes(query) ||
        b.department.name_en.toLowerCase().includes(query) ||
        b.status.includes(query),
    )
    : bookings;

  return [...filtered].sort((a, b) => {
    const da = new Date(`${a.preferred_date}T${a.preferred_time}`).getTime();
    const db = new Date(`${b.preferred_date}T${b.preferred_time}`).getTime();
    return sort === "date-asc" ? da - db : db - da;
  });
}

//  Action feedback banner 
// Shown inline below the meta bar after any successful/failed mutation.

interface ActionFeedback {
  type: "success" | "error";
  message: string;
}

function FeedbackBanner({
  feedback,
  onDismiss,
}: {
  feedback: ActionFeedback;
  onDismiss: () => void;
}) {
  // Auto-dismiss after 6 s
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [feedback, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-b text-sm animate-in slide-in-from-top-1 duration-200",
        feedback.type === "success"
          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300",
      )}
    >
      {feedback.type === "success" ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      )}
      <span className="flex-1 font-medium">{feedback.message}</span>
      <button
        onClick={onDismiss}
        className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label={t("pages.patient.dismiss")}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

 

function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-[6px] border",
        cfg.badge,
      )}
    >
      <Icon className="w-3 h-3" />
      {t(`pages.patient.status_${status}`, cfg.label)}
    </span>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4 border-b border-border/60 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80 mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; dot?: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-2 rounded-[6px] text-sm border transition-all duration-200 text-left flex items-center gap-2",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.dot && (
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", o.dot)} />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

 
function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-b-0">
      <div className="w-8 h-8 rounded-[6px] bg-muted/60 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground/70" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/60 mb-1">
          {label}
        </p>
        <p
          className={cn(
            "text-sm text-foreground leading-snug break-words",
            mono && "font-mono",
            accent,
          )}
        >
          {value ?? "-"}
        </p>
      </div>
    </div>
  );
}

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">
        {title}
      </p>
      <div className="bg-card border border-border/60 rounded-[6px] divide-y divide-border/40 px-4">
        {children}
      </div>
    </div>
  );
}
 
function BookingDetailDrawer({
  bookingId,
  onClose,
  onCancelRequest,
}: {
  bookingId: number;
  onClose: () => void;
  onCancelRequest: (b: ApiServiceBooking) => void;
}) {
  const { data, isLoading, isError, refetch } = useGetPatientServiceBooking(bookingId);
  const { t } = useTranslation();
  const booking = data?.booking;

  const canCancel =
    booking?.status === "pending" || booking?.status === "accepted";

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md flex flex-col bg-background border-l border-border/70 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-card/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[6px] bg-primary/10 flex items-center justify-center border border-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("pages.patient.booking_details")}</p>
              {booking && (
                <p className="text-xs text-muted-foreground/60">#{booking.id}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-[6px] p-3 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-[6px] bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted/70 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="w-12 h-12 rounded-[6px] bg-destructive/10 flex items-center justify-center border border-destructive/20">
                <AlertCircle className="w-5 h-5 text-destructive/60" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground">{t("pages.patient.failed_load_details")}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">{t("pages.patient.something_went_wrong_try_again")}</p>
              </div>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                {t("pages.patient.retry")}
              </button>
            </div>
          )}

          {!isLoading && !isError && booking && (
            <>
              {/* Status hero */}
              <div className={cn("rounded-[6px] border border-border/50 p-5 mb-5 flex items-center gap-4", STATUS_CONFIG[booking.status].bg)}>
                <div className={cn("w-12 h-12 rounded-[6px] flex items-center justify-center border flex-shrink-0", STATUS_CONFIG[booking.status].badge)}>
                  {(() => { const Icon = STATUS_CONFIG[booking.status].icon; return <Icon className="w-6 h-6" />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold text-foreground leading-tight truncate">
                      {booking.service.name_en}
                    </p>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {t("pages.patient.booked_by")} <span className="font-medium capitalize">{booking.booked_by}</span>
                  </p>
                </div>
              </div>

              {booking.rejection_reason && (
                <div className="mb-5 flex items-start gap-3 p-4 rounded-[6px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">{t("pages.patient.rejection_reason")}</p>
                    <p className="text-xs text-red-600 dark:text-red-400/80 leading-relaxed">{booking.rejection_reason}</p>
                  </div>
                </div>
              )}

              <DrawerSection title={t("pages.patient.appointment")}>
                <DetailRow icon={CalendarDays} label={t("pages.patient.date")} value={formatDate(booking.preferred_date)} />
                <DetailRow icon={Clock} label={t("pages.patient.time")} value={formatTime(booking.preferred_time)} />
                <RichTextRenderer
                value={booking.notes}
                 /> 
              </DrawerSection>

              <DrawerSection title={t("pages.patient.health_facility")}>
                <DetailRow icon={Building2} label={t("pages.patient.name")} value={booking.hospital.name_en} />
                {booking.hospital.address && <DetailRow icon={MapPin} label={t("pages.patient.address")} value={booking.hospital.address} />}
                {booking.hospital.phone && <DetailRow icon={Phone} label={t("pages.patient.phone")} value={booking.hospital.phone} mono />}
              </DrawerSection>

              <DrawerSection title={t("pages.patient.service")}>
                <DetailRow icon={Stethoscope} label={t("pages.patient.service")} value={booking.service.name_en} />
                {booking.service.description_en && <DetailRow icon={Info} label={t("pages.patient.description")} value={booking.service.description_en} />}
                <DetailRow icon={Hash} label={t("pages.patient.department")} value={booking.department.name_en} />
              </DrawerSection>

              <DrawerSection title={t("pages.patient.payment")}>
                <DetailRow
                  icon={Receipt}
                  label={t("pages.patient.booking_price")}
                  value={formatPrice(booking.price ?? booking.service.price, booking.currency ?? "RWF")}
                  accent="font-semibold"
                />
                {booking.insurance_covered && parseFloat(booking.insurance_covered) > 0 && (
                  <DetailRow icon={ShieldCheck} label={t("pages.patient.insurance_covered")} value={formatPrice(booking.insurance_covered, booking.currency ?? "RWF")} />
                )}
                {booking.patient_pays && (
                  <DetailRow
                    icon={CreditCard}
                    label={t("pages.patient.patient_pays")}
                    value={formatPrice(booking.patient_pays, booking.currency ?? "RWF")}
                    accent="font-semibold text-primary"
                  />
                )}
                <DetailRow
                  icon={CreditCard}
                  label={t("pages.patient.payment_status")}
                  value={
                    <span className={cn("capitalize font-medium", booking.payment_status === "paid" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                      {booking.payment_status ?? t("pages.patient.unpaid")}
                    </span>
                  }
                />
                {booking.payment_method && (
                  <DetailRow icon={CreditCard} label={t("pages.patient.payment_method")} value={<span className="capitalize">{booking.payment_method}</span>} />
                )}
              </DrawerSection>

              <DrawerSection title={t("pages.patient.timeline")}>
                <DetailRow icon={CalendarDays} label={t("pages.patient.created")} value={formatDateTime(booking.created_at)} />
                {booking.accepted_at && <DetailRow icon={CheckCircle2} label={t("pages.patient.accepted")} value={formatDateTime(booking.accepted_at)} accent="text-emerald-600 dark:text-emerald-400" />}
                {booking.rejected_at && <DetailRow icon={XCircle} label={t("pages.patient.rejected")} value={formatDateTime(booking.rejected_at)} accent="text-red-600 dark:text-red-400" />}
                {booking.completed_at && <DetailRow icon={CheckCircle2} label={t("pages.patient.completed")} value={formatDateTime(booking.completed_at)} accent="text-blue-600 dark:text-blue-400" />}
                {booking.cancelled_at && <DetailRow icon={Ban} label={t("pages.patient.cancelled")} value={formatDateTime(booking.cancelled_at)} accent="text-slate-500" />}
              </DrawerSection>
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !isError && booking && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-border/60 bg-card/80 backdrop-blur-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 min-w-0">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="capitalize truncate">{booking.booked_by}</span>
              <span className="text-muted-foreground/30 flex-shrink-0">·</span>
              <span className="flex-shrink-0">#{booking.id}</span>
            </div>
            {canCancel ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onCancelRequest(booking); onClose(); }}
                className="h-7 px-3 text-[10px] font-semibold rounded-[6px] text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 transition-all flex-shrink-0"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {t("pages.patient.cancel_booking")}
              </Button>
            ) : (
              <span className={cn("text-[10px] font-medium px-2 py-1 rounded-[6px] border flex-shrink-0", STATUS_CONFIG[booking.status].badge)}>
                {t(`pages.patient.status_${booking.status}`, STATUS_CONFIG[booking.status].label)}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}

 

function RowSkeleton() {
  return (
    <tr className="border-t border-border/40 animate-pulse">
      <td className="px-3 sm:px-4 py-3">
        <div className="space-y-1.5">
          <div className="h-3 w-32 sm:w-40 rounded bg-muted" />
          <div className="h-2 w-20 rounded bg-muted/60" />
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
        <div className="h-2.5 w-24 rounded bg-muted" />
      </td>
      <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
        <div className="space-y-1.5">
          <div className="h-2.5 w-24 rounded bg-muted" />
          <div className="h-2 w-16 rounded bg-muted" />
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3">
        <div className="h-4 w-16 sm:w-20 rounded-[6px] bg-muted" />
      </td>
      <td className="px-3 sm:px-4 py-3 text-right">
        <div className="h-7 w-16 sm:w-24 rounded-[6px] bg-muted ml-auto" />
      </td>
    </tr>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-border/70 rounded-[6px] p-4 flex flex-col gap-4 animate-pulse">
      <div className="flex items-start gap-3.5">
        <div className="w-16 h-16 rounded-[6px] bg-muted shrink-0" />
        <div className="flex-1 space-y-2 mt-1">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="h-14 w-full rounded-[6px] bg-muted" />
      <div className="h-8 w-full flex gap-2">
        <div className="h-8 flex-1 rounded-[6px] bg-muted" />
        <div className="h-8 flex-1 rounded-[6px] bg-muted" />
      </div>
    </div>
  );
}

 

function CancelDialog({
  booking,
  onConfirm,
  onCancel,
  isLoading,
  error,
}: {
  booking: ApiServiceBooking;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  // Close on Escape
  const { t } = useTranslation();
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel, isLoading]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border/70 rounded-t-lg sm:rounded-[6px] shadow-2xl w-full sm:max-w-sm p-5 flex flex-col gap-4 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-destructive/10 flex items-center justify-center flex-shrink-0 border border-destructive/20">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("pages.patient.cancel_booking")}?</p>
            <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">
              {t("pages.patient.cancel_booking_desc", { service: booking.service.name_en, facility: booking.hospital.name_en, date: formatDate(booking.preferred_date) })}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-[6px] bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive leading-snug">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-[6px] text-sm font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all disabled:opacity-50"
          >
            {t("pages.patient.keep_booking")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[6px] text-sm font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all disabled:opacity-70 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("pages.patient.cancelling")}
              </>
            ) : (
              <>
                <Trash2 className="w-3 h-3" />
                {t("pages.patient.yes_cancel")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

 
function BookingCardItem({
  booking,
  onCancel,
  onView,
}: {
  booking: ApiServiceBooking;
  onCancel: (b: ApiServiceBooking) => void;
  onView: (b: ApiServiceBooking) => void;
}) {
  const canCancel = booking.status === "pending" || booking.status === "accepted";
  const { t } = useTranslation();

  return (
    <Card
      className="rounded-[6px] overflow-hidden border-border/60 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={() => onView(booking)}
    > 
      <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("pages.patient.service_booking")}
        </span>
        <span className={cn("text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider rounded-[6px] border", STATUS_CONFIG[booking.status].badge)}>
          {t(`pages.patient.status_${booking.status}`, STATUS_CONFIG[booking.status].label)}
        </span>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Identity row */}
        <div className="flex items-start gap-3.5">
          <div className="h-16 w-16 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/15 overflow-hidden shadow-sm font-bold text-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground leading-tight truncate">
              {booking.service.name_en}
            </h3>
            <p className="text-[13px] font-medium text-muted-foreground mt-1 truncate">
              {booking.hospital.name_en} · {booking.department.name_en}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-[6px] border border-border overflow-hidden">
          <div className="flex flex-col items-center py-2 px-1 bg-muted/20">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">{t("pages.patient.date")}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">
              {formatDate(booking.preferred_date)}
            </span>
          </div>
          <div className="flex flex-col items-center py-2 px-1 bg-muted/20">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">{t("pages.patient.time")}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">
              {formatTime(booking.preferred_time)}
            </span>
          </div>
          <div className="flex flex-col items-center py-2 px-1 bg-muted/20">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">{t("pages.patient.booking_price")}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">
              {booking.price ?? booking.service.price ? (
                `${parseFloat((booking.price ?? booking.service.price)!).toLocaleString()} ${booking.currency ?? "RWF"}`
              ) : "-"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 mt-auto">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs font-bold rounded-[6px] border-border/60 hover:bg-muted/50 transition-colors flex-1"
            onClick={(e) => { e.stopPropagation(); onView(booking); }}
          >
            {t("pages.patient.details")}
          </Button>
          <Button
            size="sm"
            disabled={!canCancel}
            onClick={(e) => { e.stopPropagation(); onCancel(booking); }}
            className={cn(
              "h-8 px-3 text-xs font-bold rounded-[6px] flex-1 shadow-sm transition-colors",
              canCancel
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {canCancel ? t("pages.patient.cancel") : t("pages.patient.cannot_cancel")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
 

function Pagination({
  currentPage,
  totalPages,
  total,
  perPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const { t } = useTranslation();

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "...")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
      <p className="text-[10px] text-muted-foreground">
        {t("pages.patient.page_of_total", { page: currentPage, pages: totalPages, total })}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-7 px-2.5 text-[10px] rounded-[6px]"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="text-[10px] text-muted-foreground px-1">...</span>
          ) : (
            <Button
              key={p}
              size="sm"
              variant={currentPage === p ? "default" : "outline"}
              onClick={() => onPageChange(p as number)}
              className="h-7 w-7 p-0 text-[10px] rounded-[6px]"
            >
              {p}
            </Button>
          ),
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-7 px-2.5 text-[10px] rounded-[6px]"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

 
function ServiceBookings() {
  const { t, i18n } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ApiServiceBooking | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [medInfoOpen, setMedInfoOpen] = useState(false);
  // Inline feedback banner after any action
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce client-side search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters.q]);

  const apiParams = useMemo<ServiceBookingSearchParams>(
    () => buildApiParams(filters),
    [filters],
  );

  const { data, isLoading, isError, refetch } = useGetPatientServiceBookings(apiParams);
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelPatientServiceBooking();

  const bookings = useMemo(() => {
    if (!data?.data) return [];
    return clientFilter(data.data, debouncedQ, filters.sort);
  }, [data, debouncedQ, filters.sort]);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        ...(key !== "page" && key !== "sort" && key !== "q" ? { page: 1 } : {}),
      }));
    },
    [],
  );

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: t("pages.patient.status"),
      value: filters.status,
      options: STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label })),
      onChange: (v: string) => set("status", v as any)
    },
    {
      type: "search" as const,
      key: "q",
      label: t("pages.patient.search"),
      value: filters.q,
      placeholder: t("pages.patient.search_service_facility"),
      onChange: (v: string) => set("q", v)
    }
  ], [filters, set]);

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  const totalPages =
    data?.last_page ?? (data ? Math.ceil(data.total / data.per_page) : 1);

 
  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return;
    setCancelError(null);
    const serviceName = cancelTarget.service.name_en;

    cancelBooking(cancelTarget.id, {
      onSuccess: (res) => {
        const msg = res?.message ?? t("pages.patient.booking_cancelled_successfully");
        setCancelTarget(null);
        setCancelError(null);
        // Inline banner + toast for users who miss the banner
        setFeedback({ type: "success", message: msg });
        toast.success(msg, { description: serviceName });
      },
      onError: (err) => {
        const msg = err?.message ?? t("pages.patient.could_not_cancel_booking");
        setCancelError(msg);
        setFeedback({ type: "error", message: msg });
        toast.error(msg);
      },
    });
  }, [cancelTarget, cancelBooking]);

  // Lock scroll when any overlay is open
  useEffect(() => {
    document.body.style.overflow =
      filterOpen || detailId !== null || cancelTarget !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen, detailId, cancelTarget]);

  const statusCounts = useMemo(
    () =>
      (data?.data ?? []).reduce(
        (acc, b) => ({ ...acc, [b.status]: (acc[b.status as BookingStatus] ?? 0) + 1 }),
        {} as Partial<Record<BookingStatus, number>>,
      ),
    [data],
  );
  const statusTabs = useMemo(
    () =>
      STATUS_OPTIONS.map((option) => ({
        ...option,
        count:
          option.value === "all"
            ? data?.total ?? bookings.length
            : statusCounts[option.value as BookingStatus] ?? 0,
      })),
    [bookings.length, data?.total, statusCounts],
  );


  const visibleValue = useMemo(
    () =>
      bookings.reduce((sum, booking) => {
        const raw = booking.patient_pays ?? booking.price ?? booking.service.price;
        const amount = raw ? Number.parseFloat(raw) : 0;
        return Number.isFinite(amount) ? sum + amount : sum;
      }, 0),
    [bookings],
  );
  const statsItems = useMemo<PatientStatItem[]>(
    () => [
      { label: "Total", value: data?.total ?? bookings.length, helper: "Service bookings", icon: CalendarDays, tone: "primary" },
      { label: "Pending", value: statusCounts.pending ?? 0, helper: "Waiting review", icon: Clock, tone: "amber" },
      { label: "Accepted", value: statusCounts.accepted ?? 0, helper: "Ready for payment", icon: CheckCircle2, tone: "emerald" },
      { label: "Completed", value: statusCounts.completed ?? 0, helper: "Finished services", icon: Stethoscope, tone: "sky" },
      { label: "Visible value", value: formatPrice(String(visibleValue), "RWF"), helper: "Current results", icon: CreditCard, tone: "violet" },
    ],
    [bookings.length, data?.total, statusCounts.accepted, statusCounts.completed, statusCounts.pending, visibleValue],
  );

 
  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.bookings_title")}
          subtitle={t("pages.patient.bookings_sub")}
        />
        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2, lg: 3 }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">

          {/* Inline feedback banner  shown directly below the meta bar */}
          {feedback && (
            <FeedbackBanner
              feedback={feedback}
              onDismiss={() => setFeedback(null)}
            />
          )}

          {/* Sticky meta bar */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <p className="text-[11px] text-muted-foreground whitespace-nowrap">
               {t("pages.patient.service_bookings_total", { total: data?.total ?? bookings.length })}
              </p> 
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value as SortOption)}
                className="hidden sm:block px-2 py-1.5 text-[11px] font-medium bg-card border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
              >
                <option value="date-desc">{t("pages.patient.newest_first")}</option>
                <option value="date-asc">{t("pages.patient.oldest_first")}</option>
              </select>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />

              {/* View toggle */}
              <div className="flex rounded-[6px] border border-border/60 overflow-hidden bg-card shadow-sm">
                <button
                  onClick={() => setView("table")}
                  aria-label={t("pages.patient.table_view")}
                  className={cn(
                    "px-2.5 py-1.5 transition-all",
                    view === "table"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M3 15h18M9 3v18" />
                  </svg>
                </button>
                <button
                  onClick={() => setView("cards")}
                  aria-label={t("pages.patient.card_view")}
                  className={cn(
                    "px-2.5 py-1.5 border-l border-border/60 transition-all",
                    view === "cards"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 space-y-4">

            <div className="flex items-center border-b border-border/60 px-2 sm:px-4 bg-card/30 shrink-0 overflow-x-auto">

              <Link to='/patient/appointments' className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium hover:text-primary transition-all duration-200 shrink-0 whitespace-nowrap  text-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.appointments')}
                </span>
                <span className="sm:hidden">
                  {t('consult.bookings.appointments_short')}
                </span>
              </Link>

              <Link to='/patient/instant' className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium hover:text-primary transition-all duration-200 shrink-0 whitespace-nowrap  text-foreground">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.instant')}
                </span>
                <span className="sm:hidden">

                  {t('consult.bookings.instant_short')}
                </span>
              </Link>

              <Link to='/patient/service-bookings' className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium hover:text-primary transition-all duration-200 shrink-0 whitespace-nowrap  text-foreground border-b-2 border-primary text-primary">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.service_bookings')}
                </span>
                <span className="sm:hidden">
                  {t('consult.bookings.service_bookings_short')}
                </span>
              </Link>

            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-[6px] border border-border/60 bg-card/40 p-1">
              {statusTabs.map((tab) => {
                const active = filters.status === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => set("status", tab.value as FilterState["status"])}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-[6px] px-3 py-2 text-xs font-semibold transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <span>{tab.label}</span>
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px]",
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <PatientStatsGrid items={statsItems} />
            {/* Error state */}
            {isError && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-destructive/10 flex items-center justify-center border border-destructive/20">
                  <AlertCircle className="w-6 h-6 text-destructive/60" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{t("pages.patient.failed_load_bookings")}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{t("pages.patient.something_went_wrong_try_again")}</p>
                </div>
                <button
                  onClick={() => refetch()}
                  className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t("pages.patient.retry")}
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && bookings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <CalendarDays className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {filters.status === "all" ? t("pages.patient.no_bookings_yet") : t("pages.patient.no_status_bookings", { status: t(`pages.patient.status_${filters.status}`, filters.status) })}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {filters.q ? t("pages.patient.try_different_search") : t("pages.patient.service_bookings_will_appear")}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline"
                  >
                    {t("pages.patient.clear_all_filters")}
                  </button>
                )}
              </div>
            )}

            {/* Table view  */}
            {view === "table" && (isLoading || bookings.length > 0) && !isError && (
              <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] min-w-[480px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-3 sm:px-4 py-3 font-semibold">{t("pages.patient.service")}</th>
                        <th className="text-left px-3 sm:px-4 py-3 font-semibold hidden sm:table-cell">{t("pages.patient.health_facility")}</th>
                        <th className="text-left px-3 sm:px-4 py-3 font-semibold hidden md:table-cell">{t("pages.patient.date_time")}</th>
                        <th className="text-left px-3 sm:px-4 py-3 font-semibold">{t("pages.patient.status")}</th>
                        <th className="px-3 sm:px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                        : bookings.map((b) => (
                          <tr
                            key={b.id}
                            className="border-t border-border/40 hover:bg-secondary/20 transition-colors"
                          >
                            <td className="px-3 sm:px-4 py-3">
                              <div>
                                <p className="font-semibold text-foreground leading-tight">{b.service.name_en}</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                  #{b.id} · {b.booked_by}
                                </p>
                                {/* Hospital shown inline on mobile */}
                                <p className="sm:hidden text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                                  <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                                  {b.hospital.name_en}
                                </p>
                                {/* Date shown inline on small screens */}
                                <p className="md:hidden text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                                  <CalendarDays className="w-2.5 h-2.5 flex-shrink-0" />
                                  {formatDate(b.preferred_date)} · {formatTime(b.preferred_time)}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                              <span className="flex items-center gap-1.5 text-muted-foreground/80">
                                <Building2 className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                                {b.hospital.name_en}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 hidden md:table-cell whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <CalendarDays className="h-3 w-3 text-muted-foreground/40" />
                                  {formatDate(b.preferred_date)}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                                  <Clock className="h-3 w-3 text-muted-foreground/40" />
                                  {formatTime(b.preferred_time)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <StatusBadge status={b.status} />
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 sm:px-2.5 text-[10px] font-semibold rounded-[6px] transition-all"
                                  onClick={() => setDetailId(b.id)}
                                >
                                  <Eye className="w-3 h-3 sm:mr-1" />
                                  <span className="hidden sm:inline">{t("pages.patient.details")}</span>
                                </Button>
                                {b.status === "pending" || b.status === "accepted" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 sm:px-2.5 text-[10px] font-semibold rounded-[6px] text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 transition-all"
                                    onClick={() => setCancelTarget(b)}
                                  >
                                    <Trash2 className="w-3 h-3 sm:mr-1" />
                                    <span className="hidden sm:inline">{t("pages.patient.cancel")}</span>
                                  </Button>
                                ) : (
                                  <span className="hidden sm:inline text-[10px] text-muted-foreground/40 w-[58px] text-center">-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/*  Cards view   */}
            {view === "cards" && (isLoading || bookings.length > 0) && !isError && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 px-4 sm:px-5">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
                  : bookings.map((b) => (
                    <BookingCardItem
                      key={b.id}
                      booking={b}
                      onCancel={setCancelTarget}
                      onView={(b) => setDetailId(b.id)}
                    />
                  ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !isError && totalPages > 1 && (
              <Pagination
                currentPage={data?.current_page ?? filters.page}
                totalPages={totalPages}
                total={data?.total ?? 0}
                perPage={data?.per_page ?? 15}
                onPageChange={(p) => set("page", p)}
              />
            )}
          </div>
        </main>
      </div>

      {/*   Detail Drawer  */}
      {detailId !== null && (
        <BookingDetailDrawer
          bookingId={detailId}
          onClose={() => setDetailId(null)}
          onCancelRequest={(b) => {
            setDetailId(null);
            setCancelTarget(b);
          }}
        />
      )}

      {/*  Cancel Dialog   */}
      {cancelTarget && (
        <CancelDialog
          booking={cancelTarget}
          onConfirm={handleCancelConfirm}
          onCancel={() => {
            setCancelTarget(null);
            setCancelError(null);
          }}
          isLoading={isCancelling}
          error={cancelError}
        />
      )}

      {/* My medical info drawer */}
      <MyMedicalInfoDrawer open={medInfoOpen} onClose={() => setMedInfoOpen(false)} />

    </DashboardLayout>
  );
}

export default ServiceBookings;

