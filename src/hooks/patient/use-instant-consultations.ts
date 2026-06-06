import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstantConsultationRequestPayload {
  doctor_id: number;
  /** Only required for guests (not logged-in users) */
  guest_phone?: string;
  /** Only required for guests (not logged-in users) */
  guest_name?: string;
}

export interface InstantConsultationRequestResponse {
  message: string;
  /** UUID used to poll status — store this after the request */
  guest_token: string;
  queue_position: number;
  people_ahead: number;
}

export type ConsultationStatus = "pending" | "accepted" | "in_progress" | "rejected" | "cancelled";


export interface InstantConsultationStatusResponse {
  status: ConsultationStatus;
  queue_position: number;
  people_ahead: number;
  /** Only present when status === "accepted" */
  room_url?: string;
  /** daily.co guest token — only present when status === "accepted" */
  daily_guest_token?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * POST /public/instant-consultations/request
 * Send the initial request. Works for both logged-in users and guests.
 * For guests, include guest_phone and guest_name in the payload.
 */
export function useInstantConsultationRequest() {
  return useMutation<
    InstantConsultationRequestResponse,
    Error,
    InstantConsultationRequestPayload
  >({
    mutationKey: ["instant-consultation-request"],
    mutationFn: (data) =>
      apiFetch<InstantConsultationRequestResponse>(
        "/public/instant-consultations/request",
        { method: "POST", body: data },
      ),
  });
}

/**
 * GET /public/instant-consultations/{guestToken}/status
 * Poll to check if the doctor has accepted.
 * Only runs when `guestToken` is provided and `enabled` is true.
 * Refetches every 3 seconds while pending.
 */
export function useInstantConsultationStatus(
  guestToken: string | null,
  enabled = true,
) {
  return useQuery<InstantConsultationStatusResponse>({
    queryKey: ["instant-consultation-status", guestToken],
    queryFn: () =>
      apiFetch<InstantConsultationStatusResponse>(
        `/public/instant-consultations/${guestToken}/status`,
      ),
    enabled: !!guestToken && enabled,
    // Poll every 3 s; react-query will stop refetching once we disable it
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once we have a terminal status
      if (status === "accepted" || status === "rejected" || status === "cancelled") {
        return false;
      }
      return 3_000;
    },
    staleTime: 0,
  });
}
