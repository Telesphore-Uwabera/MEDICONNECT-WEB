import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Package,
  Search,
  ChevronDown,
  SlidersHorizontal,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

import {
  useGetInventoryMedicines,
  useCreateMedicine,
  useUpdateMedicine,
  useDeleteMedicine,
  type Medicine,
  type MedicineUnit,
  type CreateMedicinePayload,
  type UpdateMedicinePayload,
  type ListMedicinesParams,
} from "@/hooks/pharmacy/use-inventory-medicines";

import {
  useGetInventoryCategories,
  type Category,
} from "@/hooks/pharmacy/use-pharmacy-inventory-categories";

// ─── Visual config ────────────────────────────────────────────────────────────

type StockStatus = "in-stock" | "low" | "out";

function resolveStockStatus(m: Medicine): StockStatus {
  const qty = m.stock?.quantity ?? 0;
  const threshold = m.stock?.low_stock_threshold ?? 10;
  if (qty === 0) return "out";
  if (qty <= threshold) return "low";
  return "in-stock";
}

const STOCK_STYLES: Record<StockStatus, string> = {
  "in-stock":
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  low: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  out: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

const STATUS_LABELS: Record<StockStatus, string> = {
  "in-stock": "In Stock",
  low: "Low Stock",
  out: "Out of Stock",
};

const UNIT_OPTIONS: MedicineUnit[] = [
  "tablet", "capsule", "syrup", "injection", "cream", "drops", "sachet", "other",
];

type SortOption = "name" | "stock-asc" | "stock-desc" | "price-asc" | "price-desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name",        label: "Name (A–Z)" },
  { value: "stock-desc",  label: "Stock: Most first" },
  { value: "stock-asc",   label: "Stock: Least first" },
  { value: "price-asc",   label: "Price: Low to high" },
  { value: "price-desc",  label: "Price: High to low" },
];

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  search: string;
  status: StockStatus | "all";
  categoryId: number | "all";
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  categoryId: "all",
  sort: "name",
};

// ─── Sidebar atoms (identical to PharmacyOrders / RestockRequests) ────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string | number>({
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
          key={String(o.value)}
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

// ─── Modal shell ──────────────────────────────────────────────────────────────

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border/70 rounded-sm shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 flex-shrink-0">
          <h2 className="text-[12px] font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-background border border-border/60 rounded-sm px-3 py-1.5 text-[11px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";
const labelCls = "block text-[11px] font-medium text-muted-foreground mb-1";

// ─── Add / Edit Medicine Modal ────────────────────────────────────────────────

type MedicineFormData = {
  name: string;
  generic_name: string;
  category_id: string;
  description: string;
  price: string;
  currency: string;
  unit: MedicineUnit;
  requires_prescription: boolean;
  barcode: string;
  // create-only stock fields
  initial_quantity: string;
  low_stock_threshold: string;
  batch_number: string;
  expiry_date: string;
};

const BLANK_FORM: MedicineFormData = {
  name: "",
  generic_name: "",
  category_id: "",
  description: "",
  price: "",
  currency: "RWF",
  unit: "tablet",
  requires_prescription: false,
  barcode: "",
  initial_quantity: "",
  low_stock_threshold: "",
  batch_number: "",
  expiry_date: "",
};

function medicineToForm(m: Medicine): MedicineFormData {
  return {
    name: m.name,
    generic_name: m.generic_name ?? "",
    category_id: m.category_id ? String(m.category_id) : "",
    description: m.description ?? "",
    price: m.price,
    currency: m.currency,
    unit: m.unit,
    requires_prescription: m.requires_prescription,
    barcode: m.barcode ?? "",
    initial_quantity: "",
    low_stock_threshold: "",
    batch_number: "",
    expiry_date: "",
  };
}

