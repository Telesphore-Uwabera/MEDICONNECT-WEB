import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import {
  ArrowRight,
  Calendar,
  Stethoscope,
  Pill,
  Activity,
  Shield,
  Clock,
  ChevronRight,
  Zap,
  X,
} from "lucide-react";

import echo from "@/lib/echo";

import { Button } from "@/components/ui/button";
import { DoctorCard } from "@/components/DoctorCard";
import { HospitalCard } from "@/components/HospitalCard";

import { cn } from "@/lib/utils";

import { useTheme } from "@/context/ThemeContext";

import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";

import TopBar from "@/components/landing/TopBar";
import Navbar from "@/components/landing/Navbar";
import HeroCta from "@/components/landing/HeroCta";
import { useGetSearchHospitals } from "@/hooks/patient/use-patient-search-hospital";
import { useGetSearchDoctors } from "@/hooks/patient/use-patient-doctor";
import { QuickConsultPanel } from "./doctor/QuickConsultPanel";
import {
  SpecializationSelect,
  SpecializationValue,
} from "./patient/components/SpecializationSelect";
import { useGetPharmacyStats } from "@/hooks/pharmacy/use-pharmacy-dashboard";

// ─── Types (inline for self-containment) ──────────────────────────────────────

interface ApiDoctor {
  id: number;
  user_id: number;
  slug: string;
  specialization: string;
  doctor_degree: string;
  medical_license: string;
  designations: string;
  bio_en: string;
  consultation_fee: string;
  currency: string;
  is_available: boolean;
  instant_consultation: boolean;
  bookings_paused: boolean;
  consultation_type: "online" | "in_person" | "both";
  image: string | null;
  preferred_language: string;
  city: string | null;
  status: "active" | "inactive";
  is_active: boolean;
  is_featured: boolean;
  rating_avg: string;
  show_homepage: boolean;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
  hospitals: { id: number; name: string; city?: string }[];
  specializations: { id: number; name: string }[];
}

interface DoctorAvailabilityEvent {
  doctor_id: number;
  instant_consultation: boolean;
  bookings_paused: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDoctorImage = (d: ApiDoctor): string =>
  d.image ??
  d.user.avatar ??
  `https://ui-avatars.com/api/?name=${encodeURIComponent(d.user.name)}&background=0ea5e9&color=fff&size=600`;

const getDoctorName = (d: ApiDoctor): string =>
  d.designations?.trim() || d.user.name;

const getDoctorSpecialty = (d: ApiDoctor): string =>
  d.specializations?.[0]?.name ?? d.specialization ?? "General Practice";

const formatFee = (d: ApiDoctor): string => {
  const fee = parseFloat(d.consultation_fee);
  return fee === 0 ? "Free" : `${d.currency} ${fee.toLocaleString()}`;
};

const formatRating = (d: ApiDoctor): string | null => {
  const r = parseFloat(d.rating_avg);
  return r > 0 ? r.toFixed(1) : null;
};

// ─── Slider Skeleton ──────────────────────────────────────────────────────────

const SliderSkeleton = () => (
  <div className="absolute inset-0 bg-muted animate-pulse rounded-sm flex flex-col justify-end p-4 gap-2">
    <div className="h-4 w-2/3 rounded bg-muted-foreground/20" />
    <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
    <div className="h-3 w-1/3 rounded bg-muted-foreground/20" />
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Index = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { resolvedTheme, theme } = useTheme();
  const logo = (resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT;

  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Doctor filter state ─────────────────────────────────────────────────────
  const [doctorFilter, setDoctorFilter] = useState<"all" | "instant">("all");
  const [selectedSpecialization, setSelectedSpecialization] =
    useState<SpecializationValue>({ specialization: null, fee: null });
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  // ── Scroll to section on hash present (e.g. navigated from another page) ────
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const scrollToEl = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          return true;
        }
        return false;
      };

