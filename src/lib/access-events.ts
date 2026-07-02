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
  if (status === 401 || !hasToken) {
    return "Please sign in to continue.";
  }
  if (status === 403) {
    return "Your current role does not have access to this resource. Switch roles to continue.";
  }
  return null;
}
