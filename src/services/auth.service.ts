import { apiFetch } from "@/lib/api";
import type {
  RegisterPayload, RegisterResponse,
  SendOtpPayload, SendOtpResponse,
  VerifyOtpPayload, VerifyOtpResponse,
  LoginPayload, LoginResponse,
  MeResponse,
  GuestPayload, GuestResponse,
  ConvertGuestPayload, ConvertGuestResponse,
} from "@/types/auth";

export const authService = {
  register: (payload: RegisterPayload) =>
    apiFetch<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  sendOtp: (payload: SendOtpPayload) =>
    apiFetch<SendOtpResponse>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  verifyOtp: (payload: VerifyOtpPayload) =>
    apiFetch<VerifyOtpResponse>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  me: () =>
    apiFetch<MeResponse>("/auth/me"),

  logout: () =>
    apiFetch<{ message: string }>("/auth/logout", {
      method: "POST",
    }),

  refreshToken: () =>
    apiFetch<{ message: string; token: string }>("/auth/refresh-token", {
      method: "POST",
    }),

  createGuest: (payload: GuestPayload) =>
    apiFetch<GuestResponse>("/auth/guest", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  convertGuest: (payload: ConvertGuestPayload) =>
    apiFetch<ConvertGuestResponse>("/auth/guest/convert", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  socialRedirect: (provider: "google" | "facebook") =>
    `${import.meta.env.VITE_APP_BASE_URL}/auth/social/${provider}/redirect`,
};
