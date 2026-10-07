// // ─────────────────────────────────────────────────────────────────────────────
// // DoctorProfileForm
// // Orchestrates all step sub-forms. Receives currentStep / onStepChange from
// // the parent so the sidebar can also control navigation.
// // ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasRichTextContent, RichTextarea } from "@/components/ui/rich-textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { STEPS, CONSULTATION_TYPES, LANGUAGES } from "./Constants";
import { Switch } from "@/components/ui/switch";
import { useGetPublicInsurances } from "@/hooks/hospital/use-hopital-insurances";
import { FormField } from "./UiPrimitives";
import { SpecializationsStep } from "./Specializationsstep";
import { EducationStep } from "./Educationstep";
import { ExperienceStep, experienceCanSave } from "./Experiencestep";
import { checkSocialLinks } from "@/lib/social-link";
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
  licenseExpiresAt?: string | null;
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
  licenseExpiresAt,
}: DoctorProfileFormProps) {
  const { t } = useTranslation();
  const { data: insuranceCatalog } = useGetPublicInsurances();
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
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
    watch,
    getValues,
    formState: { errors },
  } = useForm<PersonalInfo>({
    defaultValues: {
      consultation_type: "online",
      instant_consultation: false,
      insurance_ids: [],
      working_days: [],
      city: "",
      gender: "",
      ...defaultData?.personal,
    },
    shouldUnregister: false,
  });

  useEffect(() => {
    const requiredRichText = (value?: string) =>
      hasRichTextContent(value) || t("profile.required");

    register("bio_en", { validate: requiredRichText });
    register("bio_fr", { validate: requiredRichText });
    register("bio_kiny", { validate: requiredRichText });
    register("consultation_type", { required: t("profile.required") });
    register("gender");
    register("instant_consultation");
    register("insurance_ids");
    register("working_days");
    if (!getValues("consultation_type")) setValue("consultation_type", "online");
  }, [getValues, register, setValue, t]);

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

    if (step.id === "experience" && !experienceCanSave(experience)) {
      toast({
        variant: "destructive",
        title: t("doctorProfile.experience_dates_invalid"),
      });
      return;
    }

    if (step.id === "linksSection") {
      const results = await checkSocialLinks({
        linkedin: linksSection.linkedin,
        twitter: linksSection.twitter,
        facebook: linksSection.facebook,
        instagram: linksSection.instagram,
      });
      if (Object.values(results).some((result) => result && !result.ok)) {
        toast({
          variant: "destructive",
          title: t("doctorProfile.social_links_invalid"),
        });
        return;
      }
    }

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
    t,
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
  const handleSignatureChange = useCallback(
    (f: File | null) => setDocuments((d) => ({ ...d, signature_file: f })),
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t(`doctorProfile.steps.${step.id}.title`)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <StepSaveStatusBadge state={currentSaveState} />
          <span className="text-[10px] text-muted-foreground">
            {t("profile.step_of", { current: currentStep + 1, total: STEPS.length })}
          </span>
        </div>
      </div>

      {/* Body */}
      <div key={currentStep} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* ── Personal ──────────────────────────────────────────────────── */}
        {step.id === "personal" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={`${t("doctorProfile.doctor_degree")} *`}
              error={errors.doctor_degree?.message}
            >
              <Input
                {...register("doctor_degree", { required: t("profile.required") })}
                placeholder="MBBS"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={`${t("doctorProfile.medical_license")} *`}
              error={errors.medical_license?.message}
            >
              <Input
                {...register("medical_license", { required: t("profile.required") })}
                placeholder="RW-MED-2024-001"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>

            <FormField label={t("doctorProfile.license_expires", { defaultValue: "License expires" })}>
              <Input
                type="date"
                value={licenseExpiresAt ? String(licenseExpiresAt).slice(0, 10) : ""}
                readOnly
                disabled
                className="border-border text-xs h-9"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("doctorProfile.license_expires_admin", {
                  defaultValue: "Only an admin can set or change this date. You and the admin are emailed when 30 days or fewer remain.",
                })}
              </p>
            </FormField>

            <FormField label={t("doctorProfile.designations")}>
              <Input
                {...register("designations")}
                placeholder="Dr. John Doe"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label={`${t("doctorProfile.city")} *`} error={errors.city?.message}>
              <Input
                {...register("city", { required: t("profile.required") })}
                placeholder="Kigali"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label={t("doctorProfile.gender")}>
              <Select
                value={watch("gender") || undefined}
                onValueChange={(v) => setValue("gender", v, { shouldDirty: true })}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("doctorProfile.gender_male")}</SelectItem>
                  <SelectItem value="female">{t("doctorProfile.gender_female")}</SelectItem>
                  <SelectItem value="other">{t("doctorProfile.gender_other")}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={`${t("doctorProfile.consultation_type")} *`} error={errors.consultation_type?.message}>
              <Select
                value={watch("consultation_type") || "online"}
                onValueChange={(v) => setValue("consultation_type", v as PersonalInfo["consultation_type"], { shouldDirty: true, shouldValidate: true })}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSULTATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(`doctorProfile.consultation_types.${type.value}`, type.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={t("doctorProfile.instant_consultation")}>
              <div className="flex h-9 items-center justify-between gap-3 rounded-[6px] border border-border px-3">
                <span className="text-[11px] text-muted-foreground">{t("doctorProfile.instant_consultation_hint")}</span>
                <Switch
                  checked={Boolean(watch("instant_consultation"))}
                  onCheckedChange={(checked) => setValue("instant_consultation", checked, { shouldDirty: true })}
                />
              </div>
            </FormField>

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("doctorProfile.insurances")}</p>
              {insuranceCatalog?.length ? (
                <div className="flex flex-wrap gap-2">
                  {insuranceCatalog.map((item) => {
                    const selected = (watch("insurance_ids") ?? []).includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const current = watch("insurance_ids") ?? [];
                          setValue(
                            "insurance_ids",
                            selected ? current.filter((id) => id !== item.id) : [...current, item.id],
                            { shouldDirty: true },
                          );
                        }}
                        className={`rounded-[6px] border px-2.5 py-1 text-[11px] font-medium ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">{t("doctorProfile.no_insurances")}</p>
              )}
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("doctorProfile.working_days")}</p>
              <div className="flex flex-wrap gap-2">
                {weekdays.map((day) => {
                  const selected = (watch("working_days") ?? []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const current = watch("working_days") ?? [];
                        setValue(
                          "working_days",
                          selected ? current.filter((item) => item !== day) : [...current, day],
                          { shouldDirty: true },
                        );
                      }}
                      className={`rounded-[6px] border px-2.5 py-1 text-[11px] font-medium ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t(`doctorProfile.days.${day}`)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">{t("doctorProfile.working_days_hint")}</p>
            </div>

            <FormField label={t("doctorProfile.preferred_language")}>
              <Select
                value={watch("preferred_language") ?? "en"}
                onValueChange={(v) => setValue("preferred_language", v, { shouldDirty: true, shouldValidate: true })}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {t(`pages.landing.lang_${l.value === "kiny" ? "rw" : l.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label={`${t("doctorProfile.bio_label", { lang: t("pages.landing.lang_en") })} *`}
              error={errors.bio_en?.message}
              className="col-span-1 sm:col-span-2"
            >
              <RichTextarea
                value={watch("bio_en") ?? ""}
                onChange={(value) =>
                  setValue("bio_en", value, { shouldDirty: true, shouldValidate: true })
                }
                placeholder="Experienced doctor with 10 years in general medicine"
                minHeight={120}
                editorClassName="text-xs"
              />
            </FormField>

            <FormField
              label={`${t("doctorProfile.bio_label", { lang: t("pages.landing.lang_fr") })} *`}
              error={errors.bio_fr?.message}
              className="col-span-1 sm:col-span-2"
            >
              <RichTextarea
                value={watch("bio_fr") ?? ""}
                onChange={(value) =>
                  setValue("bio_fr", value, { shouldDirty: true, shouldValidate: true })
                }
                placeholder="Médecin expérimenté avec 10 ans en médecine générale"
                minHeight={110}
                editorClassName="text-xs"
              />
            </FormField>

            <FormField
              label={`${t("doctorProfile.bio_label", { lang: t("pages.landing.lang_rw") })} *`}
              error={errors.bio_kiny?.message}
              className="col-span-1 sm:col-span-2"
            >
              <RichTextarea
                value={watch("bio_kiny") ?? ""}
                onChange={(value) =>
                  setValue("bio_kiny", value, { shouldDirty: true, shouldValidate: true })
                }
                placeholder="Umuganga w'inzobere ufite imyaka 10"
                minHeight={110}
                editorClassName="text-xs"
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
              {t("doctorProfile.documents_intro")}
            </p>
            <FileUploadBox
              label={t("doctorProfile.profile_photo")}
              accept="image/jpeg,image/png,image/webp"
              file={documents.profile_image}
              existingUrl={documents.existing?.profile_image_url}
              onChange={handleProfileImageChange}
              cropToCard={{
                aspectRatio: 4 / 3,
                targetWidth: 800,
                targetHeight: 600,
                title: t("doctorProfile.fit_card_photo", { defaultValue: "Fit Doctor Photo to Card" }),
                subtitle: t("doctorProfile.fit_card_sub", { defaultValue: "Cut to 800 × 600 px (4:3) so the image fits the card and is fully displayed." }),
              }}
              helperText={t("doctorProfile.crop_helper", { defaultValue: "Card fit: 800 × 600 px (4:3). Large images are cut to fit doctor cards." })}
            />
            <FileUploadBox
              label={t("doctorProfile.degree_document")}
              accept="image/jpeg,image/png,application/pdf"
              file={documents.degree_document}
              existingUrl={documents.existing?.degree_document_url}
              onChange={handleDegreeDocChange}
            />
            {documents.existing?.medical_license_document_url ? (
              <div className="rounded-[6px] border border-border bg-muted/30 px-4 py-3">
                <p className="text-[12px] font-semibold text-foreground">{t("doctorProfile.license_scan")}</p>
                <a
                  href={documents.existing.medical_license_document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[12px] text-primary underline"
                >
                  {t("doctorProfile.view_license", { defaultValue: "View uploaded license" })}
                </a>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t("doctorProfile.license_renewal_admin", {
                    defaultValue: "A renewed license is uploaded by an admin, so the document cannot be replaced from this profile.",
                  })}
                </p>
              </div>
            ) : (
              <FileUploadBox
                label={t("doctorProfile.license_scan")}
                accept="image/jpeg,image/png,application/pdf"
                file={documents.license_document}
                existingUrl={documents.existing?.medical_license_document_url}
                onChange={handleLicenseDocChange}
              />
            )}
            <FileUploadBox
              label={t("doctorProfile.national_id")}
              accept="image/jpeg,image/png,application/pdf"
              file={documents.national_id_document}
              existingUrl={documents.existing?.national_id_document_url}
              onChange={handleNationalIdChange}
            />
            <FileUploadBox
              label={t("doctorProfile.signature", "Signature")}
              accept="image/jpeg,image/png,image/webp"
              file={documents.signature_file}
              existingUrl={documents.existing?.signature_url}
              onChange={handleSignatureChange}
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
            {t("profile.cancel")}
          </Button>
          {currentStep > 0 && (
            <Button
              variant="ghost"
              onClick={() => onStepChange(currentStep - 1)}
              disabled={isSaving}
              className="text-xs text-muted-foreground"
            >
              {t("profile.back")}
            </Button>
          )}
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:block">
          {t("profile.step_of", { current: currentStep + 1, total: STEPS.length })}
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
                {t("profile.saving")}
              </>
            ) : currentSaveState === "saved" ? (
              <>
                <Check className="h-3 w-3" />
                {t("doctorProfile.saved")}
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                {t("doctorProfile.save_section")}
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
              {t("profile.next")}
            </Button>
          )}

          {currentStep === STEPS.length - 1 && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              className="text-xs border-border"
            >
              {t("doctorProfile.done")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

