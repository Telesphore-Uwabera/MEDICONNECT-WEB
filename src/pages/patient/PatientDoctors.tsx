import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { t } from "i18next";
import {
  SlidersHorizontal,
  X,
  Star,
  Search,
  Zap,
  CalendarCheck,
  Clock,
  Stethoscope,
  Globe,
  Video,
  MapPin,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
// import {
//   useGetSearchDoctors,
//   type ApiDoctor,
//   type DoctorSearchParams,
// } from "@/hooks/patient/use-patient-search-doctor";
import { DoctorCard } from "@/components/DoctorCard";
import { useGetSearchDoctors,
  type ApiDoctor,
  type DoctorSearchParams,

 } from "@/hooks/patient/use-patient-doctor";

// ─── Types ──────────────────────────────────────────────────────────────────────

type SortOption = "rating" | "fee-asc" | "fee-desc";
type ConsultationType = "all" | "online" | "in_person" | "both";
type ViewMode = "grid" | "list";

interface FilterState {
  q: string;
  specialization: string;
  type: ConsultationType;
  language: string;
  city: string;
  gender: "all" | "male" | "female";
  available_today: boolean;
  instant: boolean;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  q: "",
  specialization: "",
  type: "all",
  language: "",
  city: "",
  gender: "all",
  available_today: false,
  instant: false,
  sort: "rating",
};

const CONSULTATION_OPTIONS = [
  { value: "all" as const, label: "All types", icon: Globe },
  { value: "online" as const, label: "Online", icon: Video },
  { value: "in_person" as const, label: "In-person", icon: MapPin },
  { value: "both" as const, label: "Both", icon: Stethoscope },
];

const GENDER_OPTIONS = [
  { value: "all" as const, label: "Any gender" },
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "rating", label: "Best Rating" },
  { value: "fee-asc", label: "Fee: Low → High" },
  { value: "fee-desc", label: "Fee: High → Low" },
];

