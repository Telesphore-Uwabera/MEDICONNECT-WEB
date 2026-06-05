import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  Pill,
  Send,
  MapPin,
  FileText,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  LayoutGrid,
  Rows3,
  CalendarRange,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PrescriptionApiStatus,
  useGetPatientPrescriptions,
  type PrescriptionFilters,
  type Prescription,
} from "@/hooks/patient/use-patient-prescriptions";


// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "table" | "cards";

interface FilterState {
  search: string;
  status: PrescriptionApiStatus | "all";
  from: string;
  to: string;
  is_signed: boolean | "all";
  sort: "date-asc" | "date-desc";
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  from: "",
  to: "",
  is_signed: "all",
  sort: "date-desc",
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  issued: "bg-primary/10 text-primary border-primary/20",
  sent_to_pharmacy:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  dispensed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  expired:
    "bg-muted text-muted-foreground border-border",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
};

const STATUS_DOT: Record<string, string> = {
  issued: "bg-primary",
  sent_to_pharmacy: "bg-violet-500",
  dispensed: "bg-emerald-500",
  cancelled: "bg-red-500",
  expired: "bg-muted-foreground",
  pending: "bg-amber-500",
};

const STATUS_LABEL: Record<string, string> = {
  issued: "Issued",
  sent_to_pharmacy: "Sent to Pharmacy",
  dispensed: "Dispensed",
  cancelled: "Cancelled",
  expired: "Expired",
  pending: "Pending",
};

