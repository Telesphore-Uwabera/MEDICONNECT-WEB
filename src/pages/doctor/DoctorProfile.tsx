// export default DoctorProfile;

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Check,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

// ── Extracted step components & shared modules ───────────────────────────────
import {
  STEPS,
  SOCIAL_PLATFORMS,
  LANGUAGES,
} from "../doctor/profile/Constants";

import type {
  DoctorProfileData,
  StepSaveState,
  StepSaveStates,
  EducationMutationResponse,
  ExperienceMutationResponse,
  QualificationMutationResponse,
} from "../doctor/profile/Types";

// ── API hooks ────────────────────────────────────────────────────────────────
import {
  useGetDoctorProfile,
  useUpsertDoctorProfile,
  useUploadProfileImage,
  useUploadDoctorDocument,
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
  type UpsertProfilePayload,
} from "@/hooks/doctor/use-doctor-profile";
import { DoctorProfileForm } from "./profile/Doctorprofileform";
import { StepSaveStatusBadge } from "./profile/Stepsavestatusbadge";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatFee = (fee: number | string, currency: string) =>
  `${currency} ${Number(fee).toLocaleString()}`;

const formatDateDisplay = (d: string) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
    : "—";

const toDateInputValue = (isoOrDate: string | null | undefined): string => {
  if (!isoOrDate) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const BASE_URL = import.meta.env.VITE_APP_STORAGE_URL ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// API → Form mapper
// ─────────────────────────────────────────────────────────────────────────────
function mapApiProfileToFormData(doc: APIDoctorProfile): DoctorProfileData {
  return {
    personal: {
      doctor_degree: doc.doctor_degree ?? "",
      medical_license: doc.medical_license ?? "",
      designations: doc.designations ?? "",
      bio_en: doc.bio_en ?? "",
      bio_fr: doc.bio_fr ?? "",
      bio_kiny: doc.bio_kiny ?? "",
      preferred_language: doc.preferred_language ?? "en",
    },

    specializations: {
      primary: doc.specialization ?? "",
      specialization_fee_id: doc.specialization_fee_id ?? null,
      years_of_experience: doc.years_of_experience ?? 0,
      fee_name: doc.specialization_fee?.sub_specialization ?? undefined,
      tier_name: doc.specialization_fee?.tier_name ?? undefined,
      online_fee: doc.specialization_fee?.online_fee
        ? parseFloat(String(doc.specialization_fee.online_fee))
        : undefined,
      in_person_fee: doc.specialization_fee?.in_person_fee
        ? parseFloat(String(doc.specialization_fee.in_person_fee))
        : undefined,
      fee_currency: doc.specialization_fee?.currency ?? undefined,
    },

    education: (doc.educations ?? []).map((e) => ({
      id: String(e.id),
      apiId: e.id,
      degree: e.degree,
      institution: e.institution,
      country: e.country,
      start_year: Number(e.start_year),
      end_year: Number(e.end_year ?? new Date().getFullYear()),
    })),
    experience: (doc.experiences ?? []).map((e) => ({
      id: String(e.id),
      apiId: e.id,
      job_title: e.job_title,
      workplace: e.workplace,
      country: e.country,
      start_date: toDateInputValue(e.start_date),
      end_date: e.end_date ? toDateInputValue(e.end_date) : null,
      is_current: Boolean(e.is_current),
    })),
    qualifications: (doc.qualifications ?? []).map((q) => ({
      id: String(q.id),
      apiId: q.id,
      title: q.title,
      issuing_body: q.issuing_body,
      issued_at: toDateInputValue(q.issued_at),
      expires_at: q.expires_at ? toDateInputValue(q.expires_at) : "",
    })),
    documents: {
      profile_image: null,
      degree_document: null,
      license_document: null,
      national_id_document: null,
      existing: {
        // ── profile image from top-level `image` field ──────────────────
        profile_image_url: doc.image ?? null,
        // ── documents ───────────────────────────────────────────────────
        degree_document_url: doc.documents?.degree_document?.url
          ? doc.documents.degree_document.url
          : doc.documents?.degree_document?.path
            ? `${BASE_URL}/${doc.documents.degree_document.path}`
            : null,
        medical_license_document_url: doc.documents?.medical_license_document
          ?.url
          ? doc.documents.medical_license_document.url
          : doc.documents?.medical_license_document?.path
            ? `${BASE_URL}/${doc.documents.medical_license_document.path}`
            : null,
        national_id_document_url: doc.documents?.national_id_document?.url
          ? doc.documents.national_id_document.url
          : doc.documents?.national_id_document?.path
            ? `${BASE_URL}/${doc.documents.national_id_document.path}`
            : null,
      },
    },
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
// Helpers — save-state seeding & step data detection
// ─────────────────────────────────────────────────────────────────────────────
function computeInitialSaveStates(d: DoctorProfileData): StepSaveStates {
  const s: StepSaveStates = {};
  if (d.personal.doctor_degree || d.personal.medical_license)
    s["personal"] = "saved";
  if (d.specializations.primary) s["specializations"] = "saved";
  if (d.education.length) s["education"] = "saved";
  if (d.experience.length) s["experience"] = "saved";
  if (d.qualifications.length) s["qualifications"] = "saved";
  if (Object.values(d.linksSection).some(Boolean)) s["linksSection"] = "saved";

  // ── ADD THIS ────────────────────────────────────────────────────────────
  if (
    d.documents.existing?.profile_image_url ||
    d.documents.existing?.degree_document_url ||
    d.documents.existing?.medical_license_document_url ||
    d.documents.existing?.national_id_document_url
  )
    s["documents"] = "saved";
  // ────────────────────────────────────────────────────────────────────────

  return s;
}

function stepHasData(stepId: string, data: DoctorProfileData | null): boolean {
  if (!data) return false;
  switch (stepId) {
    case "personal":
      return !!(data.personal.doctor_degree || data.personal.medical_license);
    case "specializations":
      return !!data.specializations.primary;
    case "education":
      return data.education.length > 0;
    case "experience":
      return data.experience.length > 0;
    case "qualifications":
      return data.qualifications.length > 0;
    case "documents":
      return !!(
        data.documents.profile_image ||
        data.documents.degree_document ||
        data.documents.license_document ||
        data.documents.national_id_document ||
        data.documents.existing?.profile_image_url ||
        data.documents.existing?.degree_document_url ||
        data.documents.existing?.medical_license_document_url ||
        data.documents.existing?.national_id_document_url
      );
    case "linksSection":
      return Object.values(data.linksSection).some(Boolean);
    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton components
// ─────────────────────────────────────────────────────────────────────────────
const StatsSkeleton = React.memo(function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm flex flex-col gap-1.5"
        >
          <Skeleton className="h-2.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-2 w-12 rounded" />
        </div>
      ))}
    </div>
  );
});

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
          <div
            key={step.id}
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-md"
          >
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

