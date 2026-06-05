import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import {
  SlidersHorizontal,
  X,
  Search,
  Building2,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Wifi,
  MapPin,
  Stethoscope,
  Shield,
} from "lucide-react";
import {
  useGetSearchHospitals,
  type ApiHospital,
  type HospitalSearchParams,
} from "@/hooks/patient/use-patient-search-hospital";
import { HospitalCard } from "@/components/HospitalCard";
import HospitalListItem from "../hospital/HospitalListItem";

// ─── Types ──────────────────────────────────────────────────────────────────────

type SortOption = "name" | "doctors-desc" | "departments-desc";
type ViewMode = "grid" | "list";
type HospitalType = "all" | "hospital" | "clinic" | "health_center" | "pharmacy_clinic";

interface FilterState {
  q: string;
  city: string;
  type: HospitalType;
  open_now: boolean;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  q: "",
  city: "",
  type: "all",
  open_now: false,
  sort: "name",
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "name", label: "Name (A–Z)" },
  { value: "doctors-desc", label: "Most doctors" },
  { value: "departments-desc", label: "Most departments" },
];

const TYPE_OPTIONS: Array<{ value: HospitalType; label: string; icon?: React.ElementType }> = [
  { value: "all", label: "All types", icon: Building2 },
  { value: "hospital", label: "Hospital", icon: Building2 },
  { value: "clinic", label: "Clinic", icon: Stethoscope },
  { value: "health_center", label: "Health Center", icon: Shield },
  { value: "pharmacy_clinic", label: "Pharmacy Clinic", icon: Shield },
];

const TYPE_LABEL: Record<ApiHospital["type"], string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  health_center: "Health Center",
  pharmacy_clinic: "Pharmacy Clinic",
};