const ALL_STATUSES: PrescriptionApiStatus[] = [
  "issued",
  "sent_to_pharmacy",
  "pending",
  "dispensed",
  "expired",
  "cancelled",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpiringSoon(validUntil: string): boolean {
  const diff = new Date(validUntil).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // within 3 days
}

// ─── Filter sidebar atoms ─────────────────────────────────────────────────────

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

function PillGroup<T extends string | boolean>({
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
          key={String(o.value)}
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

function DateRangeInput({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <label className="text-[10px] text-muted-foreground/70 mb-1 block">
          From
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="w-full px-2 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
        />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground/70 mb-1 block">
          To
        </label>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onTo(e.target.value)}
          className="w-full px-2 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
        />
      </div>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function PrescriptionCard({
  p,
  onAction,
}: {
  p: Prescription;
  onAction: (p: Prescription, action: "pdf" | "send") => void;
}) {
  const expiring = isExpiringSoon(p.valid_until);

  return (
    <div
      className={cn(
        "bg-card border rounded-sm p-4 hover:border-primary/30 transition-colors duration-150",
        expiring ? "border-amber-300 dark:border-amber-800" : "border-border/70",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate">
              {p.doctor.user.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {p.doctor.specialization} · {formatDate(p.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-[9px] px-1.5 py-0 gap-1",
              STATUS_STYLES[p.status] ?? "bg-muted text-muted-foreground border-border",
            )}
          >
            <span
              className={cn(
                "w-1 h-1 rounded-full",
                STATUS_DOT[p.status] ?? "bg-muted-foreground",
              )}
            />
            {STATUS_LABEL[p.status] ?? p.status}
          </Badge>
          {p.is_signed && (
            <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Signed
            </span>
          )}
        </div>
      </div>

      {/* Diagnosis */}
      {p.diagnosis && (
        <div className="mt-2 px-2.5 py-1.5 rounded-sm bg-secondary/20 border border-border/30">
          <p className="text-[10px] text-muted-foreground/70">Diagnosis</p>
          <p className="text-[11px] font-medium text-foreground">{p.diagnosis}</p>
        </div>
      )}

      {/* Medications */}
      <div className="mt-2.5 space-y-1">
        {p.items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-2.5 py-1.5 rounded-sm bg-secondary/30 border border-border/30"
          >
            <Pill className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <div className="text-[11px]">
              <span className="font-medium text-foreground">{item.medicine_name}</span>
              <span className="text-muted-foreground/70"> · {item.dosage}</span>
              <p className="text-muted-foreground/60 mt-0.5 text-[10px]">
                {item.frequency} · {item.duration}
                {item.quantity ? ` · Qty: ${item.quantity}` : ""}
              </p>
              {item.instructions && (
                <p className="text-muted-foreground/50 mt-0.5 text-[10px] italic">
                  {item.instructions}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Valid until + Rx number */}
      <div className="mt-2.5 flex items-center justify-between flex-wrap gap-1.5">
        <span
          className={cn(
            "text-[10px] flex items-center gap-1",
            expiring ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground/70",
          )}
        >
          <CalendarRange className="h-3 w-3" />
          Valid until {formatDate(p.valid_until)}
          {expiring && " · Expiring soon"}
        </span>
        <span className="text-[9px] text-muted-foreground/50 font-mono">
          {p.prescription_number}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-2.5 flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onAction(p, "pdf")}
        >
          <Download className="h-3 w-3 mr-1" />
          PDF
        </Button>
        {p.status === "issued" && (
          <Button
            size="sm"
            className="h-7 px-2.5 text-[10px] flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
            onClick={() => onAction(p, "send")}
          >
            <Send className="h-3 w-3 mr-1" />
            Send to Pharmacy
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-t border-border/40">
      {[180, 200, 80, 120, 70, 100].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-3 rounded bg-muted animate-pulse"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border/50 rounded-sm p-4 space-y-3">
      <div className="flex gap-2.5">
        <div className="w-8 h-8 rounded-sm bg-muted animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          <div className="h-2.5 w-48 bg-muted/60 rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-8 bg-muted/50 rounded animate-pulse" />
        <div className="h-8 bg-muted/50 rounded animate-pulse" />
      </div>
      <div className="h-7 w-24 bg-muted rounded animate-pulse" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PatientPrescriptions = () => {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);

  // Convert local filter state → API filter params
  const apiFilters = useMemo<PrescriptionFilters>(
    () => ({
      search: filters.search || undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      is_signed: filters.is_signed !== "all" ? filters.is_signed : undefined,
    }),
    [filters],
  );

  const { data, isLoading, isError, refetch, isFetching } =
    useGetPatientPrescriptions(apiFilters);

  const prescriptions = useMemo(() => {
    const list = data?.prescriptions ?? [];
    // Client-side sort (the API may not support it)
    return [...list].sort((a, b) => {
      if (filters.sort === "date-asc")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [data, filters.sort]);

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
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  // Stats
  const issuedCount = prescriptions.filter((p) => p.status === "issued").length;
  const sentToPharmacyCount = prescriptions.filter((p) => p.status === "sent_to_pharmacy").length;
  const pendingCount = prescriptions.filter((p) => p.status === "pending").length;
  const dispensedCount = prescriptions.filter((p) => p.status === "dispensed").length;
  const cancelledCount = prescriptions.filter((p) => p.status === "cancelled").length;
  const expiringSoonCount = prescriptions.filter((p) => isExpiringSoon(p.valid_until)).length;

  const handleAction = useCallback((p: Prescription, action: "pdf" | "send") => {
    if (action === "pdf" && p.pdf_url) {
      window.open(p.pdf_url, "_blank");
    }
    // "send" — plug into modal/router
  }, []);

  // ─── Sidebar content ─────────────────────────────────────────────────────────

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
        {/* Status */}
        <FilterSection title="Status">
          <PillGroup<PrescriptionApiStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all", label: "All statuses" },
              ...ALL_STATUSES.map((s) => ({
                value: s,
                label: STATUS_LABEL[s] ?? s,
              })),
            ]}
          />
        </FilterSection>

        {/* Signature */}
        <FilterSection title="Signature">
          <PillGroup<boolean | "all">
            value={filters.is_signed}
            onChange={(v) => set("is_signed", v)}
            options={[
              { value: "all", label: "All" },
              { value: true, label: "Signed" },
              { value: false, label: "Unsigned" },
            ]}
          />
        </FilterSection>

        {/* Date range */}
        <FilterSection title="Date range">
          <DateRangeInput
            from={filters.from}
            to={filters.to}
            onFrom={(v) => set("from", v)}
            onTo={(v) => set("to", v)}
          />
        </FilterSection>

        {/* Sort */}
        <FilterSection title="Sort">
          <PillGroup<"date-asc" | "date-desc">
            value={filters.sort}
            onChange={(v) => set("sort", v)}
            options={[
              { value: "date-desc", label: "Latest first" },
              { value: "date-asc", label: "Oldest first" },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.prescriptions_title", { defaultValue: "My Prescriptions" })}
          subtitle={t("pages.patient.prescriptions_sub", {
            defaultValue: "View and manage your prescriptions",
          })}
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

          {/* Mobile drawer */}
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

          {/* ── Main results area ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats strip */}
            <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Issued" value={issuedCount} icon={FileText} accent="primary" />
              <StatCard label="At Pharmacy" value={sentToPharmacyCount} icon={MapPin} accent="warning" />
              <StatCard label="Dispensed" value={dispensedCount} icon={Send} accent="success" />
              <StatCard label="Cancelled" value={cancelledCount} icon={X} accent="primary" />
            </div>

            {/* Expiring-soon banner */}
            {expiringSoonCount > 0 && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-sm bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 flex items-center gap-2">
                <CalendarRange className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {expiringSoonCount} prescription{expiringSoonCount > 1 ? "s" : ""} expiring within 3 days — collect soon.
                </p>
              </div>
            )}

            {/* Meta / toolbar */}
            <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  {isLoading ? (
                    <span className="text-muted-foreground/50">Loading…</span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{prescriptions.length}</span>{" "}
                      {prescriptions.length === 1 ? "prescription" : "prescriptions"}
                    </>
                  )}
                  {hasActiveFilters && !isLoading && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset filters
                    </button>
                  )}
                </p>

                {/* Refetch indicator */}
                {isFetching && !isLoading && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Refreshing
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search diagnosis, doctor…"
                    className="w-52 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Sort selector */}
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) =>
                      set("sort", e.target.value as FilterState["sort"])
                    }
                    className="appearance-none pl-2.5 pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                  >
                    <option value="date-desc">Latest first</option>
                    <option value="date-asc">Oldest first</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/* View toggle */}
                <div className="flex rounded-sm border border-border/60 overflow-hidden bg-card">
                  <button
                    onClick={() => setView("table")}
                    aria-label="Table view"
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      view === "table"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Rows3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setView("cards")}
                    aria-label="Card view"
                    className={cn(
                      "px-2 py-1.5 border-l border-border/60 transition-colors",
                      view === "cards"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Mobile filters button */}
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

            {/* ── Content ── */}
            <div className="p-4">
              {/* Error state */}
              {isError && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      Failed to load prescriptions
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Please check your connection and try again.
                    </p>
                  </div>
                  <button
                    onClick={() => refetch()}
                    className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors mt-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              )}

              {/* Loading skeleton */}
              {isLoading && !isError && (
                view === "table" ? (
                  <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-[11px]">
                      <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                        <tr>
                          {["Doctor", "Medications", "Issued", "Valid Until", "Status", ""].map(
                            (h) => (
                              <th key={h} className="text-left px-4 py-3 font-semibold">
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <SkeletonRow key={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                )
              )}

              {/* Empty state */}
              {!isLoading && !isError && prescriptions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Pill className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      {hasActiveFilters
                        ? "No prescriptions match your filters"
                        : "No prescriptions yet"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {hasActiveFilters
                        ? "Try widening your search criteria"
                        : "Prescriptions issued by your doctor will appear here"}
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* Table view */}
              {!isLoading && !isError && prescriptions.length > 0 && view === "table" && (
                <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Doctor</th>
                        <th className="text-left px-4 py-3 font-semibold">Medications</th>
                        <th className="text-left px-4 py-3 font-semibold">Issued</th>
                        <th className="text-left px-4 py-3 font-semibold">Valid Until</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((p) => {
                        const expiring = isExpiringSoon(p.valid_until);
                        return (
                          <tr
                            key={p.id}
                            className={cn(
                              "border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150",
                              expiring && "bg-amber-50/30 dark:bg-amber-950/10",
                            )}
                          >
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[11px] text-foreground">
                                {p.doctor.user.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70">
                                {p.doctor.specialization}
                              </p>
                              {p.is_signed && (
                                <span className="flex items-center gap-0.5 mt-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Signed
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                {p.items.map((item) => (
                                  <span
                                    key={item.id}
                                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80"
                                  >
                                    <Pill className="h-2.5 w-2.5 text-primary shrink-0" />
                                    {item.medicine_name}
                                    <span className="text-muted-foreground/50">
                                      · {item.dosage}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground/80 text-[10px]">
                              {formatDate(p.created_at)}
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={cn(
                                  "text-[10px]",
                                  expiring
                                    ? "text-amber-600 dark:text-amber-400 font-medium"
                                    : "text-muted-foreground/80",
                                )}
                              >
                                {formatDate(p.valid_until)}
                                {expiring && (
                                  <span className="ml-1 text-[9px]">⚠ soon</span>
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1.5 py-0 gap-1",
                                  STATUS_STYLES[p.status] ??
                                    "bg-muted text-muted-foreground border-border",
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1 h-1 rounded-full",
                                    STATUS_DOT[p.status] ?? "bg-muted-foreground",
                                  )}
                                />
                                {STATUS_LABEL[p.status] ?? p.status}
                              </Badge>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
                                  onClick={() => handleAction(p, "pdf")}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  PDF
                                </Button>
                                {p.status === "issued" && (
                                  <Button
                                    size="sm"
                                    className="h-7 px-2.5 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
                                    onClick={() => handleAction(p, "send")}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    Send
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Card view */}
              {!isLoading && !isError && prescriptions.length > 0 && view === "cards" && (
                <div className="grid md:grid-cols-2 gap-3">
                  {prescriptions.map((p) => (
                    <PrescriptionCard key={p.id} p={p} onAction={handleAction} />
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

export default PatientPrescriptions;
