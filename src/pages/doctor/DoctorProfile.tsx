import React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  User,
  GraduationCap,
  Briefcase,
  Award,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Check,
  Upload,
  X,
  Stethoscope,
  Link2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface PersonalInfo {
  specialization: string;
  doctor_degree: string;
  medical_license: string;
  designations: string;
  bio_en: string;
  bio_fr: string;
  bio_kiny: string;
  consultation_fee: number;
  currency: string;
  consultation_type: string;
  preferred_language: string;
}

interface SpecializationsInfo {
  primary: string;
  secondary: string[];
  custom_tags: string[];
  years_of_experience: number;
  subspecialties: string;
}

interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  country: string;
  start_year: number;
  end_year: number;
}

interface ExperienceEntry {
  id: string;
  job_title: string;
  workplace: string;
  country: string;
  start_date: string;
  is_current: boolean;
}

interface QualificationEntry {
  id: string;
  title: string;
  issuing_body: string;
  issued_at: string;
  expires_at: string;
}

interface DocumentsInfo {
  profile_image?: File | null;
  degree_document?: File | null;
  license_document?: File | null;
}

interface SocialLinksInfo {
  linkedin: string;
  twitter: string;
  facebook: string;
  instagram: string;
  website: string;
  youtube: string;
  researchgate: string;
  orcid: string;
}

interface DoctorProfileData {
  personal: PersonalInfo;
  specializations: SpecializationsInfo;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  qualifications: QualificationEntry[];
  documents: DocumentsInfo;
  linksSection: SocialLinksInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const CURRENCIES = ["RWF", "USD", "EUR"];
const CONSULTATION_TYPES = [
  { value: "online", label: "Online only" },
  { value: "in_person", label: "In-person only" },
  { value: "both", label: "Both" },
];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "kiny", label: "Kinyarwanda" },
];

const COMMON_SPECIALIZATIONS = [
  "General Practice",
  "Internal Medicine",
  "Pediatrics",
  "Surgery",
  "Obstetrics & Gynecology",
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Psychiatry",
  "Radiology",
  "Anesthesiology",
  "Emergency Medicine",
  "Oncology",
  "Ophthalmology",
  "ENT",
  "Urology",
  "Nephrology",
  "Endocrinology",
  "Infectious Disease",
  "Rheumatology",
  "Pulmonology",
  "Gastroenterology",
  "Hematology",
];

const SOCIAL_PLATFORMS: Array<{
  key: keyof SocialLinksInfo;
  label: string;
  placeholder: string;
}> = [
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/your-profile",
  },
  {
    key: "twitter",
    label: "X / Twitter",
    placeholder: "https://x.com/your-handle",
  },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/your-page",
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/your-handle",
  },
  {
    key: "website",
    label: "Personal website",
    placeholder: "https://yourwebsite.com",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@your-channel",
  },
  {
    key: "researchgate",
    label: "ResearchGate",
    placeholder: "https://researchgate.net/profile/your-name",
  },
  {
    key: "orcid",
    label: "ORCID",
    placeholder: "https://orcid.org/0000-0000-0000-0000",
  },
];

