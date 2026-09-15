import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/hospital/working-hours";

/* ─────────────────────────────────────────────
useGetHospitalWorkingHours  →  GET /hospital/working-hours
───────────────────────────────────────────── */

export function useGetHospitalWorkingHours() {
  return useQuery({
    queryKey: ["hospital-working-hours"],
    queryFn: () =>
      apiFetch(BASE).then((workingHours) => {
        console.log("Hospital working hours fetched:", workingHours);
        return workingHours;
      }),
});

}
