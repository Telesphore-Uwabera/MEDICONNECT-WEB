import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import {
  SlidersHorizontal, X, Search, ChevronDown,
  ChevronLeft, ChevronRight, Users, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS, type StatusFilter } from "./components/patients/Types";
import { FilterSection, PillGroup, PatientRow, PatientCard, SkeletonRows } from "./components/patients/Components";
import { PatientPanel } from "./components/patients/PatientPanel";
import { useManagePatients } from "./components/patients/use-manage-patients";

export default function ManagePatients() {
  const { t } = useTranslation();
  const {
    filters, sorted, selected, setSelected,
    filterOpen, setFilterOpen,
    searchInput, setSearchInput,
    total, totalPages, statusCounts, isActing,
    hasActiveFilters, pendingCount,
    isLoading, isError,
    set, clearAll, toggleStatus,
  } = useManagePatients();

  // ── Sidebar content (shared: desktop sidebar + mobile/tablet bottom-sheet) ──
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
            <X className="w-3 h-3" /> Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<StatusFilter>
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all",       label: t("admin.users.all"),        count: total },
              { value: "active",    label: t("admin.status.active"),    count: statusCounts["active"]    ?? 0 },
              { value: "pending",   label: t("admin.status.pending"),   count: statusCounts["pending"]   ?? 0 },
              { value: "suspended", label: t("admin.status.suspended"), count: statusCounts["suspended"] ?? 0 },
              { value: "rejected",  label: t("admin.status.rejected"),  count: statusCounts["rejected"]  ?? 0 },
            ]}
          />
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
          {/*
           * Desktop sidebar — only at lg+ (1024px+).
           * Tablets (md, 768–1023px) use the bottom-sheet instead.
           */}
          <aside className="hidden lg:flex lg:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/*
           * Filter backdrop — phone AND tablet (hidden at lg+).
           */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300",
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          />

          {/*
           * Bottom-sheet — phone AND tablet (hidden at lg+).
           */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
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

            {/*
             * Stat cards:
             *   phone  → 2 columns
             *   tablet (md+) → 4 columns
             */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatCard label="Total patients"  value={total}                          icon={Users}        accent="primary" />
              <StatCard label="Active"          value={statusCounts["active"]    ?? 0} icon={CheckCircle2} accent="success" />
              <StatCard label="Pending review"  value={statusCounts["pending"]   ?? 0} icon={Clock}        accent="warning" />
              <StatCard label="Suspended"       value={statusCounts["suspended"] ?? 0} icon={XCircle}      accent="warning" />
            </div>

            {/* Phone-only search (below stat cards) */}
            <div className="sm:hidden px-3 pt-3">
              <SearchInput value={searchInput} onChange={setSearchInput} />
            </div>

            {/* Sticky meta bar */}
            <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <p className="text-[11px] text-muted-foreground shrink-0">
                  {isLoading ? (
                    <span className="text-muted-foreground/50">Loading…</span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{total}</span>{" "}
                      {total === 1 ? "patient" : "patients"}
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

                {/*
                 * Pending badge — visible at md+ to avoid cramping phone meta bar.
                 */}
                {pendingCount > 0 && (
                  <span className="hidden md:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingCount} pending
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/*
                 * Search input in meta bar — visible at sm+ (tablet + desktop).
                 * Phone uses the dedicated block above instead.
                 * Wider at md+ now that the sidebar isn't eating into the width.
                 */}
                <div className="relative hidden sm:block">
                  <SearchInput
                    value={searchInput}
                    onChange={setSearchInput}
                    className="w-44 md:w-60"
                  />
                </div>

                {/* Sort select */}
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => set("sort", e.target.value as typeof filters.sort)}
                    className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/*
                 * Filter button — phone AND tablet (hidden at lg+ where
                 * the sidebar takes over).
                 */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "lg:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm border text-[11px] transition-colors",
                    hasActiveFilters
                      ? "bg-primary text-white border-primary"
                      : "border-border/60 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Filters</span>
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              {isError ? (
                <EmptyState
                  icon={<Users className="w-6 h-6 text-muted-foreground/50" />}
                  title="Failed to load patients"
                  subtitle="Check your connection and try again"
                />
              ) : !isLoading && sorted.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-6 h-6 text-muted-foreground/50" />}
                  title="No patients match your filters"
                  subtitle="Try widening your search criteria"
                  action={
                    <button
                      onClick={clearAll}
                      className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                    >
                      Clear all filters
                    </button>
                  }
                />
              ) : (
                <>
                  {/*
                   * Desktop table — only at lg+ (1024px+).
                   * Tablets get the 2-column card grid below.
                   */}
                  <div className="hidden lg:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-[11px]">
                      <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">{t("admin.users.name")}</th>
                          <th className="text-left px-4 py-3 font-semibold">{t("admin.users.contact")}</th>
                          <th className="text-left px-4 py-3 font-semibold">Date of birth</th>
                          <th className="text-left px-4 py-3 font-semibold">{t("admin.users.status")}</th>
                          <th className="text-left px-4 py-3 font-semibold">{t("admin.users.joined")}</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading
                          ? <SkeletonRows />
                          : sorted.map((p) => (
                              <PatientRow key={p.id} p={p} onManage={setSelected} />
                            ))}
                      </tbody>
                    </table>
                  </div>

                  {/*
                   * Card layout — phone AND tablet (hidden at lg+).
                   * Single column on phone, 2-column grid on tablet (sm:grid-cols-2)
                   * for better use of the wider screen.
                   */}
                  <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-24 rounded-sm border border-border/60 bg-card animate-pulse"
                          />
                        ))
                      : sorted.map((p) => (
                          <PatientCard key={p.id} p={p} onManage={setSelected} />
                        ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                      <p className="text-[11px] text-muted-foreground">
                        Page{" "}
                        <span className="font-semibold text-foreground">{filters.page}</span>{" "}
                        of{" "}
                        <span className="font-semibold text-foreground">{totalPages}</span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        <PaginationButton
                          disabled={filters.page <= 1}
                          onClick={() => set("page", filters.page - 1)}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </PaginationButton>
                        <PaginationButton
                          disabled={filters.page >= totalPages}
                          onClick={() => set("page", filters.page + 1)}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </PaginationButton>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <PatientPanel
        patient={selected}
        onClose={() => setSelected(null)}
        onToggleStatus={toggleStatus}
        isActing={isActing}
      />
    </DashboardLayout>
  );
}

// ─── Tiny local helpers ───────────────────────────────────────────────────────

function SearchInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name, email, phone…"
        className={cn(
          "pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all w-full",
          className,
        )}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function PaginationButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
      <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
        {icon}
      </div>
      <div>
        <p className="text-[12px] font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
