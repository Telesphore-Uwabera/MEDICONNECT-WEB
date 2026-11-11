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
  const key = text(env.REVERB_APP_KEY);
  const host = text(env.REVERB_HOST);
  const scheme = text(env.REVERB_SCHEME);
  const rawPort = text(env.REVERB_PORT);
  const port = /^\d+$/.test(rawPort) ? Number(rawPort) : null;
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
