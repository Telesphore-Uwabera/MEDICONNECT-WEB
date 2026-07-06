import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Service, ServicePayload } from "@/types/Hospital";
import { t } from "i18next";

interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: ServicePayload) => Promise<void>;
  departmentId: number;
  initial?: Service | null;
  isLoading?: boolean;
  error?: string | null;
}

const EMPTY_SERVICE = (departmentId: number): ServicePayload => ({
  department_id: departmentId,
  name_en: "",
  name_fr: "",
  name_kiny: "",
  price: undefined as unknown as number,
  currency: "RWF",
  price_type: "fixed",
  type: "in_person",
  insurance_covered: false,
  duration_minutes: undefined,
  requires_appointment: false,
  requires_referral: false,
  preparation_instructions: "",
  code: "",
  max_bookings_per_day: undefined,
  is_available: true,
});

export function ServiceFormModal({
  open,
  onClose,
  onSubmit,
  departmentId,
  initial,
  isLoading,
  error,
}: ServiceFormModalProps) {
  const [form, setForm] = useState<ServicePayload>(EMPTY_SERVICE(departmentId));

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
            department_id: initial.department_id,
            name_en: initial.name_en,
            name_fr: initial.name_fr ?? "",
            name_kiny: initial.name_kiny ?? "",
            price: Number(initial.price),
            currency: initial.currency,
            price_type: initial.price_type,
            type: initial.type,
            insurance_covered: initial.insurance_covered,
            duration_minutes: initial.duration_minutes ?? undefined,
            requires_appointment: initial.requires_appointment,
            requires_referral: initial.requires_referral,
            preparation_instructions: initial.preparation_instructions ?? "",
            code: initial.code ?? "",
            max_bookings_per_day: initial.max_bookings_per_day ?? undefined,
            is_available: initial.is_available,
          }
          : EMPTY_SERVICE(departmentId),
      );
    }
  }, [open, initial, departmentId]);

  const set = <K extends keyof ServicePayload>(
    key: K,
    value: ServicePayload[K],
  ) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name_en.trim()) return;
    const payload: ServicePayload = {
      ...form,
      name_fr: form.name_fr || null,
      name_kiny: form.name_kiny || null,
      preparation_instructions: form.preparation_instructions || null,
      code: form.code || null,
    };
    await onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-card border border-border/70 rounded-[6px] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border/60 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-foreground">
            {initial ? t("pages.hospital.edit_service") : t("pages.hospital.new_service")}
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
          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-[6px] px-3 py-2.5 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={t("pages.hospital.name_en_required")}>
              <Input value={form.name_en} onChange={(v) => set("name_en", v)} placeholder={t("pages.hospital.service_name_placeholder")} />
            </Field>
            <Field label={t("pages.hospital.name_fr")}>
              <Input value={form.name_fr ?? ""} onChange={(v) => set("name_fr", v)} placeholder={t("pages.hospital.french_name_placeholder")} />
            </Field>
            <Field label={t("pages.hospital.name_kiny")}>
              <Input value={form.name_kiny ?? ""} onChange={(v) => set("name_kiny", v)} placeholder={t("pages.hospital.kinyarwanda_placeholder")} />
            </Field>
          </div>

          {/* Code */}
          <Field label={t("pages.hospital.service_code")}>
            <Input value={form.code ?? ""} onChange={(v) => set("code", v)} placeholder={t("pages.hospital.service_code_placeholder")} />
          </Field>

          {/* Price section */}
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("pages.hospital.price_type_required")}>
              <select
                value={form.price_type}
                onChange={(e) => set("price_type", e.target.value as ServicePayload["price_type"])}
                className={selectCls}
              >
                <option value="fixed">{t("pages.hospital.price_fixed")}</option>
                <option value="from">{t("pages.hospital.price_from")}</option>
                <option value="negotiable">{t("pages.hospital.price_negotiable")}</option>
                <option value="free">{t("pages.hospital.price_free")}</option>
              </select>
            </Field>
            <Field label={t("pages.hospital.price_rwf")}>
              <Input
                type="number"
                value={form.price !== undefined ? String(form.price) : ""}
                onChange={(v) => set("price", v ? Number(v) : (undefined as unknown as number))}
                placeholder="5000"
              />
            </Field>
            <Field label={t("pages.hospital.currency")}>
              <Input value={form.currency ?? "RWF"} onChange={(v) => set("currency", v)} placeholder="RWF" />
            </Field>
          </div>

          {/* Type + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("pages.hospital.service_type_required")}>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as ServicePayload["type"])}
                className={selectCls}
              >
                <option value="in_person">{t("pages.hospital.service_type_in_person")}</option>
                <option value="online">{t("pages.hospital.service_type_online")}</option>
                <option value="both">{t("pages.hospital.service_type_both")}</option>
              </select>
            </Field>
            <Field label={t("pages.hospital.duration_min")}>
              <Input
                type="number"
                value={form.duration_minutes !== undefined ? String(form.duration_minutes) : ""}
                onChange={(v) => set("duration_minutes", v ? Number(v) : undefined)}
                placeholder="30"
              />
            </Field>
          </div>

          {/* Max bookings */}
          <Field label={t("pages.hospital.max_bookings_day")}>
            <Input
              type="number"
              value={form.max_bookings_per_day !== undefined ? String(form.max_bookings_per_day) : ""}
              onChange={(v) => set("max_bookings_per_day", v ? Number(v) : undefined)}
              placeholder="20"
            />
          </Field>

          {/* Preparation instructions */}
          <Field label={t("pages.hospital.preparation_instructions")}>
            <textarea
              value={form.preparation_instructions ?? ""}
              onChange={(e) => set("preparation_instructions", e.target.value)}
              placeholder={t("pages.hospital.preparation_placeholder")}
              rows={2}
              className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all resize-none"
            />
          </Field>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <Toggle
              label={t("pages.hospital.insurance_covered")}
              value={form.insurance_covered ?? false}
              onChange={(v) => set("insurance_covered", v)}
            />
            <Toggle
              label={t("pages.hospital.requires_appointment")}
              value={form.requires_appointment ?? false}
              onChange={(v) => set("requires_appointment", v)}
            />
            <Toggle
              label={t("pages.hospital.requires_referral")}
              value={form.requires_referral ?? false}
              onChange={(v) => set("requires_referral", v)}
            />
            <Toggle
              label={t("pages.hospital.available")}
              value={form.is_available ?? true}
              onChange={(v) => set("is_available", v)}
              activeColor="bg-emerald-500 border-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border/60 px-5 py-3 flex justify-end gap-2">
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
            {initial ? t("pages.hospital.save_changes") : t("pages.hospital.create_service")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
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

function Toggle({
  label, value, onChange, activeColor = "bg-primary border-primary",
}: {
  label: string; value: boolean; onChange: (v: boolean) => void; activeColor?: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!value)}
        className={cn(
          "rounded-full border transition-colors duration-200 relative shrink-0",
          value ? activeColor : "bg-muted border-border/60",
        )}
        style={{ height: "18px", width: "32px" }}
      >
        <span
          className={cn(
            "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200",
            value ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </div>
      <span className="text-[11px] text-foreground">{label}</span>
    </label>
  );
}
