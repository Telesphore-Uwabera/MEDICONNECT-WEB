import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  User,
  MapPin,
  Phone,
  HeartPulse,
  Pencil,
  Trash2,
  Check,
  Loader2,
  Shield,
  Pill,
  AlertTriangle,
  Activity,
  Stethoscope,
  FlaskConical,
  X,
  Plus,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import {
  useGetProfile,
  useUpsertProfile,
  useGetMedicalInfo,
  useSaveMedicalInfo,
  useGetInsurance,
  useUpdateInsurance,
  useGetPublicInsurances,
} from "@/hooks/use-patient-profile";
import type {
  PatientProfile as TPatientProfile,
  MedicalInfo,
  Insurance,
  UpdateMedicalPayload,
  UpdateInsurancePayload,
} from "@/types/patient-profile";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileFormData {
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

interface MutationError {
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const GENDERS = ["male", "female", "other"];
const BLOODS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const RELATIONS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];
const SMOKING = ["never", "former", "current"];
const ALCOHOL = ["never", "occasional", "regular"];

const PROFILE_STEPS = [
  {
    id: "personal" as const,
    label: "Personal",
    icon: User,
    sectionTitle: "Personal information",
    description: "DOB, gender & national ID",
    fields: ["date_of_birth", "gender", "national_id"] as (keyof ProfileFormData)[],
  },
  {
    id: "medical" as const,
    label: "Medical",
    icon: HeartPulse,
    sectionTitle: "Medical information",
    description: "Blood type & health details",
    fields: ["blood_type"] as (keyof ProfileFormData)[],
  },
  {
    id: "address" as const,
    label: "Address",
    icon: MapPin,
    sectionTitle: "Address",
    description: "Street, city & province",
    fields: ["address", "city", "province", "country"] as (keyof ProfileFormData)[],
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
    ] as (keyof ProfileFormData)[],
  },
];

type MainTab = "profile" | "medical" | "insurance";
type ProfileMode = "view" | "create" | "edit";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const toDateInput = (iso: string): string => (iso ? iso.split("T")[0] : "");

