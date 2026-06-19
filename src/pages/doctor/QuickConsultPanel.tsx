import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, Stethoscope, ChevronLeft, ChevronRight,
  Zap, Wifi, Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConnectDialog } from "@/components/ConnectDialog";
import { UnifiedModal } from "@/components/DoctorCard";
import { useCallStore } from "@/context/CallStore";
import type { Doctor } from "@/context/CallStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = "details" | "connect";

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
  user: { id: number; name: string; avatar: string | null };
  hospitals: { id: number; name: string; city?: string }[];
  specializations: { id: number; name: string }[];
}

interface QuickConsultPanelProps {
  doctors: ApiDoctor[];
  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDoctorImage = (d: ApiDoctor) =>
  d.image ??
  d.user.avatar ??
  `https://ui-avatars.com/api/?name=${encodeURIComponent(d.user.name)}&background=0ea5e9&color=fff&size=600`;

const getDoctorName  = (d: ApiDoctor) => d.designations?.trim() || d.user.name;
const getDoctorSpecialty = (d: ApiDoctor) =>
  d.specializations?.[0]?.name ?? d.specialization ?? "General Practice";

const formatFee = (d: ApiDoctor) => {
  const fee = parseFloat(d.consultation_fee);
  return fee === 0 ? "Free" : `${d.currency} ${fee.toLocaleString()}`;
};
const formatRating = (d: ApiDoctor) => {
  const r = parseFloat(d.rating_avg);
  return r > 0 ? r.toFixed(1) : null;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SliderSkeleton = () => (
  <div className="absolute inset-0 bg-muted animate-pulse rounded-sm flex flex-col justify-end p-4 gap-2">
    <div className="h-4 w-2/3 rounded bg-muted-foreground/20" />
    <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
    <div className="h-3 w-1/3 rounded bg-muted-foreground/20" />
  </div>
);

// ─── Slide ────────────────────────────────────────────────────────────────────
// Isolated per-slide component so each doctor's call state is independent.

function DoctorSlide({
  doctor,
  active,
  index,
}: {
  doctor: ApiDoctor;
  active: boolean;
  index: number;
}) {
  const { t, i18n } = useTranslation();
  const call = useCallStore();

  const name     = getDoctorName(doctor);
  const rating   = formatRating(doctor);
  const fee      = formatFee(doctor);

  // Matches DoctorCard's CallStore shape
  const callDoctor: Doctor = {
    id: doctor.id,
    user: {
      id:     doctor.user.id,
      name:   doctor.user.name,
      avatar: doctor.user.avatar,
    },
    specialization: doctor.specialization,
  };

  // Mirrors DoctorCard exactly
  const isThisDoctor     = call.doctor?.id === doctor.id;
  const isCallInProgress = isThisDoctor && call.phase !== "idle";
  const isConnected      = isThisDoctor && call.phase === "connected";
  const isMinimized      = isConnected && call.minimized;

  const canConnect = doctor.is_available && !doctor.bookings_paused && doctor.instant_consultation;
  const [modalOpen, setModalOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<ModalMode>("connect");

  const handleConnect = () => {
    if (!canConnect) return;
    setInitialMode("connect");
    setModalOpen(true);
  };

  const handleMinimize = () => {
    if (call.phase !== "idle") {
      call.setMinimized(true);
    }
    setModalOpen(false);
  };

  const handleCloseCompletely = () => {
    setModalOpen(false);
    if (isThisDoctor && call.phase !== "idle") {
      call.endCallCompletely();
    }
  };

  return (
    <>
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
        )}
      >
        {/* Doctor image */}
        <img
          src={getDoctorImage(doctor)}
          alt={name}
          className="w-full h-full object-cover"
          loading={index === 0 ? "eager" : "lazy"}
          onError={(e) => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff&size=600`;
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

        {/* Instant badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-semibold">
            <Zap className="h-2.5 w-2.5" />
            Instant
          </span>
        </div>

        {/* In-call overlay badge — mirrors DoctorCard's top-right status */}
        {isConnected && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              In call
            </span>
          </div>
        )}
        {!isConnected && isCallInProgress && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/90 text-white text-[10px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Connecting
            </span>
          </div>
        )}

        {/* Doctor info + connect button */}
        <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{name}</p>
            <p className="text-white/70 text-xs mt-0.5 truncate">{getDoctorSpecialty(doctor)}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {rating && (
                <>
                  <span className="text-yellow-400 text-xs">★</span>
                  <span className="text-white/80 text-xs">{rating}</span>
                  <span className="text-white/30 text-xs">·</span>
                </>
              )}
              <span className="text-white/80 text-xs font-medium">{fee}</span>
              {doctor.city && (
                <>
                  <span className="text-white/30 text-xs">·</span>
                  <span className="text-white/60 text-xs truncate max-w-[80px]">{doctor.city}</span>
                </>
              )}
            </div>
          </div>

          {/* Connect button — mirrors DoctorCard's connect button states */}
          <button
            onClick={handleConnect}
            disabled={!canConnect && !isCallInProgress}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm font-medium whitespace-nowrap transition-opacity",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              isMinimized
                ? "bg-emerald-500 hover:opacity-90 text-white"
                : isCallInProgress
                ? "bg-sky-500 hover:opacity-90 text-white"
                : "bg-primary hover:opacity-90 text-primary-foreground",
            )}
          >
            {isMinimized ? (
              <><Maximize2 className="h-3 w-3" />Resume</>
            ) : isCallInProgress ? (
              <><Wifi className="h-3 w-3" />Open</>
            ) : (
              <><Wifi className="h-3 w-3" />{t("pages.landing.connect")}</>
            )}
          </button>
        </div>
      </div>

      {/* UnifiedModal — opens when they click Connect on the slide */}
      <UnifiedModal
        doctor={doctor as any}
        callDoctor={callDoctor}
        initialMode={initialMode}
        open={modalOpen}
        onMinimize={handleMinimize}
        onCloseCompletely={handleCloseCompletely}
        onBook={() => {}}
        canBook={false}
        canConnect={canConnect}
      />
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const QuickConsultPanel = ({ doctors, loading }: QuickConsultPanelProps) => {
  const { t, i18n } = useTranslation();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => { setActiveSlide(0); }, [doctors.length]);

  const prevSlide = useCallback(() => {
    if (!doctors.length) return;
    setActiveSlide((p) => (p - 1 + doctors.length) % doctors.length);
  }, [doctors.length]);

  const nextSlide = useCallback(() => {
    if (!doctors.length) return;
    setActiveSlide((p) => (p + 1) % doctors.length);
  }, [doctors.length]);

  useEffect(() => {
    if (doctors.length <= 1) return;
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, [nextSlide, doctors.length]);

  return (
    <div className="rounded-sm bg-card dark:bg-secondary/30 border border-border p-6">
      {/* Header */}
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

      {/* Slider */}
      <div className="relative rounded-sm overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {loading && <SliderSkeleton />}

        {!loading && doctors.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/40 gap-3 p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No instant doctors available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Check back soon or browse all available doctors below
              </p>
            </div>
            <Link to="/patient/search-doctors">
              <Button size="sm" variant="outline">
                Browse Doctors <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Each slide is its own component so call state is per-doctor */}
        {doctors.map((d, i) => (
          <DoctorSlide
            key={d.id}
            doctor={d}
            active={i === activeSlide}
            index={i}
          />
        ))}

        {doctors.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Previous doctor"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-smooth"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next doctor"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-smooth"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {doctors.length > 1 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            {doctors.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setActiveSlide(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === activeSlide ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-5 pt-5 border-t border-border grid grid-cols-3 gap-4 text-center">
        {[
          { v: "4.2m", l: t("pages.landing.avg_wait") },
          { v: "147", l: t("pages.landing.online") },
          { v: "8.9k", l: t("pages.landing.sessions") },
        ].map((s) => (
          <div key={s.l}>
            <div className="text-base font-display font-bold tabular-nums text-foreground">{s.v}</div>
            <div className="text-[11px] text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
