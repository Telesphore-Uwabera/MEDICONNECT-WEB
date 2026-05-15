// export default Index;

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Calendar,
  Stethoscope,
  Pill,
  Hospital,
  Activity,
  Shield,
  Clock,
  Video,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { doctors } from "@/lib/mock-data";
import { hospitals } from "@/lib/hospital-store";
import { DoctorCard } from "@/components/DoctorCard";
import { HospitalCard } from "@/components/HospitalCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
// import logo from "@/assets/mediconnect-logo.png";
// LOGODARK
import LOGODARK from "@/assets/LOGODARK.png";
// LOGOLIGHT.png
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";
import { useTheme } from "@/context/ThemeContext";


const DOCTOR_IMAGES: Record<string, string> = {
  d1: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80",
  d2: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80",
  d3: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80",
  d4: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&q=80",
  d5: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&q=80",
  d6: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=600&q=80",
};

const getImageUrl = (d: { id: string; imageUrl?: string }) =>
  d.imageUrl ??
  DOCTOR_IMAGES[d.id] ??
  `https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80`;

const Index = () => {
  const { t } = useTranslation();
  const { resolvedTheme, theme } = useTheme();
const logo = (resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT;
  const location = useLocation();
  const activeHash = location.hash || "#features";

  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: "#features", label: t("pages.landing.what_we_do")},
    { href: "#doctors", label: t("nav.available_doctors") },
    { href: "#hospitals", label: t("nav.hospitals") },
    { href: "#pharmacy", label: t("nav.pharmacy") },
    { href: "#roles", label: t("nav.forYou") },
  ];

  const availableNow = useMemo(
    () => doctors.filter((d) => d.instantAvailable).slice(0, 4),
    [],
  );

  const prevSlide = useCallback(() => {
    setActiveSlide((p) => (p - 1 + availableNow.length) % availableNow.length);
  }, [availableNow.length]);

  const nextSlide = useCallback(() => {
    setActiveSlide((p) => (p + 1) % availableNow.length);
  }, [availableNow.length]);

  useEffect(() => {
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  // Close menu on route hash change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.hash]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const features = [
    {
      icon: Calendar,
      title: t("pages.landing.f_smart_booking_t"),
      desc: t("pages.landing.f_smart_booking_d"),
    },
    {
      icon: Activity,
      title: t("pages.landing.f_instant_t"),
      desc: t("pages.landing.f_instant_d"),
    },
    {
      icon: Stethoscope,
      title: t("pages.landing.f_records_t"),
      desc: t("pages.landing.f_records_d"),
    },
    {
      icon: Pill,
      title: t("pages.landing.f_pharmacy_t"),
      desc: t("pages.landing.f_pharmacy_d"),
    },
  ];

  const roles = [
    {
      icon: Stethoscope,
      title: t("pages.landing.patients"),
      desc: t("pages.landing.patients_d"),
      to: "/patient",
    },
    {
      icon: Activity,
      title: t("pages.landing.doctors"),
      desc: t("pages.landing.doctors_d"),
      to: "/doctor",
    },
    {
      icon: Hospital,
      title: t("pages.landing.hospitals"),
      desc: t("pages.landing.hospitals_d"),
      to: "/hospital",
    },
    {
      icon: Pill,
      title: t("pages.landing.pharmacies"),
      desc: t("pages.landing.pharmacies_d"),
      to: "/pharmacy",
    },
    {
      icon: ShieldCheck,
      title: t("admin.landing_tile.title"),
      desc: t("admin.landing_tile.desc"),
      to: "/admin",
    },
  ];

  const footerPlatformLinks = [
    { label: "Doctors", to: "/patient/doctors" },
    { label: "Hospitals", to: "/patient/hospitals" },
    { label: "Pharmacy", to: "/patient/pharmacy" },
    { label: "Sign in", to: "/auth" },
  ];

  const footerForLinks = [
    { label: "Patient", to: "/patient" },
    { label: "Doctor", to: "/doctor" },
    { label: "Hospital", to: "/hospital" },
    { label: "Pharmacy", to: "/pharmacy" },
    { label: "Admin", to: "/admin" },
  ];

  const footerLegalLinks = [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Cookies", href: "#" },
  ];

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Nav ── */}
      <header
        ref={menuRef}
        className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50"
      >
        <div className="container flex items-center justify-between py-1 md:py-1">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
       <img src={logo} alt="MEDICONNECT logo" className="h-12 w-auto rounded-sm" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            {navLinks.map((l) => {
              const active = activeHash === l.href;
              return (
                <a
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative px-3 py-2 rounded-sm transition-smooth",
                    active
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  {l.label}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                {t("common.signIn")}
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                {t("common.getStarted")}
              </Button>
            </Link>
          </div>

          {/* Mobile right: theme + lang + hamburger */}
          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
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
              {/* Nav links */}
              <nav className="container py-3 flex flex-col gap-0.5">
                {navLinks.map((l) => {
                  const active = activeHash === l.href;
                  return (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium transition-smooth",
                        active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                      )}
                    >
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                      {!active && <span className="h-1.5 w-1.5 shrink-0" />}
                      {l.label}
                    </a>
                  );
                })}
              </nav>

              {/* Divider */}
              <div className="border-t border-border mx-4" />

              {/* Auth buttons */}
              <div className="container py-4 flex flex-col gap-2">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full" size="sm">
                    {t("common.signIn")}
                  </Button>
                </Link>
                <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-primary hover:opacity-90"
                  >
                    {t("common.getStarted")}
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container py-6 lg:py-12 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-soft text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>
                {t("pages.landing.available_now_pill", { count: 147 })}
              </span>
            </div>

            {/* Heading — FIXED: smaller on mobile */}
            <h1 className="mt-5 font-display text-[1.65rem] sm:text-3xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
              {t("pages.landing.hero_title_1")}{" "}
              <span className="text-primary">
                {t("pages.landing.hero_title_2")}
              </span>
            </h1>
            <p className="mt-4 text-sm text-muted-foreground max-w-lg leading-relaxed">
              {t("pages.landing.hero_subtitle")}
            </p>
auth
            {/* CTA block */}
            <div className="mt-7 flex flex-col gap-3 max-w-sm">
              <Link to="/patient/search-doctors" className="w-full">
                <button className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-sm bg-white/15 shrink-0">
                      <Video className="h-4 w-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold leading-none">
                        {t("pages.landing.instant_cta")}
                      </p>
                      <p className="text-[11px] text-primary-foreground/70 mt-0.5">
                      {t("pages.landing.connect_under_minutes")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </Link>

              {/* FIXED: buttons no longer truncate */}
              <div className="grid grid-cols-2 gap-3">
                <Link to="/patient/search-doctors" className="group">
                  <button className="w-full flex items-center gap-2 px-3 py-3 rounded-sm border border-border bg-card hover:border-primary/40 hover:bg-accent transition-smooth">
                    <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-accent text-primary shrink-0">
                      <Stethoscope className="h-3.5 w-3.5" />
                    </span>
                    <div className="text-left">
                      <p className="text-[11px] font-semibold text-foreground leading-tight">
                        {t("pages.landing.browse_doctors")}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                        500+ specialists
                      </p>
                    </div>
                  </button>
                </Link>

                <Link to="/patient/search-hospitals" className="group">
                  <button className="w-full flex items-center gap-2 px-3 py-3 rounded-sm border border-border bg-card hover:border-primary/40 hover:bg-accent transition-smooth">
                    <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-accent text-primary shrink-0">
                      <Hospital className="h-3.5 w-3.5" />
                    </span>
                    <div className="text-left">
                      <p className="text-[11px] font-semibold text-foreground leading-tight">
                        {t("pages.landing.see_all_hospitals")}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                        Top-rated near you
                      </p>
                    </div>
                  </button>
                </Link>
              </div>
            </div>

            {/* Trust bar */}
            <div className="mt-7 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground">
                <Shield className="h-3 w-3 text-primary" />{" "}
                {t("pages.landing.security")}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground">
                <Clock className="h-3 w-3 text-primary" />{" "}
                {t("pages.landing.avg_response")}
              </div>
            </div>
          </motion.div>

          {/* ── Quick consult panel ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5"
          >
            <div className="rounded-sm bg-card dark:bg-secondary/30 border border-border p-6">
              {/* Panel header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {t("pages.landing.quick_panel_title")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("pages.landing.quick_panel_sub")}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-success/20 text-success text-xs font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  {t("pages.landing.live")}
                </span>
              </div>

              {/* Image slider */}
              <div
                className="relative rounded-sm overflow-hidden"
                style={{ aspectRatio: "4/3" }}
              >
                {availableNow.map((d, i) => (
                  <div
                    key={d.id}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-700",
                      i === activeSlide
                        ? "opacity-100 z-10"
                        : "opacity-0 z-0 pointer-events-none",
                    )}
                  >
                    <img
                      src={getImageUrl(d)}
                      alt={d.name}
                      className="w-full h-full object-cover"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm leading-tight truncate">
                          {d.name}
                        </p>
                        <p className="text-white/70 text-xs mt-0.5">
                          {d.specialty}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-yellow-400 text-xs leading-none">
                            ★★★★★
                          </span>
                          <span className="text-white/50 text-xs">4.9</span>
                          <span className="text-white/30 text-xs">·</span>
                          <span className="text-white/50 text-xs">
                            Available now
                          </span>
                        </div>
                      </div>
                      <button className="shrink-0 text-xs px-3 py-2 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-smooth font-medium">
                        {t("pages.landing.connect")}
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-smooth"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-smooth"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                  {availableNow.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === activeSlide
                          ? "w-5 bg-white"
                          : "w-1.5 bg-white/40 hover:bg-white/60",
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-5 pt-5 border-t border-border grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-base font-display font-bold tabular-nums text-foreground">
                    4.2m
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("pages.landing.avg_wait")}
                  </div>
                </div>
                <div>
                  <div className="text-base font-display font-bold tabular-nums text-foreground">
                    147
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("pages.landing.online")}
                  </div>
                </div>
                <div>
                  <div className="text-base font-display font-bold tabular-nums text-foreground">
                    8.9k
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("pages.landing.sessions")}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-16 md:py-24 border-t border-border">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("pages.landing.what_we_do")}
            </p>
            <h2 className="mt-3 font-display text-2xl lg:text-4xl font-bold tracking-tight text-foreground">
              {t("pages.landing.features_title")}
            </h2>
          </div>
          <div className="mt-10 md:mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-5 md:p-6 rounded-sm border border-border bg-card hover:shadow-medium transition-smooth"
              >
                <div className="h-10 w-10 rounded-sm bg-accent text-primary flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Available doctors ── */}
      <section
        id="doctors"
        className="py-16 md:py-24 bg-gradient-soft border-t border-border"
      >
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {t("pages.landing.available_now")}
              </p>
              <h2 className="mt-3 font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                {t("pages.landing.doctors_ready")}
              </h2>
            </div>
            <Link to="/patient/doctors">
              <Button variant="outline" size="sm">
                {t("pages.landing.see_all_doctors")}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {doctors.slice(0, 6).map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Hospitals ── */}
      <section id="hospitals" className="py-16 md:py-24 border-t border-border">
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {t("pages.landing.partner_network")}
              </p>
              <h2 className="mt-3 font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                {t("pages.landing.hospitals_near_you")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                {t("pages.landing.hospitals_sub")}
              </p>
            </div>
            <Link to="/patient/hospitals">
              <Button variant="outline" size="sm">
                {t("pages.landing.see_all_hospitals")}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {hospitals.slice(0, 3).map((h) => (
              <HospitalCard key={h.name} hospital={h} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pharmacy teaser ── */}
      <section
        id="pharmacy"
        className="py-16 md:py-24 bg-gradient-soft border-t border-border"
      >
        <div className="container grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("pages.landing.pharmacy_marketplace")}
            </p>
            {/* FIXED: smaller on mobile */}
            <h2 className="mt-3 font-display text-2xl lg:text-4xl font-bold tracking-tight text-foreground">
              {t("pages.landing.pharmacy_title")}
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
              {t("pages.landing.pharmacy_sub")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/patient/pharmacy">
                <Button
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90 shadow-medium"
                >
                  <Pill className="mr-2 h-4 w-4" />
                  {t("pages.landing.open_marketplace")}
                </Button>
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
              {[
                { v: "200+", l: t("pages.landing.stat_products") },
                { v: "4", l: t("pages.landing.stat_pharmacies") },
                { v: "<1h", l: t("pages.landing.stat_delivery") },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-sm border border-border bg-card p-4"
                >
                  <div className="font-display text-xl font-bold tabular-nums text-foreground">
                    {s.v}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-sm bg-card border border-border p-5">
            <div className="grid grid-cols-3 gap-2.5">
              {["💊", "🧴", "🌿", "💉", "👶", "🩹"].map((e, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-sm bg-accent flex items-center justify-center text-[2.5rem]"
                >
                  {e}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section id="roles" className="py-16 md:py-24 border-t border-border">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("pages.landing.for_everyone")}
            </p>
            <h2 className="mt-3 font-display text-2xl lg:text-4xl font-bold tracking-tight text-foreground">
              {t("pages.landing.roles_title")}
            </h2>
          </div>
          <div className="mt-10 md:mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {roles.map((r) => (
              <Link
                key={r.title}
                to={r.to}
                className="group p-5 md:p-6 rounded-sm border border-border bg-card hover:bg-secondary hover:border-primary/30 transition-smooth"
              >
                <div className="h-10 w-10 rounded-sm bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center mb-4 transition-smooth">
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {r.title}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground group-hover:text-foreground/70 leading-relaxed">
                  {r.desc}
                </p>
                <div className="mt-4 text-xs font-medium flex items-center gap-1 text-primary group-hover:text-primary">
                  {t("pages.landing.open_dashboard")}{" "}
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer — fully redesigned for mobile ── */}
      <footer className="border-t border-border bg-card">
        <div className="container py-6 md:py-5">

          {/* ── Brand row ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
           <img src={logo} alt="MEDICONNECT" className="h-6 w-auto shrink-0 rounded-sm" />
              <span className="text-[11px] text-muted-foreground hidden sm:block">
                Connecting patients, doctors, hospitals, and pharmacies
              </span>
            </div>
            {/* Social icons */}
            <div className="flex items-center gap-2">
              {[
                {
                  label: "Twitter",
                  path: "M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z",
                },
                {
                  label: "Instagram",
                  path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                },
                {
                  label: "LinkedIn",
                  path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z",
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="w-7 h-7 rounded-sm bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* ── Mobile: stacked link groups | Desktop: single row ── */}

          {/* Mobile layout (< md) */}
          <div className="md:hidden py-4 space-y-4 border-b border-border">
            {/* Platform */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Platform
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {footerPlatformLinks.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* For */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                For
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {footerForLinks.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Legal
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {footerLegalLinks.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Contact
              </p>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">support@mediconnect.com</span>
                <span className="text-xs text-muted-foreground">+250 788 123 456</span>
              </div>
            </div>
          </div>

          {/* Desktop layout (≥ md) — original single row */}
          <div className="hidden md:flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-3 border-b border-border text-[11px]">
            <span className="text-muted-foreground font-medium">Platform:</span>
            {footerPlatformLinks.map((l) => (
              <Link key={l.label} to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
            ))}
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-medium">For:</span>
            {footerForLinks.map((l) => (
              <Link key={l.label} to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
            ))}
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-medium">Legal:</span>
            {footerLegalLinks.map((l) => (
              <a key={l.label} href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
            ))}
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-medium">Contact:</span>
            <span className="text-muted-foreground">support@mediconnect.com</span>
            <span className="text-muted-foreground">+250 788 123 456</span>
          </div>

          {/* ── Copyright row ── */}
          <div className="flex items-center justify-between pt-4 gap-3 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              © {new Date().getFullYear()} MEDICONNECT. Bringing care to your fingertips.
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-muted-foreground">
                All systems operational
              </span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default Index;
