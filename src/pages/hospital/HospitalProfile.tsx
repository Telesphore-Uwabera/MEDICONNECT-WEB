import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Clock,
  Mail,
  Plus,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  User,
  Pill,
  Send,
  Smartphone,
} from "lucide-react";
import { usePrescriptions, type RxStatus } from "@/lib/prescription-store";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface HospitalData {
  name_en: string;
  name_fr: string;
  name_kiny: string;
  description_en: string;
  type: string;
  registration_number: string;
  address: string;
  city: string;
  province: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  website: string;
  opens_at: string;
  closes_at: string;
  is_open_24h: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const HOSPITAL_TYPES = ["hospital", "clinic", "health_center", "dispensary"];

const STEPS = [
  {
    id: "identity" as const,
    label: "Identity",
    icon: Building2,
    sectionTitle: "Hospital identity",
    description: "Names, type & registration",
    fields: [
      "name_en",
      "name_fr",
      "name_kiny",
      "description_en",
      "type",
      "registration_number",
    ] as (keyof HospitalData)[],
  },
  {
    id: "location" as const,
    label: "Location",
    icon: MapPin,
    sectionTitle: "Location & address",
    description: "Address, city, province & coordinates",
    fields: [
      "address",
      "city",
      "province",
      "country",
      "latitude",
      "longitude",
    ] as (keyof HospitalData)[],
  },
  {
    id: "contact" as const,
    label: "Contact",
    icon: Phone,
    sectionTitle: "Contact information",
    description: "Phone, email & website",
    fields: ["phone", "email", "website"] as (keyof HospitalData)[],
  },
  {
    id: "hours" as const,
    label: "Hours",
    icon: Clock,
    sectionTitle: "Operating hours",
    description: "Opening hours & availability",
    fields: ["opens_at", "closes_at", "is_open_24h"] as (keyof HospitalData)[],
  },
];

const channelIcon = { app: User, email: Mail, sms: Smartphone } as const;
const HOSPITAL_CONST = "King Faisal Hospital";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function isOpenNow(opens: string, closes: string, open24h: boolean): boolean {
  if (open24h) return true;
  if (!opens || !closes) return false;
  const now = new Date();
  const [oh, om] = opens.split(":").map(Number);
  const [ch, cm] = closes.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= oh * 60 + om && nowMin < ch * 60 + cm;
}

const humanType = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────
function FormField({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard — mirrors DoctorProfile
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
        {label}
      </span>
      <span
        className={cn(
          "text-xl font-semibold tabular-nums truncate",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Sidebar — mirrors DoctorProfile's UnifiedSidebar exactly
// ─────────────────────────────────────────────────────────────────────────────
function UnifiedSidebar({
  currentStep,
  visited,
  onSelect,
  mode,
  hospitalData,
  onEdit,
  onDelete,
}: {
  currentStep: number;
  visited: Set<number>;
  onSelect: (i: number) => void;
  mode: "create" | "edit" | "view";
  hospitalData: HospitalData | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isForm = mode === "create" || mode === "edit";
  const visitedCount = visited.size;
  const pct = Math.round((visitedCount / STEPS.length) * 100);

  return (
    <div className="w-56 shrink-0 flex flex-col border-r border-border bg-card/50">
      {/* ── Profile mini-card (view) or progress header (form) ── */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        {isForm ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Profile setup
              </span>
              <span className="text-[11px] font-bold text-primary tabular-nums">
                {pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {visitedCount} of {STEPS.length} sections visited
            </p>
          </div>
        ) : hospitalData ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {hospitalData.name_en}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                  {hospitalData.registration_number}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: "Type", value: humanType(hospitalData.type) },
                { label: "City", value: hospitalData.city },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-[10px] font-medium text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Step nav ── */}
      <div className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep && isForm;
          const isDone = visited.has(i) && (!isForm || i !== currentStep);

          return (
            <button
              key={step.id}
              onClick={() => (isForm ? onSelect(i) : undefined)}
              disabled={!isForm}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-left transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isForm
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    : "text-muted-foreground cursor-default",
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold border transition-all",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-muted border-border text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-xs font-medium leading-tight truncate",
                      isActive ? "text-primary" : "",
                    )}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-primary shrink-0">
                      editing
                    </span>
                  )}
                  {isDone && isForm && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">
                      done
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                  {step.description}
                </p>
                {isForm && (
                  <div className="h-0.5 rounded-full bg-muted overflow-hidden mt-1.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isActive
                          ? "bg-primary w-1/2"
                          : isDone
                            ? "bg-primary w-full"
                            : "bg-transparent w-0",
                      )}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Footer actions (view mode) ── */}
      {!isForm && hospitalData && (
        <div className="p-3 border-t border-border space-y-2">
          <Button
            onClick={onEdit}
            className="w-full text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-8"
          >
            <Pencil size={12} />
            Edit profile
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 h-8"
          >
            <Trash2 size={12} />
            Delete profile
          </Button>
        </div>
      )}

      {/* ── Footer hint (form mode) ── */}
      {isForm && (
        <div className="px-3.5 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {mode === "edit"
              ? "Click any section to jump directly."
              : "Jump between sections freely — no order needed."}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-step Hospital Form — no inner sidebar
// ─────────────────────────────────────────────────────────────────────────────
function HospitalForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  currentStep,
  onStepChange,
  visited,
  onVisitedChange,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<HospitalData>;
  onSubmit: (data: HospitalData) => void;
  onCancel: () => void;
  currentStep: number;
  onStepChange: (i: number) => void;
  visited: Set<number>;
  onVisitedChange: (v: Set<number>) => void;
}) {
  const { t } = useTranslation();
  const [open24h, setOpen24h] = useState(defaultValues?.is_open_24h ?? false);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<HospitalData>({ defaultValues });

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isEdit = mode === "edit";

  const goTo = (i: number) => {
    const next = new Set([...visited, i]);
    onVisitedChange(next);
    onStepChange(i);
  };

  const goNext = async () => {
    const valid = await trigger(step.fields);
    if (!valid) return;
    if (isLast) {
      handleSubmit(onSubmit)();
      return;
    }
    goTo(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep === 0) {
      onCancel();
      return;
    }
    goTo(currentStep - 1);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Section label bar */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {step.sectionTitle}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
      </div>

      {/* Scrollable step body */}
      <div key={currentStep} className="flex-1 overflow-y-auto p-5">
        {/* ── Step 1: Identity ── */}
        {step.id === "identity" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("hospital.field.name_en", "Name (English)")}
              error={errors.name_en?.message}
              className="col-span-2"
            >
              <Input
                {...register("name_en", { required: "Required" })}
                placeholder="King Faisal Hospital"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.name_fr", "Name (French)")}
              error={errors.name_fr?.message}
            >
              <Input
                {...register("name_fr", { required: "Required" })}
                placeholder="Hôpital King Faisal"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.name_kiny", "Name (Kinyarwanda)")}
              error={errors.name_kiny?.message}
            >
              <Input
                {...register("name_kiny", { required: "Required" })}
                placeholder="Ibitaro bya King Faisal"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.description", "Description")}
              error={errors.description_en?.message}
              className="col-span-2"
            >
              <Input
                {...register("description_en", { required: "Required" })}
                placeholder="Leading referral hospital in Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.type", "Type")}
              error={errors.type?.message}
            >
              <Select
                defaultValue={defaultValues?.type}
                onValueChange={(v) => setValue("type", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {HOSPITAL_TYPES.map((ht) => (
                    <SelectItem key={ht} value={ht}>
                      {humanType(ht)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label={t("hospital.field.reg_number", "Registration Number")}
              error={errors.registration_number?.message}
            >
              <Input
                {...register("registration_number", { required: "Required" })}
                placeholder="RW-HOSP-2024-001"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 2: Location ── */}
        {step.id === "location" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("hospital.field.address", "Street address")}
              error={errors.address?.message}
              className="col-span-2"
            >
              <Input
                {...register("address", { required: "Required" })}
                placeholder="KG 544 St"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.city", "City")}
              error={errors.city?.message}
            >
              <Input
                {...register("city", { required: "Required" })}
                placeholder="Kigali"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.province", "Province")}
              error={errors.province?.message}
            >
              <Input
                {...register("province", { required: "Required" })}
                placeholder="Kigali City"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.country", "Country")}
              error={errors.country?.message}
              className="col-span-2"
            >
              <Input
                {...register("country", { required: "Required" })}
                placeholder="Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.latitude", "Latitude")}
              error={errors.latitude?.message}
            >
              <Input
                {...register("latitude", {
                  required: "Required",
                  pattern: { value: /^-?\d+(\.\d+)?$/, message: "Invalid" },
                })}
                placeholder="-1.9441"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.longitude", "Longitude")}
              error={errors.longitude?.message}
            >
              <Input
                {...register("longitude", {
                  required: "Required",
                  pattern: { value: /^-?\d+(\.\d+)?$/, message: "Invalid" },
                })}
                placeholder="30.0619"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 3: Contact ── */}
        {step.id === "contact" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("hospital.field.phone", "Phone number")}
              error={errors.phone?.message}
              className="col-span-2"
            >
              <Input
                type="tel"
                {...register("phone", { required: "Required" })}
                placeholder="+250788000001"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.email", "Email address")}
              error={errors.email?.message}
              className="col-span-2"
            >
              <Input
                type="email"
                {...register("email", {
                  required: "Required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email",
                  },
                })}
                placeholder="info@kingfaisal.rw"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.website", "Website")}
              error={errors.website?.message}
              className="col-span-2"
            >
              <Input
                type="url"
                {...register("website")}
                placeholder="https://kingfaisal.rw"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 4: Hours ── */}
        {step.id === "hours" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-foreground">
                  {t("hospital.field.open_24h", "Open 24 hours")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Overrides opening & closing times
                </p>
              </div>
              <Switch
                checked={open24h}
                onCheckedChange={(v) => {
                  setOpen24h(v);
                  setValue("is_open_24h", v);
                }}
              />
            </div>

            <FormField
              label={t("hospital.field.opens_at", "Opens at")}
              error={errors.opens_at?.message}
            >
              <Input
                type="time"
                {...register("opens_at", { required: !open24h && "Required" })}
                disabled={open24h}
                className="border-border focus-visible:ring-primary text-xs h-9 disabled:opacity-40"
              />
            </FormField>

            <FormField
              label={t("hospital.field.closes_at", "Closes at")}
              error={errors.closes_at?.message}
            >
              <Input
                type="time"
                {...register("closes_at", { required: !open24h && "Required" })}
                disabled={open24h}
                className="border-border focus-visible:ring-primary text-xs h-9 disabled:opacity-40"
              />
            </FormField>

            {open24h && (
              <div className="col-span-2 flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-[11px] text-primary">
                  This facility is available around the clock.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-muted/50 border-t border-border">
        <Button
          variant="outline"
          onClick={goBack}
          className="border-border text-xs"
        >
          {currentStep === 0 ? "Cancel" : "← Back"}
        </Button>
        <Button
          onClick={goNext}
          className="text-primary-foreground text-xs bg-primary hover:bg-primary/90"
        >
          {isLast ? (isEdit ? "Save changes" : "Create profile") : "Next →"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View field helper
// ─────────────────────────────────────────────────────────────────────────────
function ViewField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium text-foreground",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prescription status styles (theme-aware)
// ─────────────────────────────────────────────────────────────────────────────
const statusStyle = {
  pending: {
    badge:
      "border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  active: {
    badge:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  dispensed: {
    badge: "border-blue-400/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  expired: {
    badge: "border-rose-400/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  cancelled: { badge: "border-border bg-muted text-muted-foreground" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Hospital view — inline panels (mirrors DoctorProfile view)
// ─────────────────────────────────────────────────────────────────────────────
function HospitalProfileView({
  hospital,
  rxList,
  onNewRx,
}: {
  hospital: HospitalData;
  rxList: ReturnType<typeof usePrescriptions>;
  onNewRx: () => void;
}) {
  const { t } = useTranslation();
  const currentlyOpen = isOpenNow(
    hospital.opens_at,
    hospital.closes_at,
    hospital.is_open_24h,
  );

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* ── Identity ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building2 size={15} className="text-primary" />
          {t("hospital.section.identity", "Identity")}
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <ViewField label="Name (EN)" value={hospital.name_en} />
          <ViewField label="Name (FR)" value={hospital.name_fr} />
          <ViewField label="Kinyarwanda" value={hospital.name_kiny} />
          <ViewField label="Type" value={humanType(hospital.type)} />
          <ViewField
            label="Registration"
            value={hospital.registration_number}
            mono
          />
        </div>
        {hospital.description_en && (
          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Description
            </p>
            <p className="text-[11px] text-foreground leading-relaxed">
              {hospital.description_en}
            </p>
          </div>
        )}
      </div>

      {/* ── Location ── */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MapPin size={15} className="text-primary" />
          {t("hospital.section.location", "Location")}
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div className="col-span-2">
            <ViewField
              label="Address"
              value={`${hospital.address}, ${hospital.city}, ${hospital.province}, ${hospital.country}`}
            />
          </div>
          <ViewField label="Latitude" value={hospital.latitude} mono />
          <ViewField label="Longitude" value={hospital.longitude} mono />
        </div>
      </div>

      {/* ── Contact ── */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Phone size={15} className="text-primary" />
          {t("hospital.section.contact", "Contact")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary">
              <Phone size={13} />
            </div>
            <span className="text-[11px] font-medium font-mono text-primary">
              {hospital.phone}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-[10px] font-bold">
              <Mail size={13} />
            </div>
            <span className="text-[11px] font-medium text-foreground truncate">
              {hospital.email}
            </span>
          </div>
          {hospital.website && (
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                <Globe size={13} />
              </div>
              <span className="text-[11px] font-medium text-foreground truncate">
                {hospital.website.replace("https://", "")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Hours ── */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock size={15} className="text-primary" />
          {t("hospital.section.hours", "Operating Hours")}
        </h3>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-[10px] font-semibold text-primary-foreground shrink-0",
              currentlyOpen ? "bg-primary" : "bg-muted-foreground",
            )}
          >
            {currentlyOpen ? "OPEN" : "CLSD"}
          </div>
          <div>
            <p className="text-[11px] font-medium text-foreground">
              {hospital.is_open_24h
                ? "Open 24 hours"
                : `${hospital.opens_at} – ${hospital.closes_at}`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {currentlyOpen ? "Currently open" : "Currently closed"}
            </p>
          </div>
          {hospital.is_open_24h && (
            <span className="ml-auto text-[11px] font-medium rounded-full px-3 py-0.5 bg-primary/15 text-primary">
              ✓ 24 hours
            </span>
          )}
        </div>
      </div>

      {/* ── Prescriptions ── */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Pill size={15} className="text-primary" />
            {t("pages.hospital.rx_title", "Prescriptions")}
          </h3>
          <Button
            size="sm"
            className="text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-7"
            onClick={onNewRx}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>

        {rxList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center rounded-md border border-dashed border-border">
            <Pill className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              No prescriptions issued yet.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-1 text-xs"
              onClick={onNewRx}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Issue first prescription
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
            {rxList.map((rx) => {
              const Icon =
                channelIcon[
                  (rx.channels?.[0] as keyof typeof channelIcon) ?? "app"
                ] ?? User;
              const style =
                statusStyle[rx.status as RxStatus] ?? statusStyle["active"];
              return (
                <li
                  key={rx.id}
                  className="flex items-center gap-3 py-2.5 px-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">
                      {rx.patientName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {rx.medications?.[0]?.name ?? "—"} · {rx.createdAt}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 text-[10px]", style.badge)}
                  >
                    {rx.status}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
function EmptyHospital({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mb-3">
        <Building2 className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-sm font-semibold text-foreground mb-2">
        {t("hospital.empty.title", "No hospital profile")}
      </h2>
      <p className="text-[11px] text-muted-foreground mb-5 max-w-xs">
        {t(
          "hospital.empty.sub",
          "Create your hospital profile to manage contact details, location, and operating hours.",
        )}
      </p>
      <Button
        onClick={onCreate}
        className="text-primary-foreground bg-primary hover:bg-primary/90"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        {t("hospital.empty.cta", "Create Hospital Profile")}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
type Mode = "view" | "create" | "edit";

const HospitalProfile = () => {
  const { t } = useTranslation();
  const [hospital, setHospital] = useState<HospitalData | null>(null);
  const [mode, setMode] = useState<Mode>("create");
  const [rxOpen, setRxOpen] = useState(false);

  // Unified sidebar state — hoisted to page level (mirrors DoctorProfile)
  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const isForm = mode === "create" || mode === "edit";

  const rxList = usePrescriptions().filter(
    (p) =>
      p.issuer === "hospital" &&
      p.issuerOrg === (hospital?.name_en ?? HOSPITAL_CONST),
  );

  const handleSubmit = (data: HospitalData) => {
    setHospital(data);
    setMode("view");
    // TODO: POST /hospital or PATCH /hospital
  };

  const handleDelete = () => {
    setHospital(null);
    setCurrentStep(0);
    setVisited(new Set([0]));
    setMode("create");
    // TODO: DELETE /hospital
  };

  const openEdit = () => {
    setCurrentStep(0);
    setVisited(new Set([0]));
    setMode("edit");
  };

  // Stats derived from profile (view mode only)
  const stats = hospital
    ? {
        type: humanType(hospital.type),
        city: hospital.city,
        hours: hospital.is_open_24h
          ? "24 hours"
          : `${hospital.opens_at} – ${hospital.closes_at}`,
        status: isOpenNow(
          hospital.opens_at,
          hospital.closes_at,
          hospital.is_open_24h,
        )
          ? "Open"
          : "Closed",
        prescriptions: rxList.length,
        country: hospital.country,
      }
    : null;

  return (
    <DashboardLayout role="hospital">
      <PageHeader
        title={t("pages.hospital.rx_title")}
        subtitle={
          isForm
            ? t(
                "hospital.form.subtitle",
                mode === "edit"
                  ? "Update your hospital information"
                  : "Fill in the details below to register your hospital",
              )
            : t("pages.hospital.rx_sub", {
                name: hospital?.name_en ?? HOSPITAL_CONST,
              })
        }
      />

      <div className="px-6 py-8 space-y-5">
        {/* ── Stats bar (view mode only) ── */}
        {stats && !isForm && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <StatCard label="Type" value={stats.type} />
            <StatCard label="City" value={stats.city} />
            <StatCard label="Country" value={stats.country} />
            <StatCard label="Hours" value={stats.hours} />
            <StatCard label="Status" value={stats.status} accent />
            <StatCard
              label="Prescriptions"
              value={stats.prescriptions}
              sub="issued"
            />
          </div>
        )}

        {/* ── Single unified card with sidebar + content ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex min-h-[560px]">
          {/* ── Unified Sidebar ── */}
          <UnifiedSidebar
            currentStep={currentStep}
            visited={visited}
            onSelect={(i) => {
              const next = new Set([...visited, i]);
              setVisited(next);
              setCurrentStep(i);
            }}
            mode={mode}
            hospitalData={hospital}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {/* ── Right content area ── */}
          {isForm ? (
            <HospitalForm
              mode={mode === "edit" ? "edit" : "create"}
              defaultValues={mode === "edit" && hospital ? hospital : undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                if (hospital) setMode("view");
              }}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              visited={visited}
              onVisitedChange={setVisited}
            />
          ) : hospital ? (
            <HospitalProfileView
              hospital={hospital}
              rxList={rxList}
              onNewRx={() => setRxOpen(true)}
            />
          ) : (
            <EmptyHospital onCreate={() => setMode("create")} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HospitalProfile;
