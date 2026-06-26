import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import {
  useGetAdminHospitals,
  useApproveHospital,
  useRejectHospital,
  useSuspendHospital,
  type ApiHospital,
} from "@/hooks/admin/use-admin-hospitals";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  type FilterState,
  type StatusFilter,
  type TypeFilter,
  type SortOption,
  INITIAL_FILTERS,
  SORT_OPTIONS,
} from "./components/hospital/Types";
import { HospitalRow } from "./components/hospital/Hospitalrow";
import { HospitalCard } from "./components/hospital/Hospitalcard";
import { SkeletonRows } from "./components/hospital/Skeletonrows";
import { HospitalPanel } from "./components/hospital/Hospitalpanel";
import { getErrorMessage } from "./components/hospital/Utils";

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageHospitals() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected] = useState<ApiHospital | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { toast } = useToast();

  // Debounced search value
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => set("search", searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── API ──
  const { data, isLoading, isError } = useGetAdminHospitals({
    status: filters.status !== "all" ? filters.status : undefined,
    type: filters.type !== "all" ? filters.type : undefined,
    search: filters.search || undefined,
    page: filters.page,
  });

  const approveMutation = useApproveHospital();
  const rejectMutation = useRejectHospital();
  const suspendMutation = useSuspendHospital();

  const hospitals = data?.data ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    hospitals.forEach((h) => { counts[h.status] = (counts[h.status] ?? 0) + 1; });
    return counts;
  }, [hospitals]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    hospitals.forEach((h) => { if (h.type) counts[h.type] = (counts[h.type] ?? 0) + 1; });
    return counts;
  }, [hospitals]);

  // Client-side sort
  const sorted = useMemo(() => {
    return [...hospitals].sort((a, b) => {
      switch (filters.sort) {
        case "joined-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return a.name_en.localeCompare(b.name_en);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [hospitals, filters.sort]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" ? { page: 1 } : {}),
    }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchInput("");
  }, []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  // Lock body scroll when mobile/tablet filter sheet is open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  // ── Actions ──
  const handleApprove = useCallback(async (h: ApiHospital) => {
    try {
      await approveMutation.mutateAsync(h.id);
      setSelected((prev) =>
        prev ? { ...prev, status: "active", verified_at: new Date().toISOString() } : null,
      );
      toast({ title: "Hospital approved." });
    } catch (error: unknown) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  }, [approveMutation, toast]);

  const handleReject = useCallback(async (h: ApiHospital) => {
    try {
      await rejectMutation.mutateAsync({ id: h.id });
      setSelected((prev) =>
        prev ? { ...prev, status: "rejected", verified_at: null } : null,
      );
      toast({ title: "Hospital rejected." });
    } catch (error: unknown) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  }, [rejectMutation, toast]);

  const handleSuspend = useCallback(async (h: ApiHospital) => {
    try {
      await suspendMutation.mutateAsync({ id: h.id });
      setSelected((prev) => prev ? { ...prev, status: "suspended" } : null);
      toast({ title: "Hospital suspended." });
    } catch (error: unknown) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  }, [suspendMutation, toast]);

  const isActing =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    suspendMutation.isPending;

  const pendingCount = statusCounts["pending"] ?? 0;

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "pending", label: "Pending" },
        { value: "suspended", label: "Suspended" },
        { value: "rejected", label: "Rejected" },
      ],
      onChange: (v: string) => set("status", v as any),
    },
    {
      type: "select" as const,
      key: "type",
      label: "Type",
      value: filters.type,
      options: [
        { value: "all", label: "All types" },
        { value: "private", label: "Private" },
        { value: "public", label: "Public" },
        { value: "ngo", label: "NGO" },
      ],
      onChange: (v: string) => set("type", v as any),
    }
  ], [filters.status, filters.type, set]);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.overview_title")}
          subtitle={t("pages.admin.overview_sub")}
        />

        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2 }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <p className="text-[11px] text-muted-foreground shrink-0">
                {isLoading ? (
                  <span className="text-muted-foreground/50">Loading…</span>
                ) : (
                  <>
                    <span className="font-bold text-foreground">{total}</span>{" "}
                    {total === 1 ? "hospital" : "hospitals"}
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
                <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[6px] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingCount} pending
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Search input */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name or admin…"
                  className="w-44 md:w-56 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              {/* Refresh Button */}
              <button
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </button>

              {/* Sort select */}
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as SortOption)}
                  className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
              </div>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>

          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard label="Total hospitals" value={total} icon={Building2} accent="primary" />
            <StatCard label="Active" value={statusCounts["active"] ?? 0} icon={CheckCircle2} accent="success" />
            <StatCard label="Pending review" value={statusCounts["pending"] ?? 0} icon={Clock} accent="warning" />
            <StatCard label="Suspended" value={statusCounts["suspended"] ?? 0} icon={XCircle} accent="warning" />
          </div>

          <div className="sm:hidden px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email, phone…"
                className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
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

          {/* Content area */}
          <div className="p-3 sm:p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <p className="text-[12px] font-semibold text-destructive">
                  Failed to load hospitals
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Check your connection and try again
                </p>
              </div>
            ) : !isLoading && sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Building2 className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    No hospitals match your filters
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
                {/*
                   * Desktop table — only at lg+ (1024px+).
                   * Tablets get the card layout below for a better experience.
                   */}
                <div className="hidden lg:block rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Hospital</th>
                        <th className="text-left px-4 py-3 font-semibold">Type</th>
                        <th className="text-left px-4 py-3 font-semibold">Staff</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="text-left px-4 py-3 font-semibold">Joined</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <SkeletonRows />
                      ) : (
                        sorted.map((h) => (
                          <HospitalRow key={h.id} h={h} onManage={setSelected} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/*
                   * Card layout — phone AND tablet (hidden at lg+).
                   * Two-column grid on tablet for better use of space.
                   */}
                <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-24 rounded-[6px] border border-border/60 bg-card animate-pulse"
                      />
                    ))
                    : sorted.map((h) => (
                      <HospitalCard key={h.id} h={h} onManage={setSelected} />
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground">
                      Page{" "}
                      <span className="font-semibold text-foreground">{filters.page}</span>
                      {" "}of{" "}
                      <span className="font-semibold text-foreground">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={filters.page <= 1}
                        onClick={() => set("page", filters.page - 1)}
                        className="p-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={filters.page >= totalPages}
                        onClick={() => set("page", filters.page + 1)}
                        className="p-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

      {/* Right-side panel */}
      <HospitalPanel
        hospital={selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onSuspend={handleSuspend}
        isActing={isActing}
      />
    </DashboardLayout>
  );
}

export default ManageHospitals;
