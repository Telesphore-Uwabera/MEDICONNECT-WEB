import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  BarChart3,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logo from "@/assets/mediconnect-logo.png";

interface Props {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: Props) => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 0 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className="border-r border-border bg-card hidden lg:flex flex-col sticky top-0 h-dvh shrink-0 overflow-hidden"
      >
        <div className="w-64 h-full flex flex-col">
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-smooth",
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
        </div>
      </motion.aside>

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 min-w-0 relative"
      >
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          className={cn(
            "hidden lg:flex fixed top-0 left-0 z-[9999] h-16 w-16 items-center justify-center rounded-full hover:bg-sidebar-accent text-primary",
            sidebarOpen ? "left-[202px]" : "left-0",
          )}
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
        {children}
      </motion.main>
    </div>
  );
};
