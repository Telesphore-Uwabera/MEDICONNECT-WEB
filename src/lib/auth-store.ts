// Mock auth + profile store. Phone OTP (any 6 digits) or password. localStorage backed.
import { useSyncExternalStore } from "react";

export type Role = "doctor" | "hospital" | "pharmacy" | "patient" | "admin";


export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  role: Role;
  password?: string; // mock only
  profileComplete: boolean;
  profile?: Record<string, unknown>;
  createdAt: number;
}

interface AuthState {
  users: AuthUser[];
  currentUserId: string | null;
  pendingOtp: { userId: string; code: string } | null;
}

const STORAGE_KEY = "mc_auth_v1";

const load = (): AuthState => {
  if (typeof window === "undefined") return { users: [], currentUserId: null, pendingOtp: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    console.error("Failed to load auth state");
  }
  return { users: [], currentUserId: null, pendingOtp: null };
};

let state: AuthState = load();
const listeners = new Set<() => void>();
const persist = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {
    console.error("Failed to persist auth state");
  }
};
const emit = () => { persist(); listeners.forEach((l) => l()); };

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

export const useAuth = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const currentUser = (): AuthUser | null =>
  state.users.find((u) => u.id === state.currentUserId) ?? null;

export const findByPhone = (phone: string) =>
  state.users.find((u) => u.phone.replace(/\s/g, "") === phone.replace(/\s/g, "")) ?? null;

export const findByEmail = (email: string) =>
  state.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;

export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  role: Role;
  password: string;
}

export const signup = (input: SignupInput): AuthUser => {
  if (findByEmail(input.email)) throw new Error("auth.errors.email_exists");
  if (findByPhone(input.phone)) throw new Error("auth.errors.phone_exists");
  const user: AuthUser = {
    id: `u_${Date.now().toString(36)}`,
    ...input,
    profileComplete: false,
    createdAt: Date.now(),
  };
  state = { ...state, users: [...state.users, user], currentUserId: user.id };
  emit();
  return user;
};

export const loginPassword = (identifier: string, password: string): AuthUser => {
  const user = findByEmail(identifier) ?? findByPhone(identifier);
  if (!user || user.password !== password) throw new Error("auth.errors.invalid_credentials");
  state = { ...state, currentUserId: user.id };
  emit();
  return user;
};

// OTP: generate a 6-digit code (mock — also accept any 6-digit input)
export const requestOtp = (phone: string): { code: string } => {
  const user = findByPhone(phone);
  if (!user) throw new Error("auth.errors.phone_not_found");
  const code = String(Math.floor(100000 + Math.random() * 900000));
  state = { ...state, pendingOtp: { userId: user.id, code } };
  emit();
  return { code };
};

export const verifyOtp = (phone: string, code: string): AuthUser => {
  const user = findByPhone(phone);
  if (!user) throw new Error("auth.errors.phone_not_found");
  if (!/^\d{6}$/.test(code)) throw new Error("auth.errors.invalid_otp");
  // Mock: accept either generated code or any 6-digit
  state = { ...state, currentUserId: user.id, pendingOtp: null };
  emit();
  return user;
};

export const logout = () => {
  state = { ...state, currentUserId: null };
  emit();
};

export const updateProfile = (userId: string, profile: Record<string, unknown>, complete = true) => {
  state = {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, profile: { ...u.profile, ...profile }, profileComplete: complete || u.profileComplete } : u)),
  };
  emit();
};


export const dashboardPath = (role: Role): string =>
  role === "patient"  ? "/patient"
  : role === "doctor"   ? "/doctor"
  : role === "hospital" ? "/hospital"
  : role === "pharmacy" ? "/pharmacy/overview"
  : role === "admin"    ? "/admin"
  : "/";



