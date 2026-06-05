import { ReactNode, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell, Search, Settings, LogOut, User, ChevronDown, HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useMe, useLogout } from "@/hooks/useAuth";
import { dashboardPath } from "@/lib/auth-store";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  notificationCount?: number;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const ROLE_LABELS: Record<string, string> = {
  patient: "Patient",
  doctor: "Doctor",
  hospital: "Hospital",
  pharmacy: "Pharmacy",
};

export const PageHeader = ({
  title,
  subtitle,
  actions,
  notificationCount = 3,
}: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: user, isLoading } = useMe();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/auth"),
    });
  };

  // Derived display values
  const displayName = user?.name ?? "—";
  const displayEmail = user?.email ?? user?.phone ?? "";
  const displayRole = ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? "";
  const displayInitials = user?.name ? getInitials(user.name) : "?";

  // Typed role — never falls back to "" which would break dashboardPath
  const userRole = user?.role ?? null;

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-20">
      <div className="px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-foreground truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <div className={cn(
            "relative hidden md:flex items-center transition-all duration-300",
            searchFocused ? "w-64" : "w-48",
          )}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("pages.header.search")}
              className="pl-9 pr-4 h-9 text-sm rounded-sm border-transparent bg-secondary focus:bg-background focus:border-primary/30 transition-all shadow-sm"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>

          {actions}
          <ThemeToggle />
          <LanguageSwitcher />

          {/* Bell */}
          <button className="relative p-2.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card animate-pulse" />
            )}
          </button>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className={cn(
                "flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-sm transition-all border",
                profileOpen
                  ? "bg-secondary border-border text-foreground"
                  : "border-transparent hover:bg-secondary hover:border-border/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {/* Avatar */}
              {isLoading ? (
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              ) : user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/20"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold ring-1 ring-primary/20">
                  {displayInitials}
                </div>
              )}

              {/* Name + role (desktop) */}
              <div className="hidden sm:block text-left">
                {isLoading ? (
                  <div className="space-y-1">
                    <div className="h-2.5 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-2 w-12 bg-muted animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-foreground leading-tight">
                      {displayName.split(" ")[0]}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight capitalize">
                      {displayRole}
                    </p>
                  </>
                )}
              </div>

              <ChevronDown className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                profileOpen && "rotate-180",
              )} />
            </button>

            {/* Popover */}
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 z-20 bg-card border border-border rounded-md shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">

                  {/* User info */}
                  <div className="px-4 py-4 border-b border-border bg-secondary/30">
                    <div className="flex items-center gap-3">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={displayName}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold ring-2 ring-primary/20 shrink-0">
                          {displayInitials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {displayEmail}
                        </p>
                      </div>
                    </div>

                    {/* Role badge */}
                    {displayRole && (
                      <span className="mt-2.5 inline-flex items-center px-2 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] font-semibold capitalize">
                        {displayRole}
                      </span>
                    )}

                    {/* Verified badge */}
                    {user?.is_verified && (
                      <span className="mt-2.5 ml-1.5 inline-flex items-center px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  {/* Menu items */}
                  <div className="p-2 space-y-0.5">
                    <PopItem
                      icon={User}
                      label={t("header.profile")}
                      to={userRole ? `${dashboardPath(userRole)}/profile` : "#"}
                      onClick={() => setProfileOpen(false)}
                    />
                    <PopItem
                      icon={Settings}
                      label={t("header.settings")}
                      to={userRole ? `${dashboardPath(userRole)}/settings` : "#"}
                      onClick={() => setProfileOpen(false)}
                    />
                    <PopItem
                      icon={HelpCircle}
                      label={t("header.help")}
                      to="./help"
                      onClick={() => setProfileOpen(false)}
                    />
                  </div>

                  {/* Sign out */}
                  <div className="p-2 border-t border-border">
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      disabled={logout.isPending}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {logout.isPending ? t("common.signing_out", "Signing out…") : t("header.signOut")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const PopItem = ({
  icon: Icon,
  label,
  to,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  to: string;
  onClick: () => void;
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium"
  >
    <Icon className="h-4 w-4" />
    {label}
  </NavLink>
);
