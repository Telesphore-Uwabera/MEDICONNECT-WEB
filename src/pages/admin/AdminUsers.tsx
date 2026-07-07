import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast as sonnerToast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  ShieldOff,
  ShieldCheck,
  Users,
  Stethoscope,
  Building2,
  Pill,
  UserCircle,
  Clock,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  Calendar,
  Hash,
  RefreshCw,
  Globe,
  Pencil,
  Save,
  Plus,
  UserPlus,
  BriefcaseBusiness,
  Shield,
  KeyRound,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import {
  useGetAdminUsers,
  useSuspendUser,
  useActivateUser,
  useDeleteUser,
  useCreateAdminUser,
  useGetAdminStaff,
  useCreateStaff,
  useUpdateStaffRole,
  useSuspendStaff,
  useActivateStaff,
  useDeleteStaff,
  useAdminRoles,
  useAdminPermissions,
  useRolePermissions,
  useReplaceRolePermissions,
  useResetUserPassword,
  useRevokeUserSessions,
  useResendVerification,
  useResetStaffPassword,
  type ApiUser,
  type StaffUser,
  type CreateStaffPayload,
  type ResetUserCredentialsPayload,
} from "@/hooks/admin/use-admin-users";
import { useCreateManagedUser, type ManagedRole } from "@/hooks/admin/use-admin-manage-users";
import { ManageProfileModal } from "./components/manage-users/ManageProfileModal";
import {
  useApproveDoctor,
  useRejectDoctor,
  useSuspendDoctor,
  type ApiDoctor,
  type PaginatedDoctors,
} from "@/hooks/admin/use-admin-doctors";
import {
  useActivatePatient,
  useSuspendPatient,
  type ApiPatient,
  type PaginatedPatients,
} from "@/hooks/admin/use-admin-patients";
import {
  useApproveHospital,
  useRejectHospital,
  useSuspendHospital,
  type ApiHospital,
  type PaginatedHospitals,
} from "@/hooks/admin/use-admin-hospitals";
import {
  useApprovePharmacy,
  useRejectPharmacy,
  useSuspendPharmacy,
  type ApiPharmacy,
  type PaginatedPharmacies,
} from "@/hooks/admin/use-admin-pharmacies"; 
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { DoctorPanel } from "./components/doctor/DoctorPanel";
import { PatientPanel } from "./components/patients/PatientPanel";
import { HospitalPanel } from "./components/hospital/Hospitalpanel";
import { PharmacyPanel } from "./components/Pharmacy/components";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleFilter =
  | "all"
  | "doctor"
  | "hospital"
  | "pharmacy"
  | "patient"
  | "admin"
  | "staff"
  | "roles";
type StatusFilter = "all" | "active" | "pending" | "suspended" | "rejected";
type SortOption = "name" | "joined-desc" | "joined-asc" | "role";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "joined-desc", label: "Joined: Newest first" },
  { value: "joined-asc", label: "Joined: Oldest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "role", label: "Role (A–Z)" },
];

interface FilterState {
  search: string;
  role: RoleFilter;
  status: StatusFilter;
  sort: SortOption;
  page: number;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  role: "all",
  status: "all",
  sort: "joined-desc",
  page: 1,
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const data = "data" in error ? (error as { data?: unknown }).data : null;
    if (data && typeof data === "object") {
      const payload = data as {
        message?: unknown;
        errors?: Record<string, string[]> | string[];
      };
      if (payload.errors) {
        const flat = Array.isArray(payload.errors)
          ? payload.errors
          : Object.values(payload.errors).flat();
        if (flat.length > 0) return flat.join(" · ");
      }
      if (typeof payload.message === "string") return payload.message;
    }
  }

  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const statusStyle: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  suspended:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  rejected: "bg-muted text-muted-foreground border-border",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  suspended: "bg-red-500",
  rejected: "bg-muted-foreground",
};

const roleStyle: Record<string, string> = {
  doctor:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  hospital: "bg-primary/10 text-primary border-primary/20",
  pharmacy:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  patient: "bg-secondary text-foreground border-border",
  admin:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900",
};

const roleIcon: Record<string, React.ElementType> = {
  doctor: Stethoscope,
  hospital: Building2,
  pharmacy: Pill,
  patient: UserCircle,
  admin: ShieldCheck,
};

const USER_TABS: Array<{
  value: RoleFilter;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  { value: "all", label: "All users", description: "Every account", icon: Users },
  { value: "patient", label: "Patients", description: "Care seekers", icon: UserCircle },
  { value: "doctor", label: "Doctors", description: "Clinical users", icon: Stethoscope },
  { value: "hospital", label: "Facilities", description: "Hospitals", icon: Building2 },
  { value: "pharmacy", label: "Pharmacies", description: "Medicine providers", icon: Pill },
  { value: "admin", label: "Admins", description: "Back office", icon: ShieldCheck },
  { value: "staff", label: "Staff", description: "Operations users", icon: BriefcaseBusiness },
  { value: "roles", label: "Roles", description: "Permissions", icon: Shield },
];

function isRoleFilter(value: string | null): value is RoleFilter {
  return USER_TABS.some((tab) => tab.value === value);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRole(u: ApiUser): string {
  return u.roles?.[0]?.name ?? "patient";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function userSearchTerm(user: ApiUser | null) {
  if (!user) return "";
  return user.email || user.phone || user.name || String(user.id);
}

function queryString(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  });
  return qs.toString();
}

function sameUserId(candidate: { user_id?: number; user?: { id?: number } }, user: ApiUser | null) {
  if (!user) return false;
  return candidate.user_id === user.id || candidate.user?.id === user.id;
}



