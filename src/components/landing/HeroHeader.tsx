import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { dashboardPath } from "@/lib/auth-store";
import { useMe, useLogout } from "@/hooks/useAuth";
import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";
import type { PublicGeneralSettings } from "@/hooks/use-public-settings"; 
import {
  SpecializationSelect,
  SpecializationValue,
} from "@/pages/patient/components/SpecializationSelect";

interface HeroHeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  activeSection?: string;
  settings?: PublicGeneralSettings;
}

export function HeroHeader({
  mobileMenuOpen,
  setMobileMenuOpen,
  activeSection,
  settings,
}: HeroHeaderProps) {
  const { t } = useTranslation();
  const { resolvedTheme, theme } = useTheme();
  const logo = settings?.app_logo_url || ((resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT);
  const appName = settings?.app_name || "MEDICONNECT";
  const location = useLocation();
  const navigate = useNavigate();
  const activeHash = activeSection ? `#${activeSection}` : location.hash || "#home";
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedSpecialization, setSelectedSpecialization] =
    useState<SpecializationValue>({ specialization: null, fee: null });
  const { data: user } = useMe();
  const logout = useLogout();

  // ── Sticky scroll state ──────────────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); 

  const navLinks: Array<
    | { kind: "anchor"; href: string; label: string }
    | { kind: "route"; to: string; label: string }
  > = [
    { kind: "anchor", href: "#home", label: t("pages.landing.home") },
    { kind: "anchor", href: "#specialities", label: t("pages.landing.our_services") },
    { kind: "anchor", href: "#doctors", label: t("nav.available_doctors") },
    { kind: "anchor", href: "#hospitals", label: t("nav.hospitals") },
    { kind: "anchor", href: "#team", label: t("nav.team") },
  ];

  // ── Side effects ────────────────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.hash, setMobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/auth"),
    });
  };

  const handleNavClick = (hash: string) => {
    const sectionId = hash.replace("#", "");
    if (location.pathname !== "/") {
      navigate("/" + hash);
      setTimeout(() => {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, "", hash);
      } else {
        window.location.hash = hash;
      }
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <header
      ref={menuRef}
      className={cn(
        "top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "fixed bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
          : "relative bg-transparent",
      )}
    >
      {/* ── Navbar row ── */}
      <div className="px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-2 py-1.5">

        {/* Logo */} 
        <div className="flex items-center gap-2 lg:shrink-0">
          <Link to="/#home" className="flex items-center gap-2">
            <img src={logo} alt={appName} className="h-9 w-auto lg:h-10" />
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-medium shrink-0">
          {navLinks.map((l) => {
            const active =
              l.kind === "anchor" ? activeHash === l.href : location.pathname === l.to;
            const key = l.kind === "anchor" ? l.href : l.to;
            const className = cn(
              "relative px-2.5 py-1.5 rounded-[6px] transition-smooth cursor-pointer whitespace-nowrap",
              active
                ? "text-foreground bg-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            );
            const content = (
              <>
                {l.label}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
                )}
              </>
            );
            return l.kind === "anchor" ? (
              <button key={key} onClick={() => handleNavClick(l.href)} className={className}>
                {content}
              </button>
            ) : (
              <Link key={key} to={l.to} className={className}>
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Specialization search — desktop */}
        {/* <div
          className="hidden lg:block lg:flex-1 lg:max-w-[260px] xl:max-w-[320px]"
          style={{
            ["--spec-dropdown-width" as string]: "420px",
          }}
        >
          <div className="[&_button]:!h-10 [&_input]:!h-10 [&_[role=combobox]]:!h-10 [&_[data-radix-popper-content-wrapper]]:!min-w-[420px] [&_[data-radix-select-content]]:!min-w-[420px] [&_.spec-dropdown]:!min-w-[420px]">
            <SpecializationSelect
              value={selectedSpecialization}
              onChange={setSelectedSpecialization}
            />
          </div>
        </div> */}

        {/* Desktop right actions */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <LanguageSwitcher />

          {user ? (
            <div className="flex items-center gap-2">
              <Link to={dashboardPath(user.role)}>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {t("common.dashboard", "Dashboard")}
                </Button>
              </Link>

              <Link
                to={dashboardPath(user.role)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] hover:bg-accent transition-colors"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {getInitials(user.name)}
                  </div>
                )}
                <span className="text-xs font-medium text-foreground max-w-[100px] truncate">
                  {user.name.split(" ")[0]}
                </span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={logout.isPending}
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t("common.signOut", "Sign out")}
              </Button>
            </div>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  {t("common.signIn")}
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                  {t("common.SignUp")}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile/tablet: auth actions + hamburger */}
        <div className="flex lg:hidden items-center gap-1 shrink-0">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-1">
            <LanguageSwitcher compact />
          </div>

          {user ? (
            <Link to={dashboardPath(user.role)} className="hidden min-[380px]:block">
              <Button variant="ghost" size="sm" className="h-9 px-2 text-xs">
                {t("common.dashboard", "Dashboard")}
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-1">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="h-9 px-2 text-xs">
                  {t("common.signIn")}
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="h-9 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 sm:px-3">
                  {t("common.Register")}
                </Button>
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileMenuOpen}
            className="ml-1 h-9 w-9 shrink-0 rounded-[6px] flex items-center justify-center text-foreground hover:bg-accent transition-smooth"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile/tablet drawer — slides down from top ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
            className="lg:hidden border-t border-border bg-background/95 backdrop-blur-sm"
          >
            <div className="max-h-[calc(100vh-56px)] overflow-y-auto">

              {/* Specialization search */}
              <div className="px-4 sm:px-6 pt-3 pb-1 [&_button]:!h-10 [&_input]:!h-10 [&_[role=combobox]]:!h-10 [&_[data-radix-popper-content-wrapper]]:!min-w-[min(420px,90vw)] [&_[data-radix-select-content]]:!min-w-[min(420px,90vw)] [&_.spec-dropdown]:!min-w-[min(420px,90vw)]">
                <SpecializationSelect
                  value={selectedSpecialization}
                  onChange={setSelectedSpecialization}
                />
              </div>

              <nav className="px-4 sm:px-6 py-2 flex flex-col gap-0.5">
                {navLinks.map((l) => {
                  const active =
                    l.kind === "anchor" ? activeHash === l.href : location.pathname === l.to;
                  const key = l.kind === "anchor" ? l.href : l.to;
                  const className = cn(
                    "flex items-center gap-3 px-3 py-3 rounded-[6px] text-sm font-medium transition-smooth text-left",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  );
                  const dot = (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        active ? "bg-primary" : "",
                      )}
                    />
                  );
return l.kind === "anchor" ? (
                    <button
                      key={key}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        // Wait for the drawer's exit animation + body
                        // scroll-lock release before scrolling, otherwise
                        // scrollIntoView silently no-ops.
                        setTimeout(() => handleNavClick(l.href), 260);
                      }}
                      className={className}
                    >
                      {dot}
                      {l.label}
                    </button>
                  ) : (
                    <Link
                      key={key}
                      to={l.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={className}
                    >
                      {dot}
                      {l.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Language switcher — top bar only shows it from sm up */}
              <div className="px-4 sm:px-6 pb-2 flex items-center gap-1 sm:hidden">
                <LanguageSwitcher />
              </div>

              <div className="border-t border-border mx-4 sm:mx-6" />

              <div className="px-4 sm:px-6 py-4 flex flex-col gap-2">
                {user ? (
                  <>
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] bg-muted/50 mb-1">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                          {getInitials(user.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {user.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {user.email ?? user.phone}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={dashboardPath(user.role)}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        className="w-full bg-primary text-primary-foreground text-xs gap-1.5"
                        size="sm"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        {t("common.dashboard", "Dashboard")}
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      disabled={logout.isPending}
                      className="w-full text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t("common.signOut", "Sign out")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full" size="sm">
                        {t("common.signIn")}
                      </Button>
                    </Link>
                    <Link
                      to="/auth?mode=signup"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        size="sm"
                        className="w-full bg-gradient-primary hover:opacity-90"
                      >
                        {t("common.Register")}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
