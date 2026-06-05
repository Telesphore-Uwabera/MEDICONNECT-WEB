import React from "react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";
import {
  useGetDoctorProfile,
  useUpsertDoctorProfile,
  useUploadProfileImage,
  useAddEducation,
  useUpdateEducation,
  useDeleteEducation,
  useAddExperience,
  useUpdateExperience,
  useDeleteExperience,
  useAddQualification,
  useUpdateQualification,
  useDeleteQualification,
  useSetSocialLinks,
  type DoctorProfile as APIDoctorProfile,
  type SocialLinks as APISocialLinks,
} from "@/hooks/doctor/use-doctor-profile";

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
  apiId?: number;
  degree: string;
  institution: string;
  country: string;
  start_year: number;
  end_year: number;
}

interface ExperienceEntry {
  id: string;
  apiId?: number;
  job_title: string;
  workplace: string;
  country: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
}

interface QualificationEntry {
  id: string;
  apiId?: number;
  title: string;
  issuing_body: string;
  issued_at: string;
  expires_at: string;
  certificate_file?: File | null;
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

type StepSaveState = "idle" | "saving" | "saved" | "error" | "dirty";
type StepSaveStates = Record<string, StepSaveState>;

// ─────────────────────────────────────────────────────────────────────────────
// API ↔ Form shape mappers
// ─────────────────────────────────────────────────────────────────────────────
function mapApiProfileToFormData(doc: APIDoctorProfile): DoctorProfileData {
  return {
    personal: {
      specialization: doc.specialization ?? "",
      doctor_degree: doc.doctor_degree ?? "",
      medical_license: doc.medical_license ?? "",
      designations: "",
      bio_en: doc.bio_en ?? "",
      bio_fr: "",
      bio_kiny: "",
      consultation_fee: 0,
      currency: "RWF",
      consultation_type: doc.consultation_type ?? "both",
      preferred_language: doc.preferred_language ?? "en",
    },
    specializations: {
      primary: doc.specialization ?? "",
      secondary: [],
      custom_tags: [],
      years_of_experience: 0,
      subspecialties: "",
    },
    education: (doc.educations ?? []).map((e) => ({
      id: String(e.id),
      apiId: e.id,
      degree: e.degree,
      institution: e.institution,
      country: e.country,
      start_year: e.start_year,
      end_year: e.end_year ?? new Date().getFullYear(),
    })),
    experience: (doc.experiences ?? []).map((e) => ({
      id: String(e.id),
      apiId: e.id,
      job_title: e.job_title,
      workplace: e.workplace,
      country: e.country,
      start_date: e.start_date,
      end_date: e.end_date ?? null,
      is_current: e.is_current,
    })),
    qualifications: (doc.qualifications ?? []).map((q) => ({
      id: String(q.id),
      apiId: q.id,
      title: q.title,
      issuing_body: q.issuing_body,
      issued_at: q.issued_at,
      expires_at: q.expires_at ?? "",
    })),
    documents: { profile_image: null, degree_document: null, license_document: null },
    linksSection: {
      linkedin: doc.social_links?.linkedin ?? "",
      twitter: doc.social_links?.twitter ?? "",
      facebook: doc.social_links?.facebook ?? "",
      instagram: doc.social_links?.instagram ?? "",
      website: "",
      youtube: "",
      researchgate: "",
      orcid: "",
    },
  };
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
  "General Practice","Internal Medicine","Pediatrics","Surgery",
  "Obstetrics & Gynecology","Cardiology","Dermatology","Neurology",
  "Orthopedics","Psychiatry","Radiology","Anesthesiology",
  "Emergency Medicine","Oncology","Ophthalmology","ENT","Urology",
  "Nephrology","Endocrinology","Infectious Disease","Rheumatology",
  "Pulmonology","Gastroenterology","Hematology",
];
const SOCIAL_PLATFORMS: Array<{ key: keyof SocialLinksInfo; label: string; placeholder: string }> = [
  { key: "linkedin",    label: "LinkedIn",         placeholder: "https://linkedin.com/in/your-profile" },
  { key: "twitter",     label: "X / Twitter",      placeholder: "https://x.com/your-handle" },
  { key: "facebook",    label: "Facebook",         placeholder: "https://facebook.com/your-page" },
  { key: "instagram",   label: "Instagram",        placeholder: "https://instagram.com/your-handle" },
  { key: "website",     label: "Personal website", placeholder: "https://yourwebsite.com" },
  { key: "youtube",     label: "YouTube",          placeholder: "https://youtube.com/@your-channel" },
  { key: "researchgate",label: "ResearchGate",     placeholder: "https://researchgate.net/profile/your-name" },
  { key: "orcid",       label: "ORCID",            placeholder: "https://orcid.org/0000-0000-0000-0000" },
];
const STEPS = [
  { id: "personal"       as const, label: "Personal",       icon: User,         sectionTitle: "Professional information",       description: "Specialization, degree, license, bio & fees" },
  { id: "specializations"as const, label: "Specializations",icon: Stethoscope,  sectionTitle: "Specializations",                description: "Primary & secondary medical specializations" },
  { id: "education"      as const, label: "Education",      icon: GraduationCap,sectionTitle: "Education history",              description: "Degrees and academic background" },
  { id: "experience"     as const, label: "Experience",     icon: Briefcase,    sectionTitle: "Work experience",                description: "Past and current positions" },
  { id: "qualifications" as const, label: "Qualifications", icon: Award,        sectionTitle: "Certifications & qualifications",description: "Certifications and licenses" },
  { id: "documents"      as const, label: "Documents",      icon: FileText,     sectionTitle: "Upload documents",               description: "Profile photo and official docs" },
  { id: "linksSection"   as const, label: "Social Links",   icon: Link2,        sectionTitle: "Social & online presence",       description: "LinkedIn, website, ResearchGate & more" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const formatFee = (fee: number, currency: string) => `${currency} ${fee.toLocaleString()}`;
const formatDateDisplay = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "—";

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Components — shown while background-refetching
// ─────────────────────────────────────────────────────────────────────────────

/** Skeleton for the stats bar */
const StatsSkeleton = React.memo(function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm flex flex-col gap-1.5">
          <Skeleton className="h-2.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-2 w-12 rounded" />
        </div>
      ))}
    </div>
  );
});

