// Multi-role account management.
//   POST /auth/add-role     { role }  → add a role to the account
//   POST /auth/switch-role  { role }  → switch active role (returns a NEW token;
//                                       the old one is revoked)

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, type ApiError } from "@/lib/api";
import { useMe } from "@/hooks/useAuth";
import type { User, SwitchableRole } from "@/types/auth";

const AUTH_KEY = ["auth", "me"];

const ROLE_HOME: Record<string, string> = {
  patient: "/patient",
  doctor: "/doctor",
  hospital: "/hospital",
  pharmacy: "/pharmacy/overview",
};

export interface AddRoleResponse {
  message: string;
  available_roles: string[];
}

export interface SwitchRoleResponse {
  message: string;
  token: string;
  active_role: string;
  user: User;
}

/** POST /auth/add-role — grant the account an additional role. */
export function useAddRole() {
  const qc = useQueryClient();
  return useMutation<AddRoleResponse, ApiError, SwitchableRole>({
    mutationFn: (role) =>
      apiFetch<AddRoleResponse>("/auth/add-role", { method: "POST", body: { role } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTH_KEY });
    },
  });
}

/** POST /auth/switch-role — pure mutation; the caller decides what to do with
 *  the new token (the old one is revoked on success). */
export function useSwitchRole() {
  return useMutation<SwitchRoleResponse, ApiError, SwitchableRole>({
    mutationFn: (role) =>
      apiFetch<SwitchRoleResponse>("/auth/switch-role", { method: "POST", body: { role } }),
  });
}

export interface GoToRoleOptions {
  /** Stay on the current page (update the session in place) instead of
   *  reloading into the role's workspace. */
  stay?: boolean;
  /** Called after a successful `stay` switch — use it to resume what the user
   *  was doing (e.g. retry the booking). */
  onSwitched?: () => void;
}

/** One-shot "go to this role": adds it to the account if missing, then switches.
 *  By default it reloads into the role's home; pass `{ stay, onSwitched }` to
 *  switch in place and continue the current flow. */
export function useGoToRole() {
  const { data: user } = useMe();
  const qc = useQueryClient();
  const addRole = useAddRole();
  const switchRole = useSwitchRole();

  const go = async (role: SwitchableRole, opts?: GoToRoleOptions) => {
    try {
      const available = user?.available_roles ?? (user?.role ? [user.role] : []);

      if (!available.includes(role)) {
        try {
          await addRole.mutateAsync(role);
        } catch (e) {
          // 409 = already has it (race) → carry on to the switch.
          if ((e as ApiError)?.status !== 409) throw e;
        }
      }

      const res = await switchRole.mutateAsync(role);
      // Old token revoked — store the new one for all subsequent requests.
      localStorage.setItem("auth_token", res.token);

      if (opts?.stay) {
        // Update the cached session in place so the app sees the new role
        // without a reload, then resume the original action.
        qc.setQueryData(AUTH_KEY, { user: res.user });
        qc.invalidateQueries({ queryKey: AUTH_KEY });
        toast.success(res.message || `Switched to ${role}.`);
        opts.onSwitched?.();
      } else {
        // Full switch: reload into the role's workspace.
        toast.success(res.message || `Switching to ${role}…`);
        window.setTimeout(
          () => window.location.assign(ROLE_HOME[res.active_role] ?? "/"),
          400,
        );
      }
    } catch (e) {
      const err = e as ApiError;
      toast.error(
        err?.status === 403
          ? "You don't have this role yet."
          : err?.message || "Couldn't switch role.",
      );
    }
  };

  return { go, isPending: addRole.isPending || switchRole.isPending };
}

export { ROLE_HOME };
