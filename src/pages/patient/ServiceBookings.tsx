import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingStatus ,
  useGetPatientServiceBookings,   // ← plural: fetches list with filters
  useCancelPatientServiceBooking,
  type ApiServiceBooking,
  type ServiceBookingSearchParams,

} from "@/hooks/patient/use-patient-service";



// ─── Types ──────────────────────────────────────────────────────────────────────

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

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; icon: React.ElementType; badge: string; dot: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    dot: "bg-amber-500",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    dot: "bg-red-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
    dot: "bg-blue-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800",
    dot: "bg-slate-400",
  },
};

const STATUS_OPTIONS: Array<{ value: BookingStatus | "all"; label: string }> = [
  { value: "all",       label: "All statuses" },
  { value: "pending",   label: "Pending"      },
  { value: "accepted",  label: "Accepted"     },
  { value: "completed", label: "Completed"    },
  { value: "rejected",  label: "Rejected"     },
  { value: "cancelled", label: "Cancelled"    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

function formatTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch { return timeStr; }
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-px text-[9px] font-semibold rounded-sm border", cfg.badge)}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
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
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left flex items-center gap-1.5",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.dot && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", o.dot)} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-t border-border/40 animate-pulse">
      <td className="px-4 py-3"><div className="h-3 w-40 rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-2.5 w-28 rounded bg-muted" /></td>
      <td className="px-4 py-3">
        <div className="space-y-1.5">
          <div className="h-2.5 w-24 rounded bg-muted" />
          <div className="h-2 w-16 rounded bg-muted" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-2.5 w-20 rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 rounded-sm bg-muted" /></td>
      <td className="px-4 py-3 text-right"><div className="h-7 w-16 rounded-sm bg-muted ml-auto" /></td>
    </tr>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-sm p-3.5 flex items-center gap-3 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-muted rounded-sm w-2/3" />
        <div className="h-2.5 bg-muted/60 rounded-sm w-1/3" />
      </div>
      <div className="hidden sm:block space-y-1.5">
        <div className="h-2.5 bg-muted rounded-sm w-24" />
        <div className="h-2 bg-muted/60 rounded-sm w-16" />
      </div>
      <div className="h-7 w-16 bg-muted rounded-sm flex-shrink-0" />
    </div>
  );
}

// ─── Cancel Dialog ────────────────────────────────────────────────────────────

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border/70 rounded-sm shadow-2xl w-full max-w-sm p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-sm bg-destructive/10 flex items-center justify-center flex-shrink-0 border border-destructive/20">
            <Trash2 className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">Cancel booking?</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed">
              Cancel{" "}
              <span className="font-medium text-foreground">{booking.service.name_en}</span> at{" "}
              <span className="font-medium text-foreground">{booking.hospital.name_en}</span> on{" "}
              {formatDate(booking.preferred_date)}. This cannot be undone.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-sm bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />
            <p className="text-[10px] text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-sm text-[11px] font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all disabled:opacity-50"
          >
            Keep booking
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all disabled:opacity-70 shadow-sm"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            {isLoading ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Card Item ────────────────────────────────────────────────────────

