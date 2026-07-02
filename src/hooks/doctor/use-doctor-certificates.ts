import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessErrorMessage, notifyAccessPrompt } from "@/lib/access-events";

const BASE = "/doctor/certificates";

// ─────────────────────────────────────────────────────────────────────────────
// API Types  (snake_case as returned by the server)
// ─────────────────────────────────────────────────────────────────────────────

export type CertStatus =
  | "draft"
  | "pending"
  | "in_review"
  | "issued"
  | "approved"
  | "rejected"
  | "revoked";

export type CertPurpose =
  | "general_fitness"
  | "school_work"
  | "return_to_work"
  | "fitness_for_travel"
  | "other";

export type CertDecision =
  | "fit"
  | "temporarily_unfit"
  | "needs_physical_exam"
  | "referred";

  export interface CertActionResponse {
  certificate: Certificate;
  red_flags_found?: string[];
  requires_inperson?: boolean;
  message?: string;
}
export interface Certificate {
  patient_id: ReactI18NextChildren | Iterable<ReactI18NextChildren>;
  confirmation_session: any;
  confirmation_requested_at: any;
  id: number;
  certificate_number: string;
  status: CertStatus;
  purpose: CertPurpose;
  purpose_other: string | null;
  consent_given: boolean;
  patient_full_name: string;
  patient_national_id: string | null;
  patient_contact: string | null;
  job_heavy_labor: boolean;
  job_driving_machinery: boolean;
  job_armed_forces: boolean;
  job_mining_construction: boolean;
  job_requires_xray: boolean;
  job_none_of_above: boolean;
  temperature: string | null;
  blood_pressure: string | null;
  pulse: string | null;
  oxygen_saturation: string | null;
  vitals_available: boolean;
  red_flag_chest_pain: boolean;
  red_flag_shortness_of_breath: boolean;
  red_flag_syncope: boolean;
  red_flag_severe_headache: boolean;
  red_flag_neurological: boolean;
  red_flag_weight_loss: boolean;
  red_flag_cardiac_history: boolean;
  red_flag_recent_surgery: boolean;
  red_flag_seizure: boolean;
  red_flag_pregnancy_complications: boolean;
  red_flags_found: boolean;
  requires_inperson: boolean;
  has_red_flags: boolean;
  identity_verified_via_video: boolean;
  decision: CertDecision | null;
  doctor_notes: string | null;
  valid_until: string | null;
  appointment_id: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  is_signed: boolean;
  signed_at: string | null;
  current_step: number;
  patient_notes: string | null;
  initial_fee_paid: number;
  actual_fee_paid: number;
  qr_code: string | null;
  pdf_url: string | null;
}

export interface ChecklistAnswer {
  question_id: number;
  boolean_answer: boolean;
  answer: string | null;
}

