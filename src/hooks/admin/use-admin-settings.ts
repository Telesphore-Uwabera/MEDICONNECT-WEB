import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

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

export function useGetMySettings() {
  return useQuery({
    queryKey: settingsKeys.me(),
    queryFn:  () => apiFetch<MySettings>(BASE),
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
