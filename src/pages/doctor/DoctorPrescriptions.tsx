import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { PrescriptionWizard } from "@/components/PrescriptionWizard";
import { type DeliveryChannel } from "@/lib/prescription-store";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import {
  useGetPrescriptions,
  useIssuePrescription,
  useSendToPharmacy,
  type Prescription,
  type PrescriptionStatus,
  type PrescriptionListParams,
} from "@/hooks/doctor/use-doctor-prescriptions";
import PrescriptionDetailDrawer from "./PrescriptionDetailDrawer";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "table" | "cards";
type SortBy = "created_at" | "valid_until" | "status" | "patient";
type SortOrder = "asc" | "desc";

interface FilterState {
  search: string;
  status: PrescriptionStatus | "All";
  is_signed: "all" | "signed" | "unsigned";
  validity: "all" | "valid_only" | "expired_only";
  date_from: string;
  date_to: string;
  sort_by: SortBy;
  sort_order: SortOrder;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "All",
  is_signed: "all",
  validity: "all",
  date_from: "",
  date_to: "",
  sort_by: "created_at",
  sort_order: "desc",
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Partial<Record<PrescriptionStatus, string>> = {
  draft:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
  issued:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  sent_to_pharmacy:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  filled:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  active:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
  pending:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900",
  dispensed:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900",
  expired:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  returned:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
};

const STATUS_DOT: Partial<Record<PrescriptionStatus, string>> = {
  draft: "bg-slate-400",
  issued: "bg-sky-500",
  sent_to_pharmacy: "bg-amber-500",
  filled: "bg-emerald-500",
  cancelled: "bg-red-500",
  active: "bg-green-500",
  pending: "bg-yellow-500",
  dispensed: "bg-teal-500",
  expired: "bg-orange-500",
  completed: "bg-emerald-500",
  rejected: "bg-red-500",
  returned: "bg-slate-400",
};

const channelIcon: Record<DeliveryChannel, React.ElementType> = {
  app: User,
  email: Mail,
  sms: Smartphone,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(raw?: string): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}

function initials(name?: string): string {
  if (!name) return "PT";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─── Custom debounce hook ─────────────────────────────────────────────────────

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-t border-border/40 animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-sm bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-2.5 w-16 rounded bg-muted/60" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-3 w-32 rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3 w-20 rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-12 rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-20 rounded bg-muted" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-7 w-16 rounded bg-muted ml-auto" />
      </td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border/70 rounded-sm p-3.5 animate-pulse space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-2.5 w-16 rounded bg-muted/60" />
          </div>
        </div>
        <div className="h-5 w-16 rounded bg-muted" />
      </div>
      <div className="space-y-1.5">
        <div className="h-7 rounded-sm bg-muted/40" />
        <div className="h-7 rounded-sm bg-muted/40" />
      </div>
      <div className="h-7 rounded-sm bg-muted/30" />
    </div>
  );
}

// ─── Card view item ───────────────────────────────────────────────────────────

