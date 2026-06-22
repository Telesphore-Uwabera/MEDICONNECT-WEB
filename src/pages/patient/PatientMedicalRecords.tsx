import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Calendar, FileText, HeartPulse } from "lucide-react";
import { useMyMedicalRecord, useMyVisits, useMyFiles } from "@/hooks/patient/use-patient-medical-record";
import { RecordRows, VisitCards, FileRows, PanelLoading } from "@/pages/doctor/appointments/shared/PatientMedicalPanels";

// ─── Medical Info Content ────────────────────────────────────────────────────

function MedicalInfoContent() {
  const record = useMyMedicalRecord();
  const visits = useMyVisits();
  const files = useMyFiles();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Left Column: Medical Record */}
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
              <HeartPulse className="h-4 w-4 text-primary" /> My Medical Record
            </h3>
            {record.isLoading ? (
              <PanelLoading label="Loading record..." />
            ) : !record.data ? (
              <p className="text-xs text-muted-foreground">No medical record data found.</p>
            ) : (
              <RecordRows record={record.data} />
            )}
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
              <FileText className="h-4 w-4 text-primary" /> Files & Documents
            </h3>
            {files.isLoading ? (
              <PanelLoading label="Loading files..." />
            ) : (
              <FileRows files={files.data ?? []} />
            )}
          </div>
        </div>

        {/* Right Column: Visits */}
        <div className="space-y-6">
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Calendar className="h-4 w-4 text-primary" /> Past Visits
            </h3>
            {visits.isLoading ? (
              <PanelLoading label="Loading visits..." />
            ) : (
              <VisitCards visits={visits.data ?? []} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientMedicalRecords() {
  const { t } = useTranslation();

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full w-full">
        <PageHeader
          title="Medical Records"
          subtitle="View your clinical notes, diagnoses, and attached reports."
        />

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          <MedicalInfoContent />
        </div>
      </div>
    </DashboardLayout>
  );
}
