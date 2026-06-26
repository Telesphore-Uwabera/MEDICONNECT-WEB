import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import React, { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  SlidersHorizontal,
  Loader2,
  Upload,
  ImageOff,
  RefreshCw,
  Building2,
  ChevronDown,
  Percent,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  HospitalInsurance,
  LinkInsurancePayload,
  PublicInsurance,
  UpdateCoveragePayload,
  useDeleteInsurance,
  useGetInsurances,
  useGetPublicInsurances,
  useLinkInsurance,
  useUpdateCoverage,
  useUploadInsuranceLogo,
} from "@/hooks/hospital/use-hopital-insurances";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (s: string) =>
  s
    ? new Date(s).toLocaleDateString("en-RW", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "—";

const fmtCurrency = (n: number | null, currency = "RWF") =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

// ─────────────────────────────────────────────────────────────────────────────
// Confirm dialog
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  isLoading,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-card border border-border/70 rounded-[6px] shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">

          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-3.5 py-1.5 text-xs rounded-[6px] bg-destructive text-white font-medium hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            Unlink
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo uploader (inside modal)
// ─────────────────────────────────────────────────────────────────────────────
function LogoUploader({
  insuranceId,
  currentLogo,
}: {
  insuranceId: number;
  currentLogo: string | null;
}) {
  const uploadLogo = useUploadInsuranceLogo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadError(null);
    try {
      await uploadLogo.mutateAsync({ id: insuranceId, file });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
        Logo
      </Label>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-[6px] border border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
          {preview ? (
            <img
              src={preview}
              alt="logo"
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <ImageOff className="w-5 h-5 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadLogo.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
          >
            {uploadLogo.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            {uploadLogo.isPending ? "Uploading…" : "Upload image"}
          </button>
          <p className="text-[10px] text-muted-foreground/60">
            JPEG or PNG, max 2MB
          </p>
          {uploadError && (
            <p className="text-[10px] text-destructive">{uploadError}</p>
          )}
          {uploadLogo.isSuccess && (
            <p className="text-[10px] text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Uploaded
            </p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insurance picker — searchable list of public insurances
// ─────────────────────────────────────────────────────────────────────────────
function InsurancePicker({
  value,
  onChange,
  alreadyLinked,
}: {
  value: PublicInsurance | null;
  onChange: (ins: PublicInsurance) => void;
  alreadyLinked: Set<number>;
}) {
  const { data, isLoading } = useGetPublicInsurances();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    if (!data) return [];
    return data.filter((ins) =>
      ins.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);

  return (
    <div className="flex flex-col gap-1.5 relative">
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
        Insurance provider *
      </Label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-9 w-full flex items-center justify-between px-3 text-xs rounded-[6px] border transition-colors",
          open
            ? "border-primary/50 ring-2 ring-primary/20"
            : "border-border/70 hover:border-border",
          value ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          {value?.logo ? (
            <img
              src={value.logo}
              className="w-5 h-5 rounded object-contain shrink-0"
              alt=""
            />
          ) : (
            <Building2 className="w-4 h-4 shrink-0 text-muted-foreground/50" />
          )}
          <span className="truncate">
            {value ? `${value.name} (${value.code})` : "Select an insurance…"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-popover border border-border rounded-[6px] shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading…
              </div>
            ) : options.length === 0 ? (
              <p className="text-center py-6 text-[11px] text-muted-foreground">
                No insurances found
              </p>
            ) : (
              options.map((ins) => {
                const linked = alreadyLinked.has(ins.id);
                return (
                  <button
                    key={ins.id}
                    type="button"
                    disabled={linked}
                    onClick={() => {
                      onChange(ins);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors",
                      linked
                        ? "opacity-40 cursor-not-allowed"
                        : value?.id === ins.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50 text-foreground",
                    )}
                  >
                    <div className="w-7 h-7 rounded-[6px] border border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
                      {ins.logo ? (
                        <img
                          src={ins.logo}
                          className="w-full h-full object-contain p-0.5"
                          alt=""
                        />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ins.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {ins.code} ·{" "}
                        {ins.type === "public" ? "Public" : "Private"}
                        {ins.default_percent &&
                          ` · ${ins.default_percent}% default`}
                      </p>
                    </div>
                    {linked && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium shrink-0">
                        Linked
                      </span>
                    )}
                    {value?.id === ins.id && !linked && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage fields (shared between add + edit modal)
// ─────────────────────────────────────────────────────────────────────────────
interface CoverageState {
  coverage_type: "full" | "partial";
  covered_percent: string;
  max_amount_covered: string;
  currency: string;
  notes: string;
}

function CoverageFields({
  state,
  onChange,
  defaultPercent,
}: {
  state: CoverageState;
  onChange: (patch: Partial<CoverageState>) => void;
  defaultPercent?: string | null;
}) {
  return (
    <>
      {/* Coverage type */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Coverage type *
        </Label>
        <div className="flex gap-2">
          {(["full", "partial"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ coverage_type: t })}
              className={cn(
                "flex-1 py-2 text-xs rounded-[6px] border transition-all font-medium capitalize",
                state.coverage_type === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Covered percent — only relevant for partial */}
      {state.coverage_type === "partial" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Covered %
            {defaultPercent && (
              <span className="ml-1 normal-case text-muted-foreground/60">
                (default: {defaultPercent}%)
              </span>
            )}
          </Label>
          <div className="relative">
            <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              type="number"
              min={0}
              max={100}
              value={state.covered_percent}
              onChange={(e) => onChange({ covered_percent: e.target.value })}
              placeholder={defaultPercent ?? "e.g. 80"}
              className="pl-8 h-9 text-xs border-border focus-visible:ring-primary"
            />
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            Leave blank to use the insurance default
          </p>
        </div>
      )}

      {/* Max amount */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Max amount
          </Label>
          <div className="relative">
            <Banknote className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              type="number"
              min={0}
              value={state.max_amount_covered}
              onChange={(e) => onChange({ max_amount_covered: e.target.value })}
              placeholder="Unlimited"
              className="pl-8 h-9 text-xs border-border focus-visible:ring-primary"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Currency
          </Label>
          <Input
            value={state.currency}
            onChange={(e) => onChange({ currency: e.target.value })}
            placeholder="RWF"
            className="h-9 text-xs border-border focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Notes
        </Label>
        <textarea
          value={state.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="e.g. Covers outpatient only"
          rows={2}
          className="w-full px-3 py-2 text-xs rounded-[6px] border border-border/70 bg-background text-foreground placeholder:text-muted-foreground/40 resize-none outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Link modal (add)
// ─────────────────────────────────────────────────────────────────────────────
function LinkModal({
  onSave,
  onClose,
  isLoading,
  error,
  alreadyLinked,
}: {
  onSave: (payload: LinkInsurancePayload) => void;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  alreadyLinked: Set<number>;
}) {
  const [selected, setSelected] = useState<PublicInsurance | null>(null);
  const [coverage, setCoverage] = useState<CoverageState>({
    coverage_type: "partial",
    covered_percent: "",
    max_amount_covered: "",
    currency: "RWF",
    notes: "",
  });
  const [selError, setSelError] = useState("");

  const patch = (p: Partial<CoverageState>) =>
    setCoverage((c) => ({ ...c, ...p }));

  const handleSave = () => {
    if (!selected) {
      setSelError("Please select an insurance provider");
      return;
    }
    setSelError("");
    const payload: LinkInsurancePayload = {
      insurance_id: selected.id,
      coverage_type: coverage.coverage_type,
    };
    if (coverage.coverage_type === "partial" && coverage.covered_percent) {
      payload.covered_percent = Number(coverage.covered_percent);
    }
    if (coverage.max_amount_covered) {
      payload.max_amount_covered = Number(coverage.max_amount_covered);
    }
    if (coverage.currency) payload.currency = coverage.currency;
    if (coverage.notes) payload.notes = coverage.notes;
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md flex flex-col rounded-t-2xl sm:rounded-[6px] border border-border bg-card shadow-2xl overflow-hidden max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-primary/15 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Link Insurance Provider
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Select a provider and configure coverage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-[6px] px-3 py-2.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Picker */}
          <InsurancePicker
            value={selected}
            onChange={(ins) => {
              setSelected(ins);
              setSelError("");
              // Pre-fill default percent from insurance
              if (ins.default_percent) {
                patch({ covered_percent: ins.default_percent });
              }
            }}
            alreadyLinked={alreadyLinked}
          />
          {selError && (
            <p className="text-[10px] text-destructive -mt-2">{selError}</p>
          )}

          {/* Selected preview */}
          {selected && (
            <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-[6px] px-3 py-2">
              <div className="w-8 h-8 rounded-[6px] border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                {selected.logo ? (
                  <img
                    src={selected.logo}
                    className="w-full h-full object-contain p-0.5"
                    alt=""
                  />
                ) : (
                  <Building2 className="w-4 h-4 text-muted-foreground/50" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {selected.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {selected.code} · {selected.type === "public" ? "Public" : "Private"}
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-border/40 pt-4 flex flex-col gap-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Coverage settings
            </p>
            <CoverageFields
              state={coverage}
              onChange={patch}
              defaultPercent={selected?.default_percent}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/30 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-[6px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-xs rounded-[6px] bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            <CheckCircle2 className="h-3.5 w-3.5" />
            Link provider
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit coverage modal
// ─────────────────────────────────────────────────────────────────────────────
function EditCoverageModal({
  ins,
  onSave,
  onClose,
  isLoading,
  error,
}: {
  ins: HospitalInsurance;
  onSave: (payload: UpdateCoveragePayload) => void;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [coverage, setCoverage] = useState<CoverageState>({
    coverage_type: ins.coverage_type,
    covered_percent: ins.covered_percent?.toString() ?? "",
    max_amount_covered: ins.max_amount_covered?.toString() ?? "",
    currency: ins.currency ?? "RWF",
    notes: ins.notes ?? "",
  });

  const patch = (p: Partial<CoverageState>) =>
    setCoverage((c) => ({ ...c, ...p }));

  const handleSave = () => {
    const payload: UpdateCoveragePayload = {
      coverage_type: coverage.coverage_type,
    };
    if (coverage.coverage_type === "partial") {
      payload.covered_percent = coverage.covered_percent
        ? Number(coverage.covered_percent)
        : null;
    }
    payload.max_amount_covered = coverage.max_amount_covered
      ? Number(coverage.max_amount_covered)
      : null;
    payload.currency = coverage.currency || "RWF";
    payload.notes = coverage.notes || null;
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md flex flex-col rounded-t-2xl sm:rounded-[6px] border border-border bg-card shadow-2xl overflow-hidden max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-primary/15 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Edit Coverage
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {ins.name} · {ins.code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-[6px] px-3 py-2.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <CoverageFields
            state={coverage}
            onChange={patch}
            defaultPercent={ins.default_percent}
          />

          {/* Logo uploader */}
          <div className="border-t border-border/40 pt-4">
            <LogoUploader insuranceId={ins.id} currentLogo={ins.logo} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/30 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-[6px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-xs rounded-[6px] bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            <CheckCircle2 className="h-3.5 w-3.5" />
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insurance card
// ─────────────────────────────────────────────────────────────────────────────
function InsuranceCard({
  ins,
  onEdit,
  onDelete,
}: {
  ins: HospitalInsurance;
  onEdit: (i: HospitalInsurance) => void;
  onDelete: (i: HospitalInsurance) => void;
}) {
  return (
    <div className="group bg-card border border-border/70 rounded-[6px] p-4 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      {/* Logo + name row */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-[6px] border border-border bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
          {ins.logo ? (
            <img
              src={ins.logo}
              alt={ins.name}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <Building2 className="w-5 h-5 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {ins.name}
          </p>
          <p className="text-[10px] text-muted-foreground">{ins.code}</p>
        </div>
        {/* Coverage badge */}
        <span
          className={cn(
            "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full",
            ins.coverage_type === "full"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600",
          )}
        >
          {ins.coverage_type === "full"
            ? "Full"
            : `${ins.effective_coverage}%`}
        </span>
      </div>

      {/* Coverage detail */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="flex flex-col gap-0.5">
          <p className="text-muted-foreground/70">Coverage</p>
          <p className="text-foreground font-medium capitalize">
            {ins.coverage_type}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-muted-foreground/70">Max amount</p>
          <p className="text-foreground font-medium">
            {fmtCurrency(ins.max_amount_covered, ins.currency)}
          </p>
        </div>
        {ins.notes && (
          <div className="col-span-2 flex flex-col gap-0.5">
            <p className="text-muted-foreground/70">Notes</p>
            <p className="text-foreground truncate">{ins.notes}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
        <button
          onClick={() => onEdit(ins)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-muted/40 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => onDelete(ins)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-[6px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-3 h-3" />
          Unlink
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-card border border-border/70 rounded-[6px] p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-[6px] bg-muted/60 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-muted/60 rounded w-3/4" />
          <div className="h-2.5 bg-muted/40 rounded w-1/2" />
        </div>
      </div>
      <div className="h-px bg-muted/40" />
      <div className="grid grid-cols-2 gap-1.5">
        <div className="h-8 bg-muted/30 rounded" />
        <div className="h-8 bg-muted/30 rounded" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar atoms
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
function HospitalInsurances() {
  // ── Data ──
  const {
    data: insurances,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetInsurances();

  // ── Mutations ──
  const linkIns = useLinkInsurance();
  const updateCoverage = useUpdateCoverage();
  const deleteIns = useDeleteInsurance();

  // ── Local state ──
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [coverageFilter, setCoverageFilter] = useState<
    "all" | "full" | "partial"
  >("all");
  const [hasLogo, setHasLogo] = useState<"all" | "with" | "without">("all");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingIns, setEditingIns] =
    useState<HospitalInsurance | null>(null);
  const [deletingIns, setDeletingIns] =
    useState<HospitalInsurance | null>(null);
  const [mutError, setMutError] = useState<string | null>(null);

  // Set of already-linked insurance_ids (to disable in picker)
  const linkedIds = useMemo(
    () => new Set(insurances?.map((i) => i.insurance_id) ?? []),
    [insurances],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setCoverageFilter("all");
    setHasLogo("all");
  }, []);

  const hasActiveFilters =
    search !== "" || coverageFilter !== "all" || hasLogo !== "all";

  // ── Derived list ──
  const filtered = useMemo(() => {
    if (!insurances) return [];
    return insurances.filter((ins) => {
      if (search && !ins.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (coverageFilter !== "all" && ins.coverage_type !== coverageFilter)
        return false;
      if (hasLogo === "with" && !ins.logo) return false;
      if (hasLogo === "without" && ins.logo) return false;
      return true;
    });
  }, [insurances, search, coverageFilter, hasLogo]);

  // ── Stats ──
  const stats = useMemo(
    () => ({
      total: insurances?.length ?? 0,
      fullCoverage: insurances?.filter((i) => i.coverage_type === "full").length ?? 0,
    }),
    [insurances],
  );

  // ── Handlers ──
  const handleLink = async (payload: LinkInsurancePayload) => {
    setMutError(null);
    try {
      await linkIns.mutateAsync(payload);
      setShowLinkModal(false);
    } catch (e: unknown) {
      setMutError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const handleUpdateCoverage = async (payload: UpdateCoveragePayload) => {
    if (!editingIns) return;
    setMutError(null);
    try {
      await updateCoverage.mutateAsync({ id: editingIns.id, payload });
      setEditingIns(null);
    } catch (e: unknown) {
      setMutError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deletingIns) return;
    try {
      await deleteIns.mutateAsync(deletingIns.id);
      setDeletingIns(null);
    } catch (e: unknown) {
      setMutError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "coverageFilter",
      label: "Coverage Type",
      value: coverageFilter,
      options: [
        { value: "all", label: "All types" },
        { value: "full", label: "Full coverage" },
        { value: "partial", label: "Partial coverage" },
      ],
      onChange: (v: string) => setCoverageFilter(v as any)
    },
    {
      type: "select" as const,
      key: "hasLogo",
      label: "Logo",
      value: hasLogo,
      options: [
        { value: "all", label: "All providers" },
        { value: "with", label: "With logo" },
        { value: "without", label: "Without logo" },
      ],
      onChange: (v: string) => setHasLogo(v as any)
    }
  ], [coverageFilter, hasLogo]);

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title="Insurance Partners"
          subtitle="Manage insurance providers accepted at your hospital"
        />

        {/* ── Stats bar ── */}
        <div className="px-6 pt-5 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-[6px] border border-border bg-card px-4 py-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-[6px] bg-primary/15 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  Total linked
                </p>
                <p className="text-xl font-semibold tabular-nums text-primary mt-0.5">
                  {isLoading ? "—" : stats.total}
                </p>
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-card px-4 py-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-[6px] bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  Full coverage
                </p>
                <p className="text-xl font-semibold tabular-nums text-foreground mt-0.5">
                  {isLoading ? "—" : stats.fullCoverage}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isLoading || stats.total === 0
                    ? ""
                    : `${stats.total - stats.fullCoverage} partial`}
                </p>
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-card px-4 py-3.5 flex items-start gap-3 col-span-2 sm:col-span-1">
              <div className="w-9 h-9 rounded-[6px] bg-muted flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  Showing
                </p>
                <p className="text-xl font-semibold tabular-nums text-foreground mt-0.5">
                  {isLoading ? "—" : filtered.length}
                </p>
                {hasActiveFilters && (
                  <p className="text-[10px] text-muted-foreground">filtered</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearFilters}
          fields={filterFields}
          cols={{ default: 1, sm: 2 }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {isLoading ? (
                <span className="text-muted-foreground/50">Loading…</span>
              ) : (
                <>
                  <span className="font-bold text-foreground">
                    {filtered.length}
                  </span>{" "}
                  {filtered.length === 1 ? "provider" : "providers"}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="ml-2 text-primary hover:underline text-[10px] font-medium"
                    >
                      Reset
                    </button>
                  )}
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search providers…"
                  className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
                />
              </button>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />

              <Button
                onClick={() => {
                  setMutError(null);
                  setShowLinkModal(true);
                }}
                className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Link provider</span>
              </Button>
            </div>
          </div>

          {/* Grid */}
          <div className="p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-destructive/10 flex items-center justify-center border border-destructive/20">
                  <AlertCircle className="w-6 h-6 text-destructive/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Failed to load insurance providers
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                </div>
                <button
                  onClick={() => refetch()}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Try again
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Shield className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {hasActiveFilters
                      ? "No providers match your filters"
                      : "No insurance providers linked yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {hasActiveFilters
                      ? "Try clearing your filters"
                      : "Link your first insurance partner to get started"}
                  </p>
                </div>
                {hasActiveFilters ? (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Clear filters
                  </button>
                ) : (
                  <Button
                    onClick={() => setShowLinkModal(true)}
                    className="h-8 text-xs bg-primary text-primary-foreground gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Link provider
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((ins) => (
                  <InsuranceCard
                    key={ins.id}
                    ins={ins}
                    onEdit={(i) => {
                      setMutError(null);
                      setEditingIns(i);
                    }}
                    onDelete={setDeletingIns}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Link modal ── */}
      {showLinkModal && (
        <LinkModal
          onSave={handleLink}
          onClose={() => setShowLinkModal(false)}
          isLoading={linkIns.isPending}
          error={mutError}
          alreadyLinked={linkedIds}
        />
      )}

      {/* ── Edit coverage modal ── */}
      {editingIns && (
        <EditCoverageModal
          ins={editingIns}
          onSave={handleUpdateCoverage}
          onClose={() => setEditingIns(null)}
          isLoading={updateCoverage.isPending}
          error={mutError}
        />
      )}

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={deletingIns !== null}
        title="Unlink Insurance Provider"
        description={`Remove "${deletingIns?.name}" from your hospital? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingIns(null)}
        isLoading={deleteIns.isPending}
      />
    </DashboardLayout>
  );
}

export default HospitalInsurances;
