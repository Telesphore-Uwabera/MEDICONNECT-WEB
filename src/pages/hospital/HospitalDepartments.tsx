import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Heart, Brain, Baby, Bone, Stethoscope, Activity, Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Data ─────────────────────────────────────────────────────────────────────

const departments = [
  {
    name: "Cardiology",
    icon: Heart,
    doctors: 12,
    beds: 24,
    color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    category: "Specialty",
  },
  {
    name: "Neurology",
    icon: Brain,
    doctors: 8,
    beds: 18,
    color: "text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
    category: "Specialty",
  },
  {
    name: "Pediatrics",
    icon: Baby,
    doctors: 15,
    beds: 32,
    color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    category: "Specialty",
  },
  {
    name: "Orthopedics",
    icon: Bone,
    doctors: 10,
    beds: 20,
    color: "text-primary bg-primary/10 border-primary/20",
    category: "Specialty",
  },
  {
    name: "General Practice",
    icon: Stethoscope,
    doctors: 22,
    beds: 40,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
    category: "General",
  },
  {
    name: "Emergency",
    icon: Activity,
    doctors: 14,
    beds: 16,
    color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    category: "Emergency",
  },
];

type Category = "All" | "Specialty" | "General" | "Emergency";
type SortOption = "name" | "doctors-desc" | "beds-desc";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "All", label: "All departments" },
  { value: "Specialty", label: "Specialty" },
  { value: "General", label: "General" },
  { value: "Emergency", label: "Emergency" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "doctors-desc", label: "Most doctors" },
  { value: "beds-desc", label: "Most beds" },
];

interface FilterState {
  search: string;
  category: Category;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  category: "All",
  sort: "name",
};

// ─── Sidebar atoms ─────────────────────────────────────────────────────────────

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

// ─── Department Card ───────────────────────────────────────────────────────────

function DepartmentCard({ dept }: { dept: (typeof departments)[number] }) {
  const { t } = useTranslation();
  const Icon = dept.icon;
  return (
    <div className="bg-card border border-border/70 rounded-sm p-4 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-sm flex items-center justify-center shrink-0 border",
            dept.color,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-[12px] text-foreground truncate">
            {dept.name}
          </h3>
          <span className="text-[10px] text-muted-foreground/70">{dept.category}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-sm bg-secondary/40 border border-border/30 p-2.5">
          <div className="text-[9px] text-muted-foreground/70 mb-0.5">
            {t("pages.hospital.dept_doctors")}
          </div>
          <div className="font-bold text-[16px] tabular-nums text-foreground">
            {dept.doctors}
          </div>
        </div>
        <div className="rounded-sm bg-secondary/40 border border-border/30 p-2.5">
          <div className="text-[9px] text-muted-foreground/70 mb-0.5">
            {t("pages.hospital.dept_beds")}
          </div>
          <div className="font-bold text-[16px] tabular-nums text-foreground">
            {dept.beds}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const HospitalDepartments = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

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
    return departments
      .filter((d) => {
        if (filters.category !== "All" && d.category !== filters.category)
          return false;
        if (q && !d.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "doctors-desc":
            return b.doctors - a.doctors;
          case "beds-desc":
            return b.beds - a.beds;
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [filters]);

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
        <FilterSection title="Category">
          <PillGroup<Category>
            value={filters.category}
            onChange={(v) => set("category", v)}
            options={CATEGORIES}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.departments_title")}
          subtitle={t("pages.hospital.departments_sub")}
        />

        {/* ── Body: sidebar + results ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left Sidebar ── */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "department" : "departments"}
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                  >
                    Reset filters
                  </button>
                )}
              </p>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search departments…"
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => set("sort", e.target.value as SortOption)}
                    className="appearance-none pl-2.5 pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="p-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Stethoscope className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      No departments match your filters
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filtered.map((d) => (
                    <DepartmentCard key={d.name} dept={d} />
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

export default HospitalDepartments;
