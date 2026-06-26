import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/doctor/wallet";

export interface DoctorWallet {
  balance?: string | number;
  last_topup?: string | null;
  last_withdrawn?: string | null;
  [key: string]: unknown;
}

export interface DoctorEarningsSummary {
  total_appointments?: number;
  total_earned?: string | number;
  average_per_appointment?: string | number;
  last_appointment_at?: string | null;
}

export interface DoctorEarningRow {
  id: number;
  doctor_id?: number;
  status?: string;
  consultation_fee?: string | number;
  completed_at?: string | null;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  current_page?: number;
  data: T[];
  per_page?: number;
  total?: number;
  last_page?: number;
  [key: string]: unknown;
}

export interface DoctorEarnings {
  summary?: DoctorEarningsSummary;
  breakdown?: PaginatedResponse<DoctorEarningRow>;
  [key: string]: unknown;
}

export interface DoctorWithdrawal {
  id: number;
  doctor_id?: number;
  amount: string | number;
  method: "bank_transfer" | "mobile_money" | string;
  account_number: string;
  account_name: string;
  status: string;
  note?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface WithdrawalPayload {
  amount: number;
  method: "bank_transfer" | "mobile_money" | string;
  account_number: string;
  account_name: string;
  note?: string;
}

export interface WithdrawalResponse {
  message?: string;
  withdrawal?: DoctorWithdrawal;
  new_balance?: string | number;
  [key: string]: unknown;
}

const unwrapWallet = (res: { wallet?: DoctorWallet } | DoctorWallet): DoctorWallet =>
  "wallet" in res && res.wallet ? res.wallet : res;

export function useDoctorWallet() {
  return useQuery({
    queryKey: ["doctor-wallet"],
    queryFn: () => apiFetch<{ wallet?: DoctorWallet } | DoctorWallet>(BASE).then(unwrapWallet),
    staleTime: 30_000,
  });
}

export function useDoctorWalletEarnings() {
  return useQuery({
    queryKey: ["doctor-wallet-earnings", 15],
    queryFn: () => apiFetch<DoctorEarnings>(`${BASE}/earnings?per_page=15`),
    staleTime: 30_000,
  });
}

export function useDoctorWithdrawals(perPage = 15) {
  return useQuery({
    queryKey: ["doctor-wallet-withdrawals", perPage],
    queryFn: () => apiFetch<PaginatedResponse<DoctorWithdrawal>>(`${BASE}/withdrawals?per_page=${perPage}`),
    staleTime: 30_000,
  });
}

export function useRequestDoctorWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WithdrawalPayload) =>
      apiFetch<WithdrawalResponse>(`${BASE}/withdraw`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-wallet"] });
      qc.invalidateQueries({ queryKey: ["doctor-wallet-earnings"] });
      qc.invalidateQueries({ queryKey: ["doctor-wallet-withdrawals"] });
    },
  });
}

export function useCancelDoctorWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<WithdrawalResponse>(`${BASE}/cancel-withdrawal/${id}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-wallet"] });
      qc.invalidateQueries({ queryKey: ["doctor-wallet-earnings"] });
      qc.invalidateQueries({ queryKey: ["doctor-wallet-withdrawals"] });
    },
  });
}
