import React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Truck,
  Plus,
  Pencil,
  Trash2,
  Check,
  Share2,
  Calendar,
  Facebook,
  Twitter,
  Instagram,
  Globe,
  Linkedin,
  X,
  Link2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface WorkingHoursDay {
  enabled: boolean;
  opens_at: string;
  closes_at: string;
}

interface WorkingHours {
  monday: WorkingHoursDay;
  tuesday: WorkingHoursDay;
  wednesday: WorkingHoursDay;
  thursday: WorkingHoursDay;
  friday: WorkingHoursDay;
  saturday: WorkingHoursDay;
  sunday: WorkingHoursDay;
}

interface SocialLinks {
  website: string;
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
}

interface PharmacyProfileData {
  name_en: string;
  name_fr: string;
  description_en: string;
  registration_number: string;
  address: string;
  city: string;
  province: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  opens_at: string;
  closes_at: string;
  is_open_24h: boolean;
  offers_delivery: boolean;
  offers_pickup: boolean;
  delivery_fee: string;
  delivery_currency: string;
  delivery_radius_km: string;
  estimated_delivery_minutes: string;
  working_hours: WorkingHours;
  social_links: SocialLinks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type DayKey = (typeof DAYS_OF_WEEK)[number];

const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const SOCIAL_PLATFORMS = [
  {
    key: "website" as const,
    label: "Website",
    icon: Globe,
    placeholder: "https://medipharm.rw",
  },
  {
    key: "facebook" as const,
    label: "Facebook",
    icon: Facebook,
    placeholder: "https://facebook.com/medipharm",
  },
  {
    key: "twitter" as const,
    label: "Twitter / X",
    icon: Twitter,
    placeholder: "https://twitter.com/medipharm",
  },
  {
    key: "instagram" as const,
    label: "Instagram",
    icon: Instagram,
    placeholder: "https://instagram.com/medipharm",
  },
  {
    key: "linkedin" as const,
    label: "LinkedIn",
    icon: Linkedin,
    placeholder: "https://linkedin.com/company/medipharm",
  },
];

const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  tuesday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  wednesday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  thursday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  friday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  saturday: { enabled: true, opens_at: "09:00", closes_at: "15:00" },
  sunday: { enabled: false, opens_at: "09:00", closes_at: "13:00" },
};

const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  website: "",
  facebook: "",
  twitter: "",
  instagram: "",
  linkedin: "",
};

