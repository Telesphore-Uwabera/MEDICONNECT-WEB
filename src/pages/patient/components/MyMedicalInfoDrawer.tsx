import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X, HeartPulse, Stethoscope, FileText } from "lucide-react";
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
  { id: "record", labelKey: "consult.record.tab_record", icon: <HeartPulse className="h-3.5 w-3.5" /> },
  { id: "visits", labelKey: "consult.record.tab_visits", icon: <Stethoscope className="h-3.5 w-3.5" /> },
  { id: "files", labelKey: "consult.record.tab_files", icon: <FileText className="h-3.5 w-3.5" /> },
];

export function MyMedicalInfoDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("record");

  const record = useMyMedicalRecord();
  const visits = useMyVisits();
  const files = useMyFiles();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex flex-col bg-card border-l border-border shadow-2xl w-full max-w-md h-full overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 bg-card shrink-0">
          <div className="h-9 w-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/10">
            <HeartPulse className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground">{t("consult.medical_info.drawer_title")}</p>
            <p className="text-[10px] text-muted-foreground">{t("consult.medical_info.drawer_subtitle")}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 border-b border-border/60 bg-card shrink-0">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors",
                tab === tb.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tb.icon}
              {t(tb.labelKey)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "record" &&
            (record.isLoading ? (
              <PanelLoading label={t("consult.record.loading_record")} />
            ) : (
              <>
                {!record.data && (
                  <p className="text-[11px] text-muted-foreground mb-3">
                    {t("consult.record.no_record_short")}
                  </p>
                )}
                <RecordRows record={record.data} />
              </>
            ))}

          {tab === "visits" &&
            (visits.isLoading ? <PanelLoading label={t("consult.visits.loading")} /> : <VisitCards visits={visits.data ?? []} />)}

          {tab === "files" &&
            (files.isLoading ? <PanelLoading label={t("consult.files.loading")} /> : <FileRows files={files.data ?? []} />)}
        </div>
      </div>
    </div>
  );
}
