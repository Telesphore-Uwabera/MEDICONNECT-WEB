


import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import React from "react";
import { useTranslation } from "react-i18next";

function PharmacyCategories() {
  const { t } = useTranslation();
  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.overview_title")}
          subtitle={t("pages.pharmacy.overview_sub")}
        />
        <div className="flex justify-center items-center pt-20">
          PharmacyCategories
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PharmacyCategories;
