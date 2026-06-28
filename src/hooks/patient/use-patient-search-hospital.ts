import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/public/hospitals";

// ─── API Types ──────────────────────────────────────────────────────────────────

export interface ApiDepartment {
  id: number;
  name_en: string;
  icon: string | null;
}

export interface ApiInsurance {
  id: number;
  name: string;
  code: string;
  logo: string | null;
}

export interface ApiWorkingHour {
  day: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface ApiHospital {
  id: number;
  name_en: string;
  slug: string;
  type: "hospital" | "clinic" | "health_center" | "pharmacy_clinic";
  city: string;
  address: string;
  is_open_24h: boolean;
  doctors_count: number;
  departments_count: number;
  departments: ApiDepartment[];
  insurances: ApiInsurance[];
  working_hours: ApiWorkingHour[];
}

export interface ApiHospitalListResponse {
  data: ApiHospital[];
  current_page: number;
  per_page: number;
  total: number;
  last_page?: number;
}

// ─── Filter Params ──────────────────────────────────────────────────────────────

export interface HospitalSearchParams {
  q?: string;
  city?: string;
  type?: "hospital" | "clinic" | "health_center" | "pharmacy_clinic";
  insurance_id?: number;
  open_now?: boolean;
  page?: number;
  per_page?: number;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useGetSearchHospitals(params: HospitalSearchParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.q && params.q.trim().length >= 2)
    searchParams.set("q", params.q.trim());
  if (params.city) searchParams.set("city", params.city);
  if (params.type) searchParams.set("type", params.type);
  if (params.insurance_id != null)
    searchParams.set("insurance_id", String(params.insurance_id));
  if (params.open_now) searchParams.set("open_now", "true");
  if (params.page && params.page > 1)
    searchParams.set("page", String(params.page));
  if (params.per_page)
    searchParams.set("per_page", String(params.per_page));

  const queryString = searchParams.toString();
  const url = queryString ? `${BASE}?${queryString}` : BASE;

  return useQuery({
    queryKey: ["search-hospitals", params],
    queryFn: (): Promise<ApiHospitalListResponse> =>
      apiFetch(url).then((res) => res as ApiHospitalListResponse),
    staleTime: 30_000,
  });
}

export function useInfiniteSearchHospitals(params: HospitalSearchParams = {}) {
  return useInfiniteQuery({
    queryKey: ["search-hospitals-infinite", params],
    queryFn: ({ pageParam = 1 }): Promise<ApiHospitalListResponse> => {
      const searchParams = new URLSearchParams();

      if (params.q && params.q.trim().length >= 2) searchParams.set("q", params.q.trim());
      if (params.city) searchParams.set("city", params.city);
      if (params.type) searchParams.set("type", params.type);
      if (params.insurance_id != null) searchParams.set("insurance_id", String(params.insurance_id));
      if (params.open_now) searchParams.set("open_now", "true");
      searchParams.set("page", String(pageParam));
      if (params.per_page) searchParams.set("per_page", String(params.per_page));

      const queryString = searchParams.toString();
      const url = queryString ? `${BASE}?${queryString}` : BASE;

      return apiFetch(url).then((res) => res as ApiHospitalListResponse);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.last_page && lastPage.current_page < lastPage.last_page) {
        return lastPage.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}