export interface ConfirmationSession {
  room_url: string;
  doctor_token: string;
  ice_servers: unknown[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const certKeys = {
  all: ["certificates"] as const,
  list: (status?: CertStatus) =>
    status ? [...certKeys.all, "list", status] : [...certKeys.all, "list"],
  detail: (id: number) => [...certKeys.all, "detail", id] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: unwrap any server envelope into a Certificate array
// Handles: plain array, { data: [...] }, { data: {...} }
// ─────────────────────────────────────────────────────────────────────────────

function unwrapList(res: unknown): Certificate[] {
  if (Array.isArray(res)) return res as Certificate[];
  if (res && typeof res === "object" && "data" in res) {
    const inner = (res as { data: unknown }).data;
    if (Array.isArray(inner)) return inner as Certificate[];
    if (inner && typeof inner === "object") return [inner as Certificate];
  }
  return [];
}

function unwrapSingle(res: unknown): Certificate {
  if (res && typeof res === "object") {
    if ("certificate" in res) {
      return (res as { certificate: Certificate }).certificate;
    }
    if ("data" in res) {
      const inner = (res as { data: unknown }).data;
      if (Array.isArray(inner) && inner.length > 0) return inner[0] as Certificate;
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        return inner as Certificate;
      }
    }
    if ("id" in res) return res as Certificate;
  }
  throw new Error("Unexpected certificate response shape");
}


// ─────────────────────────────────────────────────────────────────────────────
// 1. List certificates  GET /certificates[?status=]
// ─────────────────────────────────────────────────────────────────────────────

export function useGetCertificates(status?: CertStatus) {
  return useQuery<Certificate[]>({
    queryKey: certKeys.list(status),
    queryFn: async () => {
      const url = status ? `${BASE}?status=${status}` : BASE;
      const res = await apiFetch(url);
      return unwrapList(res);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Get single certificate  GET /certificates/:id
//    Server auto-moves status  pending → in_review  on open.
// ─────────────────────────────────────────────────────────────────────────────

export function useGetCertificate(id: number | null) {
  const queryClient = useQueryClient();

  return useQuery<Certificate>({
    queryKey: certKeys.detail(id!),
    enabled: id !== null,
    queryFn: async () => {
      const res = await apiFetch(`${BASE}/${id}`);
      const cert = unwrapSingle(res);
      queryClient.invalidateQueries({ queryKey: certKeys.list() });
      return cert;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create certificate (draft)  POST /certificates
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCertPayload {
  appointment_id: number;
  patient_full_name: string;
  patient_national_id?: string;
  patient_contact?: string;
  purpose: CertPurpose;
  purpose_other?: string | null;
  consent_given: boolean;
}

export function useCreateCertificate() {
  const queryClient = useQueryClient();

  return useMutation<Certificate, Error, CreateCertPayload>({
    mutationFn: (payload) =>
      apiFetch(BASE, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certKeys.list() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Update certificate  PUT /certificates/:id
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateCertPayload {
  identity_verified_via_video?: boolean;
  job_heavy_labor?: boolean;
  job_driving_machinery?: boolean;
  job_armed_forces?: boolean;
  job_mining_construction?: boolean;
  job_requires_xray?: boolean;
  job_none_of_above?: boolean;
  temperature?: string;
  blood_pressure?: string;
  pulse?: string;
  oxygen_saturation?: string;
  vitals_available?: boolean;
  red_flag_chest_pain?: boolean;
  red_flag_shortness_of_breath?: boolean;
  red_flag_syncope?: boolean;
  red_flag_severe_headache?: boolean;
  red_flag_neurological?: boolean;
  red_flag_weight_loss?: boolean;
  red_flag_cardiac_history?: boolean;
  red_flag_recent_surgery?: boolean;
  red_flag_seizure?: boolean;
  red_flag_pregnancy_complications?: boolean;
  decision?: CertDecision;
  doctor_notes?: string;
  valid_until?: string;
}

export function useUpdateCertificate(id: number) {
  const queryClient = useQueryClient();

  return useMutation<CertActionResponse, Error, UpdateCertPayload>({
    mutationFn: async (payload) => {
      const res = await apiFetch(`${BASE}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const raw = res as CertActionResponse;
      const certificate = unwrapSingle(res);
      return {
        certificate,
        red_flags_found: raw.red_flags_found,
        requires_inperson: raw.requires_inperson,
        message: raw.message,
      };
    },
    onSuccess: ({ certificate }) => {
      queryClient.setQueryData(certKeys.detail(id), certificate);
      queryClient.invalidateQueries({ queryKey: certKeys.list() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Submit checklist answers  POST /certificates/:id/checklist
// ─────────────────────────────────────────────────────────────────────────────

export function useSubmitChecklist(id: number) {
  const queryClient = useQueryClient();

  return useMutation<Certificate, Error, ChecklistAnswer[]>({
    mutationFn: async (answers) => {
      const res = await apiFetch(`${BASE}/${id}/checklist`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      return unwrapSingle(res);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(certKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: certKeys.list() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Create video confirmation session  POST /certificates/:id/confirmation-session
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateConfirmationSession(id: number) {
  return useMutation<ConfirmationSession, Error, void>({
    mutationFn: () =>
      apiFetch(`${BASE}/${id}/confirmation-session`, { method: "POST" }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Confirm identity  POST /certificates/:id/confirm-identity
// ─────────────────────────────────────────────────────────────────────────────

export function useConfirmIdentity(id: number) {
  const queryClient = useQueryClient();

  return useMutation<Certificate, Error, void>({
    mutationFn: async () => {
      const res = await apiFetch(`${BASE}/${id}/confirm-identity`, { method: "POST" });
      return unwrapSingle(res);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(certKeys.detail(id), updated);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Sign & issue certificate  POST /certificates/:id/sign
//    Prerequisites (enforced by server):
//      - status === "draft" or "in_review"
//      - identity_verified_via_video === true
//      - has_red_flags === false
//      - requires_inperson === false
//      - decision === "fit"
// ─────────────────────────────────────────────────────────────────────────────

export function useSignCertificate(id: number) {
  const queryClient = useQueryClient();

  return useMutation<Certificate, Error, void>({
    mutationFn: async () => {
      const res = await apiFetch(`${BASE}/${id}/sign`, { method: "POST" });
      return unwrapSingle(res);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(certKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: certKeys.list() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Reject certificate  POST /certificates/:id/reject
// ─────────────────────────────────────────────────────────────────────────────

export function useRejectCertificate(id: number) {
  const queryClient = useQueryClient();

  return useMutation<Certificate, Error, { reason: string }>({
    mutationFn: async (payload) => {
      const res = await apiFetch(`${BASE}/${id}/reject`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return unwrapSingle(res);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(certKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: certKeys.list() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Revoke certificate  POST /certificates/:id/revoke
// ─────────────────────────────────────────────────────────────────────────────

export function useRevokeCertificate(id: number) {
  const queryClient = useQueryClient();

  return useMutation<Certificate, Error, { reason: string }>({
    mutationFn: async (payload) => {
      const res = await apiFetch(`${BASE}/${id}/revoke`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return unwrapSingle(res);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(certKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: certKeys.list() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Download PDF  GET /certificates/:id/download
//     Uses native fetch because apiFetch returns parsed JSON, not a raw Response.
//     Reads auth token the same way apiFetch does — adjust the key if needed.
// ─────────────────────────────────────────────────────────────────────────────

export function useDownloadCertificate() {
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      // Grab the bearer token from wherever your app stores it.
      // Common locations: localStorage, sessionStorage, a cookie, or a Zustand/Redux store.
      // Adjust "auth_token" to match the key used by apiFetch in your project.
      const token =
        localStorage.getItem("auth_token") ??
        sessionStorage.getItem("auth_token") ??
        "";

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/v1/doctor/certificates/${id}/download`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/pdf",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          notifyAccessPrompt({
            reason: response.status === 401 || !token ? "login" : "role",
            message: getAccessErrorMessage(response.status, !!token) ?? undefined,
          });
        }
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Toggle availability  POST /certificates/availability
// ─────────────────────────────────────────────────────────────────────────────

export function useToggleAvailability() {
  const queryClient = useQueryClient();

  return useMutation<{ is_available: boolean }, Error, void>({
    mutationFn: () =>
      apiFetch(`${BASE}/availability`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certKeys.all });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers  (used by the UI layer)
// ─────────────────────────────────────────────────────────────────────────────

/** Map API decision value → human-readable label */
export const DECISION_LABELS: Record<CertDecision, string> = {
  fit: "Fit",
  temporarily_unfit: "Temporarily unfit",
  needs_physical_exam: "Needs physical examination",
  referred: "Referred to nearest facility",
};

/** Map API status → UI meta (label, colors, icon key) */
export const STATUS_DISPLAY: Record<
  CertStatus,
  { label: string; colorClass: string; dotClass: string }
> = {
  draft: {
    label: "Draft",
    colorClass: "bg-slate-500/15 text-slate-600 border-slate-400/30",
    dotClass: "bg-slate-500",
  },
  pending: {
    label: "Pending",
    colorClass: "bg-amber-500/15 text-amber-600 border-amber-400/30",
    dotClass: "bg-amber-500",
  },
  in_review: {
    label: "In Review",
    colorClass: "bg-blue-500/15 text-blue-600 border-blue-400/30",
    dotClass: "bg-blue-500",
  },
  issued: {
    label: "Issued",
    colorClass: "bg-emerald-500/15 text-emerald-600 border-emerald-400/30",
    dotClass: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    colorClass: "bg-destructive/15 text-destructive border-destructive/25",
    dotClass: "bg-destructive",
  },
  revoked: {
    label: "Revoked",
    colorClass: "bg-slate-500/15 text-slate-500 border-slate-400/30",
    dotClass: "bg-slate-500",
  },
};

/** Derive a job-type display string from the boolean flags on a Certificate */
export function getJobTypeLabel(cert: Certificate): string {
  if (cert.job_heavy_labor) return "Heavy physical labor";
  if (cert.job_driving_machinery) return "Driving/operating machinery";
  if (cert.job_armed_forces) return "Armed forces";
  if (cert.job_mining_construction) return "Mining/construction";
  if (cert.job_requires_xray) return "Requires X-ray clearance";
  return "None of the above";
}

/** Collect active red-flag keys from a Certificate */
export const RED_FLAG_KEYS: Array<keyof Certificate> = [
  "red_flag_chest_pain",
  "red_flag_shortness_of_breath",
  "red_flag_syncope",
  "red_flag_severe_headache",
  "red_flag_neurological",
  "red_flag_weight_loss",
  "red_flag_cardiac_history",
  "red_flag_recent_surgery",
  "red_flag_seizure",
  "red_flag_pregnancy_complications",
];

export const RED_FLAG_LABELS: Record<string, string> = {
  red_flag_chest_pain: "Chest pain",
  red_flag_shortness_of_breath: "Shortness of breath",
  red_flag_syncope: "Syncope / fainting",
  red_flag_severe_headache: "Severe headache",
  red_flag_neurological: "Neurological symptoms",
  red_flag_weight_loss: "Unexplained weight loss",
  red_flag_cardiac_history: "Cardiac history",
  red_flag_recent_surgery: "Recent surgery",
  red_flag_seizure: "Seizure",
  red_flag_pregnancy_complications: "Pregnancy complications",
};

export function getActiveRedFlags(cert: Certificate): string[] {
  return RED_FLAG_KEYS.filter((k) => cert[k] === true).map(
    (k) => RED_FLAG_LABELS[k as string],
  );
}

/** Whether the doctor can still make/change a decision */
export function canMakeDecision(cert: Certificate): boolean {
  return (
    cert.status === "draft" ||
    cert.status === "in_review" ||
    cert.status === "pending"
  );
}

/** Whether the certificate can be signed (all server prerequisites met) */
export function canSign(cert: Certificate): boolean {
  return (
    (cert.status === "draft" || cert.status === "in_review") &&
    cert.identity_verified_via_video &&
    !cert.has_red_flags &&
    !cert.requires_inperson &&
    cert.decision === "fit"
  );
}
