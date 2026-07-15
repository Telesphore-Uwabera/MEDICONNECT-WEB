import type { ConsultationSummary } from "@/hooks/doctor/use-consultation-summaries";
import { ConsultationSummaryEditorModal } from "./ConsultationSummaryEditorModal";

interface Props {
  summary: ConsultationSummary;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditSummaryModal({ summary, onClose, onSaved }: Props) {
  return (
    <ConsultationSummaryEditorModal
      summary={summary}
      appointmentId={summary.appointment_id}
      instantConsultationId={summary.instant_consultation_id}
      patientId={summary.patient_id}
      patientName={summary.patient?.name}
      onClose={onClose}
      onSaved={() => {
        onSaved?.();
        onClose();
      }}
    />
  );
}
