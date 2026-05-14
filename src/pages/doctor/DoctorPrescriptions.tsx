import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pill,
  Send,
  User,
  Mail,
  Smartphone,
  Building2,
  FileText,
  SlidersHorizontal,
  Search,
  X,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { PrescriptionWizard } from "@/components/PrescriptionWizard";
import {
  usePrescriptions,
  type RxStatus,
  type DeliveryChannel,
  type Prescription,
} from "@/lib/prescription-store";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "table" | "cards";
type SortOption = "date-desc" | "date-asc" | "patient";

interface FilterState {
  search: string;
  status: RxStatus | "All";
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "All",
  sort: "date-desc",
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "date-desc", label: "Date: Latest first" },
  { value: "date-asc", label: "Date: Oldest first" },
  { value: "patient", label: "Patient (A–Z)" },
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Partial<Record<RxStatus, string>> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
  "sent-to-patient": "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  "sent-to-pharmacy": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  filled: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Partial<Record<RxStatus, string>> = {
  draft: "bg-slate-400",
  "sent-to-patient": "bg-sky-500",
  "sent-to-pharmacy": "bg-amber-500",
  filled: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const channelIcon: Record<DeliveryChannel, React.ElementType> = {
  app: User,
  email: Mail,
  sms: Smartphone,
};

// ─── Sidebar atoms ────────────────────────────────────────────────────────────

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

// ─── Card view item ───────────────────────────────────────────────────────────

