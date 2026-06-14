import { useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { dashboardPath } from "@/lib/auth-store";
import { useMe, useLogout } from "@/hooks/useAuth";
import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";

interface NavbarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const Navbar = ({ mobileMenuOpen, setMobileMenuOpen }: NavbarProps) => {
  const { t } = useTranslation();
  const { resolvedTheme, theme } = useTheme();
  const logo = (resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT;
  const location = useLocation();
  const navigate = useNavigate();
  const activeHash = location.hash || "#features";
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: user } = useMe();
  const logout = useLogout();

  const navLinks = [
    { href: "#features", label: t("pages.landing.what_we_do") },
    { href: "#doctors", label: t("nav.available_doctors") },
    { href: "#hospitals", label: t("nav.hospitals") },
    { href: "#pharmacy", label: t("nav.pharmacy") },
    { href: "#roles", label: t("nav.forYou") },
  ];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  // Close on hash change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.hash, setMobileMenuOpen]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/auth"),
    });
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  /**
   * Navigates to home (if not already there) and scrolls to the
   * target section. If already on home, just scrolls.
   */
  const handleNavClick = (hash: string) => {
    const sectionId = hash.replace("#", "");

    if (location.pathname !== "/") {
      navigate("/" + hash);
      // Give the home page time to mount before scrolling
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
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

  return (
    <header
      ref={menuRef}
      className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50"
    >
      <div className="container flex items-center justify-between py-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="MEDICONNECT logo" className="h-12 w-auto rounded-sm" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
          {navLinks.map((l) => {
            const active = activeHash === l.href;
            return (
              <button
                key={l.href}
                onClick={() => handleNavClick(l.href)}
                className={cn(
                  "relative px-3 py-2 rounded-sm transition-smooth cursor-pointer",
                  active
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {l.label}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />

          {user ? (
            // ── Authenticated ──────────────────────────
            <div className="flex items-center gap-2">
              <Link to={dashboardPath(user.role)}>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {t("common.dashboard", "Dashboard")}
                </Button>
              </Link>

              {/* Avatar + name */}
              <Link
                to={dashboardPath(user.role)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm hover:bg-accent transition-colors"
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
            // ── Guest ──────────────────────────────────
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  {t("common.signIn")}
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                  {t("common.Register")}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile right: theme + lang + hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="ml-1 w-9 h-9 rounded-sm flex items-center justify-center text-foreground hover:bg-accent transition-smooth"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="md:hidden border-t border-border bg-background/95 backdrop-blur"
          >
            <nav className="container py-3 flex flex-col gap-0.5">
              {navLinks.map((l) => {
                const active = activeHash === l.href;
                return (
                  <button
                    key={l.href}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleNavClick(l.href);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium transition-smooth text-left",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        active ? "bg-primary" : ""
                      )}
                    />
                    {l.label}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-border mx-4" />

            <div className="container py-4 flex flex-col gap-2">
              {user ? (
                <>
                  {/* User info row */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm bg-muted/50 mb-1">
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
                      <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {user.email ?? user.phone}
                      </p>
                    </div>
                  </div>

                  <Link to={dashboardPath(user.role)} onClick={() => setMobileMenuOpen(false)}>
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
                  <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="sm" className="w-full bg-gradient-primary hover:opacity-90">
                      {t("common.Register")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
