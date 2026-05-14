import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { pharmacyOrders } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Package, CheckCircle2, Truck, SlidersHorizontal, X, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus = "incoming" | "processing" | "ready" | "delivered";
type SortOption =
  | "time-desc"
  | "time-asc"
  | "total-desc"
  | "total-asc"
  | "patient";

const STATUS_STYLES: Record<OrderStatus, string> = {
  incoming: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  processing: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  ready: "bg-primary/10 text-primary border-primary/20",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
};

const STATUS_DOT: Record<OrderStatus, string> = {
  incoming: "bg-amber-500",
  processing: "bg-sky-500",
  ready: "bg-primary",
  delivered: "bg-emerald-500",
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "time-desc", label: "Time: Newest first" },
  { value: "time-asc", label: "Time: Oldest first" },
  { value: "total-desc", label: "Total: High to low" },
  { value: "total-asc", label: "Total: Low to high" },
  { value: "patient", label: "Patient (A–Z)" },
];

interface FilterState {
  search: string;
  status: OrderStatus | "All";
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "All",
  sort: "time-desc",
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

// ─── Page ─────────────────────────────────────────────────────────────────────

const PharmacyOrders = () => {
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
    return pharmacyOrders
      .filter((o) => {
        if (filters.status !== "All" && o.status !== filters.status)
          return false;
        if (
          q &&
          !o.patient.toLowerCase().includes(q) &&
          !o.doctor.toLowerCase().includes(q) &&
          !o.id.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "time-asc":
            return a.time.localeCompare(b.time);
          case "total-desc":
            return b.total - a.total;
          case "total-asc":
            return a.total - b.total;
          case "patient":
            return a.patient.localeCompare(b.patient);
          default:
            return b.time.localeCompare(a.time);
        }
      });
  }, [filters]);

  const incomingCount = pharmacyOrders.filter((o) => o.status === "incoming").length;
  const processingCount = pharmacyOrders.filter((o) => o.status === "processing").length;
  const readyCount = pharmacyOrders.filter((o) => o.status === "ready").length;
  const deliveredCount = pharmacyOrders.filter((o) => o.status === "delivered").length;

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
        <FilterSection title="Status">
          <PillGroup<OrderStatus | "All">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "All", label: "All statuses" },
              { value: "incoming", label: t("pages.pharmacy.stat_incoming") },
              { value: "processing", label: t("pages.pharmacy.stat_processing") },
              { value: "ready", label: t("pages.pharmacy.stat_ready") },
              { value: "delivered", label: t("pages.pharmacy.stat_delivered") },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.orders_title")}
          subtitle={t("pages.pharmacy.orders_sub")}
        />

        {/* ── Body: sidebar + results ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left Sidebar ── */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats strip */}
            <div className="px-4 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard
                label={t("pages.pharmacy.stat_incoming")}
                value={incomingCount}
                icon={ClipboardList}
                accent="warning"
              />
              <StatCard
                label={t("pages.pharmacy.stat_processing")}
                value={processingCount}
                icon={Package}
                accent="info"
              />
              <StatCard
                label={t("pages.pharmacy.stat_ready")}
                value={readyCount}
                icon={CheckCircle2}
                accent="primary"
              />
              <StatCard
                label={t("pages.pharmacy.stat_delivered")}
                value={deliveredCount}
                icon={Truck}
                accent="success"
              />
            </div>

            {/* Meta bar */}
            <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{filtered.length}</span>{" "}
                  {filtered.length === 1 ? "order" : "orders"}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset filters
                    </button>
                  )}
                </p>

                <div className="hidden lg:flex items-center gap-2">
                  {incomingCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {incomingCount} incoming
                    </span>
                  )}
                  {processingCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      {processingCount} processing
                    </span>
                  )}
                  {readyCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {readyCount} ready
                    </span>
                  )}
                  {deliveredCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {deliveredCount} delivered
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search patient, doctor, order ID…"
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
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="p-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <ClipboardList className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      No orders match your filters
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
                <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_order")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_patient")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_doctor")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_items")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_total")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_status")}
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((o) => (
                        <tr
                          key={o.id}
                          className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150"
                        >
                          <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground/70">
                            #{o.id.toUpperCase()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[11px] text-foreground">
                            {o.patient}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground/80">
                            {o.doctor}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-foreground">
                            {o.items}
                          </td>
                          <td className="px-4 py-3 font-bold tabular-nums text-[12px] text-foreground">
                            ${o.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border text-[9px] px-1.5 py-0 font-medium capitalize",
                                STATUS_STYLES[o.status],
                              )}
                            >
                              <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[o.status])} />
                              {o.status} · {o.time}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {o.status === "incoming" && (
                              <Button
                                size="sm"
                                className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
                              >
                                {t("pages.pharmacy.approve")}
                              </Button>
                            )}
                            {o.status === "processing" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
                              >
                                {t("pages.pharmacy.mark_ready")}
                              </Button>
                            )}
                            {o.status === "ready" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
                              >
                                {t("pages.pharmacy.dispatch")}
                              </Button>
                            )}
                            {o.status === "delivered" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-3 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-all duration-200"
                              >
                                {t("pages.pharmacy.receipt")}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyOrders;