const TYPE_BADGE_STYLE: Record<ApiHospital["type"], string> = {
  hospital: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  clinic: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  health_center: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900",
  pharmacy_clinic: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildApiParams(filters: FilterState, page: number): HospitalSearchParams {
  const params: HospitalSearchParams = { page };
  if (filters.q.trim().length >= 2) params.q = filters.q.trim();
  if (filters.city.trim()) params.city = filters.city.trim();
  if (filters.type !== "all") params.type = filters.type as ApiHospital["type"];
  if (filters.open_now) params.open_now = true;
  return params;
}

function sortHospitals(hospitals: ApiHospital[], sort: SortOption): ApiHospital[] {
  return [...hospitals].sort((a, b) => {
    switch (sort) {
      case "doctors-desc": return b.doctors_count - a.doctors_count;
      case "departments-desc": return b.departments_count - a.departments_count;
      default: return a.name_en.localeCompare(b.name_en);
    }
  });
}

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
  options: { value: T; label: string; icon?: React.ElementType }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => {
        const Icon = o.icon;
        return (
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
            {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleButton({
  value,
  onChange,
  label,
  icon: Icon,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: React.ElementType;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left flex items-center gap-1.5",
        value
          ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
          : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
      )}
    >
      {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
      {label}
    </button>
  );
}

// ─── Hospital Grid Card ──────────────────────────────────────────────────────────

function HospitalGridCard({ hospital }: { hospital: ApiHospital }) {
  console.log("Rendering card for hospital:", hospital);
  return (
    <div className="bg-card border border-border/70 rounded-sm p-3 flex flex-col gap-2.5 hover:border-primary/30 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10">
          <Building2 className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[12px] font-semibold text-foreground leading-tight line-clamp-2">
            {hospital.name_en}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/70">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{hospital.city}</span>
            {hospital.address && (
              <span className="truncate">· {hospital.address}</span>
            )}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1">
        <span className={cn("px-1.5 py-px text-[9px] font-semibold rounded-sm border", TYPE_BADGE_STYLE[hospital.type])}>
          {TYPE_LABEL[hospital.type]}
        </span>
        {hospital.is_open_24h && (
          <span className="flex items-center gap-0.5 px-1.5 py-px text-[9px] font-semibold rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
            <Clock className="w-2.5 h-2.5" />
            24h Open
          </span>
        )}
      </div>

      {/* Departments */}
      {hospital.departments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {hospital.departments.slice(0, 3).map((dept) => (
            <span
              key={dept.id}
              className="px-1.5 py-px text-[9px] rounded-sm bg-secondary/60 text-muted-foreground border border-border/40"
            >
              {dept.name_en}
            </span>
          ))}
          {hospital.departments.length > 3 && (
            <span className="px-1.5 py-px text-[9px] rounded-sm bg-secondary/40 text-muted-foreground/70 border border-border/40">
              +{hospital.departments.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Insurances */}
      {hospital.insurances.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Shield className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">
            {hospital.insurances.map((i) => i.name).slice(0, 2).join(", ")}
            {hospital.insurances.length > 2 && ` +${hospital.insurances.length - 2}`}
          </span>
        </div>
      )}

      {/* Stats + CTA */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
          <span>
            <span className="font-semibold text-foreground">{hospital.doctors_count}</span> doctors
          </span>
          <span>
            <span className="font-semibold text-foreground">{hospital.departments_count}</span> depts
          </span>
        </div>
        <button className="px-2.5 py-1 rounded-sm text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-95 shadow-sm">
          View
        </button>
      </div>
    </div>
  );
}



// ─── Skeleton ────────────────────────────────────────────────────────────────────

function HospitalCardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-sm p-3 flex flex-col gap-2.5 animate-pulse">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-sm bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted rounded-sm w-3/4" />
          <div className="h-2.5 bg-muted/70 rounded-sm w-1/2" />
        </div>
      </div>
      <div className="flex gap-1">
        <div className="h-4 bg-muted rounded-sm w-16" />
        <div className="h-4 bg-muted/70 rounded-sm w-14" />
      </div>
      <div className="flex gap-1">
        <div className="h-4 bg-muted/60 rounded-sm w-20" />
        <div className="h-4 bg-muted/50 rounded-sm w-18" />
        <div className="h-4 bg-muted/40 rounded-sm w-12" />
      </div>
      <div className="flex justify-between pt-1.5 border-t border-border/40">
        <div className="h-3 bg-muted rounded-sm w-28" />
        <div className="h-6 bg-muted/80 rounded-sm w-12" />
      </div>
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  lastPage,
  total,
  perPage,
  onPageChange,
}: {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (p: number) => void;
}) {
  if (lastPage <= 1) return null;
  const from = (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-card/50">
      <p className="text-[10px] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{from}–{to}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span> hospitals
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-sm border text-[11px] font-medium transition-all",
              currentPage === p
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40",
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────

const PatientHospitals = () => {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(filters.q);
      setPage(1);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters.q]);

  const apiParams = useMemo<HospitalSearchParams>(
    () => buildApiParams({ ...filters, q: debouncedQ }, page),
    [filters, debouncedQ, page],
  );

  const { data, isLoading, isError, refetch } = useGetSearchHospitals(apiParams);
  console.log("API Params:", data);

  const hospitals = useMemo(() => {
    if (!data?.data) return [];
    return sortHospitals(data.data, filters.sort);
  }, [data, filters.sort]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key !== "q" && key !== "sort") setPage(1);
  }, []);

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setDebouncedQ("");
    setPage(1);
  }, []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const cityCount = useMemo(
    () => [...new Set(hospitals.map((h) => h.city).filter(Boolean))].length,
    [hospitals],
  );

  const open24hCount = hospitals.filter((h) => h.is_open_24h).length;
  const lastPage = data?.last_page ?? (data ? Math.ceil(data.total / data.per_page) : 1);

  // ── Sidebar ──────────────────────────────────────────────────────────────────
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
        {/* Search */}
        <FilterSection title="Search">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Name, city, or address…"
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
              className="w-full pl-6.5 pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
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

        {/* City */}
        <FilterSection title="City">
          <div className="relative">
            <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. Kigali…"
              value={filters.city}
              onChange={(e) => set("city", e.target.value)}
              className="w-full pl-6.5 pr-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
        </FilterSection>

        {/* Type */}
        <FilterSection title="Facility Type">
          <PillGroup<HospitalType>
            value={filters.type}
            onChange={(v) => set("type", v)}
            options={TYPE_OPTIONS}
          />
        </FilterSection>

        {/* Availability */}
        <FilterSection title="Availability">
          <ToggleButton
            value={filters.open_now}
            onChange={(v) => set("open_now", v)}
            label="Open now"
            icon={Wifi}
          />
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

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-52 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
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
                className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-all duration-200 shadow-sm"
              >
                Show {data?.total ?? 0} {(data?.total ?? 0) === 1 ? "hospital" : "hospitals"}
              </button>
            </div>
          </div>

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto flex flex-col">

            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  {isLoading ? (
                    <span className="inline-block w-24 h-3 bg-muted rounded-sm animate-pulse" />
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{data?.total ?? 0}</span>{" "}
                      {(data?.total ?? 0) === 1 ? "hospital" : "hospitals"} across{" "}
                      <span className="font-medium text-foreground">{cityCount}</span>{" "}
                      {cityCount === 1 ? "city" : "cities"}
                      {hasActiveFilters && (
                        <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors">
                          Reset
                        </button>
                      )}
                    </>
                  )}
                </p>

                {/* Live stats */}
                {!isLoading && open24hCount > 0 && (
                  <span className="hidden lg:flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                    <Clock className="w-2.5 h-2.5" />
                    {open24hCount} open 24h
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as SortOption)}
                  className="hidden sm:block px-2 py-1.5 text-[11px] bg-card border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

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
            <div className="p-4 flex-1">
              {isError ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-destructive/10 flex items-center justify-center border border-destructive/20">
                    <AlertCircle className="w-6 h-6 text-destructive/60" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">Failed to load hospitals</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Something went wrong. Please try again.</p>
                  </div>
                  <button
                    onClick={() => refetch()}
                    className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              ) : isLoading ? (
                <div className={cn(
                  view === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
                    : "flex flex-col gap-1.5",
                )}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <HospitalCardSkeleton key={i} />
                  ))}
                </div>
              ) : hospitals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Building2 className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">No hospitals match your filters</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Try widening your search criteria</p>
                  </div>
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {hospitals.map((hospital) => (
                    // <div>card</div>
                    <HospitalCard key={hospital.id} hospital={hospital} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {hospitals.map((h) => (
                    <HospitalListItem key={h.id} hospital={h} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && lastPage > 1 && (
              <Pagination
                currentPage={data.current_page}
                lastPage={lastPage}
                total={data.total}
                perPage={data.per_page}
                onPageChange={setPage}
              />
            )}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientHospitals;