function PrescriptionCard({
  p,
  statusLabel,
  onViewDetails,
  onIssue,
  isIssuing,
}: {
  p: Prescription;
  statusLabel: Record<string, string>;
  onViewDetails: (p: Prescription) => void;
  onIssue: (p: Prescription) => void;
  isIssuing: boolean;
}) {
  return (
    <div className="bg-card border border-border/70 rounded-sm p-3.5 hover:border-primary/30 hover:shadow-sm transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate">
              {p.patient?.name ?? "Patient"}
            </p>
            <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {fmtDate(p.created_at)}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[9px] px-1.5 py-0 font-medium border",
            STATUS_STYLES[p.status] ??
              "bg-secondary/50 text-muted-foreground border-border/60",
          )}
        >
          <span
            className={cn(
              "w-1 h-1 rounded-full mr-1",
              STATUS_DOT[p.status] ?? "bg-muted-foreground/40",
            )}
          />
          {statusLabel[p.status] ?? p.status}
        </Badge>
      </div>

      <div className="mt-2.5 space-y-1">
        {p.items.map((m, i) => (
          <div
            key={m.id ?? i}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-secondary/40 border border-border/30"
          >
            <Pill className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[10px] font-medium text-foreground">
              {m.medicine_name}
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              · {m.dosage} · {m.frequency}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
        {p.pharmacy?.name ? (
          <span className="text-[10px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Send className="h-3 w-3" />
            {p.pharmacy.name}
          </span>
        ) : (
          <span />
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {p.status === "draft" && (
          <Button
            size="sm"
            disabled={isIssuing}
            onClick={() => onIssue(p)}
            className="h-7 px-3 text-[10px] flex-1 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {isIssuing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Issue"}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-3 text-[10px] flex-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
          onClick={() => onViewDetails(p)}
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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");

  // Detail drawer state
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Debounce the search so we don't fire on every keystroke
  const debouncedSearch = useDebounced(filters.search, 400);

  // ── Build API params from filter state ──────────────────────────────────
  const apiParams = useMemo<PrescriptionListParams>(() => {
    const p: PrescriptionListParams = {
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    };
    if (debouncedSearch) p.q = debouncedSearch;
    if (filters.status !== "All") p.status = filters.status;
    if (filters.is_signed === "signed") p.is_signed = true;
    if (filters.is_signed === "unsigned") p.is_signed = false;
    if (filters.validity === "valid_only") p.valid_only = true;
    if (filters.validity === "expired_only") p.expired_only = true;
    if (filters.date_from) p.date_from = filters.date_from;
    if (filters.date_to) p.date_to = filters.date_to;
    return p;
  }, [
    debouncedSearch,
    filters.status,
    filters.is_signed,
    filters.validity,
    filters.date_from,
    filters.date_to,
    filters.sort_by,
    filters.sort_order,
  ]);

  // ── API ──────────────────────────────────────────────────────────────────
  // FIX: The API returns { status, data: { current_page, data: [], total } }
  // The hook must unwrap res.data so that useGetPrescriptions().data is the
  // PrescriptionsListResponse shape ({ data: Prescription[], total, ... }).
  // allList is then data?.data (the inner array), not data?.data?.data.
  const { data, isLoading, isError, error } = useGetPrescriptions(apiParams);
  const issueMutation = useIssuePrescription();

  // ── FIX: correct unwrap — data is PrescriptionsListResponse after hook fix
  const allList: Prescription[] = Array.isArray(data?.data) ? data.data : [];

  // ── Filter helpers ───────────────────────────────────────────────────────
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

  // ── Status labels ────────────────────────────────────────────────────────
  const localStatusLabel: Record<string, string> = {
    draft: t("pages.doctor.rx_status_draft", "Draft"),
    issued: t("pages.doctor.rx_status_sent_patient", "Issued"),
    sent_to_pharmacy: t(
      "pages.doctor.rx_status_sent_pharmacy",
      "Sent to pharmacy",
    ),
    filled: t("pages.doctor.rx_status_filled", "Filled"),
    cancelled: t("pages.doctor.rx_status_cancelled", "Cancelled"),
    active: "Active",
    pending: "Pending",
    dispensed: "Dispensed",
    expired: "Expired",
    completed: "Completed",
    rejected: "Rejected",
    returned: "Returned",
  };

  // ── Unique statuses from current result set ──────────────────────────────
  const availableStatuses = useMemo(
    () => Array.from(new Set(allList.map((p) => p.status))),
    [allList],
  );

  // ── Summary counts ───────────────────────────────────────────────────────
  const pendingCount = allList.filter(
    (p) => p.status === "draft" || p.status === "issued",
  ).length;
  const filledCount = allList.filter(
    (p) => p.status === "filled" || p.status === "completed",
  ).length;
  const cancelledCount = allList.filter(
    (p) => p.status === "cancelled" || p.status === "rejected",
  ).length;

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleViewDetails = useCallback((p: Prescription) => {
    setSelectedRx(p);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    // keep selectedRx alive during exit animation, clear after
    setTimeout(() => setSelectedRx(null), 350);
  }, []);

  const handleIssue = useCallback(
    (p: Prescription) => {
      issueMutation.mutate(p.id, {
        onSuccess: (res) => {
          toast.success(res.message ?? "Prescription issued successfully");
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : "Failed to issue prescription";
          toast.error(message);
        },
      });
    },
    [issueMutation],
  );

  // ─── Sidebar content ─────────────────────────────────────────────────────

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
        {/* Patient / Rx / Diagnosis search */}
        <FilterSection title="Search">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
              placeholder="Patient, diagnosis, Rx#…"
              className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
            />
            {filters.search && (
              <button
                onClick={() => set("search", "")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </FilterSection>

        {/* Status */}
        <FilterSection title="Status">
          <PillGroup<PrescriptionStatus | "All">
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

        {/* Signed */}
        <FilterSection title="Signature">
          <PillGroup<"all" | "signed" | "unsigned">
            value={filters.is_signed}
            onChange={(v) => set("is_signed", v)}
            options={[
              { value: "all", label: "All" },
              { value: "signed", label: "Signed" },
              { value: "unsigned", label: "Unsigned" },
            ]}
          />
        </FilterSection>

        {/* Validity */}
        <FilterSection title="Validity">
          <PillGroup<"all" | "valid_only" | "expired_only">
            value={filters.validity}
            onChange={(v) => set("validity", v)}
            options={[
              { value: "all", label: "All" },
              { value: "valid_only", label: "Valid only" },
              { value: "expired_only", label: "Expired only" },
            ]}
          />
        </FilterSection>

        {/* Date range */}
        <FilterSection title="Date range">
          <div className="space-y-1.5">
            <div>
              <label className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-1 block">
                From
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => set("date_from", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-1 block">
                To
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => set("date_to", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>
            {(filters.date_from || filters.date_to) && (
              <button
                onClick={() => {
                  set("date_from", "");
                  set("date_to", "");
                }}
                className="text-[10px] text-primary hover:underline font-medium"
              >
                Clear dates
              </button>
            )}
          </div>
        </FilterSection>

        {/* Sort */}
        <FilterSection title="Sort by">
          <div className="space-y-1.5">
            <PillGroup<SortBy>
              value={filters.sort_by}
              onChange={(v) => set("sort_by", v)}
              options={[
                { value: "created_at", label: "Date created" },
                { value: "valid_until", label: "Valid until" },
                { value: "status", label: "Status" },
              ]}
            />
            <div className="flex gap-1 mt-1.5">
              {(["desc", "asc"] as SortOrder[]).map((o) => (
                <button
                  key={o}
                  onClick={() => set("sort_order", o)}
                  className={cn(
                    "flex-1 py-1 rounded-sm text-[10px] border transition-all duration-200 font-medium",
                    filters.sort_order === o
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {o === "desc" ? "↓ Newest" : "↑ Oldest"}
                </button>
              ))}
            </div>
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
                Show {data?.total ?? allList.length}{" "}
                {(data?.total ?? allList.length) === 1
                  ? "prescription"
                  : "prescriptions"}
              </button>
            </div>
          </div>

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  {isLoading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">
                        {data?.total ?? allList.length}
                      </span>{" "}
                      {(data?.total ?? allList.length) === 1
                        ? "prescription"
                        : "prescriptions"}
                      {hasActiveFilters && (
                        <button
                          onClick={clearAll}
                          className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                        >
                          Reset filters
                        </button>
                      )}
                    </>
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
                  onClick={() => setWizardOpen(true)}
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
              {isError ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      Failed to load prescriptions
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {error instanceof Error
                        ? error.message
                        : "Something went wrong"}
                    </p>
                  </div>
                </div>
              ) : !isLoading && allList.length === 0 ? (
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
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                    >
                      Clear all filters
                    </button>
                  )}
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
                          Pharmacy
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonRow key={i} />
                          ))
                        : allList.map((p) => (
                            <tr
                              key={p.id}
                              className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150"
                            >
                              {/* Patient */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10">
                                    {initials(p.patient?.name)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-[11px] text-foreground">
                                      {p.patient?.name ?? "Patient"}
                                    </p>
                                    {p.diagnosis && (
                                      <p className="text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
                                        {p.diagnosis}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Medications */}
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                  {p.items.slice(0, 2).map((m, i) => (
                                    <span
                                      key={m.id ?? i}
                                      className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/80"
                                    >
                                      <Pill className="h-3 w-3 text-primary shrink-0" />
                                      <span className="font-medium text-foreground">
                                        {m.medicine_name}
                                      </span>
                                      <span className="text-muted-foreground/50">
                                        · {m.dosage}
                                      </span>
                                    </span>
                                  ))}
                                  {p.items.length > 2 && (
                                    <span className="text-[9px] text-muted-foreground/50 pl-4.5">
                                      +{p.items.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Date */}
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground/80">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground/40" />
                                  {fmtDate(p.created_at)}
                                </span>
                              </td>

                              {/* Pharmacy */}
                              <td className="px-4 py-3">
                                {p.pharmacy?.name ? (
                                  <span className="text-[10px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <Send className="h-3 w-3" />
                                    {p.pharmacy.name}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/40">
                                    —
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "border text-[9px] px-1.5 py-0 font-medium",
                                    STATUS_STYLES[p.status] ??
                                      "bg-secondary/50 text-muted-foreground border-border/60",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "w-1 h-1 rounded-full mr-1",
                                      STATUS_DOT[p.status] ??
                                        "bg-muted-foreground/40",
                                    )}
                                  />
                                  {localStatusLabel[p.status] ?? p.status}
                                </Badge>
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {p.status === "draft" && (
                                    <Button
                                      size="sm"
                                      disabled={
                                        issueMutation.isPending &&
                                        issueMutation.variables === p.id
                                      }
                                      onClick={() => handleIssue(p)}
                                      className="h-7 px-2.5 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm"
                                    >
                                      {issueMutation.isPending &&
                                      issueMutation.variables === p.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        "Issue"
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewDetails(p)}
                                    className="h-7 px-2.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-all duration-200"
                                  >
                                    Details
                                    <ChevronRight className="h-3 w-3 ml-0.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={i} />
                      ))
                    : allList.map((p) => (
                        <PrescriptionCard
                          key={p.id}
                          p={p}
                          statusLabel={localStatusLabel}
                          onViewDetails={handleViewDetails}
                          onIssue={handleIssue}
                          isIssuing={
                            issueMutation.isPending &&
                            issueMutation.variables === p.id
                          }
                        />
                      ))}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* ── Prescription wizard ── */}
        <PrescriptionWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          doctorName="Dr. Elena Vance"
          issuer="doctor"
        />

        {/* ── Detail drawer ── */}
        <PrescriptionDetailDrawer
          prescription={selectedRx}
          open={drawerOpen}
          onClose={handleCloseDrawer}
        />
      </div>
    </DashboardLayout>
  );
};

export default DoctorPrescriptions;

export { STATUS_STYLES as statusStyle, channelIcon };
export const HospitalIcon = Building2;
