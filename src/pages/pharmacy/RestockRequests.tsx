import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  PackagePlus,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  X,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  useGetStockRequests,
  useApproveStockRequest,
  useReceiveStock,
  useRejectStockRequest,
  useDeleteStockRequest,
  useCreateStockRequest,
  type StockRequest,
  type StockRequestStatus,
  type CreateStockRequestPayload,
  type ReceiveStockPayload,
} from "@/hooks/pharmacy/use-inventory-stock";
import {
  useGetInventoryMedicines,
  type Medicine,  // already exists in the medicines hook file
} from "@/hooks/pharmacy/use-inventory-medicines";


// ─── Visual config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<StockRequestStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  approved:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  received:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<StockRequestStatus, string> = {
  pending: "bg-amber-500",
  approved: "bg-sky-500",
  received: "bg-emerald-500",
  rejected: "bg-red-500",
};

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  search: string;
  status: StockRequestStatus | "all";
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
};

// ─── Sidebar sub-components (mirrors PharmacyOrders exactly) ─────────────────

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
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left flex items-center gap-2",
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

// ─── Modal shell (themed to match the dashboard) ──────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border/70 rounded-sm shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
          <h2 className="text-[12px] font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// shared input class to keep forms consistent
const inputCls =
  "w-full bg-background border border-border/60 rounded-sm px-3 py-1.5 text-[11px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";

const labelCls = "block text-[11px] font-medium text-muted-foreground mb-1";

// ─── Create Request Modal ─────────────────────────────────────────────────────

// ─── Create Request Modal ─────────────────────────────────────────────────────

function CreateRequestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { mutate, isPending, error } = useCreateStockRequest();
  const { data: medicinesData, isLoading: loadingMeds } = useGetInventoryMedicines();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreateStockRequestPayload>({
    medicine_id: 0,
    requested_quantity: 1,
    notes: "",
  });

  const medicines = medicinesData?.data ?? [];

  const filteredMeds = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return medicines;
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.generic_name ?? "").toLowerCase().includes(q),
    );
  }, [medicines, search]);

  const selectedMed = medicines.find((m) => m.id === form.medicine_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicine_id) return;
    mutate(form, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title="New Stock Request">
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Medicine dropdown */}
        <div>
          <label className={labelCls}>Medicine <span className="text-red-500">*</span></label>
          {loadingMeds ? (
            <div className={cn(inputCls, "flex items-center gap-2 text-muted-foreground/60")}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading medicines…
            </div>
          ) : (
            <div className="relative">
              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search medicine…"
                  className={cn(inputCls, "pl-7")}
                />
              </div>

              {/* Selected indicator */}
              {selectedMed && (
                <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-sm bg-primary/8 border border-primary/20 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="font-semibold text-primary">{selectedMed.name}</span>
                  {selectedMed.generic_name && (
                    <span className="text-muted-foreground/60">· {selectedMed.generic_name}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, medicine_id: 0 })); setSearch(""); }}
                    className="ml-auto text-muted-foreground/50 hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Dropdown list — shows when searching or no selection yet */}
              {(!selectedMed || search) && filteredMeds.length > 0 && (
                <div className="mt-1 border border-border/60 rounded-sm bg-card shadow-md max-h-44 overflow-y-auto">
                  {filteredMeds.map((med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, medicine_id: med.id }));
                        setSearch("");
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[11px] hover:bg-secondary/40 transition-colors flex items-center justify-between gap-2 border-b border-border/30 last:border-b-0",
                        form.medicine_id === med.id && "bg-primary/8 text-primary",
                      )}
                    >
                      <span>
                        <span className="font-medium">{med.name}</span>
                        {med.generic_name && (
                          <span className="text-muted-foreground/60 ml-1.5">{med.generic_name}</span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                        #{med.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!selectedMed && search && filteredMeds.length === 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground/60 px-1">
                  No medicines match "{search}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className={labelCls}>Requested Quantity</label>
          <input
            type="number"
            required
            min={1}
            value={form.requested_quantity}
            onChange={(e) =>
              setForm((f) => ({ ...f, requested_quantity: Number(e.target.value) }))
            }
            className={inputCls}
          />
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>
            Notes{" "}
            <span className="text-muted-foreground/50 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={cn(inputCls, "resize-none")}
            placeholder="e.g. Running low on this one"
          />
        </div>

        {error && (
          <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-sm px-3 py-2">
            {error.message}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !form.medicine_id}
            className="flex-1 h-7 text-[11px] font-semibold rounded-sm shadow-sm"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
// ─── Receive Modal ────────────────────────────────────────────────────────────

function ReceiveModal({
  request,
  onClose,
}: {
  request: StockRequest | null;
  onClose: () => void;
}) {
  const { mutate, isPending, error } = useReceiveStock();
  const [form, setForm] = useState<ReceiveStockPayload>({
    received_quantity: undefined,
    batch_number: "",
    expiry_date: "",
  });

  if (!request) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(
      {
        id: request.id,
        payload: {
          received_quantity: form.received_quantity || undefined,
          batch_number: form.batch_number || undefined,
          expiry_date: form.expiry_date || undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open={!!request} onClose={onClose} title="Receive Stock">
      <p className="text-[11px] text-muted-foreground mb-4">
        Confirming receipt for{" "}
        <strong className="text-foreground">
          {request.medicine?.name ?? `Medicine #${request.medicine_id}`}
        </strong>
        . Requested:{" "}
        <strong className="text-foreground">
          {request.requested_quantity}
        </strong>{" "}
        units.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>
            Received Quantity{" "}
            <span className="text-muted-foreground/50 font-normal">
              (leave blank for full amount)
            </span>
          </label>
          <input
            type="number"
            min={1}
            value={form.received_quantity ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                received_quantity: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              }))
            }
            className={inputCls}
            placeholder={String(request.requested_quantity)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Batch Number</label>
            <input
              type="text"
              value={form.batch_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, batch_number: e.target.value }))
              }
              className={inputCls}
              placeholder="BATCH-003"
            />
          </div>
          <div>
            <label className={labelCls}>Expiry Date</label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiry_date: e.target.value }))
              }
              className={inputCls}
            />
          </div>
        </div>
        {error && (
          <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-sm px-3 py-2">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="flex-1 h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-sm"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            Confirm Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({
  request,
  onClose,
}: {
  request: StockRequest | null;
  onClose: () => void;
}) {
  const { mutate, isPending, error } = useRejectStockRequest();
  const [reason, setReason] = useState("");

  if (!request) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ id: request.id, reason }, { onSuccess: onClose });
  };

  return (
    <Modal open={!!request} onClose={onClose} title="Reject Request">
      <p className="text-[11px] text-muted-foreground mb-4">
        Rejecting request for{" "}
        <strong className="text-foreground">
          {request.medicine?.name ?? `Medicine #${request.medicine_id}`}
        </strong>
        .
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={cn(inputCls, "resize-none")}
            placeholder="e.g. Out of budget this month"
          />
        </div>
        {error && (
          <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-sm px-3 py-2">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !reason.trim()}
            className="flex-1 h-7 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-sm shadow-sm"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            Reject
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Per-row action buttons ───────────────────────────────────────────────────

function RequestActions({
  request,
  onReceive,
  onReject,
}: {
  request: StockRequest;
  onReceive: (r: StockRequest) => void;
  onReject: (r: StockRequest) => void;
}) {
  const { mutate: approve, isPending: approving } = useApproveStockRequest();
  const { mutate: deleteReq, isPending: deleting } = useDeleteStockRequest();
  const busy = approving || deleting;

  // pending → Approve + Reject + Delete
  if (request.status === "pending") {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => deleteReq(request.id)}
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 text-muted-foreground hover:bg-secondary/50 transition-all duration-200"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onReject(request)}
          className="h-7 px-3 text-[10px] rounded-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200"
        >
          Reject
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => approve(request.id)}
          className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm transition-all duration-200"
        >
          {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
        </Button>
      </div>
    );
  }

  // approved → Receive + Reject
  if (request.status === "approved") {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReject(request)}
          className="h-7 px-3 text-[10px] rounded-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200"
        >
          Reject
        </Button>
        <Button
          size="sm"
          onClick={() => onReceive(request)}
          className="h-7 px-3 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-sm transition-all duration-200"
        >
          Receive
        </Button>
      </div>
    );
  }

  // received / rejected → nothing actionable
  if (request.status === "rejected" && request.reason) {
    return (
      <span
        className="text-[10px] text-muted-foreground/60 italic truncate max-w-[140px] block text-right"
        title={request.reason}
      >
        {request.reason}
      </span>
    );
  }

  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const RestockRequests = () => {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [showCreate, setShowCreate] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<StockRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<StockRequest | null>(null);

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

  const { data, isLoading, isError, refetch } = useGetStockRequests(
    filters.status === "all" ? undefined : filters.status,
  );

  const requests: StockRequest[] = data?.data ?? [];

  // client-side search only (status is server-side)
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        (r.medicine?.name ?? "").toLowerCase().includes(q) ||
        (r.medicine?.category?.name ?? "").toLowerCase().includes(q) ||
        (r.requester?.name ?? "").toLowerCase().includes(q),
    );
  }, [requests, filters.search]);

  const counts = useMemo(
    () => ({
      pending:  requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      received: requests.filter((r) => r.status === "received").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests],
  );

  // ─── Sidebar ────────────────────────────────────────────────────────────────

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
          <PillGroup<StockRequestStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all",      label: "All statuses" },
              { value: "pending",  label: "Pending",  dot: "bg-amber-500" },
              { value: "approved", label: "Approved", dot: "bg-sky-500" },
              { value: "received", label: "Received", dot: "bg-emerald-500" },
              { value: "rejected", label: "Rejected", dot: "bg-red-500" },
            ]}
          />
        </FilterSection>

        {hasActiveFilters && (
          <div className="py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2">
              Active filters
            </p>
            <div className="flex flex-wrap gap-1">
              {filters.status !== "all" && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20 font-medium">
                  {filters.status}
                  <button onClick={() => set("status", "all")} className="hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20 font-medium">
                  "{filters.search}"
                  <button onClick={() => set("search", "")} className="hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.restock_title", "Restock Requests")}
          subtitle={t("pages.pharmacy.restock_sub", "Manage and track stock replenishment requests")}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Sidebar ── */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto">

            {/* Stat cards */}
            <div className="px-4 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard
                label="Pending"
                value={isLoading ? "—" : counts.pending}
                icon={ClipboardList}
                accent="warning"
              />
              <StatCard
                label="Approved"
                value={isLoading ? "—" : counts.approved}
                icon={PackagePlus}
                accent="info"
              />
              <StatCard
                label="Received"
                value={isLoading ? "—" : counts.received}
                icon={CheckCircle2}
                accent="success"
              />
              <StatCard
                label="Rejected"
                value={isLoading ? "—" : counts.rejected}
                icon={XCircle}
                accent="warning"
              />
            </div>

            {/* Meta bar */}
            <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              {/* Left: count + quick-filter pills */}
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading requests…
                  </span>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {filtered.length}
                    </span>{" "}
                    {filtered.length === 1 ? "request" : "requests"}
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

                {/* Clickable status pills */}
                {!isLoading && (
                  <div className="hidden lg:flex items-center gap-2">
                    {counts.pending > 0 && (
                      <button
                        onClick={() => set("status", "pending")}
                        className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {counts.pending} pending
                      </button>
                    )}
                    {counts.approved > 0 && (
                      <button
                        onClick={() => set("status", "approved")}
                        className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        {counts.approved} approved
                      </button>
                    )}
                    {counts.received > 0 && (
                      <button
                        onClick={() => set("status", "received")}
                        className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {counts.received} received
                      </button>
                    )}
                    {counts.rejected > 0 && (
                      <button
                        onClick={() => set("status", "rejected")}
                        className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {counts.rejected} rejected
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right: refresh + search + new request */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetch()}
                  title="Refresh"
                  className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                </button>

                {/* Client-side search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search medicine, requester…"
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={() => setShowCreate(true)}
                  className="h-7 px-3 text-[11px] font-semibold rounded-sm shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  New Request
                </Button>
              </div>
            </div>

            {/* Table area */}
            <div className="p-4">

              {/* Error state */}
              {isError && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      Failed to load requests
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Check your connection and try again
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetch()}
                    className="text-[11px] h-7 px-3 rounded-sm mt-1"
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Retry
                  </Button>
                </div>
              )}

              {/* Loading skeleton */}
              {isLoading && (
                <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        {["Medicine", "Requested", "Received", "Status", "Requester", "Date", ""].map(
                          (h) => (
                            <th key={h} className="text-left px-4 py-3 font-semibold">
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

              {/* Empty state */}
              {!isLoading && !isError && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <ClipboardList className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      {hasActiveFilters
                        ? "No requests match your filters"
                        : "No stock requests yet"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {hasActiveFilters
                        ? "Try widening your search criteria"
                        : "Create one using the button above"}
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

              {/* Data table */}
              {!isLoading && !isError && filtered.length > 0 && (
                <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Medicine</th>
                        <th className="text-left px-4 py-3 font-semibold">Requested</th>
                        <th className="text-left px-4 py-3 font-semibold">Received</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="text-left px-4 py-3 font-semibold">Requester</th>
                        <th className="text-left px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((req) => (
                        <tr
                          key={req.id}
                          className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150"
                        >
                          {/* Medicine */}
                          <td className="px-4 py-3 font-semibold text-[11px] text-foreground">
                            {req.medicine?.name ?? `Medicine #${req.medicine_id}`}
                            {req.medicine?.category?.name && (
                              <span className="block text-[10px] font-normal text-muted-foreground/60 mt-0.5">
                                {req.medicine.category.name}
                              </span>
                            )}
                          </td>

                          {/* Requested qty */}
                          <td className="px-4 py-3 tabular-nums font-bold text-[12px] text-foreground">
                            {req.requested_quantity.toLocaleString()}
                          </td>

                          {/* Received qty */}
                          <td className="px-4 py-3 tabular-nums text-foreground">
                            {req.received_quantity != null
                              ? req.received_quantity.toLocaleString()
                              : <span className="text-muted-foreground/40">—</span>}
                          </td>

                          {/* Status badge */}
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border text-[9px] px-1.5 py-0 font-medium capitalize",
                                STATUS_STYLES[req.status],
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1 h-1 rounded-full mr-1",
                                  STATUS_DOT[req.status],
                                  req.status === "pending" && "animate-pulse",
                                )}
                              />
                              {req.status}
                            </Badge>
                          </td>

                          {/* Requester */}
                          <td className="px-4 py-3 text-muted-foreground">
                            {req.requester?.name ?? (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-muted-foreground/70 text-[10px] whitespace-nowrap">
                            {new Date(req.created_at).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <RequestActions
                              request={req}
                              onReceive={setReceiveTarget}
                              onReject={setRejectTarget}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination footer */}
                  {data && data.last_page > 1 && (
                    <div className="px-4 py-2.5 border-t border-border/60 text-[10px] text-muted-foreground/70 flex items-center justify-between bg-secondary/10">
                      <span>
                        Page {data.current_page} of {data.last_page} · {data.total} total
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      <CreateRequestModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ReceiveModal request={receiveTarget} onClose={() => setReceiveTarget(null)} />
      <RejectModal request={rejectTarget} onClose={() => setRejectTarget(null)} />
    </DashboardLayout>
  );
};

export default RestockRequests;
