// Lightweight in-memory schedule + bookings store shared between Doctor & Patient pages.
import { useSyncExternalStore } from "react";
import { addDays, format } from "date-fns";

export type SlotStatus = "available" | "booked" | "blocked" | "reserved";
export interface Slot {
  time: string; // "HH:mm"
  status: SlotStatus;
}
export interface DaySchedule {
  date: string; // "yyyy-MM-dd"
  slots: Slot[];
}
export interface DoctorSchedule {
  doctorId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  interval: number; // minutes
  days: DaySchedule[];
}

export interface BookedAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string; // "yyyy-MM-dd"
  time: string; // "HH:mm"
  createdAt: number;
}

interface State {
  schedules: Record<string, DoctorSchedule>;
  bookings: BookedAppointment[];
}

const state: State = { schedules: {}, bookings: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const generateSchedule = (
  doctorId: string,
  startDate: Date,
  endDate: Date,
  startTime: string,
  endTime: string,
  interval: number,
): DoctorSchedule => {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  const days: DaySchedule[] = [];
  let d = new Date(startDate);
  while (d <= endDate) {
    const slots: Slot[] = [];
    for (let m = startMin; m + interval <= endMin; m += interval) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const time = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      // Random pre-existing bookings for realism (only for new generation)
      const r = Math.random();
      const status: SlotStatus =
        r < 0.7 ? "available" : r < 0.88 ? "booked" : r < 0.96 ? "reserved" : "blocked";
      slots.push({ time, status });
    }
    days.push({ date: format(d, "yyyy-MM-dd"), slots });
    d = addDays(d, 1);
  }

  return {
    doctorId,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    startTime,
    endTime,
    interval,
    days,
  };
};

export const setSchedule = (schedule: DoctorSchedule) => {
  state.schedules[schedule.doctorId] = schedule;
  emit();
};

export const getSchedule = (doctorId: string): DoctorSchedule | undefined =>
  state.schedules[doctorId];

export const bookSlot = (
  doctorId: string,
  doctorName: string,
  specialty: string,
  date: string,
  time: string,
): BookedAppointment | null => {
  const sched = state.schedules[doctorId];
  if (!sched) return null;
  const day = sched.days.find((d) => d.date === date);
  if (!day) return null;
  const slot = day.slots.find((s) => s.time === time);
  if (!slot || slot.status !== "available") return null;
  slot.status = "booked";
  const appt: BookedAppointment = {
    id: `b-${Date.now()}`,
    doctorId,
    doctorName,
    specialty,
    date,
    time,
    createdAt: Date.now(),
  };
  state.bookings.unshift(appt);
  emit();
  return appt;
};

export const useSchedule = (doctorId: string) =>
  useSyncExternalStore(
    subscribe,
    () => state.schedules[doctorId],
    () => state.schedules[doctorId],
  );

export const useBookings = () =>
  useSyncExternalStore(
    subscribe,
    () => state.bookings,
    () => state.bookings,
  );

// Seed a default schedule for every doctor so patients can immediately try booking.
import { doctors } from "./mock-data";
const today = new Date();
today.setHours(0, 0, 0, 0);
doctors.forEach((doc) => {
  if (!state.schedules[doc.id]) {
    state.schedules[doc.id] = generateSchedule(
      doc.id,
      today,
      addDays(today, 6),
      "08:00",
      "17:00",
      30,
    );
  }
});
