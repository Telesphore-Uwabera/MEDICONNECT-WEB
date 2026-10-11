export function iceServers() {
  // Always start with two Google STUN servers for fast direct-connection
  // attempts — STUN works when both peers have reachable IPs.
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const username = process.env.TURN_USERNAME || undefined;
  const credential = process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL || undefined;

  // Primary TURN (UDP+TCP, port 3478) — works on most networks
  const turnHost = process.env.TURN_URL || process.env.TURN_HOST || "";
  if (turnHost) {
    const turnUrl = turnHost.includes("://") || turnHost.startsWith("turn:") || turnHost.startsWith("turns:")
      ? turnHost
      : `turn:${turnHost}:3478`;
    servers.push({ urls: turnUrl, username, credential });

    // Also add TCP transport variant for networks that block UDP
    const cleanTurnUrl = turnUrl.replace(/^turn:/, "");
    const hostPart = cleanTurnUrl.split("?")[0];
    const lastColon = hostPart.lastIndexOf(":");
    const baseHost = lastColon > 0 ? hostPart.slice(0, lastColon) : hostPart;
    const port = lastColon > 0 ? hostPart.slice(lastColon + 1) : "3478";
    servers.push({ urls: `turn:${baseHost}:${port}?transport=tcp`, username, credential });
  }

  // TURNS (TLS, port 5349) — penetrates strict firewalls (banks, hospitals)
  // that block UDP 3478. Falls back silently if cert validation fails.
  const turnsHost = process.env.TURNS_URL || process.env.TURNS_HOST || "";
  if (turnsHost) {
    const turnsUrl = turnsHost.includes("://") || turnsHost.startsWith("turns:")
      ? turnsHost
      : `turns:${turnsHost}:5349`;
    servers.push({ urls: turnsUrl, username, credential });
  } else if (turnHost) {
    // If TURNS_URL not set, derive it from TURN_URL (same host, port 5349)
    const rawHost = turnHost.replace(/^turns?:/, "").split("?")[0];
    const lastColon = rawHost.lastIndexOf(":");
    const derivedHost = lastColon > 0 ? rawHost.slice(0, lastColon) : rawHost;
    servers.push({ urls: `turns:${derivedHost}:5349`, username, credential });
  }

  return servers;
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
  return encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString("base64"));
}
