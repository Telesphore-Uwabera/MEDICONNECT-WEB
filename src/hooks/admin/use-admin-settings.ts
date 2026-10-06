import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/settings";

// ─── Types ────────────────────────────────────────────────────────────────────

// Replace MySettings interface
export interface MySettings {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  country_code: string | null;
  preferred_language: "en" | "fr" | "rw";
  avatar: string | null;
  roles: string[];                    // was: role: string
  is_verified: boolean;               // new
  email_verified_at: string | null;   // new
  phone_verified_at: string | null;   // new
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  name: string;
  preferred_language: "en" | "fr" | "rw";
}

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface RequestEmailChangePayload {
  email: string;
  current_password: string;
}

export interface VerifyEmailChangePayload {
  otp: string;
}

export interface RequestPhoneChangePayload {
  phone: string;
  country_code: string;
  current_password: string;
}

export interface VerifyPhoneChangePayload {
  otp: string;
}

export interface DeleteAccountPayload {
  password: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const settingsKeys = {
  all: ["admin-settings"] as const,
  me:  () => [...settingsKeys.all, "me"] as const,
};

// ─── 1. GET /api/v1/settings ──────────────────────────────────────────────────

function settingsFromUser(user: Record<string, unknown>): MySettings {
  const available = Array.isArray(user.available_roles) ? user.available_roles.map(String) : [];
  const roles = Array.isArray(user.roles)
    ? user.roles.map((role) => (typeof role === "string" ? role : String((role as { name?: string }).name ?? "")))
    : available.length
      ? available
      : user.role
        ? [String(user.role)]
        : [];
  const language = user.preferred_language;
  return {
    id: Number(user.id ?? 0),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    phone: user.phone == null ? null : String(user.phone),
    country_code: user.country_code == null ? null : String(user.country_code),
    preferred_language: language === "fr" || language === "rw" ? language : "en",
    avatar: user.avatar == null ? null : String(user.avatar),
    roles: roles.filter(Boolean),
    is_verified: Boolean(user.is_verified),
    email_verified_at: user.email_verified_at == null ? null : String(user.email_verified_at),
    phone_verified_at: user.phone_verified_at == null ? null : String(user.phone_verified_at),
    created_at: user.created_at == null ? "" : String(user.created_at),
    updated_at: user.updated_at == null ? "" : String(user.updated_at),
  };
}

function withData(settings: MySettings) {
  return { ...settings, data: settings };
}

export function useGetMySettings() {
  return useQuery({
    queryKey: settingsKeys.me(),
    queryFn: async () => {
      const body = await apiFetch<Partial<MySettings> & { message?: string; data?: Partial<MySettings> }>(BASE);
      if (body?.data?.email || body?.data?.id) return body;
      if (body?.email || body?.id) return withData(body as MySettings);
      const me = await apiFetch<{ user?: Record<string, unknown> } | Record<string, unknown>>("/auth/me");
      const user = me && typeof me === "object" && "user" in me && me.user
        ? me.user
        : (me as Record<string, unknown>);
      return withData(settingsFromUser(user ?? {}));
    },
  });
}

// ─── 2. PUT /api/v1/settings/profile ─────────────────────────────────────────

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      apiFetch<MySettings>(`${BASE}/profile`, { method: "PUT", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}

// ─── 3. POST /api/v1/settings/avatar ─────────────────────────────────────────

export function useUpdateAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("avatar", file);
      return apiFetch<MySettings>(`${BASE}/avatar`, { method: "POST", body: fd });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}

// ─── 4. DELETE /api/v1/settings/avatar ───────────────────────────────────────

export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<MySettings>(`${BASE}/avatar`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}

// ─── 5. PUT /api/v1/settings/password ────────────────────────────────────────
// On success the server revokes all other sessions — no cache invalidation needed.

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (payload: UpdatePasswordPayload) =>
      apiFetch<{ message: string }>(`${BASE}/password`, { method: "PUT", body: payload }),
  });
}

// ─── 6. POST /api/v1/settings/email/request ──────────────────────────────────

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: (payload: RequestEmailChangePayload) =>
      apiFetch<{ message: string }>(`${BASE}/email/request`, { method: "POST", body: payload }),
  });
}

// ─── 7. POST /api/v1/settings/email/verify ───────────────────────────────────

export function useVerifyEmailChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VerifyEmailChangePayload) =>
      apiFetch<MySettings>(`${BASE}/email/verify`, { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}

// ─── 8. POST /api/v1/settings/phone/request ──────────────────────────────────

export function useRequestPhoneChange() {
  return useMutation({
    mutationFn: (payload: RequestPhoneChangePayload) =>
      apiFetch<{ message: string }>(`${BASE}/phone/request`, { method: "POST", body: payload }),
  });
}

// ─── 9. POST /api/v1/settings/phone/verify ───────────────────────────────────

export function useVerifyPhoneChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VerifyPhoneChangePayload) =>
      apiFetch<MySettings>(`${BASE}/phone/verify`, { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}

// ─── 10. DELETE /api/v1/settings/account ─────────────────────────────────────

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (payload: DeleteAccountPayload) =>
      apiFetch<{ message: string }>(`${BASE}/account`, { method: "DELETE", body: payload }),
    onSuccess: () => {
      localStorage.removeItem("auth_token");
      window.location.href = "/auth";
    },
  });
}
