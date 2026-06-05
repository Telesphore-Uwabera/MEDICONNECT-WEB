
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Search, X, Check, RefreshCw,
  Tag, Package, AlertCircle, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, Filter, FolderOpen,
} from "lucide-react";
import {
  useGetInventoryCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from "@/hooks/pharmacy/use-pharmacy-inventory-categories";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type FilterStatus = "all" | "active" | "inactive";
type SortKey = "name" | "medicines_count" | "created_at";
type SortDir = "asc" | "desc";

interface FormValues {
  name: string;
  description: string;
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared components
// ─────────────────────────────────────────────────────────────────────────────
function FormField({
  label, error, children, required, className = "",
}: {
  label: string; error?: string; children: React.ReactNode; required?: boolean; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-[10px] text-destructive flex items-center gap-1">
          <AlertCircle size={10} />{error}
        </p>
      )}
    </div>
  );
}

function StatPill({ value, label, accent = false }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl bg-card border border-border">
      <span className={cn("text-xl font-bold tabular-nums", accent ? "text-primary" : "text-foreground")}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Form (create + edit in a slide-in panel)
// ─────────────────────────────────────────────────────────────────────────────
function CategoryForm({
  editing,
  onClose,
}: {
  editing: Category | null;   // null = create mode
  onClose: () => void;
}) {
  const isEdit = editing !== null;
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      is_active: editing?.is_active ?? true,
    },
  });

  const isActive = watch("is_active");

  const onSubmit = handleSubmit((data) => {
    if (isEdit) {
      const payload: UpdateCategoryPayload = {
        name: data.name,
        description: data.description || undefined,
        is_active: data.is_active,
      };
      update.mutate({ id: editing.id, payload }, {
        onSuccess: () => { toast.success("Category updated"); onClose(); },
        onError: (e) => toast.error(e.message),
      });
    } else {
      const payload: CreateCategoryPayload = {
        name: data.name,
        description: data.description || undefined,
      };
      create.mutate(payload, {
        onSuccess: () => { toast.success("Category created"); reset(); onClose(); },
        onError: (e) => toast.error(e.message),
      });
    }
  });

  const isPending = create.isPending || update.isPending;

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Panel */}
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
              <Tag size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {isEdit ? "Edit category" : "New category"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {isEdit ? `Editing "${editing.name}"` : "Add a new medicine category"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <FormField label="Category name" error={errors.name?.message} required>
            <Input
              {...register("name", { required: "Name is required", minLength: { value: 2, message: "Min 2 characters" } })}
              placeholder="e.g. Antibiotics"
              className="h-10 text-sm border-border focus-visible:ring-primary"
              autoFocus
            />
          </FormField>

          <FormField label="Description">
            <textarea
              {...register("description")}
              placeholder="Brief description of this category (optional)"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </FormField>

          {/* Active toggle — only shown in edit mode */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Active</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Inactive categories are hidden from medicine listings</p>
              </div>
              <Switch
                checked={isActive ?? true}
                onCheckedChange={(v) => setValue("is_active", v)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1 h-10 text-sm">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            className="flex-1 h-10 text-sm bg-primary text-primary-foreground gap-2 shadow-sm shadow-primary/25"
          >
            {isPending ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            {isEdit ? "Save changes" : "Create category"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete confirmation dialog
// ─────────────────────────────────────────────────────────────────────────────
function DeleteDialog({ category, onClose }: { category: Category; onClose: () => void }) {
  const del = useDeleteCategory();

  const handleDelete = () => {
    del.mutate(category.id, {
      onSuccess: () => { toast.success("Category deleted"); onClose(); },
      onError: (e) => {
        // API returns a specific message when category has medicines
        toast.error(e.message ?? "Cannot delete category");
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Trash2 size={22} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Delete category?</h2>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              You're about to delete <span className="font-semibold text-foreground">"{category.name}"</span>.
              {category.medicines_count > 0 && (
                <span className="block mt-1.5 text-amber-500 font-medium">
                  ⚠ This category has {category.medicines_count} medicine{category.medicines_count !== 1 ? "s" : ""} — remove them first.
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 h-9 text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={del.isPending || category.medicines_count > 0}
              className="flex-1 h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {del.isPending ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category row card
// ─────────────────────────────────────────────────────────────────────────────
function CategoryCard({
  category,
  onEdit,
  onDelete,
  onToggleActive,
  isTogglingActive,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isTogglingActive: boolean;
}) {
  return (
    <div className={cn(
      "group flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border px-4 py-4 transition-all duration-150 hover:shadow-sm",
      category.is_active
        ? "border-border bg-card hover:border-border/70"
        : "border-border/50 bg-muted/20 opacity-70",
    )}>
      {/* Icon + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
          category.is_active
            ? "bg-primary/10 text-primary group-hover:bg-primary/15"
            : "bg-muted text-muted-foreground",
        )}>
          <Tag size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground truncate">{category.name}</h3>
            {!category.is_active && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                Inactive
              </span>
            )}
          </div>
          {category.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{category.description}</p>
          )}
        </div>
      </div>

      {/* Medicine count badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 border text-xs font-semibold",
          category.medicines_count > 0
            ? "bg-primary/10 border-primary/20 text-primary"
            : "bg-muted border-border text-muted-foreground",
        )}>
          <Package size={12} />
          {category.medicines_count} medicine{category.medicines_count !== 1 ? "s" : ""}
        </div>

        {/* Active toggle */}
        <div className="flex items-center" title={category.is_active ? "Deactivate" : "Activate"}>
          {isTogglingActive
            ? <RefreshCw size={14} className="text-muted-foreground animate-spin mx-1" />
            : (
              <Switch
                checked={category.is_active}
                onCheckedChange={onToggleActive}
                className="scale-90"
              />
            )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────
function CategoriesSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border px-4 py-4"
          style={{ animationDelay: `${i * 60}ms` }}>
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32 rounded" />
            <Skeleton className="h-2.5 w-48 rounded" />
          </div>
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ hasSearch, onCreate }: { hasSearch: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
        <FolderOpen size={32} className="text-muted-foreground" />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-2">
        {hasSearch ? "No categories match" : "No categories yet"}
      </h3>
      <p className="text-xs text-muted-foreground mb-6 max-w-xs leading-relaxed">
        {hasSearch
          ? "Try adjusting your search or filter."
          : "Create your first category to start organising your medicine inventory."}
      </p>
      {!hasSearch && (
        <Button onClick={onCreate} className="gap-2 bg-primary text-primary-foreground h-10 px-5">
          <Plus size={14} /> Create first category
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sort button helper
// ─────────────────────────────────────────────────────────────────────────────
function SortButton({
  label, sortKey, current, dir, onClick,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onClick: (k: SortKey) => void;
}) {
  const isActive = current === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={cn(
        "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {label}
      {isActive && (dir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
function PharmacyCategories() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading, error, refetch } = useGetInventoryCategories();
  const updateCategory = useUpdateCategory();

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Filter / search / sort state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Derived stats
  const total = categories.length;
  const activeCount = categories.filter((c) => c.is_active).length;
  const inactiveCount = total - activeCount;
  const totalMedicines = categories.reduce((acc, c) => acc + c.medicines_count, 0);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...categories];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q),
      );
    }

    if (filterStatus === "active") list = list.filter((c) => c.is_active);
    if (filterStatus === "inactive") list = list.filter((c) => !c.is_active);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "medicines_count") cmp = a.medicines_count - b.medicines_count;
      else if (sortKey === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [categories, search, filterStatus, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

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

  const openCreate = () => { setEditingCategory(null); setShowForm(true); };
  const openEdit = (c: Category) => { setEditingCategory(c); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingCategory(null); };

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.categories_title", { defaultValue: "Medicine Categories" })}
          subtitle={t("pages.pharmacy.categories_sub", { defaultValue: "Organise your inventory into logical groups" })}
        />

        <div className="flex-1 px-3 py-4 sm:px-6 sm:py-6 space-y-5 overflow-y-auto">

          {/* ── Stats row ─────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <StatPill value={total} label="Total" />
            <StatPill value={activeCount} label="Active" accent />
            <StatPill value={inactiveCount} label="Inactive" />
            <StatPill value={totalMedicines} label="Medicines" />
          </div>

          {/* ── Toolbar ───────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories…"
                className="pl-9 h-10 text-sm border-border focus-visible:ring-primary"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border shrink-0">
              {(["all", "active", "inactive"] as FilterStatus[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                    filterStatus === f
                      ? "bg-card shadow-sm text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Create button */}
            <Button
              onClick={openCreate}
              className="h-10 px-4 text-sm gap-2 bg-primary text-primary-foreground shadow-sm shadow-primary/25 shrink-0"
            >
              <Plus size={15} /> New category
            </Button>
          </div>

          {/* ── Sort bar ──────────────────────────────────────────────────── */}
          {!isLoading && categories.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                Sort:
              </span>
              <SortButton label="Name" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortButton label="Medicines" sortKey="medicines_count" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortButton label="Created" sortKey="created_at" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <span className="ml-auto text-[11px] text-muted-foreground font-medium">
                {filtered.length} of {total} categor{total !== 1 ? "ies" : "y"}
              </span>
            </div>
          )}

          {/* ── Error state ───────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <p className="text-xs text-destructive font-medium flex-1">Failed to load categories.</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}
                className="h-7 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                <RefreshCw size={11} /> Retry
              </Button>
            </div>
          )}

          {/* ── List ──────────────────────────────────────────────────────── */}
          {isLoading ? (
            <CategoriesSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState hasSearch={!!search || filterStatus !== "all"} onCreate={openCreate} />
          ) : (
            <div className="space-y-2">
              {filtered.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onEdit={() => openEdit(category)}
                  onDelete={() => setDeletingCategory(category)}
                  onToggleActive={() => handleToggleActive(category)}
                  isTogglingActive={togglingId === category.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showForm && (
        <CategoryForm editing={editingCategory} onClose={closeForm} />
      )}
      {deletingCategory && (
        <DeleteDialog category={deletingCategory} onClose={() => setDeletingCategory(null)} />
      )}
    </DashboardLayout>
  );
}

export default PharmacyCategories;
