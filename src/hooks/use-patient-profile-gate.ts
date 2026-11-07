import { useGetProfile } from "@/hooks/use-patient-profile";
import { useMe } from "@/hooks/useAuth";
import { getAuthToken } from "@/lib/auth-session";
import { isPatientRecordComplete } from "@/lib/patient-profile-complete";

/** True while a signed-in patient still has to finish the profile form. */
export function usePatientProfileLocked() {
  const hasToken = Boolean(getAuthToken());
  const me = useMe();
  const user = me.data;
  const role = user?.active_role ?? user?.role;
  const isPatient = hasToken && role === "patient";
  const flag = user?.profile_complete;
  const needsLookup = isPatient && me.isFetched && !me.isLoading && flag == null;
  const profile = useGetProfile(needsLookup);

  if (!isPatient) return { locked: false, pending: false };
  if (me.isLoading || !me.isFetched) return { locked: false, pending: true };
  if (String(user?.email || "").endsWith("@mediconnect.local")) return { locked: false, pending: false };
  if (flag === true) return { locked: false, pending: false };
  if (flag === false) return { locked: true, pending: false };
  if (!profile.isFetched) return { locked: false, pending: true };
  if (profile.isError) {
    const status = (profile.error as { status?: number })?.status;
    return { locked: status === 404, pending: false };
  }
  return {
    locked: !isPatientRecordComplete(profile.data as Record<string, unknown> | null),
    pending: false,
  };
}
