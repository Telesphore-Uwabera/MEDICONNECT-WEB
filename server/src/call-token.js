export function iceServers() {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  const host = process.env.TURN_URL || process.env.TURN_HOST || "";
  if (host) {
    servers.push({
      urls: host.includes("://") || host.startsWith("turn:") || host.startsWith("turns:") ? host : `turn:${host}:3478`,
      username: process.env.TURN_USERNAME || undefined,
      credential: process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL || undefined,
    });
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
