import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import React from "react";
import { useTranslation } from "react-i18next";

function MedicalInfo() {
  const { t } = useTranslation();
  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub")}
        />
        <div className="flex justify-center items-center pt-20">MedicalInfo</div>
      </div>
    </DashboardLayout>
  );
}

export default MedicalInfo;
