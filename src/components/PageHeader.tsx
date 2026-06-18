import { ReactNode, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  HelpCircle,
  Shield,
  Mail,
  Phone,
  BadgeCheck,
  Stethoscope,
  Building2,
  Pill,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Sunrise,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useMe, useLogout } from "@/hooks/useAuth";
import { dashboardPath } from "@/lib/auth-store";
import { useGetNotifications } from "@/hooks/use-notifications";
import MyNotifications from "@/pages/notifications/Mynotifications";

/* ─── Types ──────────────────────────────────────────────────────── */

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  country_code: string;
  avatar: string | null;
  role: "patient" | "doctor" | "hospital" | "pharmacy" | "admin";
  is_verified: boolean;
  status: "active" | "inactive" | "suspended";
  preferred_language: string;
}

/* ─── Props ──────────────────────────────────────────────────────── */

interface Props {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

/**
 * Returns a greeting + icon based on current local hour.
 * 05–11 → Morning, 12–16 → Afternoon, 17–20 → Evening, 21–04 → Night
 */
const getGreeting = (): { text: string; Icon: React.ElementType } => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: "Good morning", Icon: Sunrise };
  if (h >= 12 && h < 17) return { text: "Good afternoon", Icon: Sun };
  if (h >= 17 && h < 21) return { text: "Good evening", Icon: Sunset };
  return { text: "Good night", Icon: Moon };
};

const ROLE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    gradient: string;
  }
