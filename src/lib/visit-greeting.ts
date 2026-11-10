const LAST_LOGIN_KEY = "mediconnect_last_login_at";
const PRIOR_LOGIN_KEY = "mediconnect_prior_login_at";

/** Remember this sign-in without treating it as a previous one. */
export function noteSuccessfulLogin(at = new Date().toISOString()) {
  if (typeof localStorage === "undefined") return;
  const last = localStorage.getItem(LAST_LOGIN_KEY);
  if (last) localStorage.setItem(PRIOR_LOGIN_KEY, last);
  localStorage.setItem(LAST_LOGIN_KEY, at);
}

/** True only after a sign-in that happened before the latest one. */
export function hasPriorSignIn() {
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem(PRIOR_LOGIN_KEY));
}

const PAST_VISIT = new Set(["completed", "done"]);

/** A visit that already happened. A booking made today for later does not count. */
export function hasEarlierVisit(
  rows: { status?: string | null; appointment_date?: string | null }[] | null | undefined,
  today = new Date().toISOString().slice(0, 10),
) {
  return (rows ?? []).some((row) => {
    const status = String(row.status || "").toLowerCase();
    if (PAST_VISIT.has(status)) return true;
    const date = String(row.appointment_date || "").slice(0, 10);
    return Boolean(date) && date < today;
  });
}

export function welcomeMode(input: { priorSignIn?: boolean; earlierVisit?: boolean }) {
  return input.priorSignIn || input.earlierVisit ? "back" : "first";
}

export function firstName(name?: string | null) {
  const part = String(name || "").trim().split(/\s+/)[0];
  return part || "";
}
