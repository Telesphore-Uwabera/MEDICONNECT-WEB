const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

let isRedirectingToAuth = false;

export async function apiFetch<T>(
  endpoint: string,
  options?: ApiFetchOptions
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

 // api.ts

if (res.status === 401) {
  const hadToken = !!localStorage.getItem("auth_token");
  localStorage.removeItem("auth_token");

  // Only redirect if there was actually a token that got rejected
  // (expired session). If there was no token, this is just an
  // unauthenticated request — let the caller handle the rejection.
  if (hadToken && !isRedirectingToAuth) {
    isRedirectingToAuth = true;
    window.location.href = "/auth";
    setTimeout(() => { isRedirectingToAuth = false; }, 3000);
  }

  return Promise.reject(new Error("Unauthorized"));
}

  // Reset redirect guard on any successful response — token is valid.
  isRedirectingToAuth = false;

  const data = await res.json();

  if (!res.ok) {
    const fieldErrors = data?.errors;
    let message = data?.message ?? "Something went wrong";

    if (fieldErrors) {
      const flat = Array.isArray(fieldErrors)
        ? (fieldErrors as string[])
        : Object.values(fieldErrors as Record<string, string[]>).flat();
      if (flat.length > 0) message = flat.join(" · ");
    }

    const error: ApiError = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
