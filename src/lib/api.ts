

// const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

// interface ApiFetchOptions extends Omit<RequestInit, "body"> {
//   body?: unknown;
// }

// export async function apiFetch<T>(
//   endpoint: string,
//   options?: ApiFetchOptions
// ): Promise<T> {
//   const token = localStorage.getItem("auth_token");
//   const { body, headers: extraHeaders, ...restOptions } = options ?? {};

//   const isFormData = body instanceof FormData;

//   // Build headers — omit Content-Type for FormData so the browser can set the
//   // multipart boundary automatically.
//   const headers: Record<string, string> = {
//     Accept: "application/json",
//     ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     ...(isFormData ? {} : { "Content-Type": "application/json" }),
//     ...(extraHeaders as Record<string, string> | undefined),
//   };

//   const res = await fetch(`${BASE_URL}${endpoint}`, {
//     ...restOptions,
//     headers,
//     // FormData is sent as-is; plain objects are JSON-stringified.
//     body:
//       body === undefined
//         ? undefined
//         : isFormData
//           ? (body as FormData)
//           : JSON.stringify(body),
//   });

//   // Handle 401 globally
//   if (res.status === 401) {
//     localStorage.removeItem("auth_token");
//     window.location.href = "/auth";
//     return Promise.reject(new Error("Unauthorized"));
//   }

//   const data = await res.json();

//   if (!res.ok) {
//     if (Array.isArray(data?.errors) && data.errors.length > 0) {
//       throw new Error(data.errors.join(" · "));
//     }
//     throw new Error(data?.message || "Something went wrong");
//   }

//   return data as T;
// }


const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
    body?: unknown;
}

/** Error thrown by apiFetch on non-OK responses; carries the HTTP status and
 *  parsed response body so callers can handle specific cases. */
export interface ApiError extends Error {
    status?: number;
    data?: any;
}

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

    if (res.status === 401) {
        localStorage.removeItem("auth_token");
        window.location.href = "/auth";
        return Promise.reject(new Error("Unauthorized"));
    }

    const data = await res.json();

    if (!res.ok) {
        // Handle both array shape: ["msg"] and object shape: { phone: ["msg"] }
        const fieldErrors = data?.errors;
        let message = data?.message ?? "Something went wrong";
        if (fieldErrors) {
            const flat = Array.isArray(fieldErrors)
                ? (fieldErrors as string[])
                : Object.values(fieldErrors as Record<string, string[]>).flat();
            if (flat.length > 0) message = flat.join(" · ");
        }
        // Preserve the HTTP status and response body so callers can react to
        // specific cases (e.g. an "active session" conflict that carries the
        // in-progress consultation's room/token for a rejoin link).
        const error: ApiError = new Error(message);
        error.status = res.status;
        error.data = data;
        throw error;
    }

    return data as T;
}
