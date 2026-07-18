import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/public/team";

export interface ApiTeamMember {
  id: number;
  name: string;
  title: string;
  level: number | null;
  order: number | null;
  icon: string | null;
  color_code: string | null;
  joined_at: string | null;
  photo: string | null;
  photo_url: string | null;
  icon_url: string | null;
  bio: string | null;
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
  per_page?: number;
  page?: number;
}

export function useGetOurTeam(params?: GetTeamParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.page) query.set("page", String(params.page));
  const qs = query.toString();

  return useQuery<TeamApiResponse>({
    queryKey: ["our-team", params],
    queryFn: () => apiFetch(`${BASE}${qs ? `?${qs}` : ""}`) as Promise<TeamApiResponse>,
  });
}

export function useGetOurTeamMember(id: number | null) {
  return useQuery<TeamMemberResponse>({
    queryKey: ["our-team-member", id],
    queryFn: () => apiFetch(`${BASE}/${id}`) as Promise<TeamMemberResponse>,
    enabled: !!id,
  });
}
