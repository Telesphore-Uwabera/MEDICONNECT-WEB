

import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import React from "react";
import { useTranslation } from "react-i18next";

function PharmacyDeliveries() {
  const { t, i18n } = useTranslation();
  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.deliveries_title")}
          subtitle={t("pages.pharmacy.deliveries_sub")}
        />
        <div className="flex justify-center items-center pt-20">{t("pages.pharmacy.deliveries_placeholder")}</div>
      </div>
    </DashboardLayout>
  );
}

export default PharmacyDeliveries;
