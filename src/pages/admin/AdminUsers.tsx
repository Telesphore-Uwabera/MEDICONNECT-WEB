import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
} from "lucide-react";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import {
  useGetAdminUsers,
  useSuspendUser,
  useActivateUser,
  useDeleteUser,
  type ApiUser,
} from "@/hooks/admin/use-admin-users";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleFilter = "all" | "doctor" | "hospital" | "pharmacy" | "patient";
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



function UserRow({
  u,
  onManage,
}: {
  u: ApiUser;
  onManage: (u: ApiUser) => void;
}) {
  const { t, i18n } = useTranslation();
  const role = getRole(u);
  const Icon = roleIcon[role] ?? UserCircle;

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
            "inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-sm border font-medium",
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
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(u)}
        >
          {t("admin.users.manage")}
        </Button>
      </td>
    </tr>
  );
}

function UserCard({
  u,
  onManage,
}: {
  u: ApiUser;
  onManage: (u: ApiUser) => void;
}) {
  const { t, i18n } = useTranslation();
  const role = getRole(u);
  const Icon = roleIcon[role] ?? UserCircle;

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
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
              "inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-sm border font-medium",
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
        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(u)}
        >
          {t("admin.users.manage")}
        </Button>
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
                <div className="rounded-xl border border-border/60 bg-secondary/20 overflow-hidden">
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
                <div className="rounded-xl border border-border/60 bg-secondary/20 divide-y divide-border/40">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Phone verified
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        user.phone_verified_at
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground/50",
                      )}
                    >
                      {user.phone_verified_at
                        ? new Date(user.phone_verified_at).toLocaleDateString()
                        : "Not verified"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Email verified
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        user.email_verified_at
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground/50",
                      )}
                    >
                      {user.email_verified_at
                        ? new Date(user.email_verified_at).toLocaleDateString()
                        : "Not verified"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Footer actions ── */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-10 text-[12px] rounded-lg gap-2"
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
                  className="h-10 text-[12px] rounded-lg gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
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
                className="w-full h-9 text-[12px] rounded-lg text-muted-foreground"
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

const AdminUsers = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected] = useState<ApiUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiUser | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { toast } = useToast();

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
  });

  const suspendMutation = useSuspendUser();
  const activateMutation = useActivateUser();
  const deleteMutation = useDeleteUser();

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);

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

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchInput("");
  }, []);

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
        toast({ title: t("admin.users.status_changed") });
      } catch (error: unknown) {
        toast({ title: getErrorMessage(error), variant: "destructive" });
      }
    },
    [suspendMutation, activateMutation, t, toast],
  );

  const removeUser = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast({ title: t("admin.users.deleted_toast") });
      setConfirmDelete(null);
      setSelected(null);
    } catch (error: unknown) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  }, [confirmDelete, deleteMutation, t, toast]);

  const pendingCount = statusCounts["pending"] ?? 0;
  const isActing = suspendMutation.isPending || activateMutation.isPending;

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "role",
      label: "Role",
      value: filters.role,
      options: [
        { value: "all", label: t("admin.users.all") },
        { value: "doctor", label: t("admin.roles.doctor") },
        { value: "hospital", label: t("admin.roles.hospital") },
        { value: "pharmacy", label: t("admin.roles.pharmacy") },
        { value: "patient", label: t("admin.roles.patient") },
      ],
      onChange: (v: string) => set("role", v as any),
    },
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
  ], [filters.role, filters.status, set, t]);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub", { date: new Date().toLocaleDateString(i18n.language, { weekday: "long", month: "long", day: "numeric" }) })}
        />

        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2 }}
        />

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
            <div className="sm:hidden px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
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
            <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <p className="text-[11px] text-muted-foreground shrink-0">
                  {isLoading ? (
                    <span className="text-muted-foreground/50">Loading…</span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{total}</span>{" "}
                      {total === 1 ? "user" : "users"}
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
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingCount} pending
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Desktop search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search name, email, phone…"
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

              </div>

              {/* Refresh Button */}
              <button
                onClick={() => refetch()}
                className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </button>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />

              {/* Sort */}
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as SortOption)}
                  className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
              </div>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              {isError ? (
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
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
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
                  <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
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
                            <UserRow key={u.id} u={u} onManage={setSelected} />
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
                            className="h-24 rounded-sm border border-border/60 bg-card animate-pulse"
                          />
                        ))
                      : sorted.map((u) => (
                          <UserCard key={u.id} u={u} onManage={setSelected} />
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
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={filters.page >= totalPages}
                          onClick={() => set("page", filters.page + 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
      <UserPanel
        user={selected}
        onClose={() => setSelected(null)}
        onToggleStatus={toggleStatus}
        onDelete={(u) => setConfirmDelete(u)}
        isActing={isActing}
        isDeleting={deleteMutation.isPending}
      />

      {/* ── Delete confirm ── */}
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

const InfoTile = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="p-3 rounded-lg border border-border/60 bg-secondary/30">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <p className="text-[13px] font-medium text-foreground truncate">{value}</p>
  </div>
);

export default AdminUsers;
