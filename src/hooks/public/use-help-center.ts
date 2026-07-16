// Public help-center links — no auth required.
// API: GET /public/help-center (optional ?category=)

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface PublicHelpCenterLink {
  id: number;
  title: string;
  description: string;
  url: string;
  icon?: string | null;
  category: string;
  order?: number;
  is_active?: boolean;
}

interface HelpCenterResponse {
  links: PublicHelpCenterLink[];
}

export const helpCenterPublicKeys = {
  list: (category?: string) => ["public-help-center", category ?? "all"] as const,
};

export function useGetHelpCenterLinks(category?: string) {
  return useQuery({
    queryKey: helpCenterPublicKeys.list(category),
    queryFn: (): Promise<HelpCenterResponse> => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : "";
      return apiFetch(`/public/help-center${qs}`);
    },
    select: (data: HelpCenterResponse) =>
      [...(data.links ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    staleTime: 5 * 60_000,
  });
}
