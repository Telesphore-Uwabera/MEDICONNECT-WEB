
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const call = useCallStore();
  const [tab, setTab] = useState<TabId>("appointments");

  // Auto-switch to instant tab when a call becomes active
  useEffect(() => {
    if (call.phase === "connected" && call.role === "doctor" && call.activeRequest) {
      setTab("instant");
    }
  }, [call.phase, call.role, call.activeRequest]);

  const pendingCount = call.incomingRequests.length;

  return (
    <DashboardLayout role="doctor">
      <PageHeader
        title={t("pages.doctor.overview_title")}
        subtitle={t("pages.doctor.overview_sub")}
      />

      {/* Tab bar — horizontally scrollable so the three tabs never overflow */}
      <div className="flex items-center border-b border-border/60 px-2 sm:px-4 bg-card/30 shrink-0 overflow-x-auto">
        {(["appointments", "instant", "bookings"] as TabId[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium border-b-2 transition-all duration-200 shrink-0 whitespace-nowrap",
              tab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {id === "appointments" && (
              <>
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.appointments')}
                </span>
                <span className="sm:hidden">
                  {t('consult.bookings.appointments_short')}
                </span>
              </>
            )}
            {id === "instant" && (
              <>
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.instant')}
                  </span>
                <span className="sm:hidden">
                  {t('consult.bookings.instant_short')}
                  </span>
                {pendingCount > 0 && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {pendingCount}
                  </span>
                )}
                {call.phase === "connected" && call.role === "doctor" && call.activeRequest && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </>
            )}
            {id === "bookings" && (
              <>
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.service_bookings')}
                </span>
                <span className="sm:hidden">
                  {t('consult.bookings.service_bookings_short')}
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
