import { prepareRichTextForSave } from "@/components/ui/rich-textarea";
import type { NotesPayload } from "@/hooks/doctor/use-doctor-appointment";
import type { CreateSummaryPayload as SummaryPayload } from "@/hooks/doctor/use-consultation-summaries";

export type PatientIdentity = {
  patient_id: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  national_id: string;
  address: string;
};

export type CallProofFile = {
  id: number;
  name: string;
  url: string;
  kind: "image" | "pdf" | "file";
};

export type CallProof = {
  id: number;
  text: string;
  created_at?: string;
  files: CallProofFile[];
};

export type CallChart = {
  version: 2;
  identity: PatientIdentity;
  chief_complaint: string;
  medication_history: string;
  allergy_history: string;
  clinical_assessment: string;
  management_plan: string;
  blood_pressure: string;
  temperature: string;
  pulse_rate: string;
  proofs: CallProof[];
};

export const emptyIdentity = (): PatientIdentity => ({
  patient_id: "",
  full_name: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  national_id: "",
  address: "",
});

export const emptyCallChart = (): CallChart => ({
  version: 2,
  identity: emptyIdentity(),
  chief_complaint: "",
  medication_history: "",
  allergy_history: "",
  clinical_assessment: "",
  management_plan: "",
  blood_pressure: "",
  temperature: "",
  pulse_rate: "",
  proofs: [],
});

export const callNotesKey = (id?: number, mode?: "instant" | "appointment") =>
  id != null ? `${mode === "appointment" ? "appointment" : "instant"}_notes:${id}` : null;

function isChart(value: unknown): value is CallChart {
  return Boolean(value && typeof value === "object" && (value as CallChart).version === 2);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseCallChart(raw?: string | null): CallChart {
  if (!raw) return emptyCallChart();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (isChart(parsed)) {
      return {
        ...emptyCallChart(),
        ...parsed,
        version: 2,
        identity: { ...emptyIdentity(), ...(parsed.identity ?? {}) },
        proofs: Array.isArray(parsed.proofs) ? parsed.proofs : [],
      };
    }
    if (parsed && parsed.version === 1) {
      return {
        ...emptyCallChart(),
        chief_complaint: String(parsed.chief_complaint ?? ""),
        medication_history: String(parsed.medications ?? ""),
        allergy_history: String(parsed.allergies ?? ""),
        clinical_assessment: String(parsed.diagnosis ?? ""),
        management_plan: String(parsed.treatment_plan ?? ""),
        blood_pressure: String(parsed.blood_pressure ?? ""),
        temperature: String(parsed.temperature ?? ""),
        pulse_rate: String(parsed.pulse_rate ?? ""),
      };
    }
  } catch {
    /* legacy free-text blob */
  }
  return { ...emptyCallChart(), chief_complaint: raw };
}

export function readCallChart(id?: number, mode: "instant" | "appointment" = "instant"): CallChart {
  const key = callNotesKey(id, mode);
  if (!key) return emptyCallChart();
  try {
    return parseCallChart(localStorage.getItem(key));
  } catch {
    return emptyCallChart();
  }
}

export function writeCallChart(id: number | undefined, mode: "instant" | "appointment", chart: CallChart) {
  const key = callNotesKey(id, mode);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(chart));
  } catch {
    /* ignore quota */
  }
}

export function vitalsExamination(chart: CallChart): string {
  const bits = [
    chart.blood_pressure.trim() && `BP ${chart.blood_pressure.trim()}`,
    chart.temperature.trim() && `Temp ${chart.temperature.trim()}`,
    chart.pulse_rate.trim() && `Pulse ${chart.pulse_rate.trim()}`,
  ].filter(Boolean);
  return bits.join(" · ");
}

export function parseVitalsFromExamination(value?: string | null): Pick<CallChart, "blood_pressure" | "temperature" | "pulse_rate"> {
  const text = String(value ?? "");
  const pick = (label: string) => {
    const match = text.match(new RegExp(`${label}\\s*([^·\\n<]+)`, "i"));
    return match?.[1]?.trim() ?? "";
  };
  return {
    blood_pressure: pick("BP"),
    temperature: pick("Temp"),
    pulse_rate: pick("Pulse"),
  };
}

const IDENTITY_LABELS: Array<[keyof PatientIdentity, string]> = [
  ["full_name", "Full name"],
  ["phone", "Phone"],
  ["date_of_birth", "Date of birth"],
  ["gender", "Gender"],
  ["national_id", "National ID"],
  ["address", "Address"],
  ["patient_id", "Patient ID"],
];

export function identityToAttachmentsHtml(identity: PatientIdentity): string {
  const rows = IDENTITY_LABELS.filter(([key]) => identity[key].trim()).map(
    ([key, label]) => `<p><strong>${label}:</strong> ${escapeHtml(identity[key].trim())}</p>`,
  );
  if (!rows.length) return "";
  return `<div data-mc-identity>${rows.join("")}</div>`;
}

export function parseIdentityFromHtml(html?: string | null): PatientIdentity {
  const identity = emptyIdentity();
  if (!html) return identity;
  const blockMatch = html.match(/data-mc-identity[\s\S]*?>([\s\S]*?)<\/div>/i);
  const block = blockMatch?.[1] ?? html;
  for (const [key, label] of IDENTITY_LABELS) {
    const match = block.match(new RegExp(`${label}:</strong>\\s*([^<]+)`, "i"));
    if (match?.[1]) identity[key] = match[1].trim();
  }
  return identity;
}

export function stripIdentityFromAttachments(html?: string | null): string {
  if (!html) return "";
  return html.replace(/<div[^>]*data-mc-identity[\s\S]*?<\/div>/i, "").trim();
}

