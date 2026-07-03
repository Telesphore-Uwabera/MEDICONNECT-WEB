import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
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

// ─── Hospital Grid Card ──────────────────────────────────────────────────────────

function HospitalGridCard({ hospital }: { hospital: ApiHospital }) {
  return (
    <div className="bg-card border border-border/70 rounded-[6px] p-3 flex flex-col gap-2.5 hover:border-primary/30 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10">
          <Building2 className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-foreground leading-tight line-clamp-2">
            {hospital.name_en}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 text-[12px] text-muted-foreground/70">
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
        <span className={cn("px-2 py-0.5 text-[11px] font-semibold rounded-[6px] border", TYPE_BADGE_STYLE[hospital.type])}>
          {TYPE_LABEL[hospital.type]}
        </span>
        {hospital.is_open_24h && (
          <span className="flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-semibold rounded-[6px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
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
              className="px-2 py-0.5 text-[11px] rounded-[6px] bg-secondary/60 text-muted-foreground border border-border/40"
            >
              {dept.name_en}
            </span>
          ))}
          {hospital.departments.length > 3 && (
            <span className="px-2 py-0.5 text-[11px] rounded-[6px] bg-secondary/40 text-muted-foreground/70 border border-border/40">
              +{hospital.departments.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Insurances */}
      {hospital.insurances.length > 0 && (
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground/60">
          <Shield className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">
            {hospital.insurances.map((i) => i.name).slice(0, 2).join(", ")}
            {hospital.insurances.length > 2 && ` +${hospital.insurances.length - 2}`}
          </span>
        </div>
      )}

      {/* Stats + CTA */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground/70">
          <span>
            <span className="font-semibold text-foreground">{hospital.doctors_count}</span> doctors
          </span>
          <span>
            <span className="font-semibold text-foreground">{hospital.departments_count}</span> depts
          </span>
        </div>
        <button className="px-2.5 py-1 rounded-[6px] text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-95 shadow-sm">
          View
        </button>
      </div>
    </div>
  );
}



// ─── Skeleton ────────────────────────────────────────────────────────────────────

function HospitalCardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-[6px] p-3 flex flex-col gap-2.5 animate-pulse">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-[6px] bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted rounded-[6px] w-3/4" />
          <div className="h-2.5 bg-muted/70 rounded-[6px] w-1/2" />
        </div>
      </div>
      <div className="flex gap-1">
        <div className="h-4 bg-muted rounded-[6px] w-16" />
        <div className="h-4 bg-muted/70 rounded-[6px] w-14" />
      </div>
      <div className="flex gap-1">
        <div className="h-4 bg-muted/60 rounded-[6px] w-20" />
        <div className="h-4 bg-muted/50 rounded-[6px] w-18" />
        <div className="h-4 bg-muted/40 rounded-[6px] w-12" />
      </div>
      <div className="flex justify-between pt-1.5 border-t border-border/40">
        <div className="h-3 bg-muted rounded-[6px] w-28" />
        <div className="h-6 bg-muted/80 rounded-[6px] w-12" />
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
      <p className="text-[12px] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{from}–{to}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span> hospitals
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-[6px] border text-[13px] font-medium transition-all",
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
          className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function SearchStats({
  isLoading,
  total,
  shown,
  open24h,
  cities,
}: {
  isLoading: boolean;
  total: number;
  shown: number;
  open24h: number;
  cities: number;
}) {
  const { t } = useTranslation();
  const cards = [
    { label: t("pages.patient.matching_facilities_stat"), value: total, icon: Building2, tone: "text-primary bg-primary/10 border-primary/20" },
    { label: t("pages.patient.shown_now_stat"), value: shown, icon: Stethoscope, tone: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
    { label: t("pages.patient.open_24h_stat"), value: open24h, icon: Clock, tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { label: t("pages.patient.cities_stat"), value: cities, icon: MapPin, tone: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 p-4 pb-2">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-[6px] border border-border/70 bg-card p-3 flex items-center gap-3 min-w-0">
            <div className={cn("h-9 w-9 rounded-[6px] border flex items-center justify-center shrink-0", card.tone)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="h-5 w-12 rounded-[6px] bg-muted animate-pulse" />
              ) : (
                <p className="leading-none font-bold text-foreground text-sm tabular-nums ">{card.value}</p>
              )}
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {card.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaginationV2({
  currentPage,
  lastPage,
  total,
  perPage,
  itemLabel,
  onPageChange,
}: {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  itemLabel: string;
  onPageChange: (p: number) => void;
}) {
  const { t } = useTranslation();
  if (total <= 0) return null;

  const safeLastPage = Math.max(1, lastPage);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeLastPage);
  const from = (safeCurrentPage - 1) * perPage + 1;
  const to = Math.min(safeCurrentPage * perPage, total);
  const goToPage = (nextPage: number) =>
    onPageChange(Math.min(Math.max(1, nextPage), safeLastPage));

  const pageNumbers = (() => {
    const pages = new Set<number>([1, safeLastPage, safeCurrentPage]);
    for (let p = safeCurrentPage - 1; p <= safeCurrentPage + 1; p += 1) {
      if (p >= 1 && p <= safeLastPage) pages.add(p);
    }
    return Array.from(pages).sort((a, b) => a - b);
  })();

  return (
    <div className="border-t border-border/70 bg-card px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            {t("pages.patient.page_of", { current: safeCurrentPage, last: safeLastPage })}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {t("pages.patient.showing_range_generic", { from, to, total, item: itemLabel })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => goToPage(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className="h-9 px-3 flex items-center gap-1.5 rounded-[6px] border border-border/70 bg-background text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t("pages.patient.prev_link")}
          </button>

          {pageNumbers.map((pageNumber, index) => {
            const previous = pageNumbers[index - 1];
            return (
              <span key={pageNumber} className="inline-flex items-center gap-1.5">
                {previous != null && pageNumber - previous > 1 && (
                  <span className="px-1 text-xs text-muted-foreground">...</span>
                )}
                <button
                  onClick={() => goToPage(pageNumber)}
                  aria-current={safeCurrentPage === pageNumber ? "page" : undefined}
                  className={cn(
                    "h-9 min-w-9 px-3 flex items-center justify-center rounded-[6px] border text-xs font-bold transition-all",
                    safeCurrentPage === pageNumber
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/50",
                  )}
                >
                  {pageNumber}
                </button>
              </span>
            );
          })}

          <button
            onClick={() => goToPage(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeLastPage}
            className="h-9 px-3 flex items-center gap-1.5 rounded-[6px] border border-border/70 bg-background text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {t("common.next")}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────

const PatientHospitals = () => {
  const { t, i18n } = useTranslation();

  const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
    { value: "name", label: t("pages.patient.sort_name_az") },
    { value: "doctors-desc", label: t("pages.patient.sort_most_doctors") },
    { value: "departments-desc", label: t("pages.patient.sort_most_departments") },
  ];

  const TYPE_OPTIONS: Array<{ value: HospitalType; label: string; icon?: React.ElementType }> = [
    { value: "all", label: t("pages.patient.facility_type_all"), icon: Building2 },
    { value: "hospital", label: t("pages.patient.facility_type_hospital"), icon: Building2 },
    { value: "clinic", label: t("pages.patient.facility_type_clinic"), icon: Stethoscope },
    { value: "health_center", label: t("pages.patient.facility_type_health_center"), icon: Shield },
    { value: "pharmacy_clinic", label: t("pages.patient.facility_type_pharmacy_clinic"), icon: Shield },
  ];

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

  const hospitals = useMemo(() => {
    if (!data?.data) return [];
    return sortHospitals(data.data, filters.sort);
  }, [data, filters.sort]);

  useEffect(() => {
    if (!data?.last_page || data.last_page < 1) return;
    if (page > data.last_page) setPage(data.last_page);
  }, [data?.last_page, page]);

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

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    requestAnimationFrame(() => {
      document.querySelector("[data-hospital-results]")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.hospitals_title")}
          subtitle={t("pages.patient.hospitals_sub", { count: data?.total ?? 0 })}
        />

        <div className="flex flex-col flex-1 min-h-0">
         

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto flex flex-col" data-hospital-results>
            <SearchStats
              isLoading={isLoading}
              total={data?.total ?? 0}
              shown={hospitals.length}
              open24h={open24hCount}
              cities={cityCount}
            />

            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[13px] text-muted-foreground">
                  {isLoading ? (
                    <span className="inline-block w-24 h-3 bg-muted rounded-[6px] animate-pulse" />
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{data?.total ?? 0}</span>{" "}
                      {(data?.total ?? 0) === 1 ? t("pages.patient.hospital_word_singular") : t("pages.patient.hospital_word_plural")}{" "}
                      across{" "}
                      <span className="font-medium text-foreground">{cityCount}</span>{" "}
                      {cityCount === 1 ? t("pages.patient.city_word_singular") : t("pages.patient.city_word_plural")}
                      {hasActiveFilters && (
                        <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-[12px] font-medium transition-colors">
                          {t("pages.patient.reset_link")}
                        </button>
                      )}
                    </>
                  )}
                </p>

                {/* Live stats */}
                {!isLoading && open24hCount > 0 && (
                  <span className="hidden lg:flex items-center gap-1 text-[12px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-[6px]">
                    <Clock className="w-2.5 h-2.5" />
                    {t("pages.patient.open_24h_count", { count: open24hCount })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as SortOption)}
                  className="hidden sm:block px-2 py-1.5 text-[13px] bg-card border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                <FilterToggleButton
                  open={filterOpen}
                  onToggle={() => setFilterOpen((p) => !p)}
                  hasActiveFilters={hasActiveFilters}
                />

                {/* View toggle */}
                <div className="flex rounded-[6px] border border-border/60 overflow-hidden bg-card shadow-sm">
                  {(["grid", "list"] as const).map((v, i) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      aria-label={v === "grid" ? t("pages.patient.grid_view_aria") : t("pages.patient.list_view_aria")}
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

 {/* ── FilterBar ── */}
          <FilterBar
            open={filterOpen}
            onToggle={() => setFilterOpen((p) => !p)}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            fields={[
              {
                type: "search",
                key: "q",
                label: t("pages.patient.search_label"),
                placeholder: t("pages.patient.hospitals_search_placeholder"),
                value: filters.q,
                onChange: (v) => set("q", v),
              },
              {
                type: "search",
                key: "city",
                label: t("pages.patient.city_label"),
                placeholder: t("pages.patient.city_example_placeholder"),
                value: filters.city,
                onChange: (v) => set("city", v),
              },
              {
                type: "select",
                key: "type",
                label: t("pages.patient.facility_type_label"),
                value: filters.type,
                options: TYPE_OPTIONS,
                onChange: (v) => set("type", v as HospitalType),
              },
              {
                type: "select",
                key: "availability",
                label: t("pages.patient.availability_label"),
                value: filters.open_now ? "open" : "all",
                options: [
                  { value: "all", label: t("pages.patient.availability_any") },
                  { value: "open", label: t("pages.patient.open_now_label") },
                ],
                onChange: (v) => set("open_now", v === "open"),
              },
            ]}
          />
            {/* Content */}
            <div className="p-4 flex-1">
              {isError ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-[6px] bg-destructive/10 flex items-center justify-center border border-destructive/20">
                    <AlertCircle className="w-6 h-6 text-destructive/60" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{t("pages.patient.failed_to_load_hospitals_title")}</p>
                    <p className="text-[13px] text-muted-foreground/70 mt-1">{t("pages.patient.failed_to_load_generic_sub")}</p>
                  </div>
                  <button
                    onClick={() => refetch()}
                    className="flex items-center gap-1.5 text-[13px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t("pages.patient.retry_link")}
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
                  <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                    <Building2 className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{t("pages.patient.no_hospitals_match_filters_title")}</p>
                    <p className="text-[13px] text-muted-foreground/70 mt-1">{t("pages.patient.try_widening_search_sub")}</p>
                  </div>
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="text-[13px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
                      {t("pages.patient.clear_all_filters_link")}
                    </button>
                  )}
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-3">
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
            {data && (
              <PaginationV2
                currentPage={data.current_page}
                lastPage={lastPage}
                total={data.total}
                perPage={data.per_page}
                itemLabel={t("pages.patient.facilities_word")}
                onPageChange={handlePageChange}
              />
            )}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientHospitals;
