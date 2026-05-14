import { useState, useMemo, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DoctorCard } from "@/components/DoctorCard";
import {
  doctors,
  specialties,
  type Doctor,
  type DoctorStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { t } from "i18next";
import { SlidersHorizontal, X, Star, Search, Calendar, Clock } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SortOption = "rating" | "fee-asc" | "fee-desc" | "exp";
type AvailabilityFilter = "All" | "instant" | "scheduled";
type FeeRange = "All" | "0-30" | "30-50" | "50-999";
type ViewMode = "grid" | "list";

interface FilterState {
  search: string;
  specialty: string;
  status: DoctorStatus | "All";
  availability: AvailabilityFilter;
  feeRange: FeeRange;
  dateFrom: string;
  dateTo: string;
  sort: SortOption;
  availableOnly: boolean;
  instantOnly: boolean;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  specialty: "All",
  status: "All",
  availability: "All",
  feeRange: "All",
  dateFrom: "",
  dateTo: "",
  sort: "rating",
  availableOnly: false,
  instantOnly: false,
};

const FEE_LABELS: Record<FeeRange, string> = {
  All: "All prices",
  "0-30": "Under $30",
  "30-50": "$30 – $50",
  "50-999": "Above $50",
};

const STATUS_OPTIONS: Array<{ value: DoctorStatus | "All"; label: string }> = [
  { value: "All", label: "All statuses" },
  { value: "online", label: "Online" },
  { value: "busy", label: "Busy" },
  { value: "offline", label: "Offline" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "rating", label: "Relevance" },
  { value: "fee-asc", label: "Fee: Low to High" },
  { value: "fee-desc", label: "Fee: High to Low" },
  { value: "exp", label: "Most Experienced" },
];

const AVAILABILITY_OPTIONS: Array<{ value: AvailabilityFilter; label: string }> = [
  { value: "All", label: "All" },
  { value: "instant", label: "Instant consult" },
  { value: "scheduled", label: "Scheduled only" },
];

const STATUS_STYLES: Record<DoctorStatus, string> = {
  online: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  busy: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  offline: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
};

const STATUS_DOT: Record<DoctorStatus, string> = {
  online: "bg-emerald-500",
  busy: "bg-amber-500",
  offline: "bg-slate-400",
};

// ─── Sidebar atoms ──────────────────────────────────────────────────────────────

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

function FeeRangeFilter({ value, onChange }: { value: FeeRange; onChange: (v: FeeRange) => void }) {
  const sliderVal =
    value === "0-30" ? 30 : value === "30-50" ? 60 : value === "50-999" ? 85 : 100;

  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground/70 mb-1.5">
        <span>$0</span>
        <span className="font-semibold text-foreground">
          {value === "All" ? "$0 – $100+" : FEE_LABELS[value]}
        </span>
        <span>$100+</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={sliderVal}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v <= 33) onChange("0-30");
          else if (v <= 66) onChange("30-50");
          else if (v <= 90) onChange("50-999");
          else onChange("All");
        }}
        className="w-full accent-primary cursor-pointer"
      />
      <div className="flex flex-wrap gap-1 mt-2">
        {(Object.keys(FEE_LABELS) as FeeRange[]).map((k) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={cn(
              "px-1.5 py-0.5 rounded-sm text-[10px] border transition-all duration-200",
              value === k
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {FEE_LABELS[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── List Item ──────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: DoctorStatus }) {
  return (
    <span
      className={cn("w-1.5 h-1.5 rounded-full inline-block flex-shrink-0", STATUS_DOT[status])}
    />
  );
}

function DoctorListItem({ doctor, onBook }: { doctor: Doctor; onBook: (d: Doctor) => void }) {
  const canBook = doctor.status !== "offline";

  return (
    <div className="bg-card border border-border/70 rounded-sm px-3.5 py-2.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 border border-primary/10">
        {doctor.avatar}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-foreground leading-tight">
            {doctor.name}
          </span>
          <StatusDot status={doctor.status} />
          {doctor.instantAvailable && (
            <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-primary/10 text-primary border border-primary/20">
              INSTANT
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
          {doctor.specialty} · {doctor.hospital}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-4 text-[10px] text-muted-foreground/70 flex-shrink-0">
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-foreground">{doctor.rating}</span>
        </span>
        <span>{doctor.reviews} reviews</span>
        <span>{doctor.experience} yrs</span>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-[12px] font-bold text-foreground">${doctor.fee}</p>
          <p className="text-[9px] text-muted-foreground/60">per visit</p>
        </div>

        {doctor.instantAvailable ? (
          <button
            disabled={!canBook}
            onClick={() => canBook && onBook(doctor)}
            className="px-2.5 py-1 rounded-sm text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Connect
          </button>
        ) : (
          <button
            disabled={!canBook}
            onClick={() => canBook && onBook(doctor)}
            className={cn(
              "px-2.5 py-1 rounded-sm text-[11px] font-semibold transition-all duration-200 active:scale-95",
              canBook
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {canBook ? "Book" : "Offline"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const PatientDoctors = () => {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("grid");
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
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const filtered = useMemo<Doctor[]>(() => {
    const q = filters.search.toLowerCase().trim();
    return doctors
      .filter((d) => {
        if (filters.specialty !== "All" && d.specialty !== filters.specialty) return false;
        if (filters.status !== "All" && d.status !== filters.status) return false;
        if (filters.availability === "instant" && !d.instantAvailable) return false;
        if (filters.availability === "scheduled" && d.instantAvailable) return false;
        if (filters.availableOnly && d.status === "offline") return false;
        if (filters.instantOnly && !d.instantAvailable) return false;
        if (filters.feeRange !== "All") {
          const [lo, hi] = filters.feeRange.split("-").map(Number);
          if (d.fee < lo || d.fee > hi) return false;
        }
        if (q && !d.name.toLowerCase().includes(q) && !d.hospital.toLowerCase().includes(q) && !d.specialty.toLowerCase().includes(q))
          return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "fee-asc": return a.fee - b.fee;
          case "fee-desc": return b.fee - a.fee;
          case "exp": return b.experience - a.experience;
          default: return b.rating - a.rating;
        }
      });
  }, [filters]);

  const onlineCount = filtered.filter((d) => d.status === "online").length;
  const busyCount = filtered.filter((d) => d.status === "busy").length;
  const offlineCount = filtered.filter((d) => d.status === "offline").length;
  const hospitalCount = [...new Set(filtered.map((d) => d.hospital))].length;

  const handleBook = useCallback((_doctor: Doctor) => {}, []);

  // ── Sidebar content ──────────────────────────────────────────────────────────
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
          <button onClick={clearAll} className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title="Specialty">
          <PillGroup<string>
            value={filters.specialty}
            onChange={(v) => set("specialty", v)}
            options={specialties.map((s) => ({ value: s, label: s }))}
          />
        </FilterSection>

        <FilterSection title="Status">
          <PillGroup<DoctorStatus | "All">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={STATUS_OPTIONS}
          />
        </FilterSection>

        <FilterSection title="Availability">
          <PillGroup<AvailabilityFilter>
            value={filters.availability}
            onChange={(v) => set("availability", v)}
            options={AVAILABILITY_OPTIONS}
          />
        </FilterSection>

        <FilterSection title="Date Range">
          <div className="space-y-2">
            {(["dateFrom", "dateTo"] as const).map((key, i) => (
              <div key={key}>
                <p className="text-[9px] text-muted-foreground/70 mb-1 font-medium">{i === 0 ? "From" : "To"}</p>
                <input
                  type="date"
                  value={filters[key]}
                  min={i === 1 ? filters.dateFrom : undefined}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
                />
              </div>
            ))}
            {(filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => { set("dateFrom", ""); set("dateTo", ""); }}
                className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Clear dates
              </button>
            )}
          </div>
        </FilterSection>

        <FilterSection title="Fee Range">
          <FeeRangeFilter value={filters.feeRange} onChange={(v) => set("feeRange", v)} />
        </FilterSection>

        <FilterSection title="Options">
          <div className="flex flex-col gap-1">
            {[
              { key: "availableOnly" as const, label: "Available doctors only" },
              { key: "instantOnly" as const, label: "Instant consult only" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => set(key, !filters[key])}
                className={cn(
                  "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left",
                  filters[key]
                    ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
                    : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.overview_title")}
          subtitle={t("pages.patient.overview_sub")}
        />

        {/* ── Body ── */}
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
                Show {filtered.length} {filtered.length === 1 ? "doctor" : "doctors"}
              </button>
            </div>
          </div>

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto">

            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{filtered.length}</span>{" "}
                  {filtered.length === 1 ? "doctor" : "doctors"} from{" "}
                  <span className="font-medium text-foreground">{hospitalCount}</span>{" "}
                  {hospitalCount === 1 ? "hospital" : "hospitals"}
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors">
                      Reset
                    </button>
                  )}
                </p>

                <div className="hidden lg:flex items-center gap-2">
                  {onlineCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {onlineCount} online
                    </span>
                  )}
                  {busyCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {busyCount} busy
                    </span>
                  )}
                  {offlineCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      {offlineCount} offline
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile filter button */}
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
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground ml-0.5" />}
                </button>

                {/* View toggle */}
                <div className="flex rounded-sm border border-border/60 overflow-hidden bg-card shadow-sm">
                  {(["grid", "list"] as const).map((v, i) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      aria-label={`${v} view`}
                      className={cn(
                        "px-2.5 py-1.5 transition-all duration-200",
                        i > 0 && "border-l border-border/60",
                        view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                      )}
                    >
                      {v === "grid" ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <line x1="3" y1="12" x2="21" y2="12" />
                          <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Search className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">No doctors match your filters</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Try widening your search criteria</p>
                  </div>
                  <button onClick={clearAll} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
                    Clear all filters
                  </button>
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {filtered.map((d) => (
                    <DoctorCard key={d.id} doctor={d} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.map((d) => (
                    <DoctorListItem key={d.id} doctor={d} onBook={handleBook} />
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

export default PatientDoctors;
