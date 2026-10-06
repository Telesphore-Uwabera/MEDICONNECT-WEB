import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useGetPublicInsurances } from "@/hooks/hospital/use-hopital-insurances";
import { useTranslation } from "react-i18next";

function PatientInsurence() {
  const { t } = useTranslation();
  const { data: insurances = [], isLoading, isError } = useGetPublicInsurances();

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.insurance_label")}
          subtitle={t("pages.patient.insurance_any")}
        />
        <div className="p-8">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">{t("pages.hospital.load_insurances_failed")}</p>
          ) : insurances.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("pages.hospital.no_insurances_found")}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insurances.map((insurance) => (
                <div key={insurance.id} className="rounded-[6px] border border-border bg-card p-4">
                  <p className="font-semibold text-sm">{insurance.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{insurance.code}</p>
                  {insurance.type && <p className="text-[11px] text-muted-foreground mt-2 capitalize">{insurance.type}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PatientInsurence;
