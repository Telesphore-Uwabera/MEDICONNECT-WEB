import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Loader2,
  CheckCircle2,
  CreditCard,
  Wifi,
  Building2,
  ToggleLeft,
  ToggleRight,
  Tag,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Layers,
} from "lucide-react";
import {
  useGetSpecializations,
  useCreateSpecialization,
  useUpdateSpecialization,
  useDeleteSpecialization,
  useGetSpecializationFees,
  useCreateSpecializationFee,
  useUpdateSpecializationFee,
  useDeleteSpecializationFee,
  type ApiSpecialization,
  type ApiSpecializationFee,
} from "@/hooks/admin/use-admin-specializations";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error)
    return String((error as { message: unknown }).message);
  return "Something went wrong";
}

function formatFee(amount: number, currency = "RWF") {
  return `${currency} ${amount.toLocaleString()}`;
}

/** Derive a display name for a fee entry */
function feeDisplayName(fee: ApiSpecializationFee): string {
  const parts = [fee.sub_specialization, fee.tier_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : fee.slug;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows({ cols = 5 }: { cols?: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{
                  width: j === 0 ? "180px" : j === cols - 1 ? "80px" : "110px",
                }}
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

// ─── LangField ────────────────────────────────────────────────────────────────

function LangField({
  label,
  lang,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  lang: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
        {label}
        <span className="px-1 py-0.5 rounded text-[8px] bg-secondary border border-border/60 text-muted-foreground font-mono normal-case tracking-normal">
          {lang}
        </span>
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
      />
    </div>
  );
}

// ─── Expanded sub-specialization rows (inline under parent) ───────────────────

function SubSpecRow({
  fee,
  onEdit,
  onDelete,
  isDeleting,
}: {
  fee: ApiSpecializationFee;
  onEdit: (f: ApiSpecializationFee) => void;
  onDelete: (f: ApiSpecializationFee) => void;
  isDeleting: boolean;
}) {
  return (
    <tr className="border-t border-border/30 bg-secondary/10 hover:bg-secondary/20 transition-colors duration-150">
      {/* Indent + sub name */}
      <td className="px-4 py-2.5 pl-10" colSpan={2}>
        <div className="flex items-center gap-2">
          <span className="w-px h-4 bg-border/60 rounded-full shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground/80 truncate">
              {feeDisplayName(fee)}
            </p>
            {fee.description && (
              <p className="text-[10px] text-muted-foreground/50 truncate">
                {fee.description}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Online fee */}
      <td className="px-4 py-2.5 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        <span className="flex items-center gap-1">
          <Wifi className="w-3 h-3 text-muted-foreground/40" />
          {formatFee(fee.online_fee, fee.currency)}
        </span>
      </td>

      {/* In-person fee */}
      <td className="px-4 py-2.5 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        <span className="flex items-center gap-1">
          <Building2 className="w-3 h-3 text-muted-foreground/40" />
          {formatFee(fee.in_person_fee, fee.currency)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-2.5">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium",
            fee.is_active
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          <span
            className={cn(
              "w-1 h-1 rounded-full mr-1",
              fee.is_active ? "bg-emerald-500" : "bg-muted-foreground",
            )}
          />
          {fee.is_active ? "Active" : "Inactive"}
        </Badge>
      </td>

      {/* Actions */}
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onEdit(fee)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all duration-200"
            onClick={() => onDelete(fee)}
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

// ─── Specialization Row (desktop) ─────────────────────────────────────────────

function SpecializationRow({
  spec,
  fees,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddSubSpec,
  isDeleting,
  deletingFeeId,
  onEditFee,
  onDeleteFee,
}: {
  spec: ApiSpecialization;
  fees: ApiSpecializationFee[];
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: (s: ApiSpecialization) => void;
  onDelete: (s: ApiSpecialization) => void;
  onAddSubSpec: (s: ApiSpecialization) => void;
  isDeleting: boolean;
  deletingFeeId: number | null;
  onEditFee: (f: ApiSpecializationFee) => void;
  onDeleteFee: (f: ApiSpecializationFee) => void;
}) {
  return (
    <>
      <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
        {/* Expand toggle + name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onToggleExpand}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors",
                fees.length > 0
                  ? "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  : "text-muted-foreground/30 cursor-default",
              )}
              disabled={fees.length === 0}
              title={
                fees.length > 0
                  ? expanded
                    ? "Collapse"
                    : "Expand sub-specializations"
                  : "No sub-specializations"
              }
            >
              {fees.length > 0 ? (
                expanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )
              ) : (
                <ChevronRight className="w-3.5 h-3.5 opacity-30" />
              )}
            </button>
            <div className="min-w-0">
              <p className="font-semibold text-[11px] text-foreground truncate">
                {spec.name}
              </p>
              <p className="text-[10px] text-muted-foreground/50 truncate">
                {spec.slug}
              </p>
            </div>
          </div>
        </td>

        {/* Description */}
        <td className="px-4 py-3 text-[11px] text-muted-foreground/80 max-w-[200px]">
          <p className="truncate">
            {spec.description ?? (
              <span className="text-muted-foreground/30">—</span>
            )}
          </p>
        </td>

        {/* Sub-spec count */}
        <td className="px-4 py-3">
          {fees.length > 0 ? (
            <Badge
              variant="outline"
              className="border text-[9px] px-1.5 py-0 font-medium bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900"
            >
              <Layers className="w-2.5 h-2.5 mr-1" />
              {fees.length} sub-spec{fees.length !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <span className="text-muted-foreground/30 text-[10px]">None</span>
          )}
        </td>

        {/* Doctors */}
        <td className="px-4 py-3 text-[11px] text-muted-foreground/80">
          {spec.doctors_count ?? 0}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium",
              spec.is_active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            <span
              className={cn(
                "w-1 h-1 rounded-full mr-1",
                spec.is_active ? "bg-emerald-500" : "bg-muted-foreground",
              )}
            />
            {spec.is_active ? "Active" : "Inactive"}
          </Badge>
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-sky-400/60 hover:bg-sky-50/50 hover:text-sky-700 dark:hover:bg-sky-950/20 dark:hover:text-sky-400 transition-all duration-200"
              onClick={() => onAddSubSpec(spec)}
              title="Add sub-specialization"
            >
              <Plus className="w-3 h-3 mr-1" />
              Sub-spec
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
              onClick={() => onEdit(spec)}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all duration-200"
              onClick={() => onDelete(spec)}
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

      {/* Sub-specialization rows */}
      {expanded &&
        fees.map((fee) => (
          <SubSpecRow
            key={fee.id}
            fee={fee}
            onEdit={onEditFee}
            onDelete={onDeleteFee}
            isDeleting={deletingFeeId === fee.id}
          />
        ))}
    </>
  );
}

// ─── Specialization Card (mobile) ─────────────────────────────────────────────

function SpecializationCard({
  spec,
  fees,
  onEdit,
  onDelete,
  onAddSubSpec,
  isDeleting,
  deletingFeeId,
  onEditFee,
  onDeleteFee,
}: {
  spec: ApiSpecialization;
  fees: ApiSpecializationFee[];
  onEdit: (s: ApiSpecialization) => void;
  onDelete: (s: ApiSpecialization) => void;
  onAddSubSpec: (s: ApiSpecialization) => void;
  isDeleting: boolean;
  deletingFeeId: number | null;
  onEditFee: (f: ApiSpecializationFee) => void;
  onDeleteFee: (f: ApiSpecializationFee) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-sm border border-border/60 bg-card overflow-hidden">
      <div className="flex items-start gap-3 p-3.5 hover:bg-secondary/20 transition-colors">
        <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 border border-border/40">
          <Stethoscope className="w-4 h-4 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-[12px] text-foreground truncate">
                {spec.name}
              </p>
              <p className="text-[10px] text-muted-foreground/50">
                {spec.slug}
                {fees.length > 0
                  ? ` · ${fees.length} sub-spec${fees.length !== 1 ? "s" : ""}`
                  : ""}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
                spec.is_active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                  : "bg-muted text-muted-foreground border-border",
              )}
            >
              {spec.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex gap-2 mt-2.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-sky-400/60 hover:bg-sky-50/50 hover:text-sky-700 transition-all duration-200"
              onClick={() => onAddSubSpec(spec)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Sub-spec
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
              onClick={() => onEdit(spec)}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all duration-200"
              onClick={() => onDelete(spec)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-specs on mobile */}
      {fees.length > 0 && (
        <div className="border-t border-border/40">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            {fees.length} sub-specialization{fees.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <div className="divide-y divide-border/30">
              {fees.map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center justify-between px-3.5 py-2.5 bg-secondary/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-foreground/80 truncate">
                      {feeDisplayName(fee)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50">
                      {formatFee(fee.online_fee, fee.currency)} online ·{" "}
                      {formatFee(fee.in_person_fee, fee.currency)} in-person
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] rounded-sm border-border/60 hover:border-primary/40"
                      onClick={() => onEditFee(fee)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:text-red-600"
                      onClick={() => onDeleteFee(fee)}
                      disabled={deletingFeeId === fee.id}
                    >
                      {deletingFeeId === fee.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Specialization Panel ─────────────────────────────────────────────────────

type SpecPanelMode = "create" | "edit";

function SpecializationPanel({
  mode,
  specialization,
  onClose,
}: {
  mode: SpecPanelMode | null;
  specialization: ApiSpecialization | null;
  onClose: () => void;
}) {
  const open = !!mode;
  const isEdit = mode === "edit";
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [nameKiny, setNameKiny] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [isActive, setIsActive] = useState(true);

  const createMutation = useCreateSpecialization();
  const updateMutation = useUpdateSpecialization();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (mode === "edit" && specialization) {
      setName(specialization.name);
      setNameFr(specialization.name_fr ?? "");
      setNameKiny(specialization.name_kiny ?? "");
      setDescription(specialization.description ?? "");
      setIcon(specialization.icon ?? "");
      setIsActive(specialization.is_active);
    } else if (mode === "create") {
      setName("");
      setNameFr("");
      setNameKiny("");
      setDescription("");
      setIcon("");
      setIsActive(true);
    }
  }, [mode, specialization]);

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
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      if (isEdit && specialization) {
        await updateMutation.mutateAsync({
          id: specialization.id,
          name: name.trim(),
          name_fr: nameFr.trim() || undefined,
          name_kiny: nameKiny.trim() || undefined,
          description: description.trim() || undefined,
          icon: icon.trim() || undefined,
          is_active: isActive,
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          name_fr: nameFr.trim() || undefined,
          name_kiny: nameKiny.trim() || undefined,
          description: description.trim() || undefined,
          icon: icon.trim() || undefined,
        });
      }
      toast({
        title: isEdit ? "Specialization updated." : "Specialization created.",
      });
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
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] lg:w-[460px]",
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
                  {isEdit ? "Edit specialization" : "New specialization"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isEdit
                    ? "Update details and translations"
                    : "Create a parent specialization first — then add sub-specializations under it"}
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

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Names section */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Name &amp; Translations
                </p>
                <LangField
                  label="Name"
                  lang="EN"
                  value={name}
                  onChange={setName}
                  placeholder="e.g. Cardiology"
                  required
                />
                <LangField
                  label="Name"
                  lang="FR"
                  value={nameFr}
                  onChange={setNameFr}
                  placeholder="e.g. Cardiologie"
                />
                <LangField
                  label="Name"
                  lang="KIN"
                  value={nameKiny}
                  onChange={setNameKiny}
                  placeholder="e.g. Indwara z'umutima"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this specialization…"
                  rows={3}
                  className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all resize-none"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Icon identifier
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g. heart-icon"
                  className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              {/* Active toggle — only on edit */}
              {isEdit && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2.5">
                    Status
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsActive((v) => !v)}
                    className={cn(
                      "flex items-center gap-2.5 w-full p-3 rounded-lg border transition-colors",
                      isActive
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                        : "border-border/60 bg-secondary/30",
                    )}
                  >
                    {isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="text-left">
                      <p className="text-[12px] font-medium text-foreground">
                        {isActive ? "Active" : "Inactive"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {isActive
                          ? "Visible and available for assignment"
                          : "Hidden from doctor assignment"}
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Read-only slug when editing */}
              {isEdit && specialization?.slug && (
                <InfoTile
                  icon={<Tag className="w-3.5 h-3.5" />}
                  label="Auto-generated slug"
                  value={specialization.slug}
                />
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
                {isSaving
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create specialization"}
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

// ─── Sub-Specialization (Fee) Panel ───────────────────────────────────────────

type FeePanelMode = "create" | "edit";

function SubSpecPanel({
  mode,
  fee,
  parentSpec,
  onClose,
}: {
  mode: FeePanelMode | null;
  fee: ApiSpecializationFee | null;
  parentSpec: ApiSpecialization | null;
  onClose: () => void;
}) {
  const open = !!mode;
  const isEdit = mode === "edit";
  const { toast } = useToast();

  const [subSpec, setSubSpec] = useState("");
  const [subSpecFr, setSubSpecFr] = useState("");
  const [subSpecKiny, setSubSpecKiny] = useState("");
  const [tierName, setTierName] = useState("");
  const [onlineFee, setOnlineFee] = useState("");
  const [inPersonFee, setInPersonFee] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const createMutation = useCreateSpecializationFee();
  const updateMutation = useUpdateSpecializationFee();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (mode === "edit" && fee) {
      setSubSpec(fee.sub_specialization ?? "");
      setSubSpecFr(fee.sub_specialization_fr ?? "");
      setSubSpecKiny(fee.sub_specialization_kiny ?? "");
      setTierName(fee.tier_name ?? "");
      setOnlineFee(String(fee.online_fee));
      setInPersonFee(String(fee.in_person_fee));
      setDescription(fee.description ?? "");
      setIsActive(fee.is_active);
    } else if (mode === "create") {
      setSubSpec("");
      setSubSpecFr("");
      setSubSpecKiny("");
      setTierName("");
      setOnlineFee("");
      setInPersonFee("");
      setDescription("");
      setIsActive(true);
    }
  }, [mode, fee]);

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
    if (!isEdit && !subSpec.trim()) {
      toast({
        title: "Sub-specialization name is required",
        variant: "destructive",
      });
      return;
    }
    if (!isEdit && !tierName.trim()) {
      toast({ title: "Tier name is required", variant: "destructive" });
      return;
    }
    const online = Number(onlineFee);
    const inPerson = Number(inPersonFee);
    if (!onlineFee || isNaN(online) || online < 0) {
      toast({ title: "Enter a valid online fee", variant: "destructive" });
      return;
    }
    if (!inPersonFee || isNaN(inPerson) || inPerson < 0) {
      toast({ title: "Enter a valid in-person fee", variant: "destructive" });
      return;
    }
    try {
      if (isEdit && fee) {
        await updateMutation.mutateAsync({
          id: fee.id,
          online_fee: online,
          in_person_fee: inPerson,
          is_active: isActive,
          tier_name: tierName.trim() || undefined,
          description: description.trim() || undefined,
        });
      } else if (parentSpec) {
        await createMutation.mutateAsync({
          specialization_id: parentSpec.id,
          sub_specialization: subSpec.trim(),
          sub_specialization_fr: subSpecFr.trim() || undefined,
          sub_specialization_kiny: subSpecKiny.trim() || undefined,
          tier_name: tierName.trim(),
          online_fee: online,
          in_person_fee: inPerson,
          description: description.trim() || undefined,
        });
      }
      toast({
        title: isEdit
          ? "Sub-specialization updated."
          : "Sub-specialization created.",
      });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  // Breadcrumb: parent name from specialization_model (edit) or parentSpec (create)
  const parentName =
    parentSpec?.name ?? fee?.specialization_model?.name ?? null;

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
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] lg:w-[460px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  {isEdit
                    ? "Edit sub-specialization"
                    : "Add sub-specialization"}
                </p>
                {parentName && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground truncate">
                    <Stethoscope className="w-3 h-3 shrink-0" />
                    <span className="truncate">{parentName}</span>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span className="text-foreground/60">
                      {isEdit ? (fee?.sub_specialization ?? "sub-spec") : "new"}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Sub-spec names — only on create */}
              {!isEdit && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Sub-specialization name
                  </p>
                  <LangField
                    label="Name"
                    lang="EN"
                    value={subSpec}
                    onChange={setSubSpec}
                    placeholder="e.g. Interventional Cardiology"
                    required
                  />
                  <LangField
                    label="Name"
                    lang="FR"
                    value={subSpecFr}
                    onChange={setSubSpecFr}
                    placeholder="e.g. Cardiologie interventionnelle"
                  />
                  <LangField
                    label="Name"
                    lang="KIN"
                    value={subSpecKiny}
                    onChange={setSubSpecKiny}
                    placeholder="e.g. Ubuvuzi bw'umutima"
                  />
                </div>
              )}

              {/* Tier name */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Tier name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  placeholder="e.g. Junior, Senior, Principal"
                  className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              {/* Fees */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Consultation fees (RWF)
                </p>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                    <Wifi className="w-3 h-3" /> Online fee{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={onlineFee}
                    onChange={(e) => setOnlineFee(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                    <Building2 className="w-3 h-3" /> In-person fee{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={inPersonFee}
                    onChange={(e) => setInPersonFee(e.target.value)}
                    placeholder="e.g. 8000"
                    className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Senior interventional cardiologist"
                  rows={2}
                  className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all resize-none"
                />
              </div>

              {/* Status toggle — only on edit */}
              {isEdit && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2.5">
                    Status
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsActive((v) => !v)}
                    className={cn(
                      "flex items-center gap-2.5 w-full p-3 rounded-lg border transition-colors",
                      isActive
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                        : "border-border/60 bg-secondary/30",
                    )}
                  >
                    {isActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="text-left">
                      <p className="text-[12px] font-medium text-foreground">
                        {isActive ? "Active" : "Inactive"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {isActive
                          ? "Doctors can be assigned this fee tier"
                          : "Deactivated — no new doctor assignments"}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <Button
                className="w-full h-10 text-[12px] rounded-lg gap-2"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEdit ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isSaving
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create sub-specialization"}
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

// ─── Delete dialog ────────────────────────────────────────────────────────────

function DeleteDialog({
  label,
  name,
  onConfirm,
  onCancel,
  isDeleting,
  conflictMessage,
  onDeactivate,
  isDeactivating,
}: {
  label: string;
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  conflictMessage?: string | null;
  onDeactivate?: () => void;
  isDeactivating?: boolean;
}) {
  return (
    <>
      <div
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
      />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm bg-card border border-border rounded-xl shadow-xl p-5 flex flex-col gap-4">
        {conflictMessage ? (
          <>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-foreground">
                  Cannot delete
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  {conflictMessage}
                </p>
                {onDeactivate && (
                  <p className="text-[12px] text-muted-foreground mt-1">
                    You can deactivate it instead to stop new assignments.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-[12px] rounded-lg border-border/60"
                onClick={onCancel}
              >
                Cancel
              </Button>
              {onDeactivate && (
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-[12px] rounded-lg border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/20 gap-1.5"
                  onClick={onDeactivate}
                  disabled={isDeactivating}
                >
                  {isDeactivating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ToggleLeft className="w-3.5 h-3.5" />
                  )}
                  Deactivate
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-[14px] font-semibold text-foreground">
                Delete {label}?
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{name}</span> will
                be permanently removed. This cannot be undone.
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
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageSpecializations() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");

  // Specialization panel
  const [specPanelMode, setSpecPanelMode] = useState<SpecPanelMode | null>(
    null,
  );
  const [editingSpec, setEditingSpec] = useState<ApiSpecialization | null>(
    null,
  );
  const [deletingSpec, setDeletingSpec] = useState<ApiSpecialization | null>(
    null,
  );
  const [deletingSpecId, setDeletingSpecId] = useState<number | null>(null);
  const [specDeleteConflict, setSpecDeleteConflict] = useState<string | null>(
    null,
  );

  // Sub-spec (fee) panel
  const [feePanelMode, setFeePanelMode] = useState<FeePanelMode | null>(null);
  const [editingFee, setEditingFee] = useState<ApiSpecializationFee | null>(
    null,
  );
  const [addingSubSpecFor, setAddingSubSpecFor] =
    useState<ApiSpecialization | null>(null);
  const [deletingFee, setDeletingFee] = useState<ApiSpecializationFee | null>(
    null,
  );
  const [deletingFeeId, setDeletingFeeId] = useState<number | null>(null);
  const [feeDeleteConflict, setFeeDeleteConflict] = useState<string | null>(
    null,
  );
  const [isDeactivatingFee, setIsDeactivatingFee] = useState(false);

  // Expanded rows on desktop (keyed by spec id)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const {
    data: specsData,
    isLoading: specsLoading,
    isError: specsError,
  } = useGetSpecializations();
  const {
    data: fees = [],
    isLoading: feesLoading,
    isError: feesError,
  } = useGetSpecializationFees();

  const specs: ApiSpecialization[] = specsData?.data ?? [];

  const deleteSpecMutation = useDeleteSpecialization();
  const deleteFeeMutation = useDeleteSpecializationFee();
  const updateFeeMutation = useUpdateSpecializationFee();

  // Group fees by specialization_id — skip orphaned fees (null specialization_id)
  const feesBySpecId = useMemo(() => {
    const map: Record<number, ApiSpecializationFee[]> = {};
    fees.forEach((f) => {
      if (f.specialization_id === null) return;
      if (!map[f.specialization_id]) map[f.specialization_id] = [];
      map[f.specialization_id].push(f);
    });
    return map;
  }, [fees]);

  // Filtered specs
  const filteredSpecs = useMemo(() => {
    if (!search.trim()) return specs;
    const q = search.toLowerCase();
    return specs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q),
    );
  }, [specs, search]);

  // Stats
  const withSubSpec = specs.filter(
    (s) => (feesBySpecId[s.id]?.length ?? 0) > 0,
  ).length;
  const activeSpecs = specs.filter((s) => s.is_active).length;
  const activeFees = fees.filter((f) => f.is_active).length;

  // Expand/collapse
  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Specialization actions
  const openCreateSpec = useCallback(() => {
    setEditingSpec(null);
    setSpecPanelMode("create");
  }, []);
  const openEditSpec = useCallback((s: ApiSpecialization) => {
    setEditingSpec(s);
    setSpecPanelMode("edit");
  }, []);
  const closeSpecPanel = useCallback(() => {
    setSpecPanelMode(null);
    setEditingSpec(null);
  }, []);

  const confirmDeleteSpec = useCallback(async () => {
    if (!deletingSpec) return;
    setDeletingSpecId(deletingSpec.id);
    setSpecDeleteConflict(null);
    try {
      await deleteSpecMutation.mutateAsync(deletingSpec.id);
      toast({ title: "Specialization deleted." });
      setDeletingSpec(null);
    } catch (error) {
      const msg = getErrorMessage(error);
      if (
        msg.toLowerCase().includes("doctor") ||
        msg.toLowerCase().includes("linked")
      ) {
        setSpecDeleteConflict(msg);
      } else {
        toast({ title: msg, variant: "destructive" });
        setDeletingSpec(null);
      }
    } finally {
      setDeletingSpecId(null);
    }
  }, [deletingSpec, deleteSpecMutation, toast]);

  // Sub-spec (fee) actions
  const openAddSubSpec = useCallback((s: ApiSpecialization) => {
    setAddingSubSpecFor(s);
    setEditingFee(null);
    setFeePanelMode("create");
  }, []);
  const openEditFee = useCallback((f: ApiSpecializationFee) => {
    setEditingFee(f);
    setAddingSubSpecFor(null);
    setFeePanelMode("edit");
  }, []);
  const closeFeePanel = useCallback(() => {
    setFeePanelMode(null);
    setEditingFee(null);
    setAddingSubSpecFor(null);
  }, []);

  const confirmDeleteFee = useCallback(async () => {
    if (!deletingFee) return;
    setDeletingFeeId(deletingFee.id);
    setFeeDeleteConflict(null);
    try {
      await deleteFeeMutation.mutateAsync(deletingFee.id);
      toast({ title: "Sub-specialization deleted." });
      setDeletingFee(null);
    } catch (error) {
      const msg = getErrorMessage(error);
      if (
        msg.toLowerCase().includes("doctor") ||
        msg.toLowerCase().includes("assigned") ||
        msg.toLowerCase().includes("deactivate")
      ) {
        setFeeDeleteConflict(msg);
      } else {
        toast({ title: msg, variant: "destructive" });
        setDeletingFee(null);
      }
    } finally {
      setDeletingFeeId(null);
    }
  }, [deletingFee, deleteFeeMutation, toast]);

  const handleDeactivateFee = useCallback(async () => {
    if (!deletingFee) return;
    setIsDeactivatingFee(true);
    try {
      await updateFeeMutation.mutateAsync({
        id: deletingFee.id,
        is_active: false,
      });
      toast({ title: "Sub-specialization deactivated." });
      setDeletingFee(null);
      setFeeDeleteConflict(null);
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    } finally {
      setIsDeactivatingFee(false);
    }
  }, [deletingFee, updateFeeMutation, toast]);

  const isLoading = specsLoading || feesLoading;
  const isError = specsError || feesError;

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.specializations.overview_title")}
          subtitle={t("pages.specializations.overview_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard
              label="Total"
              value={specs.length}
              icon={Stethoscope}
              accent="primary"
            />
            <StatCard
              label="Active"
              value={activeSpecs}
              icon={CheckCircle2}
              accent="success"
            />
            <StatCard
              label="With sub-specs"
              value={withSubSpec}
              icon={Layers}
              accent="warning"
            />
            <StatCard
              label="Active fees"
              value={activeFees}
              icon={CreditCard}
              accent="info"
            />
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 mt-3 sm:mt-4 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <p className="text-[11px] text-muted-foreground shrink-0">
              {isLoading ? (
                <span className="text-muted-foreground/50">Loading…</span>
              ) : (
                <>
                  <span className="font-bold text-foreground">
                    {specs.length}
                  </span>{" "}
                  {specs.length === 1 ? "specialization" : "specializations"}
                  {fees.length > 0 && (
                    <span className="text-muted-foreground/50 ml-1">
                      · {fees.length} sub-specs
                    </span>
                  )}
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
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search specializations…"
                  className="w-52 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
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

              <Button
                size="sm"
                className="h-8 px-3 text-[11px] rounded-sm gap-1.5"
                onClick={openCreateSpec}
              >
                <Plus className="w-3.5 h-3.5" />
                Add specialization
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
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <AlertCircle className="w-8 h-8 text-destructive/60" />
                <p className="text-[12px] font-semibold text-destructive">
                  Failed to load data
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Check your connection and try again
                </p>
              </div>
            ) : !isLoading && filteredSpecs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                  <Stethoscope className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {search
                      ? "No specializations match your search"
                      : "No specializations yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {search
                      ? "Try a different keyword"
                      : "Create a parent specialization, then add sub-specializations under it"}
                  </p>
                </div>
                {!search && (
                  <Button
                    size="sm"
                    className="mt-1 h-8 px-4 text-[11px] rounded-sm gap-1.5"
                    onClick={openCreateSpec}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add specialization
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
                        <th className="text-left px-4 py-3 font-semibold">
                          Specialization
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Description
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Sub-specs
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Doctors
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <SkeletonRows cols={6} />
                      ) : (
                        filteredSpecs.map((spec) => (
                          <SpecializationRow
                            key={spec.id}
                            spec={spec}
                            fees={feesBySpecId[spec.id] ?? []}
                            expanded={expandedIds.has(spec.id)}
                            onToggleExpand={() => toggleExpand(spec.id)}
                            onEdit={openEditSpec}
                            onDelete={setDeletingSpec}
                            onAddSubSpec={openAddSubSpec}
                            isDeleting={deletingSpecId === spec.id}
                            deletingFeeId={deletingFeeId}
                            onEditFee={openEditFee}
                            onDeleteFee={setDeletingFee}
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
                        <div
                          key={i}
                          className="h-24 rounded-sm border border-border/60 bg-card animate-pulse"
                        />
                      ))
                    : filteredSpecs.map((spec) => (
                        <SpecializationCard
                          key={spec.id}
                          spec={spec}
                          fees={feesBySpecId[spec.id] ?? []}
                          onEdit={openEditSpec}
                          onDelete={setDeletingSpec}
                          onAddSubSpec={openAddSubSpec}
                          isDeleting={deletingSpecId === spec.id}
                          deletingFeeId={deletingFeeId}
                          onEditFee={openEditFee}
                          onDeleteFee={setDeletingFee}
                        />
                      ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Specialization panel */}
      <SpecializationPanel
        mode={specPanelMode}
        specialization={editingSpec}
        onClose={closeSpecPanel}
      />

      {/* Sub-spec (fee) panel */}
      <SubSpecPanel
        mode={feePanelMode}
        fee={editingFee}
        parentSpec={addingSubSpecFor}
        onClose={closeFeePanel}
      />

      {/* Delete specialization dialog */}
      {deletingSpec && (
        <DeleteDialog
          label="specialization"
          name={deletingSpec.name}
          onConfirm={confirmDeleteSpec}
          onCancel={() => {
            setDeletingSpec(null);
            setSpecDeleteConflict(null);
          }}
          isDeleting={deleteSpecMutation.isPending}
          conflictMessage={specDeleteConflict}
        />
      )}

      {/* Delete fee dialog */}
      {deletingFee && (
        <DeleteDialog
          label="sub-specialization"
          name={feeDisplayName(deletingFee)}
          onConfirm={confirmDeleteFee}
          onCancel={() => {
            setDeletingFee(null);
            setFeeDeleteConflict(null);
          }}
          isDeleting={deleteFeeMutation.isPending}
          conflictMessage={feeDeleteConflict}
          onDeactivate={feeDeleteConflict ? handleDeactivateFee : undefined}
          isDeactivating={isDeactivatingFee}
        />
      )}
    </DashboardLayout>
  );
}

export default ManageSpecializations;
