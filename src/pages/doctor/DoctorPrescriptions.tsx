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
  type LucideIcon,
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
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-t border-border/40 animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[6px] bg-muted" />
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
    <div className="bg-card border border-border/70 rounded-[6px] p-3.5 animate-pulse space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-2.5 w-16 rounded bg-muted/60" />
          </div>
        </div>
        <div className="h-5 w-16 rounded bg-muted" />
      </div>
      <div className="space-y-1.5">
        <div className="h-7 rounded-[6px] bg-muted/40" />
        <div className="h-7 rounded-[6px] bg-muted/40" />
      </div>
      <div className="h-7 rounded-[6px] bg-muted/30" />
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
  const { t } = useTranslation();
  return (
    <div className="bg-card border border-border/70 rounded-[6px] p-3.5 hover:border-primary/30 hover:shadow-sm transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-[6px] bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {p.patient?.name ?? t("pages.doctor.patient")}
            </p>
            <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {fmtDate(p.created_at)}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-xs px-2 py-0.5 font-medium border",
            STATUS_STYLES[p.status] ??
            "bg-secondary/50 text-muted-foreground border-border/60",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full mr-1.5",
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
            className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-secondary/40 border border-border/30"
          >
            <Pill className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {m.medicine_name}
            </span>
            <span className="text-xs text-muted-foreground/70">
              · {m.dosage} · {m.frequency}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        {p.pharmacy?.name ? (
          <span className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <Send className="h-3.5 w-3.5" />
            {p.pharmacy.name}
          </span>
        ) : (
          <span />
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {p.status === "draft" && (
          <Button
            size="sm"
            disabled={isIssuing}
            onClick={() => onIssue(p)}
            className="h-9 px-4 text-sm flex-1 rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {isIssuing ? <Loader2 className="h-4 w-4 animate-spin" /> : t("pages.doctor.rx_issue")}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-9 px-4 text-sm flex-1 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
          onClick={() => onViewDetails(p)}
        >
          {t("pages.doctor.view_details")}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DoctorPrescriptions = () => {
  const { t, i18n } = useTranslation();
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

  // Aggregate stats over ALL prescriptions (independent of the active filters),
  // so the top cards always show real totals. One lightweight query.
  const statsParams = useMemo<PrescriptionListParams>(() => ({ per_page: 500 }), []);
  const { data: statsData } = useGetPrescriptions(statsParams);
  const statsList: Prescription[] = Array.isArray(statsData?.data) ? statsData.data : [];
  const countByStatus = (s: PrescriptionStatus) =>
    statsList.filter((p) => p.status === s).length;

  const stats: {
    key: "All" | PrescriptionStatus;
    label: string;
    value: number;
    icon: LucideIcon;
    tone: string;
  }[] = [
    { key: "All", label: t("pages.doctor.total"), value: statsData?.total ?? statsList.length, icon: FileText, tone: "text-primary bg-primary/10 border-primary/15" },
    { key: "issued", label: t("pages.doctor.rx_status_issued"), value: countByStatus("issued"), icon: ShieldCheck, tone: "text-sky-600 bg-sky-500/10 border-sky-400/20" },
    { key: "sent_to_pharmacy", label: t("pages.doctor.rx_at_pharmacy"), value: countByStatus("sent_to_pharmacy"), icon: Building2, tone: "text-amber-600 bg-amber-500/10 border-amber-400/20" },
    { key: "dispensed", label: t("pages.doctor.rx_status_dispensed"), value: countByStatus("dispensed"), icon: Send, tone: "text-emerald-600 bg-emerald-500/10 border-emerald-400/20" },
    { key: "cancelled", label: t("pages.doctor.rx_status_cancelled"), value: countByStatus("cancelled"), icon: XCircle, tone: "text-destructive bg-destructive/10 border-destructive/20" },
  ];

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
    active: t("pages.doctor.rx_status_active"),
    pending: t("pages.doctor.rx_status_pending"),
    dispensed: t("pages.doctor.rx_status_dispensed"),
    expired: t("pages.doctor.rx_status_expired"),
    completed: t("pages.doctor.rx_status_completed"),
    rejected: t("pages.doctor.rx_status_rejected"),
    returned: t("pages.doctor.rx_status_returned"),
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
          toast.success(res.message ?? t("pages.doctor.rx_issued_success"));
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : t("pages.doctor.rx_issue_failed");
          toast.error(message);
        },
      });
    },
    [issueMutation],
  );

  // ── FilterFields for FilterBar ───────────────────────────────────────────
  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: t("pages.doctor.status"),
      value: filters.status,
      options: [
        { value: "All", label: t("pages.doctor.all_statuses") },
        ...availableStatuses.map((s) => ({
          value: s,
          label: localStatusLabel[s] ?? s,
        })),
      ],
      onChange: (v: string) => set("status", v as any),
    },
    {
      type: "select" as const,
      key: "is_signed",
      label: t("pages.doctor.rx_signature"),
      value: filters.is_signed,
      options: [
        { value: "all", label: t("pages.doctor.all") },
        { value: "signed", label: t("pages.doctor.rx_signed") },
        { value: "unsigned", label: t("pages.doctor.rx_unsigned") },
      ],
      onChange: (v: string) => set("is_signed", v as any),
    },
    {
      type: "select" as const,
      key: "validity",
      label: t("pages.doctor.rx_validity"),
      value: filters.validity,
      options: [
        { value: "all", label: t("pages.doctor.all") },
        { value: "valid_only", label: t("pages.doctor.rx_valid_only") },
        { value: "expired_only", label: t("pages.doctor.rx_expired_only") },
      ],
      onChange: (v: string) => set("validity", v as any),
    },
    {
      type: "custom" as const,
      key: "date_range",
      label: t("pages.doctor.date_range"),
      render: () => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground/70 mb-1 font-medium">{t("pages.doctor.from")}</p>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => set("date_from", e.target.value)}
                className="w-full px-2 py-1 text-[11px] bg-background border border-border/60 rounded-[4px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer h-7"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70 mb-1 font-medium">{t("pages.doctor.to")}</p>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => set("date_to", e.target.value)}
                className="w-full px-2 py-1 text-[11px] bg-background border border-border/60 rounded-[4px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer h-7"
              />
            </div>
          </div>
          {(filters.date_from || filters.date_to) && (
            <button
              onClick={() => {
                set("date_from", "");
                set("date_to", "");
              }}
              className="text-[10px] text-primary hover:text-primary/80 font-medium"
            >
              {t("pages.doctor.clear_dates")}
            </button>
          )}
        </div>
      )
    },
    {
      type: "search" as const,
      key: "search",
      label: t("pages.doctor.search"),
      value: filters.search,
      placeholder: t("pages.doctor.rx_search_placeholder"),
      onChange: (v: string) => set("search", v),
    }
  ], [filters, availableStatuses, localStatusLabel, set, t]);

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.rx_title")}
          subtitle={t("pages.doctor.rx_subtitle", { date: new Date().toLocaleDateString(i18n.language, { weekday: "long", month: "long", day: "numeric" }) })}
        />

        {/* ── Stats cards (also quick filters) ── */}
        <div className="px-3 sm:px-5 pt-4 pb-1 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {stats.map(({ key, label, value, icon: Icon, tone }) => {
              const active = filters.status === key;
              return (
                <button
                  key={key}
                  onClick={() => set("status", key)}
                  className={cn(
                    "group flex items-center gap-3 rounded-[6px] border bg-card px-3 py-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5",
                    active ? "border-primary ring-1 ring-primary/30" : "border-border/70",
                  )}
                >
                  <span className={cn("h-9 w-9 rounded-[6px] flex items-center justify-center border shrink-0", tone)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-bold leading-none text-foreground tabular-nums">{value}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5 truncate">{label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
         
          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("pages.doctor.loading")}
                    </span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">
                        {data?.total ?? allList.length}
                      </span>{" "}
                      {(data?.total ?? allList.length) === 1
                        ? t("pages.doctor.rx_prescription")
                        : t("pages.doctor.rx_prescriptions")}
                      {hasActiveFilters && (
                        <button
                          onClick={clearAll}
                          className="ml-3 text-primary hover:text-primary/80 hover:underline text-xs font-medium transition-colors"
                        >
                          {t("pages.doctor.reset_filters")}
                        </button>
                      )}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={`${filters.sort_by}|${filters.sort_order}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split("|");
                    set("sort_by", by as any);
                    set("sort_order", order as any);
                  }}
                  className="hidden sm:block px-2 py-1.5 text-[11px] font-medium bg-card border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
                >
                  <option value="created_at|desc">{t("pages.doctor.latest_first")}</option>
                  <option value="created_at|asc">{t("pages.doctor.oldest_first")}</option>
                  <option value="valid_until|asc">{t("pages.doctor.rx_expiring_soon")}</option>
                  <option value="status|asc">{t("pages.doctor.rx_status_az")}</option>
                </select>

                <FilterToggleButton
                  open={filterOpen}
                  onToggle={() => setFilterOpen(!filterOpen)}
                  hasActiveFilters={hasActiveFilters}
                />

                {/* View toggle */}
                <div className="flex rounded-[6px] border border-border/60 overflow-hidden bg-card shadow-sm">
                  <button
                    onClick={() => setView("table")}
                    aria-label={t("pages.doctor.table_view")}
                    className={cn(
                      "px-3 py-2 transition-all duration-200",
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
                    aria-label={t("pages.doctor.card_view")}
                    className={cn(
                      "px-3 py-2 border-l border-border/60 transition-all duration-200",
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
                  className="h-10 px-4 text-xs font-semibold rounded-[6px] bg-primary hover:bg-primary/90 shadow-sm hover:shadow transition-all duration-200"
                  onClick={() => setWizardOpen(true)}
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {t("pages.doctor.new_rx")}
                  </span>
                </Button>
              </div>
            </div>
             <FilterBar
            open={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            fields={filterFields}
            cols={{ default: 1, sm: 2, lg: 5 }}
          />


            {/* Content */}
            <div className="p-5">
              {isError ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("pages.doctor.rx_load_failed")}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {error instanceof Error
                        ? error.message
                        : t("pages.doctor.something_went_wrong")}
                    </p>
                  </div>
                </div>
              ) : !isLoading && allList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center border border-border/40">
                    <Pill className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("pages.doctor.rx_no_match")}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {t("pages.doctor.try_widening_search")}
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="text-sm text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-2"
                    >
                      {t("pages.doctor.clear_all_filters")}
                    </button>
                  )}
                </div>
              ) : view === "table" ? (
                <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-5 py-4 font-semibold">
                          {t("pages.doctor.patient")}
                        </th>
                        <th className="text-left px-5 py-4 font-semibold">
                          {t("pages.doctor.medications")}
                        </th>
                        <th className="text-left px-5 py-4 font-semibold">
                          {t("pages.doctor.rx_issued")}
                        </th>
                        <th className="text-left px-5 py-4 font-semibold">
                          {t("pages.doctor.pharmacy")}
                        </th>
                        <th className="text-left px-5 py-4 font-semibold">
                          {t("pages.doctor.status")}
                        </th>
                        <th className="px-5 py-4" />
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
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-[6px] bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 border border-primary/10">
                                  {initials(p.patient?.name)}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-foreground">
                                    {p.patient?.name ?? t("pages.doctor.patient")}
                                  </p>
                                  {p.diagnosis && (
                                    <p className="text-xs text-muted-foreground/70 truncate max-w-[150px]">
                                      {p.diagnosis}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Medications */}
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1">
                                {p.items.slice(0, 2).map((m, i) => (
                                  <span
                                    key={m.id ?? i}
                                    className="inline-flex items-center gap-2 text-xs text-muted-foreground/80"
                                  >
                                    <Pill className="h-4 w-4 text-primary shrink-0" />
                                    <span className="font-medium text-foreground">
                                      {m.medicine_name}
                                    </span>
                                    <span className="text-muted-foreground/50">
                                      · {m.dosage}
                                    </span>
                                  </span>
                                ))}
                                {p.items.length > 2 && (
                                  <span className="text-xs text-muted-foreground/50 pl-6">
                                    {t("pages.doctor.more_count", { count: p.items.length - 2 })}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Date */}
                            <td className="px-5 py-4 whitespace-nowrap text-muted-foreground/80">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-muted-foreground/40" />
                                {fmtDate(p.created_at)}
                              </span>
                            </td>

                            {/* Pharmacy */}
                            <td className="px-5 py-4">
                              {p.pharmacy?.name ? (
                                <span className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                  <Send className="h-4 w-4" />
                                  {p.pharmacy.name}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/40">
                                  —
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border text-xs px-2.5 py-0.5 font-medium",
                                  STATUS_STYLES[p.status] ??
                                  "bg-secondary/50 text-muted-foreground border-border/60",
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full mr-1.5",
                                    STATUS_DOT[p.status] ??
                                    "bg-muted-foreground/40",
                                  )}
                                />
                                {localStatusLabel[p.status] ?? p.status}
                              </Badge>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {p.status === "draft" && (
                                  <Button
                                    size="sm"
                                    disabled={
                                      issueMutation.isPending &&
                                      issueMutation.variables === p.id
                                    }
                                    onClick={() => handleIssue(p)}
                                    className="h-7 px-2.5 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] shadow-sm"
                                  >
                                    {issueMutation.isPending &&
                                      issueMutation.variables === p.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      t("pages.doctor.rx_issue")
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewDetails(p)}
                                  className="h-7 px-2.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-[6px] transition-all duration-200"
                                >
                                  {t("pages.doctor.details")}
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
