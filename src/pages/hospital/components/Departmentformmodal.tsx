import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Department, DepartmentPayload } from "@/types/Hospital";
import { t } from "i18next";

// ─── Icon options supported by the API ────────────────────────────────────────
const ICON_OPTIONS = [
  "heart", "brain", "baby", "bone", "stethoscope", "activity",
  "eye", "ear", "lungs", "pill", "syringe", "thermometer",
  "wheelchair", "dna", "microscope", "bandage",
];

interface DepartmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: DepartmentPayload) => Promise<void>;
  initial?: Department | null;
  isLoading?: boolean;
  error?: string | null;
}

const EMPTY: DepartmentPayload = {
  name_en: "",
  name_fr: "",
  name_kiny: "",
  floor: "",
  room_number: "",
  phone: "",
  email: "",
  icon: "stethoscope",
  color_code: "#6366f1",
  is_emergency: false,
  capacity: undefined,
  sort_order: 0,
};

export function DepartmentFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  isLoading,
  error,
}: DepartmentFormModalProps) {
  const [form, setForm] = useState<DepartmentPayload>(EMPTY);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
            name_en: initial.name_en,
            name_fr: initial.name_fr ?? "",
            name_kiny: initial.name_kiny ?? "",
            floor: initial.floor ?? "",
            room_number: initial.room_number ?? "",
            phone: initial.phone ?? "",
            email: initial.email ?? "",
            icon: initial.icon ?? "stethoscope",
            color_code: initial.color_code ?? "#6366f1",
            is_emergency: initial.is_emergency,
            capacity: initial.capacity ?? undefined,
            sort_order: initial.sort_order ?? 0,
          }
          : EMPTY,
      );
    }
  }, [open, initial]);

  const set = <K extends keyof DepartmentPayload>(
    key: K,
    value: DepartmentPayload[K],
  ) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name_en.trim()) return;
    // Clean empty strings to null
    const payload: DepartmentPayload = {
      ...form,
      name_fr: form.name_fr || null,
      name_kiny: form.name_kiny || null,
      floor: form.floor || null,
      room_number: form.room_number || null,
      phone: form.phone || null,
      email: form.email || null,
    };
    await onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border/70 rounded-[6px] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border/60 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-foreground">
            {initial ? t("pages.hospital.edit_department") : t("pages.hospital.new_department")}
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-[6px] px-3 py-2.5 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={t("pages.hospital.name_en_required")}>
              <Input
                value={form.name_en}
                onChange={(v) => set("name_en", v)}
                placeholder={t("pages.hospital.department_name_placeholder")}
              />
            </Field>
            <Field label={t("pages.hospital.name_fr")}>
              <Input
                value={form.name_fr ?? ""}
                onChange={(v) => set("name_fr", v)}
                placeholder={t("pages.hospital.department_name_fr_placeholder")}
              />
            </Field>
            <Field label={t("pages.hospital.name_kiny")}>
              <Input
                value={form.name_kiny ?? ""}
                onChange={(v) => set("name_kiny", v)}
                placeholder={t("pages.hospital.kinyarwanda_placeholder")}
              />
            </Field>
          </div>

          {/* Location row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("pages.hospital.floor")}>
              <Input
                value={form.floor ?? ""}
                onChange={(v) => set("floor", v)}
                placeholder={t("pages.hospital.floor_placeholder")}
              />
            </Field>
            <Field label={t("pages.hospital.room_number")}>
              <Input
                value={form.room_number ?? ""}
                onChange={(v) => set("room_number", v)}
                placeholder={t("pages.hospital.room_number_placeholder")}
              />
            </Field>
          </div>

          {/* Contact row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("pages.hospital.phone")}>
              <Input
                value={form.phone ?? ""}
                onChange={(v) => set("phone", v)}
                placeholder="+250788000001"
              />
            </Field>
            <Field label={t("pages.hospital.email")}>
              <Input
                value={form.email ?? ""}
                onChange={(v) => set("email", v)}
                placeholder="dept@hospital.rw"
              />
            </Field>
          </div>

          {/* Capacity + Sort */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("pages.hospital.capacity")}>
              <Input
                type="number"
                value={form.capacity !== undefined ? String(form.capacity) : ""}
                onChange={(v) =>
                  set("capacity", v ? Number(v) : undefined)
                }
                placeholder={t("pages.hospital.capacity_placeholder")}
              />
            </Field>
            <Field label={t("pages.hospital.sort_order")}>
              <Input
                type="number"
                value={String(form.sort_order ?? 0)}
                onChange={(v) => set("sort_order", Number(v))}
                placeholder="0"
              />
            </Field>
          </div>

          {/* Icon + Color */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("pages.hospital.icon")}>
              <select
                value={form.icon ?? "stethoscope"}
                onChange={(e) => set("icon", e.target.value)}
                className={selectCls}
              >
                {ICON_OPTIONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {ic.charAt(0).toUpperCase() + ic.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("pages.hospital.color")}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color_code ?? "#6366f1"}
                  onChange={(e) => set("color_code", e.target.value)}
                  className="h-[30px] w-10 rounded-[6px] border border-border/60 bg-background cursor-pointer p-0.5"
                />
                <Input
                  value={form.color_code ?? ""}
                  onChange={(v) => set("color_code", v)}
                  placeholder="#6366f1"
                />
              </div>
            </Field>
          </div>

          {/* Emergency toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => set("is_emergency", !form.is_emergency)}
              className={cn(
                "w-8 h-4.5 rounded-full border transition-colors duration-200 relative shrink-0",
                form.is_emergency
                  ? "bg-destructive border-destructive"
                  : "bg-muted border-border/60",
              )}
              style={{ height: "18px", width: "32px" }}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200",
                  form.is_emergency ? "translate-x-3.5" : "translate-x-0.5",
                )}
              />
            </div>
            <span className="text-[11px] text-foreground font-medium">
              {t("pages.hospital.emergency_department")}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border/60 px-5 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-[11px] rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !form.name_en.trim()}
            className="px-3.5 py-1.5 text-[11px] rounded-[6px] bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {initial ? t("pages.hospital.save_changes") : t("pages.hospital.create_department")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small atoms ──────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";

const selectCls =
  "w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all";

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}
