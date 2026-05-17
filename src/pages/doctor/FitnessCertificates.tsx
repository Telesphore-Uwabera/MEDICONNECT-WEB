import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Clock,
  ShieldCheck,
  XCircle,
  Eye,
  Search,
  ChevronRight,
  User,
  FileText,
  Activity,
  HeartPulse,
  AlertTriangle,
  Check,
  X,
  QrCode,
  Download,
  ArrowLeft,
  CalendarDays,
  Stethoscope,
  BookOpen,
  Pencil,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type CertStatus = "pending" | "in_review" | "approved" | "rejected";

interface CertRequest {
  id: string;
  cert_number: string;
  patient_name: string;
  patient_id: string;
  patient_age: number;
  patient_gender: string;
  patient_blood_type: string;
  patient_city: string;
  purpose: string;
  job_type: string;
  requested_at: string;
  status: CertStatus;
  symptoms: Record<string, boolean>;
  history: Record<string, string>;
  functional: Record<string, boolean>;
  vitals?: {
    temperature?: string;
    blood_pressure?: string;
    pulse?: string;
    oxygen_saturation?: string;
  };
  notes?: string;
  doctor_notes?: string;
  decision?: string;
  reviewed_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_REQUESTS: CertRequest[] = [
  {
    id: "1",
    cert_number: "MC-2025-00503",
    patient_name: "Jean Paul Habimana",
    patient_id: "1199880056781234",
    patient_age: 34,
    patient_gender: "Male",
    patient_blood_type: "O+",
    patient_city: "Kigali",
    purpose: "School/work fitness",
    job_type: "None of the above",
    requested_at: "2025-05-13T08:30:00",
    status: "pending",
    symptoms: {
      fever: false, headache: false, shortness_of_breath: false,
      chest_pain: false, palpitations: false, cough: false,
      vomiting: false, fatigue: false, visual_disturbances: false, fainting: false,
    },
    history: {
      chronic_illness: "No", recent_hospitalization: "No", recent_surgery: "No",
      psychiatric: "No", allergies: "No", chronic_medication: "No", disability: "No",
    },
    functional: { walk_ok: true, climb_ok: true, lift_ok: true, sleep_ok: true, appetite_ok: true },
    vitals: { temperature: "36.5", blood_pressure: "118/76", pulse: "72", oxygen_saturation: "99" },
  },
  {
    id: "2",
    cert_number: "MC-2025-00498",
    patient_name: "Aline Uwimana",
    patient_id: "1200190034561234",
    patient_age: 28,
    patient_gender: "Female",
    patient_blood_type: "A+",
    patient_city: "Huye",
    purpose: "Return to work after illness",
    job_type: "None of the above",
    requested_at: "2025-05-12T14:10:00",
    status: "in_review",
    symptoms: {
      fever: false, headache: false, shortness_of_breath: false,
      chest_pain: false, palpitations: false, cough: true,
      vomiting: false, fatigue: true, visual_disturbances: false, fainting: false,
    },
    history: {
      chronic_illness: "No", recent_hospitalization: "Yes", recent_surgery: "No",
      psychiatric: "No", allergies: "No", chronic_medication: "Yes", disability: "No",
    },
    functional: { walk_ok: true, climb_ok: true, lift_ok: false, sleep_ok: false, appetite_ok: true },
    vitals: { temperature: "37.1", blood_pressure: "110/70", pulse: "88", oxygen_saturation: "97" },
    notes: "Recently recovered from pneumonia. Currently on Amoxicillin course",
  },
  {
    id: "3",
    cert_number: "MC-2025-00487",
    patient_name: "Eric Nshimiyimana",
    patient_id: "1198280012341234",
    patient_age: 45,
    patient_gender: "Male",
    patient_blood_type: "B+",
    patient_city: "Musanze",
    purpose: "General fitness",
    job_type: "Heavy physical labor",
    requested_at: "2025-05-11T09:00:00",
    status: "pending",
    symptoms: {
      fever: false, headache: false, shortness_of_breath: false,
      chest_pain: false, palpitations: false, cough: false,
      vomiting: false, fatigue: false, visual_disturbances: false, fainting: false,
    },
    history: {
      chronic_illness: "Yes", recent_hospitalization: "No", recent_surgery: "No",
      psychiatric: "No", allergies: "No", chronic_medication: "Yes", disability: "No",
    },
    functional: { walk_ok: true, climb_ok: true, lift_ok: true, sleep_ok: true, appetite_ok: true },
    notes: "Patient has controlled hypertension. On Amlodipine 5mg",
  },
  {
    id: "4",
    cert_number: "MC-2025-00412",
    patient_name: "Marie Claire Mukamana",
    patient_id: "1200190098761234",
    patient_age: 31,
    patient_gender: "Female",
    patient_blood_type: "AB+",
    patient_city: "Kigali",
    purpose: "School/work fitness",
    job_type: "None of the above",
    requested_at: "2025-05-02T10:30:00",
    status: "approved",
    symptoms: {
      fever: false, headache: false, shortness_of_breath: false,
      chest_pain: false, palpitations: false, cough: false,
      vomiting: false, fatigue: false, visual_disturbances: false, fainting: false,
    },
    history: {
      chronic_illness: "No", recent_hospitalization: "No", recent_surgery: "No",
      psychiatric: "No", allergies: "No", chronic_medication: "No", disability: "No",
    },
    functional: { walk_ok: true, climb_ok: true, lift_ok: true, sleep_ok: true, appetite_ok: true },
    vitals: { temperature: "36.6", blood_pressure: "120/80", pulse: "68", oxygen_saturation: "99" },
    decision: "Fit",
    doctor_notes: "Patient is in excellent health. No contraindications found",
    reviewed_at: "2025-05-02T11:00:00",
  },
  {
    id: "5",
    cert_number: "MC-2025-00387",
    patient_name: "Patrick Bizimana",
    patient_id: "1199180045671234",
    patient_age: 52,
    patient_gender: "Male",
    patient_blood_type: "O-",
    patient_city: "Rubavu",
    purpose: "Return to work after illness",
    job_type: "Mining/construction",
    requested_at: "2025-04-15T09:00:00",
    status: "rejected",
    symptoms: {
      fever: false, headache: true, shortness_of_breath: true,
      chest_pain: false, palpitations: true, cough: false,
      vomiting: false, fatigue: true, visual_disturbances: false, fainting: false,
    },
    history: {
      chronic_illness: "Yes", recent_hospitalization: "No", recent_surgery: "No",
      psychiatric: "No", allergies: "No", chronic_medication: "Yes", disability: "No",
    },
    functional: { walk_ok: true, climb_ok: false, lift_ok: false, sleep_ok: false, appetite_ok: true },
    decision: "Needs physical examination",
    doctor_notes: "High-risk job type combined with reported cardiac symptoms requires in-person examination",
    reviewed_at: "2025-04-15T10:30:00",
  },
];

const STATUS_META: Record<
  CertStatus,
  { label: string; color: string; dot: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/15 text-amber-600 border-amber-400/30",
    dot: "bg-amber-500",
    icon: Clock,
  },
  in_review: {
    label: "In Review",
    color: "bg-blue-500/15 text-blue-600 border-blue-400/30",
    dot: "bg-blue-500",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-400/30",
    dot: "bg-emerald-500",
    icon: ShieldCheck,
  },
  rejected: {
    label: "Rejected",
    color: "bg-destructive/15 text-destructive border-destructive/25",
    dot: "bg-destructive",
    icon: XCircle,
  },
};

