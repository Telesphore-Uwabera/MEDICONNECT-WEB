import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Stethoscope, CheckCircle2, XCircle, SlidersHorizontal, X, Search,
  ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Plus, Zap,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { useGetDoctorConsultations } from "@/hooks/admin/use-doctor-insitant";
import { cn } from "@/lib/utils";

import {
  INITIAL_FILTERS, PAGE_SIZE, SORT_OPTIONS,
  type FilterState, type StatusFilter, type OverrideFilter, type InstantFilter, type SortOption,
  resolvedFee,
} from "./components/instantDoctors/types";
import { FilterSection, PillGroup, SkeletonRows, ConsultationRow, ConsultationCard } from "./components/instantDoctors/components";
import { AssignPanel, ConsultationPanel } from "./components/instantDoctors/panels";
import type { ApiDoctorConsultation } from "@/hooks/admin/use-doctor-insitant";

// ─── ManageInstantDoctors ─────────────────────────────────────────────────────

function ManageInstantDoctors() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters]         = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected]       = useState<ApiDoctorConsultation | null>(null);
  const [assignOpen, setAssignOpen]   = useState(false);
  const [filterOpen, setFilterOpen]   = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, ...(key !== "page" ? { page: 1 } : {}) }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => set("search", searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput, set]);

  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const { data, isLoading, isError, refetch, isFetching } = useGetDoctorConsultations();
  const allConsultations = data?.doctor_consultations ?? [];

  const filtered = useMemo(() => {
    let list = allConsultations;

    if (filters.status !== "all")
      list = list.filter((c) => filters.status === "active" ? c.is_active : !c.is_active);

    if (filters.override !== "all")
      list = list.filter((c) =>
        filters.override === "overridden"
          ? c.online_fee_override !== null || c.in_person_fee_override !== null
          : c.online_fee_override === null && c.in_person_fee_override === null,
      );

    if (filters.instant !== "all")
      list = list.filter((c) =>
        filters.instant === "instant" ? c.doctor.instant_consultation : !c.doctor.instant_consultation,
      );

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter((c) =>
        c.doctor.user.name.toLowerCase().includes(q) ||
        (c.primary_specialization ?? "").toLowerCase().includes(q) ||
        (c.secondary_specialization ?? "").toLowerCase().includes(q) ||
        (c.doctor.user.phone ?? "").includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (filters.sort === "fee-asc")  return (resolvedFee(a).online ?? 0) - (resolvedFee(b).online ?? 0);
      if (filters.sort === "fee-desc") return (resolvedFee(b).online ?? 0) - (resolvedFee(a).online ?? 0);
      return a.doctor.user.name.localeCompare(b.doctor.user.name);
    });
  }, [allConsultations, filters]);

  const totalPages    = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated     = filtered.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE);
  const total         = allConsultations.length;
  const activeCount   = allConsultations.filter((c) => c.is_active).length;
  const inactiveCount = allConsultations.filter((c) => !c.is_active).length;
  const overrideCount = allConsultations.filter((c) => c.online_fee_override !== null || c.in_person_fee_override !== null).length;
  const instantCount  = allConsultations.filter((c) => c.doctor.instant_consultation).length;

  const clearAll = useCallback(() => { setFilters(INITIAL_FILTERS); setSearchInput(""); }, []);
  const hasActiveFilters = useMemo(() => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS), [filters]);

  // ── Sidebar content (shared between desktop aside + mobile drawer) ──────────
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
            <X className="w-3 h-3" />Reset all
          </button>
        )}
      </div>
      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<StatusFilter> value={filters.status} onChange={(v) => set("status", v)}
            options={[
              { value: "all",      label: "All" },
              { value: "active",   label: "Active",   count: activeCount },
              { value: "inactive", label: "Inactive", count: inactiveCount },
            ]} />
        </FilterSection>
        <FilterSection title="Instant Consultation">
          <PillGroup<InstantFilter> value={filters.instant} onChange={(v) => set("instant", v)}
            options={[
              { value: "all",         label: "All" },
              { value: "instant",     label: "Instant enabled",  count: instantCount },
              { value: "non_instant", label: "Instant disabled", count: total - instantCount },
            ]} />
        </FilterSection>
        <FilterSection title="Fee">
          <PillGroup<OverrideFilter> value={filters.override} onChange={(v) => set("override", v)}
            options={[
              { value: "all",        label: "All" },
              { value: "overridden", label: "Override active", count: overrideCount },
              { value: "base_rate",  label: "Base rate only" },
            ]} />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.instant_doctors.overview_title")}
          subtitle={t("pages.instant_doctors.overview_sub")}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile filter sheet */}
          <div onClick={() => setFilterOpen(false)}
            className={cn("fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} />
          <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-2xl border-t border-border max-h-[85dvh] flex flex-col overflow-hidden transition-transform duration-300 ease-out",
            filterOpen ? "translate-y-0" : "translate-y-full",
          )}>
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-4 border-t border-border">
              <button onClick={() => setFilterOpen(false)} className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors">Show results</button>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto">
            {/* Stats */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Total consultations" value={total}         icon={Stethoscope}  accent="primary" />
              <StatCard label="Active"              value={activeCount}   icon={CheckCircle2} accent="success" />
              <StatCard label="Inactive"            value={inactiveCount} icon={XCircle}      accent="warning" />
              <StatCard label="Instant enabled"     value={instantCount}  icon={Zap}          accent="primary" />
            </div>

            {/* Mobile search */}
            <div className="sm:hidden px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, specialization, phone…"
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
                {searchInput && (
                  <button onClick={() => setSearchInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Meta bar */}
            <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-[11px] text-muted-foreground shrink-0">
                  {isLoading
                    ? <span className="text-muted-foreground/50">Loading…</span>
                    : <><span className="font-bold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "record" : "records"}</>
                  }
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors">Reset</button>
                  )}
                </p>
                {instantCount > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900 px-2 py-0.5 rounded-sm shrink-0">
                    <Zap className="w-2.5 h-2.5 fill-blue-500 text-blue-500 dark:fill-blue-400" />{instantCount} instant
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search name, specialization…"
                    className="w-52 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
                </div>
                <div className="relative">
                  <select value={filters.sort} onChange={(e) => set("sort", e.target.value as SortOption)}
                    className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[130px] sm:max-w-none">
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>
                <button onClick={() => refetch()} disabled={isFetching}
                  className="hidden sm:flex p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 transition-colors" title="Refresh">
                  <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
                </button>
                {/* <Button size="sm" className="h-8 px-3 text-[11px] rounded-sm gap-1.5" onClick={() => setAssignOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Assign doctor</span>
                  <span className="sm:hidden">Assign</span>
                </Button> */}
                <button onClick={() => setFilterOpen(true)}
                  className={cn("md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-colors",
                    hasActiveFilters ? "bg-primary text-white border-primary" : "border-border/60 text-muted-foreground bg-card")}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              {isError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <p className="text-[12px] font-semibold text-destructive">Failed to load consultations</p>
                  <p className="text-[11px] text-muted-foreground/70">Check your connection and try again</p>
                </div>
              ) : !isLoading && paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Stethoscope className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">{hasActiveFilters ? "No records match your filters" : "No consultations yet"}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">{hasActiveFilters ? "Try widening your search criteria" : "Assign doctors to start managing consultations"}</p>
                  </div>
                  {hasActiveFilters
                    ? <button onClick={clearAll} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">Clear all filters</button>
                    : <Button size="sm" className="mt-1 h-8 px-4 text-[11px] rounded-sm gap-1.5" onClick={() => setAssignOpen(true)}><Plus className="w-3.5 h-3.5" />Assign first doctor</Button>
                  }
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-[11px]">
                      <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Doctor</th>
                          <th className="text-left px-4 py-3 font-semibold">Specialization</th>
                          <th className="text-left px-4 py-3 font-semibold">Online Fee</th>
                          <th className="text-left px-4 py-3 font-semibold">In-Person Fee</th>
                          <th className="text-left px-4 py-3 font-semibold">Instant</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? <SkeletonRows /> : paginated.map((c) => (
                          <ConsultationRow key={c.id} c={c} onManage={setSelected} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden flex flex-col gap-2">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-sm border border-border/60 bg-card animate-pulse" />)
                      : paginated.map((c) => <ConsultationCard key={c.id} c={c} onManage={setSelected} />)
                    }
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                      <p className="text-[11px] text-muted-foreground">
                        Page <span className="font-semibold text-foreground">{filters.page}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button disabled={filters.page <= 1} onClick={() => set("page", filters.page - 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button disabled={filters.page >= totalPages} onClick={() => set("page", filters.page + 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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

      {/* <AssignPanel       open={assignOpen}  onClose={() => setAssignOpen(false)} /> */}
      <ConsultationPanel consultation={selected} onClose={() => setSelected(null)} />
    </DashboardLayout>
  );
}

export default ManageInstantDoctors;
