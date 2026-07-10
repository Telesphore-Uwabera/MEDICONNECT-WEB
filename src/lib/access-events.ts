export type AccessPromptReason = "login" | "role";

export interface AccessPromptDetail {
  reason: AccessPromptReason;
  message?: string;
}

export const ACCESS_PROMPT_EVENT = "mediconnect:access-prompt";

let lastPromptAt = 0;
let lastReason: AccessPromptReason | null = null;

export function notifyAccessPrompt(detail: AccessPromptDetail) {
  const now = Date.now();
  if (lastReason === detail.reason && now - lastPromptAt < 1200) return;
  lastPromptAt = now;
  lastReason = detail.reason;

  window.dispatchEvent(
    new CustomEvent<AccessPromptDetail>(ACCESS_PROMPT_EVENT, { detail }),
  );
}

export function getAccessErrorMessage(status: number, hasToken: boolean) {
  // 401s are handled separately in apiFetch before this runs. Only 403
  // (access denied to an existing resource) gets a canned message here —
  // other statuses (400/422/etc.) should surface the backend's real
  // message instead of being masked just because the caller has no token.
  if (status === 403) {
    return hasToken
      ? "Your current role does not have access to this resource. Switch roles to continue."
      : "Please sign in to continue.";
  }
  return null;
}
