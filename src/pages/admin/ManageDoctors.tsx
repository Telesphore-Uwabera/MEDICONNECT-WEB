// export default ManageDoctors;
import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import {
  ShieldOff,
  Stethoscope,
  Clock,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useGetAdminDoctors,
  useApproveDoctor,
  useRejectDoctor,
  useSuspendDoctor,
  type ApiDoctor,
} from "@/hooks/admin/use-admin-doctors";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  type FilterState,
  type StatusFilter,
  type ConsultationFilter,
  type SortOption,
  INITIAL_FILTERS,
  SORT_OPTIONS,
  getErrorMessage,
} from "./components/doctor/Types";
import { FilterSection, PillGroup } from "./components/doctor/Filtercomponents";
import { DoctorRow, DoctorCard } from "./components/doctor/Doctorlistitems";
import { SkeletonRows } from "./components/doctor/Skeletonrows";
import { DoctorPanel } from "./components/doctor/DoctorPanel";
import {
  SpecializationSelect,
  type SpecializationValue,
} from "../patient/components/SpecializationSelect";

// ─── Initial spec constant ────────────────────────────────────────────────────

const INITIAL_SPEC: SpecializationValue = { specialization: null, fee: null };

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageDoctors() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [spec, setSpec] = useState<SpecializationValue>(INITIAL_SPEC);

  console.log("spec",spec)

  const [selected, setSelected] = useState<ApiDoctor | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { toast } = useToast();

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => set("search", searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when spec changes
  useEffect(() => {
    set("page", 1);
  }, [spec]);

  // ── API ──
const { data, isLoading, isError } = useGetAdminDoctors({
  status: filters.status !== "all" ? filters.status : undefined,
  consultation_type: filters.consultation_type !== "all" ? filters.consultation_type : undefined,
  specialization:        spec.specialization?.name        || undefined,
  specialization_fee_id: spec.fee?.id                     || undefined,
  search: filters.search || undefined,
  page: filters.page,
});

  const approveMutation = useApproveDoctor();
  const rejectMutation = useRejectDoctor();
  const suspendMutation = useSuspendDoctor();

  const doctors = data?.data ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    doctors.forEach((d) => {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    });
    return counts;
  }, [doctors]);

  const consultationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    doctors.forEach((d) => {
      if (d.consultation_type)
        counts[d.consultation_type] = (counts[d.consultation_type] ?? 0) + 1;
    });
    return counts;
  }, [doctors]);

  const sorted = useMemo(() => {
    return [...doctors].sort((a, b) => {
      switch (filters.sort) {
        case "joined-asc":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "name":
          return a.user.name.localeCompare(b.user.name);
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [doctors, filters.sort]);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        ...(key !== "page" ? { page: 1 } : {}),
      }));
    },
    [],
  );

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchInput("");
    setSpec(INITIAL_SPEC); // ← also reset spec
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS) ||
      spec.specialization !== null, // ← include spec in active check
    [filters, spec],
  );

  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  // ── Actions ──
  const handleApprove = useCallback(
    async (d: ApiDoctor) => {
      try {
        await approveMutation.mutateAsync(d.id);
        setSelected((prev) =>
          prev ? { ...prev, status: "active", is_active: true } : null,
        );
        toast({ title: "Doctor approved." });
      } catch (error: unknown) {
        toast({ title: getErrorMessage(error), variant: "destructive" });
      }
    },
    [approveMutation, toast],
  );

  const handleReject = useCallback(
    async (d: ApiDoctor) => {
      try {
        await rejectMutation.mutateAsync({ id: d.id });
        setSelected((prev) =>
          prev ? { ...prev, status: "rejected", is_active: false } : null,
        );
        toast({ title: "Doctor rejected." });
      } catch (error: unknown) {
        toast({ title: getErrorMessage(error), variant: "destructive" });
      }
    },
    [rejectMutation, toast],
  );

  const handleSuspend = useCallback(
    async (d: ApiDoctor) => {
      try {
        await suspendMutation.mutateAsync({ id: d.id });
        setSelected((prev) =>
          prev ? { ...prev, status: "suspended", is_active: false } : null,
        );
        toast({ title: "Doctor suspended." });
      } catch (error: unknown) {
        toast({ title: getErrorMessage(error), variant: "destructive" });
      }
    },
    [suspendMutation, toast],
  );

  const isActing =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    suspendMutation.isPending;

  const pendingCount = statusCounts["pending"] ?? 0;

  // ── Sidebar ──
  const sidebarContent = (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">
            Filters
          </span>
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
          <PillGroup<StatusFilter>
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all", label: "All" },
              {
                value: "active",
                label: "Active",
                count: statusCounts["active"] ?? 0,
              },
              {
                value: "pending",
                label: "Pending",
                count: statusCounts["pending"] ?? 0,
              },
              {
                value: "suspended",
                label: "Suspended",
                count: statusCounts["suspended"] ?? 0,
              },
              {
                value: "rejected",
                label: "Rejected",
                count: statusCounts["rejected"] ?? 0,
              },
            ]}
          />
        </FilterSection>

        <FilterSection title="Consultation">
          <PillGroup<ConsultationFilter>
            value={filters.consultation_type}
            onChange={(v) => set("consultation_type", v)}
            options={[
              { value: "all", label: "All types" },
              {
                value: "instant",
                label: "Instant",
                count: consultationCounts["instant"] ?? 0,
              },
              {
                value: "booking",
                label: "Booking",
                count: consultationCounts["booking"] ?? 0,
              },
              // {
              //   value: "both",
              //   label: "Both",
              //   count: consultationCounts["both"] ?? 0,
              // },
            ]}
          />
        </FilterSection>

        {/* Specialization — wired to spec state */}
        <FilterSection title="Specialization">
          <SpecializationSelect value={spec} onChange={setSpec} />
          {/* Active badge with inline clear */}
          {spec.specialization && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
                {spec.specialization.name}
                {spec.fee && (
                  <span className="text-primary/70">
                    · {spec.fee.sub_specialization}
                  </span>
                )}
                <button
                  onClick={() => setSpec(INITIAL_SPEC)}
                  className="ml-0.5 hover:text-destructive transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            </div>
          )}
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.overview_title")}
          subtitle={t("pages.admin.overview_sub")}
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
              "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile bottom-sheet */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 md:hidden",
              "bg-card rounded-t-2xl border-t border-border",
              "max-h-[85dvh] flex flex-col overflow-hidden",
              "transition-transform duration-300 ease-out",
              filterOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-4 border-t border-border">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors"
              >
                Show results
              </button>
            </div>
          </div>

          {/* ── Main ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard
                label="Total doctors"
                value={total}
                icon={Stethoscope}
                accent="primary"
              />
              <StatCard
                label="Active"
                value={statusCounts["active"] ?? 0}
                icon={CheckCircle2}
                accent="success"
              />
              <StatCard
                label="Pending review"
                value={statusCounts["pending"] ?? 0}
                icon={Clock}
                accent="warning"
              />
              <StatCard
                label="Suspended"
                value={statusCounts["suspended"] ?? 0}
                icon={XCircle}
                accent="warning"
              />
            </div>

            {/* Mobile search */}
            <div className="sm:hidden px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, phone, email…"
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Meta bar */}
            <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <p className="text-[11px] text-muted-foreground shrink-0">
                  {isLoading ? (
                    <span className="text-muted-foreground/50">Loading…</span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{total}</span>{" "}
                      {total === 1 ? "doctor" : "doctors"}
                    </>
                  )}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </p>

                {pendingCount > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingCount} pending
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Desktop search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search name, phone, email…"
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => set("sort", e.target.value as SortOption)}
                    className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/* Mobile filter button */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm border text-[11px] transition-colors",
                    hasActiveFilters
                      ? "bg-primary text-white border-primary"
                      : "border-border/60 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Filters</span>
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              {isError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <p className="text-[12px] font-semibold text-destructive">
                    Failed to load doctors
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Check your connection and try again
                  </p>
                </div>
              ) : !isLoading && sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Stethoscope className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      No doctors match your filters
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
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-[11px]">
                      <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">
                            Doctor
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            Specialization
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            Consultation
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            Status
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            Joined
                          </th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <SkeletonRows />
                        ) : (
                          sorted.map((d) => (
                            <DoctorRow
                              key={d.id}
                              d={d}
                              onManage={setSelected}
                            />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden flex flex-col gap-2">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-24 rounded-sm border border-border/60 bg-card animate-pulse"
                          />
                        ))
                      : sorted.map((d) => (
                          <DoctorCard key={d.id} d={d} onManage={setSelected} />
                        ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                      <p className="text-[11px] text-muted-foreground">
                        Page{" "}
                        <span className="font-semibold text-foreground">
                          {filters.page}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-foreground">
                          {totalPages}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={filters.page <= 1}
                          onClick={() => set("page", filters.page - 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={filters.page >= totalPages}
                          onClick={() => set("page", filters.page + 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <DoctorPanel
        doctor={selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onSuspend={handleSuspend}
        isActing={isActing}
      />
    </DashboardLayout>
  );
}

export default ManageDoctors;

