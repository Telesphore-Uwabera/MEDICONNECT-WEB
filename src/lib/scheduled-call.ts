// Reuse the instant-consultation in-app call (ConsultationRoom + chat) for
// scheduled appointments. The scheduled `join` endpoints return the same kind
// of payload (token + room_name/room_url), so if the token is a custom WebRTC
// token (base64 JSON containing ice_servers) we can open the exact same call.

export interface JoinTokenResponse {
  token?: string;
  room_name?: string;
  room_url?: string;
  join_url?: string;
}

/**
 * Decode a call token into its JSON object. The token is base64-encoded JSON,
 * but some link/notification generators base64-encode it more than once (the
 * email/SMS verification links do this — the value decodes to *another* base64
 * string). Peel up to a few base64 layers until we reach parseable JSON.
 * Returns null if it never resolves to a JSON object (e.g. a Daily.co JWT).
 */
export function decodeCallToken(raw: string | undefined | null): any | null {
  if (!raw) return null;
  let s: string;
  try {
    s = decodeURIComponent(raw);
  } catch {
    s = raw;
  }
  for (let i = 0; i < 3; i++) {
    let decoded: string;
    try {
      decoded = atob(s);
    } catch {
      return null; // not base64 — give up
    }
    try {
      const obj = JSON.parse(decoded);
      if (obj && typeof obj === "object") return obj;
    } catch {
      // not JSON yet — assume another base64 layer and keep peeling
    }
    s = decoded;
  }
  return null;
}

/**
 * If the join response carries a custom WebRTC token (same shape as instant
 * consults), open the in-app ConsultationRoom via startCall and return true.
 * Returns false when the token is absent or isn't our format (e.g. a Daily.co
 * JWT), so the caller can fall back to its previous behaviour.
 */
export function startInAppCallFromJoin(
  startCall: (roomName: string, token: any) => void,
  res: JoinTokenResponse | undefined,
  opts: { consultationId?: number | string; isOwner?: boolean } = {},
): boolean {
  if (!res?.token) return false;

  const decoded: any = decodeCallToken(res.token);
  if (decoded == null) {
    console.warn("[scheduled-call] join token is not base64-JSON (likely a Daily.co JWT)");
    return false; // not a base64-JSON WebRTC token
  }
  if (!decoded || typeof decoded !== "object") return false;

  // ice_servers is the strongest signal, but some tokens may omit it. Accept any
  // of the instant-token markers so the patient (whose token can be lighter) is
  // still opened in-app instead of being bounced to a tokenless link.
  const looksWebRTC =
    Array.isArray(decoded.ice_servers) ||
    typeof decoded.room === "string" ||
    typeof decoded.username === "string";
  if (!looksWebRTC) {
    console.warn("[scheduled-call] join token isn't a WebRTC token:", decoded);
    return false;
  }
  if (!Array.isArray(decoded.ice_servers)) decoded.ice_servers = [];

  // Scheduled appointments use the appointment chat endpoints/channel, which are
  // keyed by the APPOINTMENT id — not the token's internal consultation/session
  // id. Force the appointment id so chat hits /chat/{appointmentId} correctly.
  if (opts.consultationId != null) {
    const n = Number(opts.consultationId);
    decoded.consultation_id = Number.isFinite(n) ? n : opts.consultationId;
  }
  if (opts.isOwner != null && decoded.is_owner == null) {
    decoded.is_owner = opts.isOwner;
  }
  decoded.chat_mode = "appointment";

  const roomName =
    res.room_name ||
    (typeof res.room_url === "string" ? res.room_url.split("/consultation/").pop() : undefined) ||
    decoded.room ||
    (opts.consultationId != null ? String(opts.consultationId) : "");

  if (!roomName) return false;

  startCall(roomName, decoded);
  return true;
}
