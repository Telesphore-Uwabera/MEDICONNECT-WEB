import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast as sonnerToast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Package,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";

// ── Import every hook + type from the dedicated hooks file ───────────────────
import {
  useGetOrders,
  useAcceptOrder,
  useRejectOrder,
  useCompleteOrder,
  type Order,
  type OrderStatus,
  type OrderSource,
  type ListOrdersParams,
} from "@/hooks/pharmacy/use-pharmacy-orders";

// ─── Local UI types ───────────────────────────────────────────────────────────

type SortOption =
  | "time-desc"
  | "time-asc"
  | "total-desc"
  | "total-asc"
  | "patient";

interface FilterState {
  search: string;
  /** "all" means no ?status= param is sent to the API */
  status: OrderStatus | "all";
  /** "all" means no ?source= param is sent to the API */
  source: OrderSource | "all";
  /** client-side sort only */
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  source: "all",
  sort: "time-desc",
};

// ─── Visual config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  accepted:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  accepted: "bg-sky-500",
  completed: "bg-emerald-500",
  rejected: "bg-red-500",
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "time-desc", label: "pages.pharmacy.sort_time_newest" },
  { value: "time-asc", label: "pages.pharmacy.sort_time_oldest" },
  { value: "total-desc", label: "pages.pharmacy.sort_total_desc" },
  { value: "total-asc", label: "pages.pharmacy.sort_total_asc" },
  { value: "patient", label: "Patient (A–Z)" },
];

const API_BASE_URL =
  import.meta.env.VITE_APP_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "";
const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

