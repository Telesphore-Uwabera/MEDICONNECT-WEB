import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  BarChart3,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logo from "@/assets/mediconnect-logo.png";

interface Props {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: Props) => {
  const location = useLocation();
  const { t } = useTranslation();
  const items = [
    { to: "/admin", label: t("admin.nav.overview"), icon: LayoutDashboard },
    {
      to: "/admin/approvals",
      label: t("admin.nav.approvals"),
      icon: UserCheck,
    },
    { to: "/admin/users", label: t("admin.nav.users"), icon: Users },
    {
      to: "/admin/analytics",
      label: t("admin.nav.analytics"),
      icon: BarChart3,
    },
    {
      to: "/admin/moderation",
      label: t("admin.nav.moderation"),
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="min-h-dvh bg-background flex">
      <aside className="w-64 border-r border-border bg-card hidden lg:flex flex-col sticky top-0 h-dvh">
        <div className="p-5 border-b border-border flex items-start justify-between gap-2">
          <div>
            <NavLink to="/" className="flex items-center gap-2">
              <img src={logo} alt="MEDICONNECT" className="h-9 w-auto" />
            </NavLink>
            <p className="mt-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("admin.portal")}
            </p>
          </div>
          <LanguageSwitcher compact />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-smooth",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 min-w-0"
      >
        {children}
      </motion.main>
    </div>
  );
};
