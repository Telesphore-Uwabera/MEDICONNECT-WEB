import crypto from "crypto";

// TURN is configured with the VITE_ prefix in .env, but that prefix only decides
// what Vite exposes to the browser bundle — Node still sees VITE_TURN_HOST in
// process.env. Reading only the bare names meant every call token shipped a
// STUN-only ICE config, so peers behind symmetric NAT or CGNAT (mobile data)
// gathered no usable candidate and the call died at ICE "failed". Accept both
// spellings.
function setting(...names) {
  for (const name of names) {
    let value = String(process.env[name] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (value) return value;
  }
  return "";
}

function hostPort(value, fallbackPort) {
  const base = String(value || "")
    .replace(/^(?:turn|turns|stun|https?):\/\//, "")
    .replace(/^(?:turn|turns):/, "")
    .split("?")[0]
    .split("/")[0];
  const split = base.lastIndexOf(":");
  if (split > 0) return { host: base.slice(0, split), port: base.slice(split + 1) || fallbackPort };
  return { host: base, port: fallbackPort };
}

const warned = new Set();

function warnOnce(message) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[WebRTC] ${message}`);
}

const SECRET_ENV = ["TURN_SECRET", "VITE_TURN_SECRET", "TURN_AUTH_SECRET", "VITE_TURN_AUTH_SECRET"];
const USERNAME_ENV = ["TURN_USERNAME", "VITE_TURN_USERNAME"];
const PASSWORD_ENV = ["TURN_PASSWORD", "TURN_CREDENTIAL", "VITE_TURN_PASSWORD", "VITE_TURN_CREDENTIAL"];

/**
 * A relay configured with coTURN's `use-auth-secret` accepts short-lived
 * credentials derived from that secret. A relay configured with a static `user=`
 * entry needs the username and password instead, so prefer the secret and fall
 * back to the static pair. The mode is reported so a deployment can be audited
 * without printing the credential itself.
 */
function hmacAuth() {
  const secret = setting(...SECRET_ENV);
  if (!secret) return null;
  const username = `${Math.floor(Date.now() / 1000) + 12 * 3600}:mediconnect`;
  return {
    mode: "auth-secret",
    username,
    credential: crypto.createHmac("sha1", secret).update(username).digest("base64"),
  };
}

function staticAuth() {
  const username = setting(...USERNAME_ENV);
  const credential = setting(...PASSWORD_ENV);
  if (!username || !credential) return null;
  return { mode: "static", username, credential };
}

/**
 * Offer REST/HMAC credentials (coTURN use-auth-secret) and, when configured,
 * the long-lived user= pair as a second iceServer. Chrome tries both; a 401
 * on the unused method is normal and must not be treated as a failed call.
 */
function relayAuthList() {
  const hmac = hmacAuth();
  const stored = staticAuth();
  const list = [];
  if (hmac) list.push(hmac);
  if (stored) list.push(stored);
  return list;
}

function relayAuth() {
  return relayAuthList()[0] || { mode: "none" };
}

/** Where the relay lives. TLS is derived from the host on 5349 unless configured. */
function relayEndpoints() {
  const relay = setting("TURN_URL", "TURN_HOST", "VITE_TURN_URL", "VITE_TURN_HOST");
  const secure = setting("TURNS_URL", "TURNS_HOST", "VITE_TURNS_URL", "VITE_TURNS_HOST");
  const turnsPort = setting("TURNS_PORT", "VITE_TURNS_PORT") || "5349";
  const plain = relay ? hostPort(relay, setting("TURN_PORT", "VITE_TURN_PORT") || "3478") : null;
  const tls = secure ? hostPort(secure, turnsPort) : plain ? { host: plain.host, port: turnsPort } : null;
  return { plain, tls };
}

export function iceServers() {
  // Start with two Google STUN servers for the direct-connection attempt.
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const { plain, tls } = relayEndpoints();
  if (plain) {
    const auths = relayAuthList();
    if (!auths.length) {
      warnOnce(`TURN host ${plain.host}:${plain.port} is set but no credentials are configured (TURN_SECRET or TURN_USERNAME + TURN_PASSWORD) — the relay will reject every allocation.`);
    }
    // One RTCIceServer with several URLs. Splitting each URL into its own
    // iceServer makes Chrome allocate on every NIC and report 701
    // ("Address not associated with the desired network interface").
    const urls = [
      `turn:${plain.host}:${plain.port}`,
      `turn:${plain.host}:${plain.port}?transport=tcp`,
    ];
    if (tls) {
      urls.push(`turns:${tls.host}:${tls.port}?transport=tcp`);
    }
    const credentialSets = auths.length ? auths : [{ mode: "none" }];
    for (const auth of credentialSets) {
      servers.push(
        auth.mode === "none"
          ? { urls }
          : { urls, username: auth.username, credential: auth.credential, credentialType: "password" },
      );
    }
  } else {
    warnOnce("No TURN server configured (set VITE_TURN_HOST or TURN_HOST). Calls will fail whenever both peers are not on a directly reachable network.");
  }

  return servers;
}

/**
 * A read-only audit of the relay configuration for operators: which layer of the
 * TURN setup is missing, expressed as the env var names that would close it.
 * Never returns a credential. The relay host and the auth-secret username are
 * already inside every call token the browser receives, so reporting them adds
 * no exposure.
 */
export function relayDiagnostics() {
  const { plain, tls } = relayEndpoints();
  const auths = relayAuthList();
  const auth = auths[0] || { mode: "none" };
  const relays = iceServers().filter((server) =>
    (Array.isArray(server.urls) ? server.urls : [server.urls]).some((url) => /^turns?:/i.test(String(url))),
  );

  const checks = [
    {
      name: "relay_configured",
      ok: Boolean(plain),
      detail: plain
        ? `Relay resolved to ${plain.host}:${plain.port}.`
        : "No relay host: set TURN_HOST (or TURN_URL) in server/.env to the coTURN address.",
    },
    {
      name: "relay_credentials",
      ok: auth.mode !== "none",
      detail:
        auth.mode === "auth-secret"
          ? "Short-lived credentials are signed with TURN_SECRET; coTURN must run with use-auth-secret and the same secret."
          : auth.mode === "static"
            ? `Static credentials from TURN_USERNAME/TURN_PASSWORD; they must match coTURN's user= entry exactly.`
            : "No credentials: set TURN_SECRET when coTURN uses use-auth-secret, or TURN_USERNAME and TURN_PASSWORD when it uses user=.",
    },
    {
      name: "tls_fallback",
      ok: Boolean(tls),
      detail: tls
        ? `turns:${tls.host}:${tls.port} is offered for carriers that drop UDP 3478 — it only helps if TCP ${tls.port} is open.`
        : plain
          ? "TLS relay not derived; set TURNS_HOST to re-enable it."
          : "No TLS relay, because no relay host is set.",
    },
    {
      name: "room_token_signing",
      ok: Boolean(setting("CALL_TOKEN_SECRET")),
      detail: setting("CALL_TOKEN_SECRET")
        ? "Room tokens are HMAC-signed, so a guessed room name cannot read a consultation's SDP."
        : "CALL_TOKEN_SECRET is unset: room entry and the signal relay fall back to matching the room name alone.",
    },
  ];

  return {
    ok: Boolean(plain) && auth.mode !== "none",
    relay: plain ? { host: plain.host, port: plain.port, tls: tls ? `${tls.host}:${tls.port}` : null } : null,
    credential_mode: auths.length > 1 ? "auth-secret+static" : auth.mode,
    username: auth.username ?? null,
    relays_in_call_token: relays.length,
    checks,
    missing: checks.filter((check) => !check.ok).map((check) => check.name),
  };
}

