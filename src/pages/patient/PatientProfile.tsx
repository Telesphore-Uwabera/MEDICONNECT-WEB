import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import i18n from "@/lib/i18n";
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
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import CountryCodesData from "@/lib/CountryCodes.json";
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
type ProfileStepId = (typeof PROFILE_STEPS)[number]["id"];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_VALUE = "-";
const MIN_BIRTH_YEAR = 1900;
const MAX_PATIENT_AGE = 130;

const parseProfileDate = (value?: string | null): Date | null => {
  const raw = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const currentYear = new Date().getUTCFullYear();

  if (year < MIN_BIRTH_YEAR || year > currentYear) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  if (date.getTime() > Date.now()) return null;
  return date;
};

const toDateInput = (iso?: string | null): string => {
  const date = parseProfileDate(iso);
  if (!date) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (d?: string | null) => {
  const date = parseProfileDate(d);
  if (!date) return EMPTY_VALUE;
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const calcAge = (d?: string | null): number | null => {
  const date = parseProfileDate(d);
  if (!date) return null;

  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const hasBirthdayPassed =
    now.getUTCMonth() > date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() >= date.getUTCDate());
  if (!hasBirthdayPassed) age -= 1;

  if (age < 0 || age > MAX_PATIENT_AGE) return null;
  return age;
};

const formatAge = (d?: string | null) => {
  const age = calcAge(d);
  return age == null ? EMPTY_VALUE : `${age} yrs`;
};

const EMERGENCY_DIAL_CODES = (CountryCodesData as { dial_code: string }[])
  .map((c) => c.dial_code.replace(/\s+/g, ""))
  .sort((a, b) => b.length - a.length);

/** Emergency contact phone is stored as one free-text string (no separate
 *  country_code column) - split off a recognized dial code so it can be
 *  edited with the same CountryCodeSelect used elsewhere. */
const splitEmergencyPhone = (raw?: string | null): { code: string; digits: string } => {
  const compact = String(raw ?? "").replace(/\s+/g, "");
  if (!compact) return { code: "+250", digits: "" };
  const match = EMERGENCY_DIAL_CODES.find((c) => compact.startsWith(c));
  return match ? { code: match, digits: compact.slice(match.length) } : { code: "+250", digits: compact };
};

const formatGender = (gender?: string | null) =>
  gender ? i18n.t(`profile.gender.${gender}`, gender.charAt(0).toUpperCase() + gender.slice(1)) : EMPTY_VALUE;

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

const isProfileFieldFilled = (field: keyof ProfileFormData, value: unknown) => {
  if (field === "date_of_birth") return Boolean(parseProfileDate(String(value ?? "")));
  return String(value ?? "").trim().length > 0;
};

const getProfileCompletion = (profile: TPatientProfile) => {
  const form = profileToForm(profile);
  const sections = PROFILE_STEPS.reduce(
    (acc, step) => {
      const filled = step.fields.filter((field) => isProfileFieldFilled(field, form[field])).length;
      acc[step.id] = {
        filled,
        total: step.fields.length,
        complete: filled === step.fields.length,
        missing: step.fields.filter((field) => !isProfileFieldFilled(field, form[field])),
      };
      return acc;
    },
    {} as Record<
      ProfileStepId,
      {
        filled: number;
        total: number;
        complete: boolean;
        missing: (keyof ProfileFormData)[];
      }
    >
  );

  const total = PROFILE_STEPS.reduce((sum, step) => sum + step.fields.length, 0);
  const filled = PROFILE_STEPS.reduce((sum, step) => sum + sections[step.id].filled, 0);
  const completedSections = PROFILE_STEPS.filter((step) => sections[step.id].complete).length;
  const missingSectionIds = PROFILE_STEPS.filter((step) => !sections[step.id].complete).map((step) => step.id);

  return {
    sections,
    total,
    filled,
    completedSections,
    missingSectionIds,
    percent: total ? Math.round((filled / total) * 100) : 0,
  };
};

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
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-[6px] flex items-center justify-center bg-primary/10">
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
  const { t } = useTranslation();
  if (!items?.length)
    return <span className="text-[11px] text-muted-foreground/50 italic">{t("profile.none_recorded")}</span>;
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
  const { t } = useTranslation();
  const tabs: { id: MainTab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: t("profile.tab.profile"), icon: User },
    { id: "medical", label: t("profile.tab.medical"), icon: Stethoscope },
    { id: "insurance", label: t("profile.tab.insurance"), icon: Shield },
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
  const { t } = useTranslation();
  const isForm = mode === "create" || mode === "edit";
  const completion = profile ? getProfileCompletion(profile) : null;
  const visitedCount = isForm ? visited.size : completion?.completedSections ?? 0;
  const pct = isForm
    ? Math.round((visitedCount / PROFILE_STEPS.length) * 100)
    : completion?.percent ?? 0;

  return (
    <div className="w-full sm:w-52 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        {isForm ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("profile.setup")}
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
              {t("profile.sections_visited", { count: visitedCount, total: PROFILE_STEPS.length })}
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
                  label: t("common.age", "Age"),
                  value: formatAge(profile.date_of_birth),
                },
                { label: t("profile.field.blood_type"), value: profile.blood_type ?? EMPTY_VALUE },
                { label: t("profile.field.city"), value: profile.city ?? EMPTY_VALUE },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  <span className="text-[10px] font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
            {completion && (
              <div className="space-y-1.5 rounded-[6px] border border-border bg-background/60 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("profile.profile_filled")}
                  </span>
                  <span className="text-[10px] font-bold text-primary">{completion.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      completion.percent === 100 ? "bg-primary" : "bg-yellow-500"
                    )}
                    style={{ width: `${completion.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t("profile.fields_filled", { filled: completion.filled, total: completion.total })}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden overflow-y-hidden sm:overflow-y-auto">
        {PROFILE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const sectionStatus = completion?.sections[step.id];
          const isActive = i === currentStep && isForm;
          const isDone = isForm
            ? visited.has(i) && i !== currentStep
            : Boolean(sectionStatus?.complete);
          const isMissing = !isForm && Boolean(profile) && !sectionStatus?.complete;

          return (
            <button
              key={step.id}
              onClick={() => (isForm ? onSelect(i) : undefined)}
              disabled={!isForm}
              className={cn(
                "flex shrink-0 sm:shrink sm:w-full items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-[6px] text-left transition-all duration-150",
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
                      : isMissing
                        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600"
                      : "bg-muted border-border text-muted-foreground"
                )}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : isMissing ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="flex items-center justify-between gap-1">
                  <span className={cn("text-xs font-medium leading-tight truncate", isActive ? "text-primary" : "")}>
                    {t(`profile.step.${step.id}`)}
                  </span>
                  {isActive && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary shrink-0">
                      {t("profile.editing")}
                    </span>
                  )}
                  {isDone && isForm && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">
                      {t("profile.done")}
                    </span>
                  )}
                  {isDone && !isForm && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">
                      {t("profile.filled")}
                    </span>
                  )}
                  {isMissing && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-yellow-600 shrink-0">
                      {t("profile.missing")}
                    </span>
                  )}
                </div>
                <p className="hidden sm:block text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                  {t(`profile.step.${step.id}_desc`)}
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
            {t("profile.edit_profile")}
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="flex-1 sm:w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 h-8"
          >
            <Trash2 size={12} />
            {t("profile.delete")}
          </Button>
        </div>
      ) : isForm ? (
        <div className="hidden sm:block px-3.5 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {mode === "edit"
              ? t("profile.jump_edit_hint")
              : t("profile.jump_create_hint")}
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
  const [emergencyCountryCode, setEmergencyCountryCode] = useState(
    () => splitEmergencyPhone(defaultValues?.emergency_contact_phone).code,
  );
  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      ...defaultValues,
      emergency_contact_phone: splitEmergencyPhone(defaultValues?.emergency_contact_phone).digits,
    },
    shouldUnregister: false,
  });

  const step = PROFILE_STEPS[currentStep];
  const isLast = currentStep === PROFILE_STEPS.length - 1;
  const isEdit = mode === "edit";

  const goTo = (i: number) => {
    onVisitedChange(new Set([...visited, i]));
    onStepChange(i);
  };

  const onFormSubmit = (data: ProfileFormData) => {
    onSubmit({
      ...data,
      emergency_contact_phone: `${emergencyCountryCode} ${data.emergency_contact_phone}`.trim(),
    });
  };

  const goNext = async () => {
    const valid = await trigger(step.fields);
    if (!valid) return;
    if (isLast) {
      handleSubmit(onFormSubmit)();
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
          {t(`profile.section.${step.id}`)}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {t("profile.step_of", { current: currentStep + 1, total: PROFILE_STEPS.length })}
        </span>
      </div>

      <div key={currentStep} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {step.id === "personal" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t("profile.field.dob", "Date of birth")} error={errors.date_of_birth?.message}>
              <Input
                type="date"
                {...register("date_of_birth", {
                  required: t("profile.required"),
                  validate: (value) => Boolean(parseProfileDate(value)) || t("profile.invalid_dob"),
                })}
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label={t("profile.field.gender", "Gender")} error={errors.gender?.message}>
              <Select value={watch("gender") ?? ""} onValueChange={(v) => setValue("gender", v, { shouldDirty: true, shouldValidate: true })}>
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue placeholder={t("profile.select_gender")} />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {t(`profile.gender.${g}`)}
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
                  required: t("profile.required"),
                  minLength: { value: 16, message: t("profile.national_id_length") },
                  maxLength: { value: 16, message: t("profile.national_id_length") },
                  pattern: { value: /^\d+$/, message: t("profile.digits_only") },
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
              <Select value={watch("blood_type") ?? ""} onValueChange={(v) => setValue("blood_type", v, { shouldDirty: true, shouldValidate: true })}>
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue placeholder={t("profile.select_blood_type")} />
                </SelectTrigger>
                <SelectContent>
                  {BLOODS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <p className="col-span-1 sm:col-span-2 text-xs text-muted-foreground mt-1">
              {t("profile.only_blood_type_note")}
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
                {...register("address", { required: t("profile.required") })}
                placeholder="KG 123 St"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label={t("profile.field.city", "City")} error={errors.city?.message}>
              <Input
                {...register("city", { required: t("profile.required") })}
                placeholder="Kigali"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label={t("profile.field.province", "Province")} error={errors.province?.message}>
              <Input
                {...register("province", { required: t("profile.required") })}
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
                {...register("country", { required: t("profile.required") })}
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
                {...register("emergency_contact_name", { required: t("profile.required") })}
                placeholder="Jane Doe"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField
              label={t("profile.field.contact_relation", "Relationship")}
              error={errors.emergency_contact_relation?.message}
            >
              <Select
                value={watch("emergency_contact_relation") ?? ""}
                onValueChange={(v) => setValue("emergency_contact_relation", v, { shouldDirty: true, shouldValidate: true })}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue placeholder={t("profile.field.contact_relation")} />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((r) => (
                    <SelectItem key={r} value={r}>{t(`profile.relation.${r.toLowerCase()}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label={t("profile.field.contact_phone", "Phone number")}
              error={errors.emergency_contact_phone?.message}
              className="col-span-1 sm:col-span-2"
            >
              <div className="flex gap-2">
                <div className="w-28 shrink-0">
                  <CountryCodeSelect
                    value={emergencyCountryCode}
                    onChange={setEmergencyCountryCode}
                    className="h-9 text-xs"
                  />
                </div>
                <Input
                  type="tel"
                  {...register("emergency_contact_phone", { required: t("profile.required") })}
                  placeholder="0789999999"
                  className="border-border focus-visible:ring-primary text-xs h-9 flex-1"
                />
              </div>
            </FormField>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border">
        <Button variant="outline" onClick={goBack} className="border-border text-xs">
          {currentStep === 0 ? t("profile.cancel") : t("profile.back")}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {t("profile.step_of", { current: currentStep + 1, total: PROFILE_STEPS.length })}
        </span>
        <Button
          onClick={goNext}
          disabled={isSaving}
          className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 gap-1.5"
        >
          {isSaving && isLast && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isLast ? (isEdit ? t("profile.save_changes") : t("profile.create_profile")) : t("profile.next")}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile View
// ─────────────────────────────────────────────────────────────────────────────
function ProfileView({ profile, onEdit }: { profile: TPatientProfile; onEdit: () => void }) {
  const { t, i18n } = useTranslation();
  const completion = getProfileCompletion(profile);
  const isComplete = completion.percent === 100;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
      <div className="rounded-[6px] p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden bg-card border border-border">
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
              {t("profile.active")}
            </Badge>
            <Badge className="text-[11px] font-medium rounded-full px-3 bg-muted text-muted-foreground border border-border">
              {formatGender(profile.gender)} · {formatAge(profile.date_of_birth)}
            </Badge>
            {profile.blood_type && (
              <Badge className="text-[11px] font-medium rounded-full px-3 bg-destructive/15 text-destructive border border-destructive/25">
                {t("profile.blood_badge", { type: profile.blood_type })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-[6px] border p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          isComplete
            ? "border-primary/25 bg-primary/5"
            : "border-yellow-500/30 bg-yellow-500/10"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px]",
              isComplete ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-600"
            )}
          >
            {isComplete ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {isComplete ? t("profile.profile_complete") : t("profile.profile_incomplete")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("profile.fields_are_filled", { filled: completion.filled, total: completion.total })}
              {!isComplete && completion.missingSectionIds.length > 0
                ? t("profile.missing_sections", {
                  sections: completion.missingSectionIds.map((id) => t(`profile.step.${id}`)).join(", "),
                })
                : "."}
            </p>
          </div>
        </div>
        {!isComplete && (
          <Button onClick={onEdit} size="sm" className="h-8 text-xs text-primary-foreground">
            {t("profile.complete_profile")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard icon={User} title={t("profile.section.personal", "Personal Information")}>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("profile.field.dob", "Date of birth")}
              value={formatDate(profile.date_of_birth)}
            />
            <Field
              label={t("profile.field.gender", "Gender")}
              value={formatGender(profile.gender)}
            />
            <div className="col-span-2">
              <Field label={t("profile.field.national_id", "National ID")} value={profile.national_id ?? EMPTY_VALUE} mono />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={HeartPulse} title={t("profile.section.medical", "Medical Information")}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-semibold text-destructive-foreground bg-destructive shrink-0">
              {profile.blood_type ?? "?"}
            </div>
            <div>
              <p className="text-[11px] font-medium text-foreground">{t("profile.blood_type_label", { type: profile.blood_type ?? "—" })}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile.insurance
                  ? t("profile.insurance_linked", { name: profile.insurance.name, coverage: parseFloat(profile.insurance.coverage_percentage) })
                  : t("profile.no_insurance_linked")}
              </p>
              {profile.medical_info && (
                <p className="text-[10px] text-primary mt-1">{t("profile.medical_info_on_file")}</p>
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
            <div className="flex items-center gap-3 rounded-[6px] p-2.5 border border-destructive/20 bg-destructive/5 flex-wrap">
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
                <div className="text-[11px] font-medium rounded-[6px] px-3 py-1.5 bg-primary/10 text-primary shrink-0">
                  {profile.emergency_contact_phone}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("profile.no_emergency_contact")}
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
  const { t } = useTranslation();
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
        toast.success(t("profile.medical_info_saved"));
        setIsEditing(false);
      },
      onError: (err: unknown) => {
        const { message } = toMutationError(err);
        toast.error(message ?? t("profile.medical_info_save_failed"));
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-5 space-y-4 animate-pulse">
        <div className="h-24 rounded-[6px] bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-[6px] bg-muted" />)}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("profile.edit_medical_info")}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 text-xs text-muted-foreground">
            {t("profile.cancel")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {(
              [
                { key: "allergies", label: t("profile.allergies"), placeholder: t("profile.allergies_placeholder") },
                { key: "chronic_conditions", label: t("profile.chronic_conditions"), placeholder: t("profile.chronic_conditions_placeholder") },
                { key: "current_medications", label: t("profile.current_medications"), placeholder: t("profile.current_medications_placeholder") },
                { key: "previous_surgeries", label: t("profile.previous_surgeries"), placeholder: t("profile.previous_surgeries_placeholder") },
                { key: "family_history", label: t("profile.family_history"), placeholder: t("profile.family_history_placeholder") },
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
                <Label className="text-[10px] text-muted-foreground mb-1.5 block">{t("profile.smoking_status")}</Label>
                <Select value={form.smoking_status ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, smoking_status: v }))}>
                  <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                    <SelectValue placeholder={t("profile.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SMOKING.map((s) => (
                      <SelectItem key={s} value={s}>{t(`profile.smoking.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1.5 block">{t("profile.alcohol_use")}</Label>
                <Select value={form.alcohol_use ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, alcohol_use: v }))}>
                  <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                    <SelectValue placeholder={t("profile.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ALCOHOL.map((a) => (
                      <SelectItem key={a} value={a}>{t(`profile.alcohol.${a}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <Label className="text-[10px] text-muted-foreground mb-1.5 block">{t("profile.additional_notes")}</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("profile.notes_placeholder")}
                className="border-border focus-visible:ring-primary text-xs resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 sm:px-5 py-3 bg-muted/50 border-t border-border">
          <Button variant="outline" onClick={() => setIsEditing(false)} className="border-border text-xs">
            {t("profile.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMedical.isPending}
            className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 gap-1.5"
          >
            {saveMedical.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t("profile.save_medical_info")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("profile.medical_information")}</h3>
          {patient && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {patient.user?.name} · {formatAge(patient.date_of_birth)}
            </p>
          )}
        </div>
        <Button onClick={startEdit} variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border">
          <Pencil size={12} />
          {medical ? t("profile.edit") : t("profile.add_info")}
        </Button>
      </div>

      {!medical ? (
        <div className="rounded-[6px] border border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Stethoscope size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{t("profile.no_medical_info")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("profile.no_medical_info_desc")}</p>
          </div>
          <Button onClick={startEdit} size="sm" className="text-xs gap-1.5 mt-1">
            <Plus size={12} />
            {t("profile.add_medical_info")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SectionCard icon={AlertTriangle} title={t("profile.allergies")}>
            <TagList items={medical.allergies ?? []} color="red" />
          </SectionCard>
          <SectionCard icon={Activity} title={t("profile.chronic_conditions")}>
            <TagList items={medical.chronic_conditions ?? []} color="yellow" />
          </SectionCard>
          <SectionCard icon={Pill} title={t("profile.current_medications")}>
            <TagList items={medical.current_medications ?? []} color="blue" />
          </SectionCard>
          <SectionCard icon={FlaskConical} title={t("profile.previous_surgeries")}>
            <TagList items={medical.previous_surgeries ?? []} color="default" />
          </SectionCard>
          <SectionCard icon={HeartPulse} title={t("profile.family_history")}>
            <TagList items={medical.family_history ?? []} color="green" />
          </SectionCard>
          <SectionCard icon={User} title={t("profile.lifestyle")}>
            <div className="space-y-2.5">
              {[
                { label: t("profile.smoking_label"), ns: "smoking", value: medical.smoking_status },
                { label: t("profile.alcohol_label"), ns: "alcohol", value: medical.alcohol_use },
              ].map(({ label, ns, value }) => (
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
                    {value ? t(`profile.${ns}.${value}`) : "—"}
                  </Badge>
                </div>
              ))}
              {medical.notes && (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    {t("profile.notes")}
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
  const { t } = useTranslation();
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
      toast.error(t("profile.select_provider_error"));
      return;
    }
    if (!insuranceNumber.trim()) {
      toast.error(t("profile.insurance_number_required"));
      return;
    }
    updateInsurance.mutate(
      {
        insurance_id: parseInt(selectedId, 10),
        insurance_number: insuranceNumber.trim(),
      },
      {
        onSuccess: () => {
          toast.success(t("profile.insurance_updated"));
          setIsEditing(false);
        },
        onError: (err: unknown) => {
          const { message } = toMutationError(err);
          toast.error(message ?? t("profile.insurance_update_failed"));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-5 space-y-4 animate-pulse">
        <div className="h-32 rounded-[6px] bg-muted" />
        <div className="h-24 rounded-[6px] bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("profile.my_insurance")}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t("profile.insurance_sub")}</p>
        </div>
        {active && !isEditing && (
          <Button onClick={startEdit} variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border">
            <RefreshCw size={12} />
            {t("profile.update")}
          </Button>
        )}
      </div>

      {!active && !isEditing ? (
        <div className="rounded-[6px] border border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Shield size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{t("profile.no_insurance_linked")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("profile.link_insurance_desc")}</p>
          </div>
          <Button onClick={startEdit} size="sm" className="text-xs gap-1.5 mt-1">
            <Plus size={12} />
            {t("profile.link_insurance")}
          </Button>
        </div>
      ) : isEditing ? (
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="w-8 h-8 rounded-[6px] flex items-center justify-center bg-primary/10">
              <Shield size={14} className="text-primary" />
            </div>
            <h3 className="text-xs font-semibold text-foreground">
              {active ? t("profile.update_insurance") : t("profile.link_insurance")}
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Insurance provider select */}
            <FormField label={t("profile.insurance_provider")}>
              <Select
                value={selectedId}
                onValueChange={setSelectedId}
                disabled={isLoadingPublic}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  {isLoadingPublic ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 size={12} className="animate-spin" />
                      {t("profile.loading_providers")}
                    </span>
                  ) : (
                    <SelectValue placeholder={t("profile.select_provider")} />
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
                          · {parseFloat(ins.coverage_percentage)}% {t("profile.coverage")}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Preview card for the selected provider */}
            {selectedPublicInsurance && (
              <div className="flex items-center gap-3 p-3 rounded-[6px] bg-muted/50 border border-border">
                {selectedPublicInsurance.logo ? (
                  <img
                    src={selectedPublicInsurance.logo}
                    alt={selectedPublicInsurance.name}
                    className="h-8 w-auto object-contain shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
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
                  {parseFloat(selectedPublicInsurance.coverage_percentage)}% {t("profile.coverage")}
                </Badge>
              </div>
            )}

            {/* Insurance number input */}
            <FormField label={t("profile.insurance_number")}>
              <Input
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value)}
                placeholder={t("profile.insurance_number_placeholder")}
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="border-border text-xs"
              >
                {t("profile.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateInsurance.isPending || !selectedId}
                className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 gap-1.5"
              >
                {updateInsurance.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t("profile.save")}
              </Button>
            </div>
          </div>
        </div>
      ) : active ? (
        <div className="space-y-4">
          <div className="rounded-[6px] border border-border bg-card p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-primary/5 pointer-events-none" />
            <div className="flex items-start gap-4">
              {active.logo ? (
                <img src={active.logo} alt={active.name} className="h-12 w-auto object-contain" />
              ) : (
                <div className="w-12 h-12 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield size={22} className="text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-foreground">{active.name}</h4>
                  <Badge className="text-[10px] font-medium rounded-full px-2.5 bg-primary/15 text-primary border border-primary/30">
                    {t("profile.active")}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{active.code}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1">{t("profile.coverage_label")}</p>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${parseFloat(active.coverage_percentage)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-semibold text-primary mt-1">
                      {parseFloat(active.coverage_percentage)}% {t("profile.coverage")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SectionCard icon={CreditCard} title={t("profile.coverage_details")}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("profile.provider")} value={active.name} />
              <Field label={t("profile.code")} value={active.code} />
              <Field label={t("profile.coverage_label")} value={`${parseFloat(active.coverage_percentage)}%`} />
              {active.insurance_number && (
                <Field label={t("profile.insurance_number")} value={active.insurance_number} mono />
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
      <div className="h-24 rounded-[6px] bg-muted" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-[6px] bg-muted" />)}
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
        toast.success(resolvedMode === "edit" ? t("profile.profile_updated") : t("profile.profile_created"));
        setProfileMode("view");
      },
      onError: (err: unknown) => {
        const { message } = toMutationError(err);
        toast.error(message ?? t("profile.profile_error"));
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
    toast.info(t("profile.profile_cleared"));
  };

  const pageSubtitle = (() => {
    if (mainTab !== "profile") return undefined;
    if (isForm)
      return resolvedMode === "edit"
        ? t("profile.update_info")
        : t("profile.fill_details");
    return t("pages.patient.profile_sub", "Manage your profile, medical details and insurance");
  })();

  return (
    <DashboardLayout role="patient">
      <PageHeader title={t("pages.patient.profile_title")} subtitle={pageSubtitle} />
      <div className="px-3 py-4 sm:px-6 sm:py-8">
        <div className="rounded-[6px] border border-border bg-card overflow-hidden flex flex-col min-h-[540px]">
          <TabBar active={mainTab} onChange={setMainTab} hasProfile={!!profile} />
          <div className="flex flex-1 flex-col min-h-0">
            <div className={cn("flex flex-1 flex-col sm:flex-row min-h-0", mainTab !== "profile" && "hidden")}>
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
                  <ProfileView profile={profile} onEdit={openEdit} />
                ) : null}
            </div>
            {mainTab === "medical" && <MedicalInfoTab />}
            {mainTab === "insurance" && <InsuranceTab profileInsurance={profile?.insurance} />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientProfile;

