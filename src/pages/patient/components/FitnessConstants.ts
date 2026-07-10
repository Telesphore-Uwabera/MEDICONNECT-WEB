import { FileText, Activity, ClipboardList, User } from "lucide-react";
import type { CertStatus } from "@/hooks/patient/use-patient-certificates";
import { Clock, Eye, ShieldCheck, XCircle } from "lucide-react";
import type { TFunction } from "i18next";
import { formatDateOnly } from "@/lib/date";

// Canonical (untranslated) values  these are sent to the API and used for
// internal comparisons. Never localize these; only the labels shown alongside
// them via the getters below.
export const JOB_TYPE_NONE = "None of the above";
export const JOB_TYPE_VALUES = [
  JOB_TYPE_NONE,
  "Heavy physical labor",
  "Driving/operating machinery",
  "Armed forces/security",
  "Mining/construction",
  "Work requiring chest X-ray",
];
export const YES_NO = ["Yes", "No"] as const;

export const getPurposes = (t: TFunction) => [
  { value: "general_fitness", label: t("fitness.purpose_general_fitness") },
  { value: "school_work", label: t("fitness.purpose_school_work") },
  { value: "return_to_work", label: t("fitness.purpose_return_to_work") },
  { value: "fitness_for_travel", label: t("fitness.purpose_fitness_for_travel") },
  { value: "other", label: t("fitness.purpose_other_option") },
];

export const getJobTypes = (t: TFunction) => [
  { value: JOB_TYPE_NONE, label: JOB_TYPE_NONE },
  { value: "Heavy physical labor", label: t("fitness.job_heavy_labor") },
  { value: "Driving/operating machinery", label: t("fitness.job_driving") },
  { value: "Armed forces/security", label: t("fitness.job_armed_forces") },
  { value: "Mining/construction", label: t("fitness.job_mining") },
  { value: "Work requiring chest X-ray", label: t("fitness.job_xray") },
];

export const getYesNoLabel = (t: TFunction, value: string) =>
  value === "Yes" ? t("fitness.yes") : value === "No" ? t("fitness.no") : value;

export const getFormSteps = (t: TFunction) => [
  {
    id: "purpose",
    label: t("fitness.step_purpose_label"),
    icon: FileText,
    description: t("fitness.step_purpose_desc"),
    apiStep: 1,
  },
  {
    id: "symptoms",
    label: t("fitness.step_symptoms_label"),
    icon: Activity,
    description: t("fitness.step_symptoms_desc"),
    apiStep: 2,
  },
  {
    id: "history",
    label: t("fitness.step_history_label"),
    icon: ClipboardList,
    description: t("fitness.step_history_desc"),
    apiStep: 3,
  },
  {
    id: "functional",
    label: t("fitness.step_functional_label"),
    icon: User,
    description: t("fitness.step_functional_desc"),
    apiStep: 4,
  },
];

export const getSymptomFields = (t: TFunction) => [
  { label: t("fitness.sf_fever"), field: "fever_72h" },
  { label: t("fitness.sf_headache"), field: "headache_dizziness" },
  { label: t("fitness.sf_breath"), field: "shortness_breath", warning: true },
  { label: t("fitness.sf_chest_pain"), field: "chest_pain", warning: true },
  { label: t("fitness.sf_palpitations"), field: "palpitations" },
  { label: t("fitness.sf_cough"), field: "cough" },
  { label: t("fitness.sf_vomiting"), field: "vomiting" },
  { label: t("fitness.sf_fatigue"), field: "fatigue" },
  { label: t("fitness.sf_visual"), field: "visual_disturbances" },
  { label: t("fitness.sf_fainting"), field: "fainting", warning: true },
];

export const getHistoryFields = (t: TFunction) => [
  { label: t("fitness.hf_chronic_illness"), field: "chronic_illness" },
  { label: t("fitness.hf_hospitalization"), field: "recent_hospitalization" },
  { label: t("fitness.hf_surgery"), field: "recent_surgery" },
  { label: t("fitness.hf_psychiatric"), field: "psychiatric" },
  { label: t("fitness.hf_allergies"), field: "allergies" },
  { label: t("fitness.hf_medication"), field: "chronic_medication" },
  { label: t("fitness.hf_disability"), field: "disability" },
];

export const getFunctionalFields = (t: TFunction) => [
  { label: t("fitness.ff_walk"), field: "walk_ok" },
  { label: t("fitness.ff_climb"), field: "climb_ok" },
  { label: t("fitness.ff_lift"), field: "lift_ok" },
  { label: t("fitness.ff_sleep"), field: "sleep_ok" },
  { label: t("fitness.ff_appetite"), field: "appetite_ok" },
];

export const getVitalsFields = (t: TFunction) => [
  { label: t("fitness.vf_temperature"), field: "temperature", placeholder: t("fitness.vf_temperature_placeholder") },
  { label: t("fitness.vf_bp"), field: "blood_pressure", placeholder: t("fitness.vf_bp_placeholder") },
  { label: t("fitness.vf_pulse"), field: "pulse", placeholder: t("fitness.vf_pulse_placeholder") },
  { label: t("fitness.vf_o2"), field: "oxygen_saturation", placeholder: t("fitness.vf_o2_placeholder") },
];

export const getStatusMeta = (
  t: TFunction,
): Record<CertStatus, { label: string; color: string; icon: React.ElementType }> => ({
  draft: {
    label: t("fitness.status_draft"),
    color: "bg-muted text-muted-foreground border-border",
    icon: FileText,
  },
  pending: {
    label: t("fitness.status_pending"),
    color: "bg-amber-500/15 text-amber-600 border-amber-400/30",
    icon: Clock,
  },
  in_review: {
    label: t("fitness.status_in_review"),
    color: "bg-blue-500/15 text-blue-600 border-blue-400/30",
    icon: Eye,
  },
  approved: {
    label: t("fitness.status_approved"),
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-400/30",
    icon: ShieldCheck,
  },
  rejected: {
    label: t("fitness.status_rejected"),
    color: "bg-destructive/15 text-destructive border-destructive/25",
    icon: XCircle,
  },
  issued: {
    label: "",
    color: "",
    icon: "symbol"
  },
  withdrawn: {
    label: "",
    color: "",
    icon: "symbol"
  },
  expired: {
    label: "",
    color: "",
    icon: "symbol"
  }
});

export const getPurposeLabel = (t: TFunction, value: string) =>
  getPurposes(t).find((p) => p.value === value)?.label ?? value;

export const fmtDate = (d: string) =>
  formatDateOnly(d, "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

