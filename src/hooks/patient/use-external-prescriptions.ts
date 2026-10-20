import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface ExternalPrescription {
  id: number;
  patient_id: number;
  pharmacy_id?: number | null;
  file_url: string;
  notes?: string | null;
  status: string;
  fulfillment_status?: string | null;
  fulfillment_method?: string | null;
  created_at?: string;
}

const keys = {
  patient: ["patient-external-prescriptions"] as const,
  pharmacy: ["pharmacy-external-prescriptions"] as const,
};

export function usePatientExternalPrescriptions() {
  return useQuery({
    queryKey: keys.patient,
    queryFn: async () => {
      const res = await apiFetch<{ prescriptions?: ExternalPrescription[]; data?: ExternalPrescription[] }>(
        "/patient/external-prescriptions",
      );
      return Array.isArray(res.prescriptions) ? res.prescriptions : Array.isArray(res.data) ? res.data : [];
    },
  });
}

export function usePharmacyExternalPrescriptions() {
  return useQuery({
    queryKey: keys.pharmacy,
    queryFn: async () => {
      const res = await apiFetch<{ prescriptions?: ExternalPrescription[]; data?: ExternalPrescription[] }>(
        "/pharmacy/external-prescriptions",
      );
      return Array.isArray(res.prescriptions) ? res.prescriptions : Array.isArray(res.data) ? res.data : [];
    },
  });
}

export function useUploadExternalPrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, notes }: { file: File; notes?: string }) => {
      const body = new FormData();
      body.append("file", file);
      if (notes) body.append("notes", notes);
      return apiFetch("/patient/external-prescriptions", { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.patient });
    },
  });
}

export function usePharmacyExternalAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      fulfillment_status,
      fulfillment_method,
    }: {
      id: number;
      action: "claim" | "fulfill";
      fulfillment_status?: string;
      fulfillment_method?: string;
    }) =>
      apiFetch(`/pharmacy/external-prescriptions/${id}/${action}`, {
        method: "POST",
        body: { fulfillment_status, fulfillment_method },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.pharmacy });
    },
  });
}
