import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { DoctorCard } from "@/components/DoctorCard";
import { doctors } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const HospitalDoctors = () => {
  const { t } = useTranslation();
  return (
    <DashboardLayout role="hospital">
      <PageHeader title={t("pages.hospital.doctors_title")} subtitle={t("pages.hospital.doctors_sub", { count: doctors.length })} actions={<Button className="bg-gradient-primary hover:opacity-90"><Plus className="h-4 w-4 mr-1.5" />{t("pages.hospital.add_doctor")}</Button>} />
      <div className="p-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {doctors.map((d) => <DoctorCard key={d.id} doctor={d} />)}
      </div>
    </DashboardLayout>
  );
};

export default HospitalDoctors;
