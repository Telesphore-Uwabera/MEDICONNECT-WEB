

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
    if (fieldErrors) {
      const flat = Array.isArray(fieldErrors)
        ? (fieldErrors as string[])
        : Object.values(fieldErrors as Record<string, string[]>).flat();
      if (flat.length > 0) throw new Error(flat.join(" · "));
    }
    throw new Error(data?.message ?? "Something went wrong");
  }

  return data as T;
}
