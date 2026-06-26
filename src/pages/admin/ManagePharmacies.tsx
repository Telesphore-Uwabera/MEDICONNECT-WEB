import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FlaskConical, CheckCircle2, Clock, XCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import {
  useGetAdminPharmacies, useApprovePharmacy, useRejectPharmacy, useSuspendPharmacy,
  type ApiPharmacy,
} from "@/hooks/admin/use-admin-pharmacies";
import { useToast } from "@/hooks/use-toast";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { usePharmacyFilters, getErrorMessage, SORT_OPTIONS } from "./components/Pharmacy/config";
import {
  PharmacyTable, PharmacyPanel,
} from "./components/Pharmacy/components";
import { Search, ChevronDown, SlidersHorizontal, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function ManagePharmacies() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { filters, set, clearAll, hasActiveFilters, searchInput, setSearchInput } = usePharmacyFilters();
  const [selected, setSelected] = useState<ApiPharmacy | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // ── Data ──
  const { data, isLoading, isError } = useGetAdminPharmacies({
    status: filters.status !== "all" ? filters.status : undefined,
    city: filters.city || undefined,
    search: filters.search || undefined,
    page: filters.page,
  });

  const pharmacies = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (data?.per_page ?? 20));

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    pharmacies.forEach((p) => { c[p.status] = (c[p.status] ?? 0) + 1; });
    return c;
  }, [pharmacies]);

  const cities = useMemo(() => {
    const seen = new Set<string>();
    pharmacies.forEach((p) => { if (p.city) seen.add(p.city); });
    return Array.from(seen).sort();
  }, [pharmacies]);

  const sorted = useMemo(() => [...pharmacies].sort((a, b) => {
    if (filters.sort === "joined-asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (filters.sort === "name") return a.name_en.localeCompare(b.name_en);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [pharmacies, filters.sort]);

  // ── Mutations ──
  const approveMutation = useApprovePharmacy();
  const rejectMutation = useRejectPharmacy();
  const suspendMutation = useSuspendPharmacy();
  const isActing = approveMutation.isPending || rejectMutation.isPending || suspendMutation.isPending;

  const handleApprove = useCallback(async (p: ApiPharmacy) => {
    try {
      await approveMutation.mutateAsync(p.id);
      setSelected((prev) => prev ? { ...prev, status: "active", verified_at: new Date().toISOString() } : null);
      toast({ title: "Pharmacy approved." });
    } catch (e) { toast({ title: getErrorMessage(e), variant: "destructive" }); }
  }, [approveMutation, toast]);

  const handleReject = useCallback(async (p: ApiPharmacy) => {
    try {
      await rejectMutation.mutateAsync({ id: p.id });
      setSelected((prev) => prev ? { ...prev, status: "rejected", verified_at: null } : null);
      toast({ title: "Pharmacy rejected." });
    } catch (e) { toast({ title: getErrorMessage(e), variant: "destructive" }); }
  }, [rejectMutation, toast]);

  const handleSuspend = useCallback(async (p: ApiPharmacy) => {
    try {
      await suspendMutation.mutateAsync({ id: p.id });
      setSelected((prev) => prev ? { ...prev, status: "suspended" } : null);
      toast({ title: "Pharmacy suspended." });
    } catch (e) { toast({ title: getErrorMessage(e), variant: "destructive" }); }
  }, [suspendMutation, toast]);

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
      onChange: (v: string) => set("status", v as any)
    },
    ...(cities.length > 0 ? [{
      type: "select" as const,
      key: "city",
      label: "City",
      value: filters.city,
      options: [
        { value: "", label: "All cities" },
        ...cities.map(c => ({ value: c, label: c }))
      ],
      onChange: (v: string) => set("city", v)
    }] : [])
  ], [filters.status, filters.city, cities, set]);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader title={t("pages.admin.overview_title")} subtitle={t("pages.admin.overview_sub")} />

        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2 }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <p className="text-[11px] text-muted-foreground shrink-0">
                {isLoading ? (
                  <span className="text-muted-foreground/50">Loading…</span>
                ) : (
                  <>
                    <span className="font-bold text-foreground">{total}</span>{" "}
                    {total === 1 ? "pharmacy" : "pharmacies"}
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

              {(statusCounts["pending"] ?? 0) > 0 && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[6px] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {statusCounts["pending"]} pending
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, phone, email…"
                  className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              {/* Refresh Button */}
              <button
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </button>

              {/* Sort */}
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as any)}
                  className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
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

          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard label="Total pharmacies" value={total} icon={FlaskConical} accent="primary" />
            <StatCard label="Active" value={statusCounts["active"] ?? 0} icon={CheckCircle2} accent="success" />
            <StatCard label="Pending review" value={statusCounts["pending"] ?? 0} icon={Clock} accent="warning" />
            <StatCard label="Suspended" value={statusCounts["suspended"] ?? 0} icon={XCircle} accent="warning" />
          </div>

          <div className="p-3 sm:p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <p className="text-[12px] font-semibold text-destructive">Failed to load pharmacies</p>
                <p className="text-[11px] text-muted-foreground/70">Check your connection and try again</p>
              </div>
            ) : (
              <PharmacyTable
                pharmacies={sorted} isLoading={isLoading} page={filters.page} totalPages={totalPages}
                onManage={setSelected} onPageChange={(p) => set("page", p)} onClearAll={clearAll}
              />
            )}
          </div>
        </main>
      </div>

      <PharmacyPanel
        pharmacy={selected} onClose={() => setSelected(null)}
        onApprove={handleApprove} onReject={handleReject} onSuspend={handleSuspend}
        isActing={isActing}
      />
    </DashboardLayout>
  );
}

export default ManagePharmacies;
