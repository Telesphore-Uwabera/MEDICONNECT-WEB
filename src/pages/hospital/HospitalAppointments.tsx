import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Check,
  Clock,
  User,
  X,
  Search,
  AlertCircle,
  Loader2,
  RefreshCw,
  CreditCard,
  XCircle,
  CheckCircle2,
  FileText,
  ChevronRight,
  Building2,
  Stethoscope,
  Ban,
  Receipt,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  BookingStatus,
  ServiceBookingDetail,
  ServiceBookingSummary,
  useAcceptServiceBooking,
  useCompleteServiceBooking,
  useGetServiceBooking,
  useGetServiceBookings,
  useRejectServiceBooking,
  normaliseDateString,
} from "@/hooks/hospital/use-service-bookings";
import {
  useGetDepartments,
  useGetServicesByDepartment,
} from "@/hooks/hospital/use-hospital-departments";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
  search: string;
  status: BookingStatus | "all";
  paymentStatus: string;
  departmentId: string;
  serviceId: string;
  doctorId: string;
  patientId: string;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  paymentStatus: "all",
  departmentId: "all",
  serviceId: "all",
  doctorId: "all",
  patientId: "",
  dateFrom: "",
  dateTo: "",
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  accepted: "bg-primary/10 text-primary border-primary/20",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  cancelled:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800",
};

const STATUS_DOT: Record<BookingStatus, string> = {
  pending: "bg-amber-500",
  accepted: "bg-primary",
  completed: "bg-emerald-500",
  rejected: "bg-red-500",
  cancelled: "bg-zinc-400",
};

const STATUS_TAB_VALUES = ["all", "pending", "accepted", "completed", "rejected", "cancelled"] as const;

const PAYMENT_STYLES: Record<string, string> = {
  unpaid: "text-amber-600 bg-amber-50 dark:bg-amber-950/20",
  paid: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20",
  refunded: "text-zinc-500 bg-zinc-100 dark:bg-zinc-900/30",
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtCurrency = (n: number | string, currency = "RWF") =>
  new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(n));

const fmtTime = (t: string | null | undefined): string | null => {
  if (!t) return null;
  return t.slice(0, 5);
};

const fmtPreferredDate = (raw: string): string => {
  try {
    return format(parseISO(normaliseDateString(raw)), "EEEE, MMMM d, yyyy");
  } catch {
    return raw;
  }
};

const fmtPreferredDateShort = (raw: string): string => {
  try {
    return format(parseISO(normaliseDateString(raw)), "EEE, MMM d, yyyy");
  } catch {
    return raw;
  }
};

// ─── Detail field ─────────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-b-0">
      <div className="w-6 h-6 rounded flex items-center justify-center bg-muted/40 shrink-0 mt-0.5">
        <Icon className="w-3 h-3 text-muted-foreground/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-semibold mb-0.5">
          {label}
        </p>
        <div className={cn("text-xs text-foreground font-medium leading-relaxed", valueClass)}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── Booking Detail Drawer ────────────────────────────────────────────────────

