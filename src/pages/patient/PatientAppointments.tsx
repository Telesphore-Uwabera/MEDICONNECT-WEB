import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Video, MapPin, Calendar, Clock, X,
  SlidersHorizontal, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import {
  useGetPatientAppointments,
  ApiAppointment,
  ApiAppointmentStatus,
  ApiAppointmentType,
  AppointmentFilterParams,
} from "@/hooks/patient/use-patient-appointment";
import AppointmentDetailModal from "./components/AppointmentDetail";

// ─── Types ───────────────────────────────────────────────────────────────────

type SortOption = "date-asc" | "date-desc" | "doctor";
type ViewMode = "table" | "cards";

interface FilterState {
  status:    ApiAppointmentStatus | "all";
  type:      ApiAppointmentType   | "all";
  date_from: string;
  date_to:   string;
  sort:      SortOption;
  page:      number;
}

const INITIAL_FILTERS: FilterState = {
  status:    "all",
  type:      "all",
  date_from: "",
  date_to:   "",
  sort:      "date-asc",
  page:      1,
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ApiAppointmentStatus, string> = {
  pending:     "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  confirmed:   "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  in_progress: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<ApiAppointmentStatus, string> = {
  pending:     "bg-amber-500",
  confirmed:   "bg-sky-500",
  in_progress: "bg-violet-500 animate-pulse",
  completed:   "bg-emerald-500",
  cancelled:   "bg-red-500",
};

const STATUS_LABEL: Record<ApiAppointmentStatus, string> = {
  pending:     "Pending",
  confirmed:   "Confirmed",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), "MMM dd, yyyy"); }
  catch { return dateStr; }
}

function formatTime(timeStr: string) {
  try {
    const t = timeStr.length <= 8 ? `2000-01-01T${timeStr}` : timeStr;
    return format(parseISO(t), "hh:mm a");
  } catch { return timeStr; }
}

function getDoctorName(appt: ApiAppointment) {
  if (appt.doctor) return appt.doctor.designations || appt.doctor.user.name;
  if (appt.hospital) return appt.hospital.name_en;
  return "—";
}

function getDoctorInitials(appt: ApiAppointment) {
  return getDoctorName(appt).slice(0, 2).toUpperCase();
}

function getDoctorAvatar(appt: ApiAppointment) {
  return appt.doctor?.image ?? appt.doctor?.user.avatar ?? null;
}

function getSpecialty(appt: ApiAppointment) {
  if (appt.doctor) return appt.doctor.specialization || appt.doctor.doctor_degree || "—";
  if (appt.hospital) return [appt.hospital.city, appt.hospital.address].filter(Boolean).join(" · ");
  return "—";
}