const LANGUAGE_OPTIONS = [
  { value: "", label: "Any language" },
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "kiny", label: "Kinyarwanda" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildApiParams(filters: FilterState, page: number): DoctorSearchParams {
  const params: DoctorSearchParams = { page };
  if (filters.q.trim().length >= 2) params.q = filters.q.trim();
  if (filters.specialization.trim()) params.specialization = filters.specialization.trim();
  if (filters.type !== "all") params.type = filters.type as "online" | "in_person" | "both";
  if (filters.language) params.language = filters.language;
  if (filters.city.trim()) params.city = filters.city.trim();
  if (filters.gender !== "all") params.gender = filters.gender as "male" | "female";
  if (filters.available_today) params.available_today = true;
  if (filters.instant) params.instant = true;
  return params;
}

function sortDoctors(doctors: ApiDoctor[], sort: SortOption): ApiDoctor[] {
  return [...doctors].sort((a, b) => {
    switch (sort) {
      case "fee-asc":
        return parseFloat(a.consultation_fee) - parseFloat(b.consultation_fee);
      case "fee-desc":
        return parseFloat(b.consultation_fee) - parseFloat(a.consultation_fee);
      default: // rating
        return parseFloat(b.rating_avg) - parseFloat(a.rating_avg);
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

// ─── Doctor Card ──────────────────────────────────────────────────────────────

function DoctorAvatar({ doctor }: { doctor: ApiDoctor }) {
  const [imgError, setImgError] = useState(false);
  const initials = doctor.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!doctor.image || imgError) {
    return (
      <div className="w-full h-full rounded-sm bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-base border border-primary/10">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={doctor.image}
      alt={doctor.user.name}
      className="w-full h-full object-cover rounded-sm"
      onError={() => setImgError(true)}
    />
  );
}

function ConsultationTypeBadge({ type }: { type: ApiDoctor["consultation_type"] }) {
  const configs = {
    online: { label: "Online", className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900" },
    in_person: { label: "In-Person", className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900" },
    both: { label: "Online & In-Person", className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900" },
  };
  const cfg = configs[type] ?? configs.both;
  return (
    <span className={cn("px-1.5 py-px text-[9px] font-semibold rounded-sm border", cfg.className)}>
      {cfg.label}
    </span>
  );
}

function DoctorGridCard({ doctor }: { doctor: ApiDoctor }) {
  return <DoctorCard doctor={doctor} />;
}

function DoctorListItem({ doctor }: { doctor: ApiDoctor }) {
  const fee = parseFloat(doctor.consultation_fee);
  const rating = parseFloat(doctor.rating_avg);
  const canBook = doctor.is_available && !doctor.bookings_paused;

  return (
    <div className="bg-card border border-border/70 rounded-sm px-3.5 py-2.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      <div className="w-9 h-9 rounded-sm overflow-hidden flex-shrink-0 border border-border/40">
        <DoctorAvatar doctor={doctor} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-foreground leading-tight">
            {doctor.user.name}
          </span>
          {doctor.instant_consultation && (
            <span className="flex items-center gap-0.5 px-1 py-px text-[9px] font-bold rounded-sm bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
              <Zap className="w-2.5 h-2.5" />
              INSTANT
            </span>
          )}
          {doctor.is_featured && (
            <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
              Featured
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
          {doctor.specialization} · {doctor.doctor_degree}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-4 text-[10px] text-muted-foreground/70 flex-shrink-0">
        <span className="flex items-center gap-1">
          <Star className={cn("w-3 h-3", rating > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
          <span className="font-semibold text-foreground">{rating > 0 ? rating.toFixed(1) : "New"}</span>
        </span>
        <ConsultationTypeBadge type={doctor.consultation_type} />
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-[12px] font-bold text-foreground">
            {fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`}
          </p>
          <p className="text-[9px] text-muted-foreground/60">per visit</p>
        </div>

        {doctor.instant_consultation ? (
          <button
            disabled={!canBook}
            className={cn(
              "px-2.5 py-1 rounded-sm text-[11px] font-semibold transition-all duration-200 active:scale-95 flex items-center gap-1",
              canBook
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            <Zap className="w-3 h-3" />
            Connect
          </button>
        ) : (
          <button
            disabled={!canBook}
            className={cn(
              "px-2.5 py-1 rounded-sm text-[11px] font-semibold transition-all duration-200 active:scale-95",
              canBook
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {canBook ? "Book" : doctor.bookings_paused ? "Paused" : "Unavailable"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function DoctorCardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-sm p-3 flex flex-col gap-2.5 animate-pulse">
      <div className="flex items-start gap-2.5">
        <div className="w-10 h-10 rounded-sm bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted rounded-sm w-3/4" />
          <div className="h-2.5 bg-muted/70 rounded-sm w-1/2" />
          <div className="h-2 bg-muted/50 rounded-sm w-1/3" />
        </div>
      </div>
      <div className="h-2.5 bg-muted/60 rounded-sm w-full" />
      <div className="h-2.5 bg-muted/40 rounded-sm w-2/3" />
      <div className="flex gap-1 mt-1">
        <div className="h-4 bg-muted rounded-sm w-20" />
        <div className="h-4 bg-muted/70 rounded-sm w-16" />
      </div>
      <div className="flex justify-between pt-1.5 border-t border-border/40">
        <div className="h-3 bg-muted rounded-sm w-12" />
        <div className="h-3 bg-muted rounded-sm w-20" />
      </div>
      <div className="h-7 bg-muted/80 rounded-sm w-full mt-0.5" />
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

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
        <span className="font-semibold text-foreground">{total}</span> doctors
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
          const page = i + 1;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-sm border text-[11px] font-medium transition-all",
                currentPage === page
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40",
              )}
            >
              {page}
            </button>
          );
        })}
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

// ─── Page ──────────────────────────────────────────────────────────────────────

const PatientDoctors = () => {
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

  const apiParams = useMemo<DoctorSearchParams>(() => {
    return buildApiParams({ ...filters, q: debouncedQ }, page);
  }, [filters, debouncedQ, page]);

  const { data, isLoading, isError, refetch } = useGetSearchDoctors(apiParams);

  const doctors = useMemo(() => {
    if (!data?.data) return [];
    return sortDoctors(data.data, filters.sort);
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

  const instantCount = doctors.filter((d) => d.instant_consultation).length;
  const availableCount = doctors.filter((d) => d.is_available).length;
  const featuredCount = doctors.filter((d) => d.is_featured).length;

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
              placeholder="Name or specialization…"
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
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

        {/* Specialization */}
        <FilterSection title="Specialization">
          <input
            type="text"
            placeholder="e.g. Cardiologist…"
            value={filters.specialization}
            onChange={(e) => set("specialization", e.target.value)}
            className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </FilterSection>

        {/* Consultation type */}
        <FilterSection title="Consultation Type">
          <PillGroup<ConsultationType>
            value={filters.type}
            onChange={(v) => set("type", v)}
            options={CONSULTATION_OPTIONS}
          />
        </FilterSection>

        {/* Availability toggles */}
        <FilterSection title="Availability">
          <div className="flex flex-col gap-1">
            <ToggleButton
              value={filters.available_today}
              onChange={(v) => set("available_today", v)}
              label="Available today"
              icon={CalendarCheck}
            />
            <ToggleButton
              value={filters.instant}
              onChange={(v) => set("instant", v)}
              label="Instant consult only"
              icon={Zap}
            />
          </div>
        </FilterSection>

        {/* City */}
        <FilterSection title="City">
          <input
            type="text"
            placeholder="e.g. Kigali…"
            value={filters.city}
            onChange={(e) => set("city", e.target.value)}
            className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </FilterSection>

        {/* Language */}
        <FilterSection title="Language">
          <PillGroup<string>
            value={filters.language}
            onChange={(v) => set("language", v)}
            options={LANGUAGE_OPTIONS}
          />
        </FilterSection>

        {/* Gender */}
        <FilterSection title="Doctor Gender">
          <PillGroup<"all" | "male" | "female">
            value={filters.gender}
            onChange={(v) => set("gender", v)}
            options={GENDER_OPTIONS}
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
                className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-all duration-200 shadow-sm"
              >
                Show {data?.total ?? 0} {(data?.total ?? 0) === 1 ? "doctor" : "doctors"}
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
                      {(data?.total ?? 0) === 1 ? "doctor" : "doctors"} found
                      {hasActiveFilters && (
                        <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors">
                          Reset
                        </button>
                      )}
                    </>
                  )}
                </p>

                {/* Live stats */}
                {!isLoading && doctors.length > 0 && (
                  <div className="hidden lg:flex items-center gap-2">
                    {availableCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {availableCount} available
                      </span>
                    )}
                    {instantCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm">
                        <Zap className="w-2.5 h-2.5" />
                        {instantCount} instant
                      </span>
                    )}
                    {featuredCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        {featuredCount} featured
                      </span>
                    )}
                  </div>
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
                    <p className="text-[12px] font-semibold text-foreground">Failed to load doctors</p>
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
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2"
                    : "flex flex-col gap-2"
                )}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <DoctorCardSkeleton key={i} />
                  ))}
                </div>
              ) : doctors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <User className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">No doctors match your filters</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Try widening your search criteria</p>
                  </div>
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {doctors.map((d) => (
             
                    <DoctorGridCard key={d.id} doctor={d} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {doctors.map((d) => (
             
                    <DoctorListItem key={d.id} doctor={d} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && data.last_page > 1 && (
              <Pagination
                currentPage={data.current_page}
                lastPage={data.last_page}
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

export default PatientDoctors
