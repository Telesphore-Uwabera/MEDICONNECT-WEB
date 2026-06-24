// Patient — read-only consultation summary for an appointment or instant consult.
//   GET /patient/appointments/{id}/summary
//   GET /patient/instant-consultations/{id}/summary
// Both return { summary }. A 404 simply means no summary was recorded.

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { downloadAuthedFile } from "@/lib/download-file";
import { decodeCallToken } from "@/lib/scheduled-call";
import type {
  ConsultationSummary,
  SummaryLookupType,
} from "@/hooks/doctor/use-consultation-summaries";

export type { ConsultationSummary, SummaryLookupType };

interface SummaryResponse {
  summary: ConsultationSummary;
}

export function usePatientAppointmentSummary(
  appointmentId: number | string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["patient-appointment-summary", String(appointmentId)],
    queryFn: () =>
      apiFetch<SummaryResponse>(`/patient/appointments/${appointmentId}/summary`),
    enabled: enabled && appointmentId != null,
    retry: false,
  });
}

/** The list/quick id the patient holds for an instant is the request id, but the
 *  doctor saves the summary under the real instant_consultations id (the call
 *  token's native consultation_id). Resolve that real id from the quick detail
 *  token (same source the join uses) before looking up the summary. */
async function resolveRealInstantId(requestId: number | string): Promise<number | null> {
  try {
    const detail = await apiFetch<{
      daily_guest_token?: string;
      consultation_id?: number;
    }>(`/patient/quick/${requestId}`);
    const decoded = decodeCallToken(detail?.daily_guest_token);
    const cid = Number(decoded?.consultation_id ?? detail?.consultation_id);
    return Number.isFinite(cid) && cid > 0 ? cid : null;
  } catch {
    return null;
  }
}

export function usePatientInstantSummary(
  instantId: number | string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["patient-instant-summary", String(instantId)],
    enabled: enabled && instantId != null,
    retry: false,
    queryFn: async () => {
      const raw = instantId as number | string;
      const realId = await resolveRealInstantId(raw);

      // Prefer the resolved real consultation id; fall back to the raw id.
      const ids = realId != null && String(realId) !== String(raw) ? [realId, raw] : [raw];
      let lastErr: unknown;
      for (const id of ids) {
        try {
          return await apiFetch<SummaryResponse>(
            `/patient/instant-consultations/${id}/summary`,
          );
        } catch (e) {
          lastErr = e;
          if ((e as { status?: number })?.status !== 404) throw e;
        }
      }
      throw lastErr;
    },
  });
}

/**
 * GET /patient/consultation-summaries/{id}/download-pdf
 * id = summary id, or appointment/instant id with ?type=. Must belong to the
 * logged-in patient.
 */
export function useDownloadPatientSummary() {
  return useMutation<void, Error, { id: number; type?: SummaryLookupType }>({
    mutationFn: ({ id, type }) => {
      const qs = type ? `?type=${type}` : "";
      return downloadAuthedFile(
        `/patient/consultation-summaries/${id}/download-pdf${qs}`,
        `consultation-summary-${id}.pdf`,
      );
    },
  });
}