> = {
  patient: {
    label: "Patient",
    icon: User,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  doctor: {
    label: "Doctor",
    icon: Stethoscope,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  hospital: {
    label: "Hospital",
    icon: Building2,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  pharmacy: {
    label: "Pharmacy",
    icon: Pill,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    gradient: "from-violet-500/20 to-violet-500/5",
  },
  admin: {
    label: "Administrator",
    icon: Shield,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
};

/* ─── Component ──────────────────────────────────────────────────── */

export const PageHeader = ({ title, subtitle, actions }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: user, isLoading } = useMe();
  const logout = useLogout();
  const { data: notificationsData } = useGetNotifications({ per_page: 30 });

  const unreadCount = notificationsData?.unread ?? 0;

  /* Click-outside to close profile popover */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    if (profileOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/auth"),
    });
  };

  /* Derived display values */
  const displayName = user?.name ?? "—";
  const displayEmail = user?.email ?? "";
  const displayPhone = user?.phone ?? "";
  const displayRole = user?.role ?? "";
  const displayInitials = user?.name ? getInitials(user.name) : "?";
  const userRole = user?.role ?? null;
  const firstName = displayName;

  const roleCfg = ROLE_CONFIG[displayRole] ?? {
    label: displayRole,
    icon: User,
    color: "text-muted-foreground",
    bg: "bg-muted",
    gradient: "from-muted to-muted/50",
  };
  const RoleIcon = roleCfg.icon;

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();

  return (
    <>
      <header className="border-b border-border/60 bg-card/95 backdrop-blur-2xl sticky top-0 z-50 shadow-sm shadow-black/5">
        <div className="px-6 py-3 flex items-center justify-between gap-6">

          {/* ── Left: Greeting ───────────────────────────────── */}
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="p-1.5 rounded-[6px] bg-primary/8 shrink-0">
              <GreetingIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="space-y-1">
                  <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                  <div className="h-2.5 w-24 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <h1 className="text-[12px] uppercase font-semibold text-foreground truncate leading-tight tracking-[-0.01em]">
                    {greetingText}
                    {firstName && firstName !== "—" ? (
                      <span className="text-primary">, {firstName}</span>
                    ) : null}
                   
                  </h1>
                  {subtitle && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {subtitle}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Right controls ──────────────────────────────── */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Custom actions slot */}
            {actions && (
              <div className="flex items-center gap-1.5 mr-1 pr-1.5 border-r border-border/50">
                {actions}
              </div>
            )}

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Language switcher */}
            <LanguageSwitcher />

            {/* Divider */}
            <div className="h-5 w-px bg-border/50 mx-1" />

            {/* Bell */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
              aria-label="Open notifications"
            >
              <Bell className="h-[25px] w-[25px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold ring-[1.5px] ring-card leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-[6px] transition-all duration-200 border",
                  profileOpen
                    ? "bg-secondary border-border text-foreground shadow-sm"
                    : "border-transparent hover:bg-secondary/60 hover:border-border/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Avatar */}
                {isLoading ? (
                  <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
                ) : user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={displayName}
                    className="h-7 w-7 rounded-full object-cover ring-[1.5px] ring-primary/20"
                  />
                ) : (
                  <div className="h-7 w-7  rounded-full bg-gradient-to-br from-primary/25 to-primary/8 text-primary flex items-center justify-center text-[10px] font-bold ring-[1.5px] ring-primary/20">
                    {displayInitials}
                  </div>
                )}

                {/* Name + role (sm+) */}
                <div className="hidden sm:block text-left min-w-0">
                  {isLoading ? (
                    <div className="space-y-1">
                      <div className="h-2.5 w-20 bg-muted animate-pulse rounded" />
                      <div className="h-2 w-12 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] capitalize font-semibold text-foreground leading-tight truncate max-w-[100px]">
                        {firstName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <RoleIcon className={cn("h-2.5 w-2.5 shrink-0", roleCfg.color)} />
                        <p className={cn("text-[10px] font-semibold leading-tight capitalize truncate max-w-[80px]", roleCfg.color)}>
                          {roleCfg.label}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <ChevronDown
                  className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform duration-200 shrink-0",
                    profileOpen && "rotate-180"
                  )}
                />
              </button>

              {/* ── Profile Popover ──────────────────────────────── */}
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 z-50 bg-card border border-border/60 rounded-[8px] shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                  {/* User info header */}
                  <div
                    className={cn(
                      "px-4 py-4 border-b border-border/50 bg-gradient-to-br",
                      roleCfg.gradient,
                      "to-transparent"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {isLoading ? (
                        <div className="h-11 w-11 rounded-full bg-muted animate-pulse shrink-0" />
                      ) : user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={displayName}
                          className="h-11 w-11 rounded-full object-cover ring-[1.5px] ring-primary/20 shrink-0"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-sm font-bold ring-[1.5px] ring-primary/20 shrink-0">
                          {displayInitials}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        {/* Name + verified */}
                        <div className="flex items-center gap-1">
                          <p className="text-[13px] font-bold text-foreground truncate">
                            {displayName}
                          </p>
                          {user?.is_verified && (
                            <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>

                        {/* Contact */}
                        <div className="mt-1 space-y-0.5">
                          {displayEmail && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="h-2.5 w-2.5 shrink-0" />
                              <p className="text-[10px] truncate">{displayEmail}</p>
                            </div>
                          )}
                          {displayPhone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-2.5 w-2.5 shrink-0" />
                              <p className="text-[10px] truncate">
                                {user?.country_code} {displayPhone}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold capitalize",
                              roleCfg.bg,
                              roleCfg.color
                            )}
                          >
                            <RoleIcon className="h-2.5 w-2.5" />
                            {roleCfg.label}
                          </span>

                          {user?.is_verified && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              <BadgeCheck className="h-2.5 w-2.5" />
                              Verified
                            </span>
                          )}

                          {user?.status === "active" && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5 space-y-0.5">
                    <PopItem
                      icon={User}
                      label={t("header.profile", "Profile")}
                      description="View & edit your details"
                      to={userRole ? `${dashboardPath(userRole)}/profile` : "#"}
                      onClick={() => setProfileOpen(false)}
                    />
                    <PopItem
                      icon={Settings}
                      label={t("header.settings", "Settings")}
                      description="Preferences & security"
                      to={userRole ? `${dashboardPath(userRole)}/settings` : "#"}
                      onClick={() => setProfileOpen(false)}
                    />
                    <PopItem
                      icon={HelpCircle}
                      label={t("header.help", "Help & Support")}
                      description="FAQs and contact"
                      to="./help"
                      onClick={() => setProfileOpen(false)}
                    />
                  </div>

                  {/* Sign out */}
                  <div className="p-1.5 border-t border-border/50">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      disabled={logout.isPending}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[11px] text-destructive hover:bg-destructive/10 transition-colors font-semibold disabled:opacity-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {logout.isPending
                        ? t("common.signing_out", "Signing out…")
                        : t("header.signOut", "Sign out")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Drawer */}
      <MyNotifications
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
};

/* ─── PopItem ────────────────────────────────────────────────────── */

const PopItem = ({
  icon: Icon,
  label,
  description,
  to,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  to: string;
  onClick: () => void;
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all duration-200 group"
  >
    <div className="p-1 rounded-[5px] bg-secondary group-hover:bg-primary/10 transition-colors">
      <Icon className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-[11px] text-foreground">{label}</p>
      {description && (
        <p className="text-[10px] text-muted-foreground truncate">{description}</p>
      )}
    </div>
    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
  </NavLink>
);
