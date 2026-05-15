
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import React from "react";
import { useTranslation } from "react-i18next";

function ManageHospitals() {
  const { t } = useTranslation();
  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.overview_title")}
          subtitle={t("pages.admin.overview_sub")}
        />
        <div className="flex justify-center items-center pt-20">ManageHospitals</div>
      </div>
    </DashboardLayout>
  );
}

export default ManageHospitals;
