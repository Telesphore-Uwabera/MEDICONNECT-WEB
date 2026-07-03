// Download a file from an authenticated API endpoint as a blob and trigger a
// browser "Save as". Uses the same base URL + bearer token as apiFetch.

import { getAccessErrorMessage, notifyAccessPrompt } from "@/lib/access-events";

const BASE_URL = import.meta.env.VITE_APP_BASE_URL ?? "";

export async function downloadAuthedFile(
  path: string,
  filename: string,
  accept = "application/pdf",
): Promise<void> {
  const token = localStorage.getItem("auth_token") ?? "";

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: accept,
    },
  });

  if (!res.ok) {
    // Route auth/role failures through the central login / switch-role prompt.
    if (res.status === 401 || res.status === 403) {
      const hasToken = !!token;
      notifyAccessPrompt({
        reason: res.status === 401 || !hasToken ? "login" : "role",
        message: getAccessErrorMessage(res.status, hasToken) ?? undefined,
      });
    }
    // Try to surface a JSON error message if the server sent one.
    let message = `Download failed (${res.status})`;
    try {
      const data = await res.clone().json();
      if (data?.message) message = data.message;
    } catch {
      /* not JSON — keep the generic message */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
