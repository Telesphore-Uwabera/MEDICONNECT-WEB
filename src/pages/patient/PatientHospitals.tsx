import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { HospitalCard } from "@/components/HospitalCard";
import { hospitals } from "@/lib/hospital-store";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ──────────────────────────────────────────────────────────────────

type SortOption = "name" | "rating-desc" | "rating-asc" | "doctors-desc";
type ViewMode = "grid" | "list";
type RatingFilter = "All" | "4.5+" | "4.0+" | "3.5+";

interface FilterState {
  search: string;
  specialty: string;
  city: string;
  rating: RatingFilter;
  sort: SortOption;
  verifiedOnly: boolean;
  emergencyOnly: boolean;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  specialty: "All",
  city: "All",
  rating: "All",
  sort: "rating-desc",
  verifiedOnly: false,
  emergencyOnly: false,
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "rating-desc", label: "Highest rated" },
  { value: "rating-asc", label: "Lowest rated" },
  { value: "name", label: "Name (A–Z)" },
  { value: "doctors-desc", label: "Most doctors" },
];

const RATING_LABELS: Record<RatingFilter, string> = {
  All: "Any rating",
  "4.5+": "4.5 & above",
  "4.0+": "4.0 & above",
  "3.5+": "3.5 & above",
};

const RATING_THRESHOLD: Record<RatingFilter, number> = {
  All: 0,
  "4.5+": 4.5,
  "4.0+": 4.0,
  "3.5+": 3.5,
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
    <div className="py-3 border-b border-border last:border-b-0">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
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
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-[11px] border transition-all text-left",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── List item ───────────────────────────────────────────────────────────────

function HospitalListItem({
  hospital,
}: {
  hospital: (typeof hospitals)[number];
}) {
  return (
    <div className="bg-card border border-border rounded-sm px-3.5 py-2.5 flex items-center gap-3 hover:border-primary/40 transition-colors">
      {/* Icon */}
      <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
          />
        </svg>
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold text-foreground leading-tight">
            {hospital.name}
          </span>
          {hospital.verified && (
            <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-primary/10 text-primary border border-primary/20">
              VERIFIED
            </span>
          )}
          {hospital.emergency && (
            <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-destructive/10 text-destructive border border-destructive/20">
              24/7 ER
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {hospital.city} · {hospital.specialties.slice(0, 3).join(", ")}
          {hospital.specialties.length > 3 &&
            ` +${hospital.specialties.length - 3}`}
        </p>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-4 text-[10px] text-muted-foreground flex-shrink-0">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3 fill-warning" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-semibold text-foreground">{hospital.rating?.toFixed(1) ?? "—"}</span>
        </span>
        {hospital.doctors != null && (
          <span>{hospital.doctors} doctors</span>
        )}
        {hospital.beds != null && (
          <span>{hospital.beds} beds</span>
        )}
      </div>

      {/* CTA */}
      <button className="flex-shrink-0 px-2.5 py-1 rounded-sm text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95">
        View
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PatientHospitals = () => {
  const { t } = useTranslation();
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

  const allSpecialties = useMemo(() => {
    const seen = new Set<string>();
    hospitals.forEach((h) => h.specialties?.forEach((s) => seen.add(s)));
    return [
      { value: "All", label: "All specialties" },
      ...Array.from(seen).sort().map((s) => ({ value: s, label: s })),
    ];
  }, []);

  const allCities = useMemo(() => {
    const seen = new Set<string>();
    hospitals.forEach((h) => h.city && seen.add(h.city));
    return [
      { value: "All", label: "All cities" },
      ...Array.from(seen).sort().map((c) => ({ value: c, label: c })),
    ];
  }, []);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return hospitals
      .filter((h) => {
        if (filters.specialty !== "All" && !h.specialties?.includes(filters.specialty)) return false;
        if (filters.city !== "All" && h.city !== filters.city) return false;
        if (filters.rating !== "All" && (h.rating ?? 0) < RATING_THRESHOLD[filters.rating]) return false;
        if (filters.verifiedOnly && !h.verified) return false;
        if (filters.emergencyOnly && !h.emergency) return false;
        if (q && !h.name.toLowerCase().includes(q) && !h.city?.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "rating-asc": return (a.rating ?? 0) - (b.rating ?? 0);
          case "name": return a.name.localeCompare(b.name);
          case "doctors-desc": return (b.doctors ?? 0) - (a.doctors ?? 0);
          default: return (b.rating ?? 0) - (a.rating ?? 0);
        }
      });
  }, [filters]);

  const cityCount = [...new Set(filtered.map((h) => h.city).filter(Boolean))].length;

  const StarIcon = ({ active }: { active: boolean }) => (
    <svg
      className={cn("w-3 h-3 flex-shrink-0", active ? "fill-primary-foreground" : "fill-warning")}
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

  // ── Sidebar content ──────────────────────────────────────────────────────
  const sidebarContent = (
    <>
      {/* Sidebar header */}
      <div className="px-3.5 pt-3.5 pb-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          <span className="text-[11px] font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-[10px] text-primary hover:underline">
            Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title="Specialty">
          <PillGroup<string>
            value={filters.specialty}
            onChange={(v) => set("specialty", v)}
            options={allSpecialties}
          />
        </FilterSection>

        <FilterSection title="City">
          <PillGroup<string>
            value={filters.city}
            onChange={(v) => set("city", v)}
            options={allCities}
          />
        </FilterSection>

        <FilterSection title="Rating">
          <PillGroup<RatingFilter>
            value={filters.rating}
            onChange={(v) => set("rating", v)}
            options={(Object.keys(RATING_LABELS) as RatingFilter[]).map((k) => ({
              value: k,
              label: RATING_LABELS[k],
              icon: <StarIcon active={filters.rating === k} />,
            }))}
          />
        </FilterSection>

        <FilterSection title="Options">
          <div className="flex flex-col gap-1">
            {[
              { key: "verifiedOnly" as const, label: "Verified only" },
              { key: "emergencyOnly" as const, label: "24/7 emergency care" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => set(key, !filters[key])}
                className={cn(
                  "px-2 py-1.5 rounded-sm text-[11px] border transition-all text-left",
                  filters[key]
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
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

      <PageHeader
             title={t("pages.patient.overview_title")}
             subtitle={t("pages.patient.overview_sub")}
           />

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col w-52 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          {sidebarContent}
        </aside>

        {/* Mobile backdrop */}
        <div
          onClick={() => setFilterOpen(false)}
          className={cn(
            "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
            filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          )}
        />

        {/* Mobile bottom drawer */}
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 md:hidden",
            "bg-card rounded-t border-t border-border",
            "max-h-[85dvh] flex flex-col overflow-hidden",
            "transition-transform duration-300 ease-out",
            filterOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div className="w-8 h-0.5 rounded-full bg-border" />
          </div>
          <div className="overflow-y-auto flex-1">{sidebarContent}</div>
          <div className="flex-shrink-0 px-3.5 py-3 border-t border-border">
            <button
              onClick={() => setFilterOpen(false)}
              className="w-full py-2 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-colors"
            >
              Show {filtered.length} {filtered.length === 1 ? "hospital" : "hospitals"}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        <main className="flex-1 overflow-y-auto">

          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "hospital" : "hospitals"} across{" "}
              <span className="font-medium text-foreground">{cityCount}</span>{" "}
              {cityCount === 1 ? "city" : "cities"}
              {hasActiveFilters && (
                <button onClick={clearAll} className="ml-2 text-primary hover:underline text-[10px]">
                  Reset
                </button>
              )}
            </p>

            <div className="flex items-center gap-2">
              {/* Mobile filter button */}
              <button
                onClick={() => setFilterOpen(true)}
                className={cn(
                  "md:hidden flex items-center gap-1 px-2 py-1 rounded-sm border text-[11px] transition-colors",
                  hasActiveFilters
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground bg-card",
                )}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                Filters
                {hasActiveFilters && <span className="w-1 h-1 rounded-full bg-primary-foreground" />}
              </button>

              {/* View toggle */}
              <div className="flex rounded-sm border border-border overflow-hidden bg-card">
                {(["grid", "list"] as const).map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-label={`${v} view`}
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      i > 0 && "border-l border-border",
                      view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v === "grid" ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
              <div className="flex flex-col items-center justify-center py-20 gap-2.5 text-center">
                <div className="w-11 h-11 rounded-sm bg-muted flex items-center justify-center">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-foreground">No hospitals match your filters</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Try widening your search criteria</p>
                </div>
                <button onClick={clearAll} className="text-[11px] text-primary hover:underline">
                  Clear all filters
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((h) => (
                  <HospitalCard key={h.name} hospital={h} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filtered.map((h) => (
                  <HospitalListItem key={h.name} hospital={h} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default PatientHospitals;
