import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type LegalDocumentType = "terms" | "privacy";

export interface LegalDocument {
  id: number;
  type: LegalDocumentType;
  title_en?: string | null;
  title_fr?: string | null;
  title_kiny?: string | null;
  content_en?: string | null;
  content_fr?: string | null;
  content_kiny?: string | null;
  version?: string | null;
  effective_date?: string | null;
  is_current?: boolean;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TermsPage {
  id: number;
  type: string;
  title: string;
  content: string;
  updated_at: string;
}

export interface TermsResponse {
  data: TermsPage;
}

export function usePublicLegalDocument(type: LegalDocumentType, enabled = true) {
  return useQuery({
    queryKey: ["public-legal-document", type],
    queryFn: () => apiFetch<LegalDocument>(`/public/legal-documents/${type}`),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export const useTerms = (type: string, enabled = true) =>
  useQuery({
    queryKey: ["terms", type],
    queryFn: () => apiFetch<TermsResponse>(`/public/page-setup/terms/${type}`),
    enabled,
    staleTime: 10 * 60 * 1000,
    select: (res) => res.data,
  });
