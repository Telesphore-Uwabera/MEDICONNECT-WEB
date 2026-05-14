import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { doctors, type Doctor } from "@/lib/mock-data";
import { Video, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type SortOption = "rating" | "fee-asc" | "fee-desc" | "exp";
type ViewMode = "grid" | "list";
type FeeRange = "All" | "0-30" | "30-50" | "50-999";

interface FilterState {
  search: string;
  specialty: string;
  feeRange: FeeRange;
  sort: SortOption;
  videoOnly: boolean;
  voiceOnly: boolean;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  specialty: "All",
  feeRange: "All",
  sort: "rating",
  videoOnly: false,
  voiceOnly: false,
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "rating", label: "Relevance" },
  { value: "fee-asc", label: "Fee: Low to High" },
  { value: "fee-desc", label: "Fee: High to Low" },
  { value: "exp", label: "Most Experienced" },
];

const FEE_LABELS: Record<FeeRange, string> = {
  All: "All prices",
  "0-30": "Under $30",
  "30-50": "$30 – $50",
  "50-999": "Above $50",
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
    <div className="py-4 border-b border-border last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function StyledSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2 pr-8 text-sm bg-background border border-border rounded-md text-foreground outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer transition-all"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

function FeeRangeFilter({
  value,
  onChange,
}: {
  value: FeeRange;
  onChange: (v: FeeRange) => void;
}) {
  const sliderVal =
    value === "0-30"
      ? 30
      : value === "30-50"
        ? 60
        : value === "50-999"
          ? 85
          : 100;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>$0</span>
        <span className="font-medium text-foreground">
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
        className="w-full accent-teal-600 cursor-pointer"
      />
      <div className="flex flex-wrap gap-1 mt-2.5">
        {(Object.keys(FEE_LABELS) as FeeRange[]).map((k) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] border transition-all",
              value === k
                ? "bg-teal-600 text-white border-teal-600"
                : "border-border text-muted-foreground hover:border-teal-400 hover:text-foreground",
            )}
          >
            {FEE_LABELS[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group select-none">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0",
          checked
            ? "bg-teal-600 border-teal-600"
            : "border-border group-hover:border-teal-400",
        )}
      >
        {checked && (
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m5 13 4 4L19 7"
            />
          </svg>
        )}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

// ─── List item ───────────────────────────────────────────────────────────────

function DoctorListItem({ doctor }: { doctor: Doctor }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4 hover:border-teal-300 dark:hover:border-teal-600 transition-colors">
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 flex items-center justify-center text-sm font-semibold">
          {doctor.avatar}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">
            {doctor.name}
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
            LIVE
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {doctor.specialty} · {doctor.hospital}
        </p>
      </div>
      <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground flex-shrink-0">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {doctor.rating}
        </span>
        <span>{doctor.experience} yrs exp</span>
        <span className="font-semibold text-foreground">${doctor.fee}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="bg-gradient-primary hover:opacity-90 h-7 px-2.5 text-xs"
        >
          <Video className="h-3 w-3 mr-1" /> Video
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs">
          <Phone className="h-3 w-3 mr-1" /> Voice
        </Button>
      </div>
    </div>
  );
}

// ─── Grid card ───────────────────────────────────────────────────────────────

