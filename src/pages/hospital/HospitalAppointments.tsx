import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Check,
  Clock,
  User,
  X,
  SlidersHorizontal,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
  search: string;
  status: BookingStatus | "all";
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
        aria-label="Close drawer"
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
        aria-label={`Booking #${bookingId} details`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 bg-card/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[5px] bg-primary/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground tracking-tight">
                Booking #{bookingId}
              </h2>
              <p className="text-[10px] text-muted-foreground/60 mt-px">Full details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-[5px] flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close"
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
              <p className="text-xs font-semibold text-foreground">Failed to load</p>
              <p className="text-[10px] text-muted-foreground/60">
                Could not fetch booking #{bookingId}
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
        {capitalize(booking.status)}
        {booking.accepted_at && booking.status === "accepted" && (
          <span className="ml-auto font-normal text-[10px] opacity-60">
            Accepted {format(parseISO(booking.accepted_at), "MMM d, HH:mm")}
          </span>
        )}
        {booking.completed_at && booking.status === "completed" && (
          <span className="ml-auto font-normal text-[10px] opacity-60">
            Completed {format(parseISO(booking.completed_at), "MMM d, HH:mm")}
          </span>
        )}
      </div>

      {/* Patient */}
      <SectionLabel>Patient</SectionLabel>
      <DetailRow icon={User} label="Name" value={booking.patient.name} />
      {booking.patient.phone && (
        <DetailRow icon={Phone} label="Phone" value={booking.patient.phone} />
      )}

      {/* Appointment */}
      <SectionLabel className="mt-5">Appointment</SectionLabel>
      <DetailRow icon={Stethoscope} label="Service" value={booking.service.name_en} />
      {booking.service.code && (
        <DetailRow icon={FileText} label="Service code" value={booking.service.code} />
      )}
      {booking.service.duration_minutes && (
        <DetailRow
          icon={Clock}
          label="Duration"
          value={`${booking.service.duration_minutes} min`}
        />
      )}
      <DetailRow icon={Building2} label="Department" value={booking.department.name_en} />
      {booking.department.floor && (
        <DetailRow
          icon={Building2}
          label="Location"
          value={[booking.department.floor, booking.department.room_number]
            .filter(Boolean)
            .join(", ")}
        />
      )}
      <DetailRow
        icon={Calendar}
        label="Preferred date"
        value={fmtPreferredDate(booking.preferred_date)}
      />
      {booking.preferred_time && (
        <DetailRow
          icon={Clock}
          label="Preferred time"
          value={fmtTime(booking.preferred_time) ?? "—"}
        />
      )}
      {booking.notes && (
        <DetailRow icon={FileText} label="Patient notes" value={booking.notes} />
      )}

      {/* Payment */}
      <SectionLabel className="mt-5">Payment</SectionLabel>
      <DetailRow
        icon={CreditCard}
        label="Service price"
        value={fmtCurrency(booking.price, booking.currency)}
      />
      <DetailRow
        icon={CreditCard}
        label="Patient pays"
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
          <SectionLabel className="mt-5">Rejection</SectionLabel>
          <DetailRow
            icon={Ban}
            label="Reason"
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
            Accept
          </button>
          <button
            disabled={isActing}
            style={{ borderRadius: "5px" }}
            className="flex-1 h-8 text-[11px] font-medium border border-border/60 text-muted-foreground hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            onClick={() => onReject(booking)}
          >
            <X className="h-3 w-3" />
            Reject
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
          Mark complete
        </button>
      )}

      {(booking.status === "completed" ||
        booking.status === "rejected" ||
        booking.status === "cancelled") && (
          <p className="text-[10px] text-muted-foreground/40 italic text-center w-full self-center">
            No further actions available
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
      setErr("Rejection reason is required");
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
            <p className="text-xs font-semibold text-foreground">Reject booking</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {booking.service.name_en} · {booking.patient.name}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            Reason *
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErr("");
            }}
            placeholder="e.g. No availability on requested date"
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
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            style={{ borderRadius: "5px" }}
            className="px-3 py-1.5 text-[11px] bg-destructive text-white font-semibold hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            Reject
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
            <p className="text-xs font-semibold text-foreground">Accept booking</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {booking.service.name_en} · {booking.patient.name}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-[5px] px-3 py-2 text-[10px] text-amber-700 dark:text-amber-400">
          <Receipt className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            Patient will be asked to pay{" "}
            <strong>{fmtCurrency(booking.patient_pays, booking.currency)}</strong>{" "}
            within 24 hours.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            Notes for patient{" "}
            <span className="normal-case text-muted-foreground/50 font-normal">(optional)</span>
          </label>
          <textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Please arrive 10 minutes early"
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
            Cancel
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
            Accept & notify
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
            {capitalize(booking.status)}
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
          Details
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
              Accept
            </button>
            <button
              disabled={isActing}
              style={{ borderRadius: "5px" }}
              className="flex items-center gap-1 h-7 px-2.5 text-[10px] font-medium border border-border/60 text-muted-foreground hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
              onClick={() => onReject(booking)}
            >
              <X className="h-3 w-3" />
              Reject
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
            Complete
          </button>
        )}

        {(booking.status === "completed" ||
          booking.status === "rejected" ||
          booking.status === "cancelled") && (
            <span className="text-[10px] text-muted-foreground/40 italic self-center">
              No actions
            </span>
          )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const HospitalAppointments = () => {
  const { t, i18n } = useTranslation();

  const { data, isLoading, isError, error, refetch } = useGetServiceBookings();
  const bookings = data?.data ?? [];

  const acceptMut = useAcceptServiceBooking();
  const rejectMut = useRejectServiceBooking();
  const completeMut = useCompleteServiceBooking();

  const [viewingId, setViewingId] = useState<number | null>(null);
  const [acceptingBooking, setAcceptingBooking] =
    useState<ServiceBookingSummary | null>(null);
  const [rejectingBooking, setRejectingBooking] =
    useState<ServiceBookingSummary | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
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
      const bookingDate = normaliseDateString(b.preferred_date);
      if (filters.dateFrom && bookingDate < filters.dateFrom) return false;
      if (filters.dateTo && bookingDate > filters.dateTo) return false;
      if (
        q &&
        !b.patient.name.toLowerCase().includes(q) &&
        !b.service.name_en.toLowerCase().includes(q) &&
        !b.department.name_en.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [bookings, filters]);

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const handleAccept = async (notes?: string) => {
    if (!acceptingBooking) return;
    try {
      const res = await acceptMut.mutateAsync({ id: acceptingBooking.id, notes });
      toast.success(res.message ?? "Booking accepted");
      if (res.invoice_number) {
        toast.info(`Invoice ${res.invoice_number} sent to patient`);
      }
      setAcceptingBooking(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to accept booking");
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectingBooking) return;
    try {
      const res = await rejectMut.mutateAsync({
        id: rejectingBooking.id,
        rejection_reason: reason,
      });
      toast.success(res.message ?? "Booking rejected");
      setRejectingBooking(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject booking");
    }
  };

  const handleComplete = async (booking: ServiceBookingSummary) => {
    try {
      const res = await completeMut.mutateAsync(booking.id);
      toast.success(res.message ?? "Booking marked as completed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to complete booking");
    }
  };

  const handleDrawerAccept = (b: ServiceBookingSummary) => setAcceptingBooking(b);
  const handleDrawerReject = (b: ServiceBookingSummary) => setRejectingBooking(b);
  const handleDrawerComplete = (b: ServiceBookingSummary) => handleComplete(b);

  const isActing =
    acceptMut.isPending || rejectMut.isPending || completeMut.isPending;

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "all", label: "All statuses" },
        { value: "pending", label: "Pending" },
        { value: "accepted", label: "Accepted" },
        { value: "completed", label: "Completed" },
        { value: "rejected", label: "Rejected" },
        { value: "cancelled", label: "Cancelled" },
      ],
      onChange: (v: string) => set("status", v as any)
    },
    {
      type: "custom" as const,
      key: "dateFrom",
      label: "Date Range",
      render: () => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => set("dateFrom", e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
            />
            <span className="text-[11px] text-muted-foreground">to</span>
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
              Clear dates
            </button>
          )}
        </div>
      )
    }
  ], [filters.status, filters.dateFrom, filters.dateTo, set]);

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.appts_title")}
          subtitle={t("pages.hospital.appts_sub")}
        />

    
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">
                  {isLoading ? "—" : filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "booking" : "bookings"}
                {!isLoading && data && (
                  <span className="text-muted-foreground/50 ml-1">
                    / {data.total} total
                  </span>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="ml-2 text-primary hover:underline text-[10px] font-medium"
                  >
                    Reset filters
                  </button>
                )}
              </p>

              {pendingCount > 0 && !isLoading && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[4px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingCount} pending
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
                  placeholder="Search patient, service…"
                  className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[5px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                style={{ borderRadius: "5px" }}
                className="w-7 h-7 flex items-center justify-center border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
                title="Refresh"
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
                    Failed to load bookings
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                </div>
                <button
                  onClick={() => refetch()}
                  style={{ borderRadius: "5px" }}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Try again
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
                      ? "No bookings match your filters"
                      : "No bookings yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {hasActiveFilters
                      ? "Try widening your search criteria"
                      : "Bookings will appear here once patients request services"}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    style={{ borderRadius: "5px" }}
                    className="text-[11px] text-primary hover:underline font-semibold mt-1"
                  >
                    Clear all filters
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
