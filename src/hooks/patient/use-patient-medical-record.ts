import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  MedicalRecord,
  PatientVisit,
  PatientFile,
  VisitType,
  FileType,
} from "@/hooks/doctor/use-doctor-patient-record";

const is404 = (e: unknown) => (e as { status?: number })?.status === 404;

/** GET /patient/my-record — null if no record has been created yet (incl. 404). */
export function useMyMedicalRecord() {
  return useQuery({
    queryKey: ["my-record"],
    retry: false,
    queryFn: async () => {
      try {
        const res = await apiFetch<{ record?: MedicalRecord | null } | MedicalRecord | null>(
          "/patient/my-record",
        );
        return ((res as any)?.record ?? res ?? null) as MedicalRecord | null;
      } catch (e) {
        if (is404(e)) return null; // no record yet
        throw e;
      }
    },
  });
}

/** GET /patient/my-visits?visit_type=… — empty list if none (incl. 404). */
export function useMyVisits(visitType?: VisitType) {
  return useQuery({
    queryKey: ["my-visits", visitType ?? "all"],
    retry: false,
    queryFn: async () => {
      const qs = visitType ? `?visit_type=${visitType}` : "";
      try {
        const res = await apiFetch<{ data?: PatientVisit[] } | PatientVisit[]>(`/patient/my-visits${qs}`);
        return Array.isArray(res) ? res : (res?.data ?? []);
      } catch (e) {
        if (is404(e)) return [];
        throw e;
      }
    },
  });
}

/** GET /patient/my-files?file_type=… — empty list if none (incl. 404). */
export function useMyFiles(fileType?: FileType) {
  return useQuery({
    queryKey: ["my-files", fileType ?? "all"],
    retry: false,
    queryFn: async () => {
      const qs = fileType ? `?file_type=${fileType}` : "";
      try {
        const res = await apiFetch<{ data?: PatientFile[] } | PatientFile[]>(`/patient/my-files${qs}`);
        return Array.isArray(res) ? res : (res?.data ?? []);
      } catch (e) {
        if (is404(e)) return [];
        throw e;
      }
    },
  });
}