      // try immediately, then retry briefly in case content is still mounting
      if (!scrollToEl()) {
        const timeout = setTimeout(scrollToEl, 150);
        return () => clearTimeout(timeout);
      }
    }
  }, [location.hash]);

  // ── Build backend params ─────────────────────────────────────────────────────
  // FIX: useMemo now returns a stable object that changes identity only when
  // filter values actually change, ensuring useGetSearchDoctors re-fetches.

  const doctorSearchParams = useMemo(() => {
    const params: {
      instant?: boolean;
      language?: string;
      specialization?: string;
      specialization_fee_id?: number;
    } = {};

    if (doctorFilter === "instant") params.instant = true;
    if (selectedLanguage !== "all") params.language = selectedLanguage;

    if (selectedSpecialization.specialization) {
      params.specialization = selectedSpecialization.specialization.name;
      if (selectedSpecialization.fee?.id) {
        params.specialization_fee_id = selectedSpecialization.fee.id;
      }
    }

    return params;
  }, [doctorFilter, selectedLanguage, selectedSpecialization]);

  const { data: pharmacyStats } = useGetPharmacyStats();

  // ── All doctors (filtered via backend) ─────────────────────────────────────
  const { data: doctorsData, isLoading: doctorsLoading } =
    useGetSearchDoctors(doctorSearchParams);

  // ── Instant-only doctors (for the Quick Consult slider) ─────────────────────
  const { data: instantDoctorsData, isLoading: instantLoading } =
    useGetSearchDoctors({ instant: true });

  const { data: hospitalsData, isLoading: hospitalsLoading } =
    useGetSearchHospitals();

  // Filter to available instant doctors, max 4 slides
  const instantDoctors = useMemo<ApiDoctor[]>(
    () =>
      (instantDoctorsData?.data ?? [])
        .filter((d) => d.instant_consultation)
        .slice(0, 4),
    [instantDoctorsData],
  );

  // Reset slide index when data changes
  useEffect(() => {
    setActiveSlide(0);
  }, [instantDoctors.length]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = echo.channel("doctors.availability");

    channel.listen(".availability.changed", (data: DoctorAvailabilityEvent) => {
      console.log("Doctor availability changed:", data);
      queryClient.invalidateQueries({ queryKey: ["patient-search-doctors"] });
    });

    return () => {
      echo.leaveChannel("doctors.availability");
    };
  }, [queryClient]);

  const prevSlide = useCallback(() => {
    if (!instantDoctors.length) return;
    setActiveSlide(
      (p) => (p - 1 + instantDoctors.length) % instantDoctors.length,
    );
  }, [instantDoctors.length]);

  const nextSlide = useCallback(() => {
    if (!instantDoctors.length) return;
    setActiveSlide((p) => (p + 1) % instantDoctors.length);
  }, [instantDoctors.length]);

  // Auto-advance only when we have multiple slides
  useEffect(() => {
    if (instantDoctors.length <= 1) return;
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, [nextSlide, instantDoctors.length]);

  // ── Clear all filters helper ─────────────────────────────────────────────────
  const clearFilters = useCallback(() => {
    setDoctorFilter("all");
    setSelectedSpecialization({ specialization: null, fee: null });
    setSelectedLanguage("all");
  }, []);

  const hasActiveFilters =
    doctorFilter !== "all" ||
    !!selectedSpecialization.specialization ||
    selectedLanguage !== "all";

  // ── Static content ───────────────────────────────────────────────────────────

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

  const footerPlatformLinks = [
    { label: "Doctors", to: "/patient/search-doctors" },
    { label: "Hospitals", to: "/patient/search-facilities" },
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

  const footerSocials = [
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
    {
      label: "Facebook",
      path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-background">
      <TopBar />
      <Navbar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container py-6 lg:py-12 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-soft text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>
                {t("pages.landing.available_now_pill", { count: 147 })}
              </span>
            </div>
            <h1 className="mt-5 font-display text-[1.65rem] sm:text-3xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
              {t("pages.landing.hero_title_1")}{" "}
              <span className="text-primary">
                {t("pages.landing.hero_title_2")}
              </span>
            </h1>
            <p className="mt-4 text-sm text-muted-foreground max-w-lg leading-relaxed">
              {t("pages.landing.hero_subtitle")}
            </p>

            <HeroCta />

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
            <QuickConsultPanel
              doctors={instantDoctors}
              loading={instantLoading}
            />
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

      {/* ── Available Doctors Grid ── */}
      <section
        id="doctors"
        className="py-16 md:py-24 bg-gradient-soft border-t border-border"
      >
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {t("pages.landing.available_now")}
              </p>
              <h2 className="mt-3 font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                {t("pages.landing.doctors_ready")}
              </h2>

              {/* ── Filters ── */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {/* Type filter */}
                <div className="inline-flex items-center bg-card border border-border rounded-sm p-0.5">
                  <button
                    onClick={() => setDoctorFilter("all")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-sm transition-all",
                      doctorFilter === "all"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setDoctorFilter("instant")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-sm transition-all flex items-center gap-1",
                      doctorFilter === "instant"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Zap className="w-3 h-3" />
                    Instant only
                  </button>
                </div>

                {/* Specialization filter */}
                <div className="w-56">
                  <SpecializationSelect
                    value={selectedSpecialization}
                    onChange={setSelectedSpecialization}
                  />
                </div>

                {/* Language filter */}
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className={cn(
                      "appearance-none px-2.5 py-1.5 pr-7 text-[11px] bg-background border rounded-sm transition-all cursor-pointer outline-none",
                      selectedLanguage !== "all"
                        ? "border-primary/50 ring-1 ring-primary/20 text-foreground"
                        : "border-border/60 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <option value="all">Any language</option>
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="rw">Kinyarwanda</option>
                  </select>
                  <ChevronRight className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
            <Link to="/patient/search-doctors">
              <Button variant="outline" size="sm">
                {t("pages.landing.see_all_doctors")}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {doctorsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-sm border border-border bg-card p-3.5 shadow-sm space-y-2.5 animate-pulse"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="h-9 w-9 rounded-sm bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 rounded bg-muted" />
                        <div className="h-2.5 w-1/2 rounded bg-muted" />
                        <div className="h-2 w-1/3 rounded bg-muted" />
                      </div>
                      <div className="h-4 w-14 rounded-sm bg-muted shrink-0" />
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div
                          key={j}
                          className="flex flex-col items-center py-1.5 px-1 bg-muted/30 gap-1"
                        >
                          <div className="h-2 w-2 rounded-full bg-muted" />
                          <div className="h-2.5 w-8 rounded bg-muted" />
                          <div className="h-2 w-6 rounded bg-muted" />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 rounded-sm bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted" />
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-28 rounded bg-muted" />
                      <div className="flex gap-1.5">
                        <div className="h-6 w-12 rounded-sm bg-muted" />
                        <div className="h-6 w-16 rounded-sm bg-muted" />
                      </div>
                    </div>
                  </div>
                ))
              : doctorsData?.data
                  .slice(0, 6)
                  .map((d) => <DoctorCard key={d.id} doctor={d} />)}
          </div>

          {/* Empty state when filters return no results */}
          {!doctorsLoading && doctorsData?.data?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No doctors match your filters.{" "}
                <button
                  onClick={clearFilters}
                  className="text-primary hover:underline"
                >
                  Reset filters
                </button>
              </p>
            </div>
          )}
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
                {t("pages.landing.health_facility")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                {t("pages.landing.hospitals_sub")}
              </p>
            </div>
            <Link to="/patient/search-facilities">
              <Button variant="outline" size="sm">
                {t("pages.landing.see_all_hospitals")}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {hospitalsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-sm border border-border bg-card overflow-hidden animate-pulse"
                  >
                    <div className="px-3.5 py-1.5 bg-muted/60 border-b border-border flex items-center justify-between">
                      <div className="h-2.5 w-16 rounded bg-muted" />
                      <div className="h-2.5 w-12 rounded bg-muted" />
                    </div>
                    <div className="px-3.5 pt-3 pb-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-sm bg-muted shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-2/3 rounded bg-muted" />
                          <div className="h-2.5 w-1/2 rounded bg-muted" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
                        {Array.from({ length: 3 }).map((_, j) => (
                          <div
                            key={j}
                            className="flex flex-col items-center py-2 px-1 bg-muted/30 gap-1"
                          >
                            <div className="h-2 w-2 rounded-full bg-muted" />
                            <div className="h-2.5 w-10 rounded bg-muted" />
                            <div className="h-2 w-6 rounded bg-muted" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <div className="h-4 w-14 rounded-sm bg-muted" />
                        <div className="h-4 w-18 rounded-sm bg-muted" />
                      </div>
                      <div className="h-2.5 w-28 rounded bg-muted" />
                      <div className="flex gap-2">
                        <div className="h-7 flex-1 rounded-sm bg-muted" />
                        <div className="h-7 flex-1 rounded-sm bg-muted" />
                      </div>
                    </div>
                  </div>
                ))
              : hospitalsData?.data
                  ?.slice(0, 3)
                  .map((hospital) => (
                    <HospitalCard key={hospital.id} hospital={hospital} />
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
            <h2 className="mt-3 font-display text-2xl lg:text-4xl font-bold tracking-tight text-foreground">
              {t("pages.landing.pharmacy_title")}
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
              {t("pages.landing.pharmacy_sub")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/patient/search-pharmacy">
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
                {
                  v: pharmacyStats
                    ? `${pharmacyStats.summary.active_medicines}+`
                    : "—",
                  l: t("pages.landing.stat_products"),
                },
                {
                  v: pharmacyStats
                    ? `${pharmacyStats.summary.total_pharmacies}`
                    : "—",
                  l: t("pages.landing.stat_pharmacies"),
                },
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

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card">
        <div className="container py-10 md:py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 pb-10 border-b border-border">
            <div className="col-span-2 md:col-span-2 flex flex-col gap-4">
              <img
                src={logo}
                alt="MEDICONNECT"
                className="h-14 w-32 rounded-sm"
              />
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                {t("pages.landing.footer_desc")}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {footerSocials.map((s) => (
                  <a
                    key={s.label}
                    href="#"
                    aria-label={s.label}
                    className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Platform
              </p>
              <div className="flex flex-col gap-2">
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

            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                For
              </p>
              <div className="flex flex-col gap-2">
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

            <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Contact
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="mailto:support@mediconnect.com"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  support@mediconnect.com
                </a>

                <a
                  href="tel:+250788123456"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  +250 788 123 456
                </a>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />
                  <span className="text-[10px] text-muted-foreground">
                    All systems operational
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
            <span className="text-[10px] text-muted-foreground text-center sm:text-left">
              © {new Date().getFullYear()} MEDICONNECT. Bringing care to your
              fingertips.
            </span>
            <div className="flex items-center gap-4">
              {footerLegalLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