function isActionable(status: ApiAppointmentStatus) {
  return status === "confirmed" || status === "in_progress";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  value, onChange, options,
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

function AppointmentRowSkeleton() {
  return (
    <tr className="border-t border-border/40 animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-sm bg-muted shrink-0" />
          <div className="h-3 w-28 rounded bg-muted" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-2.5 w-24 rounded bg-muted" /></td>
      <td className="px-4 py-3">
        <div className="space-y-1.5">
          <div className="h-2.5 w-20 rounded bg-muted" />
          <div className="h-2 w-14 rounded bg-muted" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-2.5 w-16 rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 rounded-sm bg-muted" /></td>
      <td className="px-4 py-3 text-right"><div className="h-7 w-14 rounded-sm bg-muted ml-auto" /></td>
    </tr>
  );
}

function AppointmentCardSkeleton() {
  return (
    <div className="bg-card border border-border/70 rounded-sm p-3.5 flex items-center gap-3 animate-pulse">
      <div className="w-9 h-9 rounded-sm bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-2.5 w-20 rounded bg-muted" />
      </div>
      <div className="space-y-1.5 items-end hidden sm:flex flex-col">
        <div className="h-2.5 w-24 rounded bg-muted" />
        <div className="h-2 w-16 rounded bg-muted" />
      </div>
      <div className="h-7 w-14 rounded-sm bg-muted shrink-0" />
    </div>
  );
}

// ── Card item now accepts onDetails + onJoin callbacks ────────────────────────

function AppointmentCardItem({
  appt,
  onDetails,
  onJoin,
}: {
  appt: ApiAppointment;
  onDetails: () => void;
  onJoin: () => void;
}) {
  const avatar = getDoctorAvatar(appt);
  const actionable = isActionable(appt.status);

  return (
    <div
      className="bg-card border border-border/70 rounded-sm p-3.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
      onClick={onDetails}
    >
      <div className={cn(
        "w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 border overflow-hidden",
        appt.type === "online"
          ? "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900"
          : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
      )}>
        {avatar ? (
          <img src={avatar} alt={getDoctorName(appt)} className="h-full w-full object-cover" />
        ) : appt.type === "online" ? (
          <Video className="w-3.5 h-3.5" />
        ) : (
          <MapPin className="w-3.5 h-3.5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-foreground">{getDoctorName(appt)}</span>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium border", STATUS_STYLES[appt.status])}>
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[appt.status])} />
            {STATUS_LABEL[appt.status]}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{getSpecialty(appt)}</p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-[11px] font-medium text-foreground flex items-center justify-end gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground/50" />
            {formatDate(appt.appointment_date)}
          </p>
          <p className="text-[10px] text-muted-foreground/70 flex items-center justify-end gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {formatTime(appt.appointment_time)}
          </p>
        </div>

        <Button
          size="sm"
          variant={actionable ? "default" : "ghost"}
          className={cn(
            "h-7 px-3 text-[10px] font-semibold rounded-sm transition-all duration-200",
            actionable
              ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary",
          )}
          onClick={(e) => {
            e.stopPropagation(); 
            actionable ? onJoin() : onDetails();
          }}
        >
          {actionable ? "Join" : "Details"}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PatientAppointments = () => {
  const { t } = useTranslation();

  const [filters, setFilters]     = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView]           = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openDetail = useCallback((id: string | number) => setSelectedId(String(id)), []);
  const closeDetail = useCallback(() => setSelectedId(null), []);

  // ── API ────────────────────────────────────────────────────────────────────

  const apiParams: AppointmentFilterParams = useMemo(() => ({
    status:    filters.status    !== "all" ? filters.status    : undefined,
    type:      filters.type      !== "all" ? filters.type      : undefined,
    date_from: filters.date_from || undefined,
    date_to:   filters.date_to   || undefined,
    page:      filters.page,
  }), [filters]);

  const { data, isLoading } = useGetPatientAppointments(apiParams);

  const appointments = data?.data ?? [];
  const totalPages   = data?.last_page ?? 1;

  const sorted = useMemo(() => {
    return [...appointments].sort((a, b) => {
      switch (filters.sort) {
        case "date-desc": return b.appointment_date.localeCompare(a.appointment_date);
        case "doctor":    return getDoctorName(a).localeCompare(getDoctorName(b));
        default:          return a.appointment_date.localeCompare(b.appointment_date);
      }
    });
  }, [appointments, filters.sort]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" && key !== "sort" ? { page: 1 } : {}),
    }));
  }, []);

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  // Lock scroll when filter drawer is open (modal handles its own lock)
  useEffect(() => {
    if (!selectedId) {
      document.body.style.overflow = filterOpen ? "hidden" : "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen, selectedId]);

  const counts = useMemo(() => appointments.reduce(
    (acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }),
    {} as Record<string, number>
  ), [appointments]);

  // ── Sidebar content ────────────────────────────────────────────────────────

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
          <PillGroup<ApiAppointmentStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all",         label: "All statuses"  },
              { value: "pending",     label: "Pending"       },
              { value: "confirmed",   label: "Confirmed"     },
              { value: "in_progress", label: "In Progress"   },
              { value: "completed",   label: "Completed"     },
              { value: "cancelled",   label: "Cancelled"     },
            ]}
          />
        </FilterSection>

        <FilterSection title="Type">
          <PillGroup<ApiAppointmentType | "all">
            value={filters.type}
            onChange={(v) => set("type", v)}
            options={[
              { value: "all",       label: "All types"     },
              { value: "online",    label: "Video consult" },
              // { value: "in_person", label: "In-person"     },
            ]}
          />
        </FilterSection>

        <FilterSection title="Date Range">
          <div className="space-y-2">
            <div>
              <p className="text-[9px] text-muted-foreground/70 mb-1 font-medium">From</p>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => set("date_from", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/70 mb-1 font-medium">To</p>
              <input
                type="date"
                value={filters.date_to}
                min={filters.date_from}
                onChange={(e) => set("date_to", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              />
            </div>
            {(filters.date_from || filters.date_to) && (
              <button
                onClick={() => { set("date_from", ""); set("date_to", ""); }}
                className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Clear dates
              </button>
            )}
          </div>
        </FilterSection>

        <FilterSection title="Sort">
          <PillGroup<SortOption>
            value={filters.sort}
            onChange={(v) => set("sort", v)}
            options={[
              { value: "date-asc",  label: "Date: Soonest first" },
              { value: "date-desc", label: "Date: Latest first"  },
              { value: "doctor",    label: "Doctor (A–Z)"        },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub")}
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
                Show {data?.total ?? 0} appointments
              </button>
            </div>
          </div>

          {/* Results */}
          <main className="flex-1 overflow-y-auto">

            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{data?.total ?? 0}</span> appointments
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium">
                      Reset filters
                    </button>
                  )}
                </p>
                <div className="hidden lg:flex items-center gap-2">
                  {(["confirmed", "in_progress", "pending"] as ApiAppointmentStatus[]).map((s) =>
                    counts[s] ? (
                      <span key={s} className={cn("flex items-center gap-1 text-[10px] font-medium border px-2 py-0.5 rounded-sm", STATUS_STYLES[s])}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[s])} />
                        {counts[s]} {STATUS_LABEL[s].toLowerCase()}
                      </span>
                    ) : null
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
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground ml-0.5" />}
                </button>

                {/* View toggle */}
                <div className="flex rounded-sm border border-border/60 overflow-hidden bg-card shadow-sm">
                  <button
                    onClick={() => setView("table")}
                    aria-label="Table view"
                    className={cn(
                      "px-2.5 py-1.5 transition-all",
                      view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setView("cards")}
                    aria-label="Card view"
                    className={cn(
                      "px-2.5 py-1.5 border-l border-border/60 transition-all",
                      view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">

              {/* Empty state */}
              {!isLoading && sorted.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Calendar className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">No appointments found</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Try adjusting your filters</p>
                  </div>
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline mt-1">
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* ── Table view ── */}
              {view === "table" && (isLoading || sorted.length > 0) && (
                <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Doctor / Hospital</th>
                        <th className="text-left px-4 py-3 font-semibold">Specialty</th>
                        <th className="text-left px-4 py-3 font-semibold">Date & Time</th>
                        <th className="text-left px-4 py-3 font-semibold">Type</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => <AppointmentRowSkeleton key={i} />)
                        : sorted.map((a) => (
                            <tr
                              key={a.id}
                              className="border-t border-border/40 hover:bg-secondary/20 transition-colors cursor-pointer"
                              onClick={() => openDetail(a.id)}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10 overflow-hidden">
                                    {getDoctorAvatar(a) ? (
                                      <img src={getDoctorAvatar(a)!} alt={getDoctorName(a)} className="h-full w-full object-cover" />
                                    ) : (
                                      getDoctorInitials(a)
                                    )}
                                  </div>
                                  <span className="font-semibold text-[11px] text-foreground">{getDoctorName(a)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground/80">{getSpecialty(a)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <span className="flex items-center gap-1 font-medium text-foreground">
                                    <Calendar className="h-3 w-3 text-muted-foreground/40" />
                                    {formatDate(a.appointment_date)}
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                                    <Clock className="h-3 w-3 text-muted-foreground/40" />
                                    {formatTime(a.appointment_time)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
                                  {a.type === "online"
                                    ? <Video className="h-3.5 w-3.5 text-sky-500" />
                                    : <MapPin className="h-3.5 w-3.5 text-amber-500" />}
                                  <span className="text-[11px]">{a.type === "online" ? "Video" : "In-person"}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium", STATUS_STYLES[a.status])}>
                                  <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[a.status])} />
                                  {STATUS_LABEL[a.status]}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isActionable(a.status) ? (
                                  <Button
                                    size="sm"
                                    className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (a.daily_room_url) window.open(a.daily_room_url, "_blank");
                                    }}
                                  >
                                    Join
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-3 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDetail(a.id);
                                    }}
                                  >
                                    Details
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Cards view ── */}
              {view === "cards" && (isLoading || sorted.length > 0) && (
                <div className="flex flex-col gap-2">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => <AppointmentCardSkeleton key={i} />)
                    : sorted.map((a) => (
                        <AppointmentCardItem
                          key={a.id}
                          appt={a}
                          onDetails={() => openDetail(a.id)}
                          onJoin={() => { if (a.daily_room_url) window.open(a.daily_room_url, "_blank"); }}
                        />
                      ))}
                </div>
              )}

              {/* Pagination */}
              {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[10px] text-muted-foreground">
                    Page <span className="font-semibold text-foreground">{filters.page}</span> of{" "}
                    <span className="font-semibold text-foreground">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={filters.page <= 1}
                      onClick={() => set("page", filters.page - 1)}
                      className="h-7 px-2.5 text-[10px] rounded-sm"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - filters.page) <= 1)
                      .reduce<(number | "…")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "…" ? (
                          <span key={`ellipsis-${i}`} className="text-[10px] text-muted-foreground px-1">…</span>
                        ) : (
                          <Button
                            key={p}
                            size="sm"
                            variant={filters.page === p ? "default" : "outline"}
                            onClick={() => set("page", p as number)}
                            className="h-7 w-7 p-0 text-[10px] rounded-sm"
                          >
                            {p}
                          </Button>
                        )
                      )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={filters.page >= totalPages}
                      onClick={() => set("page", filters.page + 1)}
                      className="h-7 px-2.5 text-[10px] rounded-sm"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>


      {/* ── Appointment detail slide-over modal ── */}

      <AppointmentDetailModal
        appointmentId={selectedId}
        onClose={closeDetail}
      />


    </DashboardLayout>
  );
};

export default PatientAppointments;
