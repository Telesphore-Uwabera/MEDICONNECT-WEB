import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { DoctorCard } from "@/components/DoctorCard";
import {
  Calendar,
  Activity,
  Video,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import PatientStats from "./components/PatientStats";
import { useGetSearchDoctors, type ApiDoctor } from "@/hooks/patient/use-patient-doctor";
import { useDoctorActions, DoctorActionModals } from "@/components/useDoctorActions";
import { useGetPatientAppointments } from "@/hooks/patient/use-patient-appointment";
import { format, parseISO } from "date-fns";
import moment from "moment";

/** Statuses that count as "upcoming" for the overview strip */
const UPCOMING_STATUSES = ["pending", "confirmed", "in_progress"] as const;

/** Format ISO date string → "Jun 26" parts */
function formatAppointmentDate(date: string) {
  return {
    month: moment(date).format("MMM"),
    day: moment(date).format("D"),
  };
}

/** Format ISO time string → "09:00 AM" */
function formatAppointmentTime(iso: string) {
  if (!iso) return "—";
  // Handle plain time strings like "09:00:00"
  const date = parseISO(iso.length <= 8 ? `1970-01-01T${iso}` : iso);
  if (isNaN(date.getTime())) return "—";
  return format(date, "hh:mm a");
}

// One "Available now" row. Reuses the shared connect actions so the Go button
// opens the same instant-consult dialog as the doctor cards.
function AvailableNowRow({ doctor: doctorProp }: { doctor: ApiDoctor }) {
  const { t } = useTranslation();
  const a = useDoctorActions(doctorProp);
  const d = a.doctor;

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-md bg-secondary/20 border border-border/30 hover:bg-secondary/40 transition-colors duration-150">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {(d.image ?? d.user?.avatar) ? (
              <img
                src={(d.image ?? d.user.avatar)!}
                alt={d.user?.name}
                className="h-full w-full object-cover"
              />
            ) : (
              d.user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {d.designations ?? d.user?.name}
            </div>
            <div className="text-xs text-muted-foreground/70 truncate">
              {d.specialization ?? "—"}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={a.openConnect}
          disabled={!a.canConnect}
          className="h-8 px-3 text-xs rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
        >
          {a.isConnected || a.isCallInProgress ? "Join" : t("pages.patient.go")}
        </Button>
      </div>
      <DoctorActionModals a={a} />
    </>
  );
}

import { useState, useRef, useEffect } from "react";