function PrescriptionCard({
  p,
  statusLabel,
  onAction,
}: {
  p: Prescription;
  statusLabel: Record<string, string>;
  onAction: (p: Prescription) => void;
}) {
  return (
    <div className="bg-card border border-border/70 rounded-sm p-3.5 hover:border-primary/30 hover:shadow-sm transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate">
              {p.patientName}
            </p>
            <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {p.date}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[9px] px-1.5 py-0 font-medium border",
            STATUS_STYLES[p.status] ?? "bg-secondary/50 text-muted-foreground border-border/60",
          )}
        >
          <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[p.status] ?? "bg-muted-foreground/40")} />
          {statusLabel[p.status] ?? p.status}
        </Badge>
      </div>

      {/* Medications */}
      <div className="mt-2.5 space-y-1">
        {p.medications.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-secondary/40 border border-border/30"
          >
            <Pill className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[10px] font-medium text-foreground">
              {m.name}
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              · {m.dosage} · {m.frequency}
            </span>
          </div>
        ))}
      </div>

      {/* Pharmacy + channels */}
      <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
        {p.pharmacyName ? (
          <span className="text-[10px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Send className="h-3 w-3" />
            {p.pharmacyName}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          {p.channels.map((c) => {
            const I = channelIcon[c];
            return (
              <span
                key={c}
                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-sm bg-secondary/60 border border-border/40 text-muted-foreground/80"
              >
                <I className="h-2.5 w-2.5" />
                {c}
              </span>
            );
          })}
        </div>
      </div>

      {/* Action */}
      <div className="mt-2.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-3 text-[10px] w-full rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
          onClick={() => onAction(p)}
        >
          View Details
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DoctorPrescriptions = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const allList = usePrescriptions().filter((p) => p.issuer === "doctor");

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

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  const localStatusLabel: Record<string, string> = {
    draft: t("pages.doctor.rx_status_draft"),
    "sent-to-patient": t("pages.doctor.rx_status_sent_patient"),
    "sent-to-pharmacy": t("pages.doctor.rx_status_sent_pharmacy"),
    filled: t("pages.doctor.rx_status_filled"),
    cancelled: t("pages.doctor.rx_status_cancelled"),
    active: "Active",
    pending: "Pending",
    dispensed: "Dispensed",
    expired: "Expired",
    completed: "Completed",
    rejected: "Rejected",
    returned: "Returned",
  };

  const availableStatuses = useMemo(() => {
    return Array.from(new Set(allList.map((p) => p.status)));
  }, [allList]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return allList
      .filter((p) => {
        if (filters.status !== "All" && p.status !== filters.status)
          return false;
        if (q && !p.patientName.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "date-asc":
            return a.createdAt - b.createdAt;
          case "patient":
            return a.patientName.localeCompare(b.patientName);
          default:
            return b.createdAt - a.createdAt;
        }
      });
  }, [filters, allList]);

  const pendingCount = filtered.filter(
    (p) => p.status === "draft" || p.status === "sent-to-patient",
  ).length;

  const filledCount = filtered.filter((p) => p.status === "filled").length;
  const cancelledCount = filtered.filter((p) => p.status === "cancelled").length;

  const handleAction = useCallback((_p: Prescription) => {
    // plug into router / modal here
  }, []);

  // ─── Sidebar content ───────

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
        <FilterSection title="Status">
          <PillGroup<RxStatus | "All">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "All", label: "All statuses" },
              ...availableStatuses.map((s) => ({
                value: s,
                label: localStatusLabel[s] ?? s,
              })),
            ]}
          />
        </FilterSection>

        <FilterSection title="Sort by">
          <PillGroup<SortOption>
            value={filters.sort}
            onChange={(v) => set("sort", v)}
            options={SORT_OPTIONS}
          />
        </FilterSection>

        <FilterSection title="Patient">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
              placeholder="Search patient…"
              className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
            />
          </div>
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub")}
        />

        {/* ── Body: sidebar + results ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
          {sidebarContent}
        </aside>

        {/* Mobile backdrop */}
        <div
          onClick={() => setFilterOpen(false)}
          className={cn(
            "fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300 backdrop-blur-sm",
            filterOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
        />

        {/* Mobile bottom drawer */}
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 md:hidden",
            "bg-card rounded-t-lg border-t border-border/60",
            "max-h-[85dvh] flex flex-col overflow-hidden",
            "transition-transform duration-300 ease-out shadow-2xl",
            filterOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="flex justify-center pt-3 pb-1.5 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <div className="overflow-y-auto flex-1">{sidebarContent}</div>
          <div className="flex-shrink-0 px-4 py-3 border-t border-border/60 bg-card">
            <button
              onClick={() => setFilterOpen(false)}
              className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-all duration-200 shadow-sm hover:shadow"
            >
              Show {filtered.length}{" "}
              {filtered.length === 1 ? "prescription" : "prescriptions"}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        <main className="flex-1 overflow-y-auto">
          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "prescription" : "prescriptions"}
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
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                    {pendingCount} pending
                  </span>
                )}
                {filledCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {filledCount} filled
                  </span>
                )}
                {cancelledCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {cancelledCount} cancelled
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Filters button — mobile only */}
              <button
                onClick={() => setFilterOpen(true)}
                className={cn(
                  "md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-all duration-200 font-medium",
                  hasActiveFilters
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "border-border/60 text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground",
                )}
              >
                <SlidersHorizontal className="w-3 h-3" />
                Filters
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground ml-0.5" />
                )}
              </button>

              {/* View toggle */}
              <div className="flex rounded-sm border border-border/60 overflow-hidden bg-card shadow-sm">
                <button
                  onClick={() => setView("table")}
                  aria-label="Table view"
                  className={cn(
                    "px-2.5 py-1.5 transition-all duration-200",
                    view === "table"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
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
                    "px-2.5 py-1.5 border-l border-border/60 transition-all duration-200",
                    view === "cards"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
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

              {/* New prescription CTA */}
              <Button
                size="sm"
                className="h-7 px-3 text-[10px] font-semibold rounded-sm bg-primary hover:bg-primary/90 shadow-sm hover:shadow transition-all duration-200"
                onClick={() => setOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">
                  {t("pages.doctor.new_rx")}
                </span>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                  <Pill className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    No prescriptions match your filters
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
            ) : view === "table" ? (
              <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                <table className="w-full text-[11px]">
                  <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">
                        Patient
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Medications
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Issued
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Delivery
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10">
                              {p.patientName?.slice(0, 2).toUpperCase() || "PT"}
                            </div>
                            <div>
                              <p className="font-semibold text-[11px] text-foreground">
                                {p.patientName}
                              </p>
                              {p.pharmacyName && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                  <Send className="h-3 w-3" />
                                  {p.pharmacyName}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {p.medications.map((m, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/80"
                              >
                                <Pill className="h-3 w-3 text-primary shrink-0" />
                                <span className="font-medium text-foreground">{m.name}</span>
                                <span className="text-muted-foreground/50">
                                  · {m.dosage}
                                </span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground/80">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground/40" />
                            {p.date}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {p.channels.map((c) => {
                              const I = channelIcon[c];
                              return (
                                <span
                                  key={c}
                                  className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-sm bg-secondary/60 border border-border/40 text-muted-foreground/80"
                                >
                                  <I className="h-2.5 w-2.5" />
                                  {c}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "border text-[9px] px-1.5 py-0 font-medium",
                              STATUS_STYLES[p.status] ?? "bg-secondary/50 text-muted-foreground border-border/60",
                            )}
                          >
                            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[p.status] ?? "bg-muted-foreground/40")} />
                            {localStatusLabel[p.status] ?? p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(p)}
                            className="h-7 px-2.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-all duration-200"
                          >
                            Details
                            <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-2">
                {filtered.map((p) => (
                  <PrescriptionCard
                    key={p.id}
                    p={p}
                    statusLabel={localStatusLabel}
                    onAction={handleAction}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <PrescriptionWizard
        open={open}
        onOpenChange={setOpen}
        doctorName="Dr. Elena Vance"
        issuer="doctor"
      />
      </div>
    </DashboardLayout>
  );
};

export default DoctorPrescriptions;

export { STATUS_STYLES as statusStyle, channelIcon };
export const HospitalIcon = Building2;