const ContentSkeleton = React.memo(function ContentSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="w-1.5 h-1.5 rounded-full" />
          <Skeleton className="h-2.5 w-36 rounded" />
        </div>
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
      <div className="flex-1 p-4 sm:p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-2 w-20 rounded" />
              <Skeleton className="h-3.5 w-32 rounded" />
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <Skeleton className="h-2 w-16 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-5/6 rounded" />
          <Skeleton className="h-3 w-4/6 rounded" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-muted/40 p-4 space-y-3"
            >
              <Skeleton className="h-3.5 w-40 rounded" />
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-2 w-16 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-2 w-12 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-2 w-10 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = React.memo(function StatCard({
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
          "text-[12px] font-semibold tabular-nums truncate",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ViewField
// ─────────────────────────────────────────────────────────────────────────────
const ViewField = React.memo(function ViewField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
        {label}
      </span>
      <span
        className={cn(
          "text-[13px] font-medium text-foreground leading-snug break-words",
          mono && "font-mono text-[12px]",
          !value && "text-muted-foreground/50 italic",
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EmptyStepPrompt
// ─────────────────────────────────────────────────────────────────────────────
const EmptyStepPrompt = React.memo(function EmptyStepPrompt({
  label,
  onFill,
}: {
  label: string;
  onFill: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4 border border-dashed border-border rounded-lg bg-muted/30">
      <div className="rounded-full bg-muted p-3">
        <Plus className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          No {label.toLowerCase()} added yet
        </p>
        <p className="text-[12px] text-muted-foreground">
          Fill in this section to complete your profile.
        </p>
      </div>
      <Button
        onClick={onFill}
        size="sm"
        className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Pencil className="h-3 w-3" /> Add {label}
      </Button>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// View panels
// ─────────────────────────────────────────────────────────────────────────────
const ViewPersonal = React.memo(function ViewPersonal({
  data,
}: {
  data: DoctorProfileData;
}) {
  const p = data.personal;
  const languageLabel = useMemo(
    () =>
      LANGUAGES.find((l) => l.value === p.preferred_language)?.label ??
      p.preferred_language,
    [p.preferred_language],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <ViewField label="Doctor degree" value={p.doctor_degree} />
        <ViewField label="Medical license" value={p.medical_license} mono />
        <ViewField label="Designation" value={p.designations} />
        <ViewField label="Preferred language" value={languageLabel} />
      </div>
      {[
        { lang: "English", value: p.bio_en },
        { lang: "French", value: p.bio_fr },
        { lang: "Kinyarwanda", value: p.bio_kiny },
      ]
        .filter((b) => b.value)
        .map(({ lang, value }) => (
          <div key={lang} className="border-t border-border pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Bio ({lang})
            </p>
            <p className="text-[13px] text-foreground leading-relaxed">
              {value}
            </p>
          </div>
        ))}
    </div>
  );
});

const ViewSpecializations = React.memo(function ViewSpecializations({
  data,
}: {
  data: DoctorProfileData;
}) {
  const s = data.specializations;
  if (!s.primary) return null;

  return (
    <div className="space-y-5">
      <ViewField label="Primary specialization" value={s.primary} />

      {s.years_of_experience > 0 && (
        <ViewField
          label="Years of experience"
          value={`${s.years_of_experience} years`}
        />
      )}

      {s.specialization_fee_id && (s.fee_name || s.tier_name) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Selected fee configuration
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
              ID: {s.specialization_fee_id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <ViewField label="Sub-specialization" value={s.fee_name} />
            {s.tier_name && <ViewField label="Tier" value={s.tier_name} />}
          </div>

          {(s.online_fee !== undefined || s.in_person_fee !== undefined) && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-primary/10">
              {s.in_person_fee !== undefined && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    In-person fee
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {s.fee_currency} {Number(s.in_person_fee).toLocaleString()}
                  </span>
                </div>
              )}
              {s.online_fee !== undefined && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Online fee
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {s.fee_currency} {Number(s.online_fee).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {s.specialization_fee_id && !s.fee_name && (
        <ViewField
          label="Fee configuration ID"
          value={s.specialization_fee_id}
        />
      )}
    </div>
  );
});

const ViewEducation = React.memo(function ViewEducation({
  data,
}: {
  data: DoctorProfileData;
}) {
  if (data.education.length === 0) return null;
  return (
    <div className="space-y-3">
      {data.education.map((edu) => (
        <div
          key={edu.id}
          className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
        >
          <p className="text-[13px] font-semibold text-foreground capitalize">
            {edu.degree}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
            <ViewField label="Institution" value={edu.institution} />
            <ViewField label="Country" value={edu.country} />
            <ViewField
              label="Period"
              value={`${edu.start_year} – ${edu.end_year}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

const ViewExperience = React.memo(function ViewExperience({
  data,
}: {
  data: DoctorProfileData;
}) {
  if (data.experience.length === 0) return null;
  return (
    <div className="space-y-3">
      {data.experience.map((exp) => (
        <div
          key={exp.id}
          className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-foreground">
              {exp.job_title}
            </p>
            {exp.is_current && (
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/15 text-primary">
                Current
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
            <ViewField label="Workplace" value={exp.workplace} />
            <ViewField label="Country" value={exp.country} />
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

const ViewQualifications = React.memo(function ViewQualifications({
  data,
}: {
  data: DoctorProfileData;
}) {
  if (data.qualifications.length === 0) return null;
  const now = new Date();
  return (
    <div className="space-y-3">
      {data.qualifications.map((q) => {
        const isExpired = q.expires_at && new Date(q.expires_at) < now;
        return (
          <div
            key={q.id}
            className={cn(
              "rounded-lg border p-4 space-y-3",
              isExpired
                ? "border-destructive/30 bg-destructive/5"
                : "border-primary/20 bg-primary/5",
            )}
          >
            <p className="text-[13px] font-semibold text-foreground">
              {q.title}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
              <ViewField label="Issuing body" value={q.issuing_body} />
              <ViewField
                label="Issued"
                value={formatDateDisplay(q.issued_at)}
              />
              {q.expires_at && (
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
                    Expires
                  </span>
                  <span
                    className={cn(
                      "text-[13px] font-medium leading-snug",
                      isExpired ? "text-destructive" : "text-primary",
                    )}
                  >
                    {isExpired ? "Expired · " : ""}
                    {formatDateDisplay(q.expires_at)}
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

// ─────────────────────────────────────────────────────────────────────────────
// ViewDocuments
// ─────────────────────────────────────────────────────────────────────────────
const ViewDocuments = React.memo(function ViewDocuments({
  data,
}: {
  data: DoctorProfileData;
}) {
  // Newly selected (unsaved) files
  const newFiles = useMemo<[string, File][]>(
    () =>
      (
        [
          ["Profile photo", data.documents.profile_image],
          ["Degree document", data.documents.degree_document],
          ["Medical license scan", data.documents.license_document],
          ["National ID", data.documents.national_id_document],
        ] as [string, File | null | undefined][]
      ).filter((entry): entry is [string, File] => !!entry[1]),
    [data.documents],
  );

  // Already-uploaded files/images from the API
  const existingFiles = useMemo<[string, string][]>(() => {
    const ex = data.documents.existing;
    if (!ex) return [];
    return (
      [
        ["Profile photo", ex.profile_image_url],
        ["Degree document", ex.degree_document_url],
        ["Medical license scan", ex.medical_license_document_url],
        ["National ID", ex.national_id_document_url],
      ] as [string, string | null][]
    ).filter((entry): entry is [string, string] => !!entry[1]);
  }, [data.documents.existing]);

  if (newFiles.length === 0 && existingFiles.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Pending new files (not yet saved) */}
      {newFiles.map(([label, file]) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
        >
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-[13px] font-medium text-foreground truncate">
              {file.name}
            </p>
          </div>
        </div>
      ))}

      {/* Existing uploaded files from API */}
      {existingFiles.map(([label, url]) =>
        label === "Profile photo" ? (
          // ── Profile image: show as avatar thumbnail ──────────────────────
          <div
            key="existing-profile-photo"
            className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
          >
            <img
              src={url}
              alt="Profile photo"
              className="h-10 w-10 rounded-full object-cover shrink-0 border border-border"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Profile photo
              </p>
              <p className="text-[13px] font-medium text-foreground">
                Uploaded
              </p>
            </div>
          </div>
        ) : (
          // ── Other documents: link to open in new tab ─────────────────────
          <a
            key={`existing-${label}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
          >
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
              <p className="text-[13px] font-medium text-primary truncate group-hover:underline">
                View uploaded file
              </p>
            </div>
          </a>
        ),
      )}
    </div>
  );
});

const ViewSocialLinks = React.memo(function ViewSocialLinks({
  data,
}: {
  data: DoctorProfileData;
}) {
  const filledLinks = useMemo(
    () => SOCIAL_PLATFORMS.filter(({ key }) => !!data.linksSection[key]),
    [data.linksSection],
  );
  if (filledLinks.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2">
      {filledLinks.map(({ key, label }) => (
        <a
          key={key}
          href={data.linksSection[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
        >
          <Link2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-28 shrink-0">
            {label}
          </span>
          <span className="text-[12px] text-primary truncate">
            {data.linksSection[key]}
          </span>
        </a>
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SectionViewPanel
// ─────────────────────────────────────────────────────────────────────────────
function SectionViewPanel({
  stepId,
  data,
  onFill,
}: {
  stepId: (typeof STEPS)[number]["id"];
  data: DoctorProfileData;
  onFill: () => void;
}) {
  const hasData = stepHasData(stepId, data);
  const stepLabel = STEPS.find((s) => s.id === stepId)?.label ?? stepId;
  if (!hasData) return <EmptyStepPrompt label={stepLabel} onFill={onFill} />;

  switch (stepId) {
    case "personal":
      return <ViewPersonal data={data} />;
    case "specializations":
      return <ViewSpecializations data={data} />;
    case "education":
      return <ViewEducation data={data} />;
    case "experience":
      return <ViewExperience data={data} />;
    case "qualifications":
      return <ViewQualifications data={data} />;
    case "documents":
      return <ViewDocuments data={data} />;
    case "linksSection":
      return <ViewSocialLinks data={data} />;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UnifiedSidebar
// ─────────────────────────────────────────────────────────────────────────────
const UnifiedSidebar = React.memo(function UnifiedSidebar({
  currentStep,
  onSelect,
  mode,
  profileData,
  onEdit,
  onDelete,
  stepSaveStates,
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
    const saved = Object.values(stepSaveStates).filter(
      (s) => s === "saved",
    ).length;
    return { savedCount: saved, pct: Math.round((saved / STEPS.length) * 100) };
  }, [stepSaveStates]);

  const profileSummary = useMemo(() => {
    if (!profileData) return null;
    const fee =
      profileData.specializations.in_person_fee ??
      profileData.specializations.online_fee;
    const feeCurrency = profileData.specializations.fee_currency ?? "RWF";
    return {
      initials:
        profileData.specializations.primary.slice(0, 2).toUpperCase() || "DR",
      specialization:
        profileData.specializations.primary ||
        profileData.personal.doctor_degree,
      license: profileData.personal.medical_license,
      degree: profileData.personal.doctor_degree,
      fee: fee ? formatFee(fee, feeCurrency) : "—",
    };
  }, [profileData]);

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
              {savedCount} of {STEPS.length} sections saved
            </p>
          </div>
        ) : profileSummary ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                {profileSummary.initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {profileSummary.specialization}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                  {profileSummary.license}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: "Degree", value: profileSummary.degree },
                { label: "Fee", value: profileSummary.fee },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center gap-2"
                >
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {label}
                  </span>
                  <span className="text-[10px] font-medium text-foreground truncate text-right">
                    {value}
                  </span>
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
          const isEmpty = !isForm && !stepHasData(step.id, profileData);

          return (
            <button
              key={step.id}
              onClick={() => onSelect(i)}
              className={cn(
                "flex shrink-0 sm:shrink sm:w-full items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-md text-left transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isEmpty
                    ? "text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold border transition-all",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : isSaved
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : isDirty
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-600"
                        : isEmpty
                          ? "bg-muted/50 border-border/50 text-muted-foreground/40"
                          : "bg-muted border-border text-muted-foreground",
                )}
              >
                {isSaved ? (
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
                      isActive
                        ? "text-primary"
                        : isEmpty
                          ? "text-muted-foreground/50"
                          : "",
                    )}
                  >
                    {step.label}
                  </span>
                  {isForm ? (
                    <StepSaveStatusBadge
                      state={isActive ? "idle" : saveState}
                    />
                  ) : isEmpty ? (
                    <span className="text-[9px] text-muted-foreground/40 shrink-0">
                      Empty
                    </span>
                  ) : null}
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
            <Trash2 size={12} /> Delete
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
// Main page
// ─────────────────────────────────────────────────────────────────────────────
type Mode = "view" | "create" | "edit";

const DoctorProfile = () => {
  const { t, i18n } = useTranslation();

  // ── API ─────────────────────────────────────────────────────────────────────
  const {
    data: apiData,
    isLoading: isLoadingProfile,
    isFetching: isFetchingProfile,
  } = useGetDoctorProfile();

  const upsertProfile = useUpsertDoctorProfile();
  const uploadImage = useUploadProfileImage();
  const uploadDocument = useUploadDoctorDocument();
  const addEducation = useAddEducation();
  const updateEducation = useUpdateEducation();
  const deleteEducation = useDeleteEducation();
  const addExperience = useAddExperience();
  const updateExperience = useUpdateExperience();
  const deleteExperience = useDeleteExperience();
  const addQualification = useAddQualification();
  const updateQualification = useUpdateQualification();
  const deleteQualification = useDeleteQualification();
  const setSocialLinks = useSetSocialLinks();

  // ── Local state ─────────────────────────────────────────────────────────────
  const [profileData, setProfileData] = useState<DoctorProfileData | null>(null);
  const [mode, setMode] = useState<Mode>("create");
  const [currentStep, setCurrentStep] = useState(0);
  const [stepSaveStates, setStepSaveStates] = useState<StepSaveStates>({});

  // Seed from API on first load
  useEffect(() => {
    if (apiData?.doctor) {
      const mapped = mapApiProfileToFormData(apiData.doctor);
      setProfileData(mapped);
      setMode("view");
      setStepSaveStates(computeInitialSaveStates(mapped));
    }
  }, [apiData]);

  const isForm = mode === "create" || mode === "edit";

  const setStepState = useCallback((stepId: string, state: StepSaveState) => {
    setStepSaveStates((prev) => ({ ...prev, [stepId]: state }));
  }, []);

  // ── Navigation helpers ───────────────────────────────────────────────────────
  const handleFillStep = useCallback((stepId: string) => {
    const idx = STEPS.findIndex((s) => s.id === stepId);
    if (idx !== -1) setCurrentStep(idx);
    setMode("edit");
  }, []);

  const openEdit = useCallback(() => setMode("edit"), []);
  const handleDelete = useCallback(() => {
    setProfileData(null);
    setCurrentStep(0);
    setStepSaveStates({});
    setMode("create");
  }, []);
  const handleCancel = useCallback(() => {
    if (profileData) setMode("view");
    else {
      setCurrentStep(0);
      setStepSaveStates({});
    }
  }, [profileData]);

  // ── Sync helpers ─────────────────────────────────────────────────────────────
  const syncEducation = useCallback(
    async (
      newEntries: DoctorProfileData["education"],
      oldEntries: DoctorProfileData["education"],
    ): Promise<DoctorProfileData["education"]> => {
      const newApiIds = new Set(newEntries.map((e) => e.apiId).filter(Boolean));
      for (const old of oldEntries) {
        if (old.apiId && !newApiIds.has(old.apiId))
          await deleteEducation.mutateAsync(old.apiId);
      }
      const updated: DoctorProfileData["education"] = [];
      for (const entry of newEntries) {
        const payload = {
          degree: entry.degree,
          institution: entry.institution,
          country: entry.country,
          start_year: Number(entry.start_year),
          end_year: entry.end_year ? Number(entry.end_year) : null,
        };
        if (entry.apiId) {
          const res = (await updateEducation.mutateAsync({
            id: entry.apiId,
            ...payload,
          })) as EducationMutationResponse;
          updated.push({ ...entry, apiId: res?.education?.id ?? entry.apiId });
        } else {
          const res = (await addEducation.mutateAsync(payload)) as EducationMutationResponse;
          const newId = res?.education?.id;
          updated.push({
            ...entry,
            apiId: newId,
            id: newId ? String(newId) : entry.id,
          });
        }
      }
      return updated;
    },
    [addEducation, updateEducation, deleteEducation],
  );

  const syncExperience = useCallback(
    async (
      newEntries: DoctorProfileData["experience"],
      oldEntries: DoctorProfileData["experience"],
    ): Promise<DoctorProfileData["experience"]> => {
      const newApiIds = new Set(newEntries.map((e) => e.apiId).filter(Boolean));
      for (const old of oldEntries) {
        if (old.apiId && !newApiIds.has(old.apiId))
          await deleteExperience.mutateAsync(old.apiId);
      }
      const updated: DoctorProfileData["experience"] = [];
      for (const entry of newEntries) {
        const payload = {
          job_title: entry.job_title,
          workplace: entry.workplace,
          country: entry.country,
          start_date: entry.start_date,
          end_date: entry.is_current ? null : (entry.end_date ?? null),
          is_current: Boolean(entry.is_current),
        };
        if (entry.apiId) {
          const res = (await updateExperience.mutateAsync({
            id: entry.apiId,
            ...payload,
          })) as ExperienceMutationResponse;
          updated.push({ ...entry, apiId: res?.experience?.id ?? entry.apiId });
        } else {
          const res = (await addExperience.mutateAsync(payload)) as ExperienceMutationResponse;
          const newId = res?.experience?.id;
          updated.push({
            ...entry,
            apiId: newId,
            id: newId ? String(newId) : entry.id,
          });
        }
      }
      return updated;
    },
    [addExperience, updateExperience, deleteExperience],
  );

  const syncQualifications = useCallback(
    async (
      newEntries: DoctorProfileData["qualifications"],
      oldEntries: DoctorProfileData["qualifications"],
    ): Promise<DoctorProfileData["qualifications"]> => {
      const newApiIds = new Set(newEntries.map((e) => e.apiId).filter(Boolean));
      for (const old of oldEntries) {
        if (old.apiId && !newApiIds.has(old.apiId))
          await deleteQualification.mutateAsync(old.apiId);
      }
      const updated: DoctorProfileData["qualifications"] = [];
      for (const entry of newEntries) {
        const payload = {
          title: entry.title,
          issuing_body: entry.issuing_body,
          issued_at: entry.issued_at,
          expires_at: entry.expires_at || undefined,
          certificate_file: entry.certificate_file ?? undefined,
        };
        if (entry.apiId) {
          const res = (await updateQualification.mutateAsync({
            id: entry.apiId,
            ...payload,
          })) as QualificationMutationResponse;
          updated.push({
            ...entry,
            apiId: res?.qualification?.id ?? entry.apiId,
          });
        } else {
          const res = (await addQualification.mutateAsync(payload)) as QualificationMutationResponse;
          const newId = res?.qualification?.id;
          updated.push({
            ...entry,
            apiId: newId,
            id: newId ? String(newId) : entry.id,
          });
        }
      }
      return updated;
    },
    [addQualification, updateQualification, deleteQualification],
  );

  // ── Save step ────────────────────────────────────────────────────────────────
  const handleSaveStep = useCallback(
    async (stepId: string, data: Partial<DoctorProfileData>) => {
      setStepState(stepId, "saving");
      try {
        switch (stepId) {
          case "personal": {
            await upsertProfile.mutateAsync({
              doctor_degree: data.personal!.doctor_degree,
              medical_license: data.personal!.medical_license,
              bio_en: data.personal!.bio_en,
              preferred_language: data.personal!.preferred_language,
              is_available: true,
              bio_fr: data.personal!.bio_fr,
              bio_kiny: data.personal!.bio_kiny,
            });
            setProfileData((prev) =>
              prev
                ? { ...prev, personal: data.personal! }
                : { ...({} as DoctorProfileData), personal: data.personal! },
            );
            break;
          }
          case "specializations": {
            const payload: UpsertProfilePayload = {};
            if (data.specializations?.primary)
              payload.specialization = data.specializations.primary;
            if (data.specializations?.specialization_fee_id !== undefined)
              payload.specialization_fee_id =
                data.specializations.specialization_fee_id;
            if (data.specializations?.years_of_experience !== undefined)
              payload.years_of_experience =
                data.specializations.years_of_experience;
            if (Object.keys(payload).length > 0)
              await upsertProfile.mutateAsync(payload);
            setProfileData((prev) =>
              prev
                ? { ...prev, specializations: data.specializations! }
                : null,
            );
            break;
          }
          case "education": {
            const updated = await syncEducation(
              data.education!,
              profileData?.education ?? [],
            );
            setProfileData((prev) =>
              prev ? { ...prev, education: updated } : null,
            );
            break;
          }
          case "experience": {
            const updated = await syncExperience(
              data.experience!,
              profileData?.experience ?? [],
            );
            setProfileData((prev) =>
              prev ? { ...prev, experience: updated } : null,
            );
            break;
          }
          case "qualifications": {
            const updated = await syncQualifications(
              data.qualifications!,
              profileData?.qualifications ?? [],
            );
            setProfileData((prev) =>
              prev ? { ...prev, qualifications: updated } : null,
            );
            break;
          }
          case "documents": {
            const d = data.documents!;
            if (d.profile_image)
              await uploadImage.mutateAsync(d.profile_image);
            if (d.degree_document)
              await uploadDocument.mutateAsync({
                type: "degree_document",
                file: d.degree_document,
              });
            if (d.license_document)
              await uploadDocument.mutateAsync({
                type: "medical_license_document",
                file: d.license_document,
              });
            if (d.national_id_document)
              await uploadDocument.mutateAsync({
                type: "national_id_document",
                file: d.national_id_document,
              });
            setProfileData((prev) => (prev ? { ...prev, documents: d } : null));
            break;
          }
          case "linksSection": {
            const socialPayload: APISocialLinks = {};
            if (data.linksSection!.linkedin)
              socialPayload.linkedin = data.linksSection!.linkedin;
            if (data.linksSection!.twitter)
              socialPayload.twitter = data.linksSection!.twitter;
            if (data.linksSection!.facebook)
              socialPayload.facebook = data.linksSection!.facebook;
            if (data.linksSection!.instagram)
              socialPayload.instagram = data.linksSection!.instagram;
            if (Object.keys(socialPayload).length > 0)
              await setSocialLinks.mutateAsync(socialPayload);
            setProfileData((prev) =>
              prev ? { ...prev, linksSection: data.linksSection! } : null,
            );
            break;
          }
        }
        setStepState(stepId, "saved");
      } catch (err) {
        console.error(`Failed to save step "${stepId}":`, err);
        setStepState(stepId, "error");
      }
    },
    [
      profileData,
      setStepState,
      upsertProfile,
      uploadImage,
      uploadDocument,
      setSocialLinks,
      syncEducation,
      syncExperience,
      syncQualifications,
    ],
  );

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!profileData) return null;
    const fee =
      profileData.specializations.in_person_fee ??
      profileData.specializations.online_fee;
    const feeCurrency = profileData.specializations.fee_currency ?? "RWF";
    return {
      degree: profileData.personal.doctor_degree || "—",
      license: profileData.personal.medical_license || "—",
      education: profileData.education.length,
      experience: profileData.experience.length,
      qualifications: profileData.qualifications.length,
      fee: fee ? formatFee(fee, feeCurrency) : "—",
    };
  }, [profileData]);

  const activeStep = STEPS[currentStep];

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoadingProfile) {
    return (
      <DashboardLayout role="doctor">
        <PageHeader
          title={t("pages.doctor.profile_title", "Doctor Profile")}
          subtitle="Loading your profile…"
        />
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
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

      <div className="px-3 py-4 sm:px-6 sm:py-8 space-y-4 sm:space-y-5">
        {/* Stats bar — view mode only */}
        {!isForm &&
          (isFetchingProfile && !profileData ? (
            <StatsSkeleton />
          ) : stats ? (
            <div className="relative">
              <div
                className={cn(
                  "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 transition-opacity duration-300",
                  isFetchingProfile && "opacity-60",
                )}
              >
                <StatCard label="Degree" value={stats.degree} />
                <StatCard label="License" value={stats.license} />
                <StatCard
                  label="Education"
                  value={stats.education}
                  sub="entries"
                />
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
              </div>
              {isFetchingProfile && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              )}
            </div>
          ) : null)}

        {/* Main card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col sm:flex-row min-h-[560px]">
          {/* Sidebar */}
          {isFetchingProfile && !profileData ? (
            <SidebarSkeleton />
          ) : (
            <UnifiedSidebar
              currentStep={currentStep}
              onSelect={setCurrentStep}
              mode={mode}
              profileData={profileData}
              onEdit={openEdit}
              onDelete={handleDelete}
              stepSaveStates={stepSaveStates}
            />
          )}

          {/* Right panel */}
          {isForm ? (
            <DoctorProfileForm
              mode={mode === "edit" ? "edit" : "create"}
              defaultData={
                mode === "edit" && profileData ? profileData : undefined
              }
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
              {/* Content header */}
              <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {activeStep.sectionTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isFetchingProfile && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Syncing…
                    </span>
                  )}
                  {stepHasData(activeStep.id, profileData) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openEdit}
                      className="h-7 text-[11px] gap-1.5 border-border text-muted-foreground hover:text-primary hover:border-primary"
                    >
                      <Pencil size={11} /> Edit
                    </Button>
                  )}
                </div>
              </div>

              {/* Content body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <SectionViewPanel
                  stepId={activeStep.id}
                  data={profileData}
                  onFill={() => handleFillStep(activeStep.id)}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorProfile;
