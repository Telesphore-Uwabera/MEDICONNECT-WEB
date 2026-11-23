import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { TablePager, paginateRows, tablePageCount } from "@/components/TablePager";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "table" | "cards";
type SortOption = "name" | "age-asc" | "age-desc" | "last";

interface Patient {
  id: string;
  name: string;
  age: number | null;
  last: string;
  rawLast: string;
  conditionKey: string;
}

interface FilterState {
  search: string;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  sort: "name",
};

const SORT_OPTIONS: Array<{ value: SortOption; labelKey: string }> = [
  { value: "name", labelKey: "pages.doctor.sort_name_az" },
  { value: "age-asc", labelKey: "pages.doctor.sort_age_youngest" },
  { value: "age-desc", labelKey: "pages.doctor.sort_age_oldest" },
  { value: "last", labelKey: "pages.doctor.sort_last_visit_recent" },
];

interface SeenPatient {
  id: number;
  name: string;
  age: number | null;
  last_visit: string | null;
  condition: string;
  visits: number;
}

// ─── Sidebar atoms ────────────────────────────────────────────────────────────

// ─── Initials avatar ──────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="h-10 w-10 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
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
  const { t } = useTranslation();
  return (
    <div className="bg-card border border-border rounded-[6px] p-4 flex items-center gap-4 hover:border-teal-300 dark:hover:border-teal-600 transition-colors">
      <Avatar name={p.name} />

      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-foreground">
          {p.name}
        </span>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {p.conditionKey}{p.age != null ? ` - ${t("pages.doctor.age_value", { age: p.age })}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">{t("pages.doctor.last_visit")}</p>
          <p className="text-sm font-medium text-foreground">{p.last}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9 px-4 text-sm"
          onClick={() => onAction(p)}
        >
          {t("pages.doctor.view")}
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
  const [page, setPage] = useState(1);

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

  const patientsQuery = useQuery({
    queryKey: ["doctor-my-patients", filters.search],
    queryFn: () => {
      const search = filters.search.trim();
      return apiFetch<{ data: SeenPatient[] }>(`/doctor/my-patients${search ? `?search=${encodeURIComponent(search)}` : ""}`);
    },
  });
  const fetched = useMemo(() => patientsQuery.data?.data ?? [], [patientsQuery.data]);

  const filtered = useMemo(() => {
    const ageRank = (age: number | null) => age ?? Number.POSITIVE_INFINITY;
    return fetched.map((row): Patient => ({
      id: String(row.id),
      name: row.name,
      age: row.age ?? null,
      last: row.last_visit || "—",
      rawLast: row.last_visit || "",
      conditionKey: row.condition,
    })).sort((a, b) => {
      switch (filters.sort) {
        case "age-asc":
          return ageRank(a.age) - ageRank(b.age);
        case "age-desc":
          return ageRank(b.age) - ageRank(a.age);
        case "last":
          return b.rawLast.localeCompare(a.rawLast);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [fetched, filters.sort]);
  const showAge = filtered.some((patient) => patient.age != null);
  const sortOptions = SORT_OPTIONS.filter((option) => showAge || !option.value.startsWith("age"));

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const lastPage = tablePageCount(filtered.length);
  const paged = paginateRows(filtered, page);

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
            {patientsQuery.isLoading
              ? t("common.loading", { defaultValue: "Loading..." })
              : t("pages.doctor.patients_sub", { count: filtered.length })}
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
              placeholder={t("pages.doctor.search_name_condition")}
              className="w-full h-10 pl-10 pr-4 text-sm bg-background border border-border rounded-[6px] outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 placeholder:text-muted-foreground/60 transition-all"
            />
          </div>
          <CustomSelect
            value={filters.sort}
            options={sortOptions.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            onChange={(v) => set("sort", v as SortOption)}
            label={t("pages.doctor.sort_label", { defaultValue: "Sort" })}
            compact
            className="w-[150px]"
          />
        </div>
      </div>

      {/* ── Body: sidebar + results ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-2.5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? t("pages.doctor.patient") : t("pages.doctor.patients")}
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="ml-3 text-teal-600 hover:underline text-sm"
                >
                  {t("pages.doctor.reset_filters")}
                </button>
              )}
            </p>

            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex rounded-[6px] border border-border overflow-hidden bg-card">
                <button
                  onClick={() => setView("table")}
                  aria-label={t("pages.doctor.table_view")}
                  className={cn(
                    "px-3 py-2 transition-colors",
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
                  aria-label={t("pages.doctor.card_view")}
                  className={cn(
                    "px-3 py-2 border-l border-border transition-colors",
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
                    {t("pages.doctor.no_patients_match")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("pages.doctor.try_widening_search")}
                  </p>
                </div>
                <button
                  onClick={clearAll}
                  className="text-xs text-teal-600 hover:underline"
                >
                  {t("pages.doctor.clear_all_filters")}
                </button>
              </div>
            ) : view === "table" ? (
              <div className="rounded-[6px] border border-border bg-card overflow-hidden shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("pages.doctor.th_patient")}
                      </th>
                      {showAge ? (
                        <th className="text-left px-5 py-3 font-medium">
                          {t("pages.doctor.th_age")}
                        </th>
                      ) : null}
                      <th className="text-left px-5 py-3 font-medium">
                        {t("pages.doctor.th_last")}
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        {t("pages.doctor.th_condition")}
                      </th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((p) => (
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
                        {showAge ? (
                          <td className="px-5 py-4 text-muted-foreground">
                            {p.age ?? ""}
                          </td>
                        ) : null}
                        <td className="px-5 py-4 text-muted-foreground">
                          {p.last}
                        </td>
                        <td className="px-5 py-4">{p.conditionKey}</td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(p)}
                          >
                            {t("pages.doctor.view")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {paged.map((p) => (
                  <PatientCard key={p.id} p={p} onAction={handleAction} />
                ))}
              </div>
            )}
            {filtered.length > 0 && (
              <TablePager page={page} lastPage={lastPage} total={filtered.length} onPageChange={setPage} />
            )}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default DoctorPatients;
