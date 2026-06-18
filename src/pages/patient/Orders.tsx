import { useState, useMemo, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  LayoutGrid,
  Rows3,
  Loader2,
  AlertCircle,
  RefreshCw,
  Truck,
  Store,
  CalendarDays,
  PackageCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetPatientPharmacyOrders,
  useCancelPatientPharmacyOrder,
  type OrderFilters,
  type PharmacyOrder,
  type OrderStatus,
} from "@/hooks/patient/use-patient-pharmacy-orders";

// ─── Constants ─────────────────────────────────────────────────────────────

const ALL_STATUSES: OrderStatus[] = [
  "draft",
  "pending",
  "accepted",
  "completed",
  "cancelled",
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
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

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-semibold uppercase tracking-wide",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function DeliveryBadge({ type }: { type: "pickup" | "home_delivery" }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
      {type === "home_delivery" ? (
        <><Truck className="w-4 h-4" />Home delivery</>
      ) : (
        <><Store className="w-4 h-4" />Pickup</>
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
            "px-2 py-2 rounded-sm text-xs text-start  font-medium border transition-colors",
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
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground/50 w-5">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="flex-1 px-2 py-0.5 text-xs bg-background border border-border/50 rounded-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground/50 w-5">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="flex-1 px-2 py-0.5 text-xs bg-background border border-border/50 rounded-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground"
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
          <div className="h-3 bg-muted/40 rounded-sm animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-sm border border-border/50 bg-card p-3 space-y-2 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-24 bg-muted/40 rounded-sm" />
        <div className="h-4 w-16 bg-muted/40 rounded-sm" />
      </div>
      <div className="h-2.5 w-36 bg-muted/30 rounded-sm" />
      <div className="h-2.5 w-28 bg-muted/30 rounded-sm" />
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
  const canCancel = order.status === "draft" || order.status === "pending";
  return (
    <div
      className="rounded-sm border border-border/60 bg-card p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow cursor-pointer group"
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
            <span className="text-muted-foreground/45"> · qty {item.quantity}</span>
          </span>
        ))}
        {order.items.length > 2 && (
          <span className="text-xs text-muted-foreground/40">+{order.items.length - 2} more</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <div className="flex items-center gap-2">
          <DeliveryBadge type={order.delivery_type} />
          <span className="text-xs text-muted-foreground/40">
            {new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs rounded-sm border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 gap-1"
              onClick={() => onCancel(order)}
            >
              <X className="h-2 w-2" />Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail Drawer ────────────────────────────────────────────────────

function OrderDrawer({
  order,
  onClose,
  onCancel,
}: {
  order: PharmacyOrder | null;
  onClose: () => void;
  onCancel: (o: PharmacyOrder) => void;
}) {
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
                <p className="text-xs font-semibold text-foreground">Order #{order.id}</p>
                <p className="text-xs text-muted-foreground/60">{order.pharmacy.name}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-secondary/50 text-muted-foreground transition-colors">
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
              <div className="rounded-sm border border-border/50 bg-secondary/10 p-2.5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Pharmacy</p>
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
                  Items ({order.items.length})
                </p>
                <div className="space-y-1.5">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-sm border border-border/40 bg-secondary/10 px-2.5 py-1.5">
                      <div>
                        <p className="text-xs font-medium text-foreground">{item.medicine_name}</p>
                        {item.dosage && <p className="text-xs text-muted-foreground/50">{item.dosage}</p>}
                      </div>
                      <span className="text-xs font-semibold text-foreground bg-secondary/50 px-1.5 py-0.5 rounded-sm">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery address */}
              {order.delivery_address && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Delivery address</p>
                  <p className="text-xs text-foreground/80">{order.delivery_address}</p>
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Notes</p>
                  <p className="text-xs text-foreground/80">{order.notes}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-sm border border-border/40 bg-secondary/10 px-2.5 py-1.5">
                  <p className="text-xs text-muted-foreground/50">Placed</p>
                  <p className="text-xs font-medium text-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="rounded-sm border border-border/40 bg-secondary/10 px-2.5 py-1.5">
                  <p className="text-xs text-muted-foreground/50">Updated</p>
                  <p className="text-xs font-medium text-foreground">
                    {new Date(order.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>

            {canCancel && (
              <div className="px-4 py-3 border-t border-border/50">
                <Button
                  className="w-full h-8 text-xs rounded-sm bg-red-600 hover:bg-red-700 text-white gap-1.5"
                  onClick={() => onCancel(order)}
                >
                  <X className="h-4 w-4" />
                  {order.status === "draft" ? "Delete draft" : "Cancel order"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Cancel Confirmation Modal ───────────────────────────────────────────────

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
  if (!order) return null;
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-black/50" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-sm shadow-lg w-full max-w-xs p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-sm bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {order.status === "draft" ? "Delete this draft?" : "Cancel this order?"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {order.status === "draft"
                  ? "This draft will be permanently removed."
                  : `Order #${order.id} at ${order.pharmacy.name} will be cancelled.`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 h-7 text-xs rounded-sm"
              onClick={onClose}
              disabled={isPending}
            >
              Keep it
            </Button>
            <Button
              className="flex-1 h-7 text-xs rounded-sm bg-red-600 hover:bg-red-700 text-white gap-1"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              {order.status === "draft" ? "Delete" : "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const Orders = () => {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
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

  // ─── Sidebar ───────────────────────────────────────────────────────────────

  const sidebarContent = (
    <>
      <div className="px-3 pt-3.5 pb-2.5 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-primary hover:text-primary/70 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-4 h-4" />Reset
          </button>
        )}
      </div>
      <div className="px-3 flex flex-col gap-2">
        <FilterSection title="Status">
          <PillGroup<OrderStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all", label: "All statuses" },
              ...ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
            ]}
          />
        </FilterSection>
        <FilterSection title="Date range">
          <DateRangeInput
            from={filters.from}
            to={filters.to}
            onFrom={(v) => set("from", v)}
            onTo={(v) => set("to", v)}
          />
        </FilterSection>
        <FilterSection title="Sort">
          <PillGroup<SortMode>
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title="My Orders"
          subtitle="Track and manage your pharmacy orders"
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-52 flex-shrink-0 border-r border-border/50 bg-card/40 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile filter drawer */}
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
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-colors"
              >
                Show results
              </button>
            </div>
          </div>

          {/* Main */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats */}
            <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Pending" value={pendingCount} icon={Clock} accent="warning" />
              <StatCard label="Accepted" value={acceptedCount} icon={PackageCheck} accent="primary" />
              <StatCard label="Completed" value={completedCount} icon={CheckCircle2} accent="success" />
              <StatCard label="Cancelled" value={cancelledCount} icon={XCircle} accent="primary" />
            </div>

            {/* Toolbar */}
            <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {isLoading ? (
                    <span className="text-muted-foreground/40">Loading…</span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{orders.length}</span>{" "}
                      {orders.length === 1 ? "order" : "orders"}
                    </>
                  )}
                  {hasActiveFilters && !isLoading && (
                    <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/70 hover:underline text-xs font-medium">
                      Reset filters
                    </button>
                  )}
                </p>
                {isFetching && !isLoading && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
                    <Loader2 className="w-4 h-4 animate-spin" />Refreshing
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search pharmacy, medicine…"
                    className="w-48 pl-7 pr-2.5 py-1 text-xs bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/35 transition-all"
                  />
                </div>

                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => set("sort", e.target.value as SortMode)}
                    className="appearance-none pl-2 pr-6 py-1 text-xs bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                  >
                    <option value="date-desc">Latest first</option>
                    <option value="date-asc">Oldest first</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                </div>

                <div className="flex rounded-sm border border-border/50 overflow-hidden bg-card">
                  <button
                    onClick={() => setView("table")}
                    aria-label="Table view"
                    className={cn("px-2 py-1 transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Rows3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView("cards")}
                    aria-label="Card view"
                    className={cn("px-2 py-1 border-l border-border/50 transition-colors", view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1 px-2.5 py-1 rounded-sm border text-xs transition-colors",
                    hasActiveFilters ? "bg-primary text-white border-primary" : "border-border/50 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {isError && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="w-12 h-12 rounded-sm bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Failed to load orders</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Please check your connection and try again.</p>
                  </div>
                  <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 font-semibold">
                    <RefreshCw className="w-4 h-4" />Retry
                  </button>
                </div>
              )}

              {isLoading && !isError && (
                view === "table" ? (
                  <div className="rounded-sm border border-border/60 bg-card overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
                        <tr>
                          {["Pharmacy", "Items", "Delivery", "Date", "Status", ""].map((h) => (
                            <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
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
                  <div className="w-12 h-12 rounded-sm bg-muted/50 flex items-center justify-center border border-border/30">
                    <ShoppingBag className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {hasActiveFilters ? "No orders match your filters" : "No orders yet"}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {hasActiveFilters ? "Try widening your search criteria" : "Orders sent to a pharmacy will appear here"}
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="text-xs text-primary hover:text-primary/70 font-semibold hover:underline">
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* Table view */}
              {!isLoading && !isError && orders.length > 0 && view === "table" && (
                <div className="rounded-sm border border-border/60 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
                      <tr>
                        {["Pharmacy", "Items", "Delivery", "Date", "Status", ""].map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
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
                                    <span className="text-muted-foreground/45"> ×{item.quantity}</span>
                                  </span>
                                ))}
                                {order.items.length > 2 && (
                                  <span className="text-xs text-muted-foreground/40">+{order.items.length - 2} more</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <DeliveryBadge type={order.delivery_type} />
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground/60 text-xs">
                              <div className="flex items-center gap-1">
                                <CalendarDays className="w-4 h-4" />
                                {new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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
                                  className="h-6 px-2 text-xs rounded-sm border-border/50 hover:border-primary/30 hover:bg-secondary/30"
                                  onClick={() => handleViewDetails(order)}
                                >
                                  Details
                                </Button>
                                {canCancel && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs rounded-sm border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 gap-1"
                                    onClick={() => handleCancel(order)}
                                  >
                                    <X className="h-2 w-2" />
                                    {order.status === "draft" ? "Delete" : "Cancel"}
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
      </div>

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
