import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/doctor/wallet";

export interface DoctorWallet {
  id?: number;
  doctor_id?: number;
  balance?: string | number;
  available_balance?: string | number;
  pending_balance?: string | number;
  total_earned?: string | number;
  total_withdrawn?: string | number;
  currency?: string;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface DoctorEarnings {
  total?: string | number;
  data?: unknown[];
  [key: string]: unknown;
}

export interface WithdrawalPayload {
  amount: number;
  method: string;
  account_number: string;
  account_name: string;
  note?: string;
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
    queryKey: ["doctor-wallet-earnings"],
    queryFn: () => apiFetch<DoctorEarnings>(`${BASE}/earnings`),
    staleTime: 30_000,
  });
}

export function useRequestDoctorWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WithdrawalPayload) =>
      apiFetch(`${BASE}/withdraw`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-wallet"] });
      qc.invalidateQueries({ queryKey: ["doctor-wallet-earnings"] });
    },
  });
}

export function useCancelDoctorWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/cancel-withdrawal/${id}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-wallet"] });
      qc.invalidateQueries({ queryKey: ["doctor-wallet-earnings"] });
    },
  });
}
