import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { listFrom } from "@/lib/list-payload";

export interface PatientBill {
  id?: number;
  uuid?: string;
  invoice_number?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface PatientBillsPage {
  data?: PatientBill[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export function usePatientBills(page = 1, perPage = 10) {
  return useQuery({
    queryKey: ["patient-bills", page, perPage],
    queryFn: () =>
      apiFetch<PatientBillsPage>(`/patient/bills?page=${page}&per_page=${perPage}`),
  });
}

export function billsFrom(payload?: PatientBillsPage | PatientBill[]) {
  return listFrom<PatientBill>(payload);
}
