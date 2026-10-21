import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callToken, iceServers, relayDiagnostics, roomFromToken } from "./call-token.js";

const RELAY_VARS = [
  "TURN_URL", "TURN_HOST", "TURN_PORT", "TURNS_URL", "TURNS_HOST", "TURNS_PORT",
  "VITE_TURN_URL", "VITE_TURN_HOST", "VITE_TURN_PORT", "VITE_TURNS_URL", "VITE_TURNS_HOST", "VITE_TURNS_PORT",
  "TURN_SECRET", "VITE_TURN_SECRET", "TURN_AUTH_SECRET", "VITE_TURN_AUTH_SECRET",
  "TURN_USERNAME", "VITE_TURN_USERNAME", "TURN_PASSWORD", "TURN_CREDENTIAL",
  "VITE_TURN_PASSWORD", "VITE_TURN_CREDENTIAL", "CALL_TOKEN_SECRET",
];

function relays(servers) {
  return servers.filter((server) =>
    (Array.isArray(server.urls) ? server.urls : [server.urls]).some((url) => /^turns?:/i.test(String(url))),
  );
}

beforeEach(() => {
  for (const name of RELAY_VARS) vi.stubEnv(name, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("iceServers", () => {
  it("ships STUN only when no relay host is configured", () => {
    const servers = iceServers();
    expect(relays(servers)).toHaveLength(0);
    expect(servers).toHaveLength(2);
  });

  it("accepts the VITE_ spelling of the relay host because that is how the deployment names it", () => {
    vi.stubEnv("VITE_TURN_HOST", "relay.example.rw");
    expect(relays(iceServers())).toHaveLength(3);
  });

  it("offers udp, tcp and tls from one host and derives port 5349", () => {
    vi.stubEnv("TURN_HOST", "relay.example.rw");
    const urls = relays(iceServers()).flatMap((server) => server.urls);
    expect(urls).toEqual([
      "turn:relay.example.rw:3478",
      "turn:relay.example.rw:3478?transport=tcp",
      "turns:relay.example.rw:5349",
    ]);
  });

  it("sends unauthenticated relays when a host exists without credentials", () => {
    vi.stubEnv("TURN_HOST", "relay.example.rw");
    for (const server of relays(iceServers())) {
      expect(server.username).toBeUndefined();
      expect(server.credential).toBeUndefined();
    }
  });

  it("signs short-lived credentials from TURN_SECRET, which is what coTURN use-auth-secret expects", () => {
    vi.stubEnv("TURN_HOST", "relay.example.rw");
    vi.stubEnv("TURN_SECRET", "shared-relay-secret");
    const [first] = relays(iceServers());
    const [expiry, id] = String(first.username).split(":");
    expect(id).toBe("mediconnect");
    expect(Number(expiry)).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(first.credential).toMatch(/^[A-Za-z0-9+/=]{27,}$/);
    expect(JSON.stringify(first)).not.toContain("shared-relay-secret");
  });

  it("offers both HMAC and static credentials when both env pairs are set", () => {
    vi.stubEnv("TURN_HOST", "relay.example.rw");
    vi.stubEnv("TURN_SECRET", "shared-relay-secret");
    vi.stubEnv("TURN_USERNAME", "mediconnect");
    vi.stubEnv("TURN_PASSWORD", "static-password");
    const users = new Set(relays(iceServers()).map((server) => server.username));
    expect(users.has("mediconnect")).toBe(true);
    expect([...users].some((name) => String(name).endsWith(":mediconnect"))).toBe(true);
  });

  it("strips wrapping quotes from TURN_SECRET so a quoted .env still signs", () => {
    vi.stubEnv("TURN_HOST", "relay.example.rw");
    vi.stubEnv("TURN_SECRET", '"shared-relay-secret"');
    const quoted = relays(iceServers())[0];
    vi.stubEnv("TURN_SECRET", "shared-relay-secret");
    const plain = relays(iceServers())[0];
    expect(quoted.username).toBe(plain.username);
    expect(quoted.credential).toBe(plain.credential);
  });

  it("falls back to the static user pair when no secret is configured", () => {
    vi.stubEnv("TURN_HOST", "relay.example.rw");
    vi.stubEnv("TURN_USERNAME", "mediconnect");
    vi.stubEnv("TURN_PASSWORD", "static-password");
    const [first] = relays(iceServers());
    expect(first.username).toBe("mediconnect");
    expect(first.credential).toBe("static-password");
  });
});

describe("relayDiagnostics", () => {
  it("names the missing layer instead of printing a credential", () => {
    vi.stubEnv("TURN_HOST", "relay.example.rw");
    vi.stubEnv("TURN_PASSWORD", "static-password");
    const report = relayDiagnostics();
    expect(JSON.stringify(report)).not.toContain("static-password");
    expect(report.ok).toBe(false);
    expect(report.missing).toEqual(["relay_credentials", "room_token_signing"]);
    expect(report.checks.find((check) => check.name === "relay_credentials").detail).toContain("TURN_USERNAME");
  });

  it("reports auth-secret mode and passes once the relay, TLS and signing are configured", () => {
    vi.stubEnv("TURN_HOST", "relay.example.rw");
    vi.stubEnv("TURN_SECRET", "shared-relay-secret");
    vi.stubEnv("CALL_TOKEN_SECRET", "token-secret");
    const report = relayDiagnostics();
    expect(report).toMatchObject({
      ok: true,
      credential_mode: "auth-secret",
      relays_in_call_token: 3,
      relay: { host: "relay.example.rw", port: "3478", tls: "relay.example.rw:5349" },
      missing: [],
    });
    expect(JSON.stringify(report)).not.toContain("shared-relay-secret");
    expect(JSON.stringify(report)).not.toContain("token-secret");
  });

  it("distinguishes an unconfigured relay from a relay that is only missing credentials", () => {
    expect(relayDiagnostics().missing).toContain("relay_configured");
    vi.stubEnv("TURN_HOST", "relay.example.rw");
    expect(relayDiagnostics().missing).not.toContain("relay_configured");
  });
});

describe("call tokens and room authorisation", () => {
  it("round-trips a signed token to its room and rejects a tampered one", () => {
    vi.stubEnv("CALL_TOKEN_SECRET", "token-secret");
    const token = callToken({ room: "instant-76", role: "patient", consultationId: 76, name: "Patient" });
    expect(roomFromToken(token)).toBe("instant-76");
    const payload = JSON.parse(Buffer.from(decodeURIComponent(token), "base64").toString("utf8"));
    payload.room = "appointment-99";
    const forged = encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString("base64"));
    expect(roomFromToken(forged)).toBeNull();
  });

  it("still accepts legacy tokens stored in the daily_* columns when signing is off", () => {
    const token = callToken({ room: "instant-76", role: "doctor", consultationId: 76, name: "Doctor" });
    expect(roomFromToken(token)).toBe("instant-76");
  });
});
