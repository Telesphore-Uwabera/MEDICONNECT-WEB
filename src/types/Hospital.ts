// ─── Department ───────────────────────────────────────────────────────────────

export interface Doctor {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface Service {
  id: number;
  department_id: number;
  name_en: string;
  name_fr: string | null;
  name_kiny: string | null;
  price: string;
  currency: string;
  price_type: "fixed" | "from" | "negotiable" | "free";
  type: "online" | "in_person" | "both";
  insurance_covered: boolean;
  duration_minutes: number | null;
  requires_appointment: boolean;
  requires_referral: boolean;
  preparation_instructions: string | null;
  code: string | null;
  max_bookings_per_day: number | null;
  is_available: boolean;
  department?: Department;
}

export interface Department {
  name: string;
  id: number;
  name_en: string;
  name_fr: string | null;
  name_kiny: string | null;
  description_en?: string | null;
  description_fr?: string | null;
  description_kiny?: string | null;
  floor: string | null;
  room_number: string | null;
  phone: string | null;
  email: string | null;
  icon: string | null;
  color_code: string | null;
  is_emergency: boolean;
  capacity: number | null;
  sort_order: number;
  is_active: boolean;
  services: Service[];
  doctors: Doctor[];
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface DepartmentPayload {
  name_en: string;
  name_fr?: string | null;
  name_kiny?: string | null;
  description_en?: string | null;
  description_fr?: string | null;
  description_kiny?: string | null;
  floor?: string | null;
  room_number?: string | null;
  phone?: string | null;
  email?: string | null;
  icon?: string | null;
  is_emergency?: boolean;
  head_doctor_id?: number | null;
  capacity?: number | null;
  sort_order?: number;
  color_code?: string | null;
}

export interface ServicePayload {
  department_id: number;
  name_en: string;
  name_fr?: string | null;
  name_kiny?: string | null;
  description_en?: string | null;
  description_fr?: string | null;
  description_kiny?: string | null;
  price?: number;
  currency?: string;
  price_type: "fixed" | "from" | "negotiable" | "free";
  type: "online" | "in_person" | "both";
  insurance_covered?: boolean;
  duration_minutes?: number | null;
  requires_appointment?: boolean;
  requires_referral?: boolean;
  preparation_instructions?: string | null;
  code?: string | null;
  max_bookings_per_day?: number | null;
  is_available?: boolean;
}

// ─── Filter / Query params ────────────────────────────────────────────────────

export interface DepartmentFilters {
  search?: string;
  is_emergency?: boolean;
  floor?: string;
  active_only?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}
