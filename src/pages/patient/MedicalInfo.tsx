import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { HeartPulse, Stethoscope, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMyMedicalRecord,
  useMyVisits,
  useMyFiles,
} from "@/hooks/patient/use-patient-medical-record";
import {
  RecordRows,
  VisitCards,
  FileRows,
  PanelLoading,
} from "@/pages/doctor/appointments/shared/PatientMedicalPanels";

type Tab = "record" | "visits" | "files";

const TABS: Array<{ id: Tab; labelKey: string; icon: ReactNode }> = [
  { id: "record", labelKey: "consult.medical_info.tab_record", icon: <HeartPulse className="h-3.5 w-3.5" /> },
  { id: "visits", labelKey: "consult.medical_info.tab_visits", icon: <Stethoscope className="h-3.5 w-3.5" /> },
  { id: "files", labelKey: "consult.medical_info.tab_files", icon: <FileText className="h-3.5 w-3.5" /> },
];

function MedicalInfo() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("record");

  const record = useMyMedicalRecord();
  const visits = useMyVisits();
  const files = useMyFiles();

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader title={t("consult.medical_info.title")} subtitle={t("consult.medical_info.subtitle")} />

        {/* Tabs */}
        <div className="flex items-center border-b border-border/60 px-2 sm:px-4 bg-card/30 shrink-0 overflow-x-auto">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium border-b-2 transition-colors shrink-0 whitespace-nowrap",
                tab === tb.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {tb.icon}
              {t(tb.labelKey)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl w-full mx-auto p-4">
            {tab === "record" && (
              record.isLoading ? (
                <PanelLoading label={t("consult.record.loading_record")} />
              ) : (
                <>
                  {!record.data && (
                    <p className="text-[11px] text-muted-foreground mb-3">
                      {t("consult.record.no_record")}
                    </p>
                  )}
                  <RecordRows record={record.data} />
                </>
              )
            )}

            {tab === "visits" && (
              visits.isLoading ? (
                <PanelLoading label={t("consult.visits.loading")} />
              ) : (
                <VisitCards visits={visits.data ?? []} />
              )
            )}

            {tab === "files" && (
              files.isLoading ? (
                <PanelLoading label={t("consult.files.loading")} />
              ) : (
                <FileRows files={files.data ?? []} />
              )
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default MedicalInfo;
