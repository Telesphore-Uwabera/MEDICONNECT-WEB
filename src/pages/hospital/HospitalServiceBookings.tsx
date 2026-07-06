import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import React from "react";
import { useTranslation } from "react-i18next";

function HospitalServiceBookings() {
  const { t, i18n } = useTranslation();
  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.service_bookings_title")}
          subtitle={t("pages.hospital.service_bookings_sub", { date: new Date().toLocaleDateString(i18n.language, { weekday: "long", month: "long", day: "numeric" }) })}
        />
        <div className="flex justify-center items-center pt-20">{t("pages.hospital.service_bookings_empty")}</div>
      </div>
    </DashboardLayout>
  );
}

export default HospitalServiceBookings;
