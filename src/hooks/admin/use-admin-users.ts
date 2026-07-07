import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/users";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  country_code?: string;
  phone_verified_at?: string | null;
  email_verified_at?: string | null;
  is_verified?: boolean;
  status: "active" | "pending" | "suspended" | "rejected";
  roles: { id: number; name: string }[];
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  avatar?: string | null;
  preferred_language?: string;
}

export interface AdminUsersResponse {
  current_page: number;
  data: ApiUser[];
  per_page: number;
  total: number;
}

export interface AdminUsersParams {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  enabled?: boolean;
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  phone?: string;
  country_code?: string;
  role: string;
  gender?: string;
  preferred_language?: string;
}

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status?: "active" | "pending" | "suspended" | "rejected";
  roles: { id: number; name: string }[];
  created_at?: string;
}

export interface StaffResponse {
  current_page: number;
  data: StaffUser[];
  total: number;
  per_page?: number;
}

export interface StaffParams {
  role?: string;
  search?: string;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  role: "moderator" | "finance" | "help_desk";
}

export interface AdminRole {
  id: number;
  name: string;
}

export interface AdminPermission {
  id: number;
  name: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useGetAdminUsers(params?: AdminUsersParams) {
  const query = new URLSearchParams();
  if (params?.role)   query.set("role",   params.role);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page)   query.set("page",   String(params.page));

  const queryString = query.toString();

  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: () =>
      apiFetch<AdminUsersResponse>(`${BASE}${queryString ? `?${queryString}` : ""}`).then(
        (res) => { 
          return res;
        }
      ),
    placeholderData: (prev) => prev, // keep stale data visible while refetching
    enabled: params?.enabled ?? true,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminUserPayload) =>
      apiFetch<{ message: string; user: ApiUser }>(BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}/suspend`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}/activate`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

// ─── Credential & session management ─────────────────────────────────────────
// Backend contract (agreed frontend-first; implement these routes to match):
//   POST /admin/users/{id}/reset-password      → { message, temporary_password? }
//        If the backend generates a temporary password it returns it ONCE here;
//        otherwise it emails the user a reset link/OTP and returns { message }.
//   POST /admin/users/{id}/revoke-sessions     → { message }
//        Revokes every active token for the user (they must sign in again).
//   POST /admin/users/{id}/resend-verification → { message }
//        body: { channel: "email" | "phone" } — re-sends the verification.
//   PUT  /admin/staff/{id}/password            → { message }
//        body: { password, password_confirmation } — admin sets a new staff
//        password directly (staff passwords are always admin-managed).

export interface ResetPasswordResponse {
  message: string;
  /** Present when the backend generates a temporary password instead of
   *  emailing a reset link — display it once to the admin. */
  temporary_password?: string;
}

// POST /admin/users/{id}/reset-credentials
// body: at least one of { email, phone, country_code, password } — password
// alone, email+phone together, or all four at once are all valid.
// Response: { message, user: {...}, changes: ("email"|"phone"|"password")[] }
export interface ResetUserCredentialsPayload {
  email?: string;
  phone?: string;
  country_code?: string;
  password?: string;
}

export interface ResetUserCredentialsResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    country_code?: string;
  };
  changes: string[];
}

export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ResetUserCredentialsPayload }) =>
      apiFetch<ResetUserCredentialsResponse>(`${BASE}/${id}/reset-credentials`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useRevokeUserSessions() {
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`${BASE}/${id}/revoke-sessions`, { method: "POST" }),
  });
}

export function useResendVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, channel }: { id: number; channel: "email" | "phone" }) =>
      apiFetch<{ message: string }>(`${BASE}/${id}/resend-verification`, {
        method: "POST",
        body: { channel },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: ({
      id,
      password,
      password_confirmation,
    }: {
      id: number;
      password: string;
      password_confirmation: string;
    }) =>
      apiFetch<{ message: string }>(`/admin/staff/${id}/password`, {
        method: "PUT",
        body: { password, password_confirmation },
      }),
  });
}

export function useGetAdminStaff(params?: StaffParams) {
  const query = new URLSearchParams();
  if (params?.role) query.set("role", params.role);
  if (params?.search) query.set("search", params.search);
  const queryString = query.toString();

  return useQuery({
    queryKey: ["admin-staff", params],
    queryFn: () =>
      apiFetch<StaffResponse>(`/admin/staff${queryString ? `?${queryString}` : ""}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) =>
      apiFetch<{ message: string; user: StaffUser }>("/admin/staff", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useUpdateStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: CreateStaffPayload["role"] }) =>
      apiFetch<{ message: string; user: StaffUser }>(`/admin/staff/${id}/role`, {
        method: "PUT",
        body: { role },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useSuspendStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/staff/${id}/suspend`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useActivateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/staff/${id}/activate`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/staff/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => apiFetch<{ roles: AdminRole[] }>("/admin/roles").then((r) => r.roles),
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () =>
      apiFetch<{ permissions: AdminPermission[] }>("/admin/permissions").then(
        (r) => r.permissions,
      ),
  });
}

export function useRolePermissions(roleId: number | null) {
  return useQuery({
    queryKey: ["admin-role-permissions", roleId],
    queryFn: () =>
      apiFetch<{ role: string; permissions: string[] }>(
        `/admin/roles/${roleId}/permissions`,
      ),
    enabled: roleId !== null,
  });
}

export function useReplaceRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: number; permissions: string[] }) =>
      apiFetch<{ message: string; role: string; permissions: string[] }>(
        `/admin/roles/${roleId}/permissions`,
        { method: "PUT", body: { permissions } },
      ),
    onSuccess: (_, { roleId }) => {
      qc.invalidateQueries({ queryKey: ["admin-role-permissions", roleId] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
  });
}
