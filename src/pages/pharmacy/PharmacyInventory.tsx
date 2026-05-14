import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { medicines } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Package, Search, ChevronDown, SlidersHorizontal, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ─────────────────────────────────────────────────────────────────────

type StockStatus = "in-stock" | "low" | "out";
type SortOption =
  | "name"
  | "stock-asc"
  | "stock-desc"
  | "price-asc"
  | "price-desc";

const stockStyle: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  low: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  out: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "stock-desc", label: "Stock: Most first" },
  { value: "stock-asc", label: "Stock: Least first" },
  { value: "price-asc", label: "Price: Low to high" },
  { value: "price-desc", label: "Price: High to low" },
];

const ALL_CATEGORIES = [
  "All",
  ...Array.from(new Set(medicines.map((m) => m.category))).sort(),
];

interface FilterState {
  search: string;
  status: StockStatus | "All";
  category: string;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "All",
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

// ─── Page ─────────────────────────────────────────────────────────────────────

const PharmacyInventory = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
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
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return medicines
      .filter((m) => {
        if (filters.status !== "All" && m.status !== filters.status)
          return false;
        if (filters.category !== "All" && m.category !== filters.category)
          return false;
        if (
          q &&
          !m.name.toLowerCase().includes(q) &&
          !m.category.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "stock-asc":
            return a.stock - b.stock;
          case "stock-desc":
            return b.stock - a.stock;
          case "price-asc":
            return a.price - b.price;
          case "price-desc":
            return b.price - a.price;
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [filters]);

  const inStockCount = medicines.filter((m) => m.status === "in-stock").length;
  const lowCount = medicines.filter((m) => m.status === "low").length;
  const outCount = medicines.filter((m) => m.status === "out").length;
  const totalValue = medicines.reduce((sum, m) => sum + m.price * m.stock, 0);

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
        <FilterSection title="Stock Status">
          <PillGroup<StockStatus | "All">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "All", label: "All statuses" },
              { value: "in-stock", label: "In stock" },
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
            ]}
          />
        </FilterSection>

        <FilterSection title="Category">
          <PillGroup<string>
            value={filters.category}
            onChange={(v) => set("category", v)}
            options={ALL_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.inventory_title")}
          subtitle={t("pages.pharmacy.inventory_sub", { count: medicines.length })}
        />

        {/* ── Body: sidebar + results ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile overlay: backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile overlay: bottom-sheet drawer */}
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

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats strip */}
           <div className="px-4 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
  <StatCard
    label="Total Items"
    value={medicines.length}
    icon={Package}
    accent="primary"
  />
  <StatCard
    label="In Stock"
    value={inStockCount}
    icon={CheckCircle2}
    accent="success"
  />
  <StatCard
    label="Low Stock"
    value={lowCount}
    icon={AlertTriangle}
    accent="warning"
  />
  <StatCard
    label="Out of Stock"
    value={outCount}
    icon={X}
    accent="warning"  // ← fixed
  />
</div>

            {/* Meta bar */}
            <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{filtered.length}</span>{" "}
                  {filtered.length === 1 ? "item" : "items"}
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
                  {outCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {outCount} out of stock
                    </span>
                  )}
                  {lowCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {lowCount} low stock
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
                    placeholder="Search medicine or category…"
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

                {/* Add Stock button - desktop only */}
                <Button 
                  size="sm" 
                  className="hidden sm:flex h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t("pages.pharmacy.add_stock")}
                </Button>

                {/* Filters button — mobile only */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[11px] transition-colors",
                    hasActiveFilters
                      ? "bg-primary text-white border-primary"
                      : "border-border/60 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="p-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Package className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      No medicines match your filters
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
                          {t("pages.pharmacy.th_medicine")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_category")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_stock")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_price")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((m) => (
                        <tr
                          key={m.id}
                          className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150"
                        >
                          <td className="px-4 py-3 font-semibold text-[11px] text-foreground">
                            {m.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground/80">
                            {m.category}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 font-mono tabular-nums font-medium",
                              m.status === "out"
                                ? "text-red-600"
                                : m.status === "low"
                                  ? "text-amber-600"
                                  : "text-foreground",
                            )}
                          >
                            {m.stock}
                          </td>
                          <td className="px-4 py-3 font-bold tabular-nums text-[12px] text-foreground">
                            ${m.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border text-[9px] px-1.5 py-0 font-medium capitalize",
                                stockStyle[m.status],
                              )}
                            >
                              <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[m.status])} />
                              {m.status.replace("-", " ")}
                            </Badge>
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

export default PharmacyInventory;
