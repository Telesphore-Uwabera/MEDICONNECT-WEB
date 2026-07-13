import { DashboardLayout } from "@/components/DashboardLayout";
import React from "react";
import { useTranslation } from "react-i18next";

function DoctorReviews() {
  const { t } = useTranslation();
  return (
    <DashboardLayout role="patient">
      <div>{t("pages.doctor.reviews")}</div>
    </DashboardLayout>
  );
}

export default DoctorReviews;
