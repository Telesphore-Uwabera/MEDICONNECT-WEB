import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { appointments as seedAppointments } from "@/lib/mock-data";
import { useBookings } from "@/lib/schedule-store";
import { useHospitalBookings } from "@/lib/hospital-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, MapPin, Calendar, Clock, Search, X, SlidersHorizontal, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ──────────────────────────────────────────────────────────────────

type AppointmentStatus = "upcoming" | "completed" | "cancelled";
type AppointmentType = "video" | "in-person";
type ViewMode = "table" | "cards";
type SortOption = "date-asc" | "date-desc" | "doctor";

interface FilterState {
  search: string;
  status: AppointmentStatus | "All";
  type: AppointmentType | "All";
  dateFrom: string;
  dateTo: string;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "All",
  type: "All",
  dateFrom: "",
  dateTo: "",
  sort: "date-asc",
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "date-asc", label: "Date: Soonest first" },
  { value: "date-desc", label: "Date: Latest first" },
  { value: "doctor", label: "Doctor (A–Z)" },
];

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  upcoming: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  upcoming: "bg-sky-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

// ─── Sidebar atoms ───────────────────────────────────────────────────────────

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

// ─── Card view item ──────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  statusLabel,
  onAction,
}: {
  appt: ReturnType<typeof buildAppointments>[number];
  statusLabel: Record<string, string>;
  onAction: (appt: ReturnType<typeof buildAppointments>[number]) => void;
}) {
  return (
    <div className="bg-card border border-border/70 rounded-sm p-3.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200 group">
      <div className={cn(
        "w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 border",
        appt.type === "video"
          ? "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900"
          : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
      )}>
        {appt.type === "video" ? (
          <Video className="w-3.5 h-3.5" />
        ) : (
          <MapPin className="w-3.5 h-3.5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-foreground">
            {appt.doctorName}
          </span>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium border", STATUS_STYLES[appt.status])}>
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[appt.status])} />
            {statusLabel[appt.status] ?? appt.status}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
          {appt.specialty}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-[11px] font-medium text-foreground flex items-center justify-end gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground/50" />
            {appt.date}
          </p>
          <p className="text-[10px] text-muted-foreground/70 flex items-center justify-end gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {appt.time}
          </p>
        </div>
        <Button
          size="sm"
          variant={appt.status === "upcoming" ? "default" : "ghost"}
          className={cn(
            "h-7 px-3 text-[10px] font-semibold rounded-sm transition-all duration-200",
            appt.status === "upcoming"
              ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary",
          )}
          onClick={() => onAction(appt)}
        >
          {appt.status === "upcoming" ? "Join" : "Details"}
        </Button>
      </div>
    </div>
  );
}

// ─── Data builder ────────────────────────────────────────────────────────────

