import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface HospitalService {
  id: number | string;
  department_id: string | number;
  name_en: string;
  name_fr?: string | null;
  description_en?: string | null;
  price?: string | number | null;
  currency?: string | null;
  price_type?: string | null;
  type?: string | null;
  insurance_covered?: boolean;
  duration_minutes?: number | null;
  requires_appointment?: boolean;
  is_available?: boolean;
  is_active?: boolean;
  // removed: hospital_id (not in API response)
}

export interface Department {
  id: number | string;
  hospital_id?: string;
  name_en: string;
  name_fr?: string | null;
  description_en?: string | null;
  floor?: string | null;
  room_number?: string | null;
  phone?: string | null;
  icon?: string;
  is_emergency?: boolean;
  is_active?: boolean;
  services?: HospitalService[]; // ← nested here, confirmed by API
}

export interface HospitalDetail {
  id: number | string;
  slug?: string;
  name_en: string;
  name_fr?: string | null;
  city?: string | null;
  logo?: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
  is_open_24h?: boolean;
  departments?: Department[];   // ← services live inside each dept
  // removed: services?: HospitalService[]  ← no top-level services in API
  working_days?: WorkingDay[];  // ← confirmed key from API
}

/**
 * Backend stores this as "working_hours" — each record is a weekly day schedule
 * (one row per day_of_week).
 */
export interface WorkingDay {
  id: number;
  hospital_id?: string;
  /** lowercase full day name: "monday", "tuesday" ... "sunday" */
  day_of_week: string;
  open_time: string | null;   // "HH:MM:SS" or null → falls back to hospital opens_at
  close_time: string | null;  // "HH:MM:SS" or null → falls back to hospital closes_at
  is_closed: boolean;
  max_patients: string | number | null;
  is_active: boolean;
}



/** Shape expected by POST /patient/service-bookings */
export interface BookingPayload {
  hospital_id:         number | string;
  hospital_service_id: number | string;
  department_id:       number | string;
  preferred_date:      string;   // YYYY-MM-DD
  preferred_time:      string;   // HH:MM
  notes?:              string;
}

/** A selectable calendar date falling on an open working day */
export interface DateSlot {
  date:        string;   // YYYY-MM-DD
  displayDate: Date;
  dayLabel:    string;   // "Mon", "Tue" ...
  openTime:    string;   // HH:MM
  closeTime:   string;   // HH:MM
  maxPatients: number;
}

/** Weekly open/closed status for a single day — used for the schedule overview */
export interface WeekDayStatus {
  dayName:   string;         // "Monday" ... "Sunday"
  shortName: string;         // "Mon" ... "Sun"
  is_closed: boolean;
  is_active: boolean;
  openTime:  string | null;
  closeTime: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Day-name constants
// ─────────────────────────────────────────────────────────────────────────────
const DAY_ORDER = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

const DAY_SHORT: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const DAY_FULL: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a sorted, display-ready weekly schedule from the working_hours array.
 * Always returns all 7 days in Mon-Sun order; days missing from the API response
 * are treated as closed.
 */
export function buildWeekSchedule(workingDays: WorkingDay[]): WeekDayStatus[] {
  return DAY_ORDER.map((key) => {
    const row = workingDays.find((w) => w.day_of_week === key);
    return {
      dayName:   DAY_FULL[key],
      shortName: DAY_SHORT[key],
      is_closed: row ? row.is_closed : true,
      is_active: row ? row.is_active : false,
      openTime:  row?.open_time  ? row.open_time.slice(0, 5)  : null,
      closeTime: row?.close_time ? row.close_time.slice(0, 5) : null,
    };
  });
}

/**
 * Scans the next 14 calendar days and returns those that fall on an open
 * working day (is_closed = false && is_active = true).
 *
 * open_time / close_time fall back to the hospital's opens_at / closes_at
 * when the day row has null times.
 */
export function buildDateSlots(
  workingDays: WorkingDay[],
  hospitalOpensAt?: string | null,
  hospitalClosesAt?: string | null
): DateSlot[] {
  const openDays = workingDays.filter((w) => !w.is_closed && w.is_active);
  if (!openDays.length) return [];

  const fallbackOpen  = hospitalOpensAt  ? hospitalOpensAt.slice(0, 5)  : "08:00";
  const fallbackClose = hospitalClosesAt ? hospitalClosesAt.slice(0, 5) : "17:00";

  const slots: DateSlot[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const dayKey = d
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase(); // "monday", "tuesday" ...

    const row = openDays.find((w) => w.day_of_week === dayKey);
    if (!row) continue;

    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");

    slots.push({
      date:        `${yyyy}-${mm}-${dd}`,
      displayDate: d,
      dayLabel:    DAY_SHORT[dayKey] ?? dayKey,
      openTime:    row.open_time  ? row.open_time.slice(0, 5)  : fallbackOpen,
      closeTime:   row.close_time ? row.close_time.slice(0, 5) : fallbackClose,
      maxPatients: Number(row.max_patients ?? 40),
    });
  }
  return slots;
}

/** Build 30-minute time slots between open and close */
export function buildTimeSlots(openTime: string, closeTime: string): string[] {
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  const startMin = oh * 60 + om;
  const endMin   = ch * 60 + cm;
  const result: string[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    result.push(`${hh}:${mm}`);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// API response envelope
// ─────────────────────────────────────────────────────────────────────────────
interface HospitalDetailResponse {
  hospital: HospitalDetail;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useHospitalDetail(slug: string | undefined) {
  return useQuery<HospitalDetail>({
    queryKey: ["hospital-detail", slug],
    queryFn: () =>
      apiFetch<HospitalDetailResponse>(`/public/hospitals/${slug}`).then(
        (res) => res.hospital
      ),
    enabled: !!slug,
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: (payload: BookingPayload) =>
      apiFetch<unknown>("/patient/service-bookings", {
        method: "POST",
        body:   payload,
      }),
  });
}
