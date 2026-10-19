import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Referral } from "@/hooks/doctor/use-doctor-referrals";

const BASE = "/patient/referrals";

export function useGetPatientReferrals() {
  return useQuery({
    queryKey: ["patient-referrals"],
    queryFn: async () => {
      const res = await apiFetch<{ referrals?: Referral[]; data?: Referral[] }>(BASE);
      const referrals = Array.isArray(res.referrals)
        ? res.referrals
        : Array.isArray(res.data)
          ? res.data
          : [];
      return { referrals };
    },
    staleTime: 30_000,
  });
}
