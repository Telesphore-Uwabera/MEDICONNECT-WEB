// import { apiFetch } from "@/lib/api";
// import { useQuery } from "@tanstack/react-query";

// const BASE = "/patient/search/doctors";

// // ─── Sub-types ─────────────────────────────────────────────────────────────────

// export interface ApiDoctorHospital {
//   id: number;
//   name: string;
//   city?: string;
//   address?: string;
// }

// export interface ApiDoctorSpecialization {
//   id: number;
//   name: string;
// }

// // ─── API Types ──────────────────────────────────────────────────────────────────

// export interface ApiDoctor {
//   id: number;
//   user_id: number;
//   slug: string;
//   specialization: string;
//   doctor_degree: string;
//   medical_license: string;
//   designations: string;
//   bio_en: string;
//   bio_fr: string;
//   bio_kiny: string;
//   consultation_fee: string;
//   currency: string;
//   is_available: boolean;
//   instant_consultation: boolean;
//   bookings_paused: boolean;
//   consultation_type: "online" | "in_person" | "both";
//   image: string | null;
//   preferred_language: string;
//   city: string | null;
//   status: "active" | "inactive";
//   is_active: boolean;
//   is_featured: boolean;
//   rating_avg: string;
//   show_homepage: boolean;
//   agreement_status: string;
//   verified_at: string | null;
//   created_at: string;
//   updated_at: string;
//   deleted_at: string | null;
//   user: {
//     id: number;
//     name: string;
//     avatar: string | null;
//   };
//   hospitals: ApiDoctorHospital[];
//   specializations: ApiDoctorSpecialization[];
// }

// export interface ApiDoctorListResponse {
//   current_page: number;
//   data: ApiDoctor[];
//   first_page_url: string;
//   from: number;
//   last_page: number;
//   last_page_url: string;
//   next_page_url: string | null;
//   path: string;
//   per_page: number;
//   prev_page_url: string | null;
//   to: number;
//   total: number;
// }

// // ─── Filter Params ──────────────────────────────────────────────────────────────

// export interface DoctorSearchParams {
//   q?: string;
//   specialization?: string;
//   type?: "online" | "in_person" | "both";
//   language?: string;
//   city?: string;
//   gender?: "male" | "female";
//   hospital_id?: number;
//   insurance_id?: number;
//   available_today?: boolean;
//   instant?: boolean;
//   page?: number;
// }

// // ─── Hook ──────────────────────────────────────────────────────────────────────

// export function useGetSearchDoctors(params: DoctorSearchParams = {}) {
//   const searchParams = new URLSearchParams();

//   if (params.q && params.q.trim().length >= 2) searchParams.set("q", params.q.trim());
//   if (params.specialization) searchParams.set("specialization", params.specialization);
//   if (params.type) searchParams.set("type", params.type);
//   if (params.language) searchParams.set("language", params.language);
//   if (params.city) searchParams.set("city", params.city);
//   if (params.gender) searchParams.set("gender", params.gender);
//   if (params.hospital_id != null) searchParams.set("hospital_id", String(params.hospital_id));
//   if (params.insurance_id != null) searchParams.set("insurance_id", String(params.insurance_id));
//   if (params.available_today) searchParams.set("available_today", "true");
//   if (params.instant) searchParams.set("instant", "true");
//   if (params.page && params.page > 1) searchParams.set("page", String(params.page));

//   const queryString = searchParams.toString();
//   const url = queryString ? `${BASE}?${queryString}` : BASE;

//   return useQuery({
//     queryKey: ["patient-search-doctors", params],
//     queryFn: (): Promise<ApiDoctorListResponse> =>
//       apiFetch(url).then((res) => res as ApiDoctorListResponse),
//     staleTime: 30_000,
//   });
// }
