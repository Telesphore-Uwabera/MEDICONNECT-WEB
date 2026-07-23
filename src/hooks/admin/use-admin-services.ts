import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ApiService, ServiceResponse, ServicesApiResponse } from "@/hooks/use-services";

const BASE = "/admin/services";

export interface GetAdminServicesParams {
  search?: string;
  is_active?: boolean;
  per_page?: number;
  page?: number;
}

function buildQuery(params?: GetAdminServicesParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.page) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

function invalidateServices(qc: ReturnType<typeof useQueryClient>, id?: number) {
  qc.invalidateQueries({ queryKey: ["admin-services"] });
  qc.invalidateQueries({ queryKey: ["public-services"] });
  if (id) {
    qc.invalidateQueries({ queryKey: ["admin-service", id] });
    qc.invalidateQueries({ queryKey: ["public-service", id] });
  }
}

export function useGetAdminServices(params?: GetAdminServicesParams) {
  return useQuery<ServicesApiResponse>({
    queryKey: ["admin-services", params],
    queryFn: () => apiFetch(`${BASE}${buildQuery(params)}`) as Promise<ServicesApiResponse>,
  });
}

export function useGetAdminService(id: number | null) {
  return useQuery<ServiceResponse>({
    queryKey: ["admin-service", id],
    queryFn: () => apiFetch(`${BASE}/${id}`) as Promise<ServiceResponse>,
    enabled: !!id,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(BASE, { method: "POST", body: formData }) as Promise<{ message: string; service: ApiService }>,
    onSuccess: () => invalidateServices(qc),
  });
}

export function useUpdateService(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(`${BASE}/${id}`, { method: "POST", body: formData }) as Promise<{ message: string; service: ApiService }>,
    onSuccess: () => invalidateServices(qc, id),
  });
}

export function useUploadServiceImage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(`${BASE}/${id}/image`, { method: "POST", body: formData }) as Promise<{ message: string; image_url: string }>,
    onSuccess: () => invalidateServices(qc, id),
  });
}

export function useToggleServiceActive(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`${BASE}/${id}/toggle-active`, { method: "PATCH" }) as Promise<{ message: string; is_active: boolean }>,
    onSuccess: () => invalidateServices(qc, id),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }) as Promise<{ message: string }>,
    onSuccess: () => invalidateServices(qc),
  });
}