/**
 * Room tokens are capability strings, not signed JWTs: an accepted instant
 * consultation stores one in a daily_* column and hands the same value back
 * later, so the format cannot become mandatory without locking patients out of
 * links they were already sent. Set CALL_TOKEN_SECRET and the check tightens to
 * an HMAC, which is what makes a guessed room name (`appointment-123`) useless
 * to a stranger who wants to read or poison that consultation's SDP.
 */
function signRoom(room) {
  const secret = setting("CALL_TOKEN_SECRET");
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(`v1|${room}`).digest("base64url").slice(0, 32);
}

function decodePayload(raw) {
  let value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    /* already decoded */
  }
  for (let layer = 0; layer < 3; layer++) {
    const text = Buffer.from(value, "base64").toString("utf8");
    try {
      const payload = JSON.parse(text);
      if (payload && typeof payload === "object") return payload;
    } catch {
      /* not JSON at this layer — peel again */
    }
    value = text;
  }
  return null;
}

function encodePayload(payload) {
  return encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString("base64"));
}

function roomFromPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const room = String(payload.room ?? "").trim();
  if (!room) return null;
  if (!setting("CALL_TOKEN_SECRET")) return room;
  const expected = signRoom(room);
  const given = String(payload.sig ?? "");
  if (given.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected)) ? room : null;
}

/** Returns the room a token is valid for, or null. */
export function roomFromToken(raw) {
  return roomFromPayload(decodePayload(raw));
}

/**
 * Stored guest tokens freeze ICE credentials at mint time. Overlay the live
 * relay list so a TURN password rotation does not 401 every in-progress call.
 */
export function withLiveIce(raw) {
  const payload = decodePayload(raw);
  if (!roomFromPayload(payload)) return null;
  payload.ice_servers = iceServers();
  return encodePayload(payload);
}

export function callToken({ room, role, consultationId, name }) {
  const payload = {
    consultation_id: Number(consultationId) || null,
    role,
    room,
    is_owner: role === "doctor",
    username: name || (role === "doctor" ? "Doctor" : "Patient"),
    ice_servers: iceServers(),
  };
  const sig = signRoom(room);
  if (sig) payload.sig = sig;
  if (!sig) {
    warnOnce("CALL_TOKEN_SECRET is not set, so room tokens cannot be verified — only their room name is checked.");
  }
  return encodePayload(payload);
}
