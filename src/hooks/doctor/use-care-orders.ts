import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type CareOrderType =
  | "lab"
  | "imaging"
  | "procedure"
  | "nursing"
  | "admission"
  | "follow_up"
  | "rehab"
  | "vaccination"
  | "home_care"
  | "pharmacy_packet"
  | "facility_packet";

export interface CareOrder {
  id: number;
  order_type: CareOrderType | string;
  status: string;
  urgency?: string;
  title?: string;
  patient_code?: string | null;
  clinical_notes?: string | null;
  doctor_message?: string | null;
  result_notes?: string | null;
  protocol?: string[];
  items?: string[];
  snapshot?: Record<string, unknown>;
  hospital_id?: number | null;
  pharmacy_id?: number | null;
  patient_id?: number;
  parent_order_id?: number | null;
  created_at?: string;
  episode_id?: number | null;
  review_status?: string | null;
  reviewed_at?: string | null;
  doctor_interpretation?: string | null;
  management_decision?: string | null;
  handover_status?: string | null;
  result_file_url?: string | null;
  result_files?: Array<{ url: string; name?: string }>;
}

export interface CreateCareOrderPayload {
  patient_id: number;
  appointment_id?: number;
  instant_consultation_id?: number;
  order_type: CareOrderType;
  hospital_id?: number;
  pharmacy_id?: number;
  title?: string;
  clinical_notes?: string;
  doctor_message?: string;
  protocol?: string[];
  parent_order_id?: number;
  diagnosis?: string;
  chief_complaint?: string;
  hospital_results?: string;
  urgency?: string;
  items: string[];
}

export const careOrderKeys = {
  all: (scope: string) => [`${scope}-care-orders`] as const,
};

export function useGetCareOrders(scope: "doctor" | "patient" | "hospital" | "pharmacy") {
  return useQuery({
    queryKey: careOrderKeys.all(scope),
    queryFn: async () => {
      const res = await apiFetch<{ orders?: CareOrder[]; data?: CareOrder[] }>(`/${scope}/care-orders`);
      return Array.isArray(res.orders) ? res.orders : Array.isArray(res.data) ? res.data : [];
    },
  });
}

export function useCareOrderAction(scope: "hospital" | "pharmacy" | "doctor") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      care_order_id,
      patient_code,
      action,
      result_notes,
      handover_status,
      files,
    }: {
      id?: number;
      care_order_id?: number | string;
      patient_code?: string | null;
      action: "accept" | "complete" | "reject";
      result_notes?: string;
      handover_status?: string;
      files?: File[];
    }) => {
      const careOrderId = care_order_id ?? id ?? patient_code;
      if (careOrderId == null || careOrderId === "") {
        return Promise.reject(new Error("This care packet has no ID."));
      }
      const url = `/${scope}/care-orders/${encodeURIComponent(String(careOrderId))}/${action}`;
      if (files?.length) {
        const body = new FormData();
        if (result_notes) body.append("result_notes", result_notes);
        if (handover_status) body.append("handover_status", handover_status);
        files.forEach((file) => body.append("files", file));
        return apiFetch(url, { method: "POST", body });
      }
      return apiFetch(url, {
        method: "POST",
        body: { result_notes, handover_status },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careOrderKeys.all(scope) });
      qc.invalidateQueries({ queryKey: careOrderKeys.all("doctor") });
      qc.invalidateQueries({ queryKey: careOrderKeys.all("patient") });
    },
  });
}

export function useReviewCareOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      interpretation,
      management_decision,
    }: {
      id: number | string;
      interpretation: string;
      management_decision: string;
    }) =>
      apiFetch(`/${"doctor"}/care-orders/${encodeURIComponent(String(id))}/review`, {
        method: "POST",
        body: { interpretation, management_decision },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careOrderKeys.all("doctor") });
      qc.invalidateQueries({ queryKey: careOrderKeys.all("patient") });
      qc.invalidateQueries({ queryKey: ["doctor-episodes"] });
    },
  });
}

export function useHandoverCareOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, handover_status }: { id: number | string; handover_status: string }) =>
      apiFetch(`/doctor/care-orders/${encodeURIComponent(String(id))}/handover`, {
        method: "POST",
        body: { handover_status },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careOrderKeys.all("doctor") });
      qc.invalidateQueries({ queryKey: careOrderKeys.all("hospital") });
      qc.invalidateQueries({ queryKey: careOrderKeys.all("patient") });
      qc.invalidateQueries({ queryKey: ["doctor-episodes"] });
    },
  });
}

export function useCreateCareOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCareOrderPayload) =>
      apiFetch<{ message: string; order: CareOrder }>("/doctor/care-orders", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-care-orders"] });
      qc.invalidateQueries({ queryKey: ["patient-care-orders"] });
      qc.invalidateQueries({ queryKey: ["hospital-care-orders"] });
      qc.invalidateQueries({ queryKey: ["pharmacy-care-orders"] });
    },
  });
}
