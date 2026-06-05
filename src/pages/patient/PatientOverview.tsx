import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { DoctorCard } from "@/components/DoctorCard";
import { Calendar, Activity, Video, ChevronRight, Stethoscope } from "lucide-react";
import { appointments, prescriptions } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import PatientStats from "./components/PatientStats";
import { useGetSearchDoctors } from "@/hooks/patient/use-patient-doctor";
// import { useGetSearchDoctors } from "@/hooks/patient/use-patient-search-doctor";

const PatientOverview = () => {
  const { t } = useTranslation();
  const upcoming = appointments.filter((a) => a.status === "upcoming");
  const activeRx = prescriptions.filter((p) => p.status === "active");

  // Available now — instant consultation doctors only
  const { data: availableData, isLoading: availableLoading } = useGetSearchDoctors({ instant: true });
  const availableNow = availableData?.data?.slice(0, 3) ?? [];

  // Recommended — all doctors
  const { data: recommendedData, isLoading: recommendedLoading } = useGetSearchDoctors();
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
              {/* Upcoming appointments */}
              <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                  <div>
                    <h2 className="text-[12px] font-semibold text-foreground">
                      {t("pages.patient.upcoming_appointments")}
                    </h2>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {upcoming.length} scheduled
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
                  {upcoming.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                      <div className="w-10 h-10 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                        <Calendar className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        No upcoming appointments
                      </p>
                    </div>
                  ) : (
                    upcoming.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3 rounded-sm bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-sm bg-primary/10 text-primary flex flex-col items-center justify-center font-bold shrink-0">
                            <span className="text-[9px] font-medium uppercase leading-none">
                              {a.date.split(" ")[0]}
                            </span>
                            <span className="text-sm leading-none mt-0.5">
                              {a.date.split(" ")[1].replace(",", "")}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-foreground truncate">
                              {a.doctorName}
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1.5">
                              <Stethoscope className="h-2.5 w-2.5" />
                              {a.specialty}
                              <span className="text-border">·</span>
                              {a.time}
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 border-primary/20 bg-primary/5 text-primary"
                              >
                                {a.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
                        >
                          <Video className="h-3 w-3 mr-1" />
                          {t("pages.patient.join")}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Available now */}
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
                          {/* Avatar: use d.image first, fall back to d.user.avatar, then initial */}
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden">
                            {d.image ?? d.user.avatar ? (
                              <img
                                src={(d.image ?? d.user.avatar)!}
                                alt={d.user.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              d.user.name?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            {/* Name lives on d.user.name */}
                            <div className="text-[11px] font-semibold text-foreground truncate">
                              {d.designations ?? d.user.name}
                            </div>
                            {/* Specialization is a free-text string on d.specialization */}
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

            {/* Recommended doctors */}
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
                      <div key={i} className="rounded-sm border border-border bg-card p-3.5 shadow-sm space-y-2.5 animate-pulse">
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
                            <div key={j} className="flex flex-col items-center py-1.5 px-1 bg-muted/30 gap-1">
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
