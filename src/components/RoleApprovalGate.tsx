import { useMemo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRightLeft,
  Loader2,
  RefreshCw,
  UserCog,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/hooks/useAuth";
import { useGoToRole, type GoRole } from "@/hooks/useRoleManagement";

type AppRole = "patient" | "doctor" | "hospital" | "pharmacy" | "admin";
type GuardedRole = Extract<AppRole, "doctor" | "hospital" | "pharmacy">;

type RoleAccessState = {
  status: string | null;
  isApproved: boolean;
  profileExists: boolean;
};

type ApiErrorInfo = {
  status?: number;
  message: string;
};

const ROLE_PROFILE_PATH: Record<GuardedRole, string> = {
  doctor: "/doctor/profile",
  hospital: "/hospital/profile",
  pharmacy: "/pharmacy/profile",
};

const ROLE_PROFILE_ENDPOINT: Record<GuardedRole, string> = {
  doctor: "/doctor/profile",
  hospital: "/hospital/profile",
  pharmacy: "/pharmacy/profile",
};

const ROLE_LABEL_KEY: Record<GuardedRole, string> = {
  doctor: "sidebar.doctor",
  hospital: "sidebar.hospital",
  pharmacy: "sidebar.pharmacy",
};

const GUARDED_ROLES: GuardedRole[] = [
  "doctor",
  "hospital",
  "pharmacy",
];

const APPROVED_STATUSES = new Set([
  "active",
  "approved",
  "verified",
]);

function isGuardedRole(role: AppRole): role is GuardedRole {
  return GUARDED_ROLES.includes(role as GuardedRole);
}

/**
 * Supports common API response shapes:
 *
 * { hospital: {...} }
 * { data: { hospital: {...} } }
 * { data: {...profile} }
 * {...profile}
 */
function extractRoleProfile(
  role: GuardedRole,
  payload: unknown,
): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const outer = payload as Record<string, unknown>;
  const data =
    outer.data && typeof outer.data === "object"
      ? (outer.data as Record<string, unknown>)
      : outer;

  const roleProfile = data[role];

  if (roleProfile && typeof roleProfile === "object") {
    return roleProfile as Record<string, unknown>;
  }

  const genericProfile = data.profile;

  if (genericProfile && typeof genericProfile === "object") {
    return genericProfile as Record<string, unknown>;
  }

  return data;
}

function getProfileStatus(
  role: GuardedRole,
  payload: unknown,
): RoleAccessState {
  const profile = extractRoleProfile(role, payload);

  if (!profile) {
    return {
      status: null,
      isApproved: false,
      profileExists: false,
    };
  }

  const rawStatus =
    profile.status ??
    profile.approval_status ??
    profile.verification_status ??
    null;

  const status =
    rawStatus == null
      ? null
      : String(rawStatus).trim().toLowerCase() || null;

  /*
   * Status is the approval source of truth.
   * A valid profile may return status="active" and is_active=false,
   * so is_active must not override an approved status.
   */
  const approvedByStatus =
    status !== null && APPROVED_STATUSES.has(status);

  /* Use is_active only when the API has no approval/status field. */
  const approvedByActiveFlag =
    status === null && profile.is_active === true;

  return {
    status,
    isApproved: approvedByStatus || approvedByActiveFlag,
    profileExists: true,
  };
}

function getApiErrorInfo(error: unknown): ApiErrorInfo {
  if (!error || typeof error !== "object") {
    return {
      status: undefined,
      message: error instanceof Error ? error.message : "",
    };
  }

  const candidate = error as {
    status?: number;
    message?: string;
    response?:
      | string
      | {
          status?: number;
          message?: string;
          error?: string;
        };
  };

  const responseStatus =
    candidate.response && typeof candidate.response === "object"
      ? candidate.response.status
      : undefined;

  let message = candidate.message ?? "";

  if (typeof candidate.response === "string") {
    message = candidate.response;
  } else if (
    candidate.response &&
    typeof candidate.response === "object"
  ) {
    message =
      candidate.response.message ??
      candidate.response.error ??
      message;
  }

  return {
    status: candidate.status ?? responseStatus,
    message: String(message ?? ""),
  };
}

