// Shared helpers for rejoining an in-progress instant consultation.
//
// The backend exposes dedicated "live/active session" endpoints that return the
// in-progress consultation (room + join token). Their exact field names can
// vary, so we resolve defensively across the known shapes and decode the join
// token the same way the join flows do, injecting the consultation id so the
// in-call chat works.

import { apiFetch } from "@/lib/Api";

export interface RejoinTarget {
  roomName: string;
  token: any;
}

/** Raw shape returned by the live/active-session endpoints (defensive). */
export interface LiveSessionResponse {
  id?: number;
  consultation_id?: number;
  instant_consultation_request_id?: number;
  status?: string;
  room_url?: string;
  room_name?: string;
  doctor_token?: string;
  daily_token?: string;
  daily_guest_token?: string;
  guest_token?: string;
  token?: string;
  data?: any;
  [k: string]: any;
}

/**
 * Turn a live/active-session response into a { roomName, token-object } we can
 * hand to startCall(). Returns null if it doesn't contain a usable room+token.
 */
export function sessionToRejoinTarget(resp: LiveSessionResponse | null | undefined): RejoinTarget | null {
  if (!resp) return null;
  const d = (resp.data ?? resp) as LiveSessionResponse;

  const roomUrl = d.room_url ?? (d as any).roomUrl;
  const roomName: string | undefined =
    d.room_name ??
    (d as any).roomName ??
    (typeof roomUrl === "string" ? roomUrl.split("/consultation/").pop() : undefined);

  const rawToken: unknown =
    d.doctor_token ?? d.daily_guest_token ?? d.guest_token ?? d.daily_token ?? d.token;

  const consultationId =
    d.consultation_id ?? d.id ?? d.instant_consultation_request_id;

  if (!roomName || typeof rawToken !== "string") return null;

  try {
    const decoded = JSON.parse(atob(decodeURIComponent(rawToken)));
    if (consultationId != null) decoded.consultation_id = consultationId;
    return { roomName, token: decoded };
  } catch {
    return null;
  }
}

/** Last-resort fallback: the call we persisted locally this browser session. */
export function rejoinFromPersistedCall(): RejoinTarget | null {
  try {
    const raw = sessionStorage.getItem("active_call_session");
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.roomName && p?.token) return { roomName: p.roomName, token: p.token };
  } catch {
    /* ignore */
  }
  return null;
}

// ── Endpoint fetchers (on-demand) ──────────────────────────────────────────────

/** Patient: in-progress session for rejoin. Returns null on any error/none. */
export async function fetchPatientLiveSession(): Promise<LiveSessionResponse | null> {
  try {
    return await apiFetch<LiveSessionResponse>("/patient/instant-consultations/active-session/live");
  } catch {
    return null;
  }
}

/** Patient: any active session (any status). */
export async function fetchPatientActiveSession(): Promise<LiveSessionResponse | null> {
  try {
    return await apiFetch<LiveSessionResponse>("/patient/instant-consultations/active-session");
  } catch {
    return null;
  }
}

/** Doctor: in-progress session for rejoin. */
export async function fetchDoctorLiveSession(): Promise<LiveSessionResponse | null> {
  try {
    return await apiFetch<LiveSessionResponse>("/doctor/instant-consultations/live-session");
  } catch {
    return null;
  }
}