function UserRow({
  u,
  onManage,
  onEdit,
}: {
  u: ApiUser;
  onManage: (u: ApiUser) => void;
  onEdit: (u: ApiUser) => void;
}) {
  const { t, i18n } = useTranslation();
  const role = getRole(u);
  const Icon = roleIcon[role] ?? UserCircle;
  const canEdit = ["doctor", "patient", "hospital", "pharmacy"].includes(role);

  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {u.avatar ? (
            <img
              src={u.avatar}
              alt={u.name}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0 border border-border/40"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
              {getInitials(u.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">
              {u.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {u.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {u.phone}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-[6px] border font-medium",
            roleStyle[role],
          )}
        >
          <Icon className="h-3 w-3" />
          {t(`admin.roles.${role}`)}
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium capitalize",
            statusStyle[u.status],
          )}
        >
          <span
            className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[u.status])}
          />
          {t(`admin.status.${u.status}`)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {new Date(u.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
              onClick={() => onEdit(u)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onManage(u)}
          >
            {t("admin.users.manage")}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function UserCard({
  u,
  onManage,
  onEdit,
}: {
  u: ApiUser;
  onManage: (u: ApiUser) => void;
  onEdit: (u: ApiUser) => void;
}) {
  const { t, i18n } = useTranslation();
  const role = getRole(u);
  const Icon = roleIcon[role] ?? UserCircle;
  const canEdit = ["doctor", "patient", "hospital", "pharmacy"].includes(role);

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[6px] border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      {u.avatar ? (
        <img
          src={u.avatar}
          alt={u.name}
          className="h-9 w-9 rounded-full object-cover flex-shrink-0 mt-0.5 border border-border/40"
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
          {getInitials(u.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">
              {u.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {u.email}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
              statusStyle[u.status],
            )}
          >
            <span
              className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[u.status])}
            />
            {t(`admin.status.${u.status}`)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-[6px] border font-medium",
              roleStyle[role],
            )}
          >
            <Icon className="h-3 w-3" />
            {t(`admin.roles.${role}`)}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {u.phone}
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {new Date(u.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className={cn("mt-2.5 grid gap-2", canEdit ? "grid-cols-2" : "grid-cols-1")}>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
              onClick={() => onEdit(u)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onManage(u)}
          >
            {t("admin.users.manage")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{
                  width: j === 0 ? "140px" : j === 5 ? "60px" : "80px",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Right-side User Panel ────────────────────────────────────────────────────

function UserPanel({
  user,
  onClose,
  onToggleStatus,
  onDelete,
  isActing,
  isDeleting,
}: {
  user: ApiUser | null;
  onClose: () => void;
  onToggleStatus: (u: ApiUser) => void;
  onDelete: (u: ApiUser) => void;
  isActing: boolean;
  isDeleting: boolean;
}) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = !!user;

  // ── Credentials & sessions ──
  const resetPassword = useResetUserPassword();
  const revokeSessions = useRevokeUserSessions();
  const resendVerification = useResendVerification();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // ── Reset credentials form (email / phone / password — any combination) ──
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credPassword, setCredPassword] = useState("");
  const [credEmail, setCredEmail] = useState("");
  const [credPhone, setCredPhone] = useState("");
  const [credCountryCode, setCredCountryCode] = useState("+250");
  const [lastChanges, setLastChanges] = useState<string[] | null>(null);

  // Clear transient credential state when switching users / closing.
  useEffect(() => {
    setConfirmRevoke(false);
    setCredentialsOpen(false);
    setCredPassword("");
    setCredEmail("");
    setCredPhone("");
    setCredCountryCode("+250");
    setLastChanges(null);
  }, [user?.id]);

  const handleSaveCredentials = () => {
    if (!user) return;
    const payload: ResetUserCredentialsPayload = {};
    if (credPassword.trim()) payload.password = credPassword.trim();
    if (credEmail.trim()) payload.email = credEmail.trim();
    if (credPhone.trim()) {
      payload.phone = credPhone.trim();
      payload.country_code = credCountryCode.trim() || undefined;
    }
    if (Object.keys(payload).length === 0) {
      sonnerToast.error("Provide at least one of: email, phone, password.");
      return;
    }
    resetPassword.mutate(
      { id: user.id, payload },
      {
        onSuccess: (res) => {
          setLastChanges(res.changes ?? []);
          setCredentialsOpen(false);
          setCredPassword("");
          setCredEmail("");
          setCredPhone("");
          sonnerToast.success(res.message ?? "Credentials updated.");
        },
        onError: (error: unknown) =>
          sonnerToast.error("Could not update credentials.", { description: getErrorMessage(error) }),
      },
    );
  };

  const handleRevokeSessions = () => {
    if (!user) return;
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    setConfirmRevoke(false);
    revokeSessions.mutate(user.id, {
      onSuccess: (res) => sonnerToast.success(res.message ?? "All sessions revoked."),
      onError: (error: unknown) =>
        sonnerToast.error("Could not revoke sessions.", { description: getErrorMessage(error) }),
    });
  };

  const handleResend = (channel: "email" | "phone") => {
    if (!user) return;
    resendVerification.mutate(
      { id: user.id, channel },
      {
        onSuccess: (res) => sonnerToast.success(res.message ?? "Verification sent."),
        onError: (error: unknown) =>
          sonnerToast.error("Could not resend verification.", { description: getErrorMessage(error) }),
      },
    );
  };


  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const role = user ? getRole(user) : "";
  const RoleIcon = roleIcon[role] ?? UserCircle;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] lg:w-[440px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          "shadow-[−8px_0_32px_rgba(0,0,0,0.08)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {user && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  Manage user
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Review account details & update access
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-5 space-y-4">
                {/* ── Identity card ── */}
                <div className="rounded-[6px] border border-border/60 bg-secondary/20 overflow-hidden">
                  {/* Top accent strip using role color */}
                  <div
                    className={cn(
                      "h-1 w-full",
                      role === "doctor"
                        ? "bg-sky-400"
                        : role === "hospital"
                          ? "bg-primary"
                          : role === "pharmacy"
                            ? "bg-emerald-400"
                            : role === "admin"
                              ? "bg-purple-400"
                              : "bg-border",
                    )}
                  />

                  <div className="p-4 flex items-start gap-4">
                    {/* Avatar */}
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-16 w-16 rounded-full object-cover flex-shrink-0 border-2 border-background ring-1 ring-border/40"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0 border-2 border-background ring-1 ring-border/40">
                        {getInitials(user.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="font-semibold text-[15px] text-foreground leading-tight truncate">
                        {user.name}
                      </p>
                      <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                        {user.email}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                            roleStyle[role],
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {t(`admin.roles.${role}`)}
                        </span>

                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                            statusStyle[user.status],
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              STATUS_DOT[user.status],
                            )}
                          />
                          {t(`admin.status.${user.status}`)}
                        </span>

                        {user.is_verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium bg-secondary text-muted-foreground border-border/60">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Info grid ── */}
                <div className="grid grid-cols-2 gap-2.5">
                  <InfoTile
                    icon={<Phone className="w-3.5 h-3.5" />}
                    label="Contact"
                    value={`${user.country_code ?? ""} ${user.phone}`.trim()}
                  />
                  <InfoTile
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label="Joined"
                    value={new Date(user.created_at).toLocaleDateString()}
                  />
                  <InfoTile
                    icon={<Globe className="w-3.5 h-3.5" />}
                    label="Language"
                    value={
                      user.preferred_language === "en"
                        ? "English"
                        : (user.preferred_language ?? "—")
                    }
                  />
                  <InfoTile
                    icon={<Hash className="w-3.5 h-3.5" />}
                    label="User ID"
                    value={`#${user.id}`}
                  />
                </div>

                {/* ── Activity strip ── */}
                <div className="rounded-[6px] border border-border/60 bg-secondary/20 divide-y divide-border/40">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Phone verified
                    </span>
                    {user.phone_verified_at ? (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {new Date(user.phone_verified_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground/50">Not verified</span>
                        <button
                          onClick={() => handleResend("phone")}
                          disabled={resendVerification.isPending}
                          className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
                        >
                          Resend
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Email verified
                    </span>
                    {user.email_verified_at ? (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {new Date(user.email_verified_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground/50">Not verified</span>
                        <button
                          onClick={() => handleResend("email")}
                          disabled={resendVerification.isPending}
                          className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
                        >
                          Resend
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Security & credentials ── */}
                <div className="rounded-[6px] border border-border/60 bg-secondary/20 divide-y divide-border/40">
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5" />
                      Credentials
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-[10px] rounded-[6px] gap-1.5"
                      onClick={() => setCredentialsOpen((v) => !v)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {credentialsOpen ? "Cancel" : "Reset credentials"}
                    </Button>
                  </div>

                  {credentialsOpen && (
                    <div className="px-4 py-3 space-y-2.5">
                      <p className="text-[10px] text-muted-foreground/80">
                        Provide at least one field. Email/phone/password can be changed together or separately.
                      </p>
                      <label className="block space-y-1">
                        <span className="text-[10px] font-medium text-muted-foreground">New password</span>
                        <input
                          type="text"
                          value={credPassword}
                          onChange={(e) => setCredPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full h-8 rounded-[5px] border border-border bg-background px-2.5 text-[11px] outline-none focus:border-primary/50"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[10px] font-medium text-muted-foreground">Email</span>
                        <input
                          type="email"
                          value={credEmail}
                          onChange={(e) => setCredEmail(e.target.value)}
                          placeholder={user?.email}
                          className="w-full h-8 rounded-[5px] border border-border bg-background px-2.5 text-[11px] outline-none focus:border-primary/50"
                        />
                      </label>
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <label className="block space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground">Code</span>
                          <input
                            type="text"
                            value={credCountryCode}
                            onChange={(e) => setCredCountryCode(e.target.value)}
                            placeholder="+250"
                            className="w-full h-8 rounded-[5px] border border-border bg-background px-2.5 text-[11px] outline-none focus:border-primary/50"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground">Phone</span>
                          <input
                            type="text"
                            value={credPhone}
                            onChange={(e) => setCredPhone(e.target.value)}
                            placeholder={user?.phone}
                            className="w-full h-8 rounded-[5px] border border-border bg-background px-2.5 text-[11px] outline-none focus:border-primary/50"
                          />
                        </label>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 w-full text-[11px] rounded-[6px] gap-1.5"
                        disabled={resetPassword.isPending}
                        onClick={handleSaveCredentials}
                      >
                        {resetPassword.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <KeyRound className="h-3 w-3" />
                        )}
                        Save credentials
                      </Button>
                    </div>
                  )}

                  {lastChanges && lastChanges.length > 0 && (
                    <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="text-[10px] text-muted-foreground">Updated:</span>
                      {lastChanges.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 capitalize"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <LogOut className="w-3.5 h-3.5" />
                      Active sessions
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-7 px-2.5 text-[10px] rounded-[6px] gap-1.5",
                        confirmRevoke &&
                          "border-red-400 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400",
                      )}
                      disabled={revokeSessions.isPending}
                      onClick={handleRevokeSessions}
                    >
                      {revokeSessions.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <LogOut className="h-3 w-3" />
                      )}
                      {confirmRevoke ? "Confirm logout?" : "Force logout"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Footer actions ── */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-10 text-[12px] rounded-[6px] gap-2"
                  disabled={isActing}
                  onClick={() => onToggleStatus(user)}
                >
                  {isActing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : user.status === "active" ? (
                    <ShieldOff className="h-4 w-4" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {user.status === "active"
                    ? t("admin.users.suspend")
                    : t("admin.users.reactivate")}
                </Button>

                <Button
                  variant="outline"
                  className="h-10 text-[12px] rounded-[6px] gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                  disabled={isDeleting}
                  onClick={() => onDelete(user)}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {t("admin.users.delete")}
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full h-9 text-[12px] rounded-[6px] text-muted-foreground"
                onClick={onClose}
              >
                {t("admin.common.close")}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-[12px] outline-none focus:border-primary/50" />
    </label>
  );
}

function FormSelect({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <label className={cn("space-y-1", compact && "min-w-[180px]")}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-[12px] outline-none focus:border-primary/50">
        {options.map((option) => (
          <option key={option} value={option}>{option || "Select"}</option>
        ))}
      </select>
    </label>
  );
}

function PanelLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-[12px] text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function CreateUserModal({
  open,
  mode,
  defaultRole,
  onClose,
  onCreated,
}: {
  open: boolean;
  mode: "user" | "staff";
  defaultRole: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const createUser = useCreateAdminUser();
  const createManagedUser = useCreateManagedUser();
  const createStaff = useCreateStaff();
  const MANAGED_ROLES: string[] = ["doctor", "patient", "pharmacy", "hospital"];
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    country_code: "250",
    role: mode === "staff" ? "moderator" : defaultRole,
    gender: "",
    preferred_language: "en",
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      ...prev,
      role: mode === "staff" ? "moderator" : defaultRole,
      password: "",
      password_confirmation: "",
    }));
  }, [defaultRole, mode, open]);

  if (!open) return null;

  const setValue = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (mode === "user" && MANAGED_ROLES.includes(form.role) && form.password.length < 8) {
      sonnerToast.error("Password must be at least 8 characters.");
      return;
    }
    if (mode === "user" && MANAGED_ROLES.includes(form.role) && form.password !== form.password_confirmation) {
      sonnerToast.error("Passwords do not match.");
      return;
    }
    try {
      if (mode === "staff") {
        const res = await createStaff.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password,
          password_confirmation: form.password_confirmation,
          role: form.role as CreateStaffPayload["role"],
        });
        sonnerToast.success(res.message ?? "Staff user created.");
      } else if (MANAGED_ROLES.includes(form.role)) {
        // Doctor/patient/pharmacy/hospital go through the role-specific
        // create-user endpoint so a matching profile row is set up too.
        const res = await createManagedUser.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          country_code: form.country_code.trim() || "250",
          password: form.password,
          role: form.role as ManagedRole,
          gender: form.gender || undefined,
        });
        sonnerToast.success(res.message ?? "User created successfully.");
      } else {
        // Admin accounts have no role-specific profile — keep the generic path.
        const res = await createUser.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          country_code: form.country_code.trim() || undefined,
          role: form.role,
          gender: form.gender || undefined,
          preferred_language: form.preferred_language || undefined,
        });
        sonnerToast.success(res.message ?? "User created successfully.");
      }
      onCreated();
    } catch (error: unknown) {
      sonnerToast.error(mode === "staff" ? "Could not create staff." : "Could not create user.", {
        description: getErrorMessage(error),
      });
    }
  };

  const saving = createUser.isPending || createStaff.isPending || createManagedUser.isPending;
  const roles = mode === "staff" ? ["moderator", "finance", "help_desk"] : ["patient", "doctor", "hospital", "pharmacy", "admin"];

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
              {mode === "staff" ? <BriefcaseBusiness className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">{mode === "staff" ? "Create staff account" : "Create user account"}</p>
              <p className="text-[11px] text-muted-foreground">{mode === "staff" ? "Staff credentials are created by the admin." : "Login credentials will be sent to the user's email."}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-[6px] border border-border p-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          <FormInput label="Name" value={form.name} onChange={(v) => setValue("name", v)} />
          <FormInput label="Email" type="email" value={form.email} onChange={(v) => setValue("email", v)} />
          <FormInput label="Phone" value={form.phone} onChange={(v) => setValue("phone", v)} />
          {mode === "user" && <FormInput label="Country code" value={form.country_code} onChange={(v) => setValue("country_code", v)} />}
          <FormSelect label="Role" value={form.role} options={roles} onChange={(v) => setValue("role", v)} />
          {mode === "user" && <FormSelect label="Gender" value={form.gender} options={["", "male", "female", "other"]} onChange={(v) => setValue("gender", v)} />}
          {mode === "user" && MANAGED_ROLES.includes(form.role) ? (
            <FormSelect label="Language" value={form.preferred_language} options={["en", "fr", "rw"]} onChange={(v) => setValue("preferred_language", v)} />
          ) : null}
          {(mode === "staff" || (mode === "user" && MANAGED_ROLES.includes(form.role))) && (
            <>
              <FormInput label="Password" type="password" value={form.password} onChange={(v) => setValue("password", v)} />
              <FormInput label="Confirm password" type="password" value={form.password_confirmation} onChange={(v) => setValue("password_confirmation", v)} />
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="outline" className="h-9 rounded-[6px] text-[12px]" onClick={onClose}>Cancel</Button>
          <Button className="h-9 rounded-[6px] text-[12px]" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

function StaffPasswordModal({
  staff,
  onClose,
}: {
  staff: StaffUser | null;
  onClose: () => void;
}) {
  const resetPassword = useResetStaffPassword();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    setPassword("");
    setConfirmation("");
  }, [staff?.id]);

  if (!staff) return null;

  const save = async () => {
    if (password.length < 8) {
      sonnerToast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      sonnerToast.error("Passwords do not match.");
      return;
    }
    try {
      const res = await resetPassword.mutateAsync({
        id: staff.id,
        password,
        password_confirmation: confirmation,
      });
      sonnerToast.success(res.message ?? "Staff password updated.");
      onClose();
    } catch (error: unknown) {
      sonnerToast.error("Could not reset password.", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Reset staff password</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                {staff.name} · {staff.email}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-[6px] border border-border p-2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4">
          <FormInput label="New password" type="password" value={password} onChange={setPassword} />
          <FormInput label="Confirm password" type="password" value={confirmation} onChange={setConfirmation} />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="outline" className="h-9 rounded-[6px] text-[12px]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="h-9 rounded-[6px] text-[12px]"
            onClick={save}
            disabled={resetPassword.isPending || !password || !confirmation}
          >
            {resetPassword.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Set password
          </Button>
        </div>
      </div>
    </div>
  );
}

function StaffManagementPanel({ search }: { search: string }) {
  const [role, setRole] = useState("all");
  const [passwordTarget, setPasswordTarget] = useState<StaffUser | null>(null);
  const { data, isLoading, isError } = useGetAdminStaff({
    role: role !== "all" ? role : undefined,
    search: search || undefined,
  });
  const updateRole = useUpdateStaffRole();
  const suspend = useSuspendStaff();
  const activate = useActivateStaff();
  const remove = useDeleteStaff();
  const staff = data?.data ?? [];

  const action = async (promise: Promise<unknown>, success: string) => {
    try {
      await promise;
      sonnerToast.success(success);
    } catch (error: unknown) {
      sonnerToast.error("Staff action failed.", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-[6px] border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Staff management</p>
          <p className="text-[11px] text-muted-foreground">Moderators, finance, and help desk users.</p>
        </div>
        <FormSelect label="Role" value={role} options={["all", "moderator", "finance", "help_desk"]} onChange={setRole} compact />
      </div>
      <div className="overflow-hidden rounded-[6px] border border-border/70 bg-card">
        <table className="w-full text-[11px]">
          <thead className="border-b border-border/60 bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows />
            ) : isError ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-destructive">Failed to load staff</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No staff users found.</td></tr>
            ) : (
              staff.map((member: StaffUser) => {
                const currentRole = member.roles?.[0]?.name ?? "moderator";
                const suspended = member.status === "suspended";
                return (
                  <tr key={member.id} className="border-t border-border/40">
                    <td className="px-4 py-3 font-semibold text-foreground">{member.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3">
                      <select value={currentRole} onChange={(e) => action(updateRole.mutateAsync({ id: member.id, role: e.target.value as CreateStaffPayload["role"] }), "Staff role updated.")} className="h-8 rounded-[6px] border border-border bg-background px-2 text-[11px]">
                        {["moderator", "finance", "help_desk"].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-[9px] capitalize", statusStyle[member.status ?? "active"])}>{member.status ?? "active"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 rounded-[6px] text-[10px] gap-1" onClick={() => setPasswordTarget(member)}>
                          <KeyRound className="h-3 w-3" />
                          Password
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 rounded-[6px] text-[10px]" onClick={() => action(suspended ? activate.mutateAsync(member.id) : suspend.mutateAsync(member.id), suspended ? "Staff activated." : "Staff suspended.")}>{suspended ? "Activate" : "Suspend"}</Button>
                        <Button variant="outline" size="sm" className="h-7 rounded-[6px] border-red-900/40 text-[10px] text-red-500" onClick={() => action(remove.mutateAsync(member.id), "Staff deleted.")}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <StaffPasswordModal staff={passwordTarget} onClose={() => setPasswordTarget(null)} />
    </div>
  );
}

function RolesPermissionsPanel() {
  const { data: roles = [], isLoading: rolesLoading } = useAdminRoles();
  const { data: permissions = [], isLoading: permissionsLoading } = useAdminPermissions();
  const [roleId, setRoleId] = useState<number | null>(null);
  const rolePermissions = useRolePermissions(roleId);
  const replacePermissions = useReplaceRolePermissions();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (roleId === null && roles.length > 0) setRoleId(roles.find((role) => role.name !== "admin")?.id ?? roles[0].id);
  }, [roleId, roles]);

  useEffect(() => {
    setSelectedPermissions(rolePermissions.data?.permissions ?? []);
  }, [rolePermissions.data]);

  const save = async () => {
    if (roleId === null) return;
    try {
      const res = await replacePermissions.mutateAsync({ roleId, permissions: selectedPermissions });
      sonnerToast.success(res.message ?? "Role permissions updated.");
    } catch (error: unknown) {
      sonnerToast.error("Could not update permissions.", { description: getErrorMessage(error) });
    }
  };

  const selectedRole = roles.find((role) => role.id === roleId);
  const adminRole = selectedRole?.name === "admin";

  return (
    <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
      <div className="rounded-[6px] border border-border/70 bg-card p-3">
        <p className="text-[13px] font-semibold text-foreground">Roles</p>
        <p className="mb-3 text-[11px] text-muted-foreground">Select a role to manage permissions.</p>
        <div className="space-y-1.5">
          {rolesLoading ? <PanelLoader label="Loading roles..." /> : roles.map((role) => (
            <button key={role.id} type="button" onClick={() => setRoleId(role.id)} className={cn("flex w-full items-center justify-between rounded-[6px] border px-3 py-2 text-left text-[12px] font-semibold", roleId === role.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground")}>
              {role.name}
              {role.name === "admin" && <ShieldCheck className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[6px] border border-border/70 bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-foreground">{selectedRole ? `${selectedRole.name} permissions` : "Permissions"}</p>
            <p className="text-[11px] text-muted-foreground">{adminRole ? "Admin role permissions cannot be modified." : "Tick permissions and save to replace this role's access."}</p>
          </div>
          <Button className="h-8 rounded-[6px] text-[11px]" onClick={save} disabled={adminRole || replacePermissions.isPending || rolePermissions.isLoading}>
            {replacePermissions.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Save permissions
          </Button>
        </div>
        <div className="grid max-h-[520px] grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2 xl:grid-cols-3">
          {permissionsLoading || rolePermissions.isLoading ? <PanelLoader label="Loading permissions..." /> : permissions.map((permission) => {
            const checked = selectedPermissions.includes(permission.name);
            return (
              <label key={permission.id} className={cn("flex cursor-pointer items-center gap-2 rounded-[6px] border px-3 py-2 text-[11px] font-medium", checked ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground", adminRole && "cursor-not-allowed opacity-60")}>
                <input type="checkbox" checked={checked} disabled={adminRole} onChange={(e) => setSelectedPermissions((prev) => e.target.checked ? [...prev, permission.name] : prev.filter((name) => name !== permission.name))} />
                {permission.name}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const AdminUsers = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected] = useState<ApiUser | null>(null);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiUser | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => set("search", searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── API ──
  const { data, isLoading, isError, refetch } = useGetAdminUsers({
    role: filters.role !== "all" ? filters.role : undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    search: filters.search || undefined,
    page: filters.page,
    enabled: !["staff", "roles"].includes(filters.role),
  });

  const suspendMutation = useSuspendUser();
  const activateMutation = useActivateUser();
  const deleteMutation = useDeleteUser();
  const approveDoctorMutation = useApproveDoctor();
  const rejectDoctorMutation = useRejectDoctor();
  const suspendDoctorMutation = useSuspendDoctor();
  const activatePatientMutation = useActivatePatient();
  const suspendPatientMutation = useSuspendPatient();
  const approveHospitalMutation = useApproveHospital();
  const rejectHospitalMutation = useRejectHospital();
  const suspendHospitalMutation = useSuspendHospital();
  const approvePharmacyMutation = useApprovePharmacy();
  const rejectPharmacyMutation = useRejectPharmacy();
  const suspendPharmacyMutation = useSuspendPharmacy();

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);
  const selectedRole = selected ? getRole(selected) : "";
  const lookupUser = editingUser ?? selected;
  const lookupRole = lookupUser ? getRole(lookupUser) : "";
  const lookupSearch = userSearchTerm(lookupUser);

  const doctorLookup = useQuery({
    queryKey: ["admin-users-role-profile", "doctor", lookupUser?.id, lookupSearch],
    enabled: lookupRole === "doctor" && !!lookupUser,
    queryFn: async () => {
      const qs = queryString({ search: lookupSearch, page: 1 });
      const res = await apiFetch<PaginatedDoctors>(`/admin/doctors${qs ? `?${qs}` : ""}`);
      return res.data.find((doctor) => sameUserId(doctor, lookupUser)) ?? null;
    },
  });

  const patientLookup = useQuery({
    queryKey: ["admin-users-role-profile", "patient", lookupUser?.id, lookupSearch],
    enabled: lookupRole === "patient" && !!lookupUser,
    queryFn: async () => {
      const qs = queryString({ search: lookupSearch, page: 1 });
      const res = await apiFetch<PaginatedPatients>(`/admin/patients${qs ? `?${qs}` : ""}`);
      return res.data.find((patient) => patient.id === lookupUser?.id || sameUserId(patient.patient ?? {}, lookupUser)) ?? null;
    },
  });

  const hospitalLookup = useQuery({
    queryKey: ["admin-users-role-profile", "hospital", lookupUser?.id, lookupSearch],
    enabled: lookupRole === "hospital" && !!lookupUser,
    queryFn: async () => {
      const qs = queryString({ search: lookupSearch, page: 1 });
      const res = await apiFetch<PaginatedHospitals>(`/admin/hospitals${qs ? `?${qs}` : ""}`);
      return res.data.find((hospital) => sameUserId(hospital, lookupUser)) ?? null;
    },
  });

  const pharmacyLookup = useQuery({
    queryKey: ["admin-users-role-profile", "pharmacy", lookupUser?.id, lookupSearch],
    enabled: lookupRole === "pharmacy" && !!lookupUser,
    queryFn: async () => {
      const qs = queryString({ search: lookupSearch, page: 1 });
      const res = await apiFetch<PaginatedPharmacies>(`/admin/pharmacies${qs ? `?${qs}` : ""}`);
      return res.data.find((pharmacy) => sameUserId(pharmacy, lookupUser)) ?? null;
    },
  });

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: total };
    users.forEach((u) => {
      const r = getRole(u);
      counts[r] = (counts[r] ?? 0) + 1;
    });
    return counts;
  }, [users, total]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: total };
    users.forEach((u) => {
      counts[u.status] = (counts[u.status] ?? 0) + 1;
    });
    return counts;
  }, [users, total]);

  // Client-side sort
  const sorted = useMemo(() => {
    return [...users].sort((a, b) => {
      switch (filters.sort) {
        case "joined-asc":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "name":
          return a.name.localeCompare(b.name);
        case "role":
          return getRole(a).localeCompare(getRole(b));
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [users, filters.sort]);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        ...(key !== "page" ? { page: 1 } : {}),
      }));
    },
    [],
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;

    if (isRoleFilter(tab)) {
      setFilters((prev) =>
        prev.role === tab ? prev : { ...prev, role: tab, page: 1 },
      );
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const currentTab = useMemo(
    () => USER_TABS.find((tab) => tab.value === filters.role) ?? USER_TABS[0],
    [filters.role],
  );

  const selectRoleTab = useCallback(
    (role: RoleFilter) => {
      setFilters((prev) => ({ ...prev, role, page: 1 }));
      const next = new URLSearchParams(searchParams);
      if (role === "all") next.delete("tab");
      else next.set("tab", role);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchInput("");
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  // Lock body scroll when mobile filter open
  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return "Something went wrong";
  }
  // ── Actions ──
  const toggleStatus = useCallback(
    async (u: ApiUser) => {
      try {
        if (u.status === "active") {
          await suspendMutation.mutateAsync(u.id);
          setSelected((prev) =>
            prev ? { ...prev, status: "suspended" } : null,
          );
        } else {
          await activateMutation.mutateAsync(u.id);
          setSelected((prev) => (prev ? { ...prev, status: "active" } : null));
        } 
        sonnerToast.success(t("admin.users.status_changed"));
      } catch (error: unknown) { 
        sonnerToast.error(getErrorMessage(error) || t("admin.users.status_change_failed"));
      }
    },
    [suspendMutation, activateMutation, t, sonnerToast],
  );

  const removeUser = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      sonnerToast.success(t("admin.users.deleted_toast"));
      setConfirmDelete(null);
      setSelected(null);
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || t("admin.users.delete_failed"));
    }
  }, [confirmDelete, deleteMutation, t, sonnerToast]);

  const handleDoctorApprove = useCallback(async (doctor: ApiDoctor) => {
    try {
      await approveDoctorMutation.mutateAsync(doctor.id);
      sonnerToast.success("Doctor approved.");
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || "Failed to approve doctor.");
    }
  }, [approveDoctorMutation, sonnerToast]);

  const handleDoctorReject = useCallback(async (doctor: ApiDoctor) => {
    try {
      await rejectDoctorMutation.mutateAsync({ id: doctor.id });
      sonnerToast.error("Doctor rejected.");
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || "Failed to reject doctor.");
    }
  }, [rejectDoctorMutation, sonnerToast]);

  const handleDoctorSuspend = useCallback(async (doctor: ApiDoctor) => {
    try {
      await suspendDoctorMutation.mutateAsync({ id: doctor.id });
      sonnerToast.success("Doctor suspended.");
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || "Failed to suspend doctor.");
    }
  }, [suspendDoctorMutation, sonnerToast]);

  const handlePatientToggle = useCallback(async (patient: ApiPatient) => {
    try {
      if (patient.status === "active") {
        await suspendPatientMutation.mutateAsync(patient.id);
      } else {
        await activatePatientMutation.mutateAsync(patient.id);
      }
      sonnerToast.success(t("admin.users.status_changed"));
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || t("admin.users.status_change_failed"));
    }
  }, [activatePatientMutation, suspendPatientMutation, t, sonnerToast]);

  const handleHospitalApprove = useCallback(async (hospital: ApiHospital) => {
    try {
      await approveHospitalMutation.mutateAsync(hospital.id);
      sonnerToast.success("Hospital approved.");
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || "Failed to approve hospital.");
    }
  }, [approveHospitalMutation, sonnerToast]);

  const handleHospitalReject = useCallback(async (hospital: ApiHospital) => {
    try {
      await rejectHospitalMutation.mutateAsync({ id: hospital.id });
      sonnerToast.error("Hospital rejected.");
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || "Failed to reject hospital.");
    }
  }, [rejectHospitalMutation, sonnerToast]);

  const handleHospitalSuspend = useCallback(async (hospital: ApiHospital) => {
    try {
      await suspendHospitalMutation.mutateAsync({ id: hospital.id });
      sonnerToast.success("Hospital suspended.");
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || "Failed to suspend hospital.");
    }
  }, [suspendHospitalMutation, sonnerToast]);

  const handlePharmacyApprove = useCallback(async (pharmacy: ApiPharmacy) => {
    try {
      await approvePharmacyMutation.mutateAsync(pharmacy.id);
      sonnerToast.success("Pharmacy approved.");
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || "Failed to approve pharmacy.");
    }
  }, [approvePharmacyMutation, sonnerToast]);

  const handlePharmacyReject = useCallback(async (pharmacy: ApiPharmacy) => {
    try {
      await rejectPharmacyMutation.mutateAsync({ id: pharmacy.id });
      sonnerToast.error("Pharmacy rejected.");
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || "Failed to reject pharmacy.");
    }
  }, [rejectPharmacyMutation, sonnerToast]);

  const handlePharmacySuspend = useCallback(async (pharmacy: ApiPharmacy) => {
    try {
      await suspendPharmacyMutation.mutateAsync({ id: pharmacy.id });
      sonnerToast.success("Pharmacy suspended.");
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error) || "Failed to suspend pharmacy.");
    }
  }, [suspendPharmacyMutation, sonnerToast]);

  const pendingCount = statusCounts["pending"] ?? 0;
  const isActing = suspendMutation.isPending || activateMutation.isPending;
  const isDoctorActing =
    approveDoctorMutation.isPending ||
    rejectDoctorMutation.isPending ||
    suspendDoctorMutation.isPending;
  const isPatientActing = activatePatientMutation.isPending || suspendPatientMutation.isPending;
  const isHospitalActing =
    approveHospitalMutation.isPending ||
    rejectHospitalMutation.isPending ||
    suspendHospitalMutation.isPending;
  const isPharmacyActing =
    approvePharmacyMutation.isPending ||
    rejectPharmacyMutation.isPending ||
    suspendPharmacyMutation.isPending;
  const resultLabel =
    currentTab.value === "all"
      ? total === 1
        ? "user"
        : "users"
      : currentTab.label.toLowerCase();

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "all", label: t("admin.users.all") },
        { value: "active", label: t("admin.status.active") },
        { value: "pending", label: t("admin.status.pending") },
        { value: "suspended", label: t("admin.status.suspended") },
        { value: "rejected", label: t("admin.status.rejected") },
      ],
      onChange: (v: string) => set("status", v as any),
    }
  ], [filters.status, set, t]);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title="Manage users"
          subtitle="Review all platform accounts from one place"
        />

        <div className="flex items-center border-b border-border/60 px-2 sm:px-4 bg-card/30 shrink-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {USER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = filters.role === tab.value;
            const count =
              tab.value === filters.role || (tab.value === "all" && filters.role === "all")
                ? total
                : roleCounts[tab.value];

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => selectRoleTab(tab.value)}
                className={cn(
                  "relative flex items-center gap-2 px-3 sm:px-5 py-4 text-xs sm:text-sm font-medium border-b-2 transition-all duration-200 shrink-0 whitespace-nowrap",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
                {typeof count === "number" && count > 0 && (
                  <span
                    className={cn(
                      "h-5 min-w-[20px] px-1.5 rounded-[6px] text-[10px] font-bold flex items-center justify-center leading-none",
                      active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
          {/* Stats */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard
              label="Total users"
              value={total}
              icon={Users}
              accent="primary"
            />
            <StatCard
              label="Active"
              value={statusCounts["active"] ?? 0}
              icon={CheckCircle2}
              accent="success"
            />
            <StatCard
              label="Pending review"
              value={statusCounts["pending"] ?? 0}
              icon={Clock}
              accent="warning"
            />
            <StatCard
              label="Suspended"
              value={statusCounts["suspended"] ?? 0}
              icon={XCircle}
              accent="warning"
            />
          </div>

          {/* Mobile search */}
          <div className="hidden">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email, phone…"
                className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-between lg:justify-start">
              <p className="text-[11px] text-muted-foreground shrink-0">
                {isLoading ? (
                  <span className="text-muted-foreground/50">Loading…</span>
                ) : (
                  <>
                    <span className="font-bold text-foreground">{total}</span>{" "}
                    {resultLabel}
                  </>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                  >
                    Reset
                  </button>
                )}
              </p>

              {pendingCount > 0 && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[6px] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingCount} pending
                </span>
              )}
            </div>

            <div className="-mx-1 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2">
              {/* Desktop search */}
              <div className="relative w-[210px] sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="h-8 w-full pl-8 pr-8 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            {filters.role !== "roles" && (
              <Button
                type="button"
                onClick={() => setCreateUserOpen(true)}
                className="h-8 rounded-[6px] px-3 text-[11px] font-semibold gap-1.5 shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {filters.role === "staff" ? "Create staff" : "Create user"}
              </Button>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              className="h-8 w-8 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </button>

            {/* Sort */}
            <div className="relative shrink-0">
              <select
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value as SortOption)}
                className="h-8 appearance-none pl-2.5 pr-7 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer w-[170px] sm:w-[190px]"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
            </div>

            <FilterToggleButton
              open={filterOpen}
              onToggle={() => setFilterOpen(!filterOpen)}
              hasActiveFilters={hasActiveFilters}
            />
              </div>
            </div>
          </div>

          <FilterBar
            open={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            fields={filterFields}
            cols={{ default: 1, sm: 2 }}
          />

          {/* Content */}
          <div className="p-3 sm:p-4">
            {filters.role === "staff" ? (
              <StaffManagementPanel search={filters.search} />
            ) : filters.role === "roles" ? (
              <RolesPermissionsPanel />
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <p className="text-[12px] font-semibold text-destructive">
                  Failed to load users
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Check your connection and try again
                </p>
              </div>
            ) : !isLoading && sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Users className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    No users match your filters
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    Try widening your search criteria
                  </p>
                </div>
                <button
                  onClick={clearAll}
                  className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("admin.users.name")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("admin.users.contact")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("admin.users.role")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("admin.users.status")}
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          {t("admin.users.joined")}
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <SkeletonRows />
                      ) : (
                        sorted.map((u) => (
                          <UserRow key={u.id} u={u} onManage={setSelected} onEdit={setEditingUser} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden flex flex-col gap-2">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-24 rounded-[6px] border border-border/60 bg-card animate-pulse"
                      />
                    ))
                    : sorted.map((u) => (
                      <UserCard key={u.id} u={u} onManage={setSelected} onEdit={setEditingUser} />
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground">
                      Page{" "}
                      <span className="font-semibold text-foreground">
                        {filters.page}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-foreground">
                        {totalPages}
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={filters.page <= 1}
                        onClick={() => set("page", filters.page - 1)}
                        className="p-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={filters.page >= totalPages}
                        onClick={() => set("page", filters.page + 1)}
                        className="p-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── Right-side user panel ── */}
      <DoctorPanel
        doctor={selectedRole === "doctor" ? (doctorLookup.data ?? null) : null}
        onClose={() => setSelected(null)}
        onApprove={handleDoctorApprove}
        onReject={handleDoctorReject}
        onSuspend={handleDoctorSuspend}
        isActing={isDoctorActing}
      />

      <PatientPanel
        patient={selectedRole === "patient" ? (patientLookup.data ?? null) : null}
        onClose={() => setSelected(null)}
        onToggleStatus={handlePatientToggle}
        isActing={isPatientActing}
      />

      <HospitalPanel
        hospital={selectedRole === "hospital" ? (hospitalLookup.data ?? null) : null}
        onClose={() => setSelected(null)}
        onApprove={handleHospitalApprove}
        onReject={handleHospitalReject}
        onSuspend={handleHospitalSuspend}
        isActing={isHospitalActing}
      />

      <PharmacyPanel
        pharmacy={selectedRole === "pharmacy" ? (pharmacyLookup.data ?? null) : null}
        onClose={() => setSelected(null)}
        onApprove={handlePharmacyApprove}
        onReject={handlePharmacyReject}
        onSuspend={handlePharmacySuspend}
        isActing={isPharmacyActing}
      />

      <UserPanel
        user={
          !["doctor", "patient", "hospital", "pharmacy"].includes(selectedRole) ||
          (selectedRole === "doctor" && doctorLookup.isFetched && !doctorLookup.data) ||
          (selectedRole === "patient" && patientLookup.isFetched && !patientLookup.data) ||
          (selectedRole === "hospital" && hospitalLookup.isFetched && !hospitalLookup.data) ||
          (selectedRole === "pharmacy" && pharmacyLookup.isFetched && !pharmacyLookup.data)
            ? selected
            : null
        }
        onClose={() => setSelected(null)}
        onToggleStatus={toggleStatus}
        onDelete={(u) => setConfirmDelete(u)}
        isActing={isActing}
        isDeleting={deleteMutation.isPending}
      />

      {/* ── Delete confirm ── */}
      <ManageProfileModal
        userId={editingUser?.id ?? null}
        role={
          editingUser && ["doctor", "patient", "pharmacy", "hospital"].includes(getRole(editingUser))
            ? (getRole(editingUser) as ManagedRole)
            : null
        }
        userName={editingUser?.name}
        onClose={() => {
          setEditingUser(null);
          refetch();
          doctorLookup.refetch();
          patientLookup.refetch();
          hospitalLookup.refetch();
          pharmacyLookup.refetch();
        }}
      />

      <CreateUserModal
        open={createUserOpen}
        mode={filters.role === "staff" ? "staff" : "user"}
        defaultRole={
          ["doctor", "hospital", "pharmacy", "patient", "admin"].includes(filters.role)
            ? filters.role
            : "patient"
        }
        onClose={() => setCreateUserOpen(false)}
        onCreated={() => {
          refetch();
          setCreateUserOpen(false);
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.users.delete_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={removeUser}>
              {t("admin.common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EditableRoleData = ApiDoctor | ApiPatient | ApiHospital | ApiPharmacy | null;

function AdminUserEditModal({
  user,
  roleData,
  loading,
  onClose,
  onSaved,
}: {
  user: ApiUser | null;
  roleData: EditableRoleData;
  loading: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const role = user ? getRole(user) : "";
  const open = !!user;

  useEffect(() => {
    if (!user) {
      setForm({});
      return;
    }
    if (role === "doctor") {
      const d = roleData as ApiDoctor | null;
      setForm({
        specialization: typeof d?.specialization === "string" ? d.specialization : d?.specialization?.name ?? "",
        doctor_degree: d?.doctor_degree ?? "",
        medical_license: d?.medical_license ?? "",
        designations: d?.designations ?? "",
        bio_en: d?.bio_en ?? "",
        bio_fr: d?.bio_fr ?? "",
        bio_kiny: d?.bio_kiny ?? "",
        preferred_language: d?.preferred_language ?? "en",
        status: d?.status ?? user.status,
        consultation_type: d?.consultation_type ?? "both",
        is_available: Boolean(d?.is_available),
        is_active: d?.is_active ?? user.status === "active",
      });
      return;
    }
    if (role === "patient") {
      const p = roleData as ApiPatient | null;
      setForm({
        name: p?.name ?? user.name,
        date_of_birth: p?.patient?.date_of_birth ?? "",
        gender: p?.patient?.gender ?? "",
        national_id: p?.patient?.national_id ?? "",
        blood_type: p?.patient?.blood_type ?? "",
        address: p?.patient?.address ?? "",
        city: p?.patient?.city ?? "",
        province: p?.patient?.province ?? "",
        country: p?.patient?.country ?? "",
        emergency_contact_name: p?.patient?.emergency_contact_name ?? "",
        emergency_contact_phone: p?.patient?.emergency_contact_phone ?? "",
        emergency_contact_relation: p?.patient?.emergency_contact_relation ?? "",
        preferred_language: p?.preferred_language ?? user.preferred_language ?? "en",
        is_active: p?.patient?.is_active ?? user.status === "active",
      });
      return;
    }
    if (role === "hospital") {
      const h = roleData as ApiHospital | null;
      setForm({
        name_en: h?.name_en ?? user.name,
        name_fr: h?.name_fr ?? "",
        name_kiny: h?.name_kiny ?? "",
        description_en: h?.description_en ?? "",
        type: h?.type ?? "hospital",
        registration_number: h?.registration_number ?? "",
        address: h?.address ?? "",
        city: h?.city ?? "",
        province: h?.province ?? "",
        country: h?.country ?? "",
        phone: h?.phone ?? user.phone ?? "",
        email: h?.email ?? user.email ?? "",
        website: h?.website ?? "",
        opens_at: h?.opens_at ?? "",
        closes_at: h?.closes_at ?? "",
        status: h?.status ?? user.status,
        is_active: h?.is_active ?? user.status === "active",
      });
      return;
    }
    if (role === "pharmacy") {
      const p = roleData as ApiPharmacy | null;
      setForm({
        name_en: p?.name_en ?? user.name,
        name_rw: p?.name_rw ?? "",
        description_en: p?.description_en ?? "",
        description_rw: p?.description_rw ?? "",
        registration_number: p?.registration_number ?? "",
        address: p?.address ?? "",
        city: p?.city ?? "",
        province: p?.province ?? "",
        country: p?.country ?? "",
        phone: p?.phone ?? user.phone ?? "",
        email: p?.email ?? user.email ?? "",
        website: p?.website ?? "",
        opens_at: p?.opens_at ?? "",
        closes_at: p?.closes_at ?? "",
        delivery_fee: p?.delivery_fee != null ? String(p.delivery_fee) : "",
        delivery_currency: p?.delivery_currency ?? "RWF",
        delivery_radius_km: p?.delivery_radius_km != null ? String(p.delivery_radius_km) : "",
        estimated_delivery_minutes: p?.estimated_delivery_minutes != null ? String(p.estimated_delivery_minutes) : "",
        status: p?.status ?? user.status,
        is_open_24h: Boolean(p?.is_open_24h),
        offers_delivery: Boolean(p?.offers_delivery),
        offers_pickup: Boolean(p?.offers_pickup),
        is_active: p?.is_active ?? user.status === "active",
      });
      return;
    }
    setForm({ name: user.name, preferred_language: user.preferred_language ?? "en", status: user.status });
  }, [role, roleData, user]);

  if (!open) return null;

  const setValue = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const endpoint = (() => {
    if (role === "doctor") return { path: "doctors", id: (roleData as ApiDoctor | null)?.id };
    if (role === "patient") {
      const p = roleData as ApiPatient | null;
      return { path: "patients", id: p?.patient?.id ?? p?.id };
    }
    if (role === "hospital") return { path: "hospitals", id: (roleData as ApiHospital | null)?.id };
    if (role === "pharmacy") return { path: "pharmacies", id: (roleData as ApiPharmacy | null)?.id };
    return null;
  })();

  const save = async () => {
    if (!endpoint?.id) {
      sonnerToast.error("Profile details are still loading.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/admin/manage/${endpoint.path}/${endpoint.id}`, { method: "PATCH", body: form });
      sonnerToast.success("Information updated.");
      onSaved();
      onClose();
    } catch (error: unknown) {
      sonnerToast.error("Could not update information.", {
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: string, label: string, type = "text") => (
    <label className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</span>
      <input type={type} value={String(form[key] ?? "")} onChange={(e) => setValue(key, e.target.value)} className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-[12px] outline-none focus:border-primary/50" />
    </label>
  );
  const textarea = (key: string, label: string) => (
    <label className="space-y-1 md:col-span-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</span>
      <textarea value={String(form[key] ?? "")} onChange={(e) => setValue(key, e.target.value)} className="min-h-20 w-full rounded-[6px] border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary/50" />
    </label>
  );
  const select = (key: string, label: string, options: string[]) => (
    <label className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</span>
      <select value={String(form[key] ?? "")} onChange={(e) => setValue(key, e.target.value)} className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-[12px] outline-none focus:border-primary/50">
        <option value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
  const checkbox = (key: string, label: string) => (
    <label className="flex items-center gap-2 rounded-[6px] border border-border bg-secondary/20 px-3 py-2 text-[12px] font-medium">
      <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setValue(key, e.target.checked)} />
      {label}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[14px] font-semibold text-foreground">Edit {role || "user"} information</p>
            <p className="text-[11px] text-muted-foreground">{user.name}</p>
          </div>
          <button onClick={onClose} className="rounded-[6px] border border-border p-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading profile details...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {role === "doctor" && <>{field("specialization", "Specialization")}{field("doctor_degree", "Doctor degree")}{field("medical_license", "Medical license")}{field("designations", "Designations")}{select("preferred_language", "Preferred language", ["en", "fr", "rw"])}{select("status", "Status", ["pending", "submitted", "active", "rejected", "suspended"])}{select("consultation_type", "Consultation type", ["online", "in_person", "both"])}{checkbox("is_available", "Available")}{checkbox("is_active", "Active")}{textarea("bio_en", "Bio EN")}{textarea("bio_fr", "Bio FR")}{textarea("bio_kiny", "Bio Kiny")}</>}
              {role === "patient" && <>{field("name", "Name")}{field("date_of_birth", "Date of birth", "date")}{select("gender", "Gender", ["male", "female", "other"])}{field("national_id", "National ID")}{select("blood_type", "Blood type", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])}{field("address", "Address")}{field("city", "City")}{field("province", "Province")}{field("country", "Country")}{field("emergency_contact_name", "Emergency contact name")}{field("emergency_contact_phone", "Emergency contact phone")}{field("emergency_contact_relation", "Emergency relation")}{select("preferred_language", "Preferred language", ["en", "fr", "rw"])}{checkbox("is_active", "Active")}</>}
              {role === "hospital" && <>{field("name_en", "Name EN")}{field("name_fr", "Name FR")}{field("name_kiny", "Name Kiny")}{select("type", "Type", ["hospital", "clinic", "health_center", "pharmacy_clinic"])}{field("registration_number", "Registration number")}{field("address", "Address")}{field("city", "City")}{field("province", "Province")}{field("country", "Country")}{field("phone", "Phone")}{field("email", "Email", "email")}{field("website", "Website")}{field("opens_at", "Opens at", "time")}{field("closes_at", "Closes at", "time")}{select("status", "Status", ["active", "pending", "suspended", "rejected"])}{checkbox("is_active", "Active")}{textarea("description_en", "Description EN")}</>}
              {role === "pharmacy" && <>{field("name_en", "Name EN")}{field("name_rw", "Name RW")}{field("registration_number", "Registration number")}{field("address", "Address")}{field("city", "City")}{field("province", "Province")}{field("country", "Country")}{field("phone", "Phone")}{field("email", "Email", "email")}{field("website", "Website")}{field("opens_at", "Opens at", "time")}{field("closes_at", "Closes at", "time")}{field("delivery_fee", "Delivery fee", "number")}{field("delivery_currency", "Delivery currency")}{field("delivery_radius_km", "Delivery radius km", "number")}{field("estimated_delivery_minutes", "Estimated minutes", "number")}{select("status", "Status", ["active", "pending", "suspended", "rejected"])}{checkbox("is_open_24h", "Open 24h")}{checkbox("offers_delivery", "Offers delivery")}{checkbox("offers_pickup", "Offers pickup")}{checkbox("is_active", "Active")}{textarea("description_en", "Description EN")}{textarea("description_rw", "Description RW")}</>}
              {!["doctor", "patient", "hospital", "pharmacy"].includes(role) && <>{field("name", "Name")}{select("preferred_language", "Preferred language", ["en", "fr", "rw"])}{select("status", "Status", ["active", "pending", "suspended", "rejected"])}</>}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="outline" className="h-9 rounded-[6px] text-[12px]" onClick={onClose}>Cancel</Button>
          <Button className="h-9 rounded-[6px] text-[12px]" onClick={save} disabled={saving || loading}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save changes</Button>
        </div>
      </div>
    </div>
  );
}

const InfoTile = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="p-3 rounded-[6px] border border-border/60 bg-secondary/30">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <p className="text-[13px] font-medium text-foreground truncate">{value}</p>
  </div>
);

export default AdminUsers;
