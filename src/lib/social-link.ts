import { apiFetch } from "@/lib/api";

export type SocialPlatform = "linkedin" | "twitter" | "facebook" | "instagram";

export type SocialCheckCode =
  | "ok"
  | "empty"
  | "invalid"
  | "wrong_platform"
  | "missing"
  | "unreachable";

export interface SocialCheckResult {
  ok: boolean;
  code: SocialCheckCode;
  platform?: SocialPlatform;
  label?: string;
  url?: string;
}

const HOSTS: Record<SocialPlatform, string[]> = {
  linkedin: ["linkedin.com", "www.linkedin.com", "lnkd.in"],
  twitter: ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "mbasic.facebook.com", "fb.com", "www.fb.com"],
  instagram: ["instagram.com", "www.instagram.com"],
};

const LABELS: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
};

function parseUrl(raw: string) {
  const text = raw.trim();
  if (!text || text.length > 500) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (url.username || url.password) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function detectPlatform(hostname: string): SocialPlatform | null {
  const host = hostname.toLowerCase();
  return (Object.keys(HOSTS) as SocialPlatform[]).find((platform) => HOSTS[platform].includes(host)) ?? null;
}

export function inspectSocialLink(platform: SocialPlatform, raw: string): SocialCheckResult {
  const text = raw.trim();
  if (!text) return { ok: true, code: "empty" };
  const url = parseUrl(text);
  if (!url) return { ok: false, code: "invalid" };
  const detected = detectPlatform(url.hostname);
  if (detected && detected !== platform) {
    return { ok: false, code: "wrong_platform", platform: detected, label: LABELS[detected] };
  }
  if (detected !== platform) return { ok: false, code: "invalid" };

  const parts = url.pathname.split("/").filter(Boolean);
  if (platform === "linkedin") {
    const short = url.hostname === "lnkd.in" && parts.length === 1;
    const profile = /^\/(in|company|school|pub)\/[^/?#]+/i.test(url.pathname);
    if (!short && !profile) return { ok: false, code: "invalid" };
  }
  if (platform === "twitter") {
    const handle = parts[0] ?? "";
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return { ok: false, code: "invalid" };
  }
  if (platform === "instagram") {
    const handle = parts[0] ?? "";
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return { ok: false, code: "invalid" };
  }
  if (platform === "facebook" && parts.length === 0 && !url.searchParams.get("id")) {
    return { ok: false, code: "invalid" };
  }
  return { ok: true, code: "ok", url: url.toString() };
}

export async function checkSocialLink(platform: SocialPlatform, raw: string): Promise<SocialCheckResult> {
  const local = inspectSocialLink(platform, raw);
  if (!local.ok || local.code === "empty") return local;
  try {
    return await apiFetch<SocialCheckResult>("/doctor/social-links/check", {
      method: "POST",
      body: { platform, url: raw },
    });
  } catch {
    return { ok: false, code: "unreachable" };
  }
}

export async function checkSocialLinks(
  links: Partial<Record<SocialPlatform, string>>,
): Promise<Partial<Record<SocialPlatform, SocialCheckResult>>> {
  const entries = (Object.keys(links) as SocialPlatform[]).filter((key) => String(links[key] || "").trim());
  const pairs = await Promise.all(
    entries.map(async (key) => [key, await checkSocialLink(key, links[key] || "")] as const),
  );
  return Object.fromEntries(pairs);
}