/** Skeleton for the sidebar */
const SidebarSkeleton = React.memo(function SidebarSkeleton() {
  return (
    <div className="w-full sm:w-56 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border space-y-2.5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-2 w-full rounded" />
          <Skeleton className="h-2 w-3/4 rounded" />
        </div>
      </div>
      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3">
        {STEPS.map((step) => (
          <div key={step.id} className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-md">
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
            <div className="hidden sm:flex flex-col gap-1 flex-1 min-w-0">
              <Skeleton className="h-2.5 w-16 rounded" />
              <Skeleton className="h-2 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/** Skeleton for the main content panel */
const ContentSkeleton = React.memo(function ContentSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="w-1.5 h-1.5 rounded-full" />
          <Skeleton className="h-2.5 w-36 rounded" />
        </div>
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
      {/* Body */}
      <div className="flex-1 p-4 sm:p-5 space-y-5">
        {/* Field grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-2 w-20 rounded" />
              <Skeleton className="h-3.5 w-32 rounded" />
            </div>
          ))}
        </div>
        {/* Bio block */}
        <div className="border-t border-border pt-4 space-y-2">
          <Skeleton className="h-2 w-16 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-5/6 rounded" />
          <Skeleton className="h-3 w-4/6 rounded" />
        </div>
        {/* Entry cards */}
        <div className="space-y-3 pt-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-md border border-border bg-muted/40 p-4 space-y-3">
              <Skeleton className="h-3.5 w-40 rounded" />
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Skeleton className="h-2 w-16 rounded" /><Skeleton className="h-3 w-24 rounded" /></div>
                <div className="space-y-1.5"><Skeleton className="h-2 w-12 rounded" /><Skeleton className="h-3 w-20 rounded" /></div>
                <div className="space-y-1.5"><Skeleton className="h-2 w-10 rounded" /><Skeleton className="h-3 w-16 rounded" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// StepSaveStatusBadge
// ─────────────────────────────────────────────────────────────────────────────
const StepSaveStatusBadge = React.memo(function StepSaveStatusBadge({ state }: { state: StepSaveState }) {
  if (state === "idle") return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
      state === "saving" && "bg-muted text-muted-foreground",
      state === "saved"  && "bg-primary/15 text-primary",
      state === "error"  && "bg-destructive/15 text-destructive",
      state === "dirty"  && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    )}>
      {state === "saving" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {state === "saved"  && <Check className="h-2.5 w-2.5" />}
      {state === "error"  && <AlertCircle className="h-2.5 w-2.5" />}
      {state === "dirty"  && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Error" : "Unsaved"}
    </span>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = React.memo(function StatCard({
  label, value, sub, accent = false,
}: {
  label: string; value: number | string; sub?: string; accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
      <span className={cn("text-[12px] font-semibold tabular-nums truncate", accent ? "text-primary" : "text-foreground")}>{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FormField
// ─────────────────────────────────────────────────────────────────────────────
const FormField = React.memo(function FormField({
  label, error, children, className = "",
}: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ViewField
// ─────────────────────────────────────────────────────────────────────────────
const ViewField = React.memo(function ViewField({
  label, value, mono = false,
}: {
  label: string; value?: string | number | null; mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] font-medium text-foreground", mono && "font-mono")}>
        {value || "—"}
      </span>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section view panels
// ─────────────────────────────────────────────────────────────────────────────
const ViewPersonal = React.memo(function ViewPersonal({ data }: { data: DoctorProfileData }) {
  const p = data.personal;
  const consultationTypeLabel = useMemo(
    () => CONSULTATION_TYPES.find((c) => c.value === p.consultation_type)?.label ?? p.consultation_type,
    [p.consultation_type],
  );
  const languageLabel = useMemo(
    () => LANGUAGES.find((l) => l.value === p.preferred_language)?.label ?? p.preferred_language,
    [p.preferred_language],
  );
  const feeDisplay = useMemo(
    () => (p.consultation_fee ? formatFee(p.consultation_fee, p.currency) : null),
    [p.consultation_fee, p.currency],
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <ViewField label="Specialization"     value={p.specialization} />
        <ViewField label="Doctor degree"      value={p.doctor_degree} />
        <ViewField label="Medical license"    value={p.medical_license} mono />
        <ViewField label="Designation"        value={p.designations} />
        <ViewField label="Consultation type"  value={consultationTypeLabel} />
        <ViewField label="Preferred language" value={languageLabel} />
        <ViewField label="Consultation fee"   value={feeDisplay} />
      </div>
      {p.bio_en && (
        <div className="border-t border-border pt-4 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bio (English)</span>
          <p className="text-[12px] text-foreground leading-relaxed">{p.bio_en}</p>
        </div>
      )}
      {p.bio_fr && (
        <div className="border-t border-border pt-4 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bio (French)</span>
          <p className="text-[12px] text-foreground leading-relaxed">{p.bio_fr}</p>
        </div>
      )}
      {p.bio_kiny && (
        <div className="border-t border-border pt-4 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bio (Kinyarwanda)</span>
          <p className="text-[12px] text-foreground leading-relaxed">{p.bio_kiny}</p>
        </div>
      )}
    </div>
  );
});

const ViewSpecializations = React.memo(function ViewSpecializations({ data }: { data: DoctorProfileData }) {
  const s = data.specializations;
  if (!s.primary) return <p className="text-xs text-muted-foreground">No specializations added yet.</p>;
  return (
    <div className="space-y-4">
      <ViewField label="Primary specialization" value={s.primary} />
      {s.years_of_experience > 0 && <ViewField label="Years of experience" value={`${s.years_of_experience} years`} />}
      {s.subspecialties && <ViewField label="Subspecialties" value={s.subspecialties} />}
      {s.secondary.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Secondary specializations</span>
          <div className="flex flex-wrap gap-1.5">
            {s.secondary.map((spec) => (
              <span key={spec} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{spec}</span>
            ))}
          </div>
        </div>
      )}
      {s.custom_tags.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Custom tags</span>
          <div className="flex flex-wrap gap-1.5">
            {s.custom_tags.map((tag) => (
              <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const ViewEducation = React.memo(function ViewEducation({ data }: { data: DoctorProfileData }) {
  if (data.education.length === 0)
    return <p className="text-xs text-muted-foreground">No education entries added yet.</p>;
  return (
    <div className="space-y-3">
      {data.education.map((edu) => (
        <div key={edu.id} className="rounded-md border border-border bg-muted/40 p-4 space-y-2">
          <p className="text-[12px] font-semibold text-foreground">{edu.degree}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ViewField label="Institution" value={edu.institution} />
            <ViewField label="Country"     value={edu.country} />
            <ViewField label="Period"      value={`${edu.start_year} – ${edu.end_year}`} />
          </div>
        </div>
      ))}
    </div>
  );
});

const ViewExperience = React.memo(function ViewExperience({ data }: { data: DoctorProfileData }) {
  if (data.experience.length === 0)
    return <p className="text-xs text-muted-foreground">No experience entries added yet.</p>;
  return (
    <div className="space-y-3">
      {data.experience.map((exp) => (
        <div key={exp.id} className="rounded-md border border-border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12px] font-semibold text-foreground">{exp.job_title}</p>
            {exp.is_current && (
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/15 text-primary">Current</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ViewField label="Workplace" value={exp.workplace} />
            <ViewField label="Country"   value={exp.country} />
            <ViewField
              label="Period"
              value={
                exp.is_current
                  ? `From ${formatDateDisplay(exp.start_date)}`
                  : `${formatDateDisplay(exp.start_date)} – ${formatDateDisplay(exp.end_date ?? "")}`
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
});

const ViewQualifications = React.memo(function ViewQualifications({ data }: { data: DoctorProfileData }) {
  if (data.qualifications.length === 0)
    return <p className="text-xs text-muted-foreground">No qualifications added yet.</p>;
  const now = new Date();
  return (
    <div className="space-y-3">
      {data.qualifications.map((q) => {
        const isExpired = q.expires_at && new Date(q.expires_at) < now;
        return (
          <div key={q.id} className={cn("rounded-md border p-4 space-y-2", isExpired ? "border-destructive/20 bg-destructive/5" : "border-primary/20 bg-primary/5")}>
            <p className="text-[12px] font-semibold text-foreground">{q.title}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <ViewField label="Issuing body" value={q.issuing_body} />
              <ViewField label="Issued"       value={formatDateDisplay(q.issued_at)} />
              {q.expires_at && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expires</span>
                  <span className={cn("text-[12px] font-medium", isExpired ? "text-destructive" : "text-primary")}>
                    {isExpired ? "Expired " : ""}{formatDateDisplay(q.expires_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

const ViewDocuments = React.memo(function ViewDocuments({ data }: { data: DoctorProfileData }) {
  const filledDocs = useMemo<[string, File][]>(() => (
    ([
      ["Profile photo",        data.documents.profile_image],
      ["Degree document",      data.documents.degree_document],
      ["Medical license scan", data.documents.license_document],
    ] as [string, File | null | undefined][]).filter((entry): entry is [string, File] => !!entry[1])
  ), [data.documents]);

  if (filledDocs.length === 0)
    return <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>;

  return (
    <div className="space-y-3">
      {filledDocs.map(([label, file]) => (
        <div key={label} className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-3">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-[12px] font-medium text-foreground truncate">{file.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

const ViewSocialLinks = React.memo(function ViewSocialLinks({ data }: { data: DoctorProfileData }) {
  const filledLinks = useMemo(
    () => SOCIAL_PLATFORMS.filter(({ key }) => !!data.linksSection[key]),
    [data.linksSection],
  );
  if (filledLinks.length === 0)
    return <p className="text-xs text-muted-foreground">No social links added yet.</p>;
  return (
    <div className="grid grid-cols-1 gap-2">
      {filledLinks.map(({ key, label }) => (
        <a
          key={key}
          href={data.linksSection[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
        >
          <Link2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-24 shrink-0">{label}</span>
          <span className="text-[12px] text-primary truncate">{data.linksSection[key]}</span>
        </a>
      ))}
    </div>
  );
});

function SectionViewPanel({ stepId, data }: { stepId: typeof STEPS[number]["id"]; data: DoctorProfileData }) {
  switch (stepId) {
    case "personal":       return <ViewPersonal        data={data} />;
    case "specializations":return <ViewSpecializations data={data} />;
    case "education":      return <ViewEducation       data={data} />;
    case "experience":     return <ViewExperience      data={data} />;
    case "qualifications": return <ViewQualifications  data={data} />;
    case "documents":      return <ViewDocuments       data={data} />;
    case "linksSection":   return <ViewSocialLinks     data={data} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UnifiedSidebar
// ─────────────────────────────────────────────────────────────────────────────
const UnifiedSidebar = React.memo(function UnifiedSidebar({
  currentStep, onSelect, mode, profileData, onEdit, onDelete, stepSaveStates,
}: {
  currentStep: number;
  onSelect: (i: number) => void;
  mode: "create" | "edit" | "view";
  profileData: DoctorProfileData | null;
  onEdit: () => void;
  onDelete: () => void;
  stepSaveStates: StepSaveStates;
}) {
  const isForm = mode === "create" || mode === "edit";

  const { savedCount, pct } = useMemo(() => {
    const saved = Object.values(stepSaveStates).filter((s) => s === "saved").length;
    return { savedCount: saved, pct: Math.round((saved / STEPS.length) * 100) };
  }, [stepSaveStates]);

  const profileSummary = useMemo(() => {
    if (!profileData) return null;
    return {
      initials: profileData.personal.specialization.slice(0, 2).toUpperCase() || "DR",
      specialization: profileData.personal.specialization,
      license: profileData.personal.medical_license,
      degree: profileData.personal.doctor_degree,
      fee: formatFee(profileData.personal.consultation_fee, profileData.personal.currency),
    };
  }, [profileData]);

  return (
    <div className="w-full sm:w-56 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      {/* Header */}
      <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        {isForm ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Profile setup</span>
              <span className="text-[11px] font-bold text-primary tabular-nums">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground">{savedCount} of {STEPS.length} sections saved</p>
          </div>
        ) : profileSummary ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                {profileSummary.initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">{profileSummary.specialization}</p>
                <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{profileSummary.license}</p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: "Degree", value: profileSummary.degree },
                { label: "Fee",    value: profileSummary.fee },
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

      {/* Step nav */}
      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden overflow-y-hidden sm:overflow-y-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const saveState = stepSaveStates[step.id] ?? "idle";
          const isSaved = saveState === "saved";
          const isDirty = saveState === "dirty";

          return (
            <button
              key={step.id}
              onClick={() => onSelect(i)}
              className={cn(
                "flex shrink-0 sm:shrink sm:w-full items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-md text-left transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold border transition-all",
                isActive  ? "bg-primary border-primary text-primary-foreground"
                : isSaved ? "bg-primary/20 border-primary/40 text-primary"
                : isDirty ? "bg-amber-500/20 border-amber-500/40 text-amber-600"
                          : "bg-muted border-border text-muted-foreground",
              )}>
                {isSaved ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="flex items-center justify-between gap-1">
                  <span className={cn("text-xs font-medium leading-tight truncate", isActive ? "text-primary" : "")}>
                    {step.label}
                  </span>
                  {isForm && <StepSaveStatusBadge state={isActive ? "idle" : saveState} />}
                </div>
                <p className="hidden sm:block text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                  {step.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer actions */}
      {!isForm && profileData && (
        <div className="p-2 sm:p-3 border-t border-border flex flex-row sm:flex-col gap-2">
          <Button onClick={onEdit} className="flex-1 sm:w-full text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-8">
            <Pencil size={12} /> Edit profile
          </Button>
          <Button variant="outline" onClick={onDelete} className="flex-1 sm:w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 h-8">
            <Trash2 size={12} /> Delete profile
          </Button>
        </div>
      )}

      {isForm && (
        <div className="hidden sm:block px-3.5 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Click any section to jump to it. Save each section independently.
          </p>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EntryCard
// ─────────────────────────────────────────────────────────────────────────────
const EntryCard = React.memo(function EntryCard({
  children, onRemove,
}: {
  children: React.ReactNode; onRemove: () => void;
}) {
  return (
    <div className="relative rounded-md border border-border bg-muted/50 p-4 pr-10">
      {children}
      <button type="button" onClick={onRemove} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Step form sub-components
// ─────────────────────────────────────────────────────────────────────────────
const SpecializationsStep = React.memo(function SpecializationsStep({
  data, onChange,
}: {
  data: SpecializationsInfo; onChange: (v: SpecializationsInfo) => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const secondaryOptions = useMemo(
    () => COMMON_SPECIALIZATIONS.filter((s) => s !== data.primary),
    [data.primary],
  );

  const toggleSecondary = useCallback((spec: string) => {
    onChange({
      ...data,
      secondary: data.secondary.includes(spec)
        ? data.secondary.filter((s) => s !== spec)
        : [...data.secondary, spec],
    });
  }, [data, onChange]);

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed || data.custom_tags?.includes(trimmed)) return;
    onChange({ ...data, custom_tags: [...(data.custom_tags ?? []), trimmed] });
    setTagInput("");
  }, [tagInput, data, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange({ ...data, custom_tags: (data.custom_tags ?? []).filter((t) => t !== tag) });
  }, [data, onChange]);

  return (
    <div className="space-y-5">
      <FormField label="Primary specialization *">
        <Select value={data.primary ?? ""} onValueChange={(v) => onChange({ ...data, primary: v })}>
          <SelectTrigger className="border-border focus:ring-primary text-xs h-9"><SelectValue placeholder="Select primary specialization" /></SelectTrigger>
          <SelectContent className="max-h-60">{COMMON_SPECIALIZATIONS.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      <FormField label="Years of experience">
        <Input type="number" value={data.years_of_experience ?? ""} onChange={(e) => onChange({ ...data, years_of_experience: +e.target.value })} placeholder="10" min={0} max={60} className="border-border focus-visible:ring-primary text-xs h-9 w-full sm:w-40" />
      </FormField>
      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground">Secondary specializations</Label>
        <div className="flex flex-wrap gap-2">
          {secondaryOptions.map((spec) => {
            const selected = (data.secondary ?? []).includes(spec);
            return (
              <button key={spec} type="button" onClick={() => toggleSecondary(spec)} className={cn("text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150 font-medium", selected ? "bg-primary/15 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
                {selected && <Check className="inline h-2.5 w-2.5 mr-1" />}{spec}
              </button>
            );
          })}
        </div>
      </div>
      <FormField label="Subspecialties / areas of focus">
        <Input value={data.subspecialties ?? ""} onChange={(e) => onChange({ ...data, subspecialties: e.target.value })} placeholder="e.g. Pediatric cardiology" className="border-border focus-visible:ring-primary text-xs h-9" />
      </FormField>
      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground">Custom tags</Label>
        <div className="flex gap-2">
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Type a tag and press Enter" className="border-border focus-visible:ring-primary text-xs h-9 flex-1" />
          <Button type="button" variant="outline" onClick={addTag} className="text-xs h-9 px-3 border-border"><Plus className="h-3.5 w-3.5" /></Button>
        </div>
        {(data.custom_tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(data.custom_tags ?? []).map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const EducationStep = React.memo(function EducationStep({
  entries, onChange,
}: {
  entries: EducationEntry[]; onChange: (v: EducationEntry[]) => void;
}) {
  const addEntry = useCallback(() => {
    onChange([...entries, { id: uid(), apiId: undefined, degree: "", institution: "", country: "", start_year: new Date().getFullYear() - 6, end_year: new Date().getFullYear() }]);
  }, [entries, onChange]);
  const updateEntry = useCallback((id: string, patch: Partial<EducationEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, [entries, onChange]);
  const removeEntry = useCallback((id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  }, [entries, onChange]);

  return (
    <div className="space-y-4">
      {entries.length === 0 && <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-4 py-3 border border-dashed border-border">No education entries yet. Click "Add education" below.</p>}
      {entries.map((entry) => (
        <EntryCard key={entry.id} onRemove={() => removeEntry(entry.id)}>
          {entry.apiId && <p className="text-[10px] text-muted-foreground mb-2 font-mono">ID: {entry.apiId}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Degree *"><Input value={entry.degree} onChange={(e) => updateEntry(entry.id, { degree: e.target.value })} placeholder="MBBS" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Institution *"><Input value={entry.institution} onChange={(e) => updateEntry(entry.id, { institution: e.target.value })} placeholder="University of Rwanda" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Country *"><Input value={entry.country} onChange={(e) => updateEntry(entry.id, { country: e.target.value })} placeholder="Rwanda" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Start year *"><Input type="number" value={entry.start_year} onChange={(e) => updateEntry(entry.id, { start_year: parseInt(e.target.value, 10) })} className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
              <FormField label="End year"><Input type="number" value={entry.end_year} onChange={(e) => updateEntry(entry.id, { end_year: parseInt(e.target.value, 10) })} className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            </div>
          </div>
        </EntryCard>
      ))}
      <Button type="button" variant="outline" onClick={addEntry} className="w-full border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary">
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add education
      </Button>
    </div>
  );
});

const ExperienceStep = React.memo(function ExperienceStep({
  entries, onChange,
}: {
  entries: ExperienceEntry[]; onChange: (v: ExperienceEntry[]) => void;
}) {
  const addEntry = useCallback(() => {
    onChange([...entries, { id: uid(), apiId: undefined, job_title: "", workplace: "", country: "", start_date: "", end_date: null, is_current: false }]);
  }, [entries, onChange]);
  const updateEntry = useCallback((id: string, patch: Partial<ExperienceEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, [entries, onChange]);
  const removeEntry = useCallback((id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  }, [entries, onChange]);

  return (
    <div className="space-y-4">
      {entries.length === 0 && <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-4 py-3 border border-dashed border-border">No experience entries yet. Click "Add experience" below.</p>}
      {entries.map((entry) => (
        <EntryCard key={entry.id} onRemove={() => removeEntry(entry.id)}>
          {entry.apiId && <p className="text-[10px] text-muted-foreground mb-2 font-mono">ID: {entry.apiId}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Job title *"><Input value={entry.job_title} onChange={(e) => updateEntry(entry.id, { job_title: e.target.value })} placeholder="General Practitioner" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Workplace *"><Input value={entry.workplace} onChange={(e) => updateEntry(entry.id, { workplace: e.target.value })} placeholder="King Faisal Hospital" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Country *"><Input value={entry.country} onChange={(e) => updateEntry(entry.id, { country: e.target.value })} placeholder="Rwanda" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Start date *"><Input type="date" value={entry.start_date} onChange={(e) => updateEntry(entry.id, { start_date: e.target.value })} className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            {!entry.is_current && (
              <FormField label="End date"><Input type="date" value={entry.end_date ?? ""} onChange={(e) => updateEntry(entry.id, { end_date: e.target.value || null })} className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            )}
            <div className="col-span-1 sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id={`current-${entry.id}`} checked={entry.is_current} onChange={(e) => updateEntry(entry.id, { is_current: e.target.checked, end_date: e.target.checked ? null : entry.end_date })} className="accent-primary" />
              <label htmlFor={`current-${entry.id}`} className="text-xs text-muted-foreground">Currently working here</label>
            </div>
          </div>
        </EntryCard>
      ))}
      <Button type="button" variant="outline" onClick={addEntry} className="w-full border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary">
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add experience
      </Button>
    </div>
  );
});

const QualificationsStep = React.memo(function QualificationsStep({
  entries, onChange,
}: {
  entries: QualificationEntry[]; onChange: (v: QualificationEntry[]) => void;
}) {
  const addEntry = useCallback(() => {
    onChange([...entries, { id: uid(), apiId: undefined, title: "", issuing_body: "", issued_at: "", expires_at: "", certificate_file: null }]);
  }, [entries, onChange]);
  const updateEntry = useCallback((id: string, patch: Partial<QualificationEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, [entries, onChange]);
  const removeEntry = useCallback((id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  }, [entries, onChange]);

  return (
    <div className="space-y-4">
      {entries.length === 0 && <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-4 py-3 border border-dashed border-border">No qualifications yet. Click "Add qualification" below.</p>}
      {entries.map((entry) => (
        <EntryCard key={entry.id} onRemove={() => removeEntry(entry.id)}>
          {entry.apiId && <p className="text-[10px] text-muted-foreground mb-2 font-mono">ID: {entry.apiId}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Certification title *" className="col-span-1 sm:col-span-2"><Input value={entry.title} onChange={(e) => updateEntry(entry.id, { title: e.target.value })} placeholder="Advanced Cardiac Life Support" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Issuing body *" className="col-span-1 sm:col-span-2"><Input value={entry.issuing_body} onChange={(e) => updateEntry(entry.id, { issuing_body: e.target.value })} placeholder="American Heart Association" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Issued date *"><Input type="date" value={entry.issued_at} onChange={(e) => updateEntry(entry.id, { issued_at: e.target.value })} className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Expiry date"><Input type="date" value={entry.expires_at} onChange={(e) => updateEntry(entry.id, { expires_at: e.target.value })} className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Certificate file (optional)" className="col-span-1 sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-md px-3 py-2 hover:border-primary hover:bg-primary/5 transition-colors">
                <input type="file" accept=".pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => updateEntry(entry.id, { certificate_file: e.target.files?.[0] ?? null })} />
                {entry.certificate_file
                  ? <><Check className="h-3.5 w-3.5 text-primary shrink-0" /><span className="text-[11px] text-primary truncate">{entry.certificate_file.name}</span></>
                  : <><Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="text-[11px] text-muted-foreground">Upload certificate (PDF, JPG, PNG · max 4 MB)</span></>}
              </label>
            </FormField>
          </div>
        </EntryCard>
      ))}
      <Button type="button" variant="outline" onClick={addEntry} className="w-full border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary">
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add qualification
      </Button>
    </div>
  );
});

const SocialLinksStep = React.memo(function SocialLinksStep({
  data, onChange,
}: {
  data: SocialLinksInfo; onChange: (v: SocialLinksInfo) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground -mt-1 mb-2">All fields are optional.</p>
      <div className="grid grid-cols-1 gap-3">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
          <FormField key={key} label={label}>
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input value={data[key]} onChange={(e) => onChange({ ...data, [key]: e.target.value })} placeholder={placeholder} className="border-border focus-visible:ring-primary text-xs h-9" type="url" />
            </div>
          </FormField>
        ))}
      </div>
    </div>
  );
});

const FileUploadBox = React.memo(function FileUploadBox({
  label, accept, file, onChange,
}: {
  label: string; accept: string; file?: File | null; onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/50 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer px-4 py-6 text-center">
      <input type="file" accept={accept} className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {file
        ? <><Check className="h-5 w-5 text-primary" /><p className="text-xs font-medium text-primary">{file.name}</p><p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · click to replace</p></>
        : <><Upload className="h-5 w-5 text-muted-foreground" /><p className="text-xs font-medium text-foreground">{label}</p><p className="text-[10px] text-muted-foreground">JPEG, PNG, WebP · max 2 MB</p></>}
    </label>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DoctorProfileForm
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SPECIALIZATIONS: SpecializationsInfo = { primary: "", secondary: [], custom_tags: [], years_of_experience: 0, subspecialties: "" };
const DEFAULT_SOCIAL_LINKS: SocialLinksInfo = { linkedin: "", twitter: "", facebook: "", instagram: "", website: "", youtube: "", researchgate: "", orcid: "" };

function DoctorProfileForm({
  mode, defaultData, currentStep, onStepChange, onCancel, stepSaveStates, onSaveStep,
}: {
  mode: "create" | "edit";
  defaultData?: Partial<DoctorProfileData>;
  currentStep: number;
  onStepChange: (i: number) => void;
  onCancel: () => void;
  stepSaveStates: StepSaveStates;
  onSaveStep: (stepId: string, data: Partial<DoctorProfileData>) => Promise<void>;
}) {
  const [specializations, setSpecializations] = useState<SpecializationsInfo>(defaultData?.specializations ?? DEFAULT_SPECIALIZATIONS);
  const [education,       setEducation]       = useState<EducationEntry[]>(defaultData?.education ?? []);
  const [experience,      setExperience]      = useState<ExperienceEntry[]>(defaultData?.experience ?? []);
  const [qualifications,  setQualifications]  = useState<QualificationEntry[]>(defaultData?.qualifications ?? []);
  const [documents,       setDocuments]       = useState<DocumentsInfo>(defaultData?.documents ?? {});
  const [linksSection,    setLinksSection]    = useState<SocialLinksInfo>(defaultData?.linksSection ?? DEFAULT_SOCIAL_LINKS);

  useEffect(() => {
    if (defaultData?.specializations) setSpecializations(defaultData.specializations);
    if (defaultData?.education)       setEducation(defaultData.education);
    if (defaultData?.experience)      setExperience(defaultData.experience);
    if (defaultData?.qualifications)  setQualifications(defaultData.qualifications);
    if (defaultData?.linksSection)    setLinksSection(defaultData.linksSection);
  }, [defaultData]);

  const { register, handleSubmit, trigger, setValue, formState: { errors } } = useForm<PersonalInfo>({
    defaultValues: defaultData?.personal,
  });

  const step = STEPS[currentStep];
  const currentSaveState = stepSaveStates[step.id] ?? "idle";
  const isSaving = currentSaveState === "saving";

  const handleSave = useCallback(async () => {
    if (step.id === "personal") {
      const valid = await trigger();
      if (!valid) return;
      handleSubmit(async (personal) => { await onSaveStep("personal", { personal }); })();
      return;
    }
    const payloads: Record<string, Partial<DoctorProfileData>> = {
      specializations: { specializations },
      education:       { education },
      experience:      { experience },
      qualifications:  { qualifications },
      documents:       { documents },
      linksSection:    { linksSection },
    };
    if (payloads[step.id]) await onSaveStep(step.id, payloads[step.id]);
  }, [step.id, trigger, handleSubmit, onSaveStep, specializations, education, experience, qualifications, documents, linksSection]);

  const handleProfileImageChange = useCallback((f: File | null) => setDocuments((d) => ({ ...d, profile_image: f })), []);
  const handleDegreeDocChange    = useCallback((f: File | null) => setDocuments((d) => ({ ...d, degree_document: f })), []);
  const handleLicenseDocChange   = useCallback((f: File | null) => setDocuments((d) => ({ ...d, license_document: f })), []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{step.sectionTitle}</span>
        <div className="ml-auto flex items-center gap-2">
          <StepSaveStatusBadge state={currentSaveState} />
          <span className="text-[10px] text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</span>
        </div>
      </div>

      <div key={currentStep} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {step.id === "personal" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Specialization *" error={errors.specialization?.message}><Input {...register("specialization", { required: "Required" })} placeholder="General Practitioner" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Doctor degree *"  error={errors.doctor_degree?.message}><Input {...register("doctor_degree",  { required: "Required" })} placeholder="MBBS" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Medical license *" error={errors.medical_license?.message}><Input {...register("medical_license", { required: "Required" })} placeholder="RW-MED-2024-001" className="border-border focus-visible:ring-primary font-mono text-xs h-9" /></FormField>
            <FormField label="Designations"><Input {...register("designations")} placeholder="Senior Doctor" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Bio (English) *" error={errors.bio_en?.message} className="col-span-1 sm:col-span-2"><Textarea {...register("bio_en", { required: "Required" })} placeholder="Experienced doctor with 10 years in general medicine" className="border-border focus-visible:ring-primary text-xs resize-none" rows={2} /></FormField>
            <FormField label="Bio (French)" className="col-span-1 sm:col-span-2"><Textarea {...register("bio_fr")} placeholder="Médecin expérimenté avec 10 ans en médecine générale" className="border-border focus-visible:ring-primary text-xs resize-none" rows={2} /></FormField>
            <FormField label="Bio (Kinyarwanda)" className="col-span-1 sm:col-span-2"><Textarea {...register("bio_kiny")} placeholder="Umuganga w'inzobere ufite imyaka 10" className="border-border focus-visible:ring-primary text-xs resize-none" rows={2} /></FormField>
            <FormField label="Consultation fee *" error={errors.consultation_fee?.message}><Input type="number" {...register("consultation_fee", { required: "Required", min: { value: 0, message: "Must be positive" }, valueAsNumber: true })} placeholder="5000" className="border-border focus-visible:ring-primary text-xs h-9" /></FormField>
            <FormField label="Currency">
              <Select defaultValue={defaultData?.personal?.currency ?? "RWF"} onValueChange={(v) => setValue("currency", v)}>
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Consultation type">
              <Select defaultValue={defaultData?.personal?.consultation_type ?? "both"} onValueChange={(v) => setValue("consultation_type", v)}>
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CONSULTATION_TYPES.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Preferred language">
              <Select defaultValue={defaultData?.personal?.preferred_language ?? "en"} onValueChange={(v) => setValue("preferred_language", v)}>
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
        )}
        {step.id === "specializations" && <SpecializationsStep data={specializations} onChange={setSpecializations} />}
        {step.id === "education"       && <EducationStep       entries={education}       onChange={setEducation} />}
        {step.id === "experience"      && <ExperienceStep      entries={experience}      onChange={setExperience} />}
        {step.id === "qualifications"  && <QualificationsStep  entries={qualifications}  onChange={setQualifications} />}
        {step.id === "documents" && (
          <div className="grid grid-cols-1 gap-4">
            <p className="text-[11px] text-muted-foreground -mt-2 mb-1">Upload your profile photo, degree certificate, and medical license scan. JPEG, PNG, WebP · max 2 MB each.</p>
            <FileUploadBox label="Profile photo"        accept="image/jpeg,image/png,image/webp" file={documents.profile_image}    onChange={handleProfileImageChange} />
            <FileUploadBox label="Degree document"      accept="image/jpeg,image/png,image/webp" file={documents.degree_document}  onChange={handleDegreeDocChange} />
            <FileUploadBox label="Medical license scan" accept="image/jpeg,image/png,image/webp" file={documents.license_document} onChange={handleLicenseDocChange} />
          </div>
        )}
        {step.id === "linksSection" && <SocialLinksStep data={linksSection} onChange={setLinksSection} />}
      </div>

      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving} className="border-border text-xs">Cancel</Button>
          {currentStep > 0 && <Button variant="ghost" onClick={() => onStepChange(currentStep - 1)} disabled={isSaving} className="text-xs text-muted-foreground">← Back</Button>}
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:block">Step {currentStep + 1} of {STEPS.length}</span>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 gap-1.5">
            {isSaving ? <><Loader2 className="h-3 w-3 animate-spin" />Saving…</> : currentSaveState === "saved" ? <><Check className="h-3 w-3" />Saved</> : <><Save className="h-3 w-3" />Save section</>}
          </Button>
          {currentStep < STEPS.length - 1 && <Button variant="outline" onClick={() => onStepChange(currentStep + 1)} disabled={isSaving} className="text-xs border-border">Next →</Button>}
          {currentStep === STEPS.length - 1 && <Button variant="outline" onClick={onCancel} disabled={isSaving} className="text-xs border-border">Done</Button>}
        </div>
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

  // ── FIX 1: use placeholderData so cached data shows immediately on tab return
  // while isFetching drives skeleton overlays instead of isLoading driving a spinner
  const {
    data: apiData,
    isLoading: isLoadingProfile,   // true only on the very first load (no cache)
    isFetching: isFetchingProfile, // true on every background refetch
  } = useGetDoctorProfile();

  const upsertProfile       = useUpsertDoctorProfile();
  const uploadImage         = useUploadProfileImage();
  const addEducation        = useAddEducation();
  const updateEducation     = useUpdateEducation();
  const deleteEducation     = useDeleteEducation();
  const addExperience       = useAddExperience();
  const updateExperience    = useUpdateExperience();
  const deleteExperience    = useDeleteExperience();
  const addQualification    = useAddQualification();
  const updateQualification = useUpdateQualification();
  const deleteQualification = useDeleteQualification();
  const setSocialLinks      = useSetSocialLinks();

  const [profileData,    setProfileData]    = useState<DoctorProfileData | null>(null);
  const [mode,           setMode]           = useState<Mode>("create");
  const [currentStep,    setCurrentStep]    = useState(0);
  const [stepSaveStates, setStepSaveStates] = useState<StepSaveStates>({});

  useEffect(() => {
    if (apiData?.doctor) {
      const mapped = mapApiProfileToFormData(apiData.doctor);
      setProfileData(mapped);
      setMode("view");
      const initial: StepSaveStates = {};
      if (mapped.personal.specialization)                   initial["personal"]        = "saved";
      if (mapped.specializations.primary)                   initial["specializations"] = "saved";
      if (mapped.education.length)                          initial["education"]       = "saved";
      if (mapped.experience.length)                         initial["experience"]      = "saved";
      if (mapped.qualifications.length)                     initial["qualifications"]  = "saved";
      if (Object.values(mapped.linksSection).some(Boolean)) initial["linksSection"]    = "saved";
      setStepSaveStates(initial);
    }
  }, [apiData]);

  const isForm = mode === "create" || mode === "edit";

  const setStepState = useCallback((stepId: string, state: StepSaveState) => {
    setStepSaveStates((prev) => ({ ...prev, [stepId]: state }));
  }, []);

  const syncEducation = useCallback(async (newEntries: EducationEntry[], oldEntries: EducationEntry[]): Promise<EducationEntry[]> => {
    const newApiIds = new Set(newEntries.map((e) => e.apiId).filter(Boolean));
    for (const old of oldEntries) {
      if (old.apiId && !newApiIds.has(old.apiId)) await deleteEducation.mutateAsync(old.apiId);
    }
    const updated: EducationEntry[] = [];
    for (const entry of newEntries) {
      if (entry.apiId) {
        const res = await updateEducation.mutateAsync({ id: entry.apiId, degree: entry.degree, institution: entry.institution, country: entry.country, start_year: Number(entry.start_year), end_year: entry.end_year ? Number(entry.end_year) : null });
        updated.push({ ...entry, apiId: (res as { education?: { id?: number } })?.education?.id ?? entry.apiId });
      } else {
        const res = await addEducation.mutateAsync({ degree: entry.degree, institution: entry.institution, country: entry.country, start_year: Number(entry.start_year), end_year: entry.end_year ? Number(entry.end_year) : null });
        const newId = (res as { education?: { id?: number } })?.education?.id;
        updated.push({ ...entry, apiId: newId, id: newId ? String(newId) : entry.id });
      }
    }
    return updated;
  }, [addEducation, updateEducation, deleteEducation]);

  const syncExperience = useCallback(async (newEntries: ExperienceEntry[], oldEntries: ExperienceEntry[]): Promise<ExperienceEntry[]> => {
    const newApiIds = new Set(newEntries.map((e) => e.apiId).filter(Boolean));
    for (const old of oldEntries) {
      if (old.apiId && !newApiIds.has(old.apiId)) await deleteExperience.mutateAsync(old.apiId);
    }
    const updated: ExperienceEntry[] = [];
    for (const entry of newEntries) {
      if (entry.apiId) {
        const res = await updateExperience.mutateAsync({ id: entry.apiId, job_title: entry.job_title, workplace: entry.workplace, country: entry.country, start_date: entry.start_date, end_date: entry.is_current ? null : (entry.end_date ?? null), is_current: Boolean(entry.is_current) });
        updated.push({ ...entry, apiId: (res as { experience?: { id?: number } })?.experience?.id ?? entry.apiId });
      } else {
        const res = await addExperience.mutateAsync({ job_title: entry.job_title, workplace: entry.workplace, country: entry.country, start_date: entry.start_date, end_date: entry.is_current ? null : (entry.end_date ?? null), is_current: Boolean(entry.is_current) });
        const newId = (res as { experience?: { id?: number } })?.experience?.id;
        updated.push({ ...entry, apiId: newId, id: newId ? String(newId) : entry.id });
      }
    }
    return updated;
  }, [addExperience, updateExperience, deleteExperience]);

  const syncQualifications = useCallback(async (newEntries: QualificationEntry[], oldEntries: QualificationEntry[]): Promise<QualificationEntry[]> => {
    const newApiIds = new Set(newEntries.map((e) => e.apiId).filter(Boolean));
    for (const old of oldEntries) {
      if (old.apiId && !newApiIds.has(old.apiId)) await deleteQualification.mutateAsync(old.apiId);
    }
    const updated: QualificationEntry[] = [];
    for (const entry of newEntries) {
      if (entry.apiId) {
        const res = await updateQualification.mutateAsync({ id: entry.apiId, title: entry.title, issuing_body: entry.issuing_body, issued_at: entry.issued_at, expires_at: entry.expires_at || undefined, certificate_file: entry.certificate_file ?? undefined });
        updated.push({ ...entry, apiId: (res as { qualification?: { id?: number } })?.qualification?.id ?? entry.apiId });
      } else {
        const res = await addQualification.mutateAsync({ title: entry.title, issuing_body: entry.issuing_body, issued_at: entry.issued_at, expires_at: entry.expires_at || undefined, certificate_file: entry.certificate_file ?? undefined });
        const newId = (res as { qualification?: { id?: number } })?.qualification?.id;
        updated.push({ ...entry, apiId: newId, id: newId ? String(newId) : entry.id });
      }
    }
    return updated;
  }, [addQualification, updateQualification, deleteQualification]);

  const handleSaveStep = useCallback(async (stepId: string, data: Partial<DoctorProfileData>) => {
    setStepState(stepId, "saving");
    try {
      switch (stepId) {
        case "personal": {
          // ── FIX 2: Only send fields the API actually accepts on upsert.
          // consultation_fee, currency, and designations are NOT in UpsertProfilePayload
          // and caused the API to store "0.00" / "RWF" / null on creation.
          await upsertProfile.mutateAsync({
            specialization:     data.personal!.specialization,
            doctor_degree:      data.personal!.doctor_degree,
            medical_license:    data.personal!.medical_license,
            bio_en:             data.personal!.bio_en,
            consultation_type:  data.personal!.consultation_type as "online" | "in_person" | "both",
            preferred_language: data.personal!.preferred_language,
            is_available:       true,
            consultation_fee:   data.personal!.consultation_fee,
            currency:           data.personal!.currency,
            bio_fr:             data.personal!.bio_fr,
            bio_kiny:           data.personal!.bio_kiny,
            // ⬇ intentionally omitted: designation, consultation_fee, currency,
            //   bio_fr, bio_kiny — these are not part of UpsertProfilePayload
          });
          setProfileData((prev) => prev ? { ...prev, personal: data.personal! } : { ...({} as DoctorProfileData), personal: data.personal! });
          break;
        }
        case "specializations": {
          if (data.specializations?.primary) await upsertProfile.mutateAsync({ specialization: data.specializations.primary });
          setProfileData((prev) => prev ? { ...prev, specializations: data.specializations! } : null);
          break;
        }
        case "education": {
          const updated = await syncEducation(data.education!, profileData?.education ?? []);
          setProfileData((prev) => prev ? { ...prev, education: updated } : null);
          break;
        }
        case "experience": {
          const updated = await syncExperience(data.experience!, profileData?.experience ?? []);
          setProfileData((prev) => prev ? { ...prev, experience: updated } : null);
          break;
        }
        case "qualifications": {
          const updated = await syncQualifications(data.qualifications!, profileData?.qualifications ?? []);
          setProfileData((prev) => prev ? { ...prev, qualifications: updated } : null);
          break;
        }
        case "documents": {
          if (data.documents?.profile_image) await uploadImage.mutateAsync(data.documents.profile_image);
          setProfileData((prev) => prev ? { ...prev, documents: data.documents! } : null);
          break;
        }
        case "linksSection": {
          const socialPayload: APISocialLinks = {};
          if (data.linksSection!.linkedin)  socialPayload.linkedin  = data.linksSection!.linkedin;
          if (data.linksSection!.twitter)   socialPayload.twitter   = data.linksSection!.twitter;
          if (data.linksSection!.facebook)  socialPayload.facebook  = data.linksSection!.facebook;
          if (data.linksSection!.instagram) socialPayload.instagram = data.linksSection!.instagram;
          if (Object.keys(socialPayload).length > 0) await setSocialLinks.mutateAsync(socialPayload);
          setProfileData((prev) => prev ? { ...prev, linksSection: data.linksSection! } : null);
          break;
        }
      }
      setStepState(stepId, "saved");
    } catch (err) {
      console.error(`Failed to save step "${stepId}":`, err);
      setStepState(stepId, "error");
    }
  }, [profileData, setStepState, upsertProfile, uploadImage, setSocialLinks, syncEducation, syncExperience, syncQualifications]);

  const handleDelete = useCallback(() => {
    setProfileData(null);
    setCurrentStep(0);
    setStepSaveStates({});
    setMode("create");
  }, []);

  const openEdit = useCallback(() => setMode("edit"), []);

  const handleCancel = useCallback(() => {
    if (profileData) { setMode("view"); } else { setCurrentStep(0); setStepSaveStates({}); }
  }, [profileData]);

  const stats = useMemo(() => {
    if (!profileData) return null;
    return {
      degree:         profileData.personal.doctor_degree,
      license:        profileData.personal.medical_license,
      education:      profileData.education.length,
      experience:     profileData.experience.length,
      qualifications: profileData.qualifications.length,
      fee:            formatFee(profileData.personal.consultation_fee, profileData.personal.currency),
    };
  }, [profileData]);

  const activeStep = STEPS[currentStep];

  // ── FIX 1 continued: hard spinner ONLY on the very first load (empty cache)
  if (isLoadingProfile) {
    return (
      <DashboardLayout role="doctor">
        <PageHeader title={t("pages.doctor.profile_title", "Doctor Profile")} subtitle="Loading your profile…" />
        <div className="px-3 py-4 sm:px-6 sm:py-8 space-y-4 sm:space-y-5">
          <StatsSkeleton />
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col sm:flex-row min-h-[560px]">
            <SidebarSkeleton />
            <ContentSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="doctor">
      <PageHeader
        title={t("pages.doctor.profile_title", "Doctor Profile")}
        subtitle={
          isForm
            ? (mode === "edit" ? "Update your professional information" : "Fill in the details below to get started")
            : t("pages.doctor.profile_sub", "Manage your professional information")
        }
      />

      <div className="px-3 py-4 sm:px-6 sm:py-8 space-y-4 sm:space-y-5">
        {/* Stats bar — view mode only; show skeletons while background-fetching */}
        {!isForm && (
          isFetchingProfile && !profileData
            ? <StatsSkeleton />
            : stats
              ? (
                <div className="relative">
                  <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 transition-opacity duration-300", isFetchingProfile && "opacity-60")}>
                    <StatCard label="Degree"         value={stats.degree} />
                    <StatCard label="License"        value={stats.license} />
                    <StatCard label="Education"      value={stats.education}      sub="entries" />
                    <StatCard label="Experience"     value={stats.experience}     sub="positions" />
                    <StatCard label="Qualifications" value={stats.qualifications} sub="certs" />
                    <StatCard label="Consult fee"    value={stats.fee}            accent />
                  </div>
                  {/* Subtle refetch indicator — top-right corner dot, no spinner */}
                  {isFetchingProfile && (
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  )}
                </div>
              )
              : null
        )}

        {/* Main card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col sm:flex-row min-h-[560px]">
          {/* Sidebar: show skeleton overlay while background-fetching and no data yet */}
          {isFetchingProfile && !profileData
            ? <SidebarSkeleton />
            : (
              <UnifiedSidebar
                currentStep={currentStep}
                onSelect={setCurrentStep}
                mode={mode}
                profileData={profileData}
                onEdit={openEdit}
                onDelete={handleDelete}
                stepSaveStates={stepSaveStates}
              />
            )
          }

          {/* Right content */}
          {isForm ? (
            <DoctorProfileForm
              mode={mode === "edit" ? "edit" : "create"}
              defaultData={mode === "edit" && profileData ? profileData : undefined}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              onCancel={handleCancel}
              stepSaveStates={stepSaveStates}
              onSaveStep={handleSaveStep}
            />
          ) : isFetchingProfile && !profileData ? (
            <ContentSkeleton />
          ) : profileData ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {activeStep.sectionTitle}
                  </span>
                </div>
                {/* Inline refetch indicator next to Edit button */}
                <div className="flex items-center gap-2">
                  {isFetchingProfile && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Syncing…
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openEdit}
                    className="h-7 text-[11px] gap-1.5 border-border text-muted-foreground hover:text-primary hover:border-primary"
                  >
                    <Pencil size={11} /> Edit
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <SectionViewPanel stepId={activeStep.id} data={profileData} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorProfile;
