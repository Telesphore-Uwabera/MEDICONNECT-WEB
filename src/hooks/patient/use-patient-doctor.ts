import { useMemo } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useMe } from "@/hooks/useAuth";
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
  /** Specialist sub-types the doctor saved under their specialization.
   *  Field/name shape is read defensively (name / sub_type / sub_specialization). */
  sub_specializations?: Array<{
    id: number;
    name?: string;
    sub_type?: string;
    sub_specialization?: string;
  }>;
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

let specializationFees: Promise<Map<number, number>> | null = null;

function loadSpecializationFees() {
  if (!specializationFees) {
    specializationFees = apiFetch<Array<{ id: number; online_fee?: string | number }>>(
      "/public/dropdowns/specialization-fees",
    )
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        return new Map(list.map((fee) => [Number(fee.id), Number(fee.online_fee) || 0]));
      })
      .catch(() => new Map<number, number>());
  }
  return specializationFees;
}

async function withResolvedFees(response: ApiDoctorListResponse) {
  if (!Array.isArray(response?.data)) return response;
  const missing = response.data.some(
    (doctor) => !(Number(doctor.consultation_fee) > 0) && Number((doctor as { specialization_fee_id?: number }).specialization_fee_id) > 0,
  );
  if (!missing) return response;
  const fees = await loadSpecializationFees();
  return {
    ...response,
    data: response.data.map((doctor) => {
      if (Number(doctor.consultation_fee) > 0) return doctor;
      const online = fees.get(Number((doctor as { specialization_fee_id?: number }).specialization_fee_id));
      if (!online) return doctor;
      return { ...doctor, consultation_fee: String(online), currency: doctor.currency || "RWF" };
    }),
  };
}

function withoutOwnDoctor(response: ApiDoctorListResponse, userId?: number) {
  if (!userId || !Array.isArray(response?.data)) return response;
  const data = response.data.filter(
    (doctor) => doctor.user_id !== userId && doctor.user?.id !== userId,
  );
  const removed = response.data.length - data.length;
  if (!removed) return response;
  return {
    ...response,
    data,
    total: Math.max(0, (response.total ?? data.length) - removed),
  };
}

export function useGetSearchDoctors(params: DoctorSearchParams = {}) {
  const { data: me } = useMe();
  const ownId = (me?.active_role ?? me?.role) === "patient" ? me?.id : undefined;
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

  const query = useQuery({
    queryKey: ["patient-search-doctors", url],

    queryFn: (): Promise<ApiDoctorListResponse> =>
      apiFetch(url).then((res) => withResolvedFees(res as ApiDoctorListResponse)),
    staleTime: 60_000,
    refetchInterval: 10 * 60 * 1000,
  });
  const data = useMemo(
    () => (query.data ? withoutOwnDoctor(query.data, ownId) : query.data),
    [ownId, query.data],
  );
  return { ...query, data };
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

      return apiFetch(url).then((res) => withResolvedFees(res as ApiDoctorListResponse));
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