function resolveOrderReceiptUrl(order: Order): string | null {
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

function openOrderReceipt(order: Order) {
  const url = resolveOrderReceiptUrl(order);
  if (!url) {
    sonnerToast.error("Receipt is not available yet.", {
      description: t("pages.pharmacy.order_receipt_missing"),
    });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

// ─── Sidebar sub-components ───────────────────────────────────────────────────

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
  options: { value: T; label: string; dot?: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-[6px] text-[11px] border transition-all duration-200 text-left flex items-center gap-2",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.dot && (
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                value === o.value ? "bg-primary-foreground/70" : o.dot,
              )}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Per-row action buttons ───────────────────────────────────────────────────
// Each button calls the matching hook:
//   pending  → useAcceptOrder  (POST /orders/:id/accept)
//            → useRejectOrder  (POST /orders/:id/reject  + reason)
//   accepted → useCompleteOrder (POST /orders/:id/complete)
//   completed / rejected → receipt / nothing

function OrderActions({ order }: { order: Order }) {
  const { t, i18n } = useTranslation();

  // All three mutations live here; only the relevant one fires per row.
  const accept = useAcceptOrder();
  const reject = useRejectOrder();
  const complete = useCompleteOrder();

  const busy = accept.isPending || reject.isPending || complete.isPending;

  // ── pending: Accept + Reject ──────────────────────────────────────────────
  if (order.status === "pending") {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {/* Reject — POST /orders/:id/reject { reason } */}
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            reject.mutate({ id: order.id, reason: "Medicine out of stock" })
          }
          className="h-7 px-3 text-[10px] rounded-[6px] border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200"
        >
          {reject.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            t("pages.pharmacy.reject")
          )}
        </Button>

        {/* Accept — POST /orders/:id/accept */}
        <Button
          size="sm"
          disabled={busy}
          onClick={() => accept.mutate(order.id)}
          className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] shadow-sm transition-all duration-200"
        >
          {accept.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            t("pages.pharmacy.approve")
          )}
        </Button>
      </div>
    );
  }

  // ── accepted: Complete ────────────────────────────────────────────────────
  // Internal orders auto-deduct stock; external orders skip deduction.
  if (order.status === "accepted") {
    return (
      <Button
        size="sm"
        disabled={busy}
        onClick={() => complete.mutate(order.id)}
        className="h-7 px-3 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] shadow-sm transition-all duration-200"
      >
        {complete.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          t("pages.pharmacy.completed")
        )}
      </Button>
    );
  }

  // ── completed: Receipt (view-only) ───────────────────────────────────────
  if (order.status === "completed") {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => openOrderReceipt(order)}
        className="h-7 px-3 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-[6px] transition-all duration-200"
      >
        <Download className="mr-1 h-3 w-3" />
        {t("pages.pharmacy.receipt")}
      </Button>
    );
  }

  // ── rejected: no action ──────────────────────────────────────────────────
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PharmacyOrders = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  // ── Build API params (38 — GET /orders) ─────────────────────────────────
  // Only include status / source when they're not "all";
  // the hook builds the ?status= / ?source= query string from these.
  const apiParams: ListOrdersParams = useMemo(
    () => ({
      ...(filters.status !== "all" && { status: filters.status }),
      ...(filters.source !== "all" && { source: filters.source }),
    }),
    [filters.status, filters.source],
  );

  // React Query re-fetches automatically when apiParams changes (key changes).
  const { data, isLoading, isError, refetch } = useGetOrders(apiParams);

  console.log("PharmacyOrders.tsx: data", data, "isLoading", isLoading, "isError", isError);
  const orders: Order[] = data?.data ?? [];

  // ── Client-side search + sort (status/source are server-side) ───────────
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();

    return orders
      .filter((o) => {
        if (!q) return true;
        return (
          o.patient.name.toLowerCase().includes(q) ||
          o.order_number.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "time-asc":
            return (a.created_at ?? "").localeCompare(b.created_at ?? "");
          case "total-desc":
            return parseFloat(b.total_amount) - parseFloat(a.total_amount);
          case "total-asc":
            return parseFloat(a.total_amount) - parseFloat(b.total_amount);
          case "patient":
            return a.patient.name.localeCompare(b.patient.name);
          default: // time-desc
            return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        }
      });
  }, [orders, filters.search, filters.sort]);

  // ── Count per status from the current API response ───────────────────────
  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === "pending").length,
      accepted: orders.filter((o) => o.status === "accepted").length,
      completed: orders.filter((o) => o.status === "completed").length,
      rejected: orders.filter((o) => o.status === "rejected").length,
    }),
    [orders],
  );

  // ─── Sidebar ─────────────────────────────────────────────────────────────

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: t("pages.pharmacy.status"),
      value: filters.status,
      options: [
        { value: "all", label: t("pages.pharmacy.all_statuses") },
        { value: "pending", label: t("pages.pharmacy.pending") },
        { value: "accepted", label: t("pages.pharmacy.approved") },
        { value: "completed", label: t("pages.pharmacy.completed") },
        { value: "rejected", label: t("pages.pharmacy.rejected") },
      ],
      onChange: (v: string) => set("status", v as any)
    },
    {
      type: "select" as const,
      key: "source",
      label: t("pages.pharmacy.source"),
      value: filters.source,
      options: [
        { value: "all", label: t("pages.pharmacy.all_sources") },
        { value: "internal", label: t("pages.pharmacy.internal") },
        { value: "external", label: t("pages.pharmacy.external") },
      ],
      onChange: (v: string) => set("source", v as any)
    }
  ], [filters.status, filters.source, set, t]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.orders_title")}
          subtitle={t("pages.pharmacy.orders_sub")}
        />

      
        <main className="flex-1 overflow-y-auto flex flex-col">

          {/* Stat cards — counts from the current API page */}
          <div className="px-4 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard
              label={t("pages.pharmacy.pending")}
              value={isLoading ? "—" : counts.pending}
              icon={ClipboardList}
              accent="warning"
            />
            <StatCard
              label={t("pages.pharmacy.approved")}
              value={isLoading ? "—" : counts.accepted}
              icon={Package}
              accent="info"
            />
            <StatCard
              label={t("pages.pharmacy.completed")}
              value={isLoading ? "—" : counts.completed}
              icon={CheckCircle2}
              accent="success"
            />
            <StatCard
              label={t("pages.pharmacy.rejected")}
              value={isLoading ? "—" : counts.rejected}
              icon={XCircle}
              accent="danger"
            />
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            {/* Left: count + quick-filter pills */}
            <div className="flex items-center gap-3">
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading orders…
                </span>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {filtered.length}
                  </span>{" "}
                  {filtered.length === 1 ? "order" : "orders"}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </p>
              )}

              {/* Clickable status pills — clicking sets the sidebar filter */}
              {!isLoading && (
                <div className="hidden lg:flex items-center gap-2">
                  {counts.pending > 0 && (
                    <button
                      onClick={() => set("status", "pending")}
                      className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {counts.pending} pending
                    </button>
                  )}
                  {counts.accepted > 0 && (
                    <button
                      onClick={() => set("status", "accepted")}
                      className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      {counts.accepted} accepted
                    </button>
                  )}
                  {counts.completed > 0 && (
                    <button
                      onClick={() => set("status", "completed")}
                      className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {counts.completed} completed
                    </button>
                  )}
                  {counts.rejected > 0 && (
                    <button
                      onClick={() => set("status", "rejected")}
                      className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {counts.rejected} rejected
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: refresh + search + sort */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                title={t("pages.pharmacy.refresh")}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all text-muted-foreground hover:text-foreground"
              >
                <RefreshCw
                  className={cn("w-3 h-3", isLoading && "animate-spin")}
                />
              </button>

              {/* Client-side search (patient name / order number) */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => set("search", e.target.value)}
                  placeholder="Search patient, order ID…"
                  className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              {/* Client-side sort */}
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as SortOption)}
                  className="appearance-none pl-2.5 pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
              </div>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>
          <FilterBar
            open={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            fields={filterFields}
            cols={{ default: 1, sm: 2, lg: 3 }}
          />

          {/* Table area */}
          <div className="p-4">

            {/* ── Error state ── */}
            {isError && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {t("pages.pharmacy.failed_load_orders")}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {t("pages.pharmacy.check_connection_try_again")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  className="text-[11px] h-7 px-3 rounded-[6px] mt-1"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Retry
                </Button>
              </div>
            )}

            {/* ── Loading skeleton ── */}
            {isLoading && (
              <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                <table className="w-full text-[11px]">
                  <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                    <tr>
                      {["Order", "Patient", "Items", "Total", "Source", "Status", ""].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 font-semibold"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-border/40">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div
                              className="h-2.5 rounded bg-muted/60 animate-pulse"
                              style={{ width: `${50 + ((i * 3 + j * 7) % 40)}%` }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Empty state ── */}
            {!isLoading && !isError && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <ClipboardList className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {hasActiveFilters
                      ? "No orders match your filters"
                      : "No orders yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {hasActiveFilters
                      ? "Try widening your search criteria"
                      : "Orders will appear here once received"}
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

            {/* ── Data table ── */}
            {!isLoading && !isError && filtered.length > 0 && (
              <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                <table className="w-full text-[11px]">
                  <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">
                        {t("pages.pharmacy.th_order", "Order")}
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        {t("pages.pharmacy.th_patient", "Patient")}
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        {t("pages.pharmacy.th_items", "Items")}
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        {t("pages.pharmacy.th_total", "Total")}
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Source
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        {t("pages.pharmacy.th_status", "Status")}
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
                        {/* Order number — ORD-ABC123 */}
                        <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground/70">
                          {o.order_number}
                        </td>

                        {/* Patient name + delivery address sub-line */}
                        <td className="px-4 py-3 font-semibold text-[11px] text-foreground">
                          {o.patient.name}
                          {o.delivery_type === "delivery" &&
                            o.delivery_address && (
                              <span className="block text-[10px] font-normal text-muted-foreground/60 mt-0.5 truncate max-w-[160px]">
                                {o.delivery_address}
                              </span>
                            )}
                        </td>

                        {/* Number of line items */}
                        <td className="px-4 py-3 tabular-nums text-foreground">
                          {o.items.length}
                        </td>

                        {/* Total amount with currency */}
                        <td className="px-4 py-3 font-bold tabular-nums text-[12px] text-foreground">
                          {parseFloat(o.total_amount).toLocaleString()}{" "}
                          <span className="font-normal text-[10px] text-muted-foreground">
                            {o.currency}
                          </span>
                        </td>

                        {/* Source badge: internal (violet) / external (orange) */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-[6px] border font-medium capitalize",
                              o.source === "internal"
                                ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900"
                                : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
                            )}
                          >
                            {o.source}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "border text-[9px] px-1.5 py-0 font-medium capitalize",
                              STATUS_STYLES[o.status],
                            )}
                          >
                            <span
                              className={cn(
                                "w-1 h-1 rounded-full mr-1",
                                STATUS_DOT[o.status],
                                o.status === "pending" && "animate-pulse",
                              )}
                            />
                            {o.status}
                          </Badge>
                        </td>

                        {/* Action buttons (Accept/Reject/Complete/Receipt) */}
                        <td className="px-4 py-3 text-right">
                          <OrderActions order={o} />
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
    </DashboardLayout>
  );
};

export default PharmacyOrders;
