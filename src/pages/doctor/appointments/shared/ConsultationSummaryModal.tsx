import { ConsultationSummaryEditorModal } from "./ConsultationSummaryEditorModal";

interface Props {
  appointmentId?: number | null;
  instantConsultationId?: number | null;
  patientId: number | null;
  patientName?: string;
  defaultComplaint?: string;
  defaultDiagnosis?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ConsultationSummaryModal(props: Props) {
  return <ConsultationSummaryEditorModal {...props} />;
}
