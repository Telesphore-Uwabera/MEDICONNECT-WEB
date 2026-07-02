import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types (matching API response shapes)
// ─────────────────────────────────────────────────────────────────────────────

export interface PharmacyProfile {
  id: number;
  name_en: string;
  name_fr: string;
  name_kiny: string;
  slug: string;
  status: "pending" | "approved" | "rejected";
  is_active: boolean;
  is_open_24h: boolean;
  opens_at: string;
  closes_at: string;
  offers_delivery: boolean;
  offers_pickup: boolean;
  delivery_fee: string;
  delivery_currency: string;
  delivery_radius_km: number;
  estimated_delivery_minutes: number;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  logo: string | null;
  image: string | null;
  working_hours: WorkingHourRecord[];
  images: string[];
  social_links: Record<string, string> | null;
  // optional fields returned after create/update
  description_en?: string;
  registration_number?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
}

export interface WorkingHourRecord {
  id: number;
  pharmacy_id: number;
  day_of_week: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClosureRecord {
  id: number;
  pharmacy_id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query keys
// ─────────────────────────────────────────────────────────────────────────────
export const pharmacyKeys = {
  profile: ["pharmacy-profile"] as const,
  workingHours: ["pharmacy-working-hours"] as const,
  closures: ["pharmacy-closures"] as const,
  inventoryMode: ["pharmacy-inventory-mode"] as const,
};

export type PharmacyInventoryMode = "internal" | "external";

export interface PharmacyInventoryModeResponse {
  message?: string;
  inventory_mode: PharmacyInventoryMode;
}

export function useGetInventoryMode() {
  return useQuery({
    queryKey: pharmacyKeys.inventoryMode,
    queryFn: () =>
      apiFetch<PharmacyInventoryModeResponse>("/pharmacy/inventory/mode"),
    retry: false,
  });
}

export function useSwitchInventoryMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: PharmacyInventoryMode) =>
      apiFetch<PharmacyInventoryModeResponse>("/pharmacy/inventory/mode", {
        method: "PATCH",
        body: { mode },
      }),
    onSuccess: (data) => {
      qc.setQueryData(pharmacyKeys.inventoryMode, data);
      qc.invalidateQueries({ queryKey: pharmacyKeys.inventoryMode });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /profile
// ─────────────────────────────────────────────────────────────────────────────
export function useGetPharmacyProfile() {
  return useQuery({
    queryKey: pharmacyKeys.profile,
    queryFn: () =>
      apiFetch<{ pharmacy: PharmacyProfile }>("/pharmacy/profile").then(
        (r) => r.pharmacy
      ),
    retry: false, // 404 = "no profile yet", don't retry
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /profile  (create or update)
// ─────────────────────────────────────────────────────────────────────────────
export interface ProfilePayload {
  name_en?: string;
  name_fr?: string;
  name_kiny?: string;
  description_en?: string;
  registration_number?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  opens_at?: string;
  closes_at?: string;
  is_open_24h?: boolean;
  offers_delivery?: boolean;
  offers_pickup?: boolean;
  delivery_fee?: number;
  delivery_currency?: string;
  delivery_radius_km?: number;
  estimated_delivery_minutes?: number;
}

export function useCreateOrUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProfilePayload) =>
      apiFetch<{ message: string; pharmacy: PharmacyProfile }>("/pharmacy/profile", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      qc.setQueryData(pharmacyKeys.profile, data.pharmacy);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /profile/logo
// ─────────────────────────────────────────────────────────────────────────────
export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("logo", file);
      return apiFetch<{ message: string; logo: string }>("/pharmacy/profile/logo", {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.profile });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /profile/image
// ─────────────────────────────────────────────────────────────────────────────
export function useUploadCoverImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("image", file);
      return apiFetch<{ message: string; image: string }>("/pharmacy/profile/image", {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.profile });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKING HOURS
// ─────────────────────────────────────────────────────────────────────────────

// 5. GET /working-hours
export function useGetWorkingHours() {
  return useQuery({
    queryKey: pharmacyKeys.workingHours,
    queryFn: () =>
      apiFetch<{ working_hours: WorkingHourRecord[] }>("/pharmacy/working-hours").then(
        (r) => r.working_hours
      ),
  });
}

// 6. POST /working-hours  (bulk set)
export interface WorkingHourPayload {
  day_of_week: string;
  open_time?: string | null;
  close_time?: string | null;
  is_closed: boolean;
}

export function useSetWorkingHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hours: WorkingHourPayload[]) =>
      apiFetch<{ message: string; working_hours: WorkingHourRecord[] }>(
        "/pharmacy/working-hours",
        { method: "POST", body: { hours } }
      ),
    onSuccess: (data) => {
      qc.setQueryData(pharmacyKeys.workingHours, data.working_hours);
    },
  });
}

// 7. PUT /working-hours/{id}
export function useUpdateWorkingHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<WorkingHourPayload>;
    }) =>
      apiFetch<{ message: string; hour: WorkingHourRecord }>(
        `/pharmacy/working-hours/${id}`,
        { method: "PUT", body: payload }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.workingHours });
    },
  });
}

// 8. DELETE /working-hours/{id}
export function useDeleteWorkingHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`/pharmacy/working-hours/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.workingHours });
    },
  });
}

// 9. DELETE /working-hours/reset
export function useResetWorkingHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/pharmacy/working-hours/reset", {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.workingHours });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSURES
// ─────────────────────────────────────────────────────────────────────────────

// 10. GET /closures
export function useGetClosures() {
  return useQuery({
    queryKey: pharmacyKeys.closures,
    queryFn: () =>
      apiFetch<{ closures: ClosureRecord[] }>("/pharmacy/closures").then(
        (r) => r.closures
      ),
  });
}

// 11. POST /closures
export interface ClosurePayload {
  from_date: string;
  to_date: string;
  reason?: string;
}

export function useCreateClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClosurePayload) =>
      apiFetch<{ message: string; closure: ClosureRecord }>("/pharmacy/closures", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.closures });
    },
  });
}

// 12. PUT /closures/{id}
export function useUpdateClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<ClosurePayload>;
    }) =>
      apiFetch<{ message: string; closure: ClosureRecord }>(
        `/pharmacy/closures/${id}`,
        { method: "PUT", body: payload }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.closures });
    },
  });
}

// 13. DELETE /closures/{id}
export function useDeleteClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`/pharmacy/closures/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pharmacyKeys.closures });
    },
  });
}

// 14. POST /closures/check-date
export function useCheckClosureDate() {
  return useMutation({
    mutationFn: (date: string) =>
      apiFetch<{ date: string; is_closed: boolean; reason: string | null }>(
        "/pharmacy/closures/check-date",
        { method: "POST", body: { date } }
      ),
  });
}
