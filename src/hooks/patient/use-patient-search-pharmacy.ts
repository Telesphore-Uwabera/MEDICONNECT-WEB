import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface WorkingHour {
  id: number;
  pharmacy_id: string;
  day_of_week: DayOfWeek;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  website?: string;
}

export interface Pharmacy {
  id: number;
  slug: string;
  name: string;
  logo: string | null;
  address: string;
  city: string;
  province: string;
  phone: string | null;
  email: string | null;
  /** Comes as a numeric string from the API e.g. "-1.9441000" */
  latitude: string | null;
  /** Comes as a numeric string from the API e.g. "30.0619000" */
  longitude: string | null;
  is_open_24h: boolean;
  offers_delivery: boolean;
  offers_pickup: boolean;
  /** e.g. "2000.00" */
  delivery_fee: string | null;
  delivery_currency: string | null;
  /** e.g. "45" — comes as a string */
  estimated_delivery_minutes: string | null;
  is_verified: boolean;
  distance_km: number | null;
  working_hours: WorkingHour[];
  social_links: SocialLinks | null;
}

/** Every list endpoint returns { status, data, meta } */
export interface ApiListResponse<T> {
  status: string;
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface Medicine {
  id: number;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  price: number;
  stock: number;
  prescription_required: boolean;
  image_url?: string;
  rating?: number;
  pharmacy: {
    id: number;
    slug: string;
    name: string;
    city: string;
    /** delivery minutes from the nested pharmacy object */
    estimated_delivery_minutes?: string | null;
  };
}

// ─── Param interfaces ─────────────────────────────────────────────────────────

export interface PharmacySearchParams {
  q?: string;
  city?: string;
  province?: string;
  offers_delivery?: boolean;
  offers_pickup?: boolean;
  is_open_24h?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
  per_page?: number;
  page?: number;
}

export interface MedicineSearchParams {
  q: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface MedicinePharmacyParams {
  pharmacySlug: string;
  q?: string;
  /**
   * Extra gate — set to `false` to keep the query dormant (e.g. while the
   * drawer that owns this data is closed). Defaults to `true`.
   */
  enabled?: boolean;
}

export interface MedicineAvailabilityParams {
  pharmacy_slug: string;
  medicine_id: number;
  /**
   * Extra gate — set to `false` to keep the query dormant (e.g. while the
   * drawer that owns this data is closed). Defaults to `true`.
   */
  enabled?: boolean;
}

// ─── Pharmacy hooks ───────────────────────────────────────────────────────────

export function useSearchPharmacies(params: PharmacySearchParams) {
  const sp = new URLSearchParams();

  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.city) sp.set("city", params.city);
  if (params.province) sp.set("province", params.province);
  if (params.offers_delivery) sp.set("offers_delivery", "1");
  if (params.offers_pickup) sp.set("offers_pickup", "1");
  if (params.is_open_24h) sp.set("is_open_24h", "1");
  if (params.lat != null) sp.set("lat", String(params.lat));
  if (params.lng != null) sp.set("lng", String(params.lng));
  if (params.radius != null) sp.set("radius", String(params.radius));
  if (params.per_page) sp.set("per_page", String(params.per_page));
  if (params.page && params.page > 1) sp.set("page", String(params.page));

  const qs = sp.toString();
  const url = qs ? `/patient/pharmacies?${qs}` : "/patient/pharmacies";

  return useQuery<ApiListResponse<Pharmacy>>({
    queryKey: ["pharmacies", params],
    queryFn: () => apiFetch(url),
    staleTime: 30_000,
  });
}

export function useNearbyPharmacies(
  lat: number,
  lng: number,
  radius = 10,
  enabled = true,
) {
  const url = `/patient/pharmacies/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;

  return useQuery<ApiListResponse<Pharmacy>>({
    queryKey: ["pharmacies-nearby", lat, lng, radius],
    queryFn: () => apiFetch(url),
    enabled,
    staleTime: 60_000,
  });
}

export function usePharmacyDetail(slug: string) {
  return useQuery<{ status: string; data: Pharmacy }>({
    queryKey: ["pharmacy", slug],
    queryFn: () => apiFetch(`/patient/pharmacies/${slug}`),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function usePharmacyWorkingHours(slug: string) {
  return useQuery<{ status: string; data: WorkingHour[] }>({
    queryKey: ["pharmacy-hours", slug],
    queryFn: () => apiFetch(`/patient/pharmacies/${slug}/working-hours`),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

// ─── Medicine hooks ───────────────────────────────────────────────────────────

export function useSearchMedicines(params: MedicineSearchParams) {
  const q = params.q?.trim() ?? "";
  const enabled = q.length >= 2;

  const sp = new URLSearchParams();
  if (enabled) sp.set("q", q);
  if (params.lat != null) sp.set("lat", String(params.lat));
  if (params.lng != null) sp.set("lng", String(params.lng));
  if (params.radius != null) sp.set("radius", String(params.radius));

  const url = `/public/medicines?${sp.toString()}`;

  return useQuery<Medicine[]>({
    queryKey: ["medicines", params],
    queryFn: () => apiFetch(url),
    enabled,
    staleTime: 30_000,
  });
}

export function usePharmacyMedicines(params: MedicinePharmacyParams) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());

  const qs = sp.toString();
  const url = qs
    ? `/public/medicines/pharmacy/${params.pharmacySlug}?${qs}`
    : `/public/medicines/pharmacy/${params.pharmacySlug}`;

  return useQuery<Medicine[]>({
    queryKey: ["pharmacy-medicines", params],
    queryFn: () => apiFetch(url),
    // ✅ Both conditions must be true: slug present AND caller has opted in
    enabled: !!params.pharmacySlug && (params.enabled ?? true),
    staleTime: 30_000,
  });
}

export function useMedicineAvailability(params: MedicineAvailabilityParams) {
  const url = `/public/medicines/availability?pharmacy_slug=${params.pharmacy_slug}&medicine_id=${params.medicine_id}`;

  return useQuery({
    queryKey: ["medicine-availability", params],
    queryFn: () => apiFetch(url),
    // ✅ Both conditions must be true: IDs present AND caller has opted in
    enabled:
      !!params.pharmacy_slug &&
      !!params.medicine_id &&
      (params.enabled ?? true),
    staleTime: 30_000,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse the API's numeric string lat/lng to a number, or null if absent. */
export function parseCoord(value: string | null | undefined): number | null {
  if (value == null) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

/** Parse estimated_delivery_minutes string to a number, or null. */
export function parseDeliveryMins(
  value: string | null | undefined,
): number | null {
  if (value == null) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}