const PatientOverview = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    "overview" | "clinical" | "financial" | "activity" | "upcoming" | "available" | "recommended"
  >("overview");

  // ── Scrollable Tabs State ──
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!tabsRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftScroll(scrollLeft > 0);
      // Math.ceil covers subpixel scaling issues
      setShowRightScroll(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    };

    // Initial check
    handleScroll();
    
    // Check on resize
    window.addEventListener("resize", handleScroll);
    tabsRef.current?.addEventListener("scroll", handleScroll);
    
    return () => {
      window.removeEventListener("resize", handleScroll);
      tabsRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollBy = (offset: number) => {
    tabsRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  // ── Appointments (real API) ──────────────────────────────────────────────
  const { data: appointmentsData, isLoading: appointmentsLoading } =
    useGetPatientAppointments();

  const upcomingAppointments = (appointmentsData?.data ?? [])
    .filter((a) =>
      UPCOMING_STATUSES.includes(
        a.status as (typeof UPCOMING_STATUSES)[number],
      ),
    )
    // sort soonest first by appointment_date
    .sort(
      (a, b) =>
        new Date(a.appointment_date).getTime() -
        new Date(b.appointment_date).getTime(),
    )
    .slice(0, 3); // show at most 5 in the overview

  // ── Available now (instant consultation doctors) ─────────────────────────
  // /patient/search/doctors?instant=true&page=2&per_page=10
  const { data: availableData, isLoading: availableLoading } =
    useGetSearchDoctors({ instant: true, page: 1, per_page: 6 });
  const availableNow = availableData?.data ?? [];

  // ── Recommended doctors ──────────────────────────────────────────────────
  const { data: recommendedData, isLoading: recommendedLoading } =
    useGetSearchDoctors();
  const recommended = recommendedData?.data?.slice(0, 3) ?? [];

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.overview_title")}
          subtitle={t("pages.patient.overview_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                {
                  label: "Book a doctor",
                  hint: "Find specialists and schedule care",
                  to: "/patient/search-doctors",
                  icon: Stethoscope,
                  tone: "text-primary bg-primary/10",
                },
                {
                  label: "My appointments",
                  hint: `${upcomingAppointments.length} upcoming`,
                  to: "/patient/appointments",
                  icon: Calendar,
                  tone: "text-sky-500 bg-sky-500/10",
                },
                {
                  label: "Instant consult",
                  hint: `${availableNow.length} doctors available`,
                  to: "/patient/instant",
                  icon: Activity,
                  tone: "text-violet-500 bg-violet-500/10",
                },
                {
                  label: "Medical info",
                  hint: "Records, files and visits",
                  to: "/patient/service-bookings",
                  icon: Video,
                  tone: "text-emerald-500 bg-emerald-500/10",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="rounded-md border border-border/70 bg-card p-3 shadow-sm flex items-center gap-3 hover:border-primary/40 hover:bg-secondary/20 transition-colors"
                  >
                    <span className={cn("h-10 w-10 rounded-md flex items-center justify-center shrink-0", item.tone)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground truncate">
                        {item.label}
                      </span>
                      <span className="block text-xs text-muted-foreground truncate mt-0.5">
                        {item.hint}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Unified Tabs Navigation (Scrollable on mobile) */}
            <div className="relative flex items-center border-b border-border/60">
              {/* Left Indicator */}
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 flex items-center transition-opacity duration-300",
                  showLeftScroll ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
              >
                <button
                  onClick={() => scrollBy(-200)}
                  className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Tabs */}
              <div 
                ref={tabsRef}
                className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-px [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full relative z-0"
              >
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                  activeTab === "overview"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                Care Hub
              </button>
              <button
                onClick={() => setActiveTab("clinical")}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                  activeTab === "clinical"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                Records
              </button>
              <button
                onClick={() => setActiveTab("financial")}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                  activeTab === "financial"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                Payments
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                  activeTab === "activity"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab("upcoming")}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                  activeTab === "upcoming"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                Appointments
              </button>
              <button
                onClick={() => setActiveTab("available")}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                  activeTab === "available"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                Available Now
              </button>
              <button
                onClick={() => setActiveTab("recommended")}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                  activeTab === "recommended"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                )}
              >
                Recommended
              </button>
              </div>

              {/* Right Indicator */}
              <div
                className={cn(
                  "absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 flex items-center justify-end transition-opacity duration-300",
                  showRightScroll ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
              >
                <button
                  onClick={() => scrollBy(200)}
                  className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <PatientStats activeTab={activeTab} />

            {/* Tab Contents */}
            {activeTab === "upcoming" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-[16px] border border-border/80 bg-card overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                    <div>
                      <h2 className="text-base font-bold text-foreground">
                        {t("pages.patient.upcoming_appointments")}
                      </h2>
                      <p className="text-xs font-medium text-muted-foreground/70 mt-0.5">
                        {upcomingAppointments.length} scheduled
                      </p>
                    </div>
                    <Link to="/patient/appointments">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 rounded-[8px] text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5"
                      >
                        {t("pages.patient.view_all")}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    {appointmentsLoading ? (
                      // Skeleton
                      Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 rounded-[12px] bg-secondary/20 border border-border/30 animate-pulse"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-[10px] bg-muted shrink-0" />
                            <div className="space-y-2">
                              <div className="h-3 w-32 rounded bg-muted" />
                              <div className="h-2 w-24 rounded bg-muted" />
                            </div>
                          </div>
                          <div className="h-8 w-20 rounded-[8px] bg-muted" />
                        </div>
                      ))
                    ) : upcomingAppointments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                        <div className="w-12 h-12 rounded-[12px] bg-muted/60 flex items-center justify-center border border-border/40">
                          <Calendar className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          No upcoming appointments
                        </p>
                      </div>
                    ) : (
                      upcomingAppointments.map((a) => {
                        const { month, day } = formatAppointmentDate(
                          a.appointment_date,
                        );
                        const time = formatAppointmentTime(a.appointment_time);
                        const doctorName =
                          a.doctor?.designations ?? a.doctor?.user?.name ?? "—";
                        const specialty = a.doctor?.specialization ?? "—";
                        const canJoin =
                          a.status === "in_progress" && !!a.daily_room_url;

                        return (
                          <div
                            key={a.id}
                            className="flex items-center justify-between p-4 rounded-[12px] bg-secondary/30 border border-border/40 hover:bg-secondary/50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group"
                          >
                            <div className="flex items-center gap-4">
                              {/* Date badge */}
                              <div className="h-12 w-12 rounded-[10px] bg-primary/10 text-primary flex flex-col items-center justify-center font-bold shrink-0 border border-primary/20">
                                <span className="text-[10px] font-bold uppercase leading-none mb-1">
                                  {month}
                                </span>
                                <span className="text-lg leading-none tracking-tight">
                                  {day}
                                </span>
                              </div>

                              <div className="min-w-0">
                                <div className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                  {doctorName}
                                </div>
                                <span className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1.5 mt-1">
                                  <Stethoscope className="h-3.5 w-3.5 text-muted-foreground/60" />
                                  {specialty}
                                  <span className="text-border">·</span>
                                  {time}
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 rounded-[4px] border-primary/20 bg-primary/5 text-primary capitalize"
                                  >
                                    {a.type}
                                  </Badge>
                                  {/* Status badge — highlight in_progress */}
                                  {a.status === "in_progress" && (
                                    <Badge className="text-[10px] px-1.5 py-0 rounded-[4px] bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                                      Live
                                    </Badge>
                                  )}
                                </span>
                              </div>
                            </div>

                            {canJoin ? (
                              <a
                                href="/patient/appointments"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs font-bold rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all duration-200"
                                >
                                  <Video className="h-4 w-4 mr-1.5" />
                                  {t("pages.patient.join")}
                                </Button>
                              </a>
                            ) : (
                              <Link to="/patient/appointments">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-xs font-bold rounded-[8px] border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                                >
                                  <Video className="h-4 w-4 mr-1.5 opacity-60" />
                                  {t("pages.patient.join")}
                                </Button>
                              </Link>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "available" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-[16px] border border-border/80 bg-card overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
                    <h2 className="text-base font-bold text-foreground">
                      {t("pages.patient.available_now_title")}
                    </h2>
                    <p className="text-xs font-medium text-muted-foreground/70 mt-0.5">
                      {t("pages.patient.available_now_sub")}
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 rounded-[12px] bg-secondary/20 border border-border/30 animate-pulse"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-[10px] bg-muted shrink-0" />
                            <div className="space-y-2">
                              <div className="h-3 w-24 rounded bg-muted" />
                              <div className="h-2 w-16 rounded bg-muted" />
                            </div>
                          </div>
                          <div className="h-8 w-16 rounded-[8px] bg-muted" />
                        </div>
                      ))
                    ) : availableNow.length === 0 ? (
                      <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-12 gap-3 text-center">
                        <div className="w-12 h-12 rounded-[12px] bg-muted/60 flex items-center justify-center border border-border/40">
                          <Activity className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          No doctors available now
                        </p>
                      </div>
                    ) : (
                      availableNow.map((d) => (
                        <div key={d.id} className="rounded-[12px] border border-border/60 bg-card p-2 shadow-sm hover:shadow-md transition-shadow">
                          <AvailableNowRow doctor={d} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "recommended" && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      {t("pages.patient.recommended")}
                    </h2>
                    <p className="text-xs font-medium text-muted-foreground/70 mt-0.5">
                      Top rated specialists for you
                    </p>
                  </div>
                  <Link to="/patient/search-doctors">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 rounded-[8px] text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5"
                    >
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-[16px] border border-border/80 bg-card p-4 shadow-sm space-y-3 animate-pulse"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 rounded-[14px] bg-muted shrink-0" />
                          <div className="flex-1 space-y-2 pt-1">
                            <div className="h-4 w-2/3 rounded bg-muted" />
                            <div className="h-3 w-1/2 rounded bg-muted" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-border rounded-[8px] border border-border overflow-hidden">
                          {Array.from({ length: 3 }).map((_, j) => (
                            <div
                              key={j}
                              className="flex flex-col items-center py-2 px-1 bg-muted/30 gap-1.5"
                            >
                              <div className="h-2 w-2 rounded-full bg-muted" />
                              <div className="h-3 w-8 rounded bg-muted" />
                            </div>
                          ))}
                        </div>
                        <div className="h-8 w-full rounded-[8px] bg-muted mt-2" />
                      </div>
                    ))
                    : recommended.map((d) => (
                      <DoctorCard key={d.id} doctor={d} />
                    ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default PatientOverview;
