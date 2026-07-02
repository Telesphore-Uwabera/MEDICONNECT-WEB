import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

import { toast as sonnerToast } from "sonner";
import {
  Tag,
  Pencil,
  X,
  Loader2,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Save,
  Hash,
} from "lucide-react";
import {
  useGetServicePricing,
  useUpdateServicePricing,
  useBulkUpdateServicePricing,
  type ApiPricingItem,
} from "@/hooks/admin/use-admin-service-pricing";
import { StatCard } from "@/components/StatCard"; 
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 4 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{
                  width: j === 0 ? "160px" : j === 3 ? "80px" : "100px",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Desktop Row ──────────────────────────────────────────────────────────────

function PricingRow({
  item,
  onEdit,
  isUpdating,
}: {
  item: ApiPricingItem;
  onEdit: (item: ApiPricingItem) => void;
  isUpdating: boolean;
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      {/* Key */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
            <Hash className="w-3 h-3 text-primary/70" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground">
              {formatKey(item.key)}
            </p>
            <p className="text-[10px] text-muted-foreground/50">{item.key}</p>
          </div>
        </div>
      </td>

      {/* Value */}
      <td className="px-4 py-3">
        <span className="font-mono text-[12px] font-semibold text-foreground">
          {item.value.toLocaleString()}
        </span>
      </td>

      {/* Currency */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80">
        {item.currency}
      </td>

      {/* Updated */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60">
        {formatDate(item.updated_at)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onEdit(item)}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </>
          )}
        </Button>
      </td>
    </tr>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function PricingCard({
  item,
  onEdit,
  isUpdating,
}: {
  item: ApiPricingItem;
  onEdit: (item: ApiPricingItem) => void;
  isUpdating: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[6px] border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-9 w-9 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 border border-border/40">
        <Hash className="w-4 h-4 text-primary/70" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">
              {formatKey(item.key)}
            </p>
            <p className="text-[10px] text-muted-foreground/50">{item.key}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-[13px] font-semibold text-foreground">
              {item.value.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              {item.currency}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <p className="text-[10px] text-muted-foreground/50">
            Updated {formatDate(item.updated_at)}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onEdit(item)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Panel ───────────────────────────────────────────────────────────────

function PricingPanel({
  item,
  onClose,
}: {
  item: ApiPricingItem | null;
  onClose: () => void;
}) {
  const open = !!item; 
  const [value, setValue] = useState("");

  const updateMutation = useUpdateServicePricing();
  const isSaving = updateMutation.isPending;

  useEffect(() => {
    if (item) setValue(String(item.value));
  }, [item]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleSubmit = async () => {
    const parsed = Number(value);
    if (!value.trim() || isNaN(parsed) || parsed < 0) {
      sonnerToast.error("Enter a valid non-negative number");
      return;
    }
    try {
      await updateMutation.mutateAsync({ key: item!.key, value: parsed });
      sonnerToast.success("Price updated.");
      onClose();
    } catch (error) {
      sonnerToast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] lg:w-[440px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && item && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  Edit price
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Update value for{" "}
                  <span className="font-medium text-foreground">
                    {formatKey(item.key)}
                  </span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Key (read-only) */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Key
                </p>
                <div className="w-full px-3 py-2 text-[12px] bg-muted/30 border border-border/40 rounded-[6px] text-muted-foreground font-mono">
                  {item.key}
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Value ({item.currency}){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. 750"
                  className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>

              {/* Last updated */}
              <div className="p-3 rounded-[6px] border border-border/60 bg-secondary/30">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Last updated
                </div>
                <p className="text-[13px] font-medium text-foreground">
                  {formatDate(item.updated_at)}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <Button
                className="w-full h-10 text-[12px] rounded-[6px] gap-2"
                onClick={handleSubmit}
                disabled={isSaving || !value.trim()}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                variant="ghost"
                className="w-full h-9 text-[12px] rounded-[6px] text-muted-foreground"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Bulk Edit Dialog ─────────────────────────────────────────────────────────

function BulkEditDialog({
  pricing,
  onClose,
}: {
  pricing: ApiPricingItem[] | null;
  onClose: () => void;
}) { 
  const [values, setValues] = useState<Record<string, string>>({});

  const bulkMutation = useBulkUpdateServicePricing();
  const isSaving = bulkMutation.isPending;

  useEffect(() => {
    if (pricing) {
      const init: Record<string, string> = {};
      pricing.forEach((p) => {
        init[p.key] = String(p.value);
      });
      setValues(init);
    }
  }, [pricing]);

  if (!pricing) return null;

  const handleSubmit = async () => {
    const prices: Record<string, number> = {};
    for (const [key, val] of Object.entries(values)) {
      const n = Number(val);
      if (isNaN(n) || n < 0) {
        sonnerToast.error(`Invalid value for "${formatKey(key)}"`);
        return;
      }
      prices[key] = n;
    }
    try {
      await bulkMutation.mutateAsync(prices);
      sonnerToast.success("All prices updated.");
      onClose();
    } catch (error) {
      sonnerToast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
      />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md bg-card border border-border rounded-[6px] shadow-xl p-5 flex flex-col gap-4">
        <div>
          <p className="text-[14px] font-semibold text-foreground">
            Bulk edit prices
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Update all pricing values at once.
          </p>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {pricing.map((item) => (
            <div key={item.key}>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                {formatKey(item.key)} ({item.currency})
              </label>
              <input
                type="number"
                min="0"
                value={values[item.key] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [item.key]: e.target.value }))
                }
                className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all font-mono"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9 text-[12px] rounded-[6px] border-border/60"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-9 text-[12px] rounded-[6px] gap-1.5"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save all
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageServicePricing() {
  const { t, i18n } = useTranslation(); 

  const [editingItem, setEditingItem] = useState<ApiPricingItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } =
    useGetServicePricing();
  const pricing = data?.pricing ?? [];

  const openEdit = useCallback(
    (item: ApiPricingItem) => setEditingItem(item),
    [],
  );
  const closePanel = useCallback(() => setEditingItem(null), []);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.service_pricing.overview_title")}
          subtitle={t("pages.service_pricing.overview_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-3 gap-2">
            <StatCard
              label="Total price keys"
              value={pricing.length}
              icon={Tag}
              accent="primary"
            />
            <StatCard
              label="Total value (RWF)"
              value={pricing
                .reduce((sum, p) => sum + p.value, 0)
                .toLocaleString()}
              icon={CreditCard}
              accent="success"
            />
            <StatCard
              label="Last synced"
              value={pricing[0] ? formatDate(pricing[0].updated_at) : "—"}
              icon={RefreshCw}
              accent="warning"
            />
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <p className="text-[11px] text-muted-foreground shrink-0">
              {isLoading ? (
                <span className="text-muted-foreground/50">Loading…</span>
              ) : (
                <>
                  <span className="font-bold text-foreground">
                    {pricing.length}
                  </span>{" "}
                  {pricing.length === 1 ? "price key" : "price keys"}
                </>
              )}
            </p>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-[11px] rounded-[6px] gap-1.5 border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", isFetching && "animate-spin")}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                size="sm"
                className="h-8 px-3 text-[11px] rounded-[6px] gap-1.5"
                onClick={() => setBulkOpen(true)}
                disabled={pricing.length === 0}
              >
                <Save className="w-3.5 h-3.5" />
                Bulk edit
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <p className="text-[12px] font-semibold text-destructive">
                  Failed to load pricing
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Check your connection and try again
                </p>
              </div>
            ) : !isLoading && pricing.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Tag className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    No pricing configured
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    No service price keys found.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">
                          Key
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Value
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Currency
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Last Updated
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <SkeletonRows />
                      ) : (
                        pricing.map((item) => (
                          <PricingRow
                            key={item.key}
                            item={item}
                            onEdit={openEdit}
                            isUpdating={updatingKey === item.key}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden flex flex-col gap-2">
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-20 rounded-[6px] border border-border/60 bg-card animate-pulse"
                      />
                    ))
                    : pricing.map((item) => (
                      <PricingCard
                        key={item.key}
                        item={item}
                        onEdit={openEdit}
                        isUpdating={updatingKey === item.key}
                      />
                    ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <PricingPanel item={editingItem} onClose={closePanel} />

      {bulkOpen && (
        <BulkEditDialog pricing={pricing} onClose={() => setBulkOpen(false)} />
      )}
    </DashboardLayout>
  );
}

export default ManageServicePricing;
