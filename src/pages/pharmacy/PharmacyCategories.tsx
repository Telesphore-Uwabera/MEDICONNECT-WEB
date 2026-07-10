import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDateOnly } from "@/lib/date";
import {Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Plus,
  Tag,
  Package,
  Search,
  ChevronDown,
  SlidersHorizontal,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  FolderOpen,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  useGetInventoryCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from "@/hooks/pharmacy/use-pharmacy-inventory-categories";
 
type StatusFilter = "all" | "active" | "inactive";
type SortOption =
  | "name"
  | "medicines-desc"
  | "medicines-asc"
  | "created-desc"
  | "created-asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "Name (A-Z)" },
  { value: "medicines-desc", label: "Medicines: Most first" },
  { value: "medicines-asc", label: "Medicines: Least first" },
  { value: "created-desc", label: "Newest first" },
  { value: "created-asc", label: "Oldest first" },
];

interface FilterState {
  search: string;
  status: StatusFilter;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  sort: "name",
};

function formatDate(iso: string) {
  return formatDateOnly(iso, undefined, {
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

//  Sidebar atoms (same pattern as PharmacyInventory) 

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

//   Modal shell (same as PharmacyInventory) 

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
      <div className="relative bg-card border border-border/70 rounded-[6px] shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90dvh] flex flex-col">
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
  "w-full bg-background border border-border/60 rounded-[6px] px-3 py-1.5 text-[11px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";
const labelCls = "block text-[11px] font-medium text-muted-foreground mb-1";

//   Add / Edit Category Modal  

type CategoryFormData = {
  name: string;
  description: string;
  is_active: boolean;
};

const BLANK_FORM: CategoryFormData = {
  name: "",
  description: "",
  is_active: true,
};

function categoryToForm(c: Category): CategoryFormData {
  return {
    name: c.name,
    description: c.description ?? "",
    is_active: c.is_active,
  };
}

function CategoryFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Category | null;
}) {
  const isEdit = editing != null;
  const { mutate: create, isPending: creating, error: createErr } = useCreateCategory();
  const { mutate: update, isPending: updating, error: updateErr } = useUpdateCategory();
  const isPending = creating || updating;
  const error = createErr ?? updateErr;

  const [form, setForm] = useState<CategoryFormData>(BLANK_FORM);
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    setForm(editing ? categoryToForm(editing) : BLANK_FORM);
    setNameTouched(false);
  }, [editing, open]);

  const set = <K extends keyof CategoryFormData>(k: K, v: CategoryFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const nameError = nameTouched && form.name.trim().length < 2 ? "Min 2 characters" : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    if (form.name.trim().length < 2) return;

    if (isEdit) {
      const payload: UpdateCategoryPayload = {
        name: form.name,
        description: form.description || undefined,
        is_active: form.is_active,
      };
      update({ id: editing!.id, payload }, {
        onSuccess: () => { toast.success("Category updated"); onClose(); },
      });
    } else {
      const payload: CreateCategoryPayload = {
        name: form.name,
        description: form.description || undefined,
      };
      create(payload, {
        onSuccess: () => { toast.success("Category created"); onClose(); },
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Category" : "Add Category"}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            onBlur={() => setNameTouched(true)}
            className={inputCls}
            placeholder="e.g. Antibiotics"
          />
          {nameError && (
            <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" /> {nameError}
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={cn(inputCls, "resize-none")}
            placeholder="Brief description of this category (optional)"
          />
        </div>

        {/* Active toggle edit mode only */}
        {isEdit && (
          <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-secondary/20 px-3 py-2.5">
            <div>
              <p className="text-[11px] font-medium text-foreground">Active</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                Inactive categories are hidden from medicine listings
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => set("is_active", v)}
            />
          </div>
        )}

        {error && (
          <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[6px] px-3 py-2">
            {error.message}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-[6px]">
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}
            className="flex-1 h-7 text-[11px] font-semibold rounded-[6px] shadow-sm">
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            {isEdit ? "Save Changes" : "Add Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
 

function DeleteConfirmModal({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const { mutate, isPending, error } = useDeleteCategory();
  if (!category) return null;

  const blocked = category.medicines_count > 0;

  return (
    <Modal open={!!category} onClose={onClose} title="Delete Category">
      <p className="text-[11px] text-muted-foreground mb-3">
        This will permanently remove{" "}
        <strong className="text-foreground">{category.name}</strong> from your inventory
        categories. This action cannot be undone.
      </p>

      {blocked && (
        <p className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-[6px] px-3 py-2 mb-3">
          This category has {category.medicines_count} medicine
          {category.medicines_count !== 1 ? "s" : ""} - remove or reassign them first.
        </p>
      )}

      {error && (
        <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[6px] px-3 py-2 mb-3">
          {error.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onClose}
          className="flex-1 h-7 text-[11px] rounded-[6px]">
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={isPending || blocked}
          onClick={() =>
            mutate(category.id, {
              onSuccess: () => { toast.success("Category deleted"); onClose(); },
            })
          }
          className="flex-1 h-7 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-[6px] shadow-sm"
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
          Delete
        </Button>
      </div>
    </Modal>
  );
}

// View Details Drawer 

function CategoryDetailsDrawer({
  category,
  onClose,
  onEdit,
  onDelete,
}: {
  category: Category | null;
  onClose: () => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const updateCategory = useUpdateCategory();

  if (!category) return null;

  const handleToggleActive = () => {
    updateCategory.mutate(
      { id: category.id, payload: { is_active: !category.is_active } },
      {
        onSuccess: () => {
          toast.success(`Category ${category.is_active ? "deactivated" : "activated"}`);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Sheet open={!!category} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60 text-left space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
              <Tag className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-[13px] font-semibold text-foreground truncate">
                {category.name}
              </SheetTitle>
              <SheetDescription className="text-[10px] text-muted-foreground/70">
                Category details
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Status + active toggle */}
          <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-secondary/20 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  category.is_active ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
              />
              <span className="text-[11px] font-medium text-foreground">
                {category.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <Switch checked={category.is_active} onCheckedChange={handleToggleActive} />
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Description
            </p>
            <p className="text-[11px] text-foreground/90 leading-relaxed">
              {category.description || (
                <span className="text-muted-foreground/50">No description provided</span>
              )}
            </p>
          </div>

          {/* Medicines count */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              Medicines
            </p>
            <div className="flex items-center gap-1.5 rounded-[6px] border border-border/60 bg-card px-3 py-2 w-fit">
              <Package className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-semibold text-foreground">
                {category.medicines_count} medicine{category.medicines_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-start gap-2">
              <Calendar className="w-3 h-3 text-muted-foreground/60 mt-0.5" />
              <div>
                <p className="text-[10px] text-muted-foreground/70">Created</p>
                <p className="text-[11px] text-foreground">{formatDateTime(category.created_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-3 h-3 text-muted-foreground/60 mt-0.5" />
              <div>
                <p className="text-[10px] text-muted-foreground/70">Last updated</p>
                <p className="text-[11px] text-foreground">{formatDateTime(category.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="rounded-[6px] border border-border/40 bg-secondary/10 px-3 py-2">
            <p className="text-[10px] text-muted-foreground/60">
              Category ID <span className="text-foreground/70 font-mono">#{category.id}</span>
            </p>
          </div>
        </div>

        <SheetFooter className="px-5 py-3.5 border-t border-border/60 flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(category)}
            className="flex-1 h-7 text-[11px] rounded-[6px]"
          >
            <Pencil className="w-3 h-3 mr-1.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(category)}
            disabled={category.medicines_count > 0}
            className="flex-1 h-7 text-[11px] rounded-[6px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
          >
            <Trash2 className="w-3 h-3 mr-1.5" /> Delete
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

 

function PharmacyCategories() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading, isError, refetch } = useGetInventoryCategories();
  const updateCategory = useUpdateCategory();

  // filter state 
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  //  modal / drawer state  
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [viewTarget, setViewTarget] = useState<Category | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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

  //  client-side filter + search + sort  
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();

    return categories
      .filter((c) => {
        if (filters.status === "active" && !c.is_active) return false;
        if (filters.status === "inactive" && c.is_active) return false;
        if (q) {
          return (
            c.name.toLowerCase().includes(q) ||
            (c.description ?? "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "medicines-desc": return b.medicines_count - a.medicines_count;
          case "medicines-asc": return a.medicines_count - b.medicines_count;
          case "created-desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case "created-asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          default: return a.name.localeCompare(b.name);
        }
      });
  }, [categories, filters.search, filters.status, filters.sort]);

  //   stat counts 
  const counts = useMemo(() => ({
    total: categories.length,
    active: categories.filter((c) => c.is_active).length,
    inactive: categories.filter((c) => !c.is_active).length,
    medicines: categories.reduce((acc, c) => acc + c.medicines_count, 0),
  }), [categories]);

  const handleToggleActive = (category: Category) => {
    setTogglingId(category.id);
    updateCategory.mutate(
      { id: category.id, payload: { is_active: !category.is_active } },
      {
        onSuccess: () => {
          toast.success(`Category ${category.is_active ? "deactivated" : "activated"}`);
          setTogglingId(null);
        },
        onError: (e) => { toast.error(e.message); setTogglingId(null); },
      },
    );
  };

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (c: Category) => { setViewTarget(null); setEditTarget(c); setFormOpen(true); };
  const openDelete = (c: Category) => { setViewTarget(null); setDeleteTarget(c); };

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "all", label: "All statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      onChange: (v: string) => set("status", v as any)
    }
  ], [filters.status, set]);

 

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.categories_title", "Medicine Categories")}
          subtitle={t("pages.pharmacy.categories_sub", "Organise your inventory into logical groups")}
        />


        <main className="flex-1 overflow-y-auto flex flex-col">

          {/* Stat cards */}
          <div className="px-4 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard
              label="Total Categories"
              value={isLoading ? "-" : counts.total}
              icon={Tag}
              accent="primary"
            />
            <StatCard
              label="Active"
              value={isLoading ? "-" : counts.active}
              icon={CheckCircle2}
              accent="success"
            />
            <StatCard
              label="Inactive"
              value={isLoading ? "-" : counts.inactive}
              icon={AlertCircle}
              accent="warning"
            />
            <StatCard
              label="Total Medicines"
              value={isLoading ? "-" : counts.medicines}
              icon={Package}
              accent="primary"
            />
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            {/* Left */}
            <div className="flex items-center gap-3">
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading categories...
                </span>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{filtered.length}</span>{" "}
                  {filtered.length === 1 ? "category" : "categories"}
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
                  placeholder="Search categories..."
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

              {/* Add category button */}
              <Button
                size="sm"
                onClick={openCreate}
                className="hidden sm:flex h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] shadow-sm hover:shadow transition-all duration-200"
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("pages.pharmacy.add_category", "New Category")}
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
                  <p className="text-[12px] font-semibold text-foreground">Failed to load categories</p>
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
                      {["Category", "Medicines", "Status", "Created", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-border/40">
                        {Array.from({ length: 5 }).map((_, j) => (
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
                  <FolderOpen className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {hasActiveFilters ? "No categories match your filters" : "No categories yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {hasActiveFilters
                      ? "Try widening your search criteria"
                      : "Create your first category to start organising your inventory"}
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
                    Add Category
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
                      <th className="text-left px-4 py-3 font-semibold">Category</th>
                      <th className="text-left px-4 py-3 font-semibold">Medicines</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setViewTarget(c)}
                        className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150 cursor-pointer"
                      >
                        {/* Name + description */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
                              <Tag className="w-3 h-3 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[11px] text-foreground truncate">{c.name}</p>
                              {c.description && (
                                <p className="text-[10px] font-normal text-muted-foreground/60 mt-0.5 truncate max-w-[260px]">
                                  {c.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Medicines */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-mono tabular-nums font-medium px-2 py-0.5 rounded-[6px] border text-[10px]",
                              c.medicines_count > 0
                                ? "bg-primary/10 border-primary/20 text-primary"
                                : "bg-secondary/30 border-border/50 text-muted-foreground",
                            )}
                          >
                            <Package className="w-2.5 h-2.5" />
                            {c.medicines_count}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {togglingId === c.id ? (
                              <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                            ) : (
                              <Switch
                                checked={c.is_active}
                                onCheckedChange={() => handleToggleActive(c)}
                                className="scale-75"
                              />
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "border text-[9px] px-1.5 py-0 font-medium",
                                c.is_active
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                                  : "bg-secondary/40 text-muted-foreground border-border/50",
                              )}
                            >
                              {c.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3 text-muted-foreground/70 text-[10px]">
                          {formatDate(c.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewTarget(c)}
                              className="h-7 w-7 p-0 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(c)}
                              className="h-7 w-7 p-0 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDelete(c)}
                              className="h-7 w-7 p-0 rounded-[6px] text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
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

      {/* Modals & Drawer */}
      <CategoryFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        editing={editTarget}
      />
      <DeleteConfirmModal
        category={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
      <CategoryDetailsDrawer
        category={viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={openEdit}
        onDelete={openDelete}
      />
    </DashboardLayout>
  );
}

export default PharmacyCategories;

