// Local mock admin store: users, approval requests, moderation flags.
import { useSyncExternalStore } from "react";

export type AdminRole = "doctor" | "hospital" | "pharmacy" | "patient";
export type UserStatus = "active" | "pending" | "suspended" | "rejected";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  status: UserStatus;
  createdAt: number;
  meta?: Record<string, string>;
}

export interface ModerationItem {
  id: string;
  kind: "prescription" | "order" | "listing";
  subject: string;
  reportedBy: string;
  reason: string;
  status: "open" | "approved" | "removed";
  createdAt: number;
}

interface State {
  users: AdminUser[];
  moderation: ModerationItem[];
}

const seedUsers: AdminUser[] = [
  { id: "u1", name: "Dr. Elena Vance", email: "elena@kfh.rw", phone: "+250788111222", role: "doctor", status: "active", createdAt: Date.now() - 86400000 * 40, meta: { specialty: "Cardiology", hospital: "King Faisal Hospital" } },
  { id: "u2", name: "Dr. Marcus Thorne", email: "marcus@kmc.rw", phone: "+250788333444", role: "doctor", status: "pending", createdAt: Date.now() - 86400000 * 2, meta: { specialty: "General Practice", hospital: "Kigali Medical Center" } },
  { id: "u3", name: "Dr. Anya Sharma", email: "anya@rhc.rw", phone: "+250788555666", role: "doctor", status: "pending", createdAt: Date.now() - 86400000 * 1, meta: { specialty: "Dermatology", hospital: "Rwanda Health Clinic" } },
  { id: "u4", name: "King Faisal Hospital", email: "admin@kfh.rw", phone: "+250788001001", role: "hospital", status: "active", createdAt: Date.now() - 86400000 * 120, meta: { city: "Kigali", beds: "240" } },
  { id: "u5", name: "Bethesda Hospital", email: "info@bethesda.rw", phone: "+250788002002", role: "hospital", status: "pending", createdAt: Date.now() - 86400000 * 3, meta: { city: "Musanze", beds: "60" } },
  { id: "u6", name: "GreenCross Pharmacy", email: "ops@greencross.rw", phone: "+250788777888", role: "pharmacy", status: "active", createdAt: Date.now() - 86400000 * 60, meta: { city: "Kigali" } },
  { id: "u7", name: "MediPlus Pharmacy", email: "hello@mediplus.rw", phone: "+250788999000", role: "pharmacy", status: "pending", createdAt: Date.now() - 86400000 * 1, meta: { city: "Huye" } },
  { id: "u8", name: "John Mukasa", email: "john@mail.com", phone: "+250788121212", role: "patient", status: "active", createdAt: Date.now() - 86400000 * 14 },
  { id: "u9", name: "Sarah Uwase", email: "sarah@mail.com", phone: "+250788131313", role: "patient", status: "active", createdAt: Date.now() - 86400000 * 9 },
  { id: "u10", name: "David Niyonzima", email: "david@mail.com", phone: "+250788141414", role: "patient", status: "suspended", createdAt: Date.now() - 86400000 * 30 },
  { id: "u11", name: "Marie Iradukunda", email: "marie@mail.com", phone: "+250788151515", role: "patient", status: "active", createdAt: Date.now() - 86400000 * 5 },
];

const seedModeration: ModerationItem[] = [
  { id: "m1", kind: "prescription", subject: "Rx #p3 — Tretinoin 0.025%", reportedBy: "PharmacyBot", reason: "Dosage outside guideline range", status: "open", createdAt: Date.now() - 3600_000 * 4 },
  { id: "m2", kind: "order", subject: "Order #o1 — 2 items", reportedBy: "John Mukasa", reason: "Wrong item delivered", status: "open", createdAt: Date.now() - 3600_000 * 22 },
  { id: "m3", kind: "listing", subject: "Tretinoin Cream listing", reportedBy: "Auto-scan", reason: "Out of stock for 7+ days", status: "open", createdAt: Date.now() - 3600_000 * 50 },
];

const state: State = { users: seedUsers, moderation: seedModeration };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const setUserStatus = (id: string, status: UserStatus) => {
  state.users = state.users.map((u) => (u.id === id ? { ...u, status } : u));
  emit();
};

export const deleteUser = (id: string) => {
  state.users = state.users.filter((u) => u.id !== id);
  emit();
};

export const setModerationStatus = (id: string, status: ModerationItem["status"]) => {
  state.moderation = state.moderation.map((m) => (m.id === id ? { ...m, status } : m));
  emit();
};

export const useAdminUsers = () =>
  useSyncExternalStore(subscribe, () => state.users, () => state.users);

export const useAdminModeration = () =>
  useSyncExternalStore(subscribe, () => state.moderation, () => state.moderation);

export const adminStats = () => {
  const u = state.users;
  return {
    total: u.length,
    pending: u.filter((x) => x.status === "pending").length,
    active: u.filter((x) => x.status === "active").length,
    suspended: u.filter((x) => x.status === "suspended").length,
    byRole: {
      doctor: u.filter((x) => x.role === "doctor").length,
      hospital: u.filter((x) => x.role === "hospital").length,
      pharmacy: u.filter((x) => x.role === "pharmacy").length,
      patient: u.filter((x) => x.role === "patient").length,
    },
    openFlags: state.moderation.filter((m) => m.status === "open").length,
  };
};
