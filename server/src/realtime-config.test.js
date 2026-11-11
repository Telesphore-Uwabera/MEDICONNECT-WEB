import { afterEach, describe, expect, it } from "vitest";
import { publicRealtimeConfig } from "./realtime-config.js";

const KEYS = ["REVERB_APP_KEY", "REVERB_APP_SECRET", "REVERB_HOST", "REVERB_PORT", "REVERB_SCHEME", "REVERB_ENABLED"];
const previous = {};

function clearReverb() {
  for (const key of KEYS) {
    if (!(key in previous)) previous[key] = process.env[key];
    delete process.env[key];
  }
}

afterEach(() => {
  for (const key of KEYS) {
    if (previous[key] == null) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

describe("public realtime config", () => {
  it("stays disabled and hides the secret when Reverb is unset", () => {
    clearReverb();
    process.env.REVERB_APP_SECRET = "server-only-reverb-secret";
    const body = publicRealtimeConfig();
    expect(body).toEqual({
      reverb: { key: "", host: "", port: null, scheme: "", enabled: false },
    });
    expect(JSON.stringify(body)).not.toContain("server-only-reverb-secret");
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("enables only when both the host and the app key are set", () => {
    clearReverb();
    process.env.REVERB_APP_KEY = "public-key";
    process.env.REVERB_HOST = "ws.example.rw";
    process.env.REVERB_PORT = "443";
    process.env.REVERB_SCHEME = "https";
    process.env.REVERB_APP_SECRET = "server-only-reverb-secret";
    expect(publicRealtimeConfig().reverb).toEqual({
      key: "public-key",
      host: "ws.example.rw",
      port: 443,
      scheme: "https",
      enabled: true,
    });
  });

  it("lets REVERB_ENABLED turn a configured server off, and not on without a host", () => {
    clearReverb();
    process.env.REVERB_APP_KEY = "public-key";
    process.env.REVERB_HOST = "ws.example.rw";
    process.env.REVERB_ENABLED = "false";
    expect(publicRealtimeConfig().reverb.enabled).toBe(false);
    expect(publicRealtimeConfig().reverb.host).toBe("ws.example.rw");

    delete process.env.REVERB_HOST;
    process.env.REVERB_ENABLED = "true";
    expect(publicRealtimeConfig().reverb.enabled).toBe(false);
    expect(publicRealtimeConfig().reverb.host).toBe("");
  });
});