function BookingDrawer({
  bookingId,
  onClose,
  onAccept,
  onReject,
  onComplete,
  isActing,
}: {
  bookingId: number;
  onClose: () => void;
  onAccept: (b: ServiceBookingSummary) => void;
  onReject: (b: ServiceBookingSummary) => void;
  onComplete: (b: ServiceBookingSummary) => void;
  isActing: boolean;
}) {
  const { data: booking, isLoading, isError } = useGetServiceBooking(bookingId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Mark complete only requires accepted status
  const canComplete = booking?.status === "accepted";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
        aria-label={t('pages.hospital.close_drawer')}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col",
          "w-full sm:w-[420px]",
          "bg-background border-l border-border/60 shadow-2xl",
          "animate-in slide-in-from-right duration-250",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t('pages.hospital.booking_details_aria', { id: bookingId })}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 bg-card/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[5px] bg-primary/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground tracking-tight">
                {t('pages.hospital.booking_hash', { id: bookingId })}
              </h2>
              <p className="text-[10px] text-muted-foreground/60 mt-px">{t('pages.hospital.full_details')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-[5px] flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label={t("common.close")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <DrawerSkeleton />
          ) : isError || !booking ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 px-5 text-center">
              <div className="w-10 h-10 rounded-[5px] bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive/60" />
              </div>
              <p className="text-xs font-semibold text-foreground">{t('pages.hospital.failed_loading')}</p>
              <p className="text-[10px] text-muted-foreground/60">
               {t('pages.hospital.could_not_load')} #{bookingId}
              </p>
            </div>
          ) : (
            <BookingDrawerContent booking={booking} />
          )}
        </div>

        {/* Footer */}
        {booking && (
          <DrawerFooter
            booking={booking}
            canComplete={canComplete}
            isActing={isActing}
            onAccept={onAccept}
            onReject={onReject}
            onComplete={onComplete}
          />
        )}
      </div>
    </>
  );
}

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-0 p-4 animate-pulse">
      <div className="h-8 bg-muted/40 rounded-[5px] w-full mb-4" />
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex gap-3 py-2.5 border-b border-border/30">
          <div className="w-6 h-6 rounded bg-muted/40 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 bg-muted/40 rounded w-1/4" />
            <div className="h-3 bg-muted/60 rounded w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingDrawerContent({ booking }: { booking: ServiceBookingDetail }) {
  return (
    <div className="p-4 flex flex-col gap-0">
      {/* Status banner */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-[5px] border mb-5 text-[11px] font-semibold",
          STATUS_STYLES[booking.status],
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[booking.status])} />
        {t(`pages.hospital.status_${booking.status}`)}
        {booking.accepted_at && booking.status === "accepted" && (
          <span className="ml-auto font-normal text-[10px] opacity-60">
            {t('pages.hospital.status_accepted')} {format(parseISO(booking.accepted_at), "MMM d, HH:mm")}
          </span>
        )}
        {booking.completed_at && booking.status === "completed" && (
          <span className="ml-auto font-normal text-[10px] opacity-60">
             {t('pages.hospital.status_completed')} {format(parseISO(booking.completed_at), "MMM d, HH:mm")}
          </span>
        )}
      </div>

      {/* Patient */}
      <SectionLabel>{t('pages.hospital.patient')}</SectionLabel>
      <DetailRow icon={User} label={t('pages.hospital.name')} value={booking.patient.name} />
      {booking.patient.phone && (
        <DetailRow icon={Phone} label={t('pages.hospital.phone')} value={booking.patient.phone} />
      )}

      {/* Appointment */}
      <SectionLabel className="mt-5">{t('pages.hospital.appointments')}</SectionLabel>
      <DetailRow icon={Stethoscope} label={t('pages.hospital.services')} value={booking.service.name_en} />
      {booking.service.code && (
        <DetailRow icon={FileText} label={t('pages.hospital.service_code')} value={booking.service.code} />
      )}
      {booking.service.duration_minutes && (
        <DetailRow
          icon={Clock}
          label={t('pages.hospital.service_code')}
          value={`${booking.service.duration_minutes} ${t('pages.hospital.minutes_short')}`}
        />
      )}
      <DetailRow icon={Building2} label={t('pages.hospital.department')} value={booking.department.name_en} />
      {booking.department.floor && (
        <DetailRow
          icon={Building2}
          label={t('pages.hospital.location')}
          value={[booking.department.floor, booking.department.room_number]
            .filter(Boolean)
            .join(", ")}
        />
      )}
      <DetailRow
        icon={Calendar}
        label={t('pages.hospital.pref_date')}
        value={fmtPreferredDate(booking.preferred_date)}
      />
      {booking.preferred_time && (
        <DetailRow
          icon={Clock}
          label={t('pages.hospital.pref_time')}
          value={fmtTime(booking.preferred_time) ?? "—"}
        />
      )}
      {booking.notes && (
        <DetailRow icon={FileText} label={t('pages.doctor.patient_notes')} value={booking.notes} />
      )}

      {/* Payment */}
      <SectionLabel className="mt-5"> {t('pages.hospital.payment')}</SectionLabel>
      <DetailRow
        icon={CreditCard}
        
        label={t('pages.hospital.service_price')}
        value={fmtCurrency(booking.price, booking.currency)}
      />
      <DetailRow
        icon={CreditCard}
        label={t('pages.hospital.patient_pays')}
        value={
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold",
              PAYMENT_STYLES[booking.payment_status],
            )}
          >
            {fmtCurrency(booking.patient_pays, booking.currency)}
            <span className="opacity-50">·</span>
            {booking.payment_status}
          </span>
        }
      />

      {/* Rejection reason */}
      {booking.rejection_reason && (
        <>
          <SectionLabel className="mt-5">  {t('pages.hospital.payment')}</SectionLabel>
          <DetailRow
            icon={Ban}
            label={t('pages.hospital.reason')}
            value={booking.rejection_reason}
            valueClass="text-destructive/80"
          />
        </>
      )}
    </div>
  );
}

