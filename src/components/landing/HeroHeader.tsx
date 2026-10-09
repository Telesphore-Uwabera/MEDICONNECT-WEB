import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Search,
  X,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Calendar,
  Zap,
  Pill,
  Building2,
  Shield,
  Activity,
  ArrowRight,
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
import { doctorSearchForDisease, suggestDiseases } from "@/lib/disease-search";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetSearchHospitals } from "@/hooks/patient/use-patient-search-hospital";
import { localizedHospitalName } from "@/components/HospitalCard";

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
  const { t, i18n } = useTranslation();
  const { resolvedTheme, theme } = useTheme();
  const logo = settings?.app_logo_url || ((resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT);
  const appName = settings?.app_name || "MEDICONNECT";
  const location = useLocation();
  const navigate = useNavigate();
  const activeHash = activeSection ? `#${activeSection}` : location.hash || "#home";
  const menuRef = useRef<HTMLDivElement>(null);
  const quickAccessRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const [facilitySearchOpen, setFacilitySearchOpen] = useState(false);
  const [facilityQuery, setFacilityQuery] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const debouncedFacilityQuery = useDebounce(facilityQuery.trim(), 200);
  const hospitalSuggestions = useGetSearchHospitals(
    { q: debouncedFacilityQuery, per_page: 5 },
    facilitySearchOpen && debouncedFacilityQuery.length >= 2,
  );
  const searchSuggestions = [
    ...suggestDiseases(facilityQuery).flatMap((item) => {
      const path = doctorSearchForDisease(item.term);
      if (!path) return [];
      return [{
        key: `disease-${item.term}`,
        label: item.term,
        hint: `${item.specialization} · ${t("nav.doctors")}`,
        path,
      }];
    }),
    ...(hospitalSuggestions.data?.data ?? []).map((hospital) => {
      const label = localizedHospitalName(hospital, i18n.language);
      return {
        key: `facility-${hospital.id}`,
        label,
        hint: t("nav.hospitals"),
        path: `/patient/search-facilities?q=${encodeURIComponent(label)}`,
      };
    }),
  ];

  useEffect(() => {
    setActiveSuggestion(-1);
  }, [facilityQuery]);
  const [mobileQuickAccessOpen, setMobileQuickAccessOpen] = useState(false);
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
    { kind: "anchor", href: "#doctors", label: t("nav.available_doctors") },
    { kind: "anchor", href: "#specialities", label: t("pages.landing.our_services") },
    { kind: "anchor", href: "#healthfacilities", label: t("nav.hospitals") },
    { kind: "anchor", href: "#team", label: t("nav.team") },
  ];

  const quickAccessItems = [
    {
      label: t("pages.landing.book_appointment", {
        defaultValue: "Book Appointment",
      }),
      to: "/patient/search-doctors",
      icon: Calendar,
      color:
        "text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/50",
      description: t("pages.landing.book_appointment_desc", {
        defaultValue: "Find doctors and schedule a visit",
      }),
    },
    {
      label: t("pages.landing.f_instant_t", {
        defaultValue: "Instant Consultation",
      }),
      to: "/patient/search-doctors?instant=true",
      icon: Zap,
      color: "text-primary bg-primary/5 border-primary/20",
      description: t("pages.landing.instant_consult_desc", {
        defaultValue: "Connect with available doctors now",
      }),
    },
    {
      label: t("pages.landing.find_pharmacy", {
        defaultValue: "Find Pharmacy",
      }),
      to: "/patient/search-pharmacy",
      icon: Pill,
      color:
        "text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-900/50",
      description: t("pages.landing.find_pharmacy_desc", {
        defaultValue: "Verified pharmacies & medicines",
      }),
    },
    {
      label: t("pages.landing.find_hospital_health_facility", {
        defaultValue: "Health Facility",
      }),
      to: "/patient/search-facilities",
      icon: Building2,
      color:
        "text-violet-700 bg-violet-50 border-violet-100 dark:text-violet-300 dark:bg-violet-950/30 dark:border-violet-900/50",
      description: t("pages.landing.find_hospital_desc", {
        defaultValue: "Hospitals, clinics & centers",
      }),
    },
    {
      label: t("pages.landing.fitness_certificates_requests", {
        defaultValue: "Fitness Certificate",
      }),
      to: "/verify-certificate",
      icon: Shield,
      color:
        "text-teal-700 bg-teal-50 border-teal-100 dark:text-teal-300 dark:bg-teal-950/30 dark:border-teal-900/50",
      description: t("pages.landing.fitness_certificate_desc", {
        defaultValue: "Medical fitness certification",
      }),
    },
    {
      label: t("pages.landing.qa_health_articles", {
        defaultValue: "Need help?",
      }),
      to: "/help",
      icon: Activity,
      color:
        "text-orange-700 bg-orange-50 border-orange-100 dark:text-orange-300 dark:bg-orange-950/30 dark:border-orange-900/50",
      description: t("pages.landing.need_help_desc", {
        defaultValue: "Help center, guidance & support",
      }),
    },
  ];

  // ── Side effects ────────────────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (
        quickAccessRef.current &&
        !quickAccessRef.current.contains(e.target as Node)
      ) {
        setQuickAccessOpen(false);
      }
      const target = e.target as Node;
      const insideSearch =
        desktopSearchRef.current?.contains(target) ||
        mobileSearchRef.current?.contains(target);
      if (!insideSearch) {
        setFacilitySearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuickAccessOpen(false);
        setFacilitySearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setMobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setQuickAccessOpen(false);
    setFacilitySearchOpen(false);
  }, [location.pathname, location.hash, setMobileMenuOpen]);

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

  const closeFacilitySearch = () => {
    setFacilitySearchOpen(false);
    setFacilityQuery("");
    setActiveSuggestion(-1);
    setMobileMenuOpen(false);
  };

  const openSuggestion = (path: string) => {
    navigate(path);
    closeFacilitySearch();
  };

  const submitFacilitySearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const chosen = searchSuggestions[activeSuggestion];
    if (chosen) {
      openSuggestion(chosen.path);
      return;
    }
    const q = facilityQuery.trim();
    const diseasePath = q ? doctorSearchForDisease(q) : null;
    navigate(
      diseasePath
        ? diseasePath
        : q
          ? `/patient/search-facilities?q=${encodeURIComponent(q)}`
          : "/patient/search-facilities",
    );
    closeFacilitySearch();
  };

  const facilitySearch = (searchRef: React.RefObject<HTMLDivElement>) => (
    <div ref={searchRef} className="relative">
      <button
        type="button"
        aria-label={t("nav.search_facilities")}
        aria-expanded={facilitySearchOpen}
        onClick={() => {
          if (facilitySearchOpen && facilityQuery.trim()) {
            submitFacilitySearch();
            return;
          }
          setFacilitySearchOpen((open) => !open);
        }}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium transition-smooth",
          facilitySearchOpen
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <Search className="h-4 w-4" />
        <span>{t("nav.search")}</span>
      </button>
      {facilitySearchOpen && (
        <form
          onSubmit={submitFacilitySearch}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(320px,80vw)] rounded-xl border border-border bg-popover p-2 shadow-xl"
        >
          <p className="px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">
            {t("nav.search_hint")}
          </p>
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={(node) => {
                  if (node && node.offsetParent !== null) node.focus();
                }}
                type="search"
                value={facilityQuery}
                onChange={(event) => setFacilityQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveSuggestion((index) => Math.min(searchSuggestions.length - 1, index + 1));
                    return;
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveSuggestion((index) => Math.max(-1, index - 1));
                    return;
                  }
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  submitFacilitySearch();
                }}
                placeholder={t("pages.patient.hospitals_search_placeholder")}
                aria-label={t("nav.search_facilities")}
                aria-autocomplete="list"
                aria-expanded={searchSuggestions.length > 0}
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <button
              type="submit"
              className="h-10 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              {t("nav.search")}
            </button>
          </div>
          {searchSuggestions.length > 0 && (
            <ul className="mt-1.5 max-h-80 overflow-y-auto rounded-lg border border-border bg-background">
              {searchSuggestions.map((item, index) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSuggestion(index)}
                    onClick={() => openSuggestion(item.path)}
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2 text-left",
                      index === activeSuggestion ? "bg-accent" : "hover:bg-accent/70",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}
    </div>
  );

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
          {navLinks.slice(0, 2).map((l) => {
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

          {/* Quick Access Dropdown */}
          <div ref={quickAccessRef} className="relative">
            <button
              type="button"
              onClick={() => setQuickAccessOpen((prev) => !prev)}
              aria-expanded={quickAccessOpen}
              className={cn(
                "relative px-2.5 py-1.5 rounded-[6px] transition-smooth cursor-pointer whitespace-nowrap flex items-center gap-1",
                quickAccessOpen
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <span>{t("pages.landing.quick_access", { defaultValue: "Quick Access" })}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  quickAccessOpen && "rotate-180 text-primary",
                )}
              />
            </button>

            {quickAccessOpen && (
              <div
                role="menu"
                className="absolute top-[calc(100%+8px)] left-0 w-[300px] rounded-xl border border-border bg-popover/95 backdrop-blur-md shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="px-2.5 py-1.5 mb-1 border-b border-border/50">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("pages.landing.quick_access", { defaultValue: "Quick Access" })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {quickAccessItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setQuickAccessOpen(false)}
                        className="group flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/70 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                              item.color,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {item.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {navLinks.slice(2).map((l) => {
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
          {facilitySearch(desktopSearchRef)}
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
              <Link to={dashboardPath(user.active_role ?? user.role)}>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {t("common.dashboard", "Dashboard")}
                </Button>
              </Link>

              <Link
                to={dashboardPath(user.active_role ?? user.role)}
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
          {facilitySearch(mobileSearchRef)}
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-1">
            <LanguageSwitcher compact />
          </div>

          {user ? (
            <Link to={dashboardPath(user.active_role ?? user.role)} className="hidden min-[380px]:block">
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
                {navLinks.slice(0, 2).map((l) => {
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

                {/* Mobile Quick Access */}
                <div className="py-0.5">
                  <button
                    type="button"
                    onClick={() => setMobileQuickAccessOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between px-3 py-3 rounded-[6px] text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-primary/40" />
                      <span>{t("pages.landing.quick_access", { defaultValue: "Quick Access" })}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        mobileQuickAccessOpen && "rotate-180 text-primary",
                      )}
                    />
                  </button>

                  {mobileQuickAccessOpen && (
                    <div className="ml-4 pl-3 border-l border-border/60 my-1 flex flex-col gap-1">
                      {quickAccessItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.label}
                            to={item.to}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setMobileQuickAccessOpen(false);
                            }}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md hover:bg-muted/70 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                                  item.color,
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="text-xs font-medium text-foreground truncate">
                                {item.label}
                              </span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {navLinks.slice(2).map((l) => {
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
                      to={dashboardPath(user.active_role ?? user.role)}
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