function MedicineFormModal({
  open,
  onClose,
  editing,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  editing: Medicine | null;
  categories: Category[];
}) {
  const isEdit = editing != null;
  const { mutate: create, isPending: creating, error: createErr } = useCreateMedicine();
  const { mutate: update, isPending: updating, error: updateErr } = useUpdateMedicine();
  const isPending = creating || updating;
  const error = createErr ?? updateErr;

  const [form, setForm] = useState<MedicineFormData>(BLANK_FORM);

  useEffect(() => {
    setForm(editing ? medicineToForm(editing) : BLANK_FORM);
  }, [editing, open]);

  const set = <K extends keyof MedicineFormData>(k: K, v: MedicineFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      const payload: UpdateMedicinePayload = {
        name: form.name,
        generic_name: form.generic_name || undefined,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        description: form.description || undefined,
        price: Number(form.price),
        currency: form.currency,
        unit: form.unit,
        requires_prescription: form.requires_prescription,
        barcode: form.barcode || undefined,
      };
      update({ id: editing!.id, payload }, { onSuccess: onClose });
    } else {
      const payload: CreateMedicinePayload = {
        name: form.name,
        price: Number(form.price),
        unit: form.unit,
        generic_name: form.generic_name || undefined,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        description: form.description || undefined,
        currency: form.currency,
        requires_prescription: form.requires_prescription,
        barcode: form.barcode || undefined,
        initial_quantity: form.initial_quantity ? Number(form.initial_quantity) : undefined,
        low_stock_threshold: form.low_stock_threshold ? Number(form.low_stock_threshold) : undefined,
        batch_number: form.batch_number || undefined,
        expiry_date: form.expiry_date || undefined,
      };
      create(payload, { onSuccess: onClose });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Medicine" : "Add Medicine"}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Row 1: name + generic */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Name <span className="text-red-500">*</span></label>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)}
              className={inputCls} placeholder="Amoxicillin 500mg" />
          </div>
          <div>
            <label className={labelCls}>Generic Name</label>
            <input value={form.generic_name} onChange={(e) => set("generic_name", e.target.value)}
              className={inputCls} placeholder="Amoxicillin" />
          </div>
        </div>

        {/* Row 2: category + unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Category</label>
            <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}
              className={inputCls}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Unit <span className="text-red-500">*</span></label>
            <select required value={form.unit} onChange={(e) => set("unit", e.target.value as MedicineUnit)}
              className={inputCls}>
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: price + currency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Price <span className="text-red-500">*</span></label>
            <input required type="number" min={0} step="0.01" value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className={inputCls} placeholder="1200" />
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <input value={form.currency} onChange={(e) => set("currency", e.target.value)}
              className={inputCls} placeholder="RWF" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description</label>
          <textarea rows={2} value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={cn(inputCls, "resize-none")} placeholder="Optional description…" />
        </div>

        {/* Barcode + Prescription */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Barcode</label>
            <input value={form.barcode} onChange={(e) => set("barcode", e.target.value)}
              className={inputCls} placeholder="123456789" />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.requires_prescription}
                onChange={(e) => set("requires_prescription", e.target.checked)}
                className="w-3.5 h-3.5 accent-primary" />
              <span className="text-[11px] text-muted-foreground">Requires prescription</span>
            </label>
          </div>
        </div>

        {/* Stock fields — create only */}
        {!isEdit && (
          <>
            <div className="pt-1 border-t border-border/40">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                Initial Stock
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Quantity</label>
                  <input type="number" min={0} value={form.initial_quantity}
                    onChange={(e) => set("initial_quantity", e.target.value)}
                    className={inputCls} placeholder="100" />
                </div>
                <div>
                  <label className={labelCls}>Low Stock Threshold</label>
                  <input type="number" min={0} value={form.low_stock_threshold}
                    onChange={(e) => set("low_stock_threshold", e.target.value)}
                    className={inputCls} placeholder="10" />
                </div>
                <div>
                  <label className={labelCls}>Batch Number</label>
                  <input value={form.batch_number}
                    onChange={(e) => set("batch_number", e.target.value)}
                    className={inputCls} placeholder="BATCH-001" />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input type="date" value={form.expiry_date}
                    onChange={(e) => set("expiry_date", e.target.value)}
                    className={inputCls} />
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-sm px-3 py-2">
            {error.message}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-sm">
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}
            className="flex-1 h-7 text-[11px] font-semibold rounded-sm shadow-sm">
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            {isEdit ? "Save Changes" : "Add Medicine"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  medicine,
  onClose,
}: {
  medicine: Medicine | null;
  onClose: () => void;
}) {
  const { mutate, isPending, error } = useDeleteMedicine();
  if (!medicine) return null;
  return (
    <Modal open={!!medicine} onClose={onClose} title="Remove Medicine">
      <p className="text-[11px] text-muted-foreground mb-4">
        This will permanently remove{" "}
        <strong className="text-foreground">{medicine.name}</strong> from your inventory.
        This action cannot be undone.
      </p>
      {error && (
        <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-sm px-3 py-2 mb-3">
          {error.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onClose}
          className="flex-1 h-7 text-[11px] rounded-sm">
          Cancel
        </Button>
        <Button size="sm" disabled={isPending}
          onClick={() => mutate(medicine.id, { onSuccess: onClose })}
          className="flex-1 h-7 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-sm shadow-sm">
          {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
          Remove
        </Button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PharmacyInventory = () => {
  const { t } = useTranslation();

  // ── filter state ────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // ── modal state ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Medicine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);

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

  // lock body scroll when mobile filter sheet is open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  // ── API: categories (for sidebar pills + form select) ───────────────────────
  const { data: catData } = useGetInventoryCategories();
  const categories: Category[] = catData ?? [];

  // ── API: medicines (server-side category + low_stock filter) ────────────────
  // Search and status are client-side to keep UX snappy.
  const apiParams: ListMedicinesParams = useMemo(
    () => ({
      ...(filters.categoryId !== "all" && { category_id: filters.categoryId as number }),
      // low_stock flag when user picks "low" or "out" status filter
      ...(filters.status === "low" && { low_stock: true as const }),
    }),
    [filters.categoryId, filters.status],
  );

  const { data, isLoading, isError, refetch } = useGetInventoryMedicines(apiParams);
  const medicines: Medicine[] = data?.data ?? [];

  // ── client-side search + status filter + sort ────────────────────────────────
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();

    return medicines
      .filter((m) => {
        // status
        if (filters.status !== "all") {
          const s = resolveStockStatus(m);
          if (filters.status === "out"      && s !== "out")      return false;
          if (filters.status === "low"      && s !== "low")      return false;
          if (filters.status === "in-stock" && s !== "in-stock") return false;
        }
        // search
        if (q) {
          return (
            m.name.toLowerCase().includes(q) ||
            (m.generic_name ?? "").toLowerCase().includes(q) ||
            (m.category?.name ?? "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const qa = a.stock?.quantity ?? 0;
        const qb = b.stock?.quantity ?? 0;
        switch (filters.sort) {
          case "stock-asc":  return qa - qb;
          case "stock-desc": return qb - qa;
          case "price-asc":  return parseFloat(a.price) - parseFloat(b.price);
          case "price-desc": return parseFloat(b.price) - parseFloat(a.price);
          default:           return a.name.localeCompare(b.name);
        }
      });
  }, [medicines, filters.search, filters.status, filters.sort]);

  // ── stat counts ──────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const all = medicines;
    return {
      total:    all.length,
      inStock:  all.filter((m) => resolveStockStatus(m) === "in-stock").length,
      low:      all.filter((m) => resolveStockStatus(m) === "low").length,
      out:      all.filter((m) => resolveStockStatus(m) === "out").length,
    };
  }, [medicines]);

  // ── sidebar ──────────────────────────────────────────────────────────────────
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
          <button onClick={clearAll}
            className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        {/* Stock status */}
        <FilterSection title="Stock Status">
          <PillGroup<StockStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all",      label: "All statuses" },
              { value: "in-stock", label: "In stock",      dot: "bg-emerald-500" },
              { value: "low",      label: "Low stock",     dot: "bg-amber-500" },
              { value: "out",      label: "Out of stock",  dot: "bg-red-500" },
            ]}
          />
        </FilterSection>

        {/* Category — driven by real API data */}
        <FilterSection title="Category">
          <PillGroup<number | "all">
            value={filters.categoryId}
            onChange={(v) => set("categoryId", v)}
            options={[
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </FilterSection>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2">
              Active filters
            </p>
            <div className="flex flex-wrap gap-1">
              {filters.status !== "all" && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20 font-medium">
                  {STATUS_LABELS[filters.status]}
                  <button onClick={() => set("status", "all")} className="hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {filters.categoryId !== "all" && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20 font-medium">
                  {categories.find((c) => c.id === filters.categoryId)?.name ?? "Category"}
                  <button onClick={() => set("categoryId", "all")} className="hover:opacity-70">
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
          title={t("pages.pharmacy.inventory_title", "Inventory")}
          subtitle={t("pages.pharmacy.inventory_sub", "Manage medicines, stock levels and pricing")}
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
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile bottom-sheet */}
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

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">

            {/* Stat cards */}
            <div className="px-4 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard
                label="Total Items"
                value={isLoading ? "—" : counts.total}
                icon={Package}
                accent="primary"
              />
              <StatCard
                label="In Stock"
                value={isLoading ? "—" : counts.inStock}
                icon={CheckCircle2}
                accent="success"
              />
              <StatCard
                label="Low Stock"
                value={isLoading ? "—" : counts.low}
                icon={AlertTriangle}
                accent="warning"
              />
              <StatCard
                label="Out of Stock"
                value={isLoading ? "—" : counts.out}
                icon={AlertCircle}
                accent="danger"
              />
            </div>

            {/* Meta bar */}
            <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              {/* Left */}
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading medicines…
                  </span>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-bold text-foreground">{filtered.length}</span>{" "}
                    {filtered.length === 1 ? "item" : "items"}
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

                {/* Quick-status pills */}
                {!isLoading && (
                  <div className="hidden lg:flex items-center gap-2">
                    {counts.out > 0 && (
                      <button
                        onClick={() => set("status", "out")}
                        className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {counts.out} out of stock
                      </button>
                    )}
                    {counts.low > 0 && (
                      <button
                        onClick={() => set("status", "low")}
                        className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {counts.low} low stock
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetch()}
                  title="Refresh"
                  className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                </button>

                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search medicine or category…"
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
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/* Add medicine button */}
                <Button
                  size="sm"
                  onClick={() => { setEditTarget(null); setFormOpen(true); }}
                  className="hidden sm:flex h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t("pages.pharmacy.add_stock", "Add Medicine")}
                </Button>

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
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              </div>
            </div>

            {/* Table area */}
            <div className="p-4">

              {/* Error */}
              {isError && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">Failed to load medicines</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">Check your connection and try again</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => refetch()}
                    className="text-[11px] h-7 px-3 rounded-sm mt-1">
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
                        {["Medicine", "Category", "Stock", "Price", "Status", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 7 }).map((_, i) => (
                        <tr key={i} className="border-t border-border/40">
                          {Array.from({ length: 6 }).map((_, j) => (
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
                    <Package className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      {hasActiveFilters ? "No medicines match your filters" : "No medicines yet"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {hasActiveFilters ? "Try widening your search criteria" : "Add your first medicine to get started"}
                    </p>
                  </div>
                  {hasActiveFilters ? (
                    <button onClick={clearAll}
                      className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
                      Clear all filters
                    </button>
                  ) : (
                    <Button size="sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}
                      className="h-7 px-3 text-[11px] rounded-sm mt-1">
                      <Plus className="w-3 h-3 mr-1.5" />
                      Add Medicine
                    </Button>
                  )}
                </div>
              )}

              {/* Data table */}
              {!isLoading && !isError && filtered.length > 0 && (
                <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_medicine", "Medicine")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_category", "Category")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_stock", "Stock")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_price", "Price")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("pages.pharmacy.th_status", "Status")}
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((m) => {
                        const status = resolveStockStatus(m);
                        return (
                          <tr
                            key={m.id}
                            className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150"
                          >
                            {/* Medicine name + generic */}
                            <td className="px-4 py-3 font-semibold text-[11px] text-foreground">
                              {m.name}
                              {m.generic_name && (
                                <span className="block text-[10px] font-normal text-muted-foreground/60 mt-0.5">
                                  {m.generic_name}
                                </span>
                              )}
                            </td>

                            {/* Category */}
                            <td className="px-4 py-3 text-muted-foreground/80">
                              {m.category?.name ?? (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>

                            {/* Stock quantity */}
                            <td
                              className={cn(
                                "px-4 py-3 font-mono tabular-nums font-medium",
                                status === "out"
                                  ? "text-red-600"
                                  : status === "low"
                                    ? "text-amber-600"
                                    : "text-foreground",
                              )}
                            >
                              {m.stock?.quantity ?? 0}
                              {m.stock?.low_stock_threshold != null && (
                                <span className="text-muted-foreground/40 font-normal">
                                  {" "}/ {m.stock.low_stock_threshold}
                                </span>
                              )}
                            </td>

                            {/* Price */}
                            <td className="px-4 py-3 font-bold tabular-nums text-[12px] text-foreground">
                              {parseFloat(m.price).toLocaleString()}{" "}
                              <span className="font-normal text-[10px] text-muted-foreground">
                                {m.currency}
                              </span>
                            </td>

                            {/* Status badge */}
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border text-[9px] px-1.5 py-0 font-medium capitalize",
                                  STOCK_STYLES[status],
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1 h-1 rounded-full mr-1",
                                    STATUS_DOT[status],
                                    status === "low" && "animate-pulse",
                                  )}
                                />
                                {STATUS_LABELS[status]}
                              </Badge>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setEditTarget(m); setFormOpen(true); }}
                                  className="h-7 w-7 p-0 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteTarget(m)}
                                  className="h-7 w-7 p-0 rounded-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
      <MedicineFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        editing={editTarget}
        categories={categories}
      />
      <DeleteConfirmModal
        medicine={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
};

export default PharmacyInventory;
