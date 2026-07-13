// Global post-call completion flow for SCHEDULED appointments.
//
// When a doctor ends a scheduled-appointment call (see ConsultationRoom.endCall),
// CallContext stores a `pendingCompletion`. This gate observes it and runs the
// exact same flow as instant consults: a required patient medical record, then
// an optional hospital booking, then it marks the appointment complete.
//
// It's mounted once at the app root (next to GlobalCallOverlay) so it works no
// matter what page the doctor is on when the call ends.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t } from "i18next";
import { useCallContext } from "@/context/CallContext";
import {
  useGetAppointment,
  useCompleteAppointment,
} from "@/hooks/doctor/use-doctor-appointment";
import { ConsultationSummaryModal } from "@/pages/doctor/appointments/shared/ConsultationSummaryModal";
import { QuickPrescriptionModal } from "@/pages/doctor/appointments/shared/QuickPrescriptionModal";
import { BookPhysicalModal } from "@/pages/doctor/appointments/shared/BookPhysicalModal";
import { TransferPatientPrompt } from "@/pages/doctor/appointments/shared/TransferPatientPrompt";
import { getErrMsg } from "@/pages/doctor/appointments/shared/helpers";

export function AppointmentCompletionGate() {
  const { pendingCompletion, clearAppointmentCompletion } = useCallContext();
  if (!pendingCompletion) return null;
  // Re-key on appointment id so internal step state resets per appointment.
  return (
    <CompletionFlow
      key={pendingCompletion.appointmentId}
      appointmentId={pendingCompletion.appointmentId}
      onDone={clearAppointmentCompletion}
    />
  );
}

function CompletionFlow({
  appointmentId,
  onDone,
}: {
  appointmentId: number;
  onDone: () => void;
}) {
  const { data, isLoading } = useGetAppointment(appointmentId);
  const complete = useCompleteAppointment();
  const [step, setStep] = useState<"record" | "prescription" | "transfer" | "booking">("record");

  const appt = data?.appointment;
  const patientId = appt?.patient?.id ?? null;
  const patientName = appt?.patient?.name;
  const patientPhone = appt?.patient?.phone;
  const defaultNotes =
    appt?.notes?.chief_complaint || appt?.notes?.additional_notes || "";
  const defaultDiagnosis = appt?.notes?.diagnosis || appt?.notes?.chief_complaint || "";

  const finalize = () => {
    complete.mutate(appointmentId, {
      onSuccess: () => {
        toast.success(t("consult.booking.consultation_complete"));
        onDone();
      },
      onError: (err: unknown) => {
        toast.error(getErrMsg(err, t("consult.booking.create_failed")));
        onDone();
      },
    });
  };

  // Wait for the appointment (and thus the patient id) before showing the form.
  if (isLoading || !appt) {
    return (
      <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-[6px] bg-card px-4 py-3 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-[12px] text-foreground">
            {t("consult.booking.loading")}
          </span>
        </div>
      </div>
    );
  }

  // Step 1 — required: consultation summary (closing cancels completion).
  if (step === "record") {
    return (
      <ConsultationSummaryModal
        appointmentId={appointmentId}
        patientId={patientId}
        patientName={patientName}
        defaultComplaint={defaultNotes}
        defaultDiagnosis={defaultDiagnosis}
        onClose={onDone}
        onSaved={() => setStep("prescription")}
      />
    );
  }

  // Step 2 — optional: quick prescription (create + issue + optional pharmacy).
  if (step === "prescription") {
    return (
      <QuickPrescriptionModal
        appointmentId={appointmentId}
        patientName={patientName}
        defaultDiagnosis={defaultDiagnosis}
        defaultNotes={defaultNotes}
        onSkip={() => setStep("transfer")}
        onDone={() => setStep("transfer")}
      />
    );
  }

  // Step 3 - ask whether to transfer the patient before opening booking.
  if (step === "transfer") {
    return (
      <TransferPatientPrompt
        patientName={patientName}
        onConfirm={() => setStep("booking")}
        onDecline={finalize}
      />
    );
  }

  // Step 4 - optional: book a physical hospital visit, then complete.
  return (
    <BookPhysicalModal
      open
      onClose={onDone}
      patientId={patientId}
      patientName={patientName}
      patientPhone={patientPhone}
      defaultNotes={defaultNotes}
      onSkip={finalize}
      onBooked={finalize}
    />
  );
}
