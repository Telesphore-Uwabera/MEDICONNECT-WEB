import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/public/doctors";

// ─── Sub-types ─────────────────────────────────────────────────────────────────

export interface ApiDoctorHospital {
  id: number;
  name: string;
  city?: string;
  address?: string;
}

export interface ApiDoctorSpecialization {
  id: number;
  name: string;
}

// ─── API Types ──────────────────────────────────────────────────────────────────

export interface ApiDoctor {
  id: number;
  user_id: number;
  slug: string;
  specialization: string;
  doctor_degree: string;
  medical_license: string;
  designations: string;
  bio_en: string;
  bio_fr: string;
  bio_kiny: string;
  consultation_fee: string;
  currency: string;
  is_available: boolean;
  instant_consultation: boolean;
  bookings_paused: boolean;
  consultation_type: "instant" | "booking" | "both";
  image: string | null;
  preferred_language: string;
  city: string | null;
  status: "active" | "inactive";
  is_active: boolean;
  is_featured: boolean;
  rating_avg: string;
  show_homepage: boolean;
  agreement_status: string;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
  hospitals: ApiDoctorHospital[];
  specializations: ApiDoctorSpecialization[];
}

export interface ApiDoctorListResponse {
  current_page: number;
  data: ApiDoctor[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

// ─── Filter Params ──────────────────────────────────────────────────────────────

export interface DoctorSearchParams {
  q?: string;
  specialization?: string;
  specialization_fee_id?: number;
  type?: "instant" | "booking" | "both";
  language?: string;
  city?: string;
  gender?: "male" | "female";
  hospital_id?: number;
  insurance_id?: number;
  available_today?: boolean;
  instant?: boolean;
  date?: string;
  page?: number;
  per_page?: number;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useGetSearchDoctors(params: DoctorSearchParams = {}) {
  const sp = new URLSearchParams();

  if (params.q && params.q.trim().length >= 2) sp.set("q", params.q.trim());
  if (params.specialization) sp.set("specialization", params.specialization);
  if (params.specialization_fee_id != null)
    sp.set("specialization_fee_id", String(params.specialization_fee_id));
  if (params.type) sp.set("type", params.type);
  if (params.language) sp.set("language", params.language);
  if (params.city) sp.set("city", params.city);
  if (params.gender) sp.set("gender", params.gender);
  if (params.hospital_id != null)
    sp.set("hospital_id", String(params.hospital_id));
  if (params.insurance_id != null)
    sp.set("insurance_id", String(params.insurance_id));
  if (params.available_today) sp.set("available_today", "true");
  if (params.instant) sp.set("instant", "true");
  if (params.date) sp.set("date", params.date);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.per_page) sp.set("per_page", String(params.per_page));

  const queryString = sp.toString();
  const available_doctors_url = `${BASE}/available-doctors`;
  const url = queryString
    ? `${BASE}/available-doctors?${queryString}`
    : available_doctors_url;

  // /patient/search/doctors?instant=true&page=2&per_page=10
  return useQuery({
    queryKey: ["patient-search-doctors", url],

    queryFn: (): Promise<ApiDoctorListResponse> =>
      apiFetch(url).then((res) => res as ApiDoctorListResponse),
    staleTime: url === BASE ? 30_000 : 0,
  });
}

export function useInfiniteSearchDoctors(params: DoctorSearchParams = {}) {
  return useInfiniteQuery({
    queryKey: ["patient-search-doctors-infinite", params],
    queryFn: ({ pageParam = 1 }): Promise<ApiDoctorListResponse> => {
      const sp = new URLSearchParams();

      if (params.q && params.q.trim().length >= 2) sp.set("q", params.q.trim());
      if (params.specialization)
        sp.set("specialization", params.specialization);
      if (params.specialization_fee_id != null)
        sp.set("specialization_fee_id", String(params.specialization_fee_id));
      if (params.type) sp.set("type", params.type);
      if (params.language) sp.set("language", params.language);
      if (params.city) sp.set("city", params.city);
      if (params.gender) sp.set("gender", params.gender);
      if (params.hospital_id != null)
        sp.set("hospital_id", String(params.hospital_id));
      if (params.insurance_id != null)
        sp.set("insurance_id", String(params.insurance_id));
      if (params.available_today) sp.set("available_today", "true");
      if (params.instant) sp.set("instant", "true");
      if (params.date) sp.set("date", params.date);
      sp.set("page", String(pageParam));
      if (params.per_page) sp.set("per_page", String(params.per_page));

      const queryString = sp.toString();
      const available_doctors_url = `${BASE}/available-doctors`;
      const url = queryString
        ? `${BASE}/available-doctors?${queryString}`
        : available_doctors_url;

      return apiFetch(url).then((res) => res as ApiDoctorListResponse);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.current_page < lastPage.last_page) {
        return lastPage.current_page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}
