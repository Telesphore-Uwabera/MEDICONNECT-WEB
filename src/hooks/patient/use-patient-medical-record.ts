import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";
import type {
  MedicalRecord,
  PatientVisit,
  PatientFile,
  VisitType,
  FileType,
} from "@/hooks/doctor/use-doctor-patient-record";

/** GET /patient/my-record — null if no record has been created yet. */
export function useMyMedicalRecord() {
  return useQuery({
    queryKey: ["my-record"],
    queryFn: async () => {
      const res = await apiFetch<{ record?: MedicalRecord | null } | MedicalRecord | null>(
        "/patient/my-record",
      );
      return ((res as any)?.record ?? res ?? null) as MedicalRecord | null;
    },
  });
}

/** GET /patient/my-visits?visit_type=… */
export function useMyVisits(visitType?: VisitType) {
  return useQuery({
    queryKey: ["my-visits", visitType ?? "all"],
    queryFn: async () => {
      const qs = visitType ? `?visit_type=${visitType}` : "";
      const res = await apiFetch<{ data?: PatientVisit[] } | PatientVisit[]>(`/patient/my-visits${qs}`);
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
  });
}

/** GET /patient/my-files?file_type=… */
export function useMyFiles(fileType?: FileType) {
  return useQuery({
    queryKey: ["my-files", fileType ?? "all"],
    queryFn: async () => {
      const qs = fileType ? `?file_type=${fileType}` : "";
      const res = await apiFetch<{ data?: PatientFile[] } | PatientFile[]>(`/patient/my-files${qs}`);
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
  });
}