function BookingCardItem({
  booking,
  onCancel,
}: {
  booking: ApiServiceBooking;
  onCancel: (b: ApiServiceBooking) => void;
}) {
  const canCancel = booking.status === "pending" || booking.status === "accepted";

  return (
    <div className="bg-card border border-border/70 rounded-sm p-3.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      {/* Status dot */}
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-0.5 self-start mt-2", STATUS_CONFIG[booking.status].dot)} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-foreground leading-tight">
            {booking.service.name_en}
          </span>
          <StatusBadge status={booking.status} />
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
          {booking.hospital.name_en} · {booking.department.name_en}
        </p>
        {booking.notes && (
          <p className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-1 truncate">
            <FileText className="w-2.5 h-2.5 flex-shrink-0" />
            {booking.notes}
          </p>
        )}
      </div>

      {/* Date + time */}
      <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0 text-[10px] text-muted-foreground/70">
        <span className="flex items-center gap-1">
          <CalendarDays className="w-2.5 h-2.5" />
          {formatDate(booking.preferred_date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {formatTime(booking.preferred_time)}
        </span>
        {booking.service.price && (
          <span className="font-bold text-foreground mt-0.5">
            {parseFloat(booking.service.price).toLocaleString()} {booking.service.currency ?? "RWF"}
          </span>
        )}
      </div>

      {/* Cancel button */}
      <Button
        size="sm"
        variant={canCancel ? "outline" : "ghost"}
        disabled={!canCancel}
        onClick={() => canCancel && onCancel(booking)}
        className={cn(
          "h-7 px-3 text-[10px] font-semibold rounded-sm flex-shrink-0 transition-all duration-200",
          canCancel
            ? "text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40"
            : "text-muted-foreground/40 cursor-default",
        )}
      >
        {canCancel ? (
          <>
            <Trash2 className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Cancel</span>
          </>
        ) : (
          "—"
        )}
      </Button>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "…")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-[10px] text-muted-foreground">
        Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
        <span className="text-muted-foreground/60 ml-1">({total} total)</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-7 px-2.5 text-[10px] rounded-sm"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="text-[10px] text-muted-foreground px-1">…</span>
          ) : (
            <Button
              key={p}
              size="sm"
              variant={currentPage === p ? "default" : "outline"}
              onClick={() => onPageChange(p as number)}
              className="h-7 w-7 p-0 text-[10px] rounded-sm"
            >
              {p}
            </Button>
          )
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-7 px-2.5 text-[10px] rounded-sm"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ServiceBookings() {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ApiServiceBooking | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce client-side search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters.q]);

  // ── FIX: buildApiParams now only passes serialisable primitives ────────────
  // Previously the whole FilterState object was passed as an "id" to the
  // singular hook → /service-bookings/[object Object].
  // Now we call the plural list hook with clean params.
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

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" && key !== "sort" && key !== "q" ? { page: 1 } : {}),
    }));
  }, []);

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  const totalPages = data?.last_page ?? (data ? Math.ceil(data.total / data.per_page) : 1);

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return;
    setCancelError(null);
    cancelBooking(cancelTarget.id, {
      onSuccess: () => { setCancelTarget(null); setCancelError(null); },
      onError: (err) => { setCancelError(err.message ?? "Could not cancel this booking."); },
    });
  }, [cancelTarget, cancelBooking]);

  // Lock scroll when filter drawer open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const statusCounts = useMemo(() =>
    (data?.data ?? []).reduce(
      (acc, b) => ({ ...acc, [b.status]: (acc[b.status as BookingStatus] ?? 0) + 1 }),
      {} as Partial<Record<BookingStatus, number>>,
    ),
    [data],
  );

  // ── Sidebar content (shared between desktop + mobile drawer) ──────────────

  const sidebarContent = (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<BookingStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={STATUS_OPTIONS.map((o) => ({
              ...o,
              dot: o.value !== "all" ? STATUS_CONFIG[o.value as BookingStatus].dot : undefined,
            }))}
          />
        </FilterSection>

        <FilterSection title="Sort">
          <PillGroup<SortOption>
            value={filters.sort}
            onChange={(v) => set("sort", v)}
            options={[
              { value: "date-desc", label: "Newest first" },
              { value: "date-asc",  label: "Oldest first" },
            ]}
          />
        </FilterSection>

        <FilterSection title="Search">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Service, hospital…"
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
              className="w-full pl-6 pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
            {filters.q && (
              <button
                onClick={() => set("q", "")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </FilterSection>
      </div>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.bookings_title")}
          subtitle={t("pages.patient.bookings_sub")}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300 backdrop-blur-sm",
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile bottom drawer */}
          <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-lg border-t border-border/60",
            "max-h-[85dvh] flex flex-col overflow-hidden transition-transform duration-300 ease-out shadow-2xl",
            filterOpen ? "translate-y-0" : "translate-y-full",
          )}>
            <div className="flex justify-center pt-3 pb-1.5 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-3 border-t border-border/60 bg-card">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-all"
              >
                Show {data?.total ?? 0} bookings
              </button>
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">

            {/* Sticky meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{data?.total ?? 0}</span>{" "}
                  booking{(data?.total ?? 0) !== 1 ? "s" : ""}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium"
                    >
                      Reset filters
                    </button>
                  )}
                </p>
                {/* Status pill summary (desktop) */}
                <div className="hidden lg:flex items-center gap-2">
                  {(["pending", "accepted"] as BookingStatus[]).map((s) =>
                    statusCounts[s] ? (
                      <span
                        key={s}
                        className={cn(
                          "flex items-center gap-1 text-[10px] font-medium border px-2 py-0.5 rounded-sm",
                          STATUS_CONFIG[s].badge,
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CONFIG[s].dot)} />
                        {statusCounts[s]} {STATUS_CONFIG[s].label.toLowerCase()}
                      </span>
                    ) : null,
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile filter button */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-all font-medium",
                    hasActiveFilters
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border/60 text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground ml-0.5" />
                  )}
                </button>

                {/* View toggle */}
                <div className="flex rounded-sm border border-border/60 overflow-hidden bg-card shadow-sm">
                  <button
                    onClick={() => setView("table")}
                    aria-label="Table view"
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
                    aria-label="Card view"
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

            <div className="p-4 space-y-4">

              {/* Error state */}
              {isError && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-destructive/10 flex items-center justify-center border border-destructive/20">
                    <AlertCircle className="w-6 h-6 text-destructive/60" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">Failed to load bookings</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Something went wrong. Please try again.</p>
                  </div>
                  <button
                    onClick={() => refetch()}
                    className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !isError && bookings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <CalendarDays className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      {filters.status === "all" ? "No bookings yet" : `No ${filters.status} bookings`}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {filters.q ? "Try a different search term" : "Your service bookings will appear here"}
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* ── Table view ── */}
              {view === "table" && (isLoading || bookings.length > 0) && !isError && (
                <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Service</th>
                        <th className="text-left px-4 py-3 font-semibold">Hospital</th>
                        <th className="text-left px-4 py-3 font-semibold">Date & Time</th>
                        <th className="text-left px-4 py-3 font-semibold">Department</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3" />
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
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-semibold text-foreground">{b.service.name_en}</p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    #{b.id} · {b.booked_by}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1.5 text-muted-foreground/80">
                                  <Building2 className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                                  {b.hospital.name_en}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
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
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1.5 text-muted-foreground/80">
                                  <Stethoscope className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                                  {b.department.name_en}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={b.status} />
                              </td>
                              <td className="px-4 py-3 text-right">
                                {(b.status === "pending" || b.status === "accepted") ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-3 text-[10px] font-semibold rounded-sm text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 transition-all"
                                    onClick={() => setCancelTarget(b)}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/40">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Cards view ── */}
              {view === "cards" && (isLoading || bookings.length > 0) && !isError && (
                <div className="flex flex-col gap-2">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
                    : bookings.map((b) => (
                        <BookingCardItem key={b.id} booking={b} onCancel={setCancelTarget} />
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
      </div>

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelDialog
          booking={cancelTarget}
          onConfirm={handleCancelConfirm}
          onCancel={() => { setCancelTarget(null); setCancelError(null); }}
          isLoading={isCancelling}
          error={cancelError}
        />
      )}
    </DashboardLayout>
  );
}

export default ServiceBookings;
