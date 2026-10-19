import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Referral } from "@/hooks/doctor/use-doctor-referrals";

export default function HospitalReferrals() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["hospital-referrals"],
    queryFn: async () => {
      const res = await apiFetch<{ referrals?: Referral[]; data?: Referral[] }>("/hospital/referrals");
      return Array.isArray(res.referrals) ? res.referrals : Array.isArray(res.data) ? res.data : [];
    },
  });
  const referrals = data ?? [];

  return (
    <DashboardLayout role="hospital">
      <PageHeader
        title={t("pages.hospital.referrals_title", "Incoming referrals")}
        subtitle={t("pages.hospital.referrals_sub", "Patients a MediConnect doctor sent to this facility")}
      />
      <div className="p-4 sm:p-6 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading", "Loading…")}</p>
        ) : referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("pages.hospital.referrals_empty", "When a doctor refers a patient here, they appear in this list and in facility visits.")}
          </p>
        ) : (
          referrals.map((row) => (
            <div key={row.id} className="rounded-[6px] border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{row.patient?.name || t("pages.hospital.patient", "Patient")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("pages.hospital.from_doctor", "From")} {row.referring_doctor?.name || "doctor"} · {row.status}
              </p>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
