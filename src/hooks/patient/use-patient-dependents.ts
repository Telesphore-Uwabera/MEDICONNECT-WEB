import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { listFrom } from "@/lib/list-payload";

export interface PatientDependent {
  id: number;
  full_name: string;
  relationship: string;
  date_of_birth?: string | null;
  phone?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface DependentPayload {
  full_name: string;
  relationship: string;
  date_of_birth?: string;
  phone?: string;
  notes?: string;
}

const KEY = ["patient-dependents"] as const;

export function usePatientDependents(page = 1, perPage = 10) {
  return useQuery({
    queryKey: [...KEY, page, perPage],
    queryFn: () =>
      apiFetch<{ data?: PatientDependent[]; total?: number; last_page?: number; current_page?: number }>(
        `/patient/dependents?page=${page}&per_page=${perPage}`,
      ),
  });
}

export function dependentsFrom(payload: unknown) {
  return listFrom<PatientDependent>(payload);
}

export function useSaveDependent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DependentPayload & { id?: number }) => {
      if (payload.id) {
        return apiFetch(`/patient/dependents/${payload.id}`, {
          method: "PUT",
          body: payload,
        });
      }
      return apiFetch("/patient/dependents", { method: "POST", body: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteDependent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/patient/dependents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
