import crypto from "crypto";

// TURN is configured with the VITE_ prefix in .env, but that prefix only decides
// what Vite exposes to the browser bundle — Node still sees VITE_TURN_HOST in
// process.env. Reading only the bare names meant every call token shipped a
// STUN-only ICE config, so peers behind symmetric NAT or CGNAT (mobile data)
// gathered no usable candidate and the call died at ICE "failed". Accept both
// spellings.
function setting(...names) {
  for (const name of names) {
    const value = String(process.env[name] ?? "").trim();
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

/**
 * A relay configured with coTURN's `use-auth-secret` (the `VITE_TURN_SECRET`
 * documented in the README) accepts short-lived credentials derived from that
 * secret. A relay configured with a static `user=` entry needs the username and
 * password instead, so prefer the secret and fall back to the static pair.
 */
function relayAuth() {
  const secret = setting("TURN_SECRET", "VITE_TURN_SECRET", "TURN_AUTH_SECRET", "VITE_TURN_AUTH_SECRET");
  if (secret) {
    const username = `${Math.floor(Date.now() / 1000) + 12 * 3600}:mediconnect`;
    return { username, credential: crypto.createHmac("sha1", secret).update(username).digest("base64") };
  }
  const username = setting("TURN_USERNAME", "VITE_TURN_USERNAME");
  const credential = setting("TURN_PASSWORD", "TURN_CREDENTIAL", "VITE_TURN_PASSWORD", "VITE_TURN_CREDENTIAL");
  return username && credential ? { username, credential } : {};
}

export function iceServers() {
  // Start with two Google STUN servers for the direct-connection attempt.
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const relay = setting("TURN_URL", "TURN_HOST", "VITE_TURN_URL", "VITE_TURN_HOST");
  const secure = setting("TURNS_URL", "TURNS_HOST", "VITE_TURNS_URL", "VITE_TURNS_HOST");
  const turnsPort = setting("TURNS_PORT", "VITE_TURNS_PORT") || "5349";
  const plain = relay ? hostPort(relay, setting("TURN_PORT", "VITE_TURN_PORT") || "3478") : null;
  // TLS is derived from the relay host on 5349 unless configured separately.
  const tls = secure ? hostPort(secure, turnsPort) : (plain ? { host: plain.host, port: turnsPort } : null);

  if (plain) {
    const auth = relayAuth();
    if (!auth.username) {
      warnOnce(`TURN host ${plain.host}:${plain.port} is set but no credentials are configured (TURN_SECRET or TURN_USERNAME + TURN_PASSWORD) — the relay will reject every allocation.`);
    }
    servers.push({ urls: `turn:${plain.host}:${plain.port}`, ...auth });
    // Second candidate for networks that block UDP 3478.
    servers.push({ urls: `turn:${plain.host}:${plain.port}?transport=tcp`, ...auth });
    if (tls) {
      // TLS penetrates strict firewalls (hospitals, offices) that drop UDP.
      servers.push({ urls: `turns:${tls.host}:${tls.port}`, ...auth });
    }
  } else {
    warnOnce("No TURN server configured (set VITE_TURN_HOST or TURN_HOST). Calls will fail whenever both peers are not on a directly reachable network.");
  }

  return servers;
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

/** Returns the room a token is valid for, or null. */
export function roomFromToken(raw) {
  let value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    /* already decoded */
  }
  // Links generated from email/SMS may carry extra base64 layers.
  for (let layer = 0; layer < 3; layer++) {
    const text = Buffer.from(value, "base64").toString("utf8");
    try {
      const payload = JSON.parse(text);
      if (payload && typeof payload === "object") {
        const room = String(payload.room ?? "").trim();
        if (!room) return null;
        if (!setting("CALL_TOKEN_SECRET")) return room;
        const expected = signRoom(room);
        const given = String(payload.sig ?? "");
        if (given.length !== expected.length) return null;
        return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected)) ? room : null;
      }
    } catch {
      /* not JSON at this layer — peel again */
    }
    value = text;
  }
  return null;
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
  return encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString("base64"));
}
