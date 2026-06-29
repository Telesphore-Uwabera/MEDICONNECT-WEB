import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
  Eye,
  Tag,
  Barcode,
  ShieldCheck,
  Calendar,
  Clock,
  Hash,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

import {
  useGetInventoryMedicines,
  useCreateMedicine,
  useUpdateMedicine,
  useDeleteMedicine,
  useImportMedicines,
  downloadMedicineImportTemplate,
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
  { value: "name", label: "Name (A–Z)" },
  { value: "stock-desc", label: "Stock: Most first" },
  { value: "stock-asc", label: "Stock: Least first" },
  { value: "price-asc", label: "Price: Low to high" },
  { value: "price-desc", label: "Price: High to low" },
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: string, currency: string) {
  const n = parseFloat(price);
  return `${Number.isNaN(n) ? price : n.toLocaleString()} ${currency}`;
}

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

const inputCls =
  "w-full bg-background border border-border/60 rounded-[6px] px-3 py-1.5 text-[11px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";
const labelCls = "block text-[11px] font-medium text-muted-foreground mb-1";

// ─── Add / Edit Medicine Drawer ────────────────────────────────────────────────

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

const MEDICINE_FORM_ID = "medicine-form";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function ImportMedicinesDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const importMedicines = useImportMedicines();

  useEffect(() => {
    if (!open) setFile(null);
  }, [open]);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await downloadMedicineImportTemplate();
      toast.success("Template downloaded.");
    } catch (error) {
      toast.error("Could not download template.", {
        description: getErrorMessage(error),
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Choose an Excel or CSV file first.");
      return;
    }

    importMedicines.mutate(file, {
      onSuccess: (res) => {
        toast.success(res.message || "Medicines imported successfully.", {
          description: [
            typeof res.imported === "number" ? `${res.imported} imported` : null,
            typeof res.updated === "number" ? `${res.updated} updated` : null,
            typeof res.skipped === "number" ? `${res.skipped} skipped` : null,
          ].filter(Boolean).join(" · ") || undefined,
        });
        onClose();
      },
      onError: (error) => {
        toast.error("Import failed.", { description: getErrorMessage(error) });
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60 text-left space-y-0 flex-shrink-0">
          <SheetTitle className="text-[13px] font-semibold text-foreground">
            Import medicines
          </SheetTitle>
          <SheetDescription className="text-[10px] text-muted-foreground/70">
            Download the template, fill it, then upload the Excel or CSV file.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-[6px] border border-border/60 bg-secondary/20 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-[6px] bg-primary/10 text-primary border border-primary/15 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground">Medicine import template</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Use the backend template so columns match the expected format.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={downloading}
              className="h-8 w-full rounded-[6px] text-[11px]"
            >
              {downloading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
              Download template
            </Button>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Upload filled file</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[11px] text-muted-foreground file:mr-3 file:h-8 file:rounded-[6px] file:border-0 file:bg-primary file:px-3 file:text-[11px] file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && (
              <p className="text-[10px] text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{file.name}</span>
              </p>
            )}
          </div>
        </div>

        <SheetFooter className="px-5 py-4 border-t border-border/60 flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="h-8 rounded-[6px] text-[11px]">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!file || importMedicines.isPending}
            className="h-8 rounded-[6px] text-[11px]"
          >
            {importMedicines.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
            Import medicines
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function MedicineFormDrawer({
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
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60 text-left space-y-0 flex-shrink-0">
          <SheetTitle className="text-[13px] font-semibold text-foreground">
            {isEdit ? "Edit Medicine" : "Add Medicine"}
          </SheetTitle>
          <SheetDescription className="text-[10px] text-muted-foreground/70">
            {isEdit ? `Editing "${editing?.name}"` : "Add a new medicine to your inventory"}
          </SheetDescription>
        </SheetHeader>

        <form id={MEDICINE_FORM_ID} onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
          )}

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[6px] px-3 py-2">
              {error.message}
            </p>
          )}
        </form>

        <SheetFooter className="px-5 py-3.5 border-t border-border/60 flex-row gap-2 flex-shrink-0">
          <Button type="button" size="sm" variant="outline" onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-[6px]">
            Cancel
          </Button>
          <Button type="submit" form={MEDICINE_FORM_ID} size="sm" disabled={isPending}
            className="flex-1 h-7 text-[11px] font-semibold rounded-[6px] shadow-sm">
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            {isEdit ? "Save Changes" : "Add Medicine"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Delete confirm drawer ─────────────────────────────────────────────────────

function DeleteConfirmDrawer({
  medicine,
  onClose,
}: {
  medicine: Medicine | null;
  onClose: () => void;
}) {
  const { mutate, isPending, error } = useDeleteMedicine();

  return (
    <Sheet open={!!medicine} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60 text-left space-y-0">
          <SheetTitle className="text-[13px] font-semibold text-foreground">Remove Medicine</SheetTitle>
        </SheetHeader>

        {medicine && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-[11px] text-muted-foreground">
              This will permanently remove{" "}
              <strong className="text-foreground">{medicine.name}</strong> from your inventory.
              This action cannot be undone.
            </p>
            {error && (
              <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[6px] px-3 py-2 mt-3">
                {error.message}
              </p>
            )}
          </div>
        )}

        <SheetFooter className="px-5 py-3.5 border-t border-border/60 flex-row gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-[6px]">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={isPending || !medicine}
            onClick={() => medicine && mutate(medicine.id, { onSuccess: onClose })}
            className="flex-1 h-7 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-[6px] shadow-sm"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            Remove
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── View Details Drawer ───────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3 h-3 text-muted-foreground/60 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/70">{label}</p>
        <p className="text-[11px] text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MedicineDetailsDrawer({
  medicine,
  onClose,
  onEdit,
  onDelete,
}: {
  medicine: Medicine | null;
  onClose: () => void;
  onEdit: (m: Medicine) => void;
  onDelete: (m: Medicine) => void;
}) {
  if (!medicine) return null;
  const status = resolveStockStatus(medicine);

  return (
    <Sheet open={!!medicine} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60 text-left space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-[13px] font-semibold text-foreground truncate">
                {medicine.name}
              </SheetTitle>
              <SheetDescription className="text-[10px] text-muted-foreground/70 truncate">
                {medicine.generic_name || "Medicine details"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium", STOCK_STYLES[status])}>
              <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[status], status === "low" && "animate-pulse")} />
              {STATUS_LABELS[status]}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "border text-[9px] px-1.5 py-0 font-medium",
                medicine.is_active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                  : "bg-secondary/40 text-muted-foreground border-border/50",
              )}
            >
              {medicine.is_active ? "Active" : "Inactive"}
            </Badge>
            {medicine.requires_prescription && (
              <Badge variant="outline" className="border text-[9px] px-1.5 py-0 font-medium bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900">
                <ShieldCheck className="w-2.5 h-2.5 mr-1" /> Prescription
              </Badge>
            )}
          </div>

          {/* Price */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Price
            </p>
            <p className="text-[15px] font-bold text-foreground">
              {formatPrice(medicine.price, medicine.currency)}
            </p>
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Description
            </p>
            <p className="text-[11px] text-foreground/90 leading-relaxed">
              {medicine.description || <span className="text-muted-foreground/50">No description provided</span>}
            </p>
          </div>

          {/* Category / unit / barcode */}
          <div className="grid grid-cols-2 gap-2.5">
            <DetailRow icon={Tag} label="Category" value={medicine.category?.name ?? "Uncategorized"} />
            <DetailRow icon={Package} label="Unit" value={<span className="capitalize">{medicine.unit}</span>} />
            <DetailRow icon={Barcode} label="Barcode" value={medicine.barcode ?? "—"} />
            <DetailRow icon={Hash} label="Medicine ID" value={`#${medicine.id}`} />
          </div>

          {/* Stock */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Stock
            </p>
            <div className="rounded-[6px] border border-border/60 bg-secondary/10 p-3 grid grid-cols-2 gap-2.5">
              <div>
                <p className="text-[10px] text-muted-foreground/70">Quantity</p>
                <p
                  className={cn(
                    "text-[12px] font-mono font-semibold tabular-nums",
                    status === "out" ? "text-red-600" : status === "low" ? "text-amber-600" : "text-foreground",
                  )}
                >
                  {medicine.stock?.quantity ?? 0}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground/70">Low Stock Threshold</p>
                <p className="text-[12px] font-mono font-semibold tabular-nums text-foreground">
                  {medicine.stock?.low_stock_threshold ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground/70">Batch Number</p>
                <p className="text-[11px] text-foreground">{medicine.stock?.batch_number ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground/70">Expiry Date</p>
                <p className="text-[11px] text-foreground">
                  {medicine.stock?.expiry_date ? formatDate(medicine.stock.expiry_date) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 gap-2.5">
            <DetailRow icon={Calendar} label="Created" value={formatDateTime(medicine.created_at)} />
            <DetailRow icon={Clock} label="Last updated" value={formatDateTime(medicine.updated_at)} />
          </div>
        </div>

        <SheetFooter className="px-5 py-3.5 border-t border-border/60 flex-row gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(medicine)} className="flex-1 h-7 text-[11px] rounded-[6px]">
            <Pencil className="w-3 h-3 mr-1.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(medicine)}
            className="flex-1 h-7 text-[11px] rounded-[6px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
          >
            <Trash2 className="w-3 h-3 mr-1.5" /> Delete
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PharmacyInventory = () => {
  const { t } = useTranslation();

  // ── filter state ────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // ── modal / drawer state ─────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Medicine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);
  const [viewTarget, setViewTarget] = useState<Medicine | null>(null);

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
          if (filters.status === "out" && s !== "out") return false;
          if (filters.status === "low" && s !== "low") return false;
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
          case "stock-asc": return qa - qb;
          case "stock-desc": return qb - qa;
          case "price-asc": return parseFloat(a.price) - parseFloat(b.price);
          case "price-desc": return parseFloat(b.price) - parseFloat(a.price);
          default: return a.name.localeCompare(b.name);
        }
      });
  }, [medicines, filters.search, filters.status, filters.sort]);

  // ── stat counts ──────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const all = medicines;
    return {
      total: all.length,
      inStock: all.filter((m) => resolveStockStatus(m) === "in-stock").length,
      low: all.filter((m) => resolveStockStatus(m) === "low").length,
      out: all.filter((m) => resolveStockStatus(m) === "out").length,
    };
  }, [medicines]);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (m: Medicine) => { setViewTarget(null); setEditTarget(m); setFormOpen(true); };
  const openDelete = (m: Medicine) => { setViewTarget(null); setDeleteTarget(m); };

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Stock Status",
      value: filters.status,
      options: [
        { value: "all", label: "All statuses" },
        { value: "in-stock", label: "In stock" },
        { value: "low", label: "Low stock" },
        { value: "out", label: "Out of stock" },
      ],
      onChange: (v: string) => set("status", v as any)
    },
    {
      type: "select" as const,
      key: "categoryId",
      label: "Category",
      value: String(filters.categoryId),
      options: [
        { value: "all", label: "All categories" },
        ...categories.map((c) => ({ value: String(c.id), label: c.name }))
      ],
      onChange: (v: string) => set("categoryId", v === "all" ? "all" : Number(v))
    }
  ], [filters.status, filters.categoryId, categories, set]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.inventory_title", "Inventory")}
          subtitle={t("pages.pharmacy.inventory_sub", "Manage medicines, stock levels and pricing")}
        />


        <main className="flex-1 overflow-y-auto flex flex-col">

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
              accent="warning"
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
                      className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {counts.out} out of stock
                    </button>
                  )}
                  {counts.low > 0 && (
                    <button
                      onClick={() => set("status", "low")}
                      className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
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
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all text-muted-foreground hover:text-foreground"
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
                  className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as SortOption)}
                  className="appearance-none pl-2.5 pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="flex h-7 w-7 sm:w-auto sm:px-3 p-0 sm:p-2 text-[10px] font-semibold rounded-[6px] border-border/60"
                title="Import medicines"
              >
                <Upload className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">Import</span>
              </Button>

              {/* Add medicine button */}
              <Button
                size="sm"
                onClick={openCreate}
                className="hidden sm:flex h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] shadow-sm hover:shadow transition-all duration-200"
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("pages.pharmacy.add_stock", "Add Medicine")}
              </Button>

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

            {/* Error */}
            {isError && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">Failed to load medicines</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">Check your connection and try again</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => refetch()}
                  className="text-[11px] h-7 px-3 rounded-[6px] mt-1">
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Retry
                </Button>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
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
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
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
                  <Button size="sm" onClick={openCreate}
                    className="h-7 px-3 text-[11px] rounded-[6px] mt-1">
                    <Plus className="w-3 h-3 mr-1.5" />
                    Add Medicine
                  </Button>
                )}
              </div>
            )}

            {/* Data table */}
            {!isLoading && !isError && filtered.length > 0 && (
              <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
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
                          onClick={() => setViewTarget(m)}
                          className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150 cursor-pointer"
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
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewTarget(m)}
                                className="h-7 w-7 p-0 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(m)}
                                className="h-7 w-7 p-0 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openDelete(m)}
                                className="h-7 w-7 p-0 rounded-[6px] text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
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

      {/* Drawers */}
      <MedicineFormDrawer
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        editing={editTarget}
        categories={categories}
      />
      <ImportMedicinesDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
      <DeleteConfirmDrawer
        medicine={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
      <MedicineDetailsDrawer
        medicine={viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={openEdit}
        onDelete={openDelete}
      />
    </DashboardLayout>
  );
};

export default PharmacyInventory;
