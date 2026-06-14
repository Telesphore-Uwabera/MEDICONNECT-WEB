import { FileText, Activity, ClipboardList, User } from "lucide-react";
import type { CertStatus } from "@/hooks/patient/use-patient-certificates";
import { Clock, Eye, ShieldCheck, XCircle } from "lucide-react";

export const PURPOSES = [
  { value: "general_fitness", label: "General fitness" },
  { value: "school_work", label: "School/work fitness" },
  { value: "return_to_work", label: "Return to work after illness" },
  { value: "fitness_for_travel", label: "Fitness for travel" },
  { value: "other", label: "Other" },
];

export const JOB_TYPES = [
  "None of the above",
  "Heavy physical labor",
  "Driving/operating machinery",
  "Armed forces/security",
  "Mining/construction",
  "Work requiring chest X-ray",
];

export const YES_NO = ["Yes", "No"];

export const FORM_STEPS = [
  {
    id: "purpose",
    label: "Purpose",
    icon: FileText,
    description: "Certificate type & job",
    apiStep: 1,
  },
  {
    id: "symptoms",
    label: "Symptoms",
    icon: Activity,
    description: "Current health symptoms",
    apiStep: 2,
  },
  {
    id: "history",
    label: "Medical History",
    icon: ClipboardList,
    description: "Past illnesses & conditions",
    apiStep: 3,
  },
  {
    id: "functional",
    label: "Functional",
    icon: User,
    description: "Daily ability & vitals",
    apiStep: 4,
  },
];

export const SYMPTOM_FIELDS = [
  { label: "Any fever in the past 72 hours?", field: "fever_72h" },
  { label: "Any current headache or dizziness?", field: "headache_dizziness" },
  { label: "Any shortness of breath?", field: "shortness_breath", warning: true },
  { label: "Any chest pain?", field: "chest_pain", warning: true },
  { label: "Any palpitations?", field: "palpitations" },
  { label: "Any cough?", field: "cough" },
  { label: "Any vomiting or diarrhea?", field: "vomiting" },
  { label: "Any body weakness or fatigue?", field: "fatigue" },
  { label: "Any visual disturbances?", field: "visual_disturbances" },
  { label: "Any recent fainting episodes?", field: "fainting", warning: true },
];

export const HISTORY_FIELDS = [
  { label: "Any chronic illnesses? (HTN, diabetes, asthma, epilepsy, heart disease)", field: "chronic_illness" },
  { label: "Any hospitalization in the last 3 months?", field: "recent_hospitalization" },
  { label: "Any surgery in the last 6 months?", field: "recent_surgery" },
  { label: "Any psychiatric conditions?", field: "psychiatric" },
  { label: "Any known allergies (drug/food)?", field: "allergies" },
  { label: "Any chronic medication currently used?", field: "chronic_medication" },
  { label: "Any disability or mobility limitations?", field: "disability" },
];

export const FUNCTIONAL_FIELDS = [
  { label: "Can you walk without difficulty?", field: "walk_ok" },
  { label: "Can you climb stairs?", field: "climb_ok" },
  { label: "Can you lift light objects without pain?", field: "lift_ok" },
  { label: "Do you sleep well?", field: "sleep_ok" },
  { label: "Do you have a normal appetite?", field: "appetite_ok" },
];

export const VITALS_FIELDS = [
  { label: "Temperature (°C)", field: "temperature", placeholder: "e.g. 36.6" },
  { label: "Blood pressure", field: "blood_pressure", placeholder: "e.g. 120/80" },
  { label: "Pulse (bpm)", field: "pulse", placeholder: "e.g. 72" },
  { label: "O₂ saturation (%)", field: "oxygen_saturation", placeholder: "e.g. 98" },
];

export const STATUS_META: Record<
  CertStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  draft: {
    label: "Draft",
    color: "bg-muted text-muted-foreground border-border",
    icon: FileText,
  },
  pending: {
    label: "Pending",
    color: "bg-amber-500/15 text-amber-600 border-amber-400/30",
    icon: Clock,
  },
  in_review: {
    label: "In Review",
    color: "bg-blue-500/15 text-blue-600 border-blue-400/30",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-400/30",
    icon: ShieldCheck,
  },
  rejected: {
    label: "Rejected",
    color: "bg-destructive/15 text-destructive border-destructive/25",
    icon: XCircle,
  },
};

export const purposeLabel = (value: string) =>
  PURPOSES.find((p) => p.value === value)?.label ?? value;

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
