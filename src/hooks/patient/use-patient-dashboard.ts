import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/patient/dashboard";


/* ─────────────────────────────────────────────
   useGetPatientStats  →  GET /patient/dashboard
───────────────────────────────────────────── */

export function useGetPatientStats() {
  return useQuery({
    queryKey: ["patient-stats"],
    queryFn: () =>
      apiFetch(BASE).then((stats) => {
        console.log("Patient stats fetched:", stats);
        return stats;
      }),
  });
}
