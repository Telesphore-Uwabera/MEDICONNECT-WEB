

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/public/doctors/";

/* ─────────────────────────────────────────────
   useGetDoctorAvailability  →  GET /public/doctors/{slug}/availability
───────────────────────────────────────────── */

export function useGetDoctorAvailability(slug: string) {
  return useQuery({
    queryKey: ["doctor-availability", slug],
    queryFn: () =>
      apiFetch(`${BASE}${slug}/availability`).then((availability) => {
        console.log("Doctor availability fetched:", availability);
        return availability;
      }),
  });
}
