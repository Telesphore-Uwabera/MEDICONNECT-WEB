const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // Handle 401 globally
  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    window.location.href = "/auth";
    return Promise.reject(new Error("Unauthorized"));
  }

  const data = await res.json();

  if (!res.ok) {
    // API returns { message, errors: string[] } for validation failures
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      throw new Error(data.errors.join(" · "));
    }
    throw new Error(data?.message || "Something went wrong");
  }

  return data as T;
}