export function proofFileKind(nameOrUrl: string): CallProofFile["kind"] {
  const value = nameOrUrl.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(value) || value.startsWith("data:image/")) return "image";
  if (/\.pdf(\?|$)/.test(value) || value.includes("application/pdf")) return "pdf";
  return "file";
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

export function proofsToAttachmentsHtml(proofs: CallProof[]): string {
  if (!proofs.length) return "";
  const blocks = proofs.map((proof) => {
    const files = proof.files
      .map((file) => {
        if (!file.url) return "";
        if (file.kind === "image") {
          return `<p><img src="${escapeAttr(file.url)}" alt="${escapeAttr(file.name)}" /></p>`;
        }
        return `<p><a href="${escapeAttr(file.url)}" target="_blank" rel="noopener">${escapeHtml(file.name || file.url)}</a></p>`;
      })
      .join("");
    const note = proof.text.trim() ? `<p>${escapeHtml(proof.text.trim())}</p>` : "";
    return `<div data-mc-proof="${proof.id}">${note}${files}</div>`;
  });
  return `<div data-mc-proofs>${blocks.join("")}</div>`;
}

export function parseProofsFromHtml(html?: string | null): CallProof[] {
  if (!html) return [];
  const block = html.match(/data-mc-proofs[\s\S]*?>([\s\S]*?)<\/div>\s*$/i)?.[1] ?? html;
  const chunks = [...block.matchAll(/<div[^>]*data-mc-proof="(\d+)"[^>]*>([\s\S]*?)<\/div>/gi)];
  return chunks.map((chunk, index) => {
    const inner = chunk[2] ?? "";
    const text = inner.replace(/<img[\s\S]*?>/gi, "").replace(/<a[\s\S]*?<\/a>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const files: CallProofFile[] = [];
    for (const img of inner.matchAll(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi)) {
      files.push({ id: files.length + 1, url: img[1], name: img[2] || "Image", kind: "image" });
    }
    for (const link of inner.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const name = link[2].replace(/<[^>]+>/g, "").trim() || link[1];
      files.push({ id: files.length + 1, url: link[1], name, kind: proofFileKind(name || link[1]) });
    }
    return { id: Number(chunk[1]) || index + 1, text, files };
  });
}

export function appendProofToCallChart(
  consultationId: number | undefined,
  mode: "instant" | "appointment",
  proof: CallProof,
) {
  if (consultationId == null) return emptyCallChart();
  const chart = readCallChart(consultationId, mode);
  const proofs = chart.proofs.filter((item) => item.id !== proof.id);
  const next = { ...chart, proofs: [proof, ...proofs] };
  writeCallChart(consultationId, mode, next);
  return next;
}

export function chartHasClinicalContent(chart: CallChart): boolean {
  return Boolean(
    chart.chief_complaint.trim() ||
      chart.medication_history.trim() ||
      chart.allergy_history.trim() ||
      chart.clinical_assessment.trim() ||
      chart.management_plan.trim() ||
      vitalsExamination(chart),
  );
}

export function chartToSummaryFields(chart: CallChart): Pick<
  SummaryPayload,
  | "chief_complaint"
  | "medication_history"
  | "allergy_history"
  | "clinical_assessment"
  | "management_plan"
  | "physical_examination"
  | "attachments"
> {
  const exam = vitalsExamination(chart);
  return {
    chief_complaint: prepareRichTextForSave(chart.chief_complaint) ?? "",
    medication_history: prepareRichTextForSave(chart.medication_history) ?? "",
    allergy_history: prepareRichTextForSave(chart.allergy_history) ?? "",
    clinical_assessment: prepareRichTextForSave(chart.clinical_assessment) ?? "",
    management_plan: prepareRichTextForSave(chart.management_plan) ?? "",
    physical_examination: exam ? prepareRichTextForSave(exam) ?? exam : "",
    attachments:
      [identityToAttachmentsHtml(chart.identity), proofsToAttachmentsHtml(chart.proofs ?? [])]
        .filter(Boolean)
        .join("") || "",
  };
}

export function chartToAppointmentNotes(chart: CallChart): NotesPayload {
  return {
    chief_complaint: chart.chief_complaint,
    diagnosis: chart.clinical_assessment,
    treatment_plan: chart.management_plan,
    additional_notes: [
      chart.medication_history.trim() && `Current medications:\n${chart.medication_history.trim()}`,
      chart.allergy_history.trim() && `Allergies:\n${chart.allergy_history.trim()}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    blood_pressure: chart.blood_pressure || undefined,
    temperature: chart.temperature || undefined,
    pulse_rate: chart.pulse_rate || undefined,
  };
}

export function chartToInstantNotesText(chart: CallChart): string {
  const identity = IDENTITY_LABELS.filter(([key]) => chart.identity[key].trim())
    .map(([key, label]) => `${label}: ${chart.identity[key].trim()}`)
    .join("\n");
  const sections: Array<[string, string]> = [
    ["Patient", identity],
    ["Chief complaint", chart.chief_complaint],
    ["Current medications", chart.medication_history],
    ["Allergies", chart.allergy_history],
    ["Assessment", chart.clinical_assessment],
    ["Plan", chart.management_plan],
    ["Vitals", vitalsExamination(chart)],
  ];
  return sections
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}:\n${value.trim()}`)
    .join("\n\n");
}

export function resolvedPatientId(chart: CallChart, fallback?: number | null): number | null {
  const fromForm = Number(chart.identity.patient_id);
  if (Number.isFinite(fromForm) && fromForm > 0) return fromForm;
  if (fallback != null && Number.isFinite(fallback) && fallback > 0) return fallback;
  return null;
}

/** @deprecated use readCallChart */
export function readCallNoteForm(id?: number, mode: "instant" | "appointment" = "instant") {
  return readCallChart(id, mode);
}
