import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const DOCTORS_BASE = "/admin/wallets/doctors";
const MAIN_BASE = "/admin/wallets/main";
const PAYOUTS_BASE = "/admin/payouts";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DoctorUser {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface DoctorNested {
  id: number;
  user_id: number;
  slug: string;
  specialization: string;
  currency: string;
  user: DoctorUser;
}

export interface DoctorWallet {
  id: number;
  doctor_id: number;
  balance: string;
  currency: string;
  last_withdrawn: string | null;
  last_topup: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  doctor: DoctorNested;
  // computed helpers
  doctor_name: string;
  doctor_email: string;
}

export interface MainWallet {
  id: number;
  balance: string;
  currency: string;
  last_withdrawn: string | null;
  last_topup: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: number;
  doctor_id: number;
  admin_id: number;
  amount: string;
  status: "pending" | "completed" | "failed" | "refunded";
  payment_method: string;
  payment_reference: string | null;
  note: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  doctor: DoctorNested;
  admin: { id: number; name: string; email: string };
  // computed helper
  doctor_name: string;
}

export interface Transaction {
  id: number;
  wallet_id: number;
  type: "credit" | "debit";
  amount: string;
  balance_after: string;
  description: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

export interface TopUpPayload {
  amount: number;
  note?: string;
}

export interface DeductPayload {
  amount: number;
  note?: string;
}

export interface CreatePayoutPayload {
  doctor_id: number;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  note?: string;
}

export interface RefundPayload {
  reason: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   NORMALIZERS
   ═══════════════════════════════════════════════════════════════════════════ */

type RawDoctorWallet = Omit<DoctorWallet, "doctor_name" | "doctor_email">;
type RawPayout = Omit<Payout, "doctor_name">;

function normalizeWallet(raw: RawDoctorWallet): DoctorWallet {
  return {
    ...raw,
    currency: raw.doctor?.currency ?? "RWF",
    doctor_name: raw.doctor?.user?.name ?? "—",
    doctor_email: raw.doctor?.user?.email ?? "—",
  };
}

function normalizePayout(raw: RawPayout): Payout {
  return {
    ...raw,
    doctor_name: raw.doctor?.user?.name ?? "—",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOCTOR WALLETS
   ═══════════════════════════════════════════════════════════════════════════ */

export function useGetDoctorWallets(search?: string, page = 1) {
  const queryString = search
    ? `?search=${encodeURIComponent(search)}&page=${page}`
    : `?page=${page}`;

  return useQuery<PaginatedResponse<DoctorWallet>>({
    queryKey: ["admin-wallets-doctors", search ?? "", page],
    queryFn: async () => {
      const res = await apiFetch<PaginatedResponse<RawDoctorWallet>>(
        `${DOCTORS_BASE}${queryString}`
      );
      return { ...res, data: res.data.map(normalizeWallet) };
    },
  });
}

export function useGetDoctorWallet(id: number | null) {
  return useQuery<DoctorWallet>({
    queryKey: ["admin-wallet-doctor", id],
    queryFn: async () => {
      const raw = await apiFetch<RawDoctorWallet>(`${DOCTORS_BASE}/${id}`);
      return normalizeWallet(raw);
    },
    enabled: !!id,
  });
}

export function useTopUpDoctorWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TopUpPayload }) =>
      apiFetch(`${DOCTORS_BASE}/${id}/topup`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wallets-doctors"] });
      qc.invalidateQueries({ queryKey: ["admin-wallet-doctor"] });
      qc.invalidateQueries({ queryKey: ["admin-wallet-main"] });
    },
  });
}

export function useDeductDoctorWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DeductPayload }) =>
      apiFetch(`${DOCTORS_BASE}/${id}/deduct`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wallets-doctors"] });
      qc.invalidateQueries({ queryKey: ["admin-wallet-doctor"] });
      qc.invalidateQueries({ queryKey: ["admin-wallet-main"] });
    },
  });
}

export function useDeleteDoctorWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${DOCTORS_BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wallets-doctors"] });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN WALLET
   ═══════════════════════════════════════════════════════════════════════════ */

export function useGetMainWallet() {
  return useQuery<MainWallet>({
    queryKey: ["admin-wallet-main"],
    queryFn: async () => {
      const res = await apiFetch<{ wallet: MainWallet }>(MAIN_BASE);
      return { ...res.wallet, currency: res.wallet.currency ?? "RWF" };
    },
  });
}

export function useTopUpMainWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TopUpPayload) =>
      apiFetch(`${MAIN_BASE}/topup`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wallet-main"] });
    },
  });
}

export function useDeductMainWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeductPayload) =>
      apiFetch(`${MAIN_BASE}/deduct`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wallet-main"] });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAYOUTS
   ═══════════════════════════════════════════════════════════════════════════ */

export function useGetPayouts(status?: string, doctorId?: number, page = 1) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (doctorId) params.append("doctor_id", String(doctorId));
  params.append("page", String(page));

  return useQuery<PaginatedResponse<Payout>>({
    queryKey: ["admin-payouts", status ?? "", doctorId ?? "", page],
    queryFn: async () => {
      const res = await apiFetch<PaginatedResponse<RawPayout>>(
        `${PAYOUTS_BASE}?${params.toString()}`
      );
      return { ...res, data: res.data.map(normalizePayout) };
    },
  });
}

export function useGetPayout(id: number | null) {
  return useQuery<Payout>({
    queryKey: ["admin-payout", id],
    queryFn: async () => {
      const raw = await apiFetch<RawPayout>(`${PAYOUTS_BASE}/${id}`);
      return normalizePayout(raw);
    },
    enabled: !!id,
  });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePayoutPayload) =>
      apiFetch(PAYOUTS_BASE, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      qc.invalidateQueries({ queryKey: ["admin-wallets-doctors"] });
      qc.invalidateQueries({ queryKey: ["admin-wallet-main"] });
    },
  });
}

export function useRefundPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RefundPayload }) =>
      apiFetch(`${PAYOUTS_BASE}/${id}/refund`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      qc.invalidateQueries({ queryKey: ["admin-wallets-doctors"] });
      qc.invalidateQueries({ queryKey: ["admin-wallet-main"] });
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSACTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

export function useGetTransactions(doctorId?: number, type?: "credit" | "debit", page = 1) {
  const params = new URLSearchParams();
  if (doctorId) params.append("doctor_id", String(doctorId));
  if (type) params.append("type", type);
  params.append("page", String(page));

  return useQuery<PaginatedResponse<Transaction>>({
    queryKey: ["admin-transactions", doctorId ?? "", type ?? "", page],
    queryFn: () =>
      apiFetch<PaginatedResponse<Transaction>>(
        `${PAYOUTS_BASE}/transactions?${params.toString()}`
      ),
  });
}
