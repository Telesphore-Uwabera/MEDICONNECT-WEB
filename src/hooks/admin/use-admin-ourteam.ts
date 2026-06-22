import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/team";

// ── Types ────────────────────────────────────────────────────

export interface ApiTeamMember {
  id: number;
  name: string;
  title: string;
  joined_at: string;
  bio: string | null;         // ← ADD THIS
  photo: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamApiResponse {
  current_page: number;
  data: ApiTeamMember[];
  total: number;
}

export interface TeamMemberResponse {
  member: ApiTeamMember;
}

export interface GetTeamParams {
  search?: string;
  is_active?: boolean;
  per_page?: number;
  page?: number;
}

// ── GET /admin/team ──────────────────────────────────────────

export function useGetAdminTeam(params?: GetTeamParams) {
  const query = new URLSearchParams();
  if (params?.search)                    query.set("search",    params.search);
  if (params?.is_active !== undefined)   query.set("is_active", String(params.is_active));
  if (params?.per_page)                  query.set("per_page",  String(params.per_page));
  if (params?.page)                      query.set("page",      String(params.page));
  const qs = query.toString();

  return useQuery<TeamApiResponse>({
    queryKey: ["admin-team", params],
    queryFn: () => apiFetch(`${BASE}${qs ? `?${qs}` : ""}`) as Promise<TeamApiResponse>,
  });
}

// ── GET /admin/team/:id ──────────────────────────────────────

export function useGetAdminTeamMember(id: number | null) {
  return useQuery<TeamMemberResponse>({
    queryKey: ["admin-team-member", id],
    queryFn: () => apiFetch(`${BASE}/${id}`) as Promise<TeamMemberResponse>,
    enabled: !!id,
  });
}

// ── POST /admin/team ─────────────────────────────────────────

export function useCreateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(BASE, { method: "POST", body: formData }) as Promise<{ message: string; member: ApiTeamMember }>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-team"] }),
  });
}

// ── POST /admin/team/:id (update) ────────────────────────────

export function useUpdateTeamMember(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(`${BASE}/${id}`, { method: "POST", body: formData }) as Promise<{ message: string; member: ApiTeamMember }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      qc.invalidateQueries({ queryKey: ["admin-team-member", id] });
    },
  });
}

// ── POST /admin/team/:id/photo ───────────────────────────────

export function useUploadTeamPhoto(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(`${BASE}/${id}/photo`, { method: "POST", body: formData }) as Promise<{ message: string; photo_url: string }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      qc.invalidateQueries({ queryKey: ["admin-team-member", id] });
    },
  });
}

// ── PATCH /admin/team/:id/toggle-active ─────────────────────

export function useToggleTeamMemberActive(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`${BASE}/${id}/toggle-active`, { method: "PATCH" }) as Promise<{ message: string; is_active: boolean }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      qc.invalidateQueries({ queryKey: ["admin-team-member", id] });
    },
  });
}

// ── DELETE /admin/team/:id ───────────────────────────────────

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }) as Promise<{ message: string }>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-team"] }),
  });
}
