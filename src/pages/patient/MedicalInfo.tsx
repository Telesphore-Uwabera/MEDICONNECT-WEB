import { useState, type ReactNode } from "react";
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

const TABS: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: "record", label: "Medical record", icon: <HeartPulse className="h-3.5 w-3.5" /> },
  { id: "visits", label: "Visit history", icon: <Stethoscope className="h-3.5 w-3.5" /> },
  { id: "files", label: "Files", icon: <FileText className="h-3.5 w-3.5" /> },
];

function MedicalInfo() {
  const [tab, setTab] = useState<Tab>("record");

  const record = useMyMedicalRecord();
  const visits = useMyVisits();
  const files = useMyFiles();

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader title="Medical information" subtitle="Your medical record, visit history and files" />

        {/* Tabs */}
        <div className="flex items-center border-b border-border/60 px-2 sm:px-4 bg-card/30 shrink-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium border-b-2 transition-colors shrink-0 whitespace-nowrap",
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl w-full mx-auto p-4">
            {tab === "record" && (
              record.isLoading ? (
                <PanelLoading label="Loading record…" />
              ) : (
                <>
                  {!record.data && (
                    <p className="text-[11px] text-muted-foreground mb-3">
                      No medical record has been created yet. Your doctor adds this during a consultation.
                    </p>
                  )}
                  <RecordRows record={record.data} />
                </>
              )
            )}

            {tab === "visits" && (
              visits.isLoading ? (
                <PanelLoading label="Loading visits…" />
              ) : (
                <VisitCards visits={visits.data ?? []} />
              )
            )}

            {tab === "files" && (
              files.isLoading ? (
                <PanelLoading label="Loading files…" />
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
