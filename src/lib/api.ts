import { getAccessErrorMessage, notifyAccessPrompt } from "@/lib/access-events";

const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

let isPromptingForAuth = false;

function emitLoginPrompt(message: string) {
  if (isPromptingForAuth) return;
  isPromptingForAuth = true;
  notifyAccessPrompt({ reason: "login", message });
  setTimeout(() => {
    isPromptingForAuth = false;
  }, 3000);
}

async function readJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const { body, headers: extraHeaders, ...restOptions } = options ?? {};
  const isFormData = body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(extraHeaders as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...restOptions,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  // if (res.status === 401) {
  //   const hadToken = !!token;
  //   localStorage.removeItem("auth_token");
  //   emitLoginPrompt(
  //     hadToken
  //       ? "Your session expired. Sign in again to continue."
  //       : "Please sign in to continue.",
  //   );

  //   const error: ApiError = new Error("Please sign in to continue.");
  //   error.status = 401;
  //   throw error;
  // }

  if (res.status === 401) {
    const hadToken = !!token;
    localStorage.removeItem("auth_token");

    // Only show the global modal when a real session expired.
    // Anonymous 401s (no token) happen naturally on public pages
    // when a component calls an authenticated endpoint — don't
    // interrupt guests with a login prompt for that.
    if (hadToken) {
      emitLoginPrompt("Your session expired. Sign in again to continue.");
    }

    const error: ApiError = new Error("Please sign in to continue.");
    error.status = 401;
    throw error;
  }

  const data = await readJsonSafely(res);

  if (!res.ok) {
    const fieldErrors = data?.errors;
    let message = data?.message ?? "Something went wrong";
    const accessMessage = getAccessErrorMessage(res.status, !!token);

    if (res.status === 403) {
      notifyAccessPrompt({
        reason: token ? "role" : "login",
        message: accessMessage ?? message,
      });
    }

    if (fieldErrors) {
      const flat = Array.isArray(fieldErrors)
        ? (fieldErrors as string[])
        : Object.values(fieldErrors as Record<string, string[]>).flat();
      if (flat.length > 0) message = flat.join(" · ");
    }

    if (accessMessage) message = accessMessage;

    const error: ApiError = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
