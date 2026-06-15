    
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import React from "react";
import { useTranslation } from "react-i18next";

function ServiceBookings() {
  const { t, i18n } = useTranslation();
  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub", { date: new Date().toLocaleDateString(i18n.language, { weekday: "long", month: "long", day: "numeric" }) })}
        />
        <div className="flex justify-center items-center pt-20">ServiceBookings</div>
      </div>
    </DashboardLayout>
  );
}

export default ServiceBookings;
