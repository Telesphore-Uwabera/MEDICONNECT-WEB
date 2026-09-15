// Shared helpers for rejoining an in-progress instant consultation.
//
// The backend exposes dedicated "live/active session" endpoints that return the
// in-progress consultation (room + join token). Their exact field names can
// vary, so we resolve defensively across the known shapes and decode the join
// token the same way the join flows do, injecting the consultation id so the
// in-call chat works.

import { apiFetch } from "@/lib/api";
import { decodeCallToken } from "@/lib/scheduled-call";

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
  daily_room_name?: string;
  doctor_token?: string;
  daily_doctor_token?: string;
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
 *
 * `prefer` selects which side's token to use. This MATTERS: the backend can
 * return both a doctor token (is_owner:true) and a guest token (is_owner:false)
 * in the same payload (e.g. /patient/quick). If the doctor accidentally rejoins
 * with the guest token, BOTH peers are is_owner:false, nobody sends the WebRTC
 * offer, and the call hangs on "Connecting". We pick the role's token (covering
 * both the `daily_*` and bare field names) and enforce is_owner to be safe.
 */
export function sessionToRejoinTarget(
  resp: LiveSessionResponse | null | undefined,
  prefer: "doctor" | "patient" = "doctor",
): RejoinTarget | null {
  if (!resp) return null;
  const d = (resp.data ?? resp) as LiveSessionResponse;

  const roomUrl = d.room_url ?? (d as any).roomUrl;
  const roomName: string | undefined =
    d.room_name ??
    (d as any).roomName ??
    d.daily_room_name ??
    (typeof roomUrl === "string" ? roomUrl.split("/consultation/").pop() : undefined);

  const doctorTok = d.daily_doctor_token ?? d.doctor_token;
  const guestTok = d.daily_guest_token ?? d.guest_token;
  // Use the token for THIS role; fall back to a generic token only if the
  // role-specific one is absent (is_owner is enforced below regardless).
  const rawToken: unknown =
    prefer === "doctor"
      ? (doctorTok ?? d.daily_token ?? d.token ?? guestTok)
      : (guestTok ?? d.daily_token ?? d.token ?? doctorTok);

  const consultationId =
    d.consultation_id ?? d.id ?? d.instant_consultation_request_id;

  if (!roomName || typeof rawToken !== "string") return null;

  const decoded = decodeCallToken(rawToken);
  if (!decoded) return null;
  if (consultationId != null) decoded.consultation_id = consultationId;
  // Enforce the role so the doctor is always the owner (offerer) and the patient
  // never is — even if the chosen token field carried the wrong flag.
  decoded.is_owner = prefer === "doctor";
  return { roomName, token: decoded };
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
