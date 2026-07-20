import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/public/services";

export interface ApiService {
  id: number;
  title_en: string;
  title_fr: string;
  title_kiny: string;
  description_en: string;
  description_fr: string;
  description_kiny: string;
  image: string | null;
  image_url: string | null;
  order: number | null;
  redirect_url: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServicesApiResponse {
  current_page: number;
  data: ApiService[];
  per_page?: number;
  total: number;
}

export interface ServiceResponse {
  service: ApiService;
}

export interface GetServicesParams {
  search?: string;
  per_page?: number;
  page?: number;
}

function buildQuery(params?: GetServicesParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.page) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function useGetPublicServices(params?: GetServicesParams) {
  return useQuery<ServicesApiResponse>({
    queryKey: ["public-services", params],
    queryFn: () => apiFetch(`${BASE}${buildQuery(params)}`) as Promise<ServicesApiResponse>,
  });
}

export function useGetPublicService(id: number | null) {
  return useQuery<ServiceResponse>({
    queryKey: ["public-service", id],
    queryFn: () => apiFetch(`${BASE}/${id}`) as Promise<ServiceResponse>,
    enabled: !!id,
  });
}
