// Read-only renderer for a consultation summary (SOAP note). Shared by the
// doctor list page and the patient appointment/instant summary views.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Stethoscope } from "lucide-react";
import { RichTextRenderer } from "@/components/ui/rich-textarea";
import {
  summaryFieldText,
  summaryRedFlagList,
  type ConsultationSummary,
} from "@/hooks/doctor/use-consultation-summaries";

const pretty = (s: string) => s.replace(/_/g, " ");

export function SummaryDetails({ summary: s }: { summary: ConsultationSummary }) {
  const { t } = useTranslation();
  const chiefComplaint = summaryFieldText(s.chief_complaint, "main_complaint");
  const historyOfPresentIllness = summaryFieldText(s.history_of_present_illness);
  const reviewOfSystems = summaryFieldText(s.review_of_systems);
  const physicalExamination = summaryFieldText(s.physical_examination);
  const pastMedicalHistory = summaryFieldText(s.past_medical_history);
  const pastSurgicalHistory = summaryFieldText(s.past_surgical_history);
  const medicationHistory = summaryFieldText(s.medication_history);
  const allergyHistory = summaryFieldText(s.allergy_history);
  const familyHistory = summaryFieldText(s.family_history);
  const socialHistory = summaryFieldText(s.social_history);
  const womensHealthHistory = summaryFieldText(s.womens_health_history);
  const pediatricHistory = summaryFieldText(s.pediatric_history);
  const clinicalAssessment = summaryFieldText(s.clinical_assessment, "primary_diagnosis");
  const managementPlan = summaryFieldText(s.management_plan, "followup_plan");
  const attachments = summaryFieldText(s.attachments);
  const activeFlags = summaryRedFlagList(s.red_flag_screening);

  return (
    <div className="space-y-4">
      <RichField label={t("consult.summary_details.chief_complaint")} value={chiefComplaint} empty />
      <RichField label={t("consult.summary_details.history_present_illness")} value={historyOfPresentIllness} />
      <RichField label={t("consult.summary_details.review_of_systems")} value={reviewOfSystems} />
      <RichField label={t("pages.doctor.summary.physical_examination", "Physical examination")} value={physicalExamination} />
      <RichField label={t("pages.doctor.summary.past_medical_history", "Past medical history")} value={pastMedicalHistory} />
      <RichField label={t("pages.doctor.summary.past_surgical_history", "Past surgical history")} value={pastSurgicalHistory} />
      <RichField label={t("pages.doctor.summary.medication_history", "Medication history")} value={medicationHistory} />
      <RichField label={t("pages.doctor.summary.allergy_history", "Allergy history")} value={allergyHistory} />
      <RichField label={t("pages.doctor.summary.family_history", "Family history")} value={familyHistory} />
      <RichField label={t("pages.doctor.summary.social_history", "Social history")} value={socialHistory} />
      <RichField label={t("pages.doctor.summary.womens_health_history", "Women's health history")} value={womensHealthHistory} />
      <RichField label={t("pages.doctor.summary.pediatric_history", "Pediatric history")} value={pediatricHistory} />

      {activeFlags.length > 0 && (
        <Field label={t("consult.summary_details.red_flags")}>
          <div className="flex flex-wrap gap-1.5">
            {activeFlags.map((flag) => (
              <span key={flag} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                <AlertTriangle className="h-2.5 w-2.5" /> {pretty(flag)}
              </span>
            ))}
          </div>
        </Field>
      )}

      {clinicalAssessment && (
        <Field label={t("consult.summary_details.clinical_assessment")}>
          <div className="flex items-start gap-2">
            <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <RichTextRenderer value={clinicalAssessment} className="text-sm text-foreground" />
          </div>
        </Field>
      )}

      <RichField label={t("consult.summary_details.follow_up_plan")} value={managementPlan} />
      <RichField label={t("pages.doctor.summary.attachments", "Attachments and supporting notes")} value={attachments} />
    </div>
  );
}

function RichField({ label, value, empty = false }: { label: string; value: string; empty?: boolean }) {
  if (!value && !empty) return null;
  return (
    <Field label={label}>
      {value ? <RichTextRenderer value={value} className="text-sm text-foreground" /> : <Muted />}
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Muted() {
  return <span className="text-sm text-muted-foreground/60">-</span>;
}