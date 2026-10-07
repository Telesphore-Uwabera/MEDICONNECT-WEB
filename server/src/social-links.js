const PLATFORMS = ["linkedin", "twitter", "facebook", "instagram"];

const HOSTS = {
  linkedin: ["linkedin.com", "www.linkedin.com", "lnkd.in"],
  twitter: ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "mbasic.facebook.com", "fb.com", "www.fb.com"],
  instagram: ["instagram.com", "www.instagram.com"],
};

const PLATFORM_LABELS = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function outcome(ok, code, extra = {}) {
  return { ok, code, ...extra };
}

function parseUrl(raw) {
  const text = String(raw ?? "").trim();
  if (!text || text.length > 500) return null;
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  let url;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.protocol = "https:";
  url.hash = "";
  return url;
}

function detectPlatform(hostname) {
  const host = String(hostname || "").toLowerCase();
  return PLATFORMS.find((platform) => HOSTS[platform].includes(host)) ?? null;
}

function twitterHandle(url) {
  const [handle] = url.pathname.split("/").filter(Boolean);
  if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) return null;
  const reserved = new Set(["home", "explore", "search", "settings", "i", "intent", "share", "hashtag", "messages", "compose"]);
  if (reserved.has(handle.toLowerCase())) return null;
  return handle;
}

function instagramHandle(url) {
  const [handle] = url.pathname.split("/").filter(Boolean);
  if (!handle || !/^[A-Za-z0-9._]{1,30}$/.test(handle)) return null;
  const reserved = new Set(["p", "reel", "reels", "stories", "explore", "accounts", "direct", "about"]);
  if (reserved.has(handle.toLowerCase())) return null;
  return handle.replace(/\.$/, "");
}

function facebookId(url) {
  if (url.pathname === "/profile.php") {
    const id = url.searchParams.get("id") || "";
    return /^\d{5,20}$/.test(id) ? id : null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "people" && parts.length >= 3 && /^\d{5,20}$/.test(parts[parts.length - 1])) {
    return parts[parts.length - 1];
  }
  const [page] = parts;
  if (!page || !/^[A-Za-z0-9.\-]{2,100}$/.test(page)) return null;
  const reserved = new Set(["sharer", "share", "login", "watch", "marketplace", "gaming", "events", "help", "privacy", "policies", "dialog", "photo.php", "story.php", "groups", "pages"]);
  if (reserved.has(page.toLowerCase())) return null;
  return page;
}

function linkedinPathOk(url) {
  if (url.hostname === "lnkd.in") return url.pathname.split("/").filter(Boolean).length === 1;
  return /^\/(in|company|school|pub)\/[^/?#]+/i.test(url.pathname);
}

function shapeError(platform, raw) {
  const url = parseUrl(raw);
  if (!url) return outcome(false, "invalid");
  const detected = detectPlatform(url.hostname);
  if (detected && detected !== platform) {
    return outcome(false, "wrong_platform", { platform: detected, label: PLATFORM_LABELS[detected] });
  }
  if (detected !== platform) return outcome(false, "invalid");

  if (platform === "linkedin" && !linkedinPathOk(url)) return outcome(false, "invalid");
  if (platform === "twitter" && !twitterHandle(url)) return outcome(false, "invalid");
  if (platform === "facebook" && !facebookId(url)) return outcome(false, "invalid");
  if (platform === "instagram" && !instagramHandle(url)) return outcome(false, "invalid");
  return outcome(true, "ok", { url: url.toString() });
}

async function requestOnce(target, method, accept, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(target, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: accept,
        ...extraHeaders,
      },
    });
    const body = method === "HEAD" ? "" : await response.text();
    return {
      status: response.status,
      location: response.headers.get("location"),
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function follow(startUrl, platform, method, accept) {
  let current = startUrl;
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await requestOnce(current, method, accept);
    const redirected = response.status >= 300 && response.status < 400 && response.location;
    if (!redirected) return { ...response, finalUrl: current };
    const next = new URL(response.location, current);
    next.protocol = "https:";
    if (!HOSTS[platform].includes(next.hostname.toLowerCase())) {
      return { status: response.status, location: response.location, body: response.body, finalUrl: current };
    }
    current = next.toString();
  }
  return { status: 0, location: null, body: "", finalUrl: current };
}

function decideStatus(status, okStatuses, missingStatuses) {
  if (okStatuses.includes(status)) return "ok";
  if (missingStatuses.includes(status)) return "missing";
  if (status === 429 || status >= 500 || status === 0) return "unreachable";
  return "unreachable";
}

async function probeLinkedIn(url) {
  let response = await follow(url, "linkedin", "HEAD", "*/*");
  if (response.status === 999) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await follow(url, "linkedin", "HEAD", "*/*");
  }
  const code = decideStatus(response.status, [200, 204, 405], [404, 410, 999]);
  return outcome(code === "ok", code, { url });
}

async function probeTwitter(url) {
  const response = await follow(url, "twitter", "GET", "text/html");
  const code = decideStatus(response.status, [200, 202, 401, 403], [404, 410]);
  return outcome(code === "ok", code, { url });
}

async function probeInstagram(url) {
  const parsed = parseUrl(url);
  const handle = parsed ? instagramHandle(parsed) : null;
  if (!handle) return outcome(false, "invalid");
  const endpoint = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`;
  const response = await requestOnce(endpoint, "GET", "application/json", {
    "x-ig-app-id": "936619743392459",
    Referer: "https://www.instagram.com/",
  });
  if (response.status === 429 || response.status >= 500 || response.status === 0) {
    return outcome(false, "unreachable", { url });
  }
  let json = null;
  try {
    json = JSON.parse(response.body || "{}");
  } catch {
    json = null;
  }
  if (response.status === 200 && json?.data?.user?.username) {
    return outcome(true, "ok", { url });
  }
  if (response.status === 404 || json?.status === "fail" || /not found/i.test(String(json?.message || ""))) {
    return outcome(false, "missing", { url });
  }
  return outcome(false, "unreachable", { url });
}

async function probeFacebook(url) {
  const parsed = parseUrl(url);
  const id = parsed ? facebookId(parsed) : null;
  if (!id) return outcome(false, "invalid");
  const response = await requestOnce(`https://graph.facebook.com/${encodeURIComponent(id)}`, "GET", "application/json");
  let json = null;
  try {
    json = JSON.parse(response.body || "{}");
  } catch {
    json = null;
  }
  if (json?.id || json?.error?.code === 200) return outcome(true, "ok", { url });
  if (json?.error?.error_subcode === 33 || json?.error?.code === 100 || response.status === 404) {
    return outcome(false, "missing", { url });
  }
  return outcome(false, "unreachable", { url });
}

async function checkSocialLink(platform, raw) {
  if (!PLATFORMS.includes(platform)) return outcome(false, "invalid");
  const text = String(raw ?? "").trim();
  if (!text) return outcome(true, "empty");
  const shape = shapeError(platform, text);
  if (!shape.ok) return shape;
  try {
    if (platform === "linkedin") return await probeLinkedIn(shape.url);
    if (platform === "twitter") return await probeTwitter(shape.url);
    if (platform === "instagram") return await probeInstagram(shape.url);
    return await probeFacebook(shape.url);
  } catch {
    return outcome(false, "unreachable", { url: shape.url });
  }
}

export {
  PLATFORMS,
  PLATFORM_LABELS,
  checkSocialLink,
};
