// // ─────────────────────────────────────────────────────────────────────────────
// // DoctorProfileForm
// // Orchestrates all step sub-forms. Receives currentStep / onStepChange from
// // the parent so the sidebar can also control navigation.
// // ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Save } from "lucide-react";

import { STEPS, CURRENCIES, CONSULTATION_TYPES, LANGUAGES } from "./Constants";
import { FormField } from "./UiPrimitives";
import { SpecializationsStep } from "./Specializationsstep";
import { EducationStep } from "./Educationstep";
import { ExperienceStep } from "./Experiencestep";
import { QualificationsStep } from "./Qualificationsstep";
import { SocialLinksStep } from "./Sociallinksstep";
import { FileUploadBox } from "./Fileuploadbox";
import { StepSaveStatusBadge } from "./Stepsavestatusbadge";

import type {
  PersonalInfo,
  SpecializationsInfo,
  EducationEntry,
  ExperienceEntry,
  QualificationEntry,
  DocumentsInfo,
  SocialLinksInfo,
  DoctorProfileData,
  StepSaveStates,
} from "./Types";

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SPECIALIZATIONS: SpecializationsInfo = {
  primary: "",
  specialization_fee_id: null,
  years_of_experience: 0,
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

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface DoctorProfileFormProps {
  mode: "create" | "edit";
  defaultData?: Partial<DoctorProfileData>;
  currentStep: number;
  onStepChange: (i: number) => void;
  onCancel: () => void;
  stepSaveStates: StepSaveStates;
  onSaveStep: (
    stepId: string,
    data: Partial<DoctorProfileData>,
  ) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function DoctorProfileForm({
  mode,
  defaultData,
  currentStep,
  onStepChange,
  onCancel,
  stepSaveStates,
  onSaveStep,
}: DoctorProfileFormProps) {
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

  // Sync when defaultData changes (switching edit → view → edit)
  useEffect(() => {
    if (defaultData?.specializations)
      setSpecializations(defaultData.specializations);
    if (defaultData?.education) setEducation(defaultData.education);
    if (defaultData?.experience) setExperience(defaultData.experience);
    if (defaultData?.qualifications)
      setQualifications(defaultData.qualifications);
    if (defaultData?.linksSection) setLinksSection(defaultData.linksSection);
  }, [defaultData]);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<PersonalInfo>({ defaultValues: defaultData?.personal });

  const step = STEPS[currentStep];
  const currentSaveState = stepSaveStates[step.id] ?? "idle";
  const isSaving = currentSaveState === "saving";

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (step.id === "personal") {
      const valid = await trigger();
      if (!valid) return;
      handleSubmit(async (personal) => {
        await onSaveStep("personal", { personal });
      })();
      return;
    }

    const payloads: Record<string, Partial<DoctorProfileData>> = {
      specializations: { specializations },
      education: { education },
      experience: { experience },
      qualifications: { qualifications },
      documents: { documents },
      linksSection: { linksSection },
    };

    if (payloads[step.id]) await onSaveStep(step.id, payloads[step.id]);
  }, [
    step.id,
    trigger,
    handleSubmit,
    onSaveStep,
    specializations,
    education,
    experience,
    qualifications,
    documents,
    linksSection,
  ]);

  // ── Document handlers (stable refs) ─────────────────────────────────────────
  const handleProfileImageChange = useCallback(
    (f: File | null) => setDocuments((d) => ({ ...d, profile_image: f })),
    [],
  );
  const handleDegreeDocChange = useCallback(
    (f: File | null) => setDocuments((d) => ({ ...d, degree_document: f })),
    [],
  );
  const handleLicenseDocChange = useCallback(
    (f: File | null) => setDocuments((d) => ({ ...d, license_document: f })),
    [],
  );
  const handleNationalIdChange = useCallback(
    (f: File | null) =>
      setDocuments((d) => ({ ...d, national_id_document: f })),
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {step.sectionTitle}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <StepSaveStatusBadge state={currentSaveState} />
          <span className="text-[10px] text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
      </div>

      {/* Body */}
      <div key={currentStep} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* ── Personal ──────────────────────────────────────────────────── */}
        {step.id === "personal" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Doctor degree *"
              error={errors.doctor_degree?.message}
            >
              <Input
                {...register("doctor_degree", { required: "Required" })}
                placeholder="MBBS"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label="Medical license *"
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
                placeholder="Dr. John Doe"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
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

            <FormField
              label="Bio (English) *"
              error={errors.bio_en?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Textarea
                {...register("bio_en", { required: "Required" })}
                placeholder="Experienced doctor with 10 years in general medicine"
                className="border-border focus-visible:ring-primary text-xs resize-none"
                rows={3}
              />
            </FormField>

            <FormField
              label="Bio (French)"
              className="col-span-1 sm:col-span-2"
            >
              <Textarea
                {...register("bio_fr")}
                placeholder="Médecin expérimenté avec 10 ans en médecine générale"
                className="border-border focus-visible:ring-primary text-xs resize-none"
                rows={2}
              />
            </FormField>

            <FormField
              label="Bio (Kinyarwanda)"
              className="col-span-1 sm:col-span-2"
            >
              <Textarea
                {...register("bio_kiny")}
                placeholder="Umuganga w'inzobere ufite imyaka 10"
                className="border-border focus-visible:ring-primary text-xs resize-none"
                rows={2}
              />
            </FormField>
          </div>
        )}

        {/* ── Specializations ───────────────────────────────────────────── */}
        {step.id === "specializations" && (
          <SpecializationsStep
            data={specializations}
            onChange={setSpecializations}
          />
        )}

        {/* ── Education ─────────────────────────────────────────────────── */}
        {step.id === "education" && (
          <EducationStep entries={education} onChange={setEducation} />
        )}

        {/* ── Experience ────────────────────────────────────────────────── */}
        {step.id === "experience" && (
          <ExperienceStep entries={experience} onChange={setExperience} />
        )}

        {/* ── Qualifications ────────────────────────────────────────────── */}
        {step.id === "qualifications" && (
          <QualificationsStep
            entries={qualifications}
            onChange={setQualifications}
          />
        )}

        {/* ── Documents ─────────────────────────────────────────────────── */}
        {step.id === "documents" && (
          <div className="grid grid-cols-1 gap-4">
            <p className="text-[11px] text-muted-foreground -mt-2 mb-1">
              Upload your profile photo, degree certificate, medical license,
              and national ID. JPEG, PNG, PDF · max 4 MB each.
            </p>
            <FileUploadBox
              label="Profile photo"
              accept="image/jpeg,image/png,image/webp"
              file={documents.profile_image}
              onChange={handleProfileImageChange}
            />
            <FileUploadBox
              label="Degree document"
              accept="image/jpeg,image/png,application/pdf"
              file={documents.degree_document}
              onChange={handleDegreeDocChange}
            />
            <FileUploadBox
              label="Medical license scan"
              accept="image/jpeg,image/png,application/pdf"
              file={documents.license_document}
              onChange={handleLicenseDocChange}
            />
            <FileUploadBox
              label="National ID"
              accept="image/jpeg,image/png,application/pdf"
              file={documents.national_id_document}
              onChange={handleNationalIdChange}
            />
          </div>
        )}

        {/* ── Social Links ──────────────────────────────────────────────── */}
        {step.id === "linksSection" && (
          <SocialLinksStep data={linksSection} onChange={setLinksSection} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="border-border text-xs"
          >
            Cancel
          </Button>
          {currentStep > 0 && (
            <Button
              variant="ghost"
              onClick={() => onStepChange(currentStep - 1)}
              disabled={isSaving}
              className="text-xs text-muted-foreground"
            >
              ← Back
            </Button>
          )}
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:block">
          Step {currentStep + 1} of {STEPS.length}
        </span>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </>
            ) : currentSaveState === "saved" ? (
              <>
                <Check className="h-3 w-3" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                Save section
              </>
            )}
          </Button>

          {currentStep < STEPS.length - 1 && (
            <Button
              variant="outline"
              onClick={() => onStepChange(currentStep + 1)}
              disabled={isSaving}
              className="text-xs border-border"
            >
              Next →
            </Button>
          )}

          {currentStep === STEPS.length - 1 && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              className="text-xs border-border"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
