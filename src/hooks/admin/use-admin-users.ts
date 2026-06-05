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
          console.log("Admin users fetched:", res);
          return res;
        }
      ),
    placeholderData: (prev) => prev, // keep stale data visible while refetching
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