function buildAppointments(
  bookings: ReturnType<typeof useBookings>,
  hospitalBookings: ReturnType<typeof useHospitalBookings>,
) {
  return [
    ...bookings.map((b) => ({
      id: b.id,
      doctorName: b.doctorName,
      specialty: b.specialty,
      date: format(parseISO(b.date), "MMM dd, yyyy"),
      rawDate: b.date,
      time: b.time,
      status: "upcoming" as AppointmentStatus,
      type: "video" as AppointmentType,
    })),
    ...hospitalBookings.map((b) => ({
      id: b.id,
      doctorName: b.hospital,
      specialty: b.serviceName
        ? `${b.serviceName}${b.department ? ` · ${b.department}` : ""}`
        : b.reason,
      date: format(parseISO(b.date), "MMM dd, yyyy"),
      rawDate: b.date,
      time: "—",
      status: "upcoming" as AppointmentStatus,
      type: "in-person" as AppointmentType,
    })),
    ...seedAppointments,
  ];
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PatientAppointments = () => {
  const { t } = useTranslation();
  const bookings = useBookings();
  const hospitalBookings = useHospitalBookings();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  const statusLabel: Record<string, string> = {
    upcoming: t("pages.hospital.pending"),
    completed: t("pages.hospital.completed"),
    cancelled: t("pages.hospital.cancelled"),
  };

  const allAppointments = useMemo(
    () => buildAppointments(bookings, hospitalBookings),
    [bookings, hospitalBookings],
  );

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return allAppointments
      .filter((a) => {
        if (filters.status !== "All" && a.status !== filters.status)
          return false;
        if (filters.type !== "All" && a.type !== filters.type) return false;
        if (filters.dateFrom && a.rawDate < filters.dateFrom) return false;
        if (filters.dateTo && a.rawDate > filters.dateTo) return false;
        if (
          q &&
          !a.doctorName.toLowerCase().includes(q) &&
          !a.specialty.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const aDate = a.rawDate ?? "";
        const bDate = b.rawDate ?? "";
        switch (filters.sort) {
          case "date-desc":
            return bDate.localeCompare(aDate);
          case "doctor":
            return a.doctorName.localeCompare(b.doctorName);
          default:
            return aDate.localeCompare(bDate);
        }
      });
  }, [filters, allAppointments]);

  const upcomingCount = filtered.filter((a) => a.status === "upcoming").length;
  const completedCount = filtered.filter((a) => a.status === "completed").length;
  const cancelledCount = filtered.filter((a) => a.status === "cancelled").length;

  const handleAction = useCallback(
    (_appt: ReturnType<typeof buildAppointments>[number]) => {
      // plug into your router / modal here
    },
    [],
  );

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
          <PillGroup<AppointmentStatus | "All">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "All", label: "All statuses" },
              { value: "upcoming", label: "Upcoming" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </FilterSection>

        <FilterSection title="Type">
          <PillGroup<AppointmentType | "All">
            value={filters.type}
            onChange={(v) => set("type", v)}
            options={[
              { value: "All", label: "All types" },
              { value: "video", label: "Video consult" },
              { value: "in-person", label: "In-person visit" },
            ]}
          />
        </FilterSection>

        <FilterSection title="Date Range">
          <div className="space-y-2">
            <div>
              <p className="text-[9px] text-muted-foreground/70 mb-1 font-medium">From</p>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => set("dateFrom", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/70 mb-1 font-medium">To</p>
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom}
                onChange={(e) => set("dateTo", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              />
            </div>
            {(filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => {
                  set("dateFrom", "");
                  set("dateTo", "");
                }}
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
            options={SORT_OPTIONS}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub")}
        />

        {/* ── Body: sidebar + results ── */}
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
              filterOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile bottom drawer */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 md:hidden",
              "bg-card rounded-t-lg border-t border-border/60",
              "max-h-[85dvh] flex flex-col overflow-hidden",
              "transition-transform duration-300 ease-out shadow-2xl",
              filterOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="flex justify-center pt-3 pb-1.5 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-3 border-t border-border/60 bg-card">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-all duration-200 shadow-sm hover:shadow"
              >
                Show {filtered.length}{" "}
                {filtered.length === 1 ? "appointment" : "appointments"}
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

                <div className="hidden lg:flex items-center gap-2">
                  {upcomingCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                      {upcomingCount} upcoming
                    </span>
                  )}
                  {completedCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {completedCount} done
                    </span>
                  )}
                  {cancelledCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {cancelledCount} cancelled
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Filters button — mobile only */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-all duration-200 font-medium",
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
                      "px-2.5 py-1.5 transition-all duration-200",
                      view === "table"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M3 15h18M9 3v18" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setView("cards")}
                    aria-label="Card view"
                    className={cn(
                      "px-2.5 py-1.5 border-l border-border/60 transition-all duration-200",
                      view === "cards"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </button>
                </div>
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
              ) : view === "table" ? (
                <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.patient.th_doctor")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.patient.th_specialty")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.patient.th_when")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.patient.th_type")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.patient.th_status")}
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => (
                        <tr
                          key={a.id}
                          className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10">
                                {a.doctorName?.slice(0, 2).toUpperCase() || "DR"}
                              </div>
                              <span className="font-semibold text-[11px] text-foreground">
                                {a.doctorName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground/80">
                            {a.specialty}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground/80">
                            <div className="flex flex-col gap-0.5">
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <Calendar className="h-3 w-3 text-muted-foreground/40" />
                                {a.date}
                              </span>
                              <span className="flex items-center gap-1 text-[10px]">
                                <Clock className="h-3 w-3 text-muted-foreground/40" />
                                {a.time}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
                              {a.type === "video" ? (
                                <Video className="h-3.5 w-3.5 text-sky-500" />
                              ) : (
                                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              <span className="text-[11px]">{a.type}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border text-[9px] px-1.5 py-0 font-medium",
                                STATUS_STYLES[a.status],
                              )}
                            >
                              <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[a.status])} />
                              {statusLabel[a.status] ?? a.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {a.status === "upcoming" ? (
                              <Button
                                size="sm"
                                className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
                              >
                                {t("pages.patient.join")}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-3 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-all duration-200"
                              >
                                {t("pages.patient.details")}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appt={a}
                      statusLabel={statusLabel}
                      onAction={handleAction}
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

export default PatientAppointments;