function getSwitchBackRole(
  activeRole: string | undefined,
  availableRoles: string[] | undefined,
): GoRole | null {
  const previous = localStorage.getItem(
    "mediconnect.previous_role",
  ) as GoRole | null;

  const available = availableRoles ?? [];

  if (
    previous &&
    previous !== activeRole &&
    (previous === "admin" || available.includes(previous))
  ) {
    return previous;
  }

  const fallback = [
    "patient",
    "hospital",
    "doctor",
    "pharmacy",
    "admin",
  ].find(
    (candidateRole) =>
      candidateRole !== activeRole &&
      (candidateRole === "admin" || available.includes(candidateRole)),
  ) as GoRole | undefined;

  return fallback ?? null;
}

export function RoleApprovalGate({
  role,
  children,
}: {
  role: AppRole;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    data: user,
    isLoading: isLoadingUser,
  } = useMe();

  const {
    go,
    isPending: switchingRole,
  } = useGoToRole();

  const guardedRole = isGuardedRole(role) ? role : null;

  const profilePath = guardedRole
    ? ROLE_PROFILE_PATH[guardedRole]
    : null;

  const isProfilePage =
    !!profilePath && location.pathname.startsWith(profilePath);

  const shouldProtectRoute =
    guardedRole !== null && !isProfilePage;

  const activeUserRole =
    user?.active_role ?? user?.role ?? undefined;

  /*
   * During role switching the route may update before /me contains the
   * newly active role. Avoid calling the wrong profile endpoint until both
   * values agree.
   */
  const roleContextReady =
    guardedRole === null ||
    !activeUserRole ||
    activeUserRole === guardedRole;

  const shouldCheckProfile =
    shouldProtectRoute &&
    roleContextReady &&
    !switchingRole &&
    !isLoadingUser;

  const accessQuery = useQuery({
    queryKey: [
      "role-access-profile",
      user?.id ?? "anonymous",
      activeUserRole ?? "unknown-role",
      guardedRole ?? "unguarded",
    ],

    queryFn: async () => {
      if (!guardedRole) {
        throw new Error("A guarded role is required.");
      }

      const payload = await apiFetch(
        ROLE_PROFILE_ENDPOINT[guardedRole],
      );

      return getProfileStatus(guardedRole, payload);
    },

    enabled: shouldCheckProfile,
    retry: false,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const accessState = accessQuery.data;
  const apiError = getApiErrorInfo(accessQuery.error);

  const normalizedErrorMessage =
    apiError.message.trim().toUpperCase();

  const isProFeatureOnly =
    apiError.status === 404 &&
    normalizedErrorMessage.includes("PRO FEATURE ONLY");

  const isMissingProfile =
    accessQuery.isError &&
    apiError.status === 404 &&
    !isProFeatureOnly;

  const isUnexpectedError =
    accessQuery.isError &&
    !isMissingProfile &&
    !isProFeatureOnly;

  const isCheckingAccess =
    shouldProtectRoute &&
    (
      isLoadingUser ||
      switchingRole ||
      !roleContextReady ||
      (shouldCheckProfile && accessQuery.isPending)
    );

  const roleLabel = guardedRole
    ? t(ROLE_LABEL_KEY[guardedRole])
    : "";

  const switchBackRole = useMemo(
    () =>
      getSwitchBackRole(
        activeUserRole,
        user?.available_roles,
      ),
    [activeUserRole, user?.available_roles],
  );

  if (!shouldProtectRoute) {
    return <>{children}</>;
  }

  if (isCheckingAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-sm ">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t("common.loading", { defaultValue: "Loading..." })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("common.checking_access", {
                  defaultValue: "Checking role access...",
                })}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-2.5 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-full animate-pulse rounded bg-muted/80" />
            <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted/70" />
          </div>
        </div>
      </div>
    );
  }
  /*
   * PRO FEATURE ONLY is not a missing-profile response, so never show the
   * complete-profile modal for this error.
   */
  if (isProFeatureOnly) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Dialog open>
          <DialogContent
            className="max-w-lg"
            onInteractOutside={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-[6px] border border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <DialogTitle>
                {t("common.feature_not_available", {
                  defaultValue: "Feature not available",
                })}
              </DialogTitle>

              <DialogDescription className="leading-relaxed">
                {t("common.pro_feature_required", {
                  role: roleLabel,
                  defaultValue:
                    "The server currently restricts the {{role}} profile check to a Pro feature. Your profile has not been marked as missing.",
                })}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-2">
              {switchBackRole && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void go(switchBackRole)}
                  disabled={switchingRole}
                  className="gap-2"
                >
                  {switchingRole ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4" />
                  )}

                  {t("common.switch_back", {
                    defaultValue: "Switch back",
                  })}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => void accessQuery.refetch()}
                disabled={accessQuery.isFetching}
                className="gap-2"
              >
                {accessQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}

                {t("common.try_again", {
                  defaultValue: "Try again",
                })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* Non-404 errors must not be displayed as incomplete profiles. */
  if (isUnexpectedError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Dialog open>
          <DialogContent
            className="max-w-lg"
            onInteractOutside={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-[6px] border border-destructive/30 bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <DialogTitle>
                {t("common.profile_check_failed", {
                  defaultValue: "Unable to verify profile access",
                })}
              </DialogTitle>

              <DialogDescription className="leading-relaxed">
                {apiError.message ||
                  t("common.profile_check_failed_desc", {
                    defaultValue:
                      "The profile could not be verified. Please try again.",
                  })}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-2">
              {switchBackRole && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void go(switchBackRole)}
                  disabled={switchingRole}
                  className="gap-2"
                >
                  <ArrowRightLeft className="h-4 w-4" />

                  {t("common.switch_back", {
                    defaultValue: "Switch back",
                  })}
                </Button>
              )}

              <Button
                type="button"
                onClick={() => void accessQuery.refetch()}
                disabled={accessQuery.isFetching}
                className="gap-2"
              >
                {accessQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}

                {t("common.try_again", {
                  defaultValue: "Try again",
                })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (accessState?.isApproved) {
    return <>{children}</>;
  }

  const profileExists =
    accessState?.profileExists ?? !isMissingProfile;

  const status = accessState?.status;

  const readableStatus = status
    ? t(`common.status_${status}`, {
        defaultValue: status,
      })
    : t("common.status_pending", {
        defaultValue: "pending",
      });

  const description =
    status === "rejected"
      ? t("common.role_access_rejected_desc", {
          role: roleLabel,
          defaultValue:
            "Your {{role}} profile was rejected. Please update your profile and submit it again for review.",
        })
      : profileExists
        ? t("common.role_access_pending_desc", {
            role: roleLabel,
            status: readableStatus,
            defaultValue:
              "Your {{role}} profile is currently {{status}}. You can use this workspace after the profile is approved.",
          })
        : t("common.role_access_missing_desc", {
            role: roleLabel,
            defaultValue:
              "You need to complete your {{role}} profile before this workspace can be reviewed and approved.",
          });

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Dialog open>
        <DialogContent
          className="max-w-lg"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-[6px] border border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <DialogTitle>
              {t("common.role_access_title", {
                role: roleLabel,
                defaultValue: "{{role}} profile approval required",
              })}
            </DialogTitle>

            <DialogDescription className="leading-relaxed">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[6px] border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
            {t("common.role_access_help", {
              defaultValue:
                "Open your profile, complete the required information, then wait for the admin team to approve it. Patient access does not require approval.",
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {switchBackRole && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void go(switchBackRole)}
                disabled={switchingRole}
                className="gap-2"
              >
                {switchingRole ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4" />
                )}

                {t("common.switch_back", {
                  defaultValue: "Switch back",
                })}
              </Button>
            )}

            <Button
              type="button"
              onClick={() => navigate(profilePath ?? "/")}
              className="gap-2"
            >
              <UserCog className="h-4 w-4" />

              {t("common.go_to_profile", {
                defaultValue: "Go to profile",
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
