import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Calendar, Sparkles, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useCallStore } from "@/context/CallStore";

import { AppointmentsTab } from "@/pages/doctor/appointments/AppointmentsTab";
import { InstantConsultTab } from "@/pages/doctor/appointments/InstantConsultTab";
import { ServiceBookingsTab } from "@/pages/doctor/appointments/ServiceBookingsTab";
import { type TabId } from "@/pages/doctor/appointments/shared/types";

const DoctorAppointmentsPage = () => {
  const { t, i18n } = useTranslation();
  const call = useCallStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<TabId>(
    initialTab === "instant" || initialTab === "bookings" ? initialTab : "appointments",
  );

  const selectTab = (nextTab: TabId) => {
    setTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextTab === "appointments") next.delete("tab");
      else next.set("tab", nextTab);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "instant" || requestedTab === "bookings") {
      setTab(requestedTab);
    } else {
      setTab("appointments");
    }
  }, [searchParams]);

  // Auto-switch to instant tab when a call becomes active
  useEffect(() => {
    if (call.phase === "connected" && call.role === "doctor" && call.activeRequest) {
      selectTab("instant");
    }
  }, [call.phase, call.role, call.activeRequest]);

  const pendingCount = call.incomingRequests.length;

  return (
    <DashboardLayout role="doctor">
      <PageHeader
        title={t("pages.doctor.overview_title")}
        subtitle={t("pages.doctor.overview_sub", { date: new Date().toLocaleDateString(i18n.language, { weekday: "long", month: "long", day: "numeric" }) })}
      />

      {/* Tab bar — horizontally scrollable so the three tabs never overflow */}
      <div className="flex items-center border-b border-border/60 px-2 sm:px-4 bg-card/30 shrink-0 overflow-x-auto">
        {(["appointments", "instant", "bookings"] as TabId[]).map((id) => (
          <button
            key={id}
            onClick={() => selectTab(id)}
            className={cn(
              "relative flex items-center gap-2 px-3 sm:px-5 py-4 text-xs sm:text-base font-medium border-b-2 transition-all duration-200 shrink-0 whitespace-nowrap",
              tab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {id === "appointments" && (
              <>
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">
                  {t('consult.bookings.appointments')}
                </span>
                <span className="sm:hidden text-xs">
                  {t('consult.bookings.appointments_short')}
                </span>
              </>
            )}
            {id === "instant" && (
              <>
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">
                  {t('consult.bookings.instant')}
                </span>
                <span className="sm:hidden text-xs">
                  {t('consult.bookings.instant_short')}
                </span>
                {pendingCount > 0 && (
                  <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none">
                    {pendingCount}
                  </span>
                )}
                {call.phase === "connected" && call.role === "doctor" && call.activeRequest && (
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </>
            )}
            {id === "bookings" && (
              <>
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">
                  {t('consult.bookings.service_bookings')}
                </span>
                <span className="sm:hidden text-xs">
                  {t('consult.bookings.service_bookings_short')}
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 ">
        {tab === "appointments" ? (
          <AppointmentsTab />
        ) : tab === "instant" ? (
          <InstantConsultTab />
        ) : (
          <ServiceBookingsTab />
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorAppointmentsPage;
