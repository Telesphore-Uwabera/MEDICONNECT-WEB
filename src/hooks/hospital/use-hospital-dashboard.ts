import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/hospital/dashboard";


/* ─────────────────────────────────────────────
   useGetHospitalStats  →  GET /hospital/dashboard
───────────────────────────────────────────── */

export function useGetHospitalStats() {
  return useQuery({
    queryKey: ["hospital-stats"],
    queryFn: () =>
      apiFetch(BASE).then((stats) => {
        console.log("Hospital stats fetched:", stats);
        return stats;
      }),
  });
}
