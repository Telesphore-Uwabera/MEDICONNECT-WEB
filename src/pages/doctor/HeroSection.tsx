import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Zap, ShieldCheck, Lock, Heart, Wifi, CalendarCheck } from "lucide-react";
import { HeroHeadline } from "@/components/landing/HeroHeadline";
import StartConsult from "@/components/landing/StartConsult";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { localizedText } from "@/lib/localized-settings";
import { useGetSearchDoctors, type ApiDoctor } from "@/hooks/patient/use-patient-doctor";
import { UnifiedModal } from "@/components/DoctorCard";
import { BookingDialog } from "@/components/BookingDialog";
import type { Doctor as CallDoctor } from "@/context/CallStore";

const HERO_PHOTO = "/images/Jul18202601_47_20JM.png";
const HERO_DOCTOR_ROTATE_MS = 6000;

const FEATURES = [
  { key: "hero_feature_seconds", fallback: "Consult in seconds", icon: Zap },
  { key: "hero_feature_licensed", fallback: "Licensed & verified doctors", icon: ShieldCheck },
  { key: "hero_feature_privacy", fallback: "Your privacy, our priority", icon: Lock },
] as const;

// ─── HeroSection ────────────────────────────────────────────────────────────

export default function HeroSection() {
  const { t, i18n } = useTranslation();
  const { data: publicSettings } = usePublicSettings();
  const heroTagline = localizedText(
    publicSettings?.general?.app_tagline,
    i18n.language,
    t("pages.landing.hero_intro"),
  );

  // Featured / active doctor for the circular photo on larger screens.
  const { data: doctorsData } = useGetSearchDoctors({ per_page: 6 });
  const heroDoctors = useMemo(() => {
    const list = doctorsData?.data ?? [];
    const withPhoto = (d: ApiDoctor) => Boolean(d.image || d.user?.avatar);
    const featured = list.filter((d) => (d.is_featured || d.show_homepage) && withPhoto(d));
    return (featured.length ? featured : list.filter(withPhoto)).slice(0, 5);
  }, [doctorsData]);

  const [activeDoctorIdx, setActiveDoctorIdx] = useState(0);
  // Paused while the visitor is hovering the photo, or while either modal it
  // opens is up — otherwise the doctor underneath could change mid-interaction.
  const [isPaused, setIsPaused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"details" | "connect">("details");
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    if (heroDoctors.length < 2 || isPaused || modalOpen || bookOpen) return;
    const id = window.setInterval(() => {
      setActiveDoctorIdx((i) => (i + 1) % heroDoctors.length);
    }, HERO_DOCTOR_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [heroDoctors.length, isPaused, modalOpen, bookOpen]);

  const activeDoctor = heroDoctors[activeDoctorIdx % heroDoctors.length] ?? null;
  const [doctorImgError, setDoctorImgError] = useState(false);
  useEffect(() => setDoctorImgError(false), [activeDoctor?.id]);

  const heroPhotoSrc =
    activeDoctor && !doctorImgError ? activeDoctor.image || activeDoctor.user?.avatar || HERO_PHOTO : HERO_PHOTO;

  const canConnect = Boolean(
    activeDoctor?.is_available && !activeDoctor?.bookings_paused && activeDoctor?.instant_consultation,
  );
  const canBook = Boolean(activeDoctor?.is_available && !activeDoctor?.bookings_paused);
  const callDoctor: CallDoctor | null = activeDoctor
    ? {
        id: activeDoctor.id,
        user: {
          id: activeDoctor.user.id,
          name: activeDoctor.user.name,
          avatar: activeDoctor.user.avatar,
        },
        specialization: activeDoctor.specialization,
      }
    : null;

  const handleHeroCta = () => {
    if (!activeDoctor) return;
    if (canConnect) {
      setModalMode("connect");
      setModalOpen(true);
    } else if (canBook) {
      setBookOpen(true);
    }
  };

  return (
    <div className="min-h-[540px] md:min-h-[560px] pt-12 md:pt-0 bg-background overflow-x-hidden relative">
      {/* Mobile-only background image — same artwork used as a full-bleed backdrop */}
      <div className="absolute inset-0 top-0 pointer-events-none md:hidden" aria-hidden="true">
        <img
          src={HERO_PHOTO}
          alt=""
          className="h-full w-full object-cover object-center opacity-45"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      {/* Soft hero lighting */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_82%_35%,hsl(var(--primary)/0.16),transparent_38%),radial-gradient(circle_at_14%_60%,hsl(var(--primary)/0.08),transparent_36%)]"
        aria-hidden="true"
      />
      {/* Diagonal lines background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.25]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, hsl(var(--accent)) 0 1px, transparent 1px 22px)",
        }}
      />

      <div className="relative">
        <section
          id="landing-page"
          className="container relative grid min-h-[540px] grid-cols-1 items-center gap-10 py-10 md:min-h-[560px] md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:py-14 lg:gap-14 lg:py-16"
        >
          {/* ── Text column ── */}
         <div className="relative z-10 mx-auto w-full max-w-[560px] text-left md:mx-0 md:max-w-none">
            <HeroHeadline />
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-muted-foreground sm:mt-4 sm:text-[15px]">
              {heroTagline}
            </p>

            {/* Feature bullets */}
                        <ul className="mt-5 flex flex-col items-start gap-2.5 sm:mt-6">
              {FEATURES.map(({ key, fallback, icon: Icon }) => (
                <li key={key} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {t(`pages.landing.${key}`, fallback)}
                  </span>
                </li>
              ))}
            </ul> 
            <StartConsult />
          </div>

          {/* ── Photo column ── */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-[380px] items-center justify-center md:flex lg:max-w-[440px]">
            <div className="absolute inset-0 rounded-full bg-primary/10" aria-hidden="true" />
            <div
              className="group relative z-10 h-[90%] w-[90%] rounded-full"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <img
                key={activeDoctor?.id ?? "static"}
                src={heroPhotoSrc}
                alt={activeDoctor ? activeDoctor.user?.name ?? "" : ""}
                className="h-full w-full rounded-full object-cover object-top shadow-xl ring-4 ring-background animate-in fade-in duration-500"
                loading="eager"
                onError={() => setDoctorImgError(true)}
              />

              {/* Connect / Book overlay — shown on hover, also pauses rotation */}
              {activeDoctor && (canConnect || canBook) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/45 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={handleHeroCta}
                    className="inline-flex scale-95 items-center gap-1.5 rounded-[6px] bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg transition-transform duration-200 group-hover:scale-100 hover:bg-primary/90"
                  >
                    {canConnect ? (
                      <>
                        <Wifi className="h-3.5 w-3.5" />
                        {t("pages.cards.connect", { defaultValue: "Connect" })}
                      </>
                    ) : (
                      <>
                        <CalendarCheck className="h-3.5 w-3.5" />
                        {t("pages.cards.book", { defaultValue: "Book" })}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            {/* Decorative dot grid */}
            <div
              className="absolute -top-2 right-2 z-20 h-16 w-16 opacity-40 lg:right-6"
              style={{
                backgroundImage:
                  "radial-gradient(hsl(var(--primary)) 1.5px, transparent 1.5px)",
                backgroundSize: "10px 10px",
              }}
              aria-hidden="true"
            />
            
            {/* Active doctor info chip */}
            {activeDoctor && (
              <div className="absolute bottom-2 left-1/2 z-20 flex max-w-[85%] -translate-x-1/2 items-center gap-2 rounded-[6px] border border-border bg-card/95 px-3.5 py-2 shadow-lg backdrop-blur">
                <div className="min-w-0 text-left">
                  <p className="truncate text-xs font-semibold leading-none text-foreground">
                    {activeDoctor.user?.name ?? ""}
                  </p>
                  {activeDoctor.specialization && (
                    <p className="mt-0.5 truncate text-[10px] leading-none text-muted-foreground">
                      {activeDoctor.specialization}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {activeDoctor && callDoctor && (
        <>
          <UnifiedModal
            doctor={activeDoctor}
            callDoctor={callDoctor}
            initialMode={modalMode}
            open={modalOpen}
            onMinimize={() => setModalOpen(false)}
            onCloseCompletely={() => setModalOpen(false)}
            onBook={() => setBookOpen(true)}
            canBook={canBook}
            canConnect={canConnect}
          />
          <BookingDialog
            doctor={activeDoctor}
            open={bookOpen}
            onOpenChange={setBookOpen}
          />
        </>
      )}
    </div>
  );
}
