import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import i18n from "@/lib/i18n";
import { toast as sonnerToast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { formatDateOnly } from "@/lib/date";
  import{ShoppingBag,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  LayoutGrid,
  List,
  HeartPulse,
  Loader2,
  AlertCircle,
  RefreshCw,
  Truck,
  Store,
  CalendarDays,
  PackageCheck,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetPatientPharmacyOrders,
  useCancelPatientPharmacyOrder,
  type OrderFilters,
  type PharmacyOrder,
  type OrderStatus,
} from "@/hooks/patient/use-patient-pharmacy-orders";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { MyMedicalInfoDrawer } from "./components/MyMedicalInfoDrawer";

 
const ALL_STATUSES: OrderStatus[] = [
  "draft",
  "pending",
  "accepted",
  "completed",
  "cancelled",
];

const getOrderStatusLabel = (t: TFunction, status: OrderStatus): string => {
  const map: Record<OrderStatus, string> = {
    draft: t("pages.patient.ord_status_draft"),
    pending: t("pages.patient.status_pending"),
    accepted: t("pages.patient.ord_status_accepted"),
    completed: t("pages.patient.status_completed"),
    cancelled: t("pages.patient.status_cancelled"),
  };
  return map[status];
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  accepted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

type SortMode = "date-desc" | "date-asc";
type ViewMode = "table" | "cards";

interface FilterState {
  status: OrderStatus | "all";
  from: string;
  to: string;
  sort: SortMode;
  search: string;
}

const INITIAL_FILTERS: FilterState = {
  status: "all",
  from: "",
  to: "",
  sort: "date-desc",
  search: "",
};

const API_BASE_URL =
  import.meta.env.VITE_APP_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "";
const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

function resolveOrderReceiptUrl(order: PharmacyOrder): string | null {
  const url =
    order.receipt_url ??
    order.invoice_url ??
    order.pdf_url ??
    order.receipt?.url ??
    order.invoice?.url ??
    order.payment?.receipt_url ??
    order.payment?.invoice_url ??
    null;

  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = PUBLIC_BASE_URL || window.location.origin;
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

function openOrderReceipt(order: PharmacyOrder) {
  const url = resolveOrderReceiptUrl(order);
  if (!url) {
    sonnerToast.error(i18n.t("pages.patient.ord_receipt_unavailable"), {
      description: i18n.t("pages.patient.ord_receipt_unavailable_desc"),
    });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

 
function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-xs font-semibold uppercase tracking-wide",
        STATUS_STYLES[status],
      )}
    >
      {getOrderStatusLabel(t, status)}
    </span>
  );
}

function DeliveryBadge({ type }: { type: "pickup" | "home_delivery" }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
      {type === "home_delivery" ? (
        <><Truck className="w-4 h-4" />{t("pages.patient.ord_home_delivery")}</>
      ) : (
        <><Store className="w-4 h-4" />{t("pages.patient.pickup_badge")}</>
      )}
    </span>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-border/30 last:border-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">{title}</p>
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
    <div className="flex flex-col gap-2 text-start">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2 py-2 rounded-[6px] text-xs text-start  font-medium border transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-transparent text-muted-foreground border-border/40 hover:border-primary/30 hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DateRangeInput({
  from, to, onFrom, onTo,
}: {
  from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground/50 w-5">{t("pages.patient.date_from_label")}</span>
        <input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="flex-1 px-2 py-0.5 text-xs bg-background border border-border/50 rounded-[6px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground/50 w-5">{t("pages.patient.date_to_label")}</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="flex-1 px-2 py-0.5 text-xs bg-background border border-border/50 rounded-[6px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground"
        />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-t border-border/35">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 bg-muted/40 rounded-[6px] animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[6px] border border-border/50 bg-card p-3 space-y-2 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-24 bg-muted/40 rounded-[6px]" />
        <div className="h-4 w-16 bg-muted/40 rounded-[6px]" />
      </div>
      <div className="h-2.5 w-36 bg-muted/30 rounded-[6px]" />
      <div className="h-2.5 w-28 bg-muted/30 rounded-[6px]" />
    </div>
  );
}

function OrderCard({
  order,
  onCancel,
  onViewDetails,
}: {
  order: PharmacyOrder;
  onCancel: (o: PharmacyOrder) => void;
  onViewDetails: (o: PharmacyOrder) => void;
}) {
  const { t } = useTranslation();
  const canCancel = order.status === "draft" || order.status === "pending";
  return (
    <div
      className="rounded-[6px] border border-border/60 bg-card p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow cursor-pointer group"
      onClick={() => onViewDetails(order)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{order.pharmacy.name}</p>
            {order.pharmacy.address && (
              <p className="text-xs text-muted-foreground/60 truncate flex items-center gap-0.5">
                <MapPin className="w-2 h-2 shrink-0" />{order.pharmacy.address}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="flex flex-col gap-0.5 pl-9">
        {order.items.slice(0, 2).map((item) => (
          <span key={item.id} className="text-xs text-muted-foreground/70">
            <span className="font-medium text-foreground/80">{item.medicine_name}</span>
            <span className="text-muted-foreground/45"> · {t("pages.patient.qty", { count: item.quantity })}</span>
          </span>
        ))}
        {order.items.length > 2 && (
          <span className="text-xs text-muted-foreground/40">{t("pages.cards.more_count", { count: order.items.length - 2 })}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <div className="flex items-center gap-2">
          <DeliveryBadge type={order.delivery_type} />
          <span className="text-xs text-muted-foreground/40">
            {formatDateOnly(order.created_at, "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs rounded-[6px] border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 gap-1"
              onClick={() => onCancel(order)}
            >
              <X className="h-2 w-2" />{t("common.cancel")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

 
function OrderDrawer({
  order,
  onClose,
  onCancel,
}: {
  order: PharmacyOrder | null;
  onClose: () => void;
  onCancel: (o: PharmacyOrder) => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!order) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [order, onClose]);

  const canCancel = order && (order.status === "draft" || order.status === "pending");

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          order ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm",
          "bg-card border-l border-border flex flex-col",
          "transition-transform duration-300 ease-out",
          order ? "translate-x-0" : "translate-x-full",
        )}
      >
        {order && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div>
                <p className="text-xs font-semibold text-foreground">{t("pages.patient.ord_order_number", { id: order.id })}</p>
                <p className="text-xs text-muted-foreground/60">{order.pharmacy.name}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-[6px] hover:bg-secondary/50 text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {/* Status + delivery */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={order.status} />
                <DeliveryBadge type={order.delivery_type} />
              </div>

              {/* Pharmacy */}
              <div className="rounded-[6px] border border-border/50 bg-secondary/10 p-2.5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">{t("pages.patient.pharmacy_label")}</p>
                <p className="text-xs font-semibold text-foreground">{order.pharmacy.name}</p>
                {order.pharmacy.address && (
                  <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />{order.pharmacy.address}
                  </p>
                )}
                {order.pharmacy.phone && (
                  <p className="text-xs text-muted-foreground/60">{order.pharmacy.phone}</p>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
                  {t("pages.patient.ord_items_count", { count: order.items.length })}
                </p>
                <div className="space-y-1.5">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-[6px] border border-border/40 bg-secondary/10 px-2.5 py-1.5">
                      <div>
                        <p className="text-xs font-medium text-foreground">{item.medicine_name}</p>
                        {item.dosage && <p className="text-xs text-muted-foreground/50">{item.dosage}</p>}
                      </div>
                      <span className="text-xs font-semibold text-foreground bg-secondary/50 px-1.5 py-0.5 rounded-[6px]">X{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery address */}
              {order.delivery_address && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">{t("pages.patient.delivery_address_label")}</p>
                  <p className="text-xs text-foreground/80">{order.delivery_address}</p>
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">{t("consult.booking.notes")}</p>
                  <p className="text-xs text-foreground/80">{order.notes}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[6px] border border-border/40 bg-secondary/10 px-2.5 py-1.5">
                  <p className="text-xs text-muted-foreground/50">{t("pages.patient.ord_placed")}</p>
                  <p className="text-xs font-medium text-foreground">
                    {formatDateOnly(order.created_at, "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="rounded-[6px] border border-border/40 bg-secondary/10 px-2.5 py-1.5">
                  <p className="text-xs text-muted-foreground/50">{t("pages.patient.ord_updated")}</p>
                  <p className="text-xs font-medium text-foreground">
                    {formatDateOnly(order.updated_at, "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>

            {(canCancel || order.status === "completed") && (
              <div className="px-4 py-3 border-t border-border/50 space-y-2">
                {order.status === "completed" && (
                  <Button
                    className="w-full h-8 text-xs rounded-[6px] gap-1.5"
                    onClick={() => openOrderReceipt(order)}
                  >
                    <Download className="h-4 w-4" />
                    {t("pages.patient.ord_view_receipt")}
                  </Button>
                )}
                {canCancel && (
                <Button
                  className="w-full h-8 text-xs rounded-[6px] bg-red-600 hover:bg-red-700 text-white gap-1.5"
                  onClick={() => onCancel(order)}
                >
                  <X className="h-4 w-4" />
                  {order.status === "draft" ? t("pages.patient.ord_delete_draft") : t("pages.patient.ord_cancel_order")}
                </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

 
function CancelConfirmModal({
  order,
  onConfirm,
  onClose,
  isPending,
}: {
  order: PharmacyOrder | null;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  if (!order) return null;
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-black/50" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-[6px] shadow-lg w-full max-w-xs p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-[6px] bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {order.status === "draft" ? t("pages.patient.ord_confirm_delete_draft") : t("pages.patient.ord_confirm_cancel")}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {order.status === "draft"
                  ? t("pages.patient.ord_draft_remove_warning")
                  : t("pages.patient.ord_cancel_warning", { id: order.id, name: order.pharmacy.name })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 h-7 text-xs rounded-[6px]"
              onClick={onClose}
              disabled={isPending}
            >
              {t("pages.patient.ord_keep_it")}
            </Button>
            <Button
              className="flex-1 h-7 text-xs rounded-[6px] bg-red-600 hover:bg-red-700 text-white gap-1"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              {order.status === "draft" ? t("common.delete") : t("common.cancel")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
 
const Orders = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [medInfoOpen, setMedInfoOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<PharmacyOrder | null>(null);

  const apiFilters = useMemo<OrderFilters>(
    () => ({
      status: filters.status !== "all" ? filters.status : undefined,
      from_date: filters.from || undefined,
      to_date: filters.to || undefined,
    }),
    [filters],
  );

  const { data, isLoading, isError, refetch, isFetching } = useGetPatientPharmacyOrders(apiFilters);
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelPatientPharmacyOrder();

  const orders = useMemo(() => {
    const list = data?.data ?? [];
    const searched = filters.search
      ? list.filter(
        (o) =>
          o.pharmacy.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          o.items.some((i) => i.medicine_name.toLowerCase().includes(filters.search.toLowerCase())),
      )
      : list;
    return [...searched].sort((a, b) =>
      filters.sort === "date-asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [data, filters.sort, filters.search]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

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

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const acceptedCount = orders.filter((o) => o.status === "accepted").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  const handleCancel = useCallback((order: PharmacyOrder) => {
    setSelectedOrder(null);
    setOrderToCancel(order);
  }, []);

  const confirmCancel = useCallback(() => {
    if (!orderToCancel) return;
    cancelOrder(orderToCancel.id, {
      onSuccess: () => setOrderToCancel(null),
    });
  }, [orderToCancel, cancelOrder]);

  const handleViewDetails = useCallback((o: PharmacyOrder) => setSelectedOrder(o), []);
  const closeDrawer = useCallback(() => setSelectedOrder(null), []);

  const tableHeaders = [
    t("pages.patient.pharmacy_label"),
    t("pages.patient.ord_th_items"),
    t("pages.patient.delivery_stat_label"),
    t("pages.patient.date_label"),
    t("pages.patient.appt_filter_status_label"),
    "",
  ];

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: t("pages.patient.appt_filter_status_label"),
      value: filters.status,
      options: [
        { value: "all", label: t("pages.patient.appt_filter_all_statuses") },
        ...ALL_STATUSES.map((s) => ({ value: s, label: getOrderStatusLabel(t, s) })),
      ],
      onChange: (v: string) => set("status", v as any)
    },
    {
      type: "custom" as const,
      key: "date_range",
      label: t("pages.patient.appt_filter_date_range"),
      render: () => (
        <DateRangeInput
          from={filters.from}
          to={filters.to}
          onFrom={(v) => set("from", v)}
          onTo={(v) => set("to", v)}
        />
      )
    },
    {
      type: "search" as const,
      key: "search",
      label: t("pages.patient.search_label"),
      value: filters.search,
      placeholder: t("pages.patient.ord_search_placeholder"),
      onChange: (v: string) => set("search", v)
    }
  ], [filters, set, t]);

 
  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.ord_title")}
          subtitle={t("pages.patient.ord_sub")}
        />

        {/* Quick access to the patient's own medical record */}
        <div className="flex items-center justify-end px-4 py-2 border-b border-border/60 bg-card/30 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMedInfoOpen(true)}
            className="h-8 px-3 text-[11px] font-medium rounded-[6px] gap-1.5"
          >
            <HeartPulse className="h-3.5 w-3.5 text-primary" />
            {t("consult.medical_info.my_info")}
          </Button>
        </div>

        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2, lg: 3 }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Stats */}
          <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard label={t("pages.patient.status_pending")} value={pendingCount} icon={Clock} accent="warning" />
            <StatCard label={t("pages.patient.ord_status_accepted")} value={acceptedCount} icon={PackageCheck} accent="primary" />
            <StatCard label={t("pages.patient.status_completed")} value={completedCount} icon={CheckCircle2} accent="success" />
            <StatCard label={t("pages.patient.status_cancelled")} value={cancelledCount} icon={XCircle} accent="primary" />
          </div>

          {/* Toolbar */}
          <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {isLoading ? (
                  <span className="text-muted-foreground/40">{t("consult.booking.loading")}</span>
                ) : (
                  <>
                    <span className="font-bold text-foreground">{orders.length}</span>{" "}
                    {orders.length === 1 ? t("pages.patient.ord_count_singular") : t("pages.patient.ord_count_plural")}
                  </>
                )}
                {hasActiveFilters && !isLoading && (
                  <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/70 hover:underline text-xs font-medium">
                    {t("pages.patient.reset_filters")}
                  </button>
                )}
              </p>
              {isFetching && !isLoading && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
                  <Loader2 className="w-4 h-4 animate-spin" />{t("pages.patient.refreshing_label")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value as "date-asc" | "date-desc")}
                className="hidden sm:block px-2 py-1.5 text-[11px] font-medium bg-card border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
              >
                <option value="date-desc">{t("pages.patient.sort_newest_first")}</option>
                <option value="date-asc">{t("pages.patient.sort_oldest_first")}</option>
              </select>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />

              <div className="flex rounded-[6px] border border-border overflow-hidden bg-card shadow-sm">
                <button
                  onClick={() => setView("table")}
                  className={cn(
                    "p-1.5 transition-colors",
                    view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("cards")}
                  className={cn(
                    "p-1.5 transition-colors",
                    view === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {isError && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-12 h-12 rounded-[6px] bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t("pages.patient.ord_error_title")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{t("pages.patient.error_check_connection")}</p>
                </div>
                <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 font-semibold">
                  <RefreshCw className="w-4 h-4" />{t("pages.patient.retry_link")}
                </button>
              </div>
            )}

            {isLoading && !isError && (
              view === "table" ? (
                <div className="rounded-[6px] border border-border/60 bg-card overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
                      <tr>
                        {tableHeaders.map((h, i) => (
                          <th key={i} className="text-left px-3 py-2.5 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-2.5">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              )
            )}

            {!isLoading && !isError && orders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-12 h-12 rounded-[6px] bg-muted/50 flex items-center justify-center border border-border/30">
                  <ShoppingBag className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {hasActiveFilters ? t("pages.patient.ord_empty_no_match") : t("pages.patient.ord_empty_none")}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {hasActiveFilters ? t("pages.patient.try_widening_search_sub") : t("pages.patient.ord_empty_hint")}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="text-xs text-primary hover:text-primary/70 font-semibold hover:underline">
                    {t("pages.patient.clear_all_filters_link")}
                  </button>
                )}
              </div>
            )}

            {/* Table view */}
            {!isLoading && !isError && orders.length > 0 && view === "table" && (
              <div className="rounded-[6px] border border-border/60 bg-card overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
                    <tr>
                      {tableHeaders.map((h, i) => (
                        <th key={i} className="text-left px-3 py-2.5 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const canCancel = order.status === "draft" || order.status === "pending";
                      return (
                        <tr
                          key={order.id}
                          className="border-t border-border/35 hover:bg-secondary/15 transition-colors cursor-pointer"
                          onClick={() => handleViewDetails(order)}
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Store className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-xs text-foreground">{order.pharmacy.name}</p>
                                {order.pharmacy.address && (
                                  <p className="text-xs text-muted-foreground/60 truncate max-w-[120px]">{order.pharmacy.address}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              {order.items.slice(0, 2).map((item) => (
                                <span key={item.id} className="text-xs text-muted-foreground/70">
                                  <span className="font-medium text-foreground/80">{item.medicine_name}</span>
                                  <span className="text-muted-foreground/45"> X{item.quantity}</span>
                                </span>
                              ))}
                              {order.items.length > 2 && (
                                <span className="text-xs text-muted-foreground/40">{t("pages.cards.more_count", { count: order.items.length - 2 })}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <DeliveryBadge type={order.delivery_type} />
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground/60 text-xs">
                            <div className="flex items-center gap-1">
                              <CalendarDays className="w-4 h-4" />
                              {formatDateOnly(order.created_at, "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs rounded-[6px] border-border/50 hover:border-primary/30 hover:bg-secondary/30"
                                onClick={() => handleViewDetails(order)}
                              >
                                {t("pages.patient.details")}
                              </Button>
                              {canCancel && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs rounded-[6px] border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 gap-1"
                                  onClick={() => handleCancel(order)}
                                >
                                  <X className="h-2 w-2" />
                                  {order.status === "draft" ? t("common.delete") : t("common.cancel")}
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
            {!isLoading && !isError && orders.length > 0 && view === "cards" && (
              <div className="grid md:grid-cols-2 gap-2.5">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} onCancel={handleCancel} onViewDetails={handleViewDetails} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <MyMedicalInfoDrawer open={medInfoOpen} onClose={() => setMedInfoOpen(false)} />

      <OrderDrawer order={selectedOrder} onClose={closeDrawer} onCancel={handleCancel} />

      <CancelConfirmModal
        order={orderToCancel}
        onConfirm={confirmCancel}
        onClose={() => setOrderToCancel(null)}
        isPending={isCancelling}
      />
    </DashboardLayout>
  );
};

export default Orders;

