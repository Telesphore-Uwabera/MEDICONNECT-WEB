import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "High" | "Medium" | "Low";
type ViewMode = "table" | "cards";
type SortOption = "name" | "age-asc" | "age-desc" | "last";

interface Patient {
  id: string;
  name: string;
  age: number;
  last: string;
  rawLast: string; // ISO for sorting
  condition: string;
  risk: RiskLevel;
}

interface FilterState {
  search: string;
  risk: RiskLevel | "All";
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  risk: "All",
  sort: "name",
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "name", label: "Name (A–Z)" },
  { value: "age-asc", label: "Age: Youngest first" },
  { value: "age-desc", label: "Age: Oldest first" },
  { value: "last", label: "Last visit: Recent first" },
];

const RISK_STYLES: Record<RiskLevel, string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-warning/10 text-warning",
  Low: "bg-success/10 text-success",
};

const PATIENTS: Patient[] = [
  {
    id: "pt1",
    name: "John Mukasa",
    age: 54,
    last: "Apr 25",
    rawLast: "2026-04-25",
    condition: "Hypertension",
    risk: "Medium",
  },
  {
    id: "pt2",
    name: "Sarah Uwase",
    age: 32,
    last: "Apr 22",
    rawLast: "2026-04-22",
    condition: "Bronchitis",
    risk: "Low",
  },
  {
    id: "pt3",
    name: "David Niyonzima",
    age: 41,
    last: "Apr 27",
    rawLast: "2026-04-27",
    condition: "Eczema",
    risk: "Low",
  },
  {
    id: "pt4",
    name: "Marie Iradukunda",
    age: 8,
    last: "Apr 18",
    rawLast: "2026-04-18",
    condition: "Routine checkup",
    risk: "Low",
  },
  {
    id: "pt5",
    name: "Eric Habimana",
    age: 67,
    last: "Apr 20",
    rawLast: "2026-04-20",
    condition: "Post-op cardiac",
    risk: "High",
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
    <div className="py-4 border-b border-border last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
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
    <div className="flex flex-col gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-md text-sm border transition-all text-left",
            value === o.value
              ? "bg-teal-600 text-white border-teal-600"
              : "border-border text-muted-foreground hover:border-teal-400 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Initials avatar ──────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
      {initials}
    </div>
  );
}

// ─── Card view item ───────────────────────────────────────────────────────────

function PatientCard({
  p,
  onAction,
}: {
  p: Patient;
  onAction: (p: Patient) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-teal-300 dark:hover:border-teal-600 transition-colors">
      <Avatar name={p.name} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">
            {p.name}
          </span>
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-sm",
              RISK_STYLES[p.risk],
            )}
          >
            {p.risk}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {p.condition} · Age {p.age}
        </p>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">Last visit</p>
          <p className="text-sm font-medium text-foreground">{p.last}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs"
          onClick={() => onAction(p)}
        >
          View
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DoctorPatients = () => {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");

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

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return PATIENTS.filter((p) => {
      if (filters.risk !== "All" && p.risk !== filters.risk) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.condition.toLowerCase().includes(q)
      )
        return false;
      return true;
    }).sort((a, b) => {
      switch (filters.sort) {
        case "age-asc":
          return a.age - b.age;
        case "age-desc":
          return b.age - a.age;
        case "last":
          return b.rawLast.localeCompare(a.rawLast);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [filters]);

  const highRiskCount = filtered.filter((p) => p.risk === "High").length;

  const handleAction = useCallback((_p: Patient) => {
    // plug into router / modal here
  }, []);

  return (
    <DashboardLayout role="doctor">
      {/* ── Page header ── */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("pages.doctor.patients_title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("pages.doctor.patients_sub", { count: PATIENTS.length })}
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
              placeholder="Search name or condition…"
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
            <FilterSection title="Risk Level">
              <PillGroup<RiskLevel | "All">
                value={filters.risk}
                onChange={(v) => set("risk", v)}
                options={[
                  { value: "All", label: "All levels" },
                  { value: "High", label: "High risk" },
                  { value: "Medium", label: "Medium risk" },
                  { value: "Low", label: "Low risk" },
                ]}
              />
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
              {filtered.length === 1 ? "patient" : "patients"}
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
              {highRiskCount > 0 && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  {highRiskCount} high risk
                </span>
              )}

              {/* View toggle */}
              <div className="flex rounded-md border border-border overflow-hidden bg-card">
                <button
                  onClick={() => setView("table")}
                  aria-label="Table view"
                  className={cn(
                    "px-2.5 py-1.5 transition-colors",
                    view === "table"
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
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M3 15h18M9 3v18" />
                  </svg>
                </button>
                <button
                  onClick={() => setView("cards")}
                  aria-label="Card view"
                  className={cn(
                    "px-2.5 py-1.5 border-l border-border transition-colors",
                    view === "cards"
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

          {/* Content */}
          <div className="p-5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No patients match your filters
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
            ) : view === "table" ? (
              <div className="rounded-md border border-border bg-card overflow-hidden shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("pages.doctor.th_patient")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("pages.doctor.th_age")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("pages.doctor.th_last")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("pages.doctor.th_condition")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("pages.doctor.th_risk")}
                      </th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-border hover:bg-secondary/30 transition-smooth"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={p.name} />
                            <span className="font-medium text-foreground">
                              {p.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {p.age}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {p.last}
                        </td>
                        <td className="px-5 py-4">{p.condition}</td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-1 rounded-sm",
                              RISK_STYLES[p.risk],
                            )}
                          >
                            {p.risk}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(p)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((p) => (
                  <PatientCard key={p.id} p={p} onAction={handleAction} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default DoctorPatients;
