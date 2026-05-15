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
  User,
  Mail,
  Smartphone,
  FileText,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePrescriptions,
  type RxStatus,
  type Prescription,
} from "@/lib/prescription-store";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "table" | "cards";
type SortOption = "date-asc" | "date-desc" | "doctor";

interface FilterState {
  search: string;
  status: RxStatus | "All";
  issuer: "All" | "doctor" | "hospital";
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "All",
  issuer: "All",
  sort: "date-desc",
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "date-desc", label: "Date: Latest first" },
  { value: "date-asc", label: "Date: Oldest first" },
  { value: "doctor", label: "Doctor (A–Z)" },
];

const STATUS_STYLES: Record<RxStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  "sent-to-patient": "bg-primary/10 text-primary border-primary/20",
  "sent-to-pharmacy":
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  filled:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  active: "bg-primary/10 text-primary border-primary/20",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  dispensed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  expired: "bg-muted text-muted-foreground border-border",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  returned: "bg-muted text-muted-foreground border-border",
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground",
  "sent-to-patient": "bg-primary",
  "sent-to-pharmacy": "bg-emerald-500",
  filled: "bg-emerald-500",
  cancelled: "bg-red-500",
  active: "bg-primary",
  pending: "bg-amber-500",
  dispensed: "bg-emerald-500",
  expired: "bg-muted-foreground",
  completed: "bg-emerald-500",
  rejected: "bg-red-500",
  returned: "bg-muted-foreground",
};

const channelIcon = { app: User, email: Mail, sms: Smartphone } as const;

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

// ─── Card view ────────────────────────────────────────────────────────────────

function PrescriptionCard({
  p,
  statusLabel,
  onAction,
}: {
  p: Prescription;
  statusLabel: Record<string, string>;
  onAction: (p: Prescription, action: "pdf" | "send" | "status") => void;
}) {
  return (
    <div className="bg-card border border-border/70 rounded-sm p-4 hover:border-primary/30 transition-colors duration-150">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate">
              {p.doctorName}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {p.issuer === "hospital" && p.issuerOrg
                ? `${p.issuerOrg} · `
                : ""}
              {p.date}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[9px] px-1.5 py-0 gap-1",
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
          {statusLabel[p.status] ?? p.status}
        </Badge>
      </div>

      {/* Medications */}
      <div className="mt-2.5 space-y-1">
        {p.medications.map((m, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-2.5 py-1.5 rounded-sm bg-secondary/30 border border-border/30"
          >
            <Pill className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <div className="text-[11px]">
              <span className="font-medium text-foreground">{m.name}</span>
              <span className="text-muted-foreground/70"> · {m.dosage}</span>
              <p className="text-muted-foreground/60 mt-0.5 text-[10px]">
                {m.frequency}
                {m.quantity ? ` · Qty: ${m.quantity}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pharmacy + channels */}
      <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
        {p.pharmacyName ? (
          <span className="text-[10px] flex items-center gap-1 text-primary">
            <MapPin className="h-3 w-3" />
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
                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-sm bg-secondary/50 text-muted-foreground/70 border border-border/40"
              >
                <I className="h-2.5 w-2.5" />
                {c}
              </span>
            );
          })}
        </div>
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
        {p.status === "sent-to-patient" ? (
          <Button
            size="sm"
            className="h-7 px-2.5 text-[10px] flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
            onClick={() => onAction(p, "send")}
          >
            <Send className="h-3 w-3 mr-1" />
            Send to Pharmacy
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-[10px] flex-1 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-all duration-200"
            onClick={() => onAction(p, "status")}
          >
            View Status
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PatientPrescriptions = () => {
  const { t } = useTranslation();
  const list = usePrescriptions();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
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

  const statusLabel: Record<string, string> = {
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
    const seen = new Set(list.map((p) => p.status));
    return Array.from(seen);
  }, [list]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return list
      .filter((p) => {
        if (filters.status !== "All" && p.status !== filters.status)
          return false;
        if (filters.issuer !== "All" && p.issuer !== filters.issuer)
          return false;
        if (
          q &&
          !p.doctorName.toLowerCase().includes(q) &&
          !p.patientName.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "date-asc":
            return a.createdAt - b.createdAt;
          case "doctor":
            return a.doctorName.localeCompare(b.doctorName);
          default:
            return b.createdAt - a.createdAt;
        }
      });
  }, [filters, list]);

  const activeCount = filtered.filter(
    (p) => p.status === "sent-to-patient" || p.status === "sent-to-pharmacy",
  ).length;
  const pendingCount = filtered.filter((p) => p.status === "pending").length;
  const filledCount = filtered.filter(
    (p) => p.status === "filled" || p.status === "dispensed",
  ).length;
  const cancelledCount = filtered.filter(
    (p) => p.status === "cancelled",
  ).length;

  const handleAction = useCallback(
    (_p: Prescription, _action: "pdf" | "send" | "status") => {
      // plug into router / modal here
    },
    [],
  );

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
          <PillGroup<RxStatus | "All">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "All", label: "All statuses" },
              ...availableStatuses.map((s) => ({
                value: s,
                label: statusLabel[s] ?? s,
              })),
            ]}
          />
        </FilterSection>

        <FilterSection title="Issuer">
          <PillGroup<"All" | "doctor" | "hospital">
            value={filters.issuer}
            onChange={(v) => set("issuer", v)}
            options={[
              { value: "All", label: "All issuers" },
              { value: "doctor", label: "Doctor" },
              { value: "hospital", label: "Hospital" },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="patient">
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
            <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard
                label="Active"
                value={activeCount}
                icon={Pill}
                accent="primary"
              />
              <StatCard
                label="Pending"
                value={pendingCount}
                icon={FileText}
                accent="warning"
              />
              <StatCard
                label="Filled"
                value={filledCount}
                icon={Send}
                accent="success"
              />
              <StatCard
                label="Cancelled"
                value={cancelledCount}
                icon={X}
                accent="primary"
              />
            </div>

            {/* Meta bar */}
            <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
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

                {activeCount > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {activeCount} active
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
                    placeholder="Search doctor or patient.."
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
                          Doctor
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Medications
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Issued
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Pharmacy
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
                            <p className="font-semibold text-[11px] text-foreground">
                              {p.doctorName}
                            </p>
                            {p.issuer === "hospital" && p.issuerOrg && (
                              <p className="text-[10px] text-muted-foreground/70">
                                {p.issuerOrg}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              {p.medications.map((m, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80"
                                >
                                  <Pill className="h-2.5 w-2.5 text-primary shrink-0" />
                                  {m.name}{" "}
                                  <span className="text-muted-foreground/50">
                                    · {m.dosage}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground/80 text-[10px]">
                            {p.date}
                          </td>
                          <td className="px-4 py-3">
                            {p.pharmacyName ? (
                              <span className="flex items-center gap-1 text-[10px] text-primary">
                                <MapPin className="h-3 w-3" />
                                {p.pharmacyName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50">
                                —
                              </span>
                            )}
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
                              {statusLabel[p.status] ?? p.status}
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
                              {p.status === "sent-to-patient" ? (
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
                                  onClick={() => handleAction(p, "send")}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Send
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-all duration-200"
                                  onClick={() => handleAction(p, "status")}
                                >
                                  Details
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {filtered.map((p) => (
                    <PrescriptionCard
                      key={p.id}
                      p={p}
                      statusLabel={statusLabel}
                      onAction={handleAction}
                    />
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
