import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Wifi,
  Building2,
  ToggleLeft,
  ToggleRight,
  Tag,
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
  return "Something went wrong";
}

function formatFee(amount: number, currency = "RWF") {
  return `${currency} ${amount.toLocaleString()}`;
}

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
                style={{ width: j === 0 ? "200px" : j === 4 ? "80px" : "100px" }}
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

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type TabId = "specializations" | "fees";

function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "specializations", label: "Specializations" },
    { id: "fees", label: "Consultation Fees" },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-border/60 px-3 sm:px-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-3 py-2.5 text-[11px] font-medium border-b-2 -mb-px transition-colors",
            active === tab.id
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Specialization Row (desktop) ─────────────────────────────────────────────

function SpecializationRow({
  spec,
  fee,
  onEdit,
  onDelete,
  isDeleting,
}: {
  spec: ApiSpecialization;
  fee?: ApiSpecializationFee;
  onEdit: (s: ApiSpecialization) => void;
  onDelete: (s: ApiSpecialization) => void;
  isDeleting: boolean;
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      {/* Name + slug */}
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-[11px] text-foreground truncate">{spec.name}</p>
          <p className="text-[10px] text-muted-foreground/50 truncate">{spec.slug}</p>
        </div>
      </td>

      {/* Description */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 max-w-[220px]">
        <p className="truncate">{spec.description ?? <span className="text-muted-foreground/30">—</span>}</p>
      </td>

      {/* Fee status */}
      <td className="px-4 py-3">
        {fee ? (
          <Badge
            variant="outline"
            className="border text-[9px] px-1.5 py-0 font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
          >
            <span className="w-1 h-1 rounded-full mr-1 bg-emerald-500" />
            {formatFee(fee.online_fee, fee.currency)}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border text-[9px] px-1.5 py-0 font-medium bg-muted text-muted-foreground border-border"
          >
            <span className="w-1 h-1 rounded-full mr-1 bg-muted-foreground" />
            No fee
          </Badge>
        )}
      </td>

      {/* Active */}
      <td className="px-4 py-3">
        {fee ? (
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium",
              fee.is_active
                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            {fee.is_active ? "Active" : "Inactive"}
          </Badge>
        ) : (
          <span className="text-muted-foreground/30 text-[11px]">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
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
  );
}

// ─── Specialization Card (mobile) ─────────────────────────────────────────────

function SpecializationCard({
  spec,
  fee,
  onEdit,
  onDelete,
  isDeleting,
}: {
  spec: ApiSpecialization;
  fee?: ApiSpecializationFee;
  onEdit: (s: ApiSpecialization) => void;
  onDelete: (s: ApiSpecialization) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 border border-border/40">
        <Stethoscope className="w-4 h-4 text-primary/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{spec.name}</p>
            <p className="text-[10px] text-muted-foreground/50">
              {spec.slug}
              {fee ? ` · ${formatFee(fee.online_fee, fee.currency)} online` : ""}
            </p>
          </div>
          {fee && (
            <Badge
              variant="outline"
              className={cn(
                "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
                fee.is_active
                  ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900"
                  : "bg-muted text-muted-foreground border-border",
              )}
            >
              {fee.is_active ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 mt-2.5">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onEdit(spec)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all duration-200"
            onClick={() => onDelete(spec)}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Fee Row (desktop) ────────────────────────────────────────────────────────

function FeeRow({
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
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      {/* Name */}
      <td className="px-4 py-3">
        <p className="font-semibold text-[11px] text-foreground truncate">{fee.specialization}</p>
        <p className="text-[10px] text-muted-foreground/50 truncate">{fee.slug}</p>
      </td>

      {/* Online fee */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {formatFee(fee.online_fee, fee.currency)}
      </td>

      {/* In-person fee */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {formatFee(fee.in_person_fee, fee.currency)}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium",
            fee.is_active
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          <span className={cn("w-1 h-1 rounded-full mr-1", fee.is_active ? "bg-emerald-500" : "bg-muted-foreground")} />
          {fee.is_active ? "Active" : "Inactive"}
        </Badge>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onEdit(fee)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all duration-200"
            onClick={() => onDelete(fee)}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Fee Card (mobile) ────────────────────────────────────────────────────────

function FeeCard({
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
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 border border-border/40">
        <DollarSign className="w-4 h-4 text-primary/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{fee.specialization}</p>
            <p className="text-[10px] text-muted-foreground/50">
              {formatFee(fee.online_fee, fee.currency)} online · {formatFee(fee.in_person_fee, fee.currency)} in-person
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium shrink-0",
              fee.is_active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            {fee.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex gap-2 mt-2.5">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onEdit(fee)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all duration-200"
            onClick={() => onDelete(fee)}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>
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
  const [description, setDescription] = useState("");

  const createMutation = useCreateSpecialization();
  const updateMutation = useUpdateSpecialization();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (mode === "edit" && specialization) {
      setName(specialization.name);
      setDescription(specialization.description ?? "");
    } else if (mode === "create") {
      setName("");
      setDescription("");
    }
  }, [mode, specialization]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
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
          description: description.trim() || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }
      toast({ title: isEdit ? "Specialization updated." : "Specialization created." });
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  {isEdit ? "Edit specialization" : "Add specialization"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isEdit ? "Update name and description" : "Create a new medical specialization"}
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
              {/* Name */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cardiology, Dermatology"
                  className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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

              {/* Read-only slug when editing */}
              {isEdit && specialization?.slug && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2.5">
                    Details
                  </p>
                  <InfoTile
                    icon={<Tag className="w-3.5 h-3.5" />}
                    label="Slug"
                    value={specialization.slug}
                  />
                </div>
              )}
            </div>

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
                {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create specialization"}
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

// ─── Fee Panel ────────────────────────────────────────────────────────────────

type FeePanelMode = "create" | "edit";

function FeePanel({
  mode,
  fee,
  specializations,
  onClose,
}: {
  mode: FeePanelMode | null;
  fee: ApiSpecializationFee | null;
  specializations: ApiSpecialization[];
  onClose: () => void;
}) {
  const open = !!mode;
  const isEdit = mode === "edit";
  const { toast } = useToast();

  const [specId, setSpecId] = useState<number | "">("");
  const [onlineFee, setOnlineFee] = useState("");
  const [inPersonFee, setInPersonFee] = useState("");
  const [isActive, setIsActive] = useState(true);

  const createMutation = useCreateSpecializationFee();
  const updateMutation = useUpdateSpecializationFee();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (mode === "edit" && fee) {
      setSpecId(fee.specialization_id ?? "");
      setOnlineFee(String(fee.online_fee));
      setInPersonFee(String(fee.in_person_fee));
      setIsActive(fee.is_active);
    } else if (mode === "create") {
      setSpecId("");
      setOnlineFee("");
      setInPersonFee("");
      setIsActive(true);
    }
  }, [mode, fee]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSubmit = async () => {
    if (!isEdit && !specId) {
      toast({ title: "Specialization is required", variant: "destructive" });
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
        });
      } else {
        await createMutation.mutateAsync({
          specialization_id: specId as number,
          online_fee: online,
          in_person_fee: inPerson,
        });
      }
      toast({ title: isEdit ? "Fee updated." : "Fee created." });
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  {isEdit ? "Edit consultation fee" : "Add consultation fee"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isEdit ? "Update fee rates and status" : "Set fees for a specialization"}
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
              {/* Specialization selector — only on create */}
              {!isEdit && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={specId}
                    onChange={(e) => setSpecId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  >
                    <option value="">Select a specialization…</option>
                    {specializations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Online fee */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Online fee (RWF) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Wifi className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                  <input
                    type="number"
                    min={0}
                    value={onlineFee}
                    onChange={(e) => setOnlineFee(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>
              </div>

              {/* In-person fee */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  In-person fee (RWF) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                  <input
                    type="number"
                    min={0}
                    value={inPersonFee}
                    onChange={(e) => setInPersonFee(e.target.value)}
                    placeholder="e.g. 8000"
                    className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>
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
                      <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <p className="text-[12px] font-medium text-foreground">
                        {isActive ? "Active" : "Inactive"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {isActive
                          ? "Doctors can be assigned to this fee"
                          : "Fee is disabled, no new assignments"}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

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
                {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create fee"}
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
}: {
  label: string;
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <>
      <div onClick={onCancel} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm bg-card border border-border rounded-xl shadow-xl p-5 flex flex-col gap-4">
        <div>
          <p className="text-[14px] font-semibold text-foreground">Delete {label}?</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{name}</span>{" "}
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

function ManageSpecializations() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabId>("specializations");
  const [search, setSearch] = useState("");

  // Specialization panel state
  const [specPanelMode, setSpecPanelMode] = useState<SpecPanelMode | null>(null);
  const [editingSpec, setEditingSpec] = useState<ApiSpecialization | null>(null);
  const [deletingSpec, setDeletingSpec] = useState<ApiSpecialization | null>(null);
  const [deletingSpecId, setDeletingSpecId] = useState<number | null>(null);

  // Fee panel state
  const [feePanelMode, setFeePanelMode] = useState<FeePanelMode | null>(null);
  const [editingFee, setEditingFee] = useState<ApiSpecializationFee | null>(null);
  const [deletingFee, setDeletingFee] = useState<ApiSpecializationFee | null>(null);
  const [deletingFeeId, setDeletingFeeId] = useState<number | null>(null);

  const { data: specs = [], isLoading: specsLoading, isError: specsError } = useGetSpecializations();
  const { data: fees = [], isLoading: feesLoading, isError: feesError } = useGetSpecializationFees();

  const deleteSpecMutation = useDeleteSpecialization();
  const deleteFeeMutation = useDeleteSpecializationFee();

  // Build a map slug→specialization_id for enriching fee rows
  const feeSlugToSpecId = useMemo(() => {
    const map: Record<string, number> = {};
    specs.forEach((s) => { map[s.slug] = s.id; });
    return map;
  }, [specs]);

  const enrichedFees: ApiSpecializationFee[] = useMemo(
    () => fees.map((f) => ({ ...f, specialization_id: feeSlugToSpecId[f.slug] })),
    [fees, feeSlugToSpecId],
  );

  // Build a slug→fee map for the specialization table
  const feeBySlug = useMemo(() => {
    const map: Record<string, ApiSpecializationFee> = {};
    enrichedFees.forEach((f) => { map[f.slug] = f; });
    return map;
  }, [enrichedFees]);

  // Filtered lists
  const filteredSpecs = useMemo(() => {
    if (!search.trim()) return specs;
    const q = search.toLowerCase();
    return specs.filter(
      (s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q),
    );
  }, [specs, search]);

  const filteredFees = useMemo(() => {
    if (!search.trim()) return enrichedFees;
    const q = search.toLowerCase();
    return enrichedFees.filter(
      (f) => f.specialization.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q),
    );
  }, [enrichedFees, search]);

  // Stat counts
  const withFee    = specs.filter((s) => !!feeBySlug[s.slug]).length;
  const activeFees = fees.filter((f) => f.is_active).length;

  // Specialization actions
  const openCreateSpec = useCallback(() => { setEditingSpec(null); setSpecPanelMode("create"); }, []);
  const openEditSpec   = useCallback((s: ApiSpecialization) => { setEditingSpec(s); setSpecPanelMode("edit"); }, []);
  const closeSpecPanel = useCallback(() => { setSpecPanelMode(null); setEditingSpec(null); }, []);

  const confirmDeleteSpec = useCallback(async () => {
    if (!deletingSpec) return;
    setDeletingSpecId(deletingSpec.id);
    try {
      await deleteSpecMutation.mutateAsync(deletingSpec.id);
      toast({ title: "Specialization deleted." });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    } finally {
      setDeletingSpecId(null);
      setDeletingSpec(null);
    }
  }, [deletingSpec, deleteSpecMutation, toast]);

  // Fee actions
  const openCreateFee = useCallback(() => { setEditingFee(null); setFeePanelMode("create"); }, []);
  const openEditFee   = useCallback((f: ApiSpecializationFee) => { setEditingFee(f); setFeePanelMode("edit"); }, []);
  const closeFeePanel = useCallback(() => { setFeePanelMode(null); setEditingFee(null); }, []);

  const confirmDeleteFee = useCallback(async () => {
    if (!deletingFee) return;
    setDeletingFeeId(deletingFee.id);
    try {
      await deleteFeeMutation.mutateAsync(deletingFee.id);
      toast({ title: "Fee deleted." });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    } finally {
      setDeletingFeeId(null);
      setDeletingFee(null);
    }
  }, [deletingFee, deleteFeeMutation, toast]);

  const isLoading = activeTab === "specializations" ? specsLoading : feesLoading;
  const isError   = activeTab === "specializations" ? specsError   : feesError;

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.specializations.overview_title")}
          subtitle={t("pages.specializations.overview_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-3 gap-2">
            <StatCard label="Total specializations" value={specs.length}  icon={Stethoscope}  accent="primary" />
            <StatCard label="With fee"              value={withFee}       icon={CheckCircle2} accent="success" />
            <StatCard label="Active fees"           value={activeFees}    icon={DollarSign}   accent="warning" />
          </div>

          {/* Tabs */}
          <div className="mt-3 sm:mt-4">
            <TabBar active={activeTab} onChange={(t) => { setActiveTab(t); setSearch(""); }} />
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <p className="text-[11px] text-muted-foreground shrink-0">
              {isLoading ? (
                <span className="text-muted-foreground/50">Loading…</span>
              ) : activeTab === "specializations" ? (
                <>
                  <span className="font-bold text-foreground">{specs.length}</span>{" "}
                  {specs.length === 1 ? "specialization" : "specializations"}
                </>
              ) : (
                <>
                  <span className="font-bold text-foreground">{fees.length}</span>{" "}
                  {fees.length === 1 ? "fee" : "fees"}
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
                  placeholder="Search…"
                  className="w-44 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Add button */}
              <Button
                size="sm"
                className="h-8 px-3 text-[11px] rounded-sm gap-1.5"
                onClick={activeTab === "specializations" ? openCreateSpec : openCreateFee}
              >
                <Plus className="w-3.5 h-3.5" />
                {activeTab === "specializations" ? "Add specialization" : "Add fee"}
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
                <p className="text-[12px] font-semibold text-destructive">Failed to load data</p>
                <p className="text-[11px] text-muted-foreground/70">Check your connection and try again</p>
              </div>
            ) : activeTab === "specializations" ? (
              /* ── SPECIALIZATIONS TAB ── */
              !isLoading && filteredSpecs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Stethoscope className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      {search ? "No specializations match your search" : "No specializations yet"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {search ? "Try a different keyword" : "Add your first medical specialization to get started"}
                    </p>
                  </div>
                  {!search && (
                    <Button size="sm" className="mt-1 h-8 px-4 text-[11px] rounded-sm gap-1.5" onClick={openCreateSpec}>
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
                          <th className="text-left px-4 py-3 font-semibold">Name</th>
                          <th className="text-left px-4 py-3 font-semibold">Description</th>
                          <th className="text-left px-4 py-3 font-semibold">Online fee</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <SkeletonRows />
                        ) : (
                          filteredSpecs.map((spec) => (
                            <SpecializationRow
                              key={spec.id}
                              spec={spec}
                              fee={feeBySlug[spec.slug]}
                              onEdit={openEditSpec}
                              onDelete={setDeletingSpec}
                              isDeleting={deletingSpecId === spec.id}
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
                      : filteredSpecs.map((spec) => (
                          <SpecializationCard
                            key={spec.id}
                            spec={spec}
                            fee={feeBySlug[spec.slug]}
                            onEdit={openEditSpec}
                            onDelete={setDeletingSpec}
                            isDeleting={deletingSpecId === spec.id}
                          />
                        ))}
                  </div>
                </>
              )
            ) : (
              /* ── FEES TAB ── */
              !isLoading && filteredFees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <DollarSign className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      {search ? "No fees match your search" : "No consultation fees yet"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {search ? "Try a different keyword" : "Add fees per specialization to configure pricing"}
                    </p>
                  </div>
                  {!search && (
                    <Button size="sm" className="mt-1 h-8 px-4 text-[11px] rounded-sm gap-1.5" onClick={openCreateFee}>
                      <Plus className="w-3.5 h-3.5" />
                      Add fee
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
                          <th className="text-left px-4 py-3 font-semibold">Specialization</th>
                          <th className="text-left px-4 py-3 font-semibold">Online fee</th>
                          <th className="text-left px-4 py-3 font-semibold">In-person fee</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <SkeletonRows />
                        ) : (
                          filteredFees.map((fee) => (
                            <FeeRow
                              key={fee.id}
                              fee={fee}
                              onEdit={openEditFee}
                              onDelete={setDeletingFee}
                              isDeleting={deletingFeeId === fee.id}
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
                      : filteredFees.map((fee) => (
                          <FeeCard
                            key={fee.id}
                            fee={fee}
                            onEdit={openEditFee}
                            onDelete={setDeletingFee}
                            isDeleting={deletingFeeId === fee.id}
                          />
                        ))}
                  </div>
                </>
              )
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

      {/* Fee panel */}
      <FeePanel
        mode={feePanelMode}
        fee={editingFee}
        specializations={specs}
        onClose={closeFeePanel}
      />

      {/* Delete dialogs */}
      {deletingSpec && (
        <DeleteDialog
          label="specialization"
          name={deletingSpec.name}
          onConfirm={confirmDeleteSpec}
          onCancel={() => setDeletingSpec(null)}
          isDeleting={deleteSpecMutation.isPending}
        />
      )}
      {deletingFee && (
        <DeleteDialog
          label="fee"
          name={deletingFee.specialization}
          onConfirm={confirmDeleteFee}
          onCancel={() => setDeletingFee(null)}
          isDeleting={deleteFeeMutation.isPending}
        />
      )}
    </DashboardLayout>
  );
}

export default ManageSpecializations;
