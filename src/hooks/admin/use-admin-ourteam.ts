import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/team";

export interface ApiTeamMember {
  id: number;
  name: string;
  title: string;
  level: number | null;
  order: number | null;
  icon: string | null;
  color_code: string | null;
  joined_at: string | null;
  bio: string | null;
  photo: string | null;
  photo_url: string | null;
  icon_url: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TeamApiResponse {
  current_page: number;
  data: ApiTeamMember[];
  per_page?: number;
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

export function useGetAdminTeam(params?: GetTeamParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.page) query.set("page", String(params.page));
  const qs = query.toString();

  return useQuery<TeamApiResponse>({
    queryKey: ["admin-team", params],
    queryFn: () => apiFetch(`${BASE}${qs ? `?${qs}` : ""}`) as Promise<TeamApiResponse>,
  });
}

export function useGetAdminTeamMember(id: number | null) {
  return useQuery<TeamMemberResponse>({
    queryKey: ["admin-team-member", id],
    queryFn: () => apiFetch(`${BASE}/${id}`) as Promise<TeamMemberResponse>,
    enabled: !!id,
  });
}

export function useCreateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(BASE, { method: "POST", body: formData }) as Promise<{ message: string; member: ApiTeamMember }>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-team"] }),
  });
}

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

export function useUploadTeamIcon(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(`${BASE}/${id}/icon`, { method: "POST", body: formData }) as Promise<{ message: string; icon_url: string }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      qc.invalidateQueries({ queryKey: ["admin-team-member", id] });
    },
  });
}

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

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }) as Promise<{ message: string }>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-team"] }),
  });
}
