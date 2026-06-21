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
          {a.isConnected || a.isCallInProgress ? "Open" : t("pages.patient.go")}
        </Button>
      </div>
      <DoctorActionModals a={a} />
    </>
  );
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
          <div className="p-4 space-y-6">
            {/* Stats strip */}
            <PatientStats />

            {/* Main content grid — 50/50 split */}
            <section className="grid grid-cols-2 gap-4">
              {/* ── Upcoming appointments ─────────────────────────────── */}
              <div className="rounded-md border border-border/70 bg-card overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {t("pages.patient.upcoming_appointments")}
                    </h2>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {upcomingAppointments.length} scheduled
                    </p>
                  </div>
                  <Link to="/patient/appointments">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-primary hover:text-primary/80"
                    >
                      {t("pages.patient.view_all")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>

                <div className="p-4 space-y-3">
                  {appointmentsLoading ? (
                    // Skeleton
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-md bg-secondary/20 border border-border/30 animate-pulse"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-md bg-muted shrink-0" />
                          <div className="space-y-2">
                            <div className="h-3 w-32 rounded bg-muted" />
                            <div className="h-2 w-24 rounded bg-muted" />
                          </div>
                        </div>
                        <div className="h-8 w-20 rounded-md bg-muted" />
                      </div>
                    ))
                  ) : upcomingAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <div className="w-12 h-12 rounded-md bg-muted/60 flex items-center justify-center border border-border/40">
                        <Calendar className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">
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
                          className="flex items-center justify-between p-4 rounded-md bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors duration-150"
                        >
                          <div className="flex items-center gap-4">
                            {/* Date badge */}
                            <div className="h-12 w-12 rounded-md bg-primary/10 text-primary flex flex-col items-center justify-center font-bold shrink-0">
                              <span className="text-[10px] font-medium uppercase leading-none mb-1">
                                {month}
                              </span>
                              <span className="text-lg leading-none">
                                {day}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {doctorName}
                              </div>
                              <span className="text-xs text-muted-foreground/70 flex items-center gap-1.5 mt-0.5">
                                <Stethoscope className="h-3.5 w-3.5" />
                                {specialty}
                                <span className="text-border">·</span>
                                {time}
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary capitalize"
                                >
                                  {a.type}
                                </Badge>
                                {/* Status badge — highlight in_progress */}
                                {a.status === "in_progress" && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border border-green-500/20">
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
                                className="h-8 px-3 text-xs rounded-md bg-green-600 hover:bg-green-700 text-white transition-all duration-200"
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
                                className="h-8 px-3 text-xs rounded-md border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
                                disabled
                              >
                                <Video className="h-4 w-4 mr-1.5" />
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
              <div className="rounded-md border border-border/70 bg-card overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border/60">
                  <h2 className="text-sm font-semibold text-foreground">
                    {t("pages.patient.available_now_title")}
                  </h2>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {t("pages.patient.available_now_sub")}
                  </p>
                </div>

                <div className="p-4 space-y-3">
                  {availableLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-md bg-secondary/20 border border-border/30 animate-pulse"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                          <div className="space-y-2">
                            <div className="h-3 w-24 rounded bg-muted" />
                            <div className="h-2 w-16 rounded bg-muted" />
                          </div>
                        </div>
                        <div className="h-8 w-12 rounded-md bg-muted" />
                      </div>
                    ))
                  ) : availableNow.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <div className="w-12 h-12 rounded-md bg-muted/60 flex items-center justify-center border border-border/40">
                        <Activity className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No doctors available now
                      </p>
                    </div>
                  ) : (
                    availableNow.map((d) => (
                      <AvailableNowRow key={d.id} doctor={d} />
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* ── Recommended doctors ───────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {t("pages.patient.recommended")}
                  </h2>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    Top rated specialists for you
                  </p>
                </div>
                <Link to="/patient/doctors">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-primary hover:text-primary/80"
                  >
                    View all
                    <ChevronRight className="h-4 w-4 ml-1" />
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
