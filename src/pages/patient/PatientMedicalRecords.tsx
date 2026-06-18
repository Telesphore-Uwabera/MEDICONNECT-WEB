import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  useGetPatientRecordsInstant,
  useGetPatientRecordsAppointments,
  useGetPatientRecordsInstantSummary,
  useGetPatientRecordsAppointmentSummary,
  RecordInstantConsultation,
  RecordAppointment,
} from "@/hooks/patient/use-patient-records";
import { format, parseISO } from "date-fns";
import { FileText, Calendar, Sparkles, Video, Clock, X, ChevronLeft, ChevronRight, File, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "MMM dd, yyyy"); }
  catch { return dateStr; }
}

function formatTime(dateStr: string) {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "hh:mm a"); }
  catch { return dateStr; }
}

// ─── Details Modal ────────────────────────────────────────────────────────────

function RecordDetailsModal({
  isOpen,
  onClose,
  id,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  id: number | null;
  type: "instant" | "appointments";
}) {
  const { data: instantData, isLoading: loadingInstant } = useGetPatientRecordsInstantSummary(type === "instant" && id ? id : "");
  const { data: apptData, isLoading: loadingAppt } = useGetPatientRecordsAppointmentSummary(type === "appointments" && id ? id : "");

  if (!isOpen || !id) return null;

  const isLoading = type === "instant" ? loadingInstant : loadingAppt;
  const data = type === "instant" ? instantData : apptData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Medical Record Details
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {type === "instant" ? "Instant Consultation" : "Scheduled Appointment"} #{id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-20 bg-muted rounded-lg" />
              <div className="h-40 bg-muted rounded-lg" />
              <div className="h-32 bg-muted rounded-lg" />
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-muted-foreground">Failed to load record details.</div>
          ) : (
            <div className="space-y-8">
              
              {/* Session Info */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Session Information</h3>
                <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs text-muted-foreground mb-1">Status</span>
                    <span className="text-sm font-semibold text-foreground capitalize">
                      {type === "instant" ? (data as any).session?.status : (data as any).appointment?.status}
                    </span>
                  </div>
                  {((data as any).session?.created_at || (data as any).appointment?.created_at || (data as any).appointment?.appointment_date) && (
                    <div>
                      <span className="block text-xs text-muted-foreground mb-1">Date</span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatDate((data as any).session?.created_at || (data as any).appointment?.created_at || (data as any).appointment?.appointment_date)}
                      </span>
                    </div>
                  )}
                  {type === "appointments" && ((data as any).appointment?.doctor || (data as any).appointment?.hospital) && (
                    <div className="col-span-2">
                      <span className="block text-xs text-muted-foreground mb-1">Provider</span>
                      <span className="text-sm font-semibold text-foreground">
                        {(data as any).appointment.doctor?.user?.name || "Unknown Provider"}
                        {(data as any).appointment.hospital ? ` @ ${(data as any).appointment.hospital.name_en}` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnosis / Visit History */}
              {data.visit_history && !Array.isArray(data.visit_history) && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Diagnosis</h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground">{data.visit_history.diagnosis}</p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Date: {data.visit_history.visit_date ? formatDate(data.visit_history.visit_date) : "—"}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {data.notes && data.notes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Clinical Notes</h3>
                  <div className="space-y-3">
                    {data.notes.map(note => (
                      <div key={note.id} className="bg-card border border-border/70 rounded-lg p-4 text-sm text-foreground shadow-sm">
                        {note.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {data.files && data.files.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Attachments & Reports</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {data.files.map(file => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-3 p-3 bg-card border border-border/70 rounded-lg hover:border-primary/50 hover:shadow-sm transition-all"
                      >
                        <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <File className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {file.title}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase mt-0.5">{file.file_type}</p>
                          {file.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{file.notes}</p>}
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary mt-1 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(!data.notes?.length && !data.files?.length && (!data.visit_history || Array.isArray(data.visit_history))) && (
                <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-lg border border-border/50">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p>No medical data recorded for this session yet.</p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/30 flex justify-end">
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>

      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientMedicalRecords() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"appointments" | "instant">("appointments");
  const [page, setPage] = useState(1);

  // Modal State
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  // Queries
  const { data: appointmentsData, isLoading: loadingAppts } = useGetPatientRecordsAppointments(tab === "appointments" ? page : 1);
  const { data: instantsData, isLoading: loadingInstants } = useGetPatientRecordsInstant(tab === "instant" ? page : 1);

  const handleTabChange = (newTab: "appointments" | "instant") => {
    setTab(newTab);
    setPage(1);
  };

  const currentData = tab === "appointments" ? appointmentsData : instantsData;
  const isLoading = tab === "appointments" ? loadingAppts : loadingInstants;
  const items = currentData?.data || [];
  const totalPages = currentData?.last_page || 1;

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full w-full">
        <PageHeader
          title="Medical Records"
          subtitle="View your clinical notes, diagnoses, and attached reports."
        />

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border/60">
            <button
              onClick={() => handleTabChange("appointments")}
              className={cn(
                "px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
                tab === "appointments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Calendar className="h-4 w-4" />
              Scheduled Appointments
            </button>
            <button
              onClick={() => handleTabChange("instant")}
              className={cn(
                "px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
                tab === "instant" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Sparkles className="h-4 w-4" />
              Instant Consultations
            </button>
          </div>

          {/* List */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-card border border-border/60 rounded-xl animate-pulse" />
              ))
            ) : items.length === 0 ? (
              <div className="text-center py-20 bg-card border border-border/60 rounded-xl">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground">No records found</h3>
                <p className="text-sm text-muted-foreground mt-1">You don't have any medical records in this category yet.</p>
              </div>
            ) : (
              items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedRecordId(item.id)}
                  className="group bg-card hover:bg-secondary/40 border border-border/70 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between cursor-pointer transition-all hover:shadow-sm hover:border-primary/30"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border",
                      tab === "instant" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-sky-50 text-sky-600 border-sky-200"
                    )}>
                      {tab === "instant" ? <Video className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground flex items-center gap-2 text-base">
                        {tab === "appointments" ? (
                          <>
                            {item.doctor?.user?.name || "Unknown Provider"}
                            {item.hospital?.name_en && <span className="text-muted-foreground text-sm font-normal">@ {item.hospital.name_en}</span>}
                          </>
                        ) : (
                          "Instant Consultation"
                        )}
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {item.created_at && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(item.created_at)} • {formatTime(item.created_at)}
                          </span>
                        )}
                        <span className="capitalize px-2 py-0.5 rounded-full bg-secondary text-foreground font-medium">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    {item.visit_history && (
                      <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 font-medium">
                        Diagnosis added
                      </span>
                    )}
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {item.notes && item.notes.length > 0 && (
                        <span className="flex items-center gap-1" title={`${item.notes.length} notes`}>
                          <FileText className="h-4 w-4" /> {item.notes.length}
                        </span>
                      )}
                      {item.files && item.files.length > 0 && (
                        <span className="flex items-center gap-1" title={`${item.files.length} attachments`}>
                          <File className="h-4 w-4" /> {item.files.length}
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="ml-auto sm:ml-0 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>

      <RecordDetailsModal
        isOpen={selectedRecordId !== null}
        onClose={() => setSelectedRecordId(null)}
        id={selectedRecordId}
        type={tab}
      />

    </DashboardLayout>
  );
}
