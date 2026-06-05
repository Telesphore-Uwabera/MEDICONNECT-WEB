import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Upload,
  Loader2,
  ImageOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Phone,
  Mail,
  Percent,
} from "lucide-react";
import {
  useGetAdminInsurances,
  useCreateInsurance,
  useUpdateInsurance,
  useUploadInsuranceLogo,
  useDeleteInsurance,
  type ApiInsurance,
} from "@/hooks/admin/use-admin-insurances";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

const typeStyle: Record<string, string> = {
  public:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  private:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{ width: j === 0 ? "200px" : j === 4 ? "80px" : "90px" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── InfoTile ─────────────────────────────────────────────────────────────────

const InfoTile = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="p-3 rounded-lg border border-border/60 bg-secondary/30">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <p className="text-[13px] font-medium text-foreground truncate">{value}</p>
  </div>
);

// ─── Desktop row ──────────────────────────────────────────────────────────────

function InsuranceRow({
  ins,
  onEdit,
  onDelete,
  isDeleting,
}: {
  ins: ApiInsurance;
  onEdit: (ins: ApiInsurance) => void;
  onDelete: (ins: ApiInsurance) => void;
  isDeleting: boolean;
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      {/* Logo + Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {ins.logo ? (
            <img
              src={ins.logo}
              alt={ins.name}
              className="h-9 w-9 rounded-sm object-contain flex-shrink-0 border border-border/40 bg-white p-0.5"
            />
          ) : (
            <div className="h-9 w-9 rounded-sm bg-muted/60 flex items-center justify-center shrink-0 border border-border/40">
              <ImageOff className="w-4 h-4 text-muted-foreground/40" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">
              {ins.name}
            </p>
            {ins.code && (
              <p className="text-[10px] text-muted-foreground/50 truncate">
                {ins.code}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        {ins.type ? (
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize",
              typeStyle[ins.type] ?? "bg-muted text-muted-foreground border-border",
            )}
          >
            {ins.type}
          </Badge>
        ) : (
          <span className="text-muted-foreground/30 text-[11px]">—</span>
        )}
      </td>

      {/* Coverage */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {ins.coverage_percentage ? `${ins.coverage_percentage}%` : <span className="text-muted-foreground/30">—</span>}
      </td>

      {/* Logo status */}
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium",
            ins.logo
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          <span
            className={cn(
              "w-1 h-1 rounded-full mr-1",
              ins.logo ? "bg-emerald-500" : "bg-muted-foreground",
            )}
          />
          {ins.logo ? "Set" : "Missing"}
        </Badge>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onEdit(ins)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all duration-200"
            onClick={() => onDelete(ins)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function InsuranceCard({
  ins,
  onEdit,
  onDelete,
  isDeleting,
}: {
  ins: ApiInsurance;
  onEdit: (ins: ApiInsurance) => void;
  onDelete: (ins: ApiInsurance) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      {ins.logo ? (
        <img
          src={ins.logo}
          alt={ins.name}
          className="h-10 w-10 rounded-sm object-contain flex-shrink-0 mt-0.5 border border-border/40 bg-white p-0.5"
        />
      ) : (
        <div className="h-10 w-10 rounded-sm bg-muted/60 flex items-center justify-center shrink-0 mt-0.5 border border-border/40">
          <ImageOff className="w-4 h-4 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">
              {ins.name}
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              {ins.code ?? `#${ins.id}`}
              {ins.coverage_percentage ? ` · ${ins.coverage_percentage}% coverage` : ""}
            </p>
          </div>
          {ins.type && (
            <Badge
              variant="outline"
              className={cn(
                "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
                typeStyle[ins.type] ?? "bg-muted text-muted-foreground border-border",
              )}
            >
              {ins.type}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 mt-2.5">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onEdit(ins)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all duration-200"
            onClick={() => onDelete(ins)}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Right-side Panel (Create / Edit) ─────────────────────────────────────────

type PanelMode = "create" | "edit";

function InsurancePanel({
  mode,
  insurance,
  onClose,
}: {
  mode: PanelMode | null;
  insurance: ApiInsurance | null;
  onClose: () => void;
}) {
  const open = !!mode;
  const isEdit = mode === "edit";
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const createMutation = useCreateInsurance();
  const updateMutation = useUpdateInsurance();
  const uploadLogoMutation = useUploadInsuranceLogo();

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadLogoMutation.isPending;

  useEffect(() => {
    if (mode === "edit" && insurance) {
      setName(insurance.name);
      setLogoPreview(insurance.logo ?? null);
      setLogoFile(null);
    } else if (mode === "create") {
      setName("");
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [mode, insurance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      let savedId: number;
      if (isEdit && insurance) {
        await updateMutation.mutateAsync({ id: insurance.id, name: name.trim() });
        savedId = insurance.id;
      } else {
        const res = await createMutation.mutateAsync({ name: name.trim() });
        savedId = res.insurance.id;
      }
      if (logoFile) {
        await uploadLogoMutation.mutateAsync({ id: savedId, file: logoFile });
      }
      toast({ title: isEdit ? "Insurance updated." : "Insurance created." });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
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
        {open && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  {isEdit ? "Edit insurance" : "Add insurance"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isEdit ? "Update name and logo" : "Create a new insurance provider"}
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

              {/* Logo upload */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2.5">
                  Logo
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl border border-border/60 bg-secondary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-1" />
                    ) : (
                      <ImageOff className="w-6 h-6 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-[11px] rounded-sm border-border/60 gap-1.5 hover:border-primary/40 hover:bg-secondary/30 transition-all"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {logoPreview ? "Change logo" : "Upload logo"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                      JPEG or PNG · max 2MB
                    </p>
                    {logoFile && (
                      <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {logoFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. RSSB, MMI, Radiant"
                  className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>

              {/* Read-only extra info when editing */}
              {isEdit && insurance && (insurance.website || insurance.phone || insurance.email || insurance.coverage_percentage) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2.5">
                    Details
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {insurance.coverage_percentage && (
                      <InfoTile
                        icon={<Percent className="w-3.5 h-3.5" />}
                        label="Coverage"
                        value={`${insurance.coverage_percentage}%`}
                      />
                    )}
                    {insurance.country && (
                      <InfoTile
                        icon={<Globe className="w-3.5 h-3.5" />}
                        label="Country"
                        value={insurance.country}
                      />
                    )}
                    {insurance.phone && (
                      <InfoTile
                        icon={<Phone className="w-3.5 h-3.5" />}
                        label="Phone"
                        value={insurance.phone}
                      />
                    )}
                    {insurance.email && (
                      <InfoTile
                        icon={<Mail className="w-3.5 h-3.5" />}
                        label="Email"
                        value={insurance.email}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <Button
                className="w-full h-10 text-[12px] rounded-lg gap-2"
                onClick={handleSubmit}
                disabled={isSaving || !name.trim()}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEdit ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create insurance"}
              </Button>
              <Button
                variant="ghost"
                className="w-full h-9 text-[12px] rounded-lg text-muted-foreground"
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

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteDialog({
  insurance,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  insurance: ApiInsurance | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  if (!insurance) return null;
  return (
    <>
      <div onClick={onCancel} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm bg-card border border-border rounded-xl shadow-xl p-5 flex flex-col gap-4">
        <div>
          <p className="text-[14px] font-semibold text-foreground">Delete insurance?</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{insurance.name}</span>{" "}
            will be permanently removed. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9 text-[12px] rounded-lg border-border/60"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1 h-9 text-[12px] rounded-lg gap-1.5"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageInsurances() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [panelMode, setPanelMode] = useState<PanelMode | null>(null);
  const [editing, setEditing] = useState<ApiInsurance | null>(null);
  const [deletingInsurance, setDeletingInsurance] = useState<ApiInsurance | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, isError } = useGetAdminInsurances(page);
  const deleteMutation = useDeleteInsurance();

  // Real paginated data
  const insurances  = data?.data ?? [];
  const total       = data?.total ?? 0;
  const perPage     = data?.per_page ?? 20;
  const totalPages  = Math.ceil(total / perPage);

  // Client-side search within current page
  const filtered = useMemo(() => {
    if (!search.trim()) return insurances;
    const q = search.toLowerCase();
    return insurances.filter(
      (ins) =>
        ins.name.toLowerCase().includes(q) ||
        (ins.code ?? "").toLowerCase().includes(q) ||
        (ins.country ?? "").toLowerCase().includes(q),
    );
  }, [insurances, search]);

  const withLogo    = insurances.filter((i) => !!i.logo).length;
  const withoutLogo = insurances.filter((i) => !i.logo).length;

  const openCreate = useCallback(() => { setEditing(null); setPanelMode("create"); }, []);
  const openEdit   = useCallback((ins: ApiInsurance) => { setEditing(ins); setPanelMode("edit"); }, []);
  const closePanel = useCallback(() => { setPanelMode(null); setEditing(null); }, []);

  const requestDelete = useCallback((ins: ApiInsurance) => {
    setDeletingInsurance(ins);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingInsurance) return;
    setDeletingId(deletingInsurance.id);
    try {
      await deleteMutation.mutateAsync(deletingInsurance.id);
      toast({ title: "Insurance deleted." });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    } finally {
      setDeletingId(null);
      setDeletingInsurance(null);
    }
  }, [deletingInsurance, deleteMutation, toast]);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.overview_title")}
          subtitle={t("pages.admin.overview_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-3 gap-2">
            <StatCard label="Total insurances" value={total}       icon={ShieldCheck}   accent="primary" />
            <StatCard label="With logo"         value={withLogo}   icon={CheckCircle2}  accent="success" />
            <StatCard label="Missing logo"      value={withoutLogo} icon={ImageOff}     accent="warning" />
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <p className="text-[11px] text-muted-foreground shrink-0">
              {isLoading ? (
                <span className="text-muted-foreground/50">Loading…</span>
              ) : (
                <>
                  <span className="font-bold text-foreground">{total}</span>{" "}
                  {total === 1 ? "insurance" : "insurances"}
                </>
              )}
            </p>

            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search name, code, country…"
                  className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Add button */}
              <Button size="sm" className="h-8 px-3 text-[11px] rounded-sm gap-1.5" onClick={openCreate}>
                <Plus className="w-3.5 h-3.5" />
                Add insurance
              </Button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="sm:hidden px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, code, country…"
                className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <p className="text-[12px] font-semibold text-destructive">Failed to load insurances</p>
                <p className="text-[11px] text-muted-foreground/70">Check your connection and try again</p>
              </div>
            ) : !isLoading && filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                  <ShieldCheck className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {search ? "No insurances match your search" : "No insurances yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {search ? "Try a different keyword" : "Add your first insurance provider to get started"}
                  </p>
                </div>
                {!search && (
                  <Button size="sm" className="mt-1 h-8 px-4 text-[11px] rounded-sm gap-1.5" onClick={openCreate}>
                    <Plus className="w-3.5 h-3.5" />
                    Add insurance
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Name</th>
                        <th className="text-left px-4 py-3 font-semibold">Type</th>
                        <th className="text-left px-4 py-3 font-semibold">Coverage</th>
                        <th className="text-left px-4 py-3 font-semibold">Logo</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <SkeletonRows />
                      ) : (
                        filtered.map((ins) => (
                          <InsuranceRow
                            key={ins.id}
                            ins={ins}
                            onEdit={openEdit}
                            onDelete={requestDelete}
                            isDeleting={deletingId === ins.id}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden flex flex-col gap-2">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 rounded-sm border border-border/60 bg-card animate-pulse" />
                      ))
                    : filtered.map((ins) => (
                        <InsuranceCard
                          key={ins.id}
                          ins={ins}
                          onEdit={openEdit}
                          onDelete={requestDelete}
                          isDeleting={deletingId === ins.id}
                        />
                      ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground">
                      Page{" "}
                      <span className="font-semibold text-foreground">{page}</span>{" "}
                      of{" "}
                      <span className="font-semibold text-foreground">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <InsurancePanel mode={panelMode} insurance={editing} onClose={closePanel} />

      <DeleteDialog
        insurance={deletingInsurance}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingInsurance(null)}
        isDeleting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}

export default ManageInsurances;

