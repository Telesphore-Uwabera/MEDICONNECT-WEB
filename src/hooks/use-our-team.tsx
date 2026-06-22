// use-our-team.tsx

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/public/team";

// ── Types ────────────────────────────────────────────────────

export interface  ApiTeamMember {
  id: number;
  name: string;
  title: string;
  joined_at: string;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface  TeamApiResponse {
  current_page: number;
  data: ApiTeamMember[];
  total: number;
}

/* ─── useGetOurTeam  GET /public/team ────────────────────── */


export function useGetOurTeam() {
  return useQuery<TeamApiResponse>({
    queryKey: ['our-team'],
    queryFn: () => apiFetch('/public/team') as Promise<TeamApiResponse>,
  });
}
