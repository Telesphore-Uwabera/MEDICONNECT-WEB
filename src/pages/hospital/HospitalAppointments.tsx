import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hospitals, useHospitalBookings } from "@/lib/hospital-store";
import {
  Calendar,
  Check,
  Clock,
  User,
  X,
  SlidersHorizontal,
  Search,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "pending" | "confirmed" | "completed" | "cancelled";

interface FilterState {
  hospital: string;
  search: string;
  status: Status | "All";
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS = (defaultHospital: string): FilterState => ({
  hospital: defaultHospital,
  search: "",
  status: "All",
  dateFrom: "",
  dateTo: "",
});

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<Status, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-primary",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

// ─── Sample data for demo ─────────────────────────────────────────────────────

const SAMPLE_APPOINTMENTS = [
  {
    id: "apt-001",
    hospital: "King Faisal Hospital",
    date: "2026-05-15",
    createdAt: new Date("2026-05-10T09:30:00"),
    reason: "Annual physical examination and blood work",
    department: "General Medicine",
    serviceName: "Check-up",
  },
  {
    id: "apt-002",
    hospital: "King Faisal Hospital",
    date: "2026-05-16",
    createdAt: new Date("2026-05-11T14:15:00"),
    reason: "Follow-up after surgery, wound check and medication review",
    department: "Surgery",
    serviceName: "Follow-up",
  },
  {
    id: "apt-003",
    hospital: "King Faisal Hospital",
    date: "2026-05-17",
    createdAt: new Date("2026-05-12T08:45:00"),
    reason: "Pediatric vaccination schedule - 6 month immunization",
    department: "Pediatrics",
    serviceName: "Vaccination",
  },
  {
    id: "apt-004",
    hospital: "King Faisal Hospital",
    date: "2026-05-18",
    createdAt: new Date("2026-05-09T11:20:00"),
    reason: "Cardiac stress test and ECG monitoring",
    department: "Cardiology",
    serviceName: "Diagnostics",
  },
  {
    id: "apt-005",
    hospital: "King Faisal Hospital",
    date: "2026-05-19",
    createdAt: new Date("2026-05-11T16:00:00"),
    reason: "Orthopedic consultation for knee pain and mobility assessment",
    department: "Orthopedics",
    serviceName: "Consultation",
  },
  {
    id: "apt-006",
    hospital: "King Faisal Hospital",
    date: "2026-05-20",
    createdAt: new Date("2026-05-12T10:30:00"),
    reason: "Dental cleaning and cavity check",
    department: "Dentistry",
    serviceName: "Cleaning",
  },
  {
    id: "apt-007",
    hospital: "King Faisal Hospital",
    date: "2026-05-21",
    createdAt: new Date("2026-05-08T13:45:00"),
    reason: "Ophthalmology exam - vision test and glaucoma screening",
    department: "Ophthalmology",
    serviceName: "Eye Exam",
  },
  {
    id: "apt-008",
    hospital: "King Faisal Hospital",
    date: "2026-05-22",
    createdAt: new Date("2026-05-10T09:00:00"),
    reason: "Dermatology consultation for skin rash and allergy testing",
    department: "Dermatology",
    serviceName: "Consultation",
  },
];

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
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  booking,
  currentStatus,
  statusLabel,
  onSetStatus,
}: {
  booking: any;
  currentStatus: Status;
  statusLabel: Record<Status, string>;
  onSetStatus: (id: string, s: Status, msg: string) => void;
}) {
  const { t } = useTranslation();

  const createdAtStr = booking.createdAt instanceof Date
    ? booking.createdAt
    : new Date(booking.createdAt);

  return (
    <div className="bg-card border border-border/70 rounded-sm p-4 flex flex-wrap items-start gap-3 hover:border-primary/30 transition-colors duration-150">
      {/* Avatar */}
      <div className="h-9 w-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <User className="h-4 w-4" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-foreground">
            {t("pages.doctor.patient")} #{booking.id.slice(-4).toUpperCase()}
          </span>
          {booking.department && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/60 bg-secondary/30">
              {booking.department}
            </Badge>
          )}
          {booking.serviceName && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary">
              {booking.serviceName}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 gap-1", STATUS_STYLES[currentStatus])}
          >
            <span className={cn("w-1 h-1 rounded-full", STATUS_DOT[currentStatus])} />
            {statusLabel[currentStatus]}
          </Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground/80 line-clamp-2">
          {booking.reason || t("pages.hospital.no_reason")}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(parseISO(booking.date), "EEE, MMM d, yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("pages.hospital.booked_at", {
              date: format(createdAtStr, "MMM d, HH:mm"),
            })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 ml-auto shrink-0">
        {currentStatus === "pending" && (
          <>
            <Button
              size="sm"
              className="h-7 px-2.5 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
              onClick={() =>
                onSetStatus(
                  booking.id,
                  "confirmed",
                  t("pages.hospital.appt_confirmed"),
                )
              }
            >
              <Check className="h-3 w-3 mr-1" />
              {t("pages.hospital.confirm")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
              onClick={() =>
                onSetStatus(
                  booking.id,
                  "cancelled",
                  t("pages.hospital.appt_cancelled"),
                )
              }
            >
              <X className="h-3 w-3 mr-1" />
              {t("pages.hospital.decline")}
            </Button>
          </>
        )}
        {currentStatus === "confirmed" && (
          <>
            <Button
              size="sm"
              className="h-7 px-2.5 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
              onClick={() =>
                onSetStatus(
                  booking.id,
                  "completed",
                  t("pages.hospital.marked_completed"),
                )
              }
            >
              {t("pages.hospital.mark_complete")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
              onClick={() =>
                onSetStatus(
                  booking.id,
                  "cancelled",
                  t("pages.hospital.appt_cancelled"),
                )
              }
            >
              {t("pages.hospital.cancel_btn")}
            </Button>
          </>
        )}
        {(currentStatus === "completed" || currentStatus === "cancelled") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-all duration-200"
            onClick={() =>
              onSetStatus(booking.id, "pending", t("pages.hospital.reopened"))
            }
          >
            {t("pages.hospital.reopen")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const HospitalAppointments = () => {
  const { t } = useTranslation();
  const bookings = useHospitalBookings();

  // Merge real bookings with sample data for demo
  const allBookings = useMemo(() => {
    const real = bookings.filter((b) => b.hospital === hospitals[0].name);
    // If no real bookings, show samples
    if (real.length === 0) {
      return SAMPLE_APPOINTMENTS.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
    }
    return real;
  }, [bookings]);

  const [filters, setFilters] = useState<FilterState>(
    INITIAL_FILTERS(hospitals[0].name),
  );
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [filterOpen, setFilterOpen] = useState(false);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS(hospitals[0].name));
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      filters.search !== "" ||
      filters.status !== "All" ||
      filters.dateFrom !== "" ||
      filters.dateTo !== "",
    [filters],
  );

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  const setStatus = useCallback((id: string, s: Status, msg: string) => {
    setStatuses((p) => ({ ...p, [id]: s }));
    toast.success(msg);
  }, []);

  const statusLabel: Record<Status, string> = {
    pending: t("pages.hospital.pending"),
    confirmed: t("pages.hospital.confirmed"),
    completed: t("pages.hospital.completed"),
    cancelled: t("pages.hospital.cancelled"),
  };

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return allBookings
      .filter((b) => {
        const s = statuses[b.id] ?? "pending";
        if (filters.status !== "All" && s !== filters.status) return false;
        if (filters.dateFrom && b.date < filters.dateFrom) return false;
        if (filters.dateTo && b.date > filters.dateTo) return false;
        if (
          q &&
          !b.reason.toLowerCase().includes(q) &&
          !(b.serviceName ?? "").toLowerCase().includes(q) &&
          !(b.department ?? "").toLowerCase().includes(q)
        )
          return false;
        return true;
      });
  }, [allBookings, filters, statuses]);

  const pendingCount = filtered.filter(
    (b) => (statuses[b.id] ?? "pending") === "pending",
  ).length;

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
            <X className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<Status | "All">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "All", label: "All statuses" },
              { value: "pending", label: statusLabel.pending },
              { value: "confirmed", label: statusLabel.confirmed },
              { value: "completed", label: statusLabel.completed },
              { value: "cancelled", label: statusLabel.cancelled },
            ]}
          />
        </FilterSection>

        <FilterSection title="Date Range">
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground/70 mb-1">From</p>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => set("dateFrom", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70 mb-1">To</p>
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom}
                onChange={(e) => set("dateTo", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
              />
            </div>
            {(filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => {
                  set("dateFrom", "");
                  set("dateTo", "");
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Clear dates
              </button>
            )}
          </div>
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.appts_title")}
          subtitle={t("pages.hospital.appts_sub")}
        />

        {/* ── Body: sidebar + results ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile overlay: backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile overlay: bottom-sheet drawer */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 md:hidden",
              "bg-card rounded-t-2xl border-t border-border",
              "max-h-[85dvh] flex flex-col overflow-hidden",
              "transition-transform duration-300 ease-out",
              filterOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-4 border-t border-border">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors"
              >
                Show results
              </button>
            </div>
          </div>

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {filtered.length}
                  </span>{" "}
                  {filtered.length === 1 ? "appointment" : "appointments"}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset filters
                    </button>
                  )}
                </p>

                {pendingCount > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingCount} {t("pages.hospital.pending").toLowerCase()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Hospital picker */}
                <div className="relative hidden sm:block">
                  <select
                    value={filters.hospital}
                    onChange={(e) => set("hospital", e.target.value)}
                    className="appearance-none pl-2.5 pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                  >
                    {hospitals.map((h) => (
                      <option key={h.name} value={h.name}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder={t("pages.hospital.search_appts")}
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Filters button — mobile only */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[11px] transition-colors",
                    hasActiveFilters
                      ? "bg-primary text-white border-primary"
                      : "border-border/60 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Calendar className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      No appointments match your filters
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Try widening your search criteria
                    </p>
                  </div>
                  <button
                    onClick={clearAll}
                    className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.map((b) => (
                    <AppointmentCard
                      key={b.id}
                      booking={b}
                      currentStatus={statuses[b.id] ?? "pending"}
                      statusLabel={statusLabel}
                      onSetStatus={setStatus}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HospitalAppointments;
