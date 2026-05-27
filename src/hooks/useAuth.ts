import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const AUTH_KEY = ["auth", "me"];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

const saveToken = (token: string) => localStorage.setItem("auth_token", token);
const clearToken = () => localStorage.removeItem("auth_token");

/* ─────────────────────────────────────────────
   useMe  →  GET /auth/me
───────────────────────────────────────────── */

export const useMe = () =>
  useQuery({
    queryKey: AUTH_KEY,
    queryFn: () => apiFetch<MeResponse>("/auth/me"),
    enabled: !!localStorage.getItem("auth_token"),
    select: (data) => data.user,
  });

/* ─────────────────────────────────────────────
   useRegister  →  POST /auth/register
───────────────────────────────────────────── */

export const useRegister = () =>
  useMutation({
    mutationFn: (payload: RegisterPayload) =>
      apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });

/* ─────────────────────────────────────────────
   useSendOtp  →  POST /auth/send-otp
───────────────────────────────────────────── */

export const useSendOtp = () =>
  useMutation({
    mutationFn: (payload: SendOtpPayload) =>
      apiFetch<SendOtpResponse>("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });

/* ─────────────────────────────────────────────
   useVerifyOtp  →  POST /auth/verify-otp
───────────────────────────────────────────── */

export const useVerifyOtp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) =>
      apiFetch<VerifyOtpResponse>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      saveToken(data.token);
      qc.setQueryData(AUTH_KEY, { user: data.user });
    },
  });
};

/* ─────────────────────────────────────────────
   useLogin  →  POST /auth/login
───────────────────────────────────────────── */

export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({

    mutationFn: (payload: LoginPayload) =>
      apiFetch<LoginResponse>("/auth/login", {
      
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      saveToken(data.token);
      qc.setQueryData(AUTH_KEY, { user: data.user });
    },
  });
};

/* ─────────────────────────────────────────────
   useLogout  →  POST /auth/logout
───────────────────────────────────────────── */

export const useLogout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/auth/logout", {
        method: "POST",
      }),
    onSuccess: () => {
      clearToken();
      qc.removeQueries({ queryKey: AUTH_KEY });
    },
  });
};

/* ─────────────────────────────────────────────
   useRefreshToken  →  POST /auth/refresh-token
───────────────────────────────────────────── */

export const useRefreshToken = () =>
  useMutation({
    mutationFn: () =>
      apiFetch<{ message: string; token: string }>("/auth/refresh-token", {
        method: "POST",
      }),
    onSuccess: (data) => saveToken(data.token),
  });

/* ─────────────────────────────────────────────
   useCreateGuest  →  POST /auth/guest
───────────────────────────────────────────── */

export const useCreateGuest = () =>
  useMutation({
    mutationFn: (payload: GuestPayload) =>
      apiFetch<GuestResponse>("/auth/guest", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) =>
      localStorage.setItem("guest_token", data.guest_token),
  });

/* ─────────────────────────────────────────────
   useConvertGuest  →  POST /auth/guest/convert
───────────────────────────────────────────── */

export const useConvertGuest = () =>
  useMutation({
    mutationFn: (payload: ConvertGuestPayload) =>
      apiFetch<ConvertGuestResponse>("/auth/guest/convert", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