const STEPS = [
  {
    id: "general" as const,
    label: "General",
    icon: Building2,
    sectionTitle: "General information",
    description: "Name, registration & description",
    fields: [
      "name_en",
      "name_fr",
      "description_en",
      "registration_number",
    ] as (keyof PharmacyProfileData)[],
  },
  {
    id: "location" as const,
    label: "Location",
    icon: MapPin,
    sectionTitle: "Location",
    description: "Address, city, province & coordinates",
    fields: [
      "address",
      "city",
      "province",
      "country",
      "latitude",
      "longitude",
    ] as (keyof PharmacyProfileData)[],
  },
  {
    id: "contact" as const,
    label: "Contact",
    icon: Phone,
    sectionTitle: "Contact details",
    description: "Phone number & email",
    fields: ["phone", "email"] as (keyof PharmacyProfileData)[],
  },
  {
    id: "hours" as const,
    label: "Hours & Delivery",
    icon: Truck,
    sectionTitle: "Hours & delivery",
    description: "Opening hours & delivery settings",
    fields: [
      "opens_at",
      "closes_at",
      "delivery_fee",
      "delivery_radius_km",
      "estimated_delivery_minutes",
    ] as (keyof PharmacyProfileData)[],
  },
  {
    id: "working_hours" as const,
    label: "Working Hours",
    icon: Calendar,
    sectionTitle: "Weekly working hours",
    description: "Per-day open/close schedule",
    fields: [] as (keyof PharmacyProfileData)[],
  },
  {
    id: "social_links" as const,
    label: "Social Links",
    icon: Share2,
    sectionTitle: "Social media & web",
    description: "Website, Facebook, Instagram…",
    fields: [] as (keyof PharmacyProfileData)[],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatPhone = (p: string) =>
  p.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4");

const formatTime = (t: string) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatDeliveryFee = (fee: string, currency: string) =>
  `${currency} ${Number(fee).toLocaleString()}`;

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
// StatCard
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
          "text-2xl font-semibold tabular-nums truncate",
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
// Unified Sidebar — fully responsive (matches DoctorProfile pattern)
// ─────────────────────────────────────────────────────────────────────────────
function UnifiedSidebar({
  currentStep,
  visited,
  onSelect,
  mode,
  profileData,
  onEdit,
  onDelete,
}: {
  currentStep: number;
  visited: Set<number>;
  onSelect: (i: number) => void;
  mode: "create" | "edit" | "view";
  profileData: PharmacyProfileData | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isForm = mode === "create" || mode === "edit";
  const visitedCount = visited.size;
  const pct = Math.round((visitedCount / STEPS.length) * 100);

  return (
    <div className="w-full sm:w-56 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      {/* Header */}
      <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
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
        ) : profileData ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                {getInitials(profileData.name_en)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {profileData.name_en}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                  {profileData.registration_number}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: "City", value: profileData.city },
                {
                  label: "Delivery fee",
                  value: profileData.offers_delivery
                    ? formatDeliveryFee(
                        profileData.delivery_fee,
                        profileData.delivery_currency,
                      )
                    : "No delivery",
                },
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

      {/* Step nav — horizontal scroll on mobile, vertical on sm+ */}
      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden overflow-y-hidden sm:overflow-y-auto">
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
                "flex shrink-0 sm:shrink sm:w-full items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-md text-left transition-all duration-150",
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

              {/* Labels — hidden on mobile, visible sm+ */}
              <div className="flex-1 min-w-0 hidden sm:block">
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
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary shrink-0">
                      editing
                    </span>
                  )}
                  {isDone && isForm && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">
                      done
                    </span>
                  )}
                </div>
                <p className="hidden sm:block text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                  {step.description}
                </p>
                {isForm && (
                  <div className="hidden sm:block h-0.5 rounded-full bg-muted overflow-hidden mt-1.5">
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

      {/* Footer actions (view mode) */}
      {!isForm && profileData && (
        <div className="p-2 sm:p-3 border-t border-border flex flex-row sm:flex-col gap-2">
          <Button
            onClick={onEdit}
            className="flex-1 sm:w-full text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-8"
          >
            <Pencil size={12} /> Edit profile
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="flex-1 sm:w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 h-8"
          >
            <Trash2 size={12} /> Delete profile
          </Button>
        </div>
      )}

      {/* Footer hint (form mode) — hidden on mobile */}
      {isForm && (
        <div className="hidden sm:block px-3.5 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {mode === "edit"
              ? "Click any section to jump directly"
              : "Jump between sections freely — no order needed"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Working Hours Form Step
// ─────────────────────────────────────────────────────────────────────────────
function WorkingHoursStep({
  value,
  onChange,
}: {
  value: WorkingHours;
  onChange: (v: WorkingHours) => void;
}) {
  const updateDay = (day: DayKey, patch: Partial<WorkingHoursDay>) => {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  };

  const applyToAll = (day: DayKey) => {
    const source = value[day];
    const updated = { ...value };
    DAYS_OF_WEEK.forEach((d) => {
      if (d !== day) {
        updated[d] = {
          ...updated[d],
          opens_at: source.opens_at,
          closes_at: source.closes_at,
        };
      }
    });
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {/* Header legend — hidden on mobile */}
      <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_auto_auto] gap-2 items-center px-1 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Day
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Opens at
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Closes at
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Copy
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Open
        </span>
      </div>

      {DAYS_OF_WEEK.map((day) => {
        const dayData = value[day];
        const isWeekend = day === "saturday" || day === "sunday";
        return (
          <div
            key={day}
            className={cn(
              "rounded-md border transition-colors",
              dayData.enabled
                ? "border-border bg-card"
                : "border-border/40 bg-muted/30 opacity-60",
              isWeekend && dayData.enabled && "border-primary/20 bg-primary/5",
            )}
          >
            {/* Desktop layout */}
            <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_auto_auto] gap-2 items-center px-3 py-2.5">
              <span
                className={cn(
                  "text-xs font-medium capitalize",
                  !dayData.enabled && "text-muted-foreground",
                  isWeekend && dayData.enabled && "text-primary",
                )}
              >
                {DAY_LABELS[day].slice(0, 3)}
              </span>
              <Input
                type="time"
                value={dayData.opens_at}
                onChange={(e) => updateDay(day, { opens_at: e.target.value })}
                disabled={!dayData.enabled}
                className="h-8 text-xs border-border focus-visible:ring-primary disabled:opacity-30"
              />
              <Input
                type="time"
                value={dayData.closes_at}
                onChange={(e) => updateDay(day, { closes_at: e.target.value })}
                disabled={!dayData.enabled}
                className="h-8 text-xs border-border focus-visible:ring-primary disabled:opacity-30"
              />
              <button
                onClick={() => applyToAll(day)}
                disabled={!dayData.enabled}
                title="Copy hours to all days"
                className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors px-1 font-medium"
              >
                ↓ All
              </button>
              <Switch
                checked={dayData.enabled}
                onCheckedChange={(v) => updateDay(day, { enabled: v })}
              />
            </div>

            {/* Mobile layout */}
            <div className="sm:hidden px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-semibold capitalize",
                    !dayData.enabled && "text-muted-foreground",
                    isWeekend && dayData.enabled && "text-primary",
                  )}
                >
                  {DAY_LABELS[day]}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => applyToAll(day)}
                    disabled={!dayData.enabled}
                    className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors font-medium"
                  >
                    ↓ All
                  </button>
                  <Switch
                    checked={dayData.enabled}
                    onCheckedChange={(v) => updateDay(day, { enabled: v })}
                  />
                </div>
              </div>
              {dayData.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">Opens at</span>
                    <Input
                      type="time"
                      value={dayData.opens_at}
                      onChange={(e) => updateDay(day, { opens_at: e.target.value })}
                      className="h-8 text-xs border-border focus-visible:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">Closes at</span>
                    <Input
                      type="time"
                      value={dayData.closes_at}
                      onChange={(e) => updateDay(day, { closes_at: e.target.value })}
                      className="h-8 text-xs border-border focus-visible:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground pt-1 pl-1">
        Use "↓ All" to copy a day's hours across the full week.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Links Form Step
// ─────────────────────────────────────────────────────────────────────────────
function SocialLinksStep({
  value,
  onChange,
}: {
  value: SocialLinks;
  onChange: (v: SocialLinks) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
        Add your pharmacy's social media and online profiles. All fields are optional.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
          <FormField key={key} label={label}>
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                value={value[key]}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                placeholder={placeholder}
                className="border-border focus-visible:ring-primary text-xs h-9"
                type="url"
              />
            </div>
          </FormField>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-step Pharmacy Form
// ─────────────────────────────────────────────────────────────────────────────
function PharmacyForm({
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
  defaultValues?: Partial<PharmacyProfileData>;
  onSubmit: (data: PharmacyProfileData) => void;
  onCancel: () => void;
  currentStep: number;
  onStepChange: (i: number) => void;
  visited: Set<number>;
  onVisitedChange: (v: Set<number>) => void;
}) {
  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PharmacyProfileData>({
    defaultValues: {
      is_open_24h: false,
      offers_delivery: true,
      offers_pickup: true,
      delivery_currency: "RWF",
      working_hours: DEFAULT_WORKING_HOURS,
      social_links: DEFAULT_SOCIAL_LINKS,
      ...defaultValues,
    },
  });

  const is24h = watch("is_open_24h");
  const offersDelivery = watch("offers_delivery");
  const workingHours = watch("working_hours");
  const socialLinks = watch("social_links");

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isEdit = mode === "edit";

  const goTo = (i: number) => {
    const next = new Set([...visited, i]);
    onVisitedChange(next);
    onStepChange(i);
  };

  const goNext = async () => {
    if (step.id === "general") {
      const valid = await trigger(step.fields);
      if (!valid) return;
    }
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
      <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {step.sectionTitle}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
      </div>

      {/* Scrollable step body */}
      <div key={currentStep} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* ── Step 1: General ── */}
        {step.id === "general" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Name (English)" error={errors.name_en?.message}>
              <Input
                {...register("name_en", { required: "Required" })}
                placeholder="MediPharm Kigali"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="Name (French)" error={errors.name_fr?.message}>
              <Input
                {...register("name_fr", { required: "Required" })}
                placeholder="MediPharmacie Kigali"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label="Registration Number"
              error={errors.registration_number?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("registration_number", { required: "Required" })}
                placeholder="RW-PHARM-2024-001"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>

            <FormField
              label="Description"
              error={errors.description_en?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("description_en", { required: "Required" })}
                placeholder="Your trusted neighborhood pharmacy…"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 2: Location ── */}
        {step.id === "location" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Street Address"
              error={errors.address?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("address", { required: "Required" })}
                placeholder="KN 5 Rd, Nyarugenge"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="City" error={errors.city?.message}>
              <Input
                {...register("city", { required: "Required" })}
                placeholder="Kigali"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="Province" error={errors.province?.message}>
              <Input
                {...register("province", { required: "Required" })}
                placeholder="Kigali City"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label="Country"
              error={errors.country?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("country", { required: "Required" })}
                placeholder="Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="Latitude" error={errors.latitude?.message}>
              <Input
                {...register("latitude", { required: "Required" })}
                placeholder="-1.9441"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>

            <FormField label="Longitude" error={errors.longitude?.message}>
              <Input
                {...register("longitude", { required: "Required" })}
                placeholder="30.0619"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 3: Contact ── */}
        {step.id === "contact" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Phone Number"
              error={errors.phone?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                type="tel"
                {...register("phone", { required: "Required" })}
                placeholder="+250788000200"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label="Email Address"
              error={errors.email?.message}
              className="col-span-1 sm:col-span-2"
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
                placeholder="info@medipharm.rw"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 4: Hours & Delivery ── */}
        {step.id === "hours" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-foreground">
                  Open 24 hours
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Overrides opening/closing times
                </p>
              </div>
              <Switch
                checked={is24h}
                onCheckedChange={(v) => setValue("is_open_24h", v)}
              />
            </div>

            <FormField label="Opens At" error={errors.opens_at?.message}>
              <Input
                type="time"
                disabled={is24h}
                {...register("opens_at", { required: !is24h && "Required" })}
                className="border-border focus-visible:ring-primary text-xs h-9 disabled:opacity-40"
              />
            </FormField>

            <FormField label="Closes At" error={errors.closes_at?.message}>
              <Input
                type="time"
                disabled={is24h}
                {...register("closes_at", { required: !is24h && "Required" })}
                className="border-border focus-visible:ring-primary text-xs h-9 disabled:opacity-40"
              />
            </FormField>

            <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { key: "offers_delivery", label: "Offers Delivery" },
                  { key: "offers_pickup", label: "Offers Pickup" },
                ] as const
              ).map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
                >
                  <p className="text-xs font-medium text-foreground">{label}</p>
                  <Switch
                    checked={watch(key)}
                    onCheckedChange={(v) => setValue(key, v)}
                  />
                </div>
              ))}
            </div>

            {offersDelivery && (
              <>
                <FormField
                  label="Delivery Fee (RWF)"
                  error={errors.delivery_fee?.message}
                >
                  <Input
                    type="number"
                    {...register("delivery_fee", { required: "Required" })}
                    placeholder="2000"
                    className="border-border focus-visible:ring-primary text-xs h-9"
                  />
                </FormField>

                <FormField
                  label="Radius (km)"
                  error={errors.delivery_radius_km?.message}
                >
                  <Input
                    type="number"
                    {...register("delivery_radius_km", {
                      required: "Required",
                    })}
                    placeholder="10"
                    className="border-border focus-visible:ring-primary text-xs h-9"
                  />
                </FormField>

                <FormField
                  label="Est. Delivery Time (min)"
                  error={errors.estimated_delivery_minutes?.message}
                  className="col-span-1 sm:col-span-2"
                >
                  <Input
                    type="number"
                    {...register("estimated_delivery_minutes", {
                      required: "Required",
                    })}
                    placeholder="45"
                    className="border-border focus-visible:ring-primary text-xs h-9"
                  />
                </FormField>
              </>
            )}
          </div>
        )}

        {/* ── Step 5: Working Hours ── */}
        {step.id === "working_hours" && (
          <WorkingHoursStep
            value={workingHours ?? DEFAULT_WORKING_HOURS}
            onChange={(v) => setValue("working_hours", v)}
          />
        )}

        {/* ── Step 6: Social Links ── */}
        {step.id === "social_links" && (
          <SocialLinksStep
            value={socialLinks ?? DEFAULT_SOCIAL_LINKS}
            onChange={(v) => setValue("social_links", v)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border">
        <Button
          variant="outline"
          onClick={goBack}
          className="border-border text-xs"
        >
          {currentStep === 0 ? "Cancel" : "← Back"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
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
// View helpers
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
// Working Hours View
// ─────────────────────────────────────────────────────────────────────────────
function WorkingHoursView({ hours }: { hours: WorkingHours }) {
  return (
    <div className="space-y-1">
      {DAYS_OF_WEEK.map((day) => {
        const dayData = hours[day];
        const isWeekend = day === "saturday" || day === "sunday";
        return (
          <div
            key={day}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 border text-[11px] flex-wrap gap-y-1",
              dayData.enabled
                ? isWeekend
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-card"
                : "border-border/30 bg-muted/20 opacity-50",
            )}
          >
            <span
              className={cn(
                "font-medium w-20 sm:w-24",
                !dayData.enabled && "text-muted-foreground",
                isWeekend && dayData.enabled && "text-primary",
              )}
            >
              {DAY_LABELS[day]}
            </span>
            {dayData.enabled ? (
              <span className="font-mono text-foreground text-[11px]">
                {formatTime(dayData.opens_at)} – {formatTime(dayData.closes_at)}
              </span>
            ) : (
              <span className="text-muted-foreground italic">Closed</span>
            )}
            <span
              className={cn(
                "text-[10px] font-semibold rounded-full px-2 py-0.5",
                dayData.enabled
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {dayData.enabled ? "Open" : "Closed"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Links View
// ─────────────────────────────────────────────────────────────────────────────
function SocialLinksView({ links }: { links: SocialLinks }) {
  const activeLinks = SOCIAL_PLATFORMS.filter(({ key }) => links[key]);

  if (activeLinks.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground italic py-2">
        No social links added.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {activeLinks.map(({ key, label, icon: Icon }) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-md border border-border bg-card hover:border-primary/40 hover:bg-primary/5 px-3 py-2 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-muted group-hover:bg-primary/15 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
            <Icon size={13} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span className="text-[11px] font-medium text-foreground group-hover:text-primary truncate transition-colors">
              {links[key].replace(/^https?:\/\/(www\.)?/, "")}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile view
// ─────────────────────────────────────────────────────────────────────────────
function PharmacyProfileView({ profile }: { profile: PharmacyProfileData }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-5">
      {/* General */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building2 size={15} className="text-primary" />
          General information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <ViewField label="Name (EN)" value={profile.name_en} />
          <ViewField label="Name (FR)" value={profile.name_fr} />
          <ViewField
            label="Registration"
            value={profile.registration_number}
            mono
          />
          <ViewField label="Country" value={profile.country} />
        </div>
        {profile.description_en && (
          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Description
            </p>
            <p className="text-[11px] text-foreground leading-relaxed">
              {profile.description_en}
            </p>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MapPin size={15} className="text-primary" />
          Location
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <div className="col-span-1 sm:col-span-2">
            <ViewField label="Street" value={profile.address} />
          </div>
          <ViewField label="City" value={profile.city} />
          <ViewField label="Province" value={profile.province} />
          <ViewField
            label="Coordinates"
            value={`${profile.latitude}, ${profile.longitude}`}
            mono
          />
        </div>
      </div>

      {/* Contact */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Phone size={15} className="text-primary" />
          Contact
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary">
              <Phone size={13} />
            </div>
            <span className="text-[11px] font-medium font-mono text-primary">
              {formatPhone(profile.phone)}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-[10px] font-bold">
              @
            </div>
            <span className="text-[11px] font-medium text-foreground truncate">
              {profile.email}
            </span>
          </div>
        </div>
      </div>

      {/* Hours & Delivery */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock size={15} className="text-primary" />
          Hours & delivery
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {profile.is_open_24h ? (
            <div className="col-span-1 sm:col-span-2">
              <ViewField label="Hours" value="Open 24 hours" />
            </div>
          ) : (
            <>
              <ViewField
                label="Opens at"
                value={formatTime(profile.opens_at)}
              />
              <ViewField
                label="Closes at"
                value={formatTime(profile.closes_at)}
              />
            </>
          )}

          {profile.offers_delivery && (
            <>
              <ViewField
                label="Delivery fee"
                value={formatDeliveryFee(
                  profile.delivery_fee,
                  profile.delivery_currency,
                )}
              />
              <ViewField
                label="Radius"
                value={`${profile.delivery_radius_km} km`}
              />
              <div className="col-span-1 sm:col-span-2">
                <ViewField
                  label="Est. delivery time"
                  value={`${profile.estimated_delivery_minutes} minutes`}
                />
              </div>
            </>
          )}

          <div className="col-span-1 sm:col-span-2 flex gap-2 mt-1 flex-wrap">
            {profile.offers_delivery && (
              <span className="text-[11px] font-medium rounded-full px-3 py-0.5 bg-primary/15 text-primary">
                ✓ Delivery
              </span>
            )}
            {profile.offers_pickup && (
              <span className="text-[11px] font-medium rounded-full px-3 py-0.5 bg-primary/15 text-primary">
                ✓ Pickup
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Working Hours */}
      {profile.working_hours && (
        <div className="border-t border-border pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar size={15} className="text-primary" />
            Weekly working hours
          </h3>
          <WorkingHoursView hours={profile.working_hours} />
        </div>
      )}

      {/* Social Links */}
      {profile.social_links && (
        <div className="border-t border-border pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Share2 size={15} className="text-primary" />
            Social media & web
          </h3>
          <SocialLinksView links={profile.social_links} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
function EmptyPharmacyProfile({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mb-3">
        <Building2 className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-sm font-semibold text-foreground mb-2">
        No pharmacy profile found
      </h2>
      <p className="text-[11px] text-muted-foreground mb-5 max-w-xs">
        Create your pharmacy profile to manage your information, hours, and
        delivery settings in one place.
      </p>
      <Button
        onClick={onCreate}
        className="text-primary-foreground bg-primary hover:bg-primary/90"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Create Profile
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
type Mode = "view" | "create" | "edit";

const PharmacyProfile = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<PharmacyProfileData | null>(null);
  const [mode, setMode] = useState<Mode>("create");

  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const isForm = mode === "create" || mode === "edit";

  const handleSubmit = (data: PharmacyProfileData) => {
    setProfile(data);
    setMode("view");
  };

  const handleDelete = () => {
    setProfile(null);
    setCurrentStep(0);
    setVisited(new Set([0]));
    setMode("create");
  };

  const openEdit = () => {
    setCurrentStep(0);
    setVisited(new Set([0]));
    setMode("edit");
  };

  const stats = profile
    ? {
        city: profile.city,
        registration: profile.registration_number,
        hours: profile.is_open_24h
          ? "24h"
          : `${formatTime(profile.opens_at)} – ${formatTime(profile.closes_at)}`,
        delivery: profile.offers_delivery
          ? formatDeliveryFee(profile.delivery_fee, profile.delivery_currency)
          : "None",
        radius: profile.offers_delivery
          ? `${profile.delivery_radius_km} km`
          : "—",
        eta: profile.offers_delivery
          ? `${profile.estimated_delivery_minutes} min`
          : "—",
      }
    : null;

  return (
    <DashboardLayout role="pharmacy">
      <PageHeader
        title={t("pages.pharmacy.profile_title")}
        subtitle={
          isForm
            ? mode === "edit"
              ? "Update your pharmacy information"
              : "Fill in the details below to get started"
            : t("pages.pharmacy.profile_sub")
        }
      />

      <div className="px-3 py-4 sm:px-6 sm:py-8 space-y-4 sm:space-y-5">
        {/* Stats bar (view mode only) */}
        {stats && !isForm && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <StatCard label="City" value={stats.city} />
            <StatCard label="Registration" value={stats.registration} />
            <StatCard label="Hours" value={stats.hours} />
            <StatCard label="Delivery fee" value={stats.delivery} accent />
            <StatCard label="Radius" value={stats.radius} sub="km coverage" />
            <StatCard label="Est. time" value={stats.eta} sub="delivery ETA" />
          </div>
        )}

        {/* Unified card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col sm:flex-row min-h-[560px]">
          <UnifiedSidebar
            currentStep={currentStep}
            visited={visited}
            onSelect={(i) => {
              const next = new Set([...visited, i]);
              setVisited(next);
              setCurrentStep(i);
            }}
            mode={mode}
            profileData={profile}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {isForm ? (
            <PharmacyForm
              mode={mode === "edit" ? "edit" : "create"}
              defaultValues={mode === "edit" && profile ? profile : undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                if (profile) setMode("view");
              }}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              visited={visited}
              onVisitedChange={setVisited}
            />
          ) : profile ? (
            <PharmacyProfileView profile={profile} />
          ) : (
            <EmptyPharmacyProfile onCreate={() => setMode("create")} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyProfile;