import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  FileText,
  HeartPulse,
  Loader2,
  ShieldAlert,
  Stethoscope,
  X,
  type LucideProps,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RichTextarea,
  hasRichTextContent,
  prepareRichTextForSave,
} from "@/components/ui/rich-textarea";
import {
  useConsultationSummaries,
  useConsultationSummary,
  useCreateConsultationSummary,
  useUpdateConsultationSummary,
  type ConsultationSummary,
  type CreateSummaryPayload,
  type UpdateSummaryPayload,
} from "@/hooks/doctor/use-consultation-summaries";
import { getErrMsg } from "./helpers";

type SummaryTextKey =
  | "chief_complaint"
  | "history_of_present_illness"
  | "review_of_systems"
  | "past_medical_history"
  | "past_surgical_history"
  | "medication_history"
  | "allergy_history"
  | "family_history"
  | "social_history"
  | "womens_health_history"
  | "pediatric_history"
  | "physical_examination"
  | "attachments"
  | "clinical_assessment"
  | "management_plan";

type FormState = Record<SummaryTextKey, string>;
type StepId = "clinical" | "history" | "assessment";

type StepConfig = {
  id: StepId;
  icon: ComponentType<LucideProps>;
  titleKey: string;
  fallback: string;
  fields: SummaryTextKey[];
};

interface Props {
  summary?: ConsultationSummary | null;
  appointmentId?: number | null;
  instantConsultationId?: number | null;
  patientId?: number | null;
  patientName?: string;
  defaultComplaint?: string;
  defaultDiagnosis?: string;
  onClose: () => void;
  onSaved: () => void;
}

const TEXT_FIELDS: Array<{
  key: SummaryTextKey;
  labelKey: string;
  fallback: string;
  placeholderKey: string;
  placeholder: string;
  minHeight?: number;
  optional?: boolean;
}> = [
  { key: "chief_complaint", labelKey: "pages.doctor.summary.chief_complaint", fallback: "Chief complaint", placeholderKey: "pages.doctor.summary.chief_complaint_placeholder", placeholder: "Describe the main concern, duration, and context.", minHeight: 120 },
  { key: "history_of_present_illness", labelKey: "pages.doctor.summary.history_of_present_illness", fallback: "History of present illness", placeholderKey: "pages.doctor.summary.history_of_present_illness_placeholder", placeholder: "Onset, location, severity, associated symptoms, and progression." },
  { key: "review_of_systems", labelKey: "pages.doctor.summary.review_of_systems", fallback: "Review of systems", placeholderKey: "pages.doctor.summary.review_of_systems_placeholder", placeholder: "Document positives and important negatives by system." },
  { key: "past_medical_history", labelKey: "pages.doctor.summary.past_medical_history", fallback: "Past medical history", placeholderKey: "pages.doctor.summary.past_medical_history_placeholder", placeholder: "Known chronic conditions, previous diagnoses, and relevant risks." },
  { key: "past_surgical_history", labelKey: "pages.doctor.summary.past_surgical_history", fallback: "Past surgical history", placeholderKey: "pages.doctor.summary.past_surgical_history_placeholder", placeholder: "Previous procedures and dates when known.", optional: true },
  { key: "medication_history", labelKey: "pages.doctor.summary.medication_history", fallback: "Medication history", placeholderKey: "pages.doctor.summary.medication_history_placeholder", placeholder: "Current and recent medicines, dose, frequency, adherence." },
  { key: "allergy_history", labelKey: "pages.doctor.summary.allergy_history", fallback: "Allergy history", placeholderKey: "pages.doctor.summary.allergy_history_placeholder", placeholder: "Drug, food, or environmental allergies and reactions." },
  { key: "family_history", labelKey: "pages.doctor.summary.family_history", fallback: "Family history", placeholderKey: "pages.doctor.summary.family_history_placeholder", placeholder: "Relevant inherited or family conditions.", optional: true },
  { key: "social_history", labelKey: "pages.doctor.summary.social_history", fallback: "Social history", placeholderKey: "pages.doctor.summary.social_history_placeholder", placeholder: "Smoking, alcohol, occupation, living context, support.", optional: true },
  { key: "womens_health_history", labelKey: "pages.doctor.summary.womens_health_history", fallback: "Women's health history", placeholderKey: "pages.doctor.summary.womens_health_history_placeholder", placeholder: "Gynecologic, obstetric, menstrual, or pregnancy details when relevant.", optional: true },
  { key: "pediatric_history", labelKey: "pages.doctor.summary.pediatric_history", fallback: "Pediatric history", placeholderKey: "pages.doctor.summary.pediatric_history_placeholder", placeholder: "Birth, feeding, growth, immunization, or development details when relevant.", optional: true },
  { key: "physical_examination", labelKey: "pages.doctor.summary.physical_examination", fallback: "Physical examination", placeholderKey: "pages.doctor.summary.physical_examination_placeholder", placeholder: "Vitals, general appearance, targeted examination findings.", minHeight: 120 },
  { key: "attachments", labelKey: "pages.doctor.summary.attachments", fallback: "Attachments and supporting notes", placeholderKey: "pages.doctor.summary.attachments_placeholder", placeholder: "Paste or insert relevant images, files notes, or supporting observations.", optional: true },
  { key: "clinical_assessment", labelKey: "pages.doctor.summary.clinical_assessment", fallback: "Clinical assessment", placeholderKey: "pages.doctor.summary.clinical_assessment_placeholder", placeholder: "Working diagnosis, differential diagnosis, and clinical reasoning.", minHeight: 120 },
  { key: "management_plan", labelKey: "pages.doctor.summary.management_plan", fallback: "Management plan", placeholderKey: "pages.doctor.summary.management_plan_placeholder", placeholder: "Treatment, prescriptions, investigations, advice, and follow-up plan.", minHeight: 120 },
];

const STEPS: StepConfig[] = [
  { id: "clinical", icon: Stethoscope, titleKey: "pages.doctor.summary.step_clinical", fallback: "Clinical story", fields: ["chief_complaint", "history_of_present_illness", "review_of_systems", "physical_examination"] },
  { id: "history", icon: ClipboardList, titleKey: "pages.doctor.summary.step_history", fallback: "Patient history", fields: ["past_medical_history", "past_surgical_history", "medication_history", "allergy_history", "family_history", "social_history", "womens_health_history", "pediatric_history"] },
  { id: "assessment", icon: HeartPulse, titleKey: "pages.doctor.summary.step_assessment", fallback: "Assessment and plan", fields: ["clinical_assessment", "management_plan", "attachments"] },
];

const RED_FLAGS = [
  { value: "severe_chest_pain", labelKey: "pages.doctor.summary.red_flag_severe_chest_pain", fallback: "Severe Chest Pain" },
  { value: "severe_difficulty_breathing", labelKey: "pages.doctor.summary.red_flag_severe_difficulty_breathing", fallback: "Severe Difficulty Breathing" },
  { value: "stroke_symptoms", labelKey: "pages.doctor.summary.red_flag_stroke_symptoms", fallback: "Stroke Symptoms" },
  { value: "severe_bleeding", labelKey: "pages.doctor.summary.red_flag_severe_bleeding", fallback: "Severe Bleeding" },
  { value: "altered_mental_status", labelKey: "pages.doctor.summary.red_flag_altered_mental_status", fallback: "Altered Mental Status" },
  { value: "seizure", labelKey: "pages.doctor.summary.red_flag_seizure", fallback: "Seizure" },
  { value: "severe_trauma", labelKey: "pages.doctor.summary.red_flag_severe_trauma", fallback: "Severe Trauma" },
  { value: "suicidal_risk", labelKey: "pages.doctor.summary.red_flag_suicidal_risk", fallback: "Suicidal Risk" },
];

const emptyForm = (): FormState =>
  TEXT_FIELDS.reduce((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {} as FormState);

const labelize = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
const isPlainObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const richParagraphsFromObject = (value: Record<string, unknown>) =>
  Object.entries(value)
    .filter(([, item]) => item != null && item !== "" && !(Array.isArray(item) && item.length === 0))
    .map(([key, item]) => {
      const display = Array.isArray(item) ? item.join(", ") : String(item);
      return "<p><strong>" + labelize(key) + ":</strong> " + display + "</p>";
    })
    .join("");

const textFromSummaryField = (value: unknown, legacyKey?: string): string => {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) return value.length ? "<p>" + value.join(", ") + "</p>" : "";
  if (isPlainObject(value)) {
    if (legacyKey && typeof value[legacyKey] === "string") return value[legacyKey] as string;
    return richParagraphsFromObject(value);
  }
  return String(value);
};

const redFlagsFromSummary = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (!isPlainObject(value)) return [];
  return Object.entries(value)
    .filter(([key, active]) => key !== "alert_triggered" && Boolean(active))
    .map(([key]) => key);
};

const normalizeLookupRows = (payload: unknown): ConsultationSummary[] => {
  const data = (payload as any)?.data;
  if (Array.isArray(data) && data.every((item) => Array.isArray(item?.summaries))) {
    return data.flatMap((item) => item.summaries ?? []);
  }
  if (Array.isArray(data)) return data as ConsultationSummary[];
  return [];
};

const prepareField = (value: string, nullable = false) => {
  if (!hasRichTextContent(value)) return nullable ? null : "";
  return prepareRichTextForSave(value);
};

export function ConsultationSummaryEditorModal({
  summary,
  appointmentId,
  instantConsultationId,
  patientId,
  patientName,
  defaultComplaint,
  defaultDiagnosis,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyForm(),
    chief_complaint: defaultComplaint ?? "",
    clinical_assessment: defaultDiagnosis ?? "",
  }));
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [prefilledKey, setPrefilledKey] = useState<string | null>(null);

  const createRx = useCreateConsultationSummary();
  const updateRx = useUpdateConsultationSummary();
  const saving = createRx.isPending || updateRx.isPending;

  const lookupEnabled = !summary && (appointmentId != null || instantConsultationId != null);
  const { data: existingList, isFetching: isLookingUp } = useConsultationSummaries(
    {
      appointment_id: appointmentId ?? undefined,
      instant_consultation_id: instantConsultationId ?? undefined,
    },
    { enabled: lookupEnabled },
  );

  const existingSummaryId = useMemo(() => {
    if (summary?.id) return summary.id;
    const rows = normalizeLookupRows(existingList);
    const match = rows.find(
      (row) =>
        (appointmentId != null && row.appointment_id === appointmentId) ||
        (instantConsultationId != null && row.instant_consultation_id === instantConsultationId),
    );
    return match?.id ?? null;
  }, [summary?.id, existingList, appointmentId, instantConsultationId]);

  const { data: existingDetail, isFetching: isLoadingDetail } = useConsultationSummary(summary?.id ? null : existingSummaryId);
  const sourceSummary = summary ?? existingDetail?.summary ?? null;
  const sourceKey = sourceSummary
    ? "summary:" + sourceSummary.id
    : "new:" + (appointmentId ?? "") + ":" + (instantConsultationId ?? "") + ":" + (patientId ?? "");
  const isResolvingExisting = lookupEnabled && (isLookingUp || (existingSummaryId != null && isLoadingDetail && !sourceSummary));
  const currentStep = STEPS[stepIndex];
  const CurrentStepIcon = currentStep.icon;
  const selectedRedFlagCount = redFlags.length;
  const canSave = patientId != null && hasRichTextContent(form.chief_complaint) && !saving && !isResolvingExisting;

  useEffect(() => {
    if (prefilledKey === sourceKey) return;

    if (sourceSummary) {
      setForm({
        chief_complaint: textFromSummaryField(sourceSummary.chief_complaint, "main_complaint"),
        history_of_present_illness: textFromSummaryField(sourceSummary.history_of_present_illness),
        review_of_systems: textFromSummaryField(sourceSummary.review_of_systems),
        past_medical_history: textFromSummaryField(sourceSummary.past_medical_history),
        past_surgical_history: textFromSummaryField(sourceSummary.past_surgical_history),
        medication_history: textFromSummaryField(sourceSummary.medication_history),
        allergy_history: textFromSummaryField(sourceSummary.allergy_history),
        family_history: textFromSummaryField(sourceSummary.family_history),
        social_history: textFromSummaryField(sourceSummary.social_history),
        womens_health_history: textFromSummaryField(sourceSummary.womens_health_history),
        pediatric_history: textFromSummaryField(sourceSummary.pediatric_history),
        physical_examination: textFromSummaryField(sourceSummary.physical_examination),
        attachments: textFromSummaryField(sourceSummary.attachments),
        clinical_assessment: textFromSummaryField(sourceSummary.clinical_assessment, "primary_diagnosis"),
        management_plan: textFromSummaryField(sourceSummary.management_plan, "followup_plan"),
      });
      setRedFlags(redFlagsFromSummary(sourceSummary.red_flag_screening));
      setPrefilledKey(sourceKey);
      return;
    }

    setForm({ ...emptyForm(), chief_complaint: defaultComplaint ?? "", clinical_assessment: defaultDiagnosis ?? "" });
    setRedFlags([]);
    setPrefilledKey(sourceKey);
  }, [defaultComplaint, defaultDiagnosis, prefilledKey, sourceKey, sourceSummary]);

  const setField = (key: SummaryTextKey, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleRedFlag = (value: string) => setRedFlags((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));

  const buildPayload = (): UpdateSummaryPayload => ({
    chief_complaint: prepareField(form.chief_complaint),
    history_of_present_illness: prepareField(form.history_of_present_illness),
    review_of_systems: prepareField(form.review_of_systems),
    past_medical_history: prepareField(form.past_medical_history),
    past_surgical_history: prepareField(form.past_surgical_history),
    medication_history: prepareField(form.medication_history),
    allergy_history: prepareField(form.allergy_history),
    family_history: prepareField(form.family_history),
    social_history: prepareField(form.social_history),
    womens_health_history: prepareField(form.womens_health_history, true),
    pediatric_history: prepareField(form.pediatric_history, true),
    physical_examination: prepareField(form.physical_examination),
    attachments: prepareField(form.attachments, true),
    clinical_assessment: prepareField(form.clinical_assessment),
    management_plan: prepareField(form.management_plan),
    red_flag_screening: redFlags,
  });

  const handleSave = () => {
    if (patientId == null) {
      toast.error(t("pages.doctor.summary.missing_patient", "Missing patient. Cannot save the summary."));
      return;
    }
    if (appointmentId == null && instantConsultationId == null && !sourceSummary) {
      toast.error(t("pages.doctor.summary.missing_consultation", "Missing consultation reference."));
      return;
    }
    if (!hasRichTextContent(form.chief_complaint)) {
      setStepIndex(0);
      toast.error(t("pages.doctor.summary.enter_chief_complaint", "Enter the chief complaint before saving."));
      return;
    }

    const updatePayload = buildPayload();
    if (existingSummaryId != null) {
      updateRx.mutate(
        { id: existingSummaryId, payload: updatePayload },
        {
          onSuccess: () => {
            toast.success(t("pages.doctor.summary.updated", "Summary updated."));
            onSaved();
          },
          onError: (err) => toast.error(getErrMsg(err, t("pages.doctor.summary.update_failed", "Could not update summary."))),
        },
      );
      return;
    }

    const createPayload: CreateSummaryPayload = {
      ...(appointmentId != null ? { appointment_id: appointmentId } : {}),
      ...(appointmentId == null && instantConsultationId != null ? { instant_consultation_id: instantConsultationId } : {}),
      patient_id: patientId,
      ...updatePayload,
    };

    createRx.mutate(createPayload, {
      onSuccess: () => {
        toast.success(t("pages.doctor.summary.saved", "Summary saved."));
        onSaved();
      },
      onError: (err) => toast.error(getErrMsg(err, t("pages.doctor.summary.save_failed", "Could not save summary."))),
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                {sourceSummary ? t("pages.doctor.summary.edit_title", "Edit consultation summary") : t("pages.doctor.summary.title", "Consultation summary")}
              </h2>
              <p className="truncate text-[11px] text-muted-foreground">
                {patientName || t("pages.doctor.summary.patient", "Patient")}
                {existingSummaryId != null && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                    {t("pages.doctor.summary.existing_version", "Existing record")}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("pages.doctor.summary.close", "Close")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border bg-background px-5 py-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const active = index === stepIndex;
              const complete = index < stepIndex;
              return (
                <button key={step.id} type="button" onClick={() => setStepIndex(index)} className={cn("flex items-center gap-2 rounded-[6px] border px-3 py-2 text-left transition-colors", active ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border", active || complete ? "border-primary/40 bg-primary text-primary-foreground" : "border-border bg-background")}>
                    {complete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{t(step.titleKey, step.fallback)}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {t("pages.doctor.summary.step_count", { defaultValue: "Step {{current}} of {{total}}", current: index + 1, total: STEPS.length })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isResolvingExisting && (
            <div className="mb-4 flex items-center gap-2 rounded-[6px] border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("pages.doctor.summary.loading_existing", "Checking for an existing summary...")}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                <CurrentStepIcon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t(currentStep.titleKey, currentStep.fallback)}</h3>
                <p className="text-[11px] text-muted-foreground">{t("pages.doctor.summary.rich_text_hint", "Use rich text and images where they help the clinical record.")}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {currentStep.fields.map((key) => {
                const field = TEXT_FIELDS.find((item) => item.key === key)!;
                const wide = field.minHeight && field.minHeight >= 120;
                return (
                  <div key={key} className={cn("space-y-1.5", wide && "md:col-span-2")}>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(field.labelKey, field.fallback)}
                      {!field.optional && key === "chief_complaint" && <span className="text-destructive"> *</span>}
                    </label>
                    <RichTextarea value={form[key]} onChange={(value) => setField(key, value)} placeholder={t(field.placeholderKey, field.placeholder)} minHeight={field.minHeight ?? 96} editorClassName="text-[12px]" />
                  </div>
                );
              })}
            </div>

            {currentStep.id === "assessment" && (
              <section className="space-y-3 rounded-[6px] border border-border bg-background/60 p-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{t("pages.doctor.summary.red_flag_screening", "Red-flag screening")}</h4>
                    <p className="text-[10px] text-muted-foreground">{t("pages.doctor.summary.red_flag_hint", "Select any positive urgent warning signs.")}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {RED_FLAGS.map((flag) => {
                    const active = redFlags.includes(flag.value);
                    return (
                      <label key={flag.value} className={cn("flex cursor-pointer items-center gap-2 rounded-[5px] border px-3 py-2 transition-colors", active ? "border-destructive/40 bg-destructive/10" : "border-border hover:bg-muted/50")}>
                        <input type="checkbox" checked={active} onChange={() => toggleRedFlag(flag.value)} className="h-3.5 w-3.5 accent-destructive" />
                        <span className="text-[11px] font-medium text-foreground">{t(flag.labelKey, flag.fallback)}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedRedFlagCount > 0 && (
                  <div className="flex items-center gap-2 rounded-[5px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] font-semibold text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {t("pages.doctor.summary.red_flag_alert", "Alert: Urgent in-person evaluation required if positive.")}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-4">
          <button type="button" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0 || saving} className="flex h-9 items-center gap-2 rounded-[5px] border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("pages.doctor.summary.back", "Back")}
          </button>

          <div className="hidden items-center gap-1 sm:flex">
            {STEPS.map((step, index) => (
              <span key={step.id} className={cn("h-1.5 rounded-full transition-all", index === stepIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/20")} />
            ))}
          </div>

          {stepIndex < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStepIndex((value) => Math.min(STEPS.length - 1, value + 1))} disabled={saving} className="flex h-9 items-center gap-2 rounded-[5px] bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
              {t("pages.doctor.summary.next", "Next")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button type="button" onClick={handleSave} disabled={!canSave} className="flex h-9 items-center gap-2 rounded-[5px] bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
              {(saving || isResolvingExisting) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {sourceSummary || existingSummaryId != null ? t("pages.doctor.summary.update_summary", "Update summary") : t("pages.doctor.summary.save_continue", "Save and continue")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
