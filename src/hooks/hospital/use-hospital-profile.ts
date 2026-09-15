import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/hospital/profile";
const IMAGES_BASE = "/hospital/images";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HospitalImage {
  id: number;
  image_url: string;
  caption: string;
  type: "gallery" | "facility" | "team" | "other";
  sort_order: number;
  is_active: boolean;
}

export interface HospitalProfileResponse {
  hospital: {
    id: number;
    name_en: string;
    name_fr: string;
    name_kiny: string;
    type: string;
    slug: string;
    status: string;
    is_active: boolean;
    is_open_24h: boolean;
    opens_at: string;
    closes_at: string;
    address: string;
    city: string;
    province: string;
    country: string;
    latitude: number;
    longitude: number;
    phone: string;
    email: string;
    website: string;
    logo: string | null;
    image: string | null;
    description_en?: string;
    registration_number?: string;
    social_links: Record<string, string> | null;
    images: HospitalImage[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /hospital/profile
// ─────────────────────────────────────────────────────────────────────────────

export function useGetHospitalProfile() {
  return useQuery<HospitalProfileResponse>({
    queryKey: ["hospital-profile"],
    queryFn: () => apiFetch<HospitalProfileResponse>(BASE),
    retry: false, // 404 means "no profile yet" — don't retry
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /hospital/profile  (create or update)
// ─────────────────────────────────────────────────────────────────────────────

export interface UpsertProfilePayload {
  name_en?: string;
  name_fr?: string;
  name_kiny?: string;
  description_en?: string;
  type?: string;
  registration_number?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  latitude?: number | string;
  longitude?: number | string;
  phone?: string;
  email?: string;
  website?: string;
  opens_at?: string;
  closes_at?: string;
  is_open_24h?: boolean;
  social_links?: Record<string, string>;
}

export function useUpsertHospitalProfile() {
  const qc = useQueryClient();
  return useMutation<HospitalProfileResponse, Error, UpsertProfilePayload>({
    mutationFn: (payload) =>
      apiFetch<HospitalProfileResponse>(BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hospital-profile"] }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /hospital/profile/logo
// ─────────────────────────────────────────────────────────────────────────────

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation<{ message: string; logo: string }, Error, File>({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("logo", file);
      return apiFetch<{ message: string; logo: string }>(`${BASE}/logo`, {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hospital-profile"] }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /hospital/profile/image  (cover image)
// ─────────────────────────────────────────────────────────────────────────────

export function useUploadCoverImage() {
  const qc = useQueryClient();
  return useMutation<{ message: string; image: string }, Error, File>({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("image", file);
      return apiFetch<{ message: string; image: string }>(`${BASE}/image`, {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hospital-profile"] }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /hospital/images?type=...
// ─────────────────────────────────────────────────────────────────────────────

export function useGetHospitalImages(
  type?: "gallery" | "facility" | "team" | "other",
) {
  return useQuery<{ images: HospitalImage[] }>({
    queryKey: ["hospital-images", type ?? "all"],
    queryFn: () => {
      const url = type
        ? `${IMAGES_BASE}?type=${type}`
        : IMAGES_BASE;
      return apiFetch<{ images: HospitalImage[] }>(url);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /hospital/images  (upload up to 10 images)
// Payload: multipart — images[], captions[], type
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadImagesPayload {
  files: File[];
  captions?: string[];
  type?: "gallery" | "facility" | "team" | "other";
}

export interface UploadImagesResponse {
  message: string;
  uploaded: HospitalImage[];
  failed: Array<{ index: number; error: string }>;
}

export function useUploadHospitalImages() {
  const qc = useQueryClient();
  return useMutation<UploadImagesResponse, Error, UploadImagesPayload>({
    mutationFn: ({ files, captions = [], type = "gallery" }) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("images[]", f));
      captions.forEach((c) => fd.append("captions[]", c));
      fd.append("type", type);
      return apiFetch<UploadImagesResponse>(IMAGES_BASE, {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospital-images"] });
      qc.invalidateQueries({ queryKey: ["hospital-profile"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /hospital/images/{id}
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteHospitalImage() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, number>({
    mutationFn: (id) =>
      apiFetch<{ message: string }>(`${IMAGES_BASE}/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospital-images"] });
      qc.invalidateQueries({ queryKey: ["hospital-profile"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /hospital/images/bulk
// ─────────────────────────────────────────────────────────────────────────────

export interface BulkDeleteResponse {
  message: string;
  removed: number;
}

export function useDeleteHospitalImagesBulk() {
  const qc = useQueryClient();
  return useMutation<BulkDeleteResponse, Error, number[]>({
    mutationFn: (ids) =>
      apiFetch<BulkDeleteResponse>(`${IMAGES_BASE}/bulk`, {
        method: "DELETE",
        body: { ids },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospital-images"] });
      qc.invalidateQueries({ queryKey: ["hospital-profile"] });
    },
  });
}