const formatDate = (d: string) => {
  const date = new Date(toDateInput(d));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const calcAge = (d: string) =>
  Math.floor(
    (Date.now() - new Date(toDateInput(d)).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
  );

const getInitials = (name: string) =>
  (name ?? "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const profileToForm = (p: TPatientProfile): ProfileFormData => ({
  date_of_birth: toDateInput(p.date_of_birth ?? ""),
  gender: p.gender ?? "",
  national_id: p.national_id ?? "",
  blood_type: p.blood_type ?? "",
  address: p.address ?? "",
  city: p.city ?? "",
  province: p.province ?? "",
  country: p.country ?? "",
  emergency_contact_name: p.emergency_contact_name ?? "",
  emergency_contact_phone: p.emergency_contact_phone ?? "",
  emergency_contact_relation: p.emergency_contact_relation ?? "",
});

const toMutationError = (err: unknown): MutationError =>
  err instanceof Error ? { message: err.message } : {};

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-primary/10">
          <Icon size={14} className="text-primary" />
        </div>
        <h3 className="text-xs font-semibold tracking-tight text-foreground flex-1">
          {title}
        </h3>
        {action}
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
      <span className={cn("text-[11px] font-medium text-foreground", mono && "font-mono tracking-wide")}>
        {value || <span className="text-muted-foreground/50 italic">—</span>}
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

function TagList({
  items,
  color = "default",
}: {
  items: string[];
  color?: "red" | "blue" | "yellow" | "green" | "default";
}) {
  if (!items?.length)
    return <span className="text-[11px] text-muted-foreground/50 italic">None recorded</span>;
  const colorMap = {
    red: "bg-destructive/10 text-destructive border-destructive/25",
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/25",
    yellow: "bg-yellow-500/10 text-yellow-700 border-yellow-500/25",
    green: "bg-green-500/10 text-green-700 border-green-500/25",
    default: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className={cn("text-[11px] font-medium rounded-full px-2.5 py-0.5 border", colorMap[color])}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  };

  const remove = (item: string) => onChange(value.filter((v) => v !== item));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="border-border focus-visible:ring-primary text-xs h-9 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="h-9 px-2.5 border-border"
        >
          <Plus size={12} />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-0.5 border bg-primary/10 text-primary border-primary/25"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                className="hover:text-destructive transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Bar
// ─────────────────────────────────────────────────────────────────────────────
function TabBar({
  active,
  onChange,
  hasProfile,
}: {
  active: MainTab;
  onChange: (t: MainTab) => void;
  hasProfile: boolean;
}) {
  const tabs: { id: MainTab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Patient Profile", icon: User },
    { id: "medical", label: "Medical Info", icon: Stethoscope },
    { id: "insurance", label: "My Insurance", icon: Shield },
  ];

  return (
    <div className="flex border-b border-border bg-card px-4 sm:px-6 gap-0">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          disabled={!hasProfile && id !== "profile"}
          className={cn(
            "flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs font-medium border-b-2 transition-all duration-150 -mb-px shrink-0",
            active === id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            !hasProfile && id !== "profile" && "opacity-40 cursor-not-allowed"
          )}
        >
          <Icon size={13} />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{label.split(" ")[0]}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSidebar({
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
  mode: ProfileMode;
  profile: TPatientProfile | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isForm = mode === "create" || mode === "edit";
  const visitedCount = visited.size;
  const pct = Math.round((visitedCount / PROFILE_STEPS.length) * 100);

  return (
    <div className="w-full sm:w-52 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        {isForm ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Profile setup
              </span>
              <span className="text-[11px] font-bold tabular-nums text-primary">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {visitedCount} of {PROFILE_STEPS.length} sections visited
            </p>
          </div>
        ) : profile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              {profile.user?.avatar ? (
                <img
                  src={profile.user.avatar}
                  alt={profile.user.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-primary/20 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                  {getInitials(profile.user?.name ?? "")}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {profile.user?.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {profile.user?.email}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                {
                  label: "Age",
                  value: profile.date_of_birth ? `${calcAge(profile.date_of_birth)} yrs` : "—",
                },
                { label: "Blood type", value: profile.blood_type ?? "—" },
                { label: "City", value: profile.city ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  <span className="text-[10px] font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden overflow-y-hidden sm:overflow-y-auto">
        {PROFILE_STEPS.map((step, i) => {
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
                    : "text-muted-foreground cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all border",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-muted border-border text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="flex items-center justify-between gap-1">
                  <span className={cn("text-xs font-medium leading-tight truncate", isActive ? "text-primary" : "")}>
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
                        isActive ? "bg-primary w-1/2" : isDone ? "bg-primary w-full" : "bg-transparent w-0"
                      )}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

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
            Delete
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
  isSaving,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => void;
  onCancel: () => void;
  currentStep: number;
  onStepChange: (i: number) => void;
  visited: Set<number>;
  onVisitedChange: (v: Set<number>) => void;
  isSaving: boolean;
}) {
  const { t, i18n } = useTranslation();
  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({ defaultValues });

  const step = PROFILE_STEPS[currentStep];
  const isLast = currentStep === PROFILE_STEPS.length - 1;
  const isEdit = mode === "edit";

  const goTo = (i: number) => {
    onVisitedChange(new Set([...visited, i]));
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
      <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {step.sectionTitle}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Step {currentStep + 1} of {PROFILE_STEPS.length}
        </span>
      </div>

      <div key={currentStep} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {step.id === "personal" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t("profile.field.dob", "Date of birth")} error={errors.date_of_birth?.message}>
              <Input
                type="date"
                {...register("date_of_birth", { required: "Required" })}
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label={t("profile.field.gender", "Gender")} error={errors.gender?.message}>
              <Select defaultValue={defaultValues?.gender} onValueChange={(v) => setValue("gender", v)}>
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
            <FormField label={t("profile.field.blood_type", "Blood type")} error={errors.blood_type?.message}>
              <Select defaultValue={defaultValues?.blood_type} onValueChange={(v) => setValue("blood_type", v)}>
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOODS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <p className="col-span-1 sm:col-span-2 text-xs text-muted-foreground mt-1">
              Only blood type is recorded here. Detailed medical info can be managed from the Medical Info tab.
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
            <FormField label={t("profile.field.city", "City")} error={errors.city?.message}>
              <Input
                {...register("city", { required: "Required" })}
                placeholder="Kigali"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label={t("profile.field.province", "Province")} error={errors.province?.message}>
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
                {...register("emergency_contact_name", { required: "Required" })}
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
                    <SelectItem key={r} value={r}>{r}</SelectItem>
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
                {...register("emergency_contact_phone", { required: "Required" })}
                placeholder="0789999999"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border">
        <Button variant="outline" onClick={goBack} className="border-border text-xs">
          {currentStep === 0 ? "Cancel" : "← Back"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Step {currentStep + 1} of {PROFILE_STEPS.length}
        </span>
        <Button
          onClick={goNext}
          disabled={isSaving}
          className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 gap-1.5"
        >
          {isSaving && isLast && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isLast ? (isEdit ? "Save changes" : "Create profile") : "Next →"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile View
// ─────────────────────────────────────────────────────────────────────────────
function ProfileView({ profile }: { profile: TPatientProfile }) {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
      <div className="rounded-xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden bg-card border border-border">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full pointer-events-none bg-primary/10" />
        {profile.user?.avatar ? (
          <img
            src={profile.user.avatar}
            alt={profile.user.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
            {getInitials(profile.user?.name ?? "")}
          </div>
        )}
        <div className="relative z-10 flex-1 min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{profile.user?.name}</h2>
          <p className="text-[10px] mt-0.5 text-muted-foreground">{profile.user?.email}</p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <Badge className="text-[11px] font-medium rounded-full px-3 bg-primary/15 text-primary border border-primary/30">
              Active
            </Badge>
            <Badge className="text-[11px] font-medium rounded-full px-3 bg-muted text-muted-foreground border border-border">
              {profile.gender?.charAt(0).toUpperCase() + (profile.gender?.slice(1) ?? "")} ·{" "}
              {profile.date_of_birth ? calcAge(profile.date_of_birth) : "—"} yrs
            </Badge>
            {profile.blood_type && (
              <Badge className="text-[11px] font-medium rounded-full px-3 bg-destructive/15 text-destructive border border-destructive/25">
                {profile.blood_type} Blood
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard icon={User} title={t("profile.section.personal", "Personal Information")}>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("profile.field.dob", "Date of birth")}
              value={profile.date_of_birth ? formatDate(profile.date_of_birth) : "—"}
            />
            <Field
              label={t("profile.field.gender", "Gender")}
              value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "—"}
            />
            <div className="col-span-2">
              <Field label={t("profile.field.national_id", "National ID")} value={profile.national_id ?? "—"} mono />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={HeartPulse} title={t("profile.section.medical", "Medical Information")}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-semibold text-destructive-foreground bg-destructive shrink-0">
              {profile.blood_type ?? "?"}
            </div>
            <div>
              <p className="text-[11px] font-medium text-foreground">Blood type {profile.blood_type ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile.insurance
                  ? `${profile.insurance.name} · ${parseFloat(profile.insurance.coverage_percentage)}% coverage`
                  : "No insurance linked"}
              </p>
              {profile.medical_info && (
                <p className="text-[10px] text-primary mt-1">Medical info on file</p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title={t("profile.section.address", "Address")}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label={t("profile.field.address", "Street")} value={profile.address ?? "—"} />
            </div>
            <Field label={t("profile.field.city", "City")} value={profile.city ?? "—"} />
            <Field label={t("profile.field.province", "Province")} value={profile.province ?? "—"} />
            <div className="col-span-2">
              <Field label={t("profile.field.country", "Country")} value={profile.country ?? "—"} />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Phone} title={t("profile.section.emergency", "Emergency Contact")}>
          {profile.emergency_contact_name ? (
            <div className="flex items-center gap-3 rounded-md p-2.5 border border-destructive/20 bg-destructive/5 flex-wrap">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-medium text-destructive bg-destructive/15 shrink-0">
                {getInitials(profile.emergency_contact_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-foreground truncate">
                  {profile.emergency_contact_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile.emergency_contact_relation ?? "—"}
                </p>
              </div>
              {profile.emergency_contact_phone && (
                <div className="text-[11px] font-medium rounded-sm px-3 py-1.5 bg-primary/10 text-primary shrink-0">
                  {profile.emergency_contact_phone}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No emergency contact recorded. Edit your profile to add one.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Medical Info Tab
// ─────────────────────────────────────────────────────────────────────────────
function MedicalInfoTab() {
  const { data, isLoading } = useGetMedicalInfo();
  const saveMedical = useSaveMedicalInfo();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<UpdateMedicalPayload>({});

  const medical = data?.medical_info ?? null;
  const patient = data?.patient ?? null;

  const startEdit = () => {
    setForm(
      medical
        ? {
            allergies: medical.allergies ?? [],
            chronic_conditions: medical.chronic_conditions ?? [],
            current_medications: medical.current_medications ?? [],
            previous_surgeries: medical.previous_surgeries ?? [],
            family_history: medical.family_history ?? [],
            smoking_status: medical.smoking_status ?? "",
            alcohol_use: medical.alcohol_use ?? "",
            notes: medical.notes ?? "",
          }
        : {
            allergies: [],
            chronic_conditions: [],
            current_medications: [],
            previous_surgeries: [],
            family_history: [],
            smoking_status: "",
            alcohol_use: "",
            notes: "",
          }
    );
    setIsEditing(true);
  };

  const handleSave = () => {
    saveMedical.mutate(form, {
      onSuccess: () => {
        toast.success("Medical information saved.");
        setIsEditing(false);
      },
      onError: (err: unknown) => {
        const { message } = toMutationError(err);
        toast.error(message ?? "Failed to save medical info.");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-5 space-y-4 animate-pulse">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-md bg-muted" />)}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Edit medical information
          </span>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 text-xs text-muted-foreground">
            Cancel
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {(
              [
                { key: "allergies", label: "Allergies", placeholder: "e.g. Penicillin" },
                { key: "chronic_conditions", label: "Chronic conditions", placeholder: "e.g. Diabetes" },
                { key: "current_medications", label: "Current medications", placeholder: "e.g. Metformin 500mg" },
                { key: "previous_surgeries", label: "Previous surgeries", placeholder: "e.g. Appendectomy 2018" },
                { key: "family_history", label: "Family history", placeholder: "e.g. Heart disease" },
              ] as { key: keyof Pick<UpdateMedicalPayload, "allergies" | "chronic_conditions" | "current_medications" | "previous_surgeries" | "family_history">; label: string; placeholder: string }[]
            ).map(({ key, label, placeholder }) => (
              <div key={key}>
                <Label className="text-[10px] text-muted-foreground mb-1.5 block">{label}</Label>
                <TagInput
                  value={form[key] ?? []}
                  onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  placeholder={placeholder}
                />
              </div>
            ))}

            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1.5 block">Smoking status</Label>
                <Select value={form.smoking_status ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, smoking_status: v }))}>
                  <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SMOKING.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1.5 block">Alcohol use</Label>
                <Select value={form.alcohol_use ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, alcohol_use: v }))}>
                  <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALCOHOL.map((a) => (
                      <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <Label className="text-[10px] text-muted-foreground mb-1.5 block">Additional notes</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any other relevant notes..."
                className="border-border focus-visible:ring-primary text-xs resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 sm:px-5 py-3 bg-muted/50 border-t border-border">
          <Button variant="outline" onClick={() => setIsEditing(false)} className="border-border text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMedical.isPending}
            className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 gap-1.5"
          >
            {saveMedical.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save medical info
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Medical Information</h3>
          {patient && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {patient.user?.name} · {patient.date_of_birth ? calcAge(patient.date_of_birth) : "—"} yrs
            </p>
          )}
        </div>
        <Button onClick={startEdit} variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border">
          <Pencil size={12} />
          {medical ? "Edit" : "Add info"}
        </Button>
      </div>

      {!medical ? (
        <div className="rounded-xl border border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Stethoscope size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No medical info yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your allergies, conditions, medications and more.</p>
          </div>
          <Button onClick={startEdit} size="sm" className="text-xs gap-1.5 mt-1">
            <Plus size={12} />
            Add medical info
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SectionCard icon={AlertTriangle} title="Allergies">
            <TagList items={medical.allergies ?? []} color="red" />
          </SectionCard>
          <SectionCard icon={Activity} title="Chronic Conditions">
            <TagList items={medical.chronic_conditions ?? []} color="yellow" />
          </SectionCard>
          <SectionCard icon={Pill} title="Current Medications">
            <TagList items={medical.current_medications ?? []} color="blue" />
          </SectionCard>
          <SectionCard icon={FlaskConical} title="Previous Surgeries">
            <TagList items={medical.previous_surgeries ?? []} color="default" />
          </SectionCard>
          <SectionCard icon={HeartPulse} title="Family History">
            <TagList items={medical.family_history ?? []} color="green" />
          </SectionCard>
          <SectionCard icon={User} title="Lifestyle">
            <div className="space-y-2.5">
              {[
                { label: "Smoking", value: medical.smoking_status },
                { label: "Alcohol", value: medical.alcohol_use },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <Badge
                    className={cn(
                      "text-[11px] rounded-full px-2.5 border",
                      value === "never"
                        ? "bg-green-500/10 text-green-700 border-green-500/25"
                        : value === "current"
                          ? "bg-destructive/10 text-destructive border-destructive/25"
                          : "bg-yellow-500/10 text-yellow-700 border-yellow-500/25"
                    )}
                  >
                    {value ? value.charAt(0).toUpperCase() + value.slice(1) : "—"}
                  </Badge>
                </div>
              ))}
              {medical.notes && (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Notes
                  </span>
                  <p className="text-[11px] text-foreground leading-relaxed">{medical.notes}</p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insurance Tab
// ─────────────────────────────────────────────────────────────────────────────
function InsuranceTab({
  profileInsurance,
}: {
  profileInsurance?: Insurance | null;
}) {
  const { data: insurance, isLoading } = useGetInsurance();
  const { data: publicInsurances = [], isLoading: isLoadingPublic } = useGetPublicInsurances();
  const updateInsurance = useUpdateInsurance();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [insuranceNumber, setInsuranceNumber] = useState("");

  const active = insurance ?? profileInsurance ?? null;

  // The insurance from the public list that matches the currently selected id
  const selectedPublicInsurance = publicInsurances.find(
    (ins) => ins.id.toString() === selectedId
  ) ?? null;

  const startEdit = () => {
    setSelectedId(active?.id?.toString() ?? "");
    setInsuranceNumber("");
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedId) {
      toast.error("Please select an insurance provider.");
      return;
    }
    if (!insuranceNumber.trim()) {
      toast.error("Insurance number is required.");
      return;
    }
    updateInsurance.mutate(
      {
        insurance_id: parseInt(selectedId, 10),
        insurance_number: insuranceNumber.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Insurance updated successfully.");
          setIsEditing(false);
        },
        onError: (err: unknown) => {
          const { message } = toMutationError(err);
          toast.error(message ?? "Failed to update insurance.");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-5 space-y-4 animate-pulse">
        <div className="h-32 rounded-xl bg-muted" />
        <div className="h-24 rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">My Insurance</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Health insurance linked to your profile</p>
        </div>
        {active && !isEditing && (
          <Button onClick={startEdit} variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border">
            <RefreshCw size={12} />
            Update
          </Button>
        )}
      </div>

      {!active && !isEditing ? (
        <div className="rounded-xl border border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Shield size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No insurance linked</p>
            <p className="text-xs text-muted-foreground mt-1">Link your health insurance to access coverage benefits.</p>
          </div>
          <Button onClick={startEdit} size="sm" className="text-xs gap-1.5 mt-1">
            <Plus size={12} />
            Link insurance
          </Button>
        </div>
      ) : isEditing ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-primary/10">
              <Shield size={14} className="text-primary" />
            </div>
            <h3 className="text-xs font-semibold text-foreground">
              {active ? "Update insurance" : "Link insurance"}
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Insurance provider select */}
            <FormField label="Insurance provider">
              <Select
                value={selectedId}
                onValueChange={setSelectedId}
                disabled={isLoadingPublic}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  {isLoadingPublic ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 size={12} className="animate-spin" />
                      Loading providers…
                    </span>
                  ) : (
                    <SelectValue placeholder="Select a provider" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {publicInsurances.map((ins) => (
                    <SelectItem key={ins.id} value={ins.id.toString()}>
                      <div className="flex items-center gap-2">
                        {ins.logo ? (
                          <img
                            src={ins.logo}
                            alt={ins.name}
                            className="h-4 w-auto object-contain shrink-0"
                          />
                        ) : (
                          <Shield size={12} className="text-muted-foreground shrink-0" />
                        )}
                        <span>{ins.name}</span>
                        <span className="text-muted-foreground text-[10px]">
                          · {parseFloat(ins.coverage_percentage)}% coverage
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Preview card for the selected provider */}
            {selectedPublicInsurance && (
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-border">
                {selectedPublicInsurance.logo ? (
                  <img
                    src={selectedPublicInsurance.logo}
                    alt={selectedPublicInsurance.name}
                    className="h-8 w-auto object-contain shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield size={14} className="text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{selectedPublicInsurance.name}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedPublicInsurance.code}</p>
                  {selectedPublicInsurance.description && (
                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                      {selectedPublicInsurance.description}
                    </p>
                  )}
                </div>
                <Badge className="ml-auto text-[11px] rounded-full px-2.5 bg-green-500/10 text-green-700 border border-green-500/25 shrink-0">
                  {parseFloat(selectedPublicInsurance.coverage_percentage)}% coverage
                </Badge>
              </div>
            )}

            {/* Insurance number input */}
            <FormField label="Insurance number">
              <Input
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value)}
                placeholder="e.g. RSSB-123456"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="border-border text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateInsurance.isPending || !selectedId}
                className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 gap-1.5"
              >
                {updateInsurance.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : active ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-primary/5 pointer-events-none" />
            <div className="flex items-start gap-4">
              {active.logo ? (
                <img src={active.logo} alt={active.name} className="h-12 w-auto object-contain" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield size={22} className="text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-foreground">{active.name}</h4>
                  <Badge className="text-[10px] font-medium rounded-full px-2.5 bg-primary/15 text-primary border border-primary/30">
                    Active
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{active.code}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1">Coverage</p>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${parseFloat(active.coverage_percentage)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-semibold text-primary mt-1">
                      {parseFloat(active.coverage_percentage)}% covered
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SectionCard icon={CreditCard} title="Coverage Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Provider" value={active.name} />
              <Field label="Code" value={active.code} />
              <Field label="Coverage" value={`${parseFloat(active.coverage_percentage)}%`} />
              {active.insurance_number && (
                <Field label="Insurance number" value={active.insurance_number} mono />
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="flex-1 p-5 space-y-4 animate-pulse">
      <div className="h-24 rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-md bg-muted" />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const PatientProfile = () => {
  const { t, i18n } = useTranslation();

  const [mainTab, setMainTab] = useState<MainTab>("profile");
  const [profileMode, setProfileMode] = useState<ProfileMode | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const { data: profile, isLoading } = useGetProfile();
  const upsert = useUpsertProfile();

  const resolvedMode: ProfileMode = profileMode ?? (profile ? "view" : "create");
  const isForm = resolvedMode === "create" || resolvedMode === "edit";

  const handleSubmit = (data: ProfileFormData) => {
    upsert.mutate(data, {
      onSuccess: () => {
        toast.success(resolvedMode === "edit" ? "Profile updated successfully." : "Profile created successfully.");
        setProfileMode("view");
      },
      onError: (err: unknown) => {
        const { message } = toMutationError(err);
        toast.error(message ?? "Something went wrong.");
      },
    });
  };

  const openEdit = () => {
    setCurrentStep(0);
    setVisited(new Set([0]));
    setProfileMode("edit");
  };

  const handleDelete = () => {
    setProfileMode("create");
    setCurrentStep(0);
    setVisited(new Set([0]));
    toast.info("Profile cleared. Fill the form to create a new one.");
  };

  const pageSubtitle = (() => {
    if (mainTab !== "profile") return undefined;
    if (isForm)
      return resolvedMode === "edit"
        ? "Update your personal and medical information"
        : "Fill in the details below to get started";
    return t("pages.patient.profile_sub");
  })();

  return (
    <DashboardLayout role="patient">
      <PageHeader title={t("pages.patient.profile_title")} subtitle={pageSubtitle} />
      <div className="px-3 py-4 sm:px-6 sm:py-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col min-h-[540px]">
          <TabBar active={mainTab} onChange={setMainTab} hasProfile={!!profile} />
          <div className="flex flex-1 flex-col sm:flex-row min-h-0">
            {mainTab === "profile" && (
              <>
                <ProfileSidebar
                  currentStep={currentStep}
                  visited={visited}
                  onSelect={(i) => {
                    setVisited(new Set([...visited, i]));
                    setCurrentStep(i);
                  }}
                  mode={resolvedMode}
                  profile={profile ?? null}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
                {isLoading ? (
                  <ProfileSkeleton />
                ) : isForm ? (
                  <ProfileForm
                    mode={resolvedMode === "edit" ? "edit" : "create"}
                    defaultValues={resolvedMode === "edit" && profile ? profileToForm(profile) : undefined}
                    onSubmit={handleSubmit}
                    onCancel={() => { if (profile) setProfileMode("view"); }}
                    currentStep={currentStep}
                    onStepChange={setCurrentStep}
                    visited={visited}
                    onVisitedChange={setVisited}
                    isSaving={upsert.isPending}
                  />
                ) : profile ? (
                  <ProfileView profile={profile} />
                ) : null}
              </>
            )}
            {mainTab === "medical" && <MedicalInfoTab />}
            {mainTab === "insurance" && <InsuranceTab profileInsurance={profile?.insurance} />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientProfile;
