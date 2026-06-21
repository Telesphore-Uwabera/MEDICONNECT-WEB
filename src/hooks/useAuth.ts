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

const saveToken = (token: string) => localStorage.setItem("auth_token", token);
const clearToken = () => localStorage.removeItem("auth_token");


export const useMe = () =>
  useQuery({
    queryKey: AUTH_KEY,
    queryFn: () => apiFetch<MeResponse>("/auth/me"),
    enabled: !!localStorage.getItem("auth_token"),
    select: (data) => data.user,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

export const useRegister = () =>
  useMutation({
    mutationFn: (payload: RegisterPayload) =>
      apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: payload,
      }),
  });

export const useSendOtp = () =>
  useMutation({
    mutationFn: (payload: SendOtpPayload) =>
      apiFetch<SendOtpResponse>("/auth/send-otp", {
        method: "POST",
        body: payload,
      }),
  });

export const useVerifyOtp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) =>
      apiFetch<VerifyOtpResponse>("/auth/verify-otp", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      saveToken(data.token);
      qc.setQueryData(AUTH_KEY, { user: data.user });
      qc.invalidateQueries({ queryKey: AUTH_KEY });
    },
  });
};

export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      saveToken(data.token);
      qc.setQueryData(AUTH_KEY, { user: data.user });
      qc.invalidateQueries({ queryKey: AUTH_KEY });
    },
  });
};

// export const useLogout = () => {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: () =>
//       apiFetch<{ message: string }>("/auth/logout", { method: "POST" }),
//     onSuccess: () => {
//       clearToken();
//       qc.removeQueries({ queryKey: AUTH_KEY });
//     },
//   });
// };
export const useLogout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/auth/logout", { method: "POST" }),
    onSettled: () => {
      localStorage.clear();
      qc.removeQueries({ queryKey: AUTH_KEY });
    },
  });
};

export const useRefreshToken = () =>
  useMutation({
    mutationFn: () =>
      apiFetch<{ message: string; token: string }>("/auth/refresh-token", {
        method: "POST",
      }),
    onSuccess: (data) => saveToken(data.token),
  });

export const useCreateGuest = () =>
  useMutation({
    mutationFn: (payload: GuestPayload) =>
      apiFetch<GuestResponse>("/auth/guest", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) =>
      localStorage.setItem("guest_token", data.guest_token),
  });

export const useConvertGuest = () =>
  useMutation({
    mutationFn: (payload: ConvertGuestPayload) =>
      apiFetch<ConvertGuestResponse>("/auth/guest/convert", {
        method: "POST",
        body: payload,
      }),
  });

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (payload: { email: string }) =>
      apiFetch<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: payload,
      }),
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: (payload: {
      email: string;
      otp: string;
      password: string;
      password_confirmation: string;
    }) =>
      apiFetch<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: payload,
      }),
  });
