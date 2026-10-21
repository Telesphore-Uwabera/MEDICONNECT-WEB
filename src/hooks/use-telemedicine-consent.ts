import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { TELEMEDICINE_CONSENT_VERSION } from "@/lib/telemedicine-consent";

export interface TelemedicineConsentRecord {
  id: number;
  form_version: string;
  method: string;
  patient_consented_at?: string | null;
  doctor_confirmed_at?: string | null;
  emergency_override?: boolean;
}

export function useRecordPatientTelemedicineConsent() {
  return useMutation({
    mutationFn: (payload: {
      appointment_id?: number | null;
      instant_consultation_id?: number | null;
      representative_name?: string;
      representative_relationship?: string;
      emergency_override?: boolean;
    }) =>
      apiFetch<{ message: string; consent: TelemedicineConsentRecord }>("/patient/telemedicine-consent", {
        method: "POST",
        body: { form_version: TELEMEDICINE_CONSENT_VERSION, method: "platform", ...payload },
      }),
  });
}

export function useConfirmDoctorTelemedicineConsent() {
  return useMutation({
    mutationFn: (payload: {
      patient_id: number;
      appointment_id?: number | null;
      instant_consultation_id?: number | null;
    }) =>
      apiFetch<{ message: string; consent: TelemedicineConsentRecord }>(
        "/doctor/telemedicine-consent/confirm",
        { method: "POST", body: payload },
      ),
  });
}
