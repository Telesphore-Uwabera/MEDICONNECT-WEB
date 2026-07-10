import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { LegalDocument, LegalDocumentType } from "@/hooks/Terms/useTerms";

const BASE = "/admin/legal-documents";

export interface LegalDocumentPayload {
  type: LegalDocumentType;
  title_en: string;
  title_fr: string;
  title_kiny: string;
  content_en: string;
  content_fr: string;
  content_kiny: string;
  version: string;
  effective_date: string;
  is_current: boolean;
  is_active: boolean;
}

export interface LegalDocumentsResponse {
  current_page: number;
  data: LegalDocument[];
  total: number;
  per_page?: number;
}

export function useAdminLegalDocuments(params?: {
  type?: LegalDocumentType;
  current_only?: boolean;
  per_page?: number;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params?.type) search.set("type", params.type);
  if (params?.current_only) search.set("current_only", "1");
  if (params?.per_page) search.set("per_page", String(params.per_page));
  if (params?.page) search.set("page", String(params.page));
  const query = search.toString();

  return useQuery({
    queryKey: ["admin-legal-documents", params],
    queryFn: () => apiFetch<LegalDocumentsResponse>(query ? `${BASE}?${query}` : BASE),
  });
}

export function useAdminLegalDocument(id: number | null) {
  return useQuery({
    queryKey: ["admin-legal-document", id],
    queryFn: () => apiFetch<LegalDocument>(`${BASE}/${id}`),
    enabled: id != null,
  });
}

export function useCreateLegalDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LegalDocumentPayload) =>
      apiFetch<{ message: string; data: LegalDocument }>(BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-legal-documents"] });
      qc.invalidateQueries({ queryKey: ["public-legal-document"] });
    },
  });
}

export function useUpdateLegalDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: LegalDocumentPayload }) =>
      apiFetch<{ message: string; data: LegalDocument }>(`${BASE}/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-legal-documents"] });
      qc.invalidateQueries({ queryKey: ["admin-legal-document", variables.id] });
      qc.invalidateQueries({ queryKey: ["public-legal-document"] });
    },
  });
}

export function useDeleteLegalDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ message: string }>(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-legal-documents"] });
      qc.invalidateQueries({ queryKey: ["public-legal-document"] });
    },
  });
}

export function useSetCurrentLegalDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string; data: LegalDocument }>(`${BASE}/${id}/set-current`, {
        method: "POST",
      }),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ["admin-legal-documents"] });
      qc.invalidateQueries({ queryKey: ["admin-legal-document", id] });
      qc.invalidateQueries({ queryKey: ["public-legal-document"] });
    },
  });
}