function DrawerFooter({
  booking,
  canComplete,
  isActing,
  onAccept,
  onReject,
  onComplete,
}: {
  booking: ServiceBookingDetail;
  canComplete: boolean;
  isActing: boolean;
  onAccept: (b: ServiceBookingSummary) => void;
  onReject: (b: ServiceBookingSummary) => void;
  onComplete: (b: ServiceBookingSummary) => void;
}) {
  return (
    <div className="shrink-0 border-t border-border/50 px-4 py-3.5 flex gap-2 bg-card/80 backdrop-blur">
      {booking.status === "pending" && (
        <>
          <button
            disabled={isActing}
            style={{ borderRadius: "5px" }}
            className="flex-1 h-8 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            onClick={() => onAccept(booking)}
          >
            <Check className="h-3 w-3" />
                {t('pages.hospital.accept')}
          </button>
          <button
            disabled={isActing}
            style={{ borderRadius: "5px" }}
            className="flex-1 h-8 text-[11px] font-medium border border-border/60 text-muted-foreground hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            onClick={() => onReject(booking)}
          >
            <X className="h-3 w-3" /> 
               {t('pages.hospital.reject')}
          </button>
        </>
      )}

      {booking.status === "accepted" && (
        <button
          disabled={isActing || !canComplete}
          style={{ borderRadius: "5px" }}
          className="flex-1 h-8 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
          onClick={() => onComplete(booking)}
        >
          {isActing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )} 
          {t('pages.hospital.mark_complete')}
        </button>
      )}

      {(booking.status === "completed" ||
        booking.status === "rejected" ||
        booking.status === "cancelled") && (
          <p className="text-[10px] text-muted-foreground/40 italic text-center w-full self-center">
           {t('pages.hospital.no_further_actions')}
          </p>
        )}
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1",
        className,
      )}
    >
      {children}
    </p>
  );
}

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({
  booking,
  onConfirm,
  onClose,
  isLoading,
}: {
  booking: ServiceBookingSummary;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) {
      setErr(t('pages.hospital.rejection_reason_required'));
      return;
    }
    onConfirm(reason.trim());
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border rounded-[6px] shadow-xl w-full max-w-sm p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[5px] bg-destructive/10 flex items-center justify-center shrink-0">
            <XCircle className="w-3.5 h-3.5 text-destructive" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{t('pages.hospital.reject_booking')}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {booking.service.name_en} · {booking.patient.name}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            {t('pages.hospital.reason')} *
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErr("");
            }}
            placeholder={t('pages.hospital.reject_reason_placeholder')}
            rows={3}
            className="w-full px-3 py-2 text-xs rounded-[5px] border border-border/70 bg-background text-foreground placeholder:text-muted-foreground/40 resize-none outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
          />
          {err && <p className="text-[10px] text-destructive">{err}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{ borderRadius: "5px" }}
            className="px-3 py-1.5 text-[11px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
          {t('pages.hospital.cancel_btn')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            style={{ borderRadius: "5px" }}
            className="px-3 py-1.5 text-[11px] bg-destructive text-white font-semibold hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            
             {t('pages.hospital.reject')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Accept modal ─────────────────────────────────────────────────────────────

function AcceptModal({
  booking,
  onConfirm,
  onClose,
  isLoading,
}: {
  booking: ServiceBookingSummary;
  onConfirm: (notes?: string) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, isLoading]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />
      <div className="relative bg-card border border-border rounded-[6px] shadow-xl w-full max-w-sm p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[5px] bg-primary/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{t('pages.hospital.accept_booking')}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {booking.service.name_en} · {booking.patient.name}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-[5px] px-3 py-2 text-[10px] text-amber-700 dark:text-amber-400">
          <Receipt className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            {t('pages.hospital.patient_payment')}{" "}
            <strong>{fmtCurrency(booking.patient_pays, booking.currency)}</strong>{" "}
            {t('pages.hospital.waiting_hrs')}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            {t('pages.doctor.patient_notes')} {" "}
            <span className="normal-case text-muted-foreground/50 font-normal">({t('pages.hospital.optional')})</span>
          </label>
          <textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('pages.hospital.notes_placeholder')}
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-[5px] border border-border/70 bg-background text-foreground placeholder:text-muted-foreground/40 resize-none outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{ borderRadius: "5px" }}
            className="px-3 py-1.5 text-[11px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          > 
             {t('pages.hospital.cancel_btn')}
          </button>
          <button
            onClick={() => onConfirm(notes.trim() || undefined)}
            disabled={isLoading}
            style={{ borderRadius: "5px" }}
            className="px-3 py-1.5 text-[11px] bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )} 
             {t('pages.hospital.accept_notify')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar atoms ────────────────────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2.5">
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
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{ borderRadius: "5px" }}
          className={cn(
            "px-2.5 py-1.5 text-[11px] border transition-all duration-150 text-left",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
              : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-card border border-border/60 rounded-[5px] p-4 flex gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-[5px] bg-muted/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-muted/60 rounded w-1/3" />
        <div className="h-2.5 bg-muted/40 rounded w-2/3" />
        <div className="h-2.5 bg-muted/30 rounded w-1/2" />
      </div>
      <div className="flex gap-1.5 shrink-0">
        <div className="h-7 w-16 bg-muted/50 rounded-[5px]" />
        <div className="h-7 w-16 bg-muted/30 rounded-[5px]" />
      </div>
    </div>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  booking,
  onView,
  onAccept,
  onReject,
  onComplete,
  isActing,
}: {
  booking: ServiceBookingSummary;
  onView: (b: ServiceBookingSummary) => void;
  onAccept: (b: ServiceBookingSummary) => void;
  onReject: (b: ServiceBookingSummary) => void;
  onComplete: (b: ServiceBookingSummary) => void;
  isActing: boolean;
}) {
  // Mark complete only requires accepted status — no payment check
  const canComplete = booking.status === "accepted";

  return (
    <div className="bg-card border border-border/60 rounded-[5px] p-4 flex flex-wrap items-start gap-3 hover:border-primary/30 hover:bg-card/80 transition-colors duration-150">
      {/* Avatar */}
      <div className="h-8 w-8 rounded-[5px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <User className="h-3.5 w-3.5" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onView(booking)}
            className="text-[11px] font-semibold text-foreground hover:text-primary hover:underline transition-colors"
          >
            {booking.patient.name}
          </button>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 border-border/50 bg-secondary/20"
          >
            {booking.department.name_en}
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary"
          >
            {booking.service.name_en}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 gap-1", STATUS_STYLES[booking.status])}
          >
            <span className={cn("w-1 h-1 rounded-full", STATUS_DOT[booking.status])} />
            {t(`pages.hospital.status_${booking.status}`)}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {fmtPreferredDateShort(booking.preferred_date)}
          </span>
          {booking.preferred_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtTime(booking.preferred_time)}
            </span>
          )}
          <span
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-[4px]",
              PAYMENT_STYLES[booking.payment_status],
            )}
          >
            <CreditCard className="h-3 w-3" />
            {fmtCurrency(booking.patient_pays, booking.currency)}
            {" · "}
            {booking.payment_status}
          </span>
        </div>
      </div>

      {/* Actions — always visible */}
      <div className="flex flex-wrap gap-1.5 ml-auto shrink-0">
        {/* View details — always visible */}
        <button
          onClick={() => onView(booking)}
          style={{ borderRadius: "5px" }}
          className="flex items-center gap-1 h-7 px-2.5 text-[10px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors font-medium"
        >
          <ChevronRight className="h-3 w-3" />
          {t('pages.hospital.details')}
        </button>

        {booking.status === "pending" && (
          <>
            <button
              disabled={isActing}
              style={{ borderRadius: "5px" }}
              className="flex items-center gap-1 h-7 px-2.5 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors disabled:opacity-50"
              onClick={() => onAccept(booking)}
            >
              <Check className="h-3 w-3" />
               {t('pages.hospital.accept')}
            </button>
            <button
              disabled={isActing}
              style={{ borderRadius: "5px" }}
              className="flex items-center gap-1 h-7 px-2.5 text-[10px] font-medium border border-border/60 text-muted-foreground hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
              onClick={() => onReject(booking)}
            >
              <X className="h-3 w-3" />
              
               {t('pages.hospital.reject')}
            </button>
          </>
        )}

        {booking.status === "accepted" && (
          <button
            disabled={isActing || !canComplete}
            style={{ borderRadius: "5px" }}
            className="flex items-center gap-1 h-7 px-2.5 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40"
            onClick={() => onComplete(booking)}
          >
            <CheckCircle2 className="h-3 w-3" />
            
              {t('pages.hospital.complete')}
          </button>
        )}

        {(booking.status === "completed" ||
          booking.status === "rejected" ||
          booking.status === "cancelled") && (
            <span className="text-[10px] text-muted-foreground/40 italic self-center">
                {t('pages.hospital.no_actions')}
            </span>
          )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const HospitalAppointments = () => {
  const { t, i18n } = useTranslation();

  const [viewingId, setViewingId] = useState<number | null>(null);
  const [acceptingBooking, setAcceptingBooking] =
    useState<ServiceBookingSummary | null>(null);
  const [rejectingBooking, setRejectingBooking] =
    useState<ServiceBookingSummary | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: departments = [] } = useGetDepartments({ active_only: true });
  const selectedDepartmentId =
    filters.departmentId !== "all" ? Number(filters.departmentId) : null;
  const { data: selectedDepartmentServices = [] } =
    useGetServicesByDepartment(selectedDepartmentId);

  const apiFilters = useMemo(
    () => ({
      department_id:
        filters.departmentId !== "all" ? Number(filters.departmentId) : undefined,
      hospital_service_id:
        filters.serviceId !== "all" ? Number(filters.serviceId) : undefined,
      doctor_id: filters.doctorId !== "all" ? Number(filters.doctorId) : undefined,
      patient_id: filters.patientId ? Number(filters.patientId) : undefined,
      payment_status:
        filters.paymentStatus !== "all" ? filters.paymentStatus : undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    }),
    [
      filters.status,
      filters.departmentId,
      filters.serviceId,
      filters.doctorId,
      filters.patientId,
      filters.paymentStatus,
      filters.dateFrom,
      filters.dateTo,
    ],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetServiceBookings(apiFilters);
  const bookings = data?.data ?? [];

  const acceptMut = useAcceptServiceBooking();
  const rejectMut = useRejectServiceBooking();
  const completeMut = useCompleteServiceBooking();

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.paymentStatus !== "all" ||
    filters.departmentId !== "all" ||
    filters.serviceId !== "all" ||
    filters.doctorId !== "all" ||
    filters.patientId !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  useEffect(() => {
    const locked = filterOpen || viewingId !== null;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen, viewingId]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return bookings.filter((b) => {
      if (filters.status !== "all" && b.status !== filters.status) return false;
      if (
        filters.paymentStatus !== "all" &&
        b.payment_status !== filters.paymentStatus
      )
        return false;
      if (
        filters.departmentId !== "all" &&
        b.department.id !== Number(filters.departmentId)
      )
        return false;
      if (filters.serviceId !== "all" && b.service.id !== Number(filters.serviceId))
        return false;
      if (filters.patientId && b.patient.id !== Number(filters.patientId)) return false;
      const bookingDate = normaliseDateString(b.preferred_date);
      if (filters.dateFrom && bookingDate < filters.dateFrom) return false;
      if (filters.dateTo && bookingDate > filters.dateTo) return false;
      if (
        q &&
        !b.patient.name.toLowerCase().includes(q) &&
        !b.service.name_en.toLowerCase().includes(q) &&
        !b.department.name_en.toLowerCase().includes(q) &&
        !String(b.id).includes(q)
      )
        return false;
      return true;
    }).sort((a, b) => {
      const order: Record<BookingStatus, number> = {
        pending: 0,
        accepted: 1,
        completed: 2,
        rejected: 3,
        cancelled: 4,
      };
      const statusDiff = order[a.status] - order[b.status];
      if (statusDiff !== 0) return statusDiff;
      return normaliseDateString(a.preferred_date).localeCompare(
        normaliseDateString(b.preferred_date),
      );
    });
  }, [bookings, filters]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const accepted = bookings.filter((b) => b.status === "accepted").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const rejected = bookings.filter((b) => b.status === "rejected").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;
    const paid = bookings.filter((b) => b.payment_status === "paid").length;
    const unpaid = bookings.filter((b) => b.payment_status !== "paid").length;
    return { total, pending, accepted, completed, rejected, cancelled, paid, unpaid };
  }, [bookings]);

  const pendingCount = stats.pending;
  const statusTabs = useMemo(
    () =>
      STATUS_TAB_VALUES.map((value) => ({
        value,
        label:
          value === "all"
            ? t("pages.hospital.all_statuses")
            : t(`pages.hospital.status_${value}`),
        count: value === "all" ? stats.total : stats[value as BookingStatus],
      })),
    [stats, t],
  );


  const handleAccept = async (notes?: string) => {
    if (!acceptingBooking) return;
    try {
      const res = await acceptMut.mutateAsync({ id: acceptingBooking.id, notes });
      toast.success(res.message ?? t('pages.hospital.booking_accepted'));
      if (res.invoice_number) {
        toast.info(t('pages.hospital.invoice_sent_to_patient', { number: res.invoice_number }));
      }
      setAcceptingBooking(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('pages.hospital.failed_accept_booking'));
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectingBooking) return;
    try {
      const res = await rejectMut.mutateAsync({
        id: rejectingBooking.id,
        rejection_reason: reason,
      });
      toast.success(res.message ?? t('pages.hospital.booking_rejected'));
      setRejectingBooking(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('pages.hospital.failed_reject_booking'));
    }
  };

  const handleComplete = async (booking: ServiceBookingSummary) => {
    try {
      const res = await completeMut.mutateAsync(booking.id);
      toast.success(res.message ?? t('pages.hospital.booking_marked_completed'));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('pages.hospital.failed_complete_booking'));
    }
  };

  const handleDrawerAccept = (b: ServiceBookingSummary) => setAcceptingBooking(b);
  const handleDrawerReject = (b: ServiceBookingSummary) => setRejectingBooking(b);
  const handleDrawerComplete = (b: ServiceBookingSummary) => handleComplete(b);

  const isActing =
    acceptMut.isPending || rejectMut.isPending || completeMut.isPending;

  const departmentOptions = useMemo(
    () => [
      { value: "all", label: t('pages.hospital.all_departments') },
      ...departments.map((department) => ({
        value: String(department.id),
        label:
          (i18n.language === "fr" && department.name_fr) ||
          (i18n.language === "rw" && department.name_kiny) ||
          department.name_en,
      })),
    ],
    [departments, i18n.language],
  );

  const serviceOptions = useMemo(() => {
    const services =
      selectedDepartmentId !== null
        ? selectedDepartmentServices
        : departments.flatMap((department) => department.services ?? []);
    return [
      { value: "all", label: t('pages.hospital.all_services') },
      ...services.map((service) => ({
        value: String(service.id),
        label:
          (i18n.language === "fr" && service.name_fr) ||
          (i18n.language === "rw" && service.name_kiny) ||
          service.name_en,
      })),
    ];
  }, [departments, i18n.language, selectedDepartmentId, selectedDepartmentServices]);

  const doctorOptions = useMemo(() => {
    const doctors = (
      selectedDepartmentId !== null
        ? departments.find((department) => department.id === selectedDepartmentId)
            ?.doctors
        : departments.flatMap((department) => department.doctors ?? [])
    ) ?? [];
    const seen = new Set<number>();
    return [
      { value: "all", label: t('pages.hospital.all_doctors') },
      ...doctors
        .filter((doctor) => {
          if (seen.has(doctor.id)) return false;
          seen.add(doctor.id);
          return true;
        })
        .map((doctor) => ({
          value: String(doctor.id),
          label: doctor.name,
        })),
    ];
  }, [departments, selectedDepartmentId]);

  const filterFields = useMemo(() => [
    {
      type: "search" as const,
      key: "search",
      label:t('pages.hospital.search'),
      placeholder:t('pages.hospital.search_appts'),
      value: filters.search,
      onChange: (v: string) => set("search", v),
    },
    {
      type: "select" as const,
      key: "status",
      label:t('pages.hospital.status'),
      value: filters.status,
      options: [
        { value: "all", label: t('pages.hospital.all_statuses') },
        { value: "pending", label:  t('pages.hospital.status_pending')},
        { value: "accepted", label:  t('pages.hospital.status_accepted') },
        { value: "completed", label:t('pages.hospital.status_completed') },
        { value: "rejected", label: t('pages.hospital.status_rejected') },
        { value: "cancelled", label:t('pages.hospital.status_cancelled')},
      ],
      onChange: (v: string) => set("status", v as FilterState["status"]),
    },
    {
      type: "select" as const,
      key: "paymentStatus",
      label:t('pages.hospital.payment'),
      value: filters.paymentStatus,
      options: [
        { value: "all", label:  t('pages.hospital.all_payment') },
        { value: "paid", label: t('pages.hospital.paid_payment') },
        { value: "unpaid", label:  t('pages.hospital.unpaid_payment') },
        { value: "pending", label:  t('pages.hospital.pending_payment') },
        { value: "refunded", label:  t('pages.hospital.refunded_payment') },
      ],
      onChange: (v: string) => set("paymentStatus", v),
    },
    {
      type: "select" as const,
      key: "departmentId",
      label: t('pages.hospital.department'),
      value: filters.departmentId,
      options: departmentOptions,
      onChange: (v: string) => {
        setFilters((prev) => ({
          ...prev,
          departmentId: v,
          serviceId: "all",
          doctorId: "all",
        }));
      },
    },
    {
      type: "select" as const,
      key: "serviceId",
      label: t('pages.hospital.services'),
      value: filters.serviceId,
      options: serviceOptions,
      onChange: (v: string) => set("serviceId", v),
    },
    {
      type: "select" as const,
      key: "doctorId",
      label: t('pages.hospital.doctor'),
      value: filters.doctorId,
      options: doctorOptions,
      onChange: (v: string) => set("doctorId", v),
    },
    {
      type: "custom" as const,
      key: "patientId",
      label:  t('pages.hospital.patient_id'),
      render: () => (
        <input
          type="number"
          min="1"
          value={filters.patientId}
          onChange={(e) => set("patientId", e.target.value)}
          placeholder={t('pages.hospital.patient_id')}
          className="w-full h-8 px-2.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
        />
      ),
    },
    {
      type: "custom" as const,
      key: "dateFrom",
      label: t('pages.hospital.date_range'),
      render: () => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => set("dateFrom", e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
            />
            <span className="text-[11px] text-muted-foreground">
              {t('pages.doctor.to')}
            </span>
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom}
              onChange={(e) => set("dateTo", e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
            />
          </div>
          {(filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() => {
                set("dateFrom", "");
                set("dateTo", "");
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors self-start"
            > 
               {t('pages.doctor.clear_dates')}
            </button>
          )}
        </div>
      )
    }
  ], [
    filters.search,
    filters.status,
    filters.paymentStatus,
    filters.departmentId,
    filters.serviceId,
    filters.doctorId,
    filters.patientId,
    filters.dateFrom,
    filters.dateTo,
    departmentOptions,
    serviceOptions,
    doctorOptions,
    set,
  ]);

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.appts_title")}
          subtitle={t("pages.hospital.appts_sub")}
        />

    
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-4 pt-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label={t("pages.hospital.total_bookings")} value={isLoading ? "..." : stats.total} icon={Receipt} />
              <StatCard label={t("pages.hospital.status_pending")}  value={isLoading ? "..." : stats.pending} icon={Clock} accent="warning" />
              <StatCard label={t("pages.hospital.status_accepted")}  value={isLoading ? "..." : stats.accepted} icon={CheckCircle2} accent="info" />
              <StatCard label={t("pages.hospital.status_completed")}  value={isLoading ? "..." : stats.completed} icon={Check} accent="success" />
              <StatCard label={t("pages.hospital.status_paid")}  value={isLoading ? "..." : stats.paid} icon={CreditCard} accent="success" />
              <StatCard label={t("pages.hospital.status_unpaid")}  value={isLoading ? "..." : stats.unpaid} icon={XCircle} accent="warning" />
            </div>
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-y border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">
                  {isLoading ? "—" : filtered.length}
                </span>{" "}
                {t('pages.hospital.booking_word', { count: filtered.length })}
                {!isLoading && data && (
                  <span className="text-muted-foreground/50 ml-1">
                    / {data.total} {t('pages.hospital.total')}
                  </span>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="ml-2 text-primary hover:underline text-[10px] font-medium"
                  >
                     {t('pages.hospital.reset')}
                  </button>
                )}
              </p>

              {pendingCount > 0 && !isLoading && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[4px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingCount} 
                     {t('pages.hospital.pending')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => set("search", e.target.value)}
                  placeholder={t('pages.hospital.analytics_search_placeholder')}
                  className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[5px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                style={{ borderRadius: "5px" }}
                className="w-7 h-7 flex items-center justify-center border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
                title={t('pages.hospital.refresh')}
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
                />
              </button>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>
          
          <div className="border-b border-border/60 bg-background/95 px-4 py-2">
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {statusTabs.map((tab) => {
                const active = filters.status === tab.value;
                const dotClass =
                  tab.value === "all"
                    ? "bg-muted-foreground/50"
                    : STATUS_DOT[tab.value as BookingStatus];

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => set("status", tab.value as FilterState["status"])}
                    className={cn(
                      "flex h-8 shrink-0 items-center gap-2 rounded-[6px] border px-3 text-[11px] font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isLoading ? "..." : tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <FilterBar
            open={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            fields={filterFields}
            cols={{ default: 1, sm: 2 }}
          />

          {/* Content */}
          <div className="p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-12 h-12 rounded-[5px] bg-destructive/10 flex items-center justify-center border border-destructive/20">
                  <AlertCircle className="w-5 h-5 text-destructive/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                  
                     {t('pages.hospital.something_went_wrong')}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {error instanceof Error ? error.message : t('pages.hospital.unknown_error')}
                  </p>
                </div>
                <button
                  onClick={() => refetch()}
                  style={{ borderRadius: "5px" }}
                  className="text-[11px] text-primary hover:underline font-semibold"
                > 
                     {t('pages.hospital.try_again')}
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-12 h-12 rounded-[5px] bg-muted/50 flex items-center justify-center border border-border/40">
                  <Calendar className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {hasActiveFilters
                      ?   t('pages.hospital.try_widen_search')
                      : t('pages.hospital.no_bookings')}
                  </p> 
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    style={{ borderRadius: "5px" }}
                    className="text-[11px] text-primary hover:underline font-semibold mt-1"
                  > 
                    {t('pages.hospital.clear_all')}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((b) => (
                  <AppointmentCard
                    key={b.id}
                    booking={b}
                    onView={(b) => setViewingId(b.id)}
                    onAccept={setAcceptingBooking}
                    onReject={setRejectingBooking}
                    onComplete={handleComplete}
                    isActing={isActing}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Detail drawer */}
      {viewingId !== null && (
        <BookingDrawer
          bookingId={viewingId}
          onClose={() => setViewingId(null)}
          onAccept={handleDrawerAccept}
          onReject={handleDrawerReject}
          onComplete={handleDrawerComplete}
          isActing={isActing}
        />
      )}

      {/* Accept modal */}
      {acceptingBooking && (
        <AcceptModal
          booking={acceptingBooking}
          onConfirm={handleAccept}
          onClose={() => setAcceptingBooking(null)}
          isLoading={acceptMut.isPending}
        />
      )}

      {/* Reject modal */}
      {rejectingBooking && (
        <RejectModal
          booking={rejectingBooking}
          onConfirm={handleReject}
          onClose={() => setRejectingBooking(null)}
          isLoading={rejectMut.isPending}
        />
      )}
    </DashboardLayout>
  );
};

export default HospitalAppointments;
