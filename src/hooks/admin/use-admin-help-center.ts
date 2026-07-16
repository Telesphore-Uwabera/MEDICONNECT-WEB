import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/help-center-links";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HelpCenterCategory = "patient" | "doctor" | "hospital" | "pharmacy" | (string & {});

export interface ApiHelpCenterLink {
  id: number;
  title: string;
  description: string;
  url: string;
  icon: string | null;
  category: HelpCenterCategory;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface ListResponse {
  links: ApiHelpCenterLink[];
}

interface SingleResponse {
  link: ApiHelpCenterLink;
}

export interface HelpCenterLinksParams {
  category?: HelpCenterCategory;
}

export interface HelpCenterLinkPayload {
  title: string;
  description: string;
  url: string;
  icon?: string | null;
  category: HelpCenterCategory;
  order?: number;
  is_active?: boolean;
}

export type UpdateHelpCenterLinkPayload = Partial<HelpCenterLinkPayload>;

// ─── Query key factory ────────────────────────────────────────────────────────

export const helpCenterKeys = {
  all: () => ["admin-help-center-links"] as const,
  list: (params?: HelpCenterLinksParams) => ["admin-help-center-links", "list", params] as const,
  detail: (id: number) => ["admin-help-center-links", "detail", id] as const,
};

// ─── GET /admin/help-center-links ────────────────────────────────────────────

export function useGetHelpCenterLinks(params?: HelpCenterLinksParams) {
  return useQuery({
    queryKey: helpCenterKeys.list(params),
    queryFn: (): Promise<ListResponse> => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set("category", params.category);
      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      return apiFetch(url);
    },
    select: (data: ListResponse) => data.links,
  });
}

// ─── GET /admin/help-center-links/{id} ───────────────────────────────────────

export function useGetHelpCenterLink(id: number | null) {
  return useQuery({
    queryKey: helpCenterKeys.detail(id ?? -1),
    queryFn: (): Promise<SingleResponse> => apiFetch(`${BASE}/${id}`),
    select: (data: SingleResponse) => data.link,
    enabled: id != null,
  });
}

// ─── POST /admin/help-center-links ───────────────────────────────────────────

export function useCreateHelpCenterLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: HelpCenterLinkPayload): Promise<SingleResponse> =>
      apiFetch(BASE, { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: helpCenterKeys.all() }),
  });
}

// ─── PATCH /admin/help-center-links/{id} ─────────────────────────────────────

export function useUpdateHelpCenterLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateHelpCenterLinkPayload }): Promise<SingleResponse> =>
      apiFetch(`${BASE}/${id}`, { method: "PATCH", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: helpCenterKeys.all() }),
  });
}

// ─── DELETE /admin/help-center-links/{id} ────────────────────────────────────

export function useDeleteHelpCenterLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number): Promise<{ message: string }> =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: helpCenterKeys.all() }),
  });
}

// ─── POST /admin/help-center-links/{id}/restore ──────────────────────────────

export function useRestoreHelpCenterLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number): Promise<SingleResponse> =>
      apiFetch(`${BASE}/${id}/restore`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: helpCenterKeys.all() }),
  });
}
