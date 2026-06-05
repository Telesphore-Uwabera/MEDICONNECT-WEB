import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

export interface TermsPage {
  id: number;
  type: string;
  title: string;
  content: string; // HTML string
  updated_at: string;
}

export interface TermsResponse {
  data: TermsPage;
}

export const useTerms = (type: string, enabled = true) =>
  useQuery({
    queryKey: ["terms", type],
    queryFn: () =>
      apiFetch<TermsResponse>(`/public/page-setup/terms/${type}`),
    enabled,
    staleTime: 1000 * 60 * 10, // cache 10 min
    select: (res) => res.data,
  });