const DECISIONS = [
  "Fit",
  "Temporarily unfit",
  "Needs physical examination",
  "Referred to nearest facility",
];

const FILTER_TABS: { id: CertStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_review", label: "In Review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
const formatId = (id: string) => id.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────
const SYMPTOM_LABELS: Record<string, string> = {
  fever: "Fever (72h)",
  headache: "Headache/dizziness",
  shortness_of_breath: "Shortness of breath",
  chest_pain: "Chest pain",
  palpitations: "Palpitations",
  cough: "Cough",
  vomiting: "Vomiting/diarrhea",
  fatigue: "Fatigue/weakness",
  visual_disturbances: "Visual disturbances",
  fainting: "Fainting episodes",
};
const HISTORY_LABELS: Record<string, string> = {
  chronic_illness: "Chronic illness",
  recent_hospitalization: "Hospitalization (3mo)",
  recent_surgery: "Surgery (6mo)",
  psychiatric: "Psychiatric conditions",
  allergies: "Known allergies",
  chronic_medication: "Chronic medication",
  disability: "Disability/mobility",
};
const FUNCTIONAL_LABELS: Record<string, string> = {
  walk_ok: "Walks without difficulty",
  climb_ok: "Climbs stairs",
  lift_ok: "Lifts light objects",
  sleep_ok: "Sleeps well",
  appetite_ok: "Normal appetite",
};
const RED_FLAG_SYMPTOMS = ["shortness_of_breath", "chest_pain", "fainting"];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border">
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary/10 shrink-0">
          <Icon size={13} className="text-primary" />
        </div>
        <h3 className="text-xs font-semibold tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function BoolRow({
  label,
  value,
  redFlag,
}: {
  label: string;
  value: boolean;
  redFlag?: boolean;
}) {
  const flagged = redFlag && value;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span
        className={cn(
          "text-xs leading-snug pr-2",
          flagged ? "text-destructive font-medium" : "text-foreground",
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "flex items-center gap-1 text-[11px] font-medium shrink-0",
          value
            ? flagged
              ? "text-destructive"
              : "text-amber-600"
            : "text-muted-foreground",
        )}
      >
        {value ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Check className="h-3 w-3 text-emerald-500" />
        )}
        {value ? "Yes" : "No"}
      </div>
    </div>
  );
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/40 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-bold text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Request List Item
// ─────────────────────────────────────────────────────────────────────────────
function RequestCard({
  req,
  onOpen,
  compact,
}: {
  req: CertRequest;
  onOpen: () => void;
  compact?: boolean;
}) {
  const meta = STATUS_META[req.status];
  const StatusIcon = meta.icon;
  const redFlags = RED_FLAG_SYMPTOMS.filter((s) => req.symptoms[s]);
  const highRisk = req.job_type !== "None of the above";

  return (
    <div
      onClick={onOpen}
      className="rounded-lg border border-border bg-card p-3 sm:p-4 flex items-start gap-3 cursor-pointer hover:border-primary/40 hover:bg-card/80 transition-all group"
    >
      {/* Avatar — hidden in compact mode on mobile */}
      <div className={cn(
        "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0",
        compact && "hidden sm:flex",
      )}>
        {getInitials(req.patient_name)}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-foreground leading-tight">
            {req.patient_name}
          </span>
          <Badge
            className={cn(
              "text-[10px] font-medium rounded-full px-2 py-0 border flex items-center gap-1 h-5 shrink-0",
              meta.color,
            )}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {meta.label}
          </Badge>
        </div>

        {/* Flags row */}
        {(redFlags.length > 0 || highRisk) && (
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {redFlags.length > 0 && (
              <Badge className="text-[10px] font-medium rounded-full px-2 py-0 border h-4 bg-destructive/15 text-destructive border-destructive/25 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {redFlags.length} red flag{redFlags.length > 1 ? "s" : ""}
              </Badge>
            )}
            {highRisk && (
              <Badge className="text-[10px] font-medium rounded-full px-2 py-0 border h-4 bg-amber-500/15 text-amber-600 border-amber-400/30 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                High-risk
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground">
            {req.cert_number}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">·</span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {req.purpose}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {req.patient_gender} · {req.patient_age} yrs · {req.patient_blood_type}
            {!compact && ` · ${req.patient_city}`}
          </span>
        </div>

        {/* Date — always shown */}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {fmtDate(req.requested_at)}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail View
// ─────────────────────────────────────────────────────────────────────────────
function RequestDetail({
  req,
  onBack,
  onUpdate,
}: {
  req: CertRequest;
  onBack: () => void;
  onUpdate: (id: string, decision: string, notes: string) => void;
}) {
  const [decision, setDecision] = useState(req.decision ?? "");
  const [doctorNotes, setDoctorNotes] = useState(req.doctor_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const redFlags = RED_FLAG_SYMPTOMS.filter((s) => req.symptoms[s]);
  const highRisk = req.job_type !== "None of the above";
  const canDecide = req.status === "pending" || req.status === "in_review";
  const isApproved = req.status === "approved";
  const meta = STATUS_META[req.status];

  const handleSave = () => {
    if (!decision) return;
    setSaving(true);
    setTimeout(() => {
      onUpdate(req.id, decision, doctorNotes);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top bar — responsive: stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-7 text-xs border-border gap-1.5 shrink-0"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </Button>
          <div className="flex-1 min-w-0 sm:flex-none">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate">
                {req.patient_name}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                {req.cert_number}
              </span>
              <Badge
                className={cn(
                  "text-[10px] font-medium rounded-full px-2.5 border flex items-center gap-1",
                  meta.color,
                )}
              >
                <meta.icon className="h-2.5 w-2.5" />
                {meta.label}
              </Badge>
            </div>
          </div>
        </div>

        {isApproved && (
          <div className="flex gap-1.5 sm:ml-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-border gap-1.5"
            >
              <QrCode className="h-3 w-3" /> QR Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-border gap-1.5"
            >
              <Download className="h-3 w-3" /> Download
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
        {/* Flags */}
        {(redFlags.length > 0 || highRisk) && (
          <div className="flex flex-col gap-2">
            {redFlags.length > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-md border border-destructive/30 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  <strong>Red flag symptoms reported:</strong>{" "}
                  {redFlags.map((s) => SYMPTOM_LABELS[s]).join(", ")}. Physical
                  examination may be required.
                </p>
              </div>
            )}
            {highRisk && (
              <div className="flex items-start gap-2.5 p-3 rounded-md border border-amber-400/40 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>High-risk job type:</strong> {req.job_type}. This
                  typically requires an in-person examination.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Patient info + request meta — 1 col mobile, 2 col sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <SectionCard icon={User} title="Patient Information">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                {getInitials(req.patient_name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {req.patient_name}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">
                  {formatId(req.patient_id)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Gender", value: req.patient_gender },
                { label: "Age", value: `${req.patient_age} years` },
                { label: "Blood type", value: req.patient_blood_type },
                { label: "City", value: req.patient_city },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-[11px] font-medium text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={CalendarDays} title="Request Details">
            <div className="space-y-2.5">
              {[
                { label: "Purpose", value: req.purpose },
                { label: "Job type", value: req.job_type },
                { label: "Requested", value: fmtDateTime(req.requested_at) },
                ...(req.reviewed_at
                  ? [{ label: "Reviewed", value: fmtDateTime(req.reviewed_at) }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-[11px] font-medium text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Vitals — 2 col mobile, 4 col sm+ */}
        {req.vitals && Object.values(req.vitals).some(Boolean) && (
          <SectionCard icon={HeartPulse} title="Reported Vitals">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {req.vitals.temperature && (
                <VitalChip label="Temp (°C)" value={req.vitals.temperature} />
              )}
              {req.vitals.blood_pressure && (
                <VitalChip label="Blood pressure" value={req.vitals.blood_pressure} />
              )}
              {req.vitals.pulse && (
                <VitalChip label="Pulse (bpm)" value={req.vitals.pulse} />
              )}
              {req.vitals.oxygen_saturation && (
                <VitalChip label="O₂ sat (%)" value={req.vitals.oxygen_saturation} />
              )}
            </div>
          </SectionCard>
        )}

        {/* Symptoms + History — 1 col mobile, 2 col sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <SectionCard icon={Activity} title="Symptom Screening">
            <div>
              {Object.entries(req.symptoms).map(([key, val]) => (
                <BoolRow
                  key={key}
                  label={SYMPTOM_LABELS[key]}
                  value={val}
                  redFlag={RED_FLAG_SYMPTOMS.includes(key)}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={BookOpen} title="Medical History">
            <div>
              {Object.entries(req.history).map(([key, val]) => (
                <BoolRow
                  key={key}
                  label={HISTORY_LABELS[key]}
                  value={val === "Yes"}
                />
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Functional — 1 col mobile, 2-col grid sm+ */}
        <SectionCard icon={User} title="Functional Assessment">
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
            {Object.entries(req.functional).map(([key, val]) => (
              <div
                key={key}
                className="flex items-center justify-between py-1.5 border-b border-border last:border-0 sm:[&:nth-last-child(2)]:border-0"
              >
                <span className="text-xs text-foreground">
                  {FUNCTIONAL_LABELS[key]}
                </span>
                <div
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-medium",
                    val ? "text-emerald-600" : "text-destructive",
                  )}
                >
                  {val ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {val ? "Yes" : "No"}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Patient notes */}
        {req.notes && (
          <SectionCard icon={FileText} title="Patient Notes">
            <p className="text-xs text-foreground leading-relaxed">{req.notes}</p>
          </SectionCard>
        )}

        {/* Doctor decision panel */}
        <SectionCard
          icon={Stethoscope}
          title={canDecide ? "Doctor's Decision" : "Review Summary"}
        >
          {canDecide ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Decision
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DECISIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDecision(d)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                        decision === d
                          ? d === "Fit"
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : d === "Temporarily unfit"
                              ? "bg-amber-500 text-white border-amber-500"
                              : "bg-destructive text-destructive-foreground border-destructive"
                          : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Doctor's notes (optional)
                </Label>
                <textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  rows={3}
                  placeholder="Clinical observations, recommendations, or reason for referral.."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={!decision || saving}
                className={cn(
                  "text-xs gap-2 transition-all",
                  saved
                    ? "bg-emerald-500 text-white hover:bg-emerald-500"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {saved ? (
                  <><Check className="h-3.5 w-3.5" /> Saved</>
                ) : saving ? (
                  "Saving.."
                ) : (
                  <><Pencil className="h-3.5 w-3.5" /> Submit decision</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Decision:
                </span>
                <Badge
                  className={cn(
                    "text-[11px] font-medium rounded-full px-3 border",
                    req.decision === "Fit"
                      ? "bg-emerald-500/15 text-emerald-600 border-emerald-400/30"
                      : req.decision === "Temporarily unfit"
                        ? "bg-amber-500/15 text-amber-600 border-amber-400/30"
                        : "bg-destructive/15 text-destructive border-destructive/25",
                  )}
                >
                  {req.decision}
                </Badge>
              </div>
              {req.doctor_notes && (
                <p className="text-xs text-foreground leading-relaxed">
                  {req.doctor_notes}
                </p>
              )}
              {req.reviewed_at && (
                <p className="text-[10px] text-muted-foreground">
                  Reviewed on {fmtDateTime(req.reviewed_at)}
                </p>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
function DoctorFitnessCertificates() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<CertRequest[]>(MOCK_REQUESTS);
  const [activeFilter, setActiveFilter] = useState<CertStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CertRequest | null>(null);

  const handleUpdate = (id: string, decision: string, notes: string) => {
    const newStatus: CertStatus =
      decision === "Fit"
        ? "approved"
        : decision === "Temporarily unfit"
          ? "in_review"
          : "rejected";
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, decision, doctor_notes: notes, status: newStatus, reviewed_at: new Date().toISOString() }
          : r,
      ),
    );
    setSelected((prev) =>
      prev?.id === id
        ? { ...prev, decision, doctor_notes: notes, status: newStatus, reviewed_at: new Date().toISOString() }
        : prev,
    );
  };

  const filtered = requests.filter((r) => {
    const matchFilter = activeFilter === "all" || r.status === activeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.patient_name.toLowerCase().includes(q) ||
      r.cert_number.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = Object.fromEntries(
    FILTER_TABS.map(({ id }) => [
      id,
      id === "all"
        ? requests.length
        : requests.filter((r) => r.status === id).length,
    ]),
  ) as Record<CertStatus | "all", number>;

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.fitness_certificates.title", "Fitness Certificates")}
          subtitle={t(
            "pages.doctor.fitness_certificates.subtitle",
            "Review and manage patient certificate requests",
          )}
        />

        {/* Matches PharmacyProfile outer padding */}
        <div className="px-3 py-4 sm:px-6 sm:py-8">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex min-h-[580px]">

            {/* ── Left panel: list
                Mobile: full width when no selection, hidden when detail open
                sm+: fixed width sidebar when detail open, full width otherwise
            ── */}
            <div
              className={cn(
                "flex flex-col border-border",
                selected
                  ? "hidden sm:flex sm:w-72 sm:border-r lg:w-80 shrink-0"
                  : "flex-1",
              )}
            >
              {/* Filter tabs — horizontal scroll on all sizes */}
              <div className="flex items-center border-b border-border bg-muted/30 px-2 sm:px-3 overflow-x-auto">
                {FILTER_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveFilter(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap -mb-px shrink-0",
                      activeFilter === id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        "text-[10px] font-semibold rounded-full px-1.5 py-0 min-w-[18px] text-center leading-5",
                        activeFilter === id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {counts[id]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="px-3 py-2.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, ID or purpose…"
                    className="pl-8 h-8 text-xs border-border focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">No requests found.</p>
                  </div>
                ) : (
                  filtered.map((req) => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      onOpen={() => setSelected(req)}
                      compact={!!selected}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ── Right panel: detail
                Mobile: full width, replaces list
                sm+: flex-1 alongside sidebar
            ── */}
            {selected ? (
              <div className="flex-1 flex flex-col min-h-0">
                <RequestDetail
                  req={selected}
                  onBack={() => setSelected(null)}
                  onUpdate={handleUpdate}
                />
              </div>
            ) : (
              /* Empty state — hidden on mobile (list already shows), visible sm+ */
              <div className="hidden sm:flex flex-1 items-center justify-center text-center p-10">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Stethoscope className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Select a request
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Click any request on the left to review it and issue a decision.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DoctorFitnessCertificates;