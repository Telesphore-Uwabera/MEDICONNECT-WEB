import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileText,
  GraduationCap,
  HeartPulse,
  Lock,
  Menu,
  Phone,
  Pill,
  Play,
  ShieldCheck,
  Star,
  Stethoscope,
  Truck,
  UserRound,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { dashboardPath } from "@/lib/auth-store";
import { localizedText } from "@/lib/localized-settings";
import { useMe } from "@/hooks/useAuth";
import {
  useInfiniteSearchDoctors,
  type ApiDoctor,
} from "@/hooks/patient/use-patient-doctor";
import {
  usePublicSettings,
  usePublicUserStats,
} from "@/hooks/use-public-settings";

import LOGOLIGHT from "@/assets/LOGOLIGHT.png"; 
import docDavid from "@/assets/doc-david.png";
import docJohn from "@/assets/doc-john.png";
import docSarah from "@/assets/doc-sarah.png";
import TopBar from "@/components/landing/TopBar";
import Navbar from "@/components/landing/Navbar";
import HeroCta from "@/components/landing/HeroCta";
import { HeroHeader } from "@/components/landing/HeroHeader";
import Footer from "@/components/landing/Footer";
import OurTeam from "@/components/landing/Ourteam";

const fallbackDoctors = [
  {
    name: "Dr. Jean Bosco Nsekuye",
    specialtyKey: "pages.landing.specialty_general_physician",
    specialtyDefault: "General Physician",
    image: docDavid,
    rating: "4.9",
    reviews: "120",
    facility: "Rwinkwavu Hospital",
  },
  {
    name: "Dr. Aline Mukamana",
    specialtyKey: "pages.landing.specialty_pediatrician",
    specialtyDefault: "Pediatrician",
    image: docSarah,
    rating: "4.8",
    reviews: "98",
    facility: "Kigali Clinic",
  },
  {
    name: "Dr. Eric Niyonzima",
    specialtyKey: "pages.landing.specialty_cardiologist",
    specialtyDefault: "Cardiologist",
    image: docJohn,
    rating: "4.9",
    reviews: "110",
    facility: "King Faisal Hospital",
  },
  {
    name: "Dr. Solange Uwase",
    specialtyKey: "pages.landing.specialty_gynecologist",
    specialtyDefault: "Gynecologist",
    image: docSarah,
    rating: "4.8",
    reviews: "90",
    facility: "CHUK",
  },
  {
    name: "Dr. Patrick Habimana",
    specialtyKey: "pages.landing.specialty_dermatologist",
    specialtyDefault: "Dermatologist",
    image: docDavid,
    rating: "4.9",
    reviews: "88",
    facility: "Kibagabaga Hospital",
  },
  {
    name: "Dr. Grace Umutoni",
    specialtyKey: "pages.landing.specialty_psychiatrist",
    specialtyDefault: "Psychiatrist",
    image: docSarah,
    rating: "4.8",
    reviews: "76",
    facility: "MediConnect",
  },
];

const services = [
  {
    key: "virtual",
    titleKey: "pages.landing.service_virtual_title",
    textKey: "pages.landing.service_virtual_text",
    titleDefault: "Virtual Consultation",
    textDefault: "Consult licensed doctors instantly by video, voice, or chat from anywhere.",
  },
  {
    key: "delivery",
    titleKey: "pages.landing.service_delivery_title",
    textKey: "pages.landing.service_delivery_text",
    titleDefault: "Home Medical Delivery",
    textDefault: "Get prescribed medicines delivered safely to your doorstep.",
  },
  {
    key: "prescription",
    titleKey: "pages.landing.service_prescription_title",
    textKey: "pages.landing.service_prescription_text",
    titleDefault: "Electronic Prescriptions",
    textDefault: "Receive secure digital prescriptions instantly after your consultation.",
  },
  {
    key: "certificate",
    titleKey: "pages.landing.service_certificate_title",
    textKey: "pages.landing.service_certificate_text",
    titleDefault: "Fitness Certificates",
    textDefault: "Get medical fitness certificates for work, school, sports, or travel.",
  },
  {
    key: "education",
    titleKey: "pages.landing.service_education_title",
    textKey: "pages.landing.service_education_text",
    titleDefault: "Health Education",
    textDefault: "Access trusted articles, videos, and expert health advice.",
  },
];

const faqs = [
  {
    questionKey: "pages.landing.faq_consultation_cost_q",
    questionDefault: "How much is a consultation?",
    answerKey: "pages.landing.faq_consultation_cost_a",
    answerDefault:
      "Consultation fees depend on the doctor and service type. You can see the fee before booking or starting an instant consultation.",
  },
  {
    questionKey: "pages.landing.faq_medicine_home_q",
    questionDefault: "Can I receive medicine at home?",
    answerKey: "pages.landing.faq_medicine_home_a",
    answerDefault:
      "Yes. Prescriptions can be sent to registered pharmacies, and delivery availability depends on the pharmacy and your location.",
  },
  {
    questionKey: "pages.landing.faq_prescriptions_q",
    questionDefault: "Are prescriptions accepted by pharmacies?",
    answerKey: "pages.landing.faq_prescriptions_a",
    answerDefault:
      "Digital prescriptions issued through MediConnect can be shared with participating pharmacies for fulfillment.",
  },
  {
    questionKey: "pages.landing.faq_medication_time_q",
    questionDefault: "How long does it take to receive medication?",
    answerKey: "pages.landing.faq_medication_time_a",
    answerDefault:
      "Delivery time varies by pharmacy, stock availability, and distance. The pharmacy confirms the expected time after receiving your request.",
  },
  {
    questionKey: "pages.landing.faq_specialists_q",
    questionDefault: "Can I consult specialists?",
    answerKey: "pages.landing.faq_specialists_a",
    answerDefault:
      "Yes. You can browse available specialists and book a scheduled appointment or choose an available instant consultation doctor.",
  },
];

function getDoctorImage(doctor: ApiDoctor): string {
  return (
    doctor.image ??
    doctor.user?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.user?.name ?? "Doctor")}&background=0f9f91&color=fff&size=240`
  );
}

function getDoctorName(doctor: ApiDoctor): string {
  return doctor.designations?.trim() || doctor.user?.name || "Doctor";
}

function getDoctorSpecialty(doctor: ApiDoctor): string | undefined {
  return doctor.specializations?.[0]?.name ?? doctor.specialization ?? undefined;
}

function getDoctorRating(doctor: ApiDoctor): string {
  const rating = Number.parseFloat(doctor.rating_avg ?? "0");
  return rating > 0 ? rating.toFixed(1) : "4.8";
}

function ServiceIllustration({ type }: { type: string }) {
  const iconClass = "text-teal-700 dark:text-teal-400";
  return (
    <div className="relative mx-auto h-20 w-24">
      <div className="absolute inset-x-3 bottom-1 h-12 rounded-[10px]  ring-1 ring-teal-100  dark:ring-teal-900/50" />
      {type === "virtual" && (
        <>
          <div className="absolute left-3 top-2 h-12 w-16 rounded-[6px] border-2 border-teal-700 bg-white shadow-sm dark:border-teal-500 dark:bg-card">
            <UserRound className={`mx-auto mt-2 h-6 w-6 ${iconClass}`} />
          </div>
          <Video className="absolute bottom-2 right-3 h-7 w-7 rounded-full bg-teal-700 p-1.5 text-white dark:bg-teal-600" />
        </>
      )}
      {type === "delivery" && (
        <>
          <Truck
            className="absolute left-3 top-5 h-12 w-12 text-teal-700 dark:text-teal-400"
            strokeWidth={1.8}
          />
          <Pill className="absolute right-4 top-2 h-7 w-7 rotate-12 rounded-full bg-white p-1 text-teal-700 shadow-sm dark:bg-card dark:text-teal-400" />
        </>
      )}
      {type === "prescription" && (
        <>
          <div className="absolute left-7 top-1 h-16 w-12 rounded-[5px] border-2 border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <span className="absolute left-3 top-5 text-xl font-black text-teal-700 dark:text-teal-400">
              Rx
            </span>
            <span className="absolute bottom-3 left-2 h-0.5 w-8 rounded bg-slate-300 dark:bg-slate-600" />
          </div>
          <CheckCircle2 className="absolute bottom-2 right-5 h-6 w-6 rounded-full bg-teal-700 p-1 text-white dark:bg-teal-600" />
        </>
      )}
      {type === "certificate" && (
        <>
          <FileCheck2
            className="absolute left-7 top-1 h-16 w-14 text-teal-700 dark:text-teal-400"
            strokeWidth={1.7}
          />
          <HeartPulse className="absolute bottom-2 right-3 h-7 w-7 rounded-full bg-white p-1 text-teal-700 shadow-sm dark:bg-card dark:text-teal-400" />
        </>
      )}
      {type === "education" && (
        <>
          <BookOpen
            className="absolute left-5 top-6 h-12 w-14 text-teal-700 dark:text-teal-400"
            strokeWidth={1.7}
          />
          <GraduationCap className="absolute left-8 top-0 h-9 w-9 text-teal-500 dark:text-teal-400" />
        </>
      )}
    </div>
  );
}

function StoreBadge({ store }: { store: "google" | "apple" }) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex min-w-[138px] items-center gap-2 rounded-[8px] bg-slate-950 px-3 py-2 text-white shadow-sm">
      {store === "google" ? (
        <Play className="h-6 w-6 fill-white" />
      ) : (
        <Phone className="h-6 w-6" />
      )}
      <span className="leading-tight">
        <span className="block text-[9px] font-semibold uppercase text-white/70">
          {store === "google" ? t("pages.landing.store_google_prefix", { defaultValue: "Get it on" }) : t("pages.landing.store_apple_prefix", { defaultValue: "Download on the" })}
        </span>
        <span className="block text-sm font-black">
          {store === "google" ? t("pages.landing.google_play", { defaultValue: "Google Play" }) : t("pages.landing.app_store", { defaultValue: "App Store" })}
        </span>
      </span>
    </span>
  );
}

const Index = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("doctors");
  const [testimonialPage, setTestimonialPage] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { data: user } = useMe();
  const { data: publicSettings } = usePublicSettings();
  const { data: userStats } = usePublicUserStats();
  const { data: doctorsData, isLoading: doctorsLoading } =
    useInfiniteSearchDoctors({ per_page: 6 });

  const publicPayload = publicSettings as any;
  const generalSettings =
    publicPayload?.general ?? publicPayload?.settings ?? publicPayload ?? {};
  const logo = generalSettings?.app_logo_url || LOGOLIGHT;
  const appName = generalSettings?.app_name || "MediConnect";
  const appTagline = localizedText(
    generalSettings?.app_tagline,
    i18n.language,
    "Rwanda's trusted digital healthcare platform.",
  );

  const doctors = useMemo(
    () => doctorsData?.pages.flatMap((page) => page.data).slice(0, 6) ?? [],
    [doctorsData],
  );
  const displayDoctors = doctors.length > 0 ? doctors : fallbackDoctors;

  const testimonialPages = useMemo(
    () => [
      [
        {
          quote: t("pages.landing.testimonial_1", { defaultValue: "I consulted a doctor without leaving home and received my prescription in minutes." }),
          city: "Kigali",
        },
        {
          quote: t("pages.landing.testimonial_2", { defaultValue: "Medication was delivered the same day. Very convenient!" }),
          city: "Musanze",
        },
      ],
      [
        {
          quote: t("pages.landing.testimonial_3", { defaultValue: "The appointment was easy to book and the doctor explained everything clearly." }),
          city: "Huye",
        },
        {
          quote: t("pages.landing.testimonial_4", { defaultValue: "I received my digital prescription immediately after the consultation." }),
          city: "Rubavu",
        },
      ],
      [
        {
          quote: t("pages.landing.testimonial_5", { defaultValue: "The platform helped me consult quickly while I was at work." }),
          city: "Kigali",
        },
        {
          quote: t("pages.landing.testimonial_6", { defaultValue: "Finding care and getting medicine delivered felt simple and safe." }),
          city: "Rwamagana",
        },
      ],
    ],
    [t],
  );
  const visibleTestimonials = testimonialPages[testimonialPage] ?? testimonialPages[0];

  useEffect(() => {
    document.title = appTagline ? `${appName} - ${appTagline}` : appName;
  }, [appName, appTagline]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <TopBar settings={generalSettings} />
      <HeroHeader
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        activeSection={activeSection}
        settings={generalSettings}
      />
      <section
        id="home"
        className="relative overflow-hidden bg-gradient-to-br from-background via-background to-teal-50 dark:to-teal-950/20"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-14">
          <div className="max-w-xl">
            <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-400 dark:ring-teal-900/50">
              {t("pages.landing.hero_badge", { defaultValue: "#1 Digital Healthcare Platform in Rwanda" })}
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.04] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("pages.landing.hero_question_prefix", { defaultValue: "Want to talk to" })}{" "}
              <span className="text-teal-700 dark:text-teal-400">{t("pages.landing.hero_question_highlight", { defaultValue: "doctor?" })}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              {t("pages.landing.hero_description", { defaultValue: "Connect with licensed doctors in seconds, get prescriptions, certificates, and medications delivered to your doorstep." })}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-14 rounded-[8px] bg-teal-700 px-6 text-white shadow-lg shadow-teal-900/10 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <Link to="/patient/search-doctors?type=instant">
                  <Video className="mr-2 h-5 w-5" />
                  <span className="text-left leading-tight">
                    {t("pages.landing.join_instant_consultation", { defaultValue: "Join Instant Consultation" })}
                    <span className="block text-[11px] font-medium opacity-80">
                      {t("pages.landing.talk_to_doctor_now", { defaultValue: "Talk to a doctor now" })}
                    </span>
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-14 rounded-[8px] border-border bg-card px-6 text-foreground shadow-sm hover:bg-muted"
              >
                <Link to="/patient/appointments">
                  <CalendarDays className="mr-2 h-5 w-5 text-teal-700 dark:text-teal-400" />
                  <span className="text-left leading-tight">
                    {t("pages.landing.book_appointment", { defaultValue: "Book Appointment" })}
                    <span className="block text-[11px] font-medium text-muted-foreground">
                      {t("pages.landing.schedule_for_later", { defaultValue: "Schedule for later" })}
                    </span>
                  </span>
                </Link>
              </Button>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 text-xs font-semibold text-muted-foreground sm:grid-cols-4">
              {[
                t("pages.landing.benefit_licensed_doctors", { defaultValue: "Licensed Doctors" }),
                t("pages.landing.benefit_secure_private", { defaultValue: "Secure & Private" }),
                t("pages.landing.benefit_affordable", { defaultValue: "Affordable" }),
                t("pages.landing.benefit_available", { defaultValue: "Available 24/7" }),
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative min-h-[360px] lg:min-h-[430px]">
            <div className="absolute inset-0 rounded-[28px] bg-background/60 blur-3xl" />
            <div className="relative ml-auto max-w-5xl min-w-4xl">
              <img
                src="/images/heroImage.png"
                alt={t("pages.landing.hero_image_alt", { defaultValue: "Virtual healthcare consultation" })}
                className="w-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-background py-10 lg:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">
              {t("pages.landing.services_eyebrow", { defaultValue: "Our Services" })}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
              {t("pages.landing.services_title_prefix", { defaultValue: "Everything You Need In" })}{" "}
              <span className="text-teal-700 dark:text-teal-400">
                {t("pages.landing.services_title_highlight", { defaultValue: "One Place" })}
              </span>
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {services.map((service) => (
              <article
                key={service.key}
                className="rounded-[8px] border border-border b p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <ServiceIllustration type={service.key} />
                <h3 className="mt-4 text-base font-black text-foreground">
                  {t(service.titleKey, { defaultValue: service.titleDefault })}
                </h3>
                <p className="mt-2 min-h-[70px] text-sm leading-6 text-muted-foreground">
                  {t(service.textKey, { defaultValue: service.textDefault })}
                </p>
                <Link
                  to="/help"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-400"
                >
                  {t("pages.landing.learn_more", { defaultValue: "Learn more" })} <ArrowRight className="h-3 w-3" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="bg-muted/30 py-8 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[14px] bg-card p-5 shadow-sm ring-1 ring-border">
            <p className="text-center text-xs font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">
              {t("pages.landing.how_it_works", { defaultValue: "How It Works" })}
            </p>
            <h2 className="mt-1 text-center text-2xl font-black text-foreground">
              {t("pages.landing.how_title", { defaultValue: "Healthcare in 3 Simple Steps" })}
            </h2>
            <div className="mt-6 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
              {[
                [
                  UserRound,
                  t("pages.landing.step_create_title", { defaultValue: "Create Your Account" }),
                  t("pages.landing.step_create_text", { defaultValue: "Sign up in less than one minute." }),
                ],
                [
                  Stethoscope,
                  t("pages.landing.step_consult_title", { defaultValue: "Consult a Doctor" }),
                  t("pages.landing.step_consult_text", { defaultValue: "Choose a doctor and connect instantly online." }),
                ],
                [
                  FileText,
                  t("pages.landing.step_care_title", { defaultValue: "Get Care" }),
                  t("pages.landing.step_care_text", { defaultValue: "Receive your prescription, certificate, or medication delivery." }),
                ],
              ]
                .map(([Icon, title, text], index) => {
                  const StepIcon = Icon as typeof UserRound;
                  return (
                    <div
                      key={title as string}
                      className="flex items-center gap-4 rounded-[10px] bg-muted/30 p-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-black text-white dark:bg-teal-600">
                        {index + 1}
                      </span>
                      <StepIcon className="h-10 w-10 text-teal-700 dark:text-teal-400" />
                      <div>
                        <h3 className="font-black text-foreground">
                          {title as string}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {text as string}
                        </p>
                      </div>
                    </div>
                  );
                })
                .flatMap((node, index, array) =>
                  index < array.length - 1
                    ? [
                        node,
                        <ArrowRight
                          key={`arrow-${index}`}
                          className="mx-auto hidden h-6 w-6 text-muted-foreground/60 md:block"
                        />,
                      ]
                    : [node],
                )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:items-center px-8 py-2  overflow-hidden rounded-[14px] bg-gradient-to-r from-teal-800 to-teal-600 text-white shadow-xl grid-cols-2 sm:grid-cols-5">
            <div className="items-center lg:flex hidden">
              <HeartPulse size={100} className="lg:block hidden"/>
              <div className="border-white/15  text-center sm:border-r last:border-r-0">
                <p className="text-2xl font-black">{t("pages.landing.trusted_by_patients", { defaultValue: "Trusted by Patients" })}</p>
                <p className="mt-1 text-xs font-semibold text-white/80">
                  {t("pages.landing.across_rwanda", { defaultValue: "Across Rwanda" })}
                </p>
              </div>
            </div>

            {[
              [`${userStats?.users_served ?? 500}+`, t("pages.landing.stat_patients", { defaultValue: "Patients" })],
              ["50+", t("pages.landing.stat_doctors", { defaultValue: "Doctors" })],
              ["16+", t("pages.landing.stat_specialties", { defaultValue: "Medical Specialties" })],
              ["24/7", t("pages.landing.stat_online_access", { defaultValue: "Online Access" })],
            ].map(([value, label]) => (
              <div
                key={value}
                className="border-white/15 text-center sm:border-r last:border-r-0"
              >
                <p className="text-2xl font-black">{value}</p>
                <p className="mt-1 text-xs font-semibold text-white/80">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="doctors" className="bg-background py-10 lg:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">
                {t("pages.landing.meet_doctors", { defaultValue: "Meet Our Doctors" })}
              </p>
              <h2 className="mt-1 text-2xl font-black text-foreground">
                {t("pages.landing.consult_experts", { defaultValue: "Consult With Expert Doctors" })}
              </h2>
            </div>
            <Link
              to="/patient/search-doctors"
              className="text-sm font-bold text-teal-700 hover:underline dark:text-teal-400"
            >
              {t("pages.landing.view_all_doctors", { defaultValue: "View all doctors" })} <ArrowRight className="inline h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {(doctorsLoading && doctors.length === 0
              ? Array.from({ length: 6 }, (_, index) => ({
                  id: `loading-${index}`,
                  loading: true,
                }))
              : displayDoctors
            ).map((item: any, index) => {
              const isLoadingCard = Boolean(item?.loading);
              const isApiDoctor =
                !isLoadingCard &&
                item &&
                typeof item === "object" &&
                "user" in item;
              const name = isLoadingCard
                ? ""
                : isApiDoctor
                  ? getDoctorName(item)
                  : item.name;
              const specialty = isLoadingCard
                ? ""
                : isApiDoctor
                  ? (getDoctorSpecialty(item) ??
                    t("pages.landing.specialty_general_physician", { defaultValue: "General Physician" }))
                  : t(item.specialtyKey, { defaultValue: item.specialtyDefault });
              const image = isLoadingCard
                ? ""
                : isApiDoctor
                  ? getDoctorImage(item)
                  : item.image;
              const rating = isLoadingCard
                ? ""
                : isApiDoctor
                  ? getDoctorRating(item)
                  : item.rating;
              const reviews = isLoadingCard
                ? ""
                : isApiDoctor
                  ? (item.reviews_count ?? 80)
                  : item.reviews;
              const facility = isLoadingCard
                ? ""
                : isApiDoctor
                  ? (item.hospitals?.[0]?.name ?? "MediConnect")
                  : item.facility;
              return (
                <article
                  key={item?.id ?? index}
                  className="rounded-[8px] border border-border bg-card p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-teal-50 dark:bg-teal-950/40">
                    {isLoadingCard ? (
                      <div className="h-full w-full animate-pulse bg-muted" />
                    ) : (
                      <img
                        src={image}
                        alt={name}
                        className="h-full w-full object-cover object-top"
                      />
                    )}
                  </div>
                  {isLoadingCard ? (
                    <div className="mt-3 space-y-2">
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-9 w-full animate-pulse rounded-full bg-muted" />
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-500" />{" "}
                        {t("pages.landing.available", { defaultValue: "Available" })}
                      </div>
                      <h3 className="mt-1 line-clamp-2 min-h-[40px] text-sm font-black leading-tight text-foreground">
                        {name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {specialty}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs font-bold text-foreground/80">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{" "}
                        {rating}{" "}
                        <span className="font-medium text-muted-foreground">
                          ({reviews})
                        </span>
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {facility}
                      </p>
                      <Button
                        asChild
                        className="mt-4 h-9 w-full rounded-full bg-teal-100 text-xs font-black text-teal-900 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-900/70"
                      >
                        <Link to="/patient/search-doctors">{t("pages.landing.book_now", { defaultValue: "Book Now" })}</Link>
                      </Button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="education" className="bg-muted/20 py-8 lg:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
          <div className="overflow-hidden rounded-[16px] bg-card shadow-sm ring-1 ring-border">
            <div className="grid min-h-[230px] gap-2 md:grid-cols-[0.9fr_0.78fr_0.52fr]">
              <div className="flex flex-col justify-center p-6 lg:p-7">
                <h2 className="text-xl font-black tracking-tight text-foreground lg:text-2xl">
                  {t("pages.landing.healthcare_pocket_title", { defaultValue: "Healthcare In Your Pocket" })}
                </h2>
                <ul className="mt-5 space-y-3 text-sm font-semibold text-foreground/80">
                  {[
                    t("pages.landing.pocket_manage_appointments", { defaultValue: "Manage appointments" }),
                    t("pages.landing.pocket_consult_doctors", { defaultValue: "Consult doctors instantly" }),
                    t("pages.landing.pocket_access_prescriptions", { defaultValue: "Access prescriptions" }),
                    t("pages.landing.pocket_track_history", { defaultValue: "Track medical history" }),
                    t("pages.landing.pocket_more", { defaultValue: "And much more" }),
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 rounded-full bg-teal-700 text-white dark:bg-teal-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative hidden min-h-[230px] overflow-hidden md:block">
                <div className="absolute bottom-[-10px] left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-teal-100/70 blur-2xl dark:bg-teal-900/30" />
                <img
                  src="/images/phone.png"
                  alt={t("pages.landing.mobile_app_alt", { defaultValue: "MediConnect mobile app" })}
                  className="absolute bottom-[-76px] left-1/2 max-h-[330px] w-auto -translate-x-1/2 rotate-[9deg] object-contain drop-shadow-2xl"
                />
              </div>

              <div className="flex flex-row items-center justify-center gap-3 p-5 md:flex-col md:items-start md:justify-center md:pl-0">
                <img
                  src="/images/android.png"
                  alt={t("pages.landing.google_play_alt", { defaultValue: "Get it on Google Play" })}
                  className="h-10 w-auto rounded-[6px] object-contain shadow-sm lg:h-11"
                />
                <img
                  src="/images/apple.png"
                  alt={t("pages.landing.app_store_alt", { defaultValue: "Download on the App Store" })}
                  className="h-10 w-auto rounded-[6px] object-contain shadow-sm lg:h-11"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[16px] bg-card p-6 shadow-sm ring-1 ring-border lg:p-7">
            <h2 className="text-xl font-black tracking-tight text-foreground lg:text-2xl">
              {t("pages.landing.testimonials_title", { defaultValue: "What Our Patients Say" })}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {visibleTestimonials.map((item) => (
                <article
                  key={item.city}
                  className="min-h-[150px] rounded-[14px] border border-border bg-background/70 p-5 shadow-sm"
                >
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm font-medium leading-6 text-foreground/80">
                    {item.quote}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-muted-foreground">
                    {t("pages.landing.testimonial_patient_city", { defaultValue: "- Patient, {{city}}", city: item.city })}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-5 flex justify-center gap-2">
              {testimonialPages.map((_, dot) => (
                <button
                  key={dot}
                  type="button"
                  aria-label={t("pages.landing.show_testimonial_page", { defaultValue: "Show testimonial page {{page}}", page: dot + 1 })}
                  onClick={() => setTestimonialPage(dot)}
                  className={dot === testimonialPage ? "h-2.5 w-2.5 rounded-full bg-teal-700 transition-colors dark:bg-teal-400" : "h-2.5 w-2.5 cursor-pointer rounded-full bg-border transition-colors hover:bg-teal-500/60"}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <OurTeam />

      <section className="bg-background py-8 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700 dark:text-teal-400">
                {t("pages.landing.faq_title", { defaultValue: "Frequently Asked Questions" })}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                {t("pages.landing.faq_subtitle", { defaultValue: "Need help before you start?" })}
              </h2>
            </div> 
             <Link
              to="/help"
              className="text-sm font-bold text-teal-700 hover:underline dark:text-teal-400"
            >
               {t("pages.landing.visit_help_center", { defaultValue: "Visit Help Center" })} <ArrowRight className="inline h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              const question = t(faq.questionKey, { defaultValue: faq.questionDefault });
              const answer = t(faq.answerKey, { defaultValue: faq.answerDefault });
              return (
                <article
                  key={faq.questionKey}
                  className="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm transition-colors hover:border-teal-500/40"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-black text-foreground/90"
                    aria-expanded={isOpen}
                  >
                    <span>{question}</span>
                    <ChevronDown
                      className={isOpen ? "h-4 w-4 shrink-0 rotate-180 text-teal-700 transition-transform dark:text-teal-400" : "h-4 w-4 shrink-0 text-muted-foreground transition-transform"}
                    />
                  </button>
                  {isOpen && (
                    <p className="border-t border-border px-4 pb-4 pt-3 text-xs font-medium leading-5 text-muted-foreground">
                      {answer}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-background pb-10" id="contact">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[16px] bg-teal-800 text-white shadow-xl">
            <div className="grid min-h-[210px] md:grid-cols-[0.46fr_1fr]">
              <div className="relative min-h-[210px] overflow-hidden bg-teal-50">
                <img
                  src={"images/Jul18202601_47_20AM.png"}
                  alt={t("pages.landing.patient_using_alt", { defaultValue: "Patient using MediConnect" })}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
                <div className="absolute inset-y-0 right-0 hidden w-20 bg-gradient-to-l from-teal-800 to-transparent md:block" />
              </div>

              <div className="relative flex items-center overflow-hidden bg-gradient-to-r from-teal-800 via-teal-700 to-teal-800 px-6 py-7 md:px-10">
                <HeartPulse className="pointer-events-none absolute right-8 top-1/2 h-36 w-36 -translate-y-1/2 text-white/10" />
                <div className="relative max-w-3xl">
                  <h2 className="text-2xl font-black tracking-tight md:text-3xl">
                    {t("pages.landing.final_cta_title", { defaultValue: "Your Health Should Never Wait." })}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-white/80">
                    {t("pages.landing.final_cta_sub", { defaultValue: "Join an instant consultation now and talk to a doctor in seconds." })}
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      className="h-14 rounded-[8px] bg-white px-5 text-teal-900 shadow-sm hover:bg-teal-50"
                    >
                      <Link to="/patient/search-doctors/?type=instant&instant=true">
                        <Video className="mr-3 h-6 w-6 fill-teal-700 text-teal-700" />
                        <span className="text-left leading-tight">
                          {t("pages.landing.join_instant_consultation", { defaultValue: "Join Instant Consultation" })}
                          <span className="block text-[11px] font-semibold text-teal-900/60">
                            {t("pages.landing.talk_to_doctor_now", { defaultValue: "Talk to a doctor now" })}
                          </span>
                        </span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-14 rounded-[8px] border-white/25 bg-white/5 px-5 text-white hover:bg-white/15 hover:text-white"
                    >
                      <Link to="/patient/search-doctors">
                        <CalendarDays className="mr-3 h-6 w-6" />
                        <span className="text-left leading-tight">
                          {t("pages.landing.book_appointment", { defaultValue: "Book Appointment" })}
                          <span className="block text-[11px] font-semibold text-white/65">
                            {t("pages.landing.schedule_for_later", { defaultValue: "Schedule for later" })}
                          </span>
                        </span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Index;










