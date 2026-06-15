import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { DoctorCard } from "@/components/DoctorCard";
import {
  Calendar,
  Activity,
  Video,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import PatientStats from "./components/PatientStats";
import { useGetSearchDoctors } from "@/hooks/patient/use-patient-doctor";
import { useGetPatientAppointments } from "@/hooks/patient/use-patient-appointment";
import { format, parseISO } from "date-fns";

/** Statuses that count as "upcoming" for the overview strip */
const UPCOMING_STATUSES = ["pending", "confirmed", "in_progress"] as const;

/** Format ISO date string → "Jun 26" parts */
function formatAppointmentDate(iso: string) {
  const d = parseISO(iso);
  return {
    month: format(d, "MMM"), // "Jun"
    day: format(d, "d"), // "26"
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

const PatientOverview = () => {
  const { t, i18n } = useTranslation();

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
  const { data: availableData, isLoading: availableLoading } =
    useGetSearchDoctors({ instant: true });
  const availableNow = availableData?.data?.slice(0, 3) ?? [];

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
          <div className="p-4 space-y-6">
            {/* Stats strip */}
            <PatientStats />

            {/* Main content grid — 50/50 split */}
            <section className="grid grid-cols-2 gap-4">
              {/* ── Upcoming appointments ─────────────────────────────── */}
              <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                  <div>
                    <h2 className="text-[12px] font-semibold text-foreground">
                      {t("pages.patient.upcoming_appointments")}
                    </h2>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {upcomingAppointments.length} scheduled
                    </p>
                  </div>
                  <Link to="/patient/appointments">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-primary hover:text-primary/80"
                    >
                      {t("pages.patient.view_all")}
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </Link>
                </div>

                <div className="p-3 space-y-2">
                  {appointmentsLoading ? (
                    // Skeleton
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-sm bg-secondary/20 border border-border/30 animate-pulse"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-sm bg-muted shrink-0" />
                          <div className="space-y-1.5">
                            <div className="h-2.5 w-28 rounded bg-muted" />
                            <div className="h-2 w-20 rounded bg-muted" />
                          </div>
                        </div>
                        <div className="h-7 w-16 rounded-sm bg-muted" />
                      </div>
                    ))
                  ) : upcomingAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                      <div className="w-10 h-10 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                        <Calendar className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
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
                          className="flex items-center justify-between p-3 rounded-sm bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors duration-150"
                        >
                          <div className="flex items-center gap-3">
                            {/* Date badge */}
                            <div className="h-10 w-10 rounded-sm bg-primary/10 text-primary flex flex-col items-center justify-center font-bold shrink-0">
                              <span className="text-[9px] font-medium uppercase leading-none">
                                {month}
                              </span>
                              <span className="text-sm leading-none mt-0.5">
                                {day}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-foreground truncate">
                                {doctorName}
                              </div>
                              <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1.5">
                                <Stethoscope className="h-2.5 w-2.5" />
                                {specialty}
                                <span className="text-border">·</span>
                                {time}
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 border-primary/20 bg-primary/5 text-primary capitalize"
                                >
                                  {a.type}
                                </Badge>
                                {/* Status badge — highlight in_progress */}
                                {a.status === "in_progress" && (
                                  <Badge className="text-[9px] px-1 py-0 bg-green-500/10 text-green-600 border border-green-500/20">
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
                                className="h-7 px-2.5 text-[10px] rounded-sm bg-green-600 hover:bg-green-700 text-white transition-all duration-200"
                              >
                                <Video className="h-3 w-3 mr-1" />
                                {t("pages.patient.join")}
                              </Button>
                            </a>
                          ) : (
                            <Link to="/patient/appointments">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
                                disabled
                              >
                                <Video className="h-3 w-3 mr-1" />
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

              {/* ── Available now ─────────────────────────────────────── */}
              <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border/60">
                  <h2 className="text-[12px] font-semibold text-foreground">
                    {t("pages.patient.available_now_title")}
                  </h2>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {t("pages.patient.available_now_sub")}
                  </p>
                </div>

                <div className="p-3 space-y-2">
                  {availableLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-sm bg-secondary/20 border border-border/30 animate-pulse"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                          <div className="space-y-1.5">
                            <div className="h-2.5 w-24 rounded bg-muted" />
                            <div className="h-2 w-16 rounded bg-muted" />
                          </div>
                        </div>
                        <div className="h-6 w-10 rounded-sm bg-muted" />
                      </div>
                    ))
                  ) : availableNow.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                      <div className="w-10 h-10 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                        <Activity className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        No doctors available now
                      </p>
                    </div>
                  ) : (
                    availableNow.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2.5 rounded-sm bg-secondary/20 border border-border/30 hover:bg-secondary/40 transition-colors duration-150"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden">
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
                            <div className="text-[11px] font-semibold text-foreground truncate">
                              {d.designations ?? d.user?.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 truncate">
                              {d.specialization ?? "—"}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="h-6 px-2.5 text-[10px] rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
                        >
                          {t("pages.patient.go")}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* ── Recommended doctors ───────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-[12px] font-semibold text-foreground">
                    {t("pages.patient.recommended")}
                  </h2>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Top rated specialists for you
                  </p>
                </div>
                <Link to="/patient/doctors">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-primary hover:text-primary/80"
                  >
                    View all
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recommendedLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
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
                  : recommended.map((d) => (
                      <DoctorCard key={d.id} doctor={d} />
                    ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default PatientOverview;
