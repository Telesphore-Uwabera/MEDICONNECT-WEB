import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { apiFetch } from "@/lib/api";
import { listFrom } from "@/lib/list-payload";

type HospitalDoctor = {
  id?: number;
  name_en?: string;
  specialization?: string;
  status?: string;
  user?: { name?: string; email?: string };
};

const HospitalDoctors = () => {
  const { t } = useTranslation();
  const { data: doctors = [], isLoading, isError } = useQuery({
    queryKey: ["hospital-doctors"],
    queryFn: () =>
      apiFetch<unknown>("/hospital/doctors").then((body) =>
        listFrom<HospitalDoctor>(body, "doctors"),
      ),
  });

  return (
    <DashboardLayout role="hospital">
      <PageHeader
        title={t("pages.hospital.doctors_title")}
        subtitle={t("pages.hospital.doctors_sub", { count: doctors.length })}
      />
      <div className="p-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">{t("pages.hospital.load_doctors_failed", { defaultValue: "Could not load doctors." })}</p>
        ) : doctors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("pages.hospital.no_doctors_yet", { defaultValue: "No doctors are linked to this facility yet." })}</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doctor, index) => (
              <div key={doctor.id ?? index} className="rounded-[6px] border border-border bg-card p-4">
                <p className="font-semibold text-sm">{doctor.user?.name || doctor.name_en || "Doctor"}</p>
                <p className="text-xs text-muted-foreground mt-1">{doctor.specialization || doctor.user?.email || ""}</p>
                {doctor.status && <p className="text-[11px] text-muted-foreground mt-2 capitalize">{doctor.status}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HospitalDoctors;