function DoctorGridCard({ doctor }: { doctor: Doctor }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all">
      <div className="relative flex-shrink-0">
        <div className="h-14 w-14 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
          {doctor.avatar}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground truncate">
          {doctor.name}
        </div>
        <div className="text-sm text-primary">{doctor.specialty}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          ${doctor.fee} · responds in ~2 min
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="bg-gradient-primary hover:opacity-90 h-7 px-2.5 text-xs"
        >
          <Video className="h-3 w-3 mr-1.5" /> Video
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs">
          <Phone className="h-3 w-3 mr-1.5" /> Voice
        </Button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PatientInstant = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("grid");

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

  // All instantly-available doctors
  const onlineDoctors = useMemo(
    () => doctors.filter((d) => d.instantAvailable),
    [],
  );

  const allSpecialties = useMemo(() => {
    const set = new Set(onlineDoctors.map((d) => d.specialty));
    return [
      { value: "All", label: "All specialties" },
      ...Array.from(set)
        .sort()
        .map((s) => ({ value: s, label: s })),
    ];
  }, [onlineDoctors]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return onlineDoctors
      .filter((d) => {
        if (filters.specialty !== "All" && d.specialty !== filters.specialty)
          return false;
        if (filters.feeRange !== "All") {
          const [lo, hi] = filters.feeRange.split("-").map(Number);
          if (d.fee < lo || d.fee > hi) return false;
        }
        if (
          q &&
          !d.name.toLowerCase().includes(q) &&
          !d.specialty.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "fee-asc":
            return a.fee - b.fee;
          case "fee-desc":
            return b.fee - a.fee;
          case "exp":
            return b.experience - a.experience;
          default:
            return b.rating - a.rating;
        }
      });
  }, [filters, onlineDoctors]);

  return (
    <DashboardLayout role="patient">
      {/* ── Page header ── */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("pages.patient.instant_title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("pages.patient.instant_sub")}
          </p>
        </div>

        {/* Search + sort */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
              placeholder="Search doctors or specialties…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 placeholder:text-muted-foreground/60 transition-all"
            />
          </div>
          <div className="relative flex-shrink-0">
            <select
              value={filters.sort}
              onChange={(e) => set("sort", e.target.value as SortOption)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-md text-foreground outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m6 9 6 6 6-6"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + results ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left Sidebar ── */}
        <aside className="w-60 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                />
              </svg>
              <span className="text-sm font-semibold text-foreground">
                Filters
              </span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="text-xs text-teal-600 hover:underline"
              >
                Reset all
              </button>
            )}
          </div>

          <div className="px-4">
            <FilterSection title="Specialty">
              <StyledSelect
                value={filters.specialty}
                onChange={(v) => set("specialty", v)}
                options={allSpecialties}
              />
            </FilterSection>

            <FilterSection title="Fee Range">
              <FeeRangeFilter
                value={filters.feeRange}
                onChange={(v) => set("feeRange", v)}
              />
            </FilterSection>

            <FilterSection title="Consult Type">
              <div className="space-y-3">
                <Checkbox
                  checked={filters.videoOnly}
                  onChange={(v) => set("videoOnly", v)}
                  label="Video consult"
                />
                <Checkbox
                  checked={filters.voiceOnly}
                  onChange={(v) => set("voiceOnly", v)}
                  label="Voice consult"
                />
              </div>
            </FilterSection>
          </div>
        </aside>

        {/* ── Results ── */}
        <main className="flex-1 overflow-y-auto">
          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-2.5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? "doctor" : "doctors"} available now
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="ml-2 text-teal-600 hover:underline text-xs"
                >
                  Reset filters
                </button>
              )}
            </p>

            <div className="flex items-center gap-3">
              {/* Live pill */}
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineDoctors.length} live now
              </span>

              {/* Match anyone CTA */}
              <Button
                size="sm"
                className="bg-gradient-primary hover:opacity-90 h-7 px-3 text-xs hidden sm:flex"
              >
                <Video className="h-3 w-3 mr-1.5" />
                {t("pages.patient.match_anyone")}
              </Button>

              {/* View toggle */}
              <div className="flex rounded-md border border-border overflow-hidden bg-card">
                <button
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  className={cn(
                    "px-2.5 py-1.5 transition-colors",
                    view === "grid"
                      ? "bg-teal-600 text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={() => setView("list")}
                  aria-label="List view"
                  className={cn(
                    "px-2.5 py-1.5 border-l border-border transition-colors",
                    view === "list"
                      ? "bg-teal-600 text-white"
                      : "text-muted-foreground hover:text-foreground",
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

          {/* Hero banner */}
          <div className="px-5 pt-5">
            <div className="rounded-xl bg-gradient-charcoal text-charcoal-foreground p-5 flex items-center justify-between flex-wrap gap-4 shadow-medium">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-medium">
                    {t("pages.patient.doctors_live", {
                      count: onlineDoctors.length,
                    })}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold mt-1">
                  {t("pages.patient.avg_wait_title")}
                </h2>
              </div>
              <Button className="bg-primary hover:bg-primary-glow text-sm">
                <Video className="mr-2 h-4 w-4" />
                {t("pages.patient.match_anyone")}
              </Button>
            </div>
          </div>

          {/* Cards / List */}
          <div className="p-5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <Video className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No doctors match your filters
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Try widening your search criteria
                  </p>
                </div>
                <button
                  onClick={clearAll}
                  className="text-xs text-teal-600 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="grid md:grid-cols-2 gap-4">
                {filtered.map((d) => (
                  <DoctorGridCard key={d.id} doctor={d} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((d) => (
                  <DoctorListItem key={d.id} doctor={d} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default PatientInstant;
