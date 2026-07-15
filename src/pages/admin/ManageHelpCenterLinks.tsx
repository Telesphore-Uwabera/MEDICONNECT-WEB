import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  LifeBuoy,
  ToggleLeft,
  ToggleRight,
  Search,
  ChevronDown,
} from "lucide-react";
import {
  useGetHelpCenterLinks,
  useCreateHelpCenterLink,
  useUpdateHelpCenterLink,
  useDeleteHelpCenterLink,
  useRestoreHelpCenterLink,
  type ApiHelpCenterLink,
  type HelpCenterLinkPayload,
  type HelpCenterCategory,
} from "@/hooks/admin/use-admin-help-center";
import { HELP_CENTER_ICON_NAMES, resolveHelpCenterIcon } from "@/lib/help-center-icons";

const CATEGORY_OPTIONS: { value: HelpCenterCategory; label: string }[] = [
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "hospital", label: "Health Facility" },
  { value: "pharmacy", label: "Pharmacy" },
];

const inputCls =
  "w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5";

function getErrMsg(err: unknown, fallback: string): string {
  return (err as { message?: string })?.message || fallback;
}

function emptyForm(): HelpCenterLinkPayload {
  return { title: "", description: "", url: "", icon: "", category: "patient", order: 0, is_active: true };
}

// ─── Slide-over panel (create / edit) ─────────────────────────────────────────