const STEPS = [
  {
    id: "personal" as const,
    label: "Personal",
    icon: User,
    sectionTitle: "Professional information",
    description: "Specialization, degree, license, bio & fees",
  },
  {
    id: "specializations" as const,
    label: "Specializations",
    icon: Stethoscope,
    sectionTitle: "Specializations",
    description: "Primary & secondary medical specializations",
  },
  {
    id: "education" as const,
    label: "Education",
    icon: GraduationCap,
    sectionTitle: "Education history",
    description: "Degrees and academic background",
  },
  {
    id: "experience" as const,
    label: "Experience",
    icon: Briefcase,
    sectionTitle: "Work experience",
    description: "Past and current positions",
  },
  {
    id: "qualifications" as const,
    label: "Qualifications",
    icon: Award,
    sectionTitle: "Certifications & qualifications",
    description: "Certifications and licenses",
  },
  {
    id: "documents" as const,
    label: "Documents",
    icon: FileText,
    sectionTitle: "Upload documents",
    description: "Profile photo and official docs",
  },
  {
    id: "linksSection" as const,
    label: "Social Links",
    icon: Link2,
    sectionTitle: "Social & online presence",
    description: "LinkedIn, website, ResearchGate & more",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const formatFee = (fee: number, currency: string) =>
  `${currency} ${fee.toLocaleString()}`;
const formatDateDisplay = (d: string) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
    : "—";

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
// FormField
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
// UnifiedSidebar
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
  profileData: DoctorProfileData | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isForm = mode === "create" || mode === "edit";
  const visitedCount = visited.size;
  const pct = Math.round((visitedCount / STEPS.length) * 100);

  return (
    <div className="w-56 shrink-0 flex flex-col border-r border-border bg-card/50">
      {/* Header */}
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
        ) : profileData ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                {profileData.personal.specialization.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {profileData.personal.specialization}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                  {profileData.personal.medical_license}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: "Degree", value: profileData.personal.doctor_degree },
                {
                  label: "Fee",
                  value: formatFee(
                    profileData.personal.consultation_fee,
                    profileData.personal.currency,
                  ),
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

      {/* Step nav */}
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

      {/* Footer actions (view mode) */}
      {!isForm && profileData && (
        <div className="p-3 border-t border-border space-y-2">
          <Button
            onClick={onEdit}
            className="w-full text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-8"
          >
            <Pencil size={12} /> Edit profile
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 h-8"
          >
            <Trash2 size={12} /> Delete profile
          </Button>
        </div>
      )}

      {/* Footer hint (form mode) */}
      {isForm && (
        <div className="px-3.5 py-3 border-t border-border">
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
// EntryCard
// ─────────────────────────────────────────────────────────────────────────────
function EntryCard({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="relative rounded-md border border-border bg-muted/50 p-4 pr-10">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SpecializationsStep
// ─────────────────────────────────────────────────────────────────────────────
function SpecializationsStep({
  data,
  onChange,
}: {
  data: SpecializationsInfo;
  onChange: (v: SpecializationsInfo) => void;
}) {
  const [tagInput, setTagInput] = useState("");

  const toggleSecondary = (spec: string) => {
    const current = data.secondary ?? [];
    if (current.includes(spec)) {
      onChange({ ...data, secondary: current.filter((s) => s !== spec) });
    } else {
      onChange({ ...data, secondary: [...current, spec] });
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || data.custom_tags?.includes(trimmed)) return;
    onChange({ ...data, custom_tags: [...(data.custom_tags ?? []), trimmed] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    onChange({
      ...data,
      custom_tags: (data.custom_tags ?? []).filter((t) => t !== tag),
    });
  };

  return (
    <div className="space-y-5">
      {/* Primary specialization */}
      <FormField label="Primary specialization *">
        <Select
          value={data.primary ?? ""}
          onValueChange={(v) => onChange({ ...data, primary: v })}
        >
          <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
            <SelectValue placeholder="Select primary specialization" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {COMMON_SPECIALIZATIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {/* Years of experience */}
      <FormField label="Years of experience">
        <Input
          type="number"
          value={data.years_of_experience ?? ""}
          onChange={(e) =>
            onChange({ ...data, years_of_experience: +e.target.value })
          }
          placeholder="10"
          min={0}
          max={60}
          className="border-border focus-visible:ring-primary text-xs h-9 w-40"
        />
      </FormField>

      {/* Secondary specializations */}
      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground">
          Secondary specializations
        </Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_SPECIALIZATIONS.filter((s) => s !== data.primary).map(
            (spec) => {
              const selected = (data.secondary ?? []).includes(spec);
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSecondary(spec)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150 font-medium",
                    selected
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {selected && <Check className="inline h-2.5 w-2.5 mr-1" />}
                  {spec}
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Subspecialties (free text) */}
      <FormField label="Subspecialties / areas of focus">
        <Input
          value={data.subspecialties ?? ""}
          onChange={(e) =>
            onChange({ ...data, subspecialties: e.target.value })
          }
          placeholder="e.g. Pediatric cardiology, minimally invasive surgery"
          className="border-border focus-visible:ring-primary text-xs h-9"
        />
      </FormField>

      {/* Custom tags */}
      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground">Custom tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Type a tag and press Enter"
            className="border-border focus-visible:ring-primary text-xs h-9 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addTag}
            className="text-xs h-9 px-3 border-border"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {(data.custom_tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(data.custom_tags ?? []).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EducationStep
// ─────────────────────────────────────────────────────────────────────────────
function EducationStep({
  entries,
  onChange,
}: {
  entries: EducationEntry[];
  onChange: (v: EducationEntry[]) => void;
}) {
  const empty = (): EducationEntry => ({
    id: uid(),
    degree: "",
    institution: "",
    country: "",
    start_year: new Date().getFullYear() - 6,
    end_year: new Date().getFullYear(),
  });
  const update = (id: string, patch: Partial<EducationEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          onRemove={() => onChange(entries.filter((e) => e.id !== entry.id))}
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Degree">
              <Input
                value={entry.degree}
                onChange={(e) => update(entry.id, { degree: e.target.value })}
                placeholder="MBBS"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label="Institution">
              <Input
                value={entry.institution}
                onChange={(e) =>
                  update(entry.id, { institution: e.target.value })
                }
                placeholder="University of Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label="Country">
              <Input
                value={entry.country}
                onChange={(e) => update(entry.id, { country: e.target.value })}
                placeholder="Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Start year">
                <Input
                  type="number"
                  value={entry.start_year}
                  onChange={(e) =>
                    update(entry.id, { start_year: +e.target.value })
                  }
                  className="border-border focus-visible:ring-primary text-xs h-9"
                />
              </FormField>
              <FormField label="End year">
                <Input
                  type="number"
                  value={entry.end_year}
                  onChange={(e) =>
                    update(entry.id, { end_year: +e.target.value })
                  }
                  className="border-border focus-visible:ring-primary text-xs h-9"
                />
              </FormField>
            </div>
          </div>
        </EntryCard>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...entries, empty()])}
        className="w-full border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add education
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExperienceStep
// ─────────────────────────────────────────────────────────────────────────────
function ExperienceStep({
  entries,
  onChange,
}: {
  entries: ExperienceEntry[];
  onChange: (v: ExperienceEntry[]) => void;
}) {
  const empty = (): ExperienceEntry => ({
    id: uid(),
    job_title: "",
    workplace: "",
    country: "",
    start_date: "",
    is_current: false,
  });
  const update = (id: string, patch: Partial<ExperienceEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          onRemove={() => onChange(entries.filter((e) => e.id !== entry.id))}
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Job title">
              <Input
                value={entry.job_title}
                onChange={(e) =>
                  update(entry.id, { job_title: e.target.value })
                }
                placeholder="General Practitioner"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label="Workplace">
              <Input
                value={entry.workplace}
                onChange={(e) =>
                  update(entry.id, { workplace: e.target.value })
                }
                placeholder="King Faisal Hospital"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label="Country">
              <Input
                value={entry.country}
                onChange={(e) => update(entry.id, { country: e.target.value })}
                placeholder="Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label="Start date">
              <Input
                type="date"
                value={entry.start_date}
                onChange={(e) =>
                  update(entry.id, { start_date: e.target.value })
                }
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id={`current-${entry.id}`}
                checked={entry.is_current}
                onChange={(e) =>
                  update(entry.id, { is_current: e.target.checked })
                }
                className="accent-primary"
              />
              <label
                htmlFor={`current-${entry.id}`}
                className="text-xs text-muted-foreground"
              >
                Currently working here
              </label>
            </div>
          </div>
        </EntryCard>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...entries, empty()])}
        className="w-full border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add experience
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QualificationsStep
// ─────────────────────────────────────────────────────────────────────────────
function QualificationsStep({
  entries,
  onChange,
}: {
  entries: QualificationEntry[];
  onChange: (v: QualificationEntry[]) => void;
}) {
  const empty = (): QualificationEntry => ({
    id: uid(),
    title: "",
    issuing_body: "",
    issued_at: "",
    expires_at: "",
  });
  const update = (id: string, patch: Partial<QualificationEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          onRemove={() => onChange(entries.filter((e) => e.id !== entry.id))}
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Certification title" className="col-span-2">
              <Input
                value={entry.title}
                onChange={(e) => update(entry.id, { title: e.target.value })}
                placeholder="Advanced Cardiac Life Support"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label="Issuing body" className="col-span-2">
              <Input
                value={entry.issuing_body}
                onChange={(e) =>
                  update(entry.id, { issuing_body: e.target.value })
                }
                placeholder="American Heart Association"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label="Issued date">
              <Input
                type="date"
                value={entry.issued_at}
                onChange={(e) =>
                  update(entry.id, { issued_at: e.target.value })
                }
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label="Expiry date">
              <Input
                type="date"
                value={entry.expires_at}
                onChange={(e) =>
                  update(entry.id, { expires_at: e.target.value })
                }
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
          </div>
        </EntryCard>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...entries, empty()])}
        className="w-full border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add qualification
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SocialLinksStep
// ─────────────────────────────────────────────────────────────────────────────
function SocialLinksStep({
  data,
  onChange,
}: {
  data: SocialLinksInfo;
  onChange: (v: SocialLinksInfo) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
        Add your professional and social media profiles. All fields are
        optional.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
          <FormField key={key} label={label}>
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                value={data[key]}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
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
// FileUploadBox
// ─────────────────────────────────────────────────────────────────────────────
function FileUploadBox({
  label,
  accept,
  file,
  onChange,
}: {
  label: string;
  accept: string;
  file?: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/50 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer px-4 py-6 text-center">
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <>
          <Check className="h-5 w-5 text-primary" />
          <p className="text-xs font-medium text-primary">{file.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {(file.size / 1024).toFixed(1)} KB · click to replace
          </p>
        </>
      ) : (
        <>
          <Upload className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">
            JPEG, PNG, WebP · max 2 MB
          </p>
        </>
      )}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DoctorProfileForm
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SPECIALIZATIONS: SpecializationsInfo = {
  primary: "",
  secondary: [],
  custom_tags: [],
  years_of_experience: 0,
  subspecialties: "",
};

const DEFAULT_SOCIAL_LINKS: SocialLinksInfo = {
  linkedin: "",
  twitter: "",
  facebook: "",
  instagram: "",
  website: "",
  youtube: "",
  researchgate: "",
  orcid: "",
};

function DoctorProfileForm({
  mode,
  defaultData,
  onSubmit,
  onCancel,
  currentStep,
  onStepChange,
  visited,
  onVisitedChange,
}: {
  mode: "create" | "edit";
  defaultData?: Partial<DoctorProfileData>;
  onSubmit: (data: DoctorProfileData) => void;
  onCancel: () => void;
  currentStep: number;
  onStepChange: (i: number) => void;
  visited: Set<number>;
  onVisitedChange: (v: Set<number>) => void;
}) {
  const [specializations, setSpecializations] = useState<SpecializationsInfo>(
    defaultData?.specializations ?? DEFAULT_SPECIALIZATIONS,
  );
  const [education, setEducation] = useState<EducationEntry[]>(
    defaultData?.education ?? [],
  );
  const [experience, setExperience] = useState<ExperienceEntry[]>(
    defaultData?.experience ?? [],
  );
  const [qualifications, setQualifications] = useState<QualificationEntry[]>(
    defaultData?.qualifications ?? [],
  );
  const [documents, setDocuments] = useState<DocumentsInfo>(
    defaultData?.documents ?? {},
  );
  const [linksSection, setLinksSection] = useState<SocialLinksInfo>(
    defaultData?.linksSection ?? DEFAULT_SOCIAL_LINKS,
  );

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<PersonalInfo>({ defaultValues: defaultData?.personal });

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isEdit = mode === "edit";

  const goTo = (i: number) => {
    const next = new Set([...visited, i]);
    onVisitedChange(next);
    onStepChange(i);
  };

  const goNext = async () => {
    if (step.id === "personal") {
      const valid = await trigger();
      if (!valid) return;
    }
    if (isLast) {
      handleSubmit((personal) => {
        onSubmit({
          personal,
          specializations,
          education,
          experience,
          qualifications,
          documents,
          linksSection,
        });
      })();
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
        {/* Step 1: Personal */}
        {step.id === "personal" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Specialization"
              error={errors.specialization?.message}
            >
              <Input
                {...register("specialization", { required: "Required" })}
                placeholder="General Practitioner"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField
              label="Doctor degree"
              error={errors.doctor_degree?.message}
            >
              <Input
                {...register("doctor_degree", { required: "Required" })}
                placeholder="MBBS"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField
              label="Medical license"
              error={errors.medical_license?.message}
            >
              <Input
                {...register("medical_license", { required: "Required" })}
                placeholder="RW-MED-2024-001"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>
            <FormField label="Designations">
              <Input
                {...register("designations")}
                placeholder="Senior Doctor"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField
              label="Bio (English)"
              error={errors.bio_en?.message}
              className="col-span-2"
            >
              <Textarea
                {...register("bio_en", { required: "Required" })}
                placeholder="Experienced doctor with 10 years in general medicine"
                className="border-border focus-visible:ring-primary text-xs resize-none"
                rows={2}
              />
            </FormField>
            <FormField label="Bio (French)" className="col-span-2">
              <Textarea
                {...register("bio_fr")}
                placeholder="Médecin expérimenté avec 10 ans en médecine générale"
                className="border-border focus-visible:ring-primary text-xs resize-none"
                rows={2}
              />
            </FormField>
            <FormField label="Bio (Kinyarwanda)" className="col-span-2">
              <Textarea
                {...register("bio_kiny")}
                placeholder="Umuganga w'inzobere ufite imyaka 10"
                className="border-border focus-visible:ring-primary text-xs resize-none"
                rows={2}
              />
            </FormField>
            <FormField
              label="Consultation fee"
              error={errors.consultation_fee?.message}
            >
              <Input
                type="number"
                {...register("consultation_fee", {
                  required: "Required",
                  min: { value: 0, message: "Must be positive" },
                })}
                placeholder="5000"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
            <FormField label="Currency">
              <Select
                defaultValue={defaultData?.personal?.currency ?? "RWF"}
                onValueChange={(v) => setValue("currency", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Consultation type">
              <Select
                defaultValue={
                  defaultData?.personal?.consultation_type ?? "both"
                }
                onValueChange={(v) => setValue("consultation_type", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSULTATION_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Preferred language">
              <Select
                defaultValue={defaultData?.personal?.preferred_language ?? "en"}
                onValueChange={(v) => setValue("preferred_language", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {step.id === "specializations" && (
          <SpecializationsStep
            data={specializations}
            onChange={setSpecializations}
          />
        )}

        {step.id === "education" && (
          <EducationStep entries={education} onChange={setEducation} />
        )}

        {step.id === "experience" && (
          <ExperienceStep entries={experience} onChange={setExperience} />
        )}

        {step.id === "qualifications" && (
          <QualificationsStep
            entries={qualifications}
            onChange={setQualifications}
          />
        )}

        {step.id === "documents" && (
          <div className="grid grid-cols-1 gap-4">
            <p className="text-[11px] text-muted-foreground -mt-2 mb-1">
              Upload your profile photo, degree certificate, and medical license
              scan. Accepted formats: JPEG, PNG, WebP · max 2 MB each.
            </p>
            <FileUploadBox
              label="Profile photo"
              accept="image/jpeg,image/png,image/webp"
              file={documents.profile_image}
              onChange={(f) =>
                setDocuments((d) => ({ ...d, profile_image: f }))
              }
            />
            <FileUploadBox
              label="Degree document"
              accept="image/jpeg,image/png,image/webp"
              file={documents.degree_document}
              onChange={(f) =>
                setDocuments((d) => ({ ...d, degree_document: f }))
              }
            />
            <FileUploadBox
              label="Medical license scan"
              accept="image/jpeg,image/png,image/webp"
              file={documents.license_document}
              onChange={(f) =>
                setDocuments((d) => ({ ...d, license_document: f }))
              }
            />
          </div>
        )}

        {step.id === "linksSection" && (
          <SocialLinksStep data={linksSection} onChange={setLinksSection} />
        )}
      </div>

      {/* Footer */}
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
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
type Mode = "view" | "create" | "edit";

const DoctorProfile = () => {
  const { t } = useTranslation();
  const [profileData, setProfileData] = useState<DoctorProfileData | null>(
    null,
  );
  const [mode, setMode] = useState<Mode>("create");
  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const isForm = mode === "create" || mode === "edit";

  const handleSubmit = (data: DoctorProfileData) => {
    setProfileData(data);
    setMode("view");
  };

  const handleDelete = () => {
    setProfileData(null);
    setCurrentStep(0);
    setVisited(new Set([0]));
    setMode("create");
  };

  const openEdit = () => {
    setCurrentStep(0);
    setVisited(new Set([0]));
    setMode("edit");
  };

  const stats = profileData
    ? {
        degree: profileData.personal.doctor_degree,
        license: profileData.personal.medical_license,
        education: profileData.education.length,
        experience: profileData.experience.length,
        qualifications: profileData.qualifications.length,
        fee: formatFee(
          profileData.personal.consultation_fee,
          profileData.personal.currency,
        ),
      }
    : null;

  // Count filled social links
  const socialLinksCount = profileData
    ? Object.values(profileData.linksSection).filter(Boolean).length
    : 0;

  return (
    <DashboardLayout role="doctor">
      <PageHeader
        title={t("pages.doctor.profile_title", "Doctor Profile")}
        subtitle={
          isForm
            ? mode === "edit"
              ? "Update your professional information"
              : "Fill in the details below to get started"
            : t(
                "pages.doctor.profile_sub",
                "Manage your professional information",
              )
        }
      />

      <div className="px-6 py-8 space-y-5">
        {/* Stats bar (view mode only) */}
        {stats && !isForm && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <StatCard label="Degree" value={stats.degree} />
            <StatCard label="License" value={stats.license} />
            <StatCard label="Education" value={stats.education} sub="entries" />
            <StatCard
              label="Experience"
              value={stats.experience}
              sub="positions"
            />
            <StatCard
              label="Qualifications"
              value={stats.qualifications}
              sub="certs"
            />
            <StatCard label="Consult fee" value={stats.fee} accent />
          </div>
        )}

        {/* Unified card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex min-h-[560px]">
          <UnifiedSidebar
            currentStep={currentStep}
            visited={visited}
            onSelect={(i) => {
              const next = new Set([...visited, i]);
              setVisited(next);
              setCurrentStep(i);
            }}
            mode={mode}
            profileData={profileData}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {/* Right content area */}
          {isForm ? (
            <DoctorProfileForm
              mode={mode === "edit" ? "edit" : "create"}
              defaultData={
                mode === "edit" && profileData ? profileData : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => {
                if (profileData) setMode("view");
              }}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              visited={visited}
              onVisitedChange={setVisited}
            />
          ) : profileData ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Professional information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User size={15} className="text-primary" /> Professional
                  information
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    {
                      label: "Specialization",
                      value: profileData.personal.specialization,
                    },
                    {
                      label: "Degree",
                      value: profileData.personal.doctor_degree,
                    },
                    {
                      label: "License",
                      value: profileData.personal.medical_license,
                    },
                    {
                      label: "Designation",
                      value: profileData.personal.designations || "—",
                    },
                    {
                      label: "Consult type",
                      value: profileData.personal.consultation_type,
                    },
                    {
                      label: "Language",
                      value: profileData.personal.preferred_language,
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                      <span className="text-[11px] font-medium text-foreground">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                {profileData.personal.bio_en && (
                  <div className="border-t border-border pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Bio
                    </p>
                    <p className="text-[11px] text-foreground leading-relaxed">
                      {profileData.personal.bio_en}
                    </p>
                  </div>
                )}
              </div>

              {/* Specializations */}
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Stethoscope size={15} className="text-primary" />{" "}
                  Specializations
                </h3>
                {profileData.specializations.primary ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Primary
                      </span>
                      <span className="text-[11px] font-medium text-foreground">
                        {profileData.specializations.primary}
                      </span>
                    </div>
                    {profileData.specializations.years_of_experience > 0 && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Years of experience
                        </span>
                        <span className="text-[11px] font-medium text-foreground">
                          {profileData.specializations.years_of_experience}{" "}
                          years
                        </span>
                      </div>
                    )}
                    {profileData.specializations.secondary.length > 0 && (
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Secondary
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {profileData.specializations.secondary.map((s) => (
                            <span
                              key={s}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(profileData.specializations.custom_tags ?? []).length >
                      0 && (
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Tags
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {profileData.specializations.custom_tags.map((t) => (
                            <span
                              key={t}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {profileData.specializations.subspecialties && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Subspecialties
                        </span>
                        <span className="text-[11px] text-foreground">
                          {profileData.specializations.subspecialties}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No specializations added.
                  </p>
                )}
              </div>

              {/* Education */}
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <GraduationCap size={15} className="text-primary" /> Education
                </h3>
                {profileData.education.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No education entries added.
                  </p>
                ) : (
                  profileData.education.map((edu) => (
                    <div
                      key={edu.id}
                      className="flex flex-col gap-0.5 border-l-2 border-primary/20 pl-3"
                    >
                      <p className="text-[11px] font-medium text-foreground">
                        {edu.degree}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {edu.institution}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {edu.country} · {edu.start_year}–{edu.end_year}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Experience */}
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Briefcase size={15} className="text-primary" /> Work
                  experience
                </h3>
                {profileData.experience.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No experience entries added.
                  </p>
                ) : (
                  profileData.experience.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex flex-col gap-0.5 border-l-2 border-primary/20 pl-3"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-medium text-foreground">
                          {exp.job_title}
                        </p>
                        {exp.is_current && (
                          <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/15 text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {exp.workplace}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {exp.country} · from {formatDateDisplay(exp.start_date)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Qualifications */}
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Award size={15} className="text-primary" /> Certifications &
                  qualifications
                </h3>
                {profileData.qualifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No qualifications added.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profileData.qualifications.map((q) => {
                      const isExpired =
                        q.expires_at && new Date(q.expires_at) < new Date();
                      return (
                        <div
                          key={q.id}
                          className={cn(
                            "rounded-md border p-3",
                            isExpired
                              ? "border-destructive/20 bg-destructive/5"
                              : "border-primary/20 bg-primary/5",
                          )}
                        >
                          <p className="text-[11px] font-medium text-foreground">
                            {q.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {q.issuing_body}
                          </p>
                          <div className="flex gap-3 mt-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              Issued: {formatDateDisplay(q.issued_at)}
                            </span>
                            {q.expires_at && (
                              <span
                                className={cn(
                                  "text-[10px]",
                                  isExpired
                                    ? "text-destructive"
                                    : "text-primary",
                                )}
                              >
                                {isExpired ? "Expired" : "Expires"}:{" "}
                                {formatDateDisplay(q.expires_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Link2 size={15} className="text-primary" /> Social & online
                  presence
                </h3>
                {socialLinksCount === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No social links added.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SOCIAL_PLATFORMS.filter(
                      ({ key }) => !!profileData.linksSection[key],
                    ).map(({ key, label }) => (
                      <a
                        key={key}
                        href={profileData.linksSection[key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[11px] text-primary hover:underline truncate"
                      >
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="font-medium text-muted-foreground w-20 shrink-0">
                          {label}
                        </span>
                        <span className="truncate">
                          {profileData.linksSection[key]}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorProfile;
