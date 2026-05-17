import React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  User,
  MapPin,
  Phone,
  HeartPulse,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileData {
  date_of_birth: string;
  gender: string;
  national_id: string;
  blood_type: string;
  address: string;
  city: string;
  province: string;
  country: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const GENDERS = ["male", "female", "other"];
const BLOODS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const RELATIONS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];

const STEPS = [
  {
    id: "personal" as const,
    label: "Personal",
    icon: User,
    sectionTitle: "Personal information",
    description: "DOB, gender & national ID",
    fields: ["date_of_birth", "gender", "national_id"] as (keyof ProfileData)[],
  },
  {
    id: "medical" as const,
    label: "Medical",
    icon: HeartPulse,
    sectionTitle: "Medical information",
    description: "Blood type & health details",
    fields: ["blood_type"] as (keyof ProfileData)[],
  },
  {
    id: "address" as const,
    label: "Address",
    icon: MapPin,
    sectionTitle: "Address",
    description: "Street, city & province",
    fields: ["address", "city", "province", "country"] as (keyof ProfileData)[],
  },
  {
    id: "emergency" as const,
    label: "Emergency",
    icon: Phone,
    sectionTitle: "Emergency contact",
    description: "Contact name, relation & phone",
    fields: [
      "emergency_contact_name",
      "emergency_contact_relation",
      "emergency_contact_phone",
    ] as (keyof ProfileData)[],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatId = (id: string) => id.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
const formatPhone = (p: string) =>
  p.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
const calcAge = (d: string) =>
  Math.floor(
    (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-primary/10">
          <Icon size={14} className="text-primary" />
        </div>
        <h3 className="text-xs font-semibold tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium text-foreground",
          mono && "font-mono tracking-wide",
        )}
      >
        {value}
      </span>
    </div>
  );
}

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
// Unified Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function UnifiedSidebar({
  currentStep,
  visited,
  onSelect,
  mode,
  profile,
  onEdit,
  onDelete,
}: {
  currentStep: number;
  visited: Set<number>;
  onSelect: (i: number) => void;
  mode: "create" | "edit" | "view";
  profile: ProfileData | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isForm = mode === "create" || mode === "edit";
  const visitedCount = visited.size;
  const pct = Math.round((visitedCount / STEPS.length) * 100);

  return (
    <div className="w-full sm:w-52 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      {/* ── Top: progress header (form) or profile mini-card (view) ── */}
      <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        {isForm ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Profile setup
              </span>
              <span className="text-[11px] font-bold tabular-nums text-primary">
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
        ) : profile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                {getInitials(profile.emergency_contact_name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {profile.gender.charAt(0).toUpperCase() +
                    profile.gender.slice(1)}{" "}
                  · {calcAge(profile.date_of_birth)} yrs
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                  {formatId(profile.national_id).slice(0, 9)}…
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: "Blood type", value: profile.blood_type },
                { label: "City", value: profile.city },
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
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all border",
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

      {/* ── Footer ── */}
      {!isForm && profile ? (
        <div className="p-2 sm:p-3 border-t border-border flex flex-row sm:flex-col gap-2">
          <Button
            onClick={onEdit}
            className="flex-1 sm:w-full text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-8"
          >
            <Pencil size={12} />
            Edit profile
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="flex-1 sm:w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 h-8"
          >
            <Trash2 size={12} />
            Delete profile
          </Button>
        </div>
      ) : isForm ? (
        <div className="hidden sm:block px-3.5 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {mode === "edit"
              ? "Click any section to jump directly"
              : "Jump between sections freely — no order needed"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-step Profile Form
// ─────────────────────────────────────────────────────────────────────────────
function ProfileForm({
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
  defaultValues?: Partial<ProfileData>;
  onSubmit: (data: ProfileData) => void;
  onCancel: () => void;
  currentStep: number;
  onStepChange: (i: number) => void;
  visited: Set<number>;
  onVisitedChange: (v: Set<number>) => void;
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<ProfileData>({ defaultValues });

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
        {step.id === "personal" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={t("profile.field.dob", "Date of birth")}
              error={errors.date_of_birth?.message}
            >
              <Input
                type="date"
                {...register("date_of_birth", { required: "Required" })}
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("profile.field.gender", "Gender")}
              error={errors.gender?.message}
            >
              <Select
                defaultValue={defaultValues?.gender}
                onValueChange={(v) => setValue("gender", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label={t("profile.field.national_id", "National ID")}
              error={errors.national_id?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("national_id", {
                  required: "Required",
                  minLength: { value: 16, message: "Must be 16 digits" },
                  maxLength: { value: 16, message: "Must be 16 digits" },
                  pattern: { value: /^\d+$/, message: "Digits only" },
                })}
                placeholder="1199580012345678"
                maxLength={16}
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {step.id === "medical" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={t("profile.field.blood_type", "Blood type")}
              error={errors.blood_type?.message}
            >
              <Select
                defaultValue={defaultValues?.blood_type}
                onValueChange={(v) => setValue("blood_type", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOODS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <p className="col-span-1 sm:col-span-2 text-xs text-muted-foreground mt-1">
              Only blood type is recorded at this time. Additional medical
              details can be added later.
            </p>
          </div>
        )}

        {step.id === "address" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={t("profile.field.address", "Street address")}
              error={errors.address?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("address", { required: "Required" })}
                placeholder="KG 123 St"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField
              label={t("profile.field.city", "City")}
              error={errors.city?.message}
            >
              <Input
                {...register("city", { required: "Required" })}
                placeholder="Kigali"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField
              label={t("profile.field.province", "Province")}
              error={errors.province?.message}
            >
              <Input
                {...register("province", { required: "Required" })}
                placeholder="Kigali City"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField
              label={t("profile.field.country", "Country")}
              error={errors.country?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("country", { required: "Required" })}
                placeholder="Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {step.id === "emergency" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={t("profile.field.contact_name", "Full name")}
              error={errors.emergency_contact_name?.message}
            >
              <Input
                {...register("emergency_contact_name", {
                  required: "Required",
                })}
                placeholder="Jane Doe"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField
              label={t("profile.field.contact_relation", "Relationship")}
              error={errors.emergency_contact_relation?.message}
            >
              <Select
                defaultValue={defaultValues?.emergency_contact_relation}
                onValueChange={(v) => setValue("emergency_contact_relation", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue placeholder="Relation" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label={t("profile.field.contact_phone", "Phone number")}
              error={errors.emergency_contact_phone?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                type="tel"
                {...register("emergency_contact_phone", {
                  required: "Required",
                })}
                placeholder="0789999999"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
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
// Profile View
// ─────────────────────────────────────────────────────────────────────────────
function ProfileView({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
      {/* Hero banner */}
      <div className="rounded-xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden bg-card border border-border">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full pointer-events-none bg-primary/10" />
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
          {getInitials(profile.emergency_contact_name)}
        </div>
        <div className="relative z-10 flex-1 min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {t("pages.patient.profile_title")}
          </h2>
          <p className="text-[10px] mt-0.5 font-mono text-muted-foreground">
            {formatId(profile.national_id)}
          </p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <Badge className="text-[11px] font-medium rounded-full px-3 bg-primary/15 text-primary border border-primary/30">
              Active
            </Badge>
            <Badge className="text-[11px] font-medium rounded-full px-3 bg-muted text-muted-foreground border border-border">
              {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}{" "}
              · {calcAge(profile.date_of_birth)} yrs
            </Badge>
            <Badge className="text-[11px] font-medium rounded-full px-3 bg-destructive/15 text-destructive border border-destructive/25">
              {profile.blood_type} Blood
            </Badge>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard
          icon={User}
          title={t("profile.section.personal", "Personal Information")}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("profile.field.dob", "Date of birth")}
              value={formatDate(profile.date_of_birth)}
            />
            <Field
              label={t("profile.field.gender", "Gender")}
              value={
                profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
              }
            />
            <div className="col-span-2">
              <Field
                label={t("profile.field.national_id", "National ID")}
                value={formatId(profile.national_id)}
                mono
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={HeartPulse}
          title={t("profile.section.medical", "Medical Information")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-semibold tracking-tight text-destructive-foreground bg-destructive shrink-0 shadow-sm">
              {profile.blood_type}
            </div>
            <div>
              <p className="text-[11px] font-medium text-foreground">
                Blood type{" "}
                {profile.blood_type === "O+"
                  ? "O Positive"
                  : profile.blood_type}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recorded on file
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={MapPin}
          title={t("profile.section.address", "Address")}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field
                label={t("profile.field.address", "Street")}
                value={profile.address}
              />
            </div>
            <Field
              label={t("profile.field.city", "City")}
              value={profile.city}
            />
            <Field
              label={t("profile.field.province", "Province")}
              value={profile.province}
            />
            <div className="col-span-2">
              <Field
                label={t("profile.field.country", "Country")}
                value={profile.country}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={Phone}
          title={t("profile.section.emergency", "Emergency Contact")}
        >
          <div className="flex items-center gap-3 rounded-md p-2.5 border border-destructive/20 bg-destructive/5 flex-wrap">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-medium text-destructive bg-destructive/15 shrink-0">
              {getInitials(profile.emergency_contact_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-foreground truncate">
                {profile.emergency_contact_name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile.emergency_contact_relation}
              </p>
            </div>
            <div className="text-[11px] font-medium rounded-sm px-3 py-1.5 bg-primary/10 text-primary shrink-0">
              {formatPhone(profile.emergency_contact_phone)}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
type Mode = "view" | "create" | "edit";

const PatientProfile = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [mode, setMode] = useState<Mode>("create");
  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const isForm = mode === "create" || mode === "edit";

  const handleSubmit = (data: ProfileData) => {
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

  return (
    <DashboardLayout role="patient">
      <PageHeader
        title={t("pages.patient.profile_title")}
        subtitle={
          isForm
            ? mode === "edit"
              ? "Update your personal and medical information"
              : "Fill in the details below to get started"
            : t("pages.patient.profile_sub")
        }
      />

      <div className="px-3 py-4 sm:px-6 sm:py-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col sm:flex-row min-h-[480px]">
          <UnifiedSidebar
            currentStep={currentStep}
            visited={visited}
            onSelect={(i) => {
              const next = new Set([...visited, i]);
              setVisited(next);
              setCurrentStep(i);
            }}
            mode={mode}
            profile={profile}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {isForm ? (
            <ProfileForm
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
            <ProfileView profile={profile} />
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientProfile;