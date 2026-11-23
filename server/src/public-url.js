export const DEFAULT_PUBLIC_BASE = "https://mediconnect.rw";

function headerValue(value) {
  return String(value || "").split(",")[0].trim();
}

function hostnameOf(host) {
  return headerValue(host).replace(/:\d+$/, "").toLowerCase();
}

export function isTunnelHost(host) {
  const name = hostnameOf(host);
  return name === "trycloudflare.com" || name.endsWith(".trycloudflare.com");
}

export function configuredPublicBase(env = process.env) {
  const raw = String(env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return DEFAULT_PUBLIC_BASE;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (isTunnelHost(url.hostname)) return DEFAULT_PUBLIC_BASE;
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_PUBLIC_BASE;
  }
}

/** Origin for links. A tunnel host is never published. */
export function publicOrigin(req, env = process.env) {
  const forwarded = headerValue(req?.headers?.["x-forwarded-host"]);
  const host = headerValue(req?.get?.("host") || req?.headers?.host);
  const chosen = [forwarded, host].find((item) => item && !isTunnelHost(item));
  if (!chosen) return configuredPublicBase(env);
  const proto = headerValue(req?.headers?.["x-forwarded-proto"]) || req?.protocol || "https";
  return `${proto}://${chosen}`;
}

export function publicPagePath(req, env = process.env) {
  const path = `${req?.baseUrl || ""}${req?.path || ""}`;
  const suffix = path.startsWith("/") || path === "" ? path : `/${path}`;
  return `${publicOrigin(req, env)}${suffix}`;
}

/** Rewrite a leftover tunnel address. Relative paths stay relative. */
export function withoutTunnelHost(url, env = process.env) {
  const value = String(url || "");
  if (!/trycloudflare\.com/i.test(value)) return value;
  const base = configuredPublicBase(env);
  try {
    const parsed = new URL(value);
    return `${base}${parsed.pathname}${parsed.search}`;
  } catch {
    return value.replace(/https?:\/\/[^/?#]*trycloudflare\.com/gi, base);
  }
}
