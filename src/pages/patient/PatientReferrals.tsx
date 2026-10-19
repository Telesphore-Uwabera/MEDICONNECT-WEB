import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Pill, Stethoscope } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useGetPatientReferrals } from "@/hooks/patient/use-patient-referrals";

export default function PatientReferrals() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetPatientReferrals();
  const referrals = data?.referrals ?? [];

  return (
    <DashboardLayout role="patient">
      <PageHeader
        title={t("pages.patient.referrals_title", "Care from your doctor")}
        subtitle={t("pages.patient.referrals_sub", "Registered clinics, hospitals and pharmacies your doctor sent you to")}
      />
      <div className="p-4 sm:p-6 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading", "Loading…")}</p>
        ) : referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("pages.patient.referrals_empty", "When a doctor refers you, the next step stays here so you do not leave MediConnect.")}
          </p>
        ) : (
          referrals.map((row) => {
            const target = row.hospital?.name || row.pharmacy?.name || t("pages.patient.partner", "Partner");
            const to = row.hospital?.name
              ? `/patient/search-facilities?q=${encodeURIComponent(row.hospital.name)}`
              : row.pharmacy?.name
                ? `/patient/search-pharmacy?q=${encodeURIComponent(row.pharmacy.name)}`
                : "/patient/search-facilities";
            const Icon = row.hospital ? Building2 : row.pharmacy ? Pill : Stethoscope;
            return (
              <Link
                key={row.id}
                to={to}
                className="flex items-start gap-3 rounded-[6px] border border-border bg-card p-4 hover:border-primary/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{target}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{row.reason}</span>
                  <span className="mt-2 inline-flex text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {row.status} · {t("pages.patient.continue_in_app", "Continue in MediConnect")}
                  </span>
                </span>
              </Link>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
