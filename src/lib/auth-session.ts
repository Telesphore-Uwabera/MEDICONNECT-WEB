export const AUTH_TOKEN_KEY = "auth_token";
export const SESSION_ENDED_EVENT = "mediconnect:session-ended";
export const SESSION_CHANGED_EVENT = "mediconnect:session-changed";

export type SessionChange =
  | { type: "login"; token: string }
  | { type: "logout" };

const TAB_ID = typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID()
  : `tab-${Date.now()}`;

let channel: BroadcastChannel | null = null;

function getChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel("mediconnect-auth");
  return channel;
}

function broadcast(change: SessionChange) {
  getChannel()?.postMessage({ ...change, tabId: TAB_ID });
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT, { detail: change }));
}

export function getAuthToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  broadcast({ type: "login", token });
}

export function clearAuthToken() {
  const hadToken = Boolean(getAuthToken());
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem("guest_token");
  if (hadToken) broadcast({ type: "logout" });
}

export function subscribeToRemoteSession(handler: (change: SessionChange) => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_TOKEN_KEY) return;
    if (event.newValue === event.oldValue) return;
    if (event.newValue) handler({ type: "login", token: event.newValue });
    else handler({ type: "logout" });
  };

  const onChannel = (event: MessageEvent<SessionChange & { tabId?: string }>) => {
    if (!event.data || event.data.tabId === TAB_ID) return;
    if (event.data.type === "login") handler({ type: "login", token: event.data.token });
    if (event.data.type === "logout") handler({ type: "logout" });
  };

  window.addEventListener("storage", onStorage);
  const bc = getChannel();
  bc?.addEventListener("message", onChannel);

  return () => {
    window.removeEventListener("storage", onStorage);
    bc?.removeEventListener("message", onChannel);
  };
}

export function emitSessionEnded(message: string) {
  window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: { message } }));
}

function safeReturnPath(from?: string | { pathname?: string; search?: string } | null) {
  const raw =
    typeof from === "string"
      ? from
      : from?.pathname
        ? `${from.pathname}${from.search || ""}`
        : "";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/auth")) return "";
  return raw;
}

export function loginReturnPath() {
  if (typeof window === "undefined") return "";
  return safeReturnPath(new URLSearchParams(window.location.search).get("next"));
}

/** Open the sign-in page and drop any stale in-memory session. */
export function goToSignIn(
  from?: string | { pathname?: string; search?: string } | null,
  options?: { reason?: string },
) {
  const params = new URLSearchParams();
  const next = safeReturnPath(from);
  if (next) params.set("next", next);
  if (options?.reason) params.set("reason", options.reason);
  const qs = params.toString();
  window.location.assign(qs ? `/auth?${qs}` : "/auth");
}
