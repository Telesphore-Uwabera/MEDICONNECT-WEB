// Shared hospital service-schedule store. Keyed by hospital name (matches Doctor.hospital).
import { useSyncExternalStore } from "react";
import { addDays, format } from "date-fns";

export interface HospitalDayConfig {
  date: string;
  capacity: number;
  active: boolean;
  booked: number;
}

export interface HospitalSchedule {
  hospital: string;
  startDate: string;
  endDate: string;
  days: HospitalDayConfig[];
}

interface State {
  schedules: Record<string, HospitalSchedule>;
}

const state: State = { schedules: {} };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const setHospitalSchedule = (schedule: HospitalSchedule) => {
  state.schedules[schedule.hospital] = schedule;
  emit();
};

export const updateHospitalDay = (
  hospital: string,
  date: string,
  patch: Partial<HospitalDayConfig>,
) => {
  const sched = state.schedules[hospital];
  if (!sched) return;
  sched.days = sched.days.map((d) => (d.date === date ? { ...d, ...patch } : d));
  state.schedules[hospital] = { ...sched };
  emit();
};

export const getHospitalSchedule = (hospital: string): HospitalSchedule | undefined =>
  state.schedules[hospital];

export const getHospitalDay = (
  hospital: string,
  date: string,
): HospitalDayConfig | undefined => state.schedules[hospital]?.days.find((d) => d.date === date);

/** Returns null if booking is allowed; otherwise a rejection reason. */
export const checkHospitalAvailability = (
  hospital: string,
  date: string,
): { ok: true } | { ok: false; reason: string } => {
  const sched = state.schedules[hospital];
  if (!sched) return { ok: true }; // no hospital schedule configured → unrestricted
  const day = sched.days.find((d) => d.date === date);
  if (!day) return { ok: true }; // outside configured period → unrestricted
  if (!day.active) return { ok: false, reason: "Hospital is closed on this day" };
  if (day.booked >= day.capacity)
    return { ok: false, reason: "Hospital daily capacity reached" };
  return { ok: true };
};

/** Increment booked count for a hospital day. Returns false if not allowed. */
export const incrementHospitalBooked = (hospital: string, date: string): boolean => {
  const sched = state.schedules[hospital];
  if (!sched) return true;
  const day = sched.days.find((d) => d.date === date);
  if (!day) return true;
  if (!day.active || day.booked >= day.capacity) return false;
  day.booked += 1;
  state.schedules[hospital] = { ...sched, days: [...sched.days] };
  emit();
  return true;
};

export const useHospitalSchedule = (hospital: string) =>
  useSyncExternalStore(
    subscribe,
    () => state.schedules[hospital],
    () => state.schedules[hospital],
  );

// ---------- Hospital directory + patient-side bookings ----------

export interface HospitalService {
  id: string;
  name: string;
  department: string;
}

export interface HospitalInfo {
  name: string;
  city: string;
  address: string;
  specialties: string[];
  rating: number;
  beds: number;
  image: string; 
  services: HospitalService[];
  verified?: boolean;   // add
  emergency?: boolean;  // add
  doctors?: number;  
   type?: string;   // add
}

const commonServices: HospitalService[] = [
  { id: "gen-consult", name: "General consultation", department: "General Practice" },
  { id: "lab", name: "Laboratory tests", department: "Diagnostics" },
  { id: "imaging", name: "Imaging / X-Ray", department: "Radiology" },
];

export const hospitals: HospitalInfo[] = [
  {
    name: "King Faisal Hospital",
    city: "Kigali",
    address: "KG 544 St, Kacyiru",
    specialties: ["Cardiology", "Pediatrics", "Surgery"],
    rating: 4.9,
    beds: 240,
    image: "KF",
    services: [
      ...commonServices,
      { id: "cardio", name: "Cardiology consultation", department: "Cardiology" },
      { id: "peds", name: "Pediatric check-up", department: "Pediatrics" },
      { id: "surg", name: "Surgical consultation", department: "Surgery" },
    ],
  },
  {
    name: "Kigali Medical Center",
    city: "Kigali",
    address: "KN 3 Ave, Nyarugenge",
    specialties: ["General Practice", "Neurology", "Maternity"],
    rating: 4.7,
    beds: 180,
    image: "KM",
    services: [
      ...commonServices,
      { id: "neuro", name: "Neurology consultation", department: "Neurology" },
      { id: "matern", name: "Maternity check-up", department: "Maternity" },
      { id: "vacc", name: "Vaccination", department: "General Practice" },
    ],
  },
  {
    name: "Rwanda Health Clinic",
    city: "Kigali",
    address: "KK 15 Rd, Kicukiro",
    specialties: ["Dermatology", "Orthopedics", "Diagnostics"],
    rating: 4.6,
    beds: 95,
    image: "RH",
    services: [
      ...commonServices,
      { id: "derm", name: "Dermatology consultation", department: "Dermatology" },
      { id: "ortho", name: "Orthopedic consultation", department: "Orthopedics" },
      { id: "physio", name: "Physiotherapy session", department: "Rehabilitation" },
    ],
  },
];

export interface HospitalBooking {
  id: string;
  hospital: string;
  date: string; // yyyy-MM-dd
  reason: string;
  serviceId?: string;
  serviceName?: string;
  department?: string;
  createdAt: number;
}

const hospitalBookings: HospitalBooking[] = [];

export const bookHospitalSpot = (
  hospital: string,
  date: string,
  reason: string,
  service?: HospitalService,
): HospitalBooking | { error: string } => {
  const check = checkHospitalAvailability(hospital, date);
  if (check.ok === false) return { error: check.reason };
  const ok = incrementHospitalBooked(hospital, date);
  if (!ok) return { error: "Slot no longer available" };
  const b: HospitalBooking = {
    id: `hb-${Date.now()}`,
    hospital,
    date,
    reason,
    serviceId: service?.id,
    serviceName: service?.name,
    department: service?.department,
    createdAt: Date.now(),
  };
  hospitalBookings.unshift(b);
  emit();
  return b;
};

export const useHospitalBookings = () =>
  useSyncExternalStore(
    subscribe,
    () => hospitalBookings,
    () => hospitalBookings,
  );

export const useAllHospitalSchedules = () =>
  useSyncExternalStore(
    subscribe,
    () => state.schedules,
    () => state.schedules,
  );

// Seed default 14-day schedule for every hospital so patients can book immediately.
const _today = new Date();
_today.setHours(0, 0, 0, 0);
hospitals.forEach((h) => {
  if (state.schedules[h.name]) return;
  const days: HospitalDayConfig[] = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(_today, i);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const cap = isWeekend ? 20 : 40;
    days.push({
      date: format(d, "yyyy-MM-dd"),
      capacity: cap,
      active: !isWeekend,
      booked: Math.floor(Math.random() * Math.floor(cap * 0.5)),
    });
  }
  state.schedules[h.name] = {
    hospital: h.name,
    startDate: format(_today, "yyyy-MM-dd"),
    endDate: format(addDays(_today, 13), "yyyy-MM-dd"),
    days,
  };
});
