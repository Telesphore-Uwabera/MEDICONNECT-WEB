export type Role = "patient" | "doctor" | "admin";
export type OtpType = "register" | "login" | "reset";

export interface User {
  id: number;
  name: string;
  email?: string;
  phone: string;
  country_code: string;
  avatar: string | null;
  role: Role;
  is_verified: boolean;
  status: string;
  preferred_language: string;
}

// ── Register ──────────────────────────────────────────
export interface RegisterPayload {
  name: string;
  phone: string;
  country_code: string;
  role: Role;
  email?: string;
  password: string;
  password_confirmation: string;
  accepted_terms: boolean;
}

export interface RegisterResponse {
  message: string;
  user_id: number;
}

// ── OTP ───────────────────────────────────────────────
export interface SendOtpPayload {
  type: OtpType;
  phone?: string;
  country_code?: string;
  email?: string;
}

export interface SendOtpResponse {
  message: string;
}

export interface VerifyOtpPayload {
  code: string;
  type: OtpType;
  phone?: string;
  country_code?: string;
  email?: string;
}

export interface VerifyOtpResponse {
  message: string;
  token: string;
  user: User;
}

// ── Login ─────────────────────────────────────────────
export type LoginPayload =
  | { phone: string; country_code: string; auth_method: "otp" }
  | { phone: string; country_code: string; auth_method: "password"; password: string }
  | { email: string; auth_method: "password"; password: string };

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

// ── Me ────────────────────────────────────────────────
export interface MeResponse {
  user: User;
}

// ── Guest ─────────────────────────────────────────────
export interface GuestPayload {
  phone: string;
  country_code: string;
  name: string;
}

export interface GuestResponse {
  message: string;
  guest_token: string;
  expires_at: string;
}

export interface ConvertGuestPayload {
  guest_token: string;
  name: string;
  phone: string;
  country_code: string;
  role: Role;
  email?: string;
}

export interface ConvertGuestResponse {
  message: string;
  user_id: number;
}