function LinkPanel({
  mode,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  initial: ApiHelpCenterLink | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<HelpCenterLinkPayload>(
    initial
      ? {
          title: initial.title,
          description: initial.description,
          url: initial.url,
          icon: initial.icon ?? "",
          category: initial.category,
          order: initial.order,
          is_active: initial.is_active,
        }
      : emptyForm(),
  );

  const createRx = useCreateHelpCenterLink();
  const updateRx = useUpdateHelpCenterLink();
  const saving = createRx.isPending || updateRx.isPending;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const canSave = form.title.trim().length > 0 && form.url.trim().length > 0 && !saving;

  const handleSave = () => {
    if (!canSave) return;
    const payload: HelpCenterLinkPayload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
      icon: form.icon?.trim() || null,
      order: Number(form.order) || 0,
    };

    if (mode === "create") {
      createRx.mutate(payload, {
        onSuccess: () => {
          toast.success("Help center link created.");
          onClose();
        },
        onError: (err) => toast.error(getErrMsg(err, "Failed to create link.")),
      });
    } else if (initial) {
      updateRx.mutate(
        { id: initial.id, payload },
        {
          onSuccess: () => {
            toast.success("Help center link updated.");
            onClose();
          },
          onError: (err) => toast.error(getErrMsg(err, "Failed to update link.")),
        },
      );
    }
  };

  const PreviewIcon = resolveHelpCenterIcon(form.icon);

  return (
    <>
      <div className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[9991] w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-[6px] bg-primary/10 flex items-center justify-center border border-primary/20">
              <PreviewIcon className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">
              {mode === "create" ? "Add help center link" : "Edit help center link"}
            </p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label className={labelCls}>Title *</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Find and book doctors"
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={cn(inputCls, "min-h-[80px] resize-y")}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Search available doctors and book consultations online or in person."
            />
          </div>

          <div>
            <label className={labelCls}>URL *</label>
            <input
              className={inputCls}
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="/patient/search-doctors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category *</label>
              <select
                className={inputCls}
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as HelpCenterCategory }))}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <input
                type="number"
                className={inputCls}
                value={form.order ?? 0}
                onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Icon</label>
            <input
              className={inputCls}
              list="help-center-icon-names"
              value={form.icon ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
              placeholder="calendar"
            />
            <datalist id="help-center-icon-names">
              {HELP_CENTER_ICON_NAMES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <p className="mt-1 text-[10px] text-muted-foreground/50">Optional lucide icon name, e.g. calendar, building, pill.</p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
              className="shrink-0"
            >
              {form.is_active ? (
                <ToggleRight className="w-8 h-8 text-primary" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />
              )}
            </button>
            <span className="text-[12px] font-medium text-foreground">
              {form.is_active ? "Active — visible on the public help page" : "Inactive — hidden from the public help page"}
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3.5 border-t border-border/60 shrink-0">
          <Button variant="ghost" className="h-9 px-4 text-[12px] rounded-[6px]" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="h-9 px-5 text-[12px] rounded-[6px] gap-1.5" onClick={handleSave} disabled={!canSave}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === "create" ? "Create link" : "Save changes"}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────

function LinkRow({
  link,
  onEdit,
  onDelete,
  deleting,
}: {
  link: ApiHelpCenterLink;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const Icon = resolveHelpCenterIcon(link.icon);
  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
      <td className="px-3 lg:px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[6px] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground truncate">{link.title}</p>
            <p className="text-[10.5px] text-muted-foreground/60 truncate max-w-[280px]">{link.description}</p>
          </div>
        </div>
      </td>
      <td className="px-3 lg:px-4 py-3">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold uppercase tracking-wide bg-secondary text-muted-foreground border border-border/50">
          {link.category}
        </span>
      </td>
      <td className="hidden lg:table-cell px-4 py-3">
        <span className="text-[11px] font-mono text-muted-foreground">{link.url}</span>
      </td>
      <td className="px-3 lg:px-4 py-3 text-[11px] text-muted-foreground tabular-nums">{link.order}</td>
      <td className="px-3 lg:px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold border",
            link.is_active
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50"
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50",
          )}
        >
          {link.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-3 lg:px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onEdit}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
            title="Delete"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageHelpCenterLinks() {
  const [categoryFilter, setCategoryFilter] = useState<HelpCenterCategory | "">("");
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<{ mode: "create" | "edit"; link: ApiHelpCenterLink | null } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: links, isLoading, isError } = useGetHelpCenterLinks(
    categoryFilter ? { category: categoryFilter } : undefined,
  );
  const deleteRx = useDeleteHelpCenterLink();
  const restoreRx = useRestoreHelpCenterLink();

  const filtered = useMemo(() => {
    const list = links ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.url.toLowerCase().includes(q),
    );
  }, [links, search]);

  const handleDelete = (link: ApiHelpCenterLink) => {
    if (!window.confirm(`Delete "${link.title}"? You can undo this right after.`)) return;
    setDeletingId(link.id);
    deleteRx.mutate(link.id, {
      onSuccess: () => {
        toast.success("Help center link deleted.", {
          action: {
            label: "Undo",
            onClick: () =>
              restoreRx.mutate(link.id, {
                onSuccess: () => toast.success("Link restored."),
                onError: (err) => toast.error(getErrMsg(err, "Failed to restore link.")),
              }),
          },
        });
      },
      onError: (err) => toast.error(getErrMsg(err, "Failed to delete link.")),
      onSettled: () => setDeletingId(null),
    });
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title="Help Center Links"
          subtitle="Manage the topics shown on the public help page."
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search links…"
                  className="w-52 pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as HelpCenterCategory | "")}
                  className="appearance-none pl-3 pr-7 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">All categories</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
              </div>
            </div>
            <Button
              className="h-9 px-4 text-[12px] rounded-[6px] gap-1.5"
              onClick={() => setPanel({ mode: "create", link: null })}
            >
              <Plus className="w-3.5 h-3.5" />
              Add link
            </Button>
          </div>

          {/* Content */}
          {isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <p className="text-[12px] font-semibold text-destructive">Failed to load help center links</p>
              <p className="text-[11px] text-muted-foreground/70">Check your connection and try again.</p>
            </div>
          ) : !isLoading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-[6px] border border-dashed border-border/60">
              <div className="w-12 h-12 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                <LifeBuoy className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground">No help center links yet</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">Add the topics patients and doctors see on the public help page.</p>
              </div>
              <Button size="sm" className="h-8 px-4 text-[11px] rounded-[6px] gap-1.5" onClick={() => setPanel({ mode: "create", link: null })}>
                <Plus className="w-3.5 h-3.5" /> Add first link
              </Button>
            </div>
          ) : (
            <div className="rounded-[6px] border border-border/70 bg-card overflow-x-auto shadow-sm">
              <table className="w-full text-[11px] min-w-[720px]">
                <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                  <tr>
                    <th className="text-left px-3 lg:px-4 py-3 font-semibold">Link</th>
                    <th className="text-left px-3 lg:px-4 py-3 font-semibold">Category</th>
                    <th className="hidden lg:table-cell text-left px-4 py-3 font-semibold">URL</th>
                    <th className="text-left px-3 lg:px-4 py-3 font-semibold">Order</th>
                    <th className="text-left px-3 lg:px-4 py-3 font-semibold">Status</th>
                    <th className="px-3 lg:px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={6} className="px-4 py-3">
                            <div className="h-8 rounded-[6px] bg-muted/50 animate-pulse" />
                          </td>
                        </tr>
                      ))
                    : filtered.map((link) => (
                        <LinkRow
                          key={link.id}
                          link={link}
                          onEdit={() => setPanel({ mode: "edit", link })}
                          onDelete={() => handleDelete(link)}
                          deleting={deletingId === link.id}
                        />
                      ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {panel && <LinkPanel mode={panel.mode} initial={panel.link} onClose={() => setPanel(null)} />}
    </DashboardLayout>
  );
}

export default ManageHelpCenterLinks;
