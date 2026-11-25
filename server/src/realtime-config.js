/**
 * Public Reverb settings for the mobile app. The app key is a client
 * identifier. The app secret stays on the server and is used only by
 * POST /broadcasting/auth.
 */

function text(value) {
  return String(value ?? "").trim();
}

function enabledOverride(value, configured) {
  const flag = text(value).toLowerCase();
  if (!flag) return configured;
  if (["0", "false", "no", "off"].includes(flag)) return false;
  if (["1", "true", "yes", "on"].includes(flag)) return configured;
  return configured;
}

export function publicRealtimeConfig(env = process.env) {
  const key = text(env.REVERB_APP_KEY) || "mediconnect-staging-key";
  const host = text(env.REVERB_HOST) || "api.mediconnect.rw";
  const scheme = text(env.REVERB_SCHEME) || "https";
  const rawPort = text(env.REVERB_PORT) || "443";
  const port = /^\d+$/.test(rawPort) ? Number(rawPort) : 443;
  const enabled = enabledOverride(env.REVERB_ENABLED, Boolean(key && host));
  return {
    reverb: {
      key,
      host,
      port,
      scheme,
      enabled,
    },
  };
}
