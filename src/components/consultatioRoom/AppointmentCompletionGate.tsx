// Global post-call completion flow for SCHEDULED appointments.
//
// When a doctor ends a scheduled-appointment call (see ConsultationRoom.endCall),
// CallContext stores a `pendingCompletion`. This gate observes it and runs the
// exact same flow as instant consults: a required patient medical record, then
// an optional hospital booking, then it marks the appointment complete.
//
// It's mounted once at the app root (next to GlobalCallOverlay) so it works no
// matter what page the doctor is on when the call ends.

import { useState, type ReactNode } from "react";
import { Loader2, Video } from "lucide-react";
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
import { CareContinuePanel, orderTypeFromChoice, referralKindFromChoice, referralUrgencyFromChoice } from "@/pages/doctor/appointments/shared/CareContinuePanel";
import { ReferralCreateModal } from "@/pages/doctor/appointments/shared/ReferralCreateModal";
import { ClinicalOrderModal } from "@/pages/doctor/appointments/shared/ClinicalOrderModal";
import type { ReferralTargetType } from "@/hooks/doctor/use-doctor-referrals";
import type { CareOrderType } from "@/hooks/doctor/use-care-orders";
import { getErrMsg } from "@/pages/doctor/appointments/shared/helpers";

export function AppointmentCompletionGate() {
  const { pendingCompletion, clearAppointmentCompletion, pausedCall, startCall } = useCallContext();
  if (!pendingCompletion) return null;
  // Re-key on appointment id so internal step state resets per appointment.
  return (
    <CompletionFlow
      key={pendingCompletion.appointmentId}
      appointmentId={pendingCompletion.appointmentId}
      onDone={clearAppointmentCompletion}
      onRejoin={
        pausedCall
          ? () => {
              clearAppointmentCompletion();
              startCall(pausedCall.roomName, pausedCall.token);
            }
          : undefined
      }
    />
  );
}

function CompletionFlow({
  appointmentId,
  onDone,
  onRejoin,
}: {
  appointmentId: number;
  onDone: () => void;
  onRejoin?: () => void;
}) {
  const { data, isLoading } = useGetAppointment(appointmentId);
  const complete = useCompleteAppointment();
  const { clearPausedCall } = useCallContext();
  const [step, setStep] = useState<"record" | "prescription" | "continue" | "booking" | "refer" | "order">("record");
  const [referKind, setReferKind] = useState<ReferralTargetType>("hospital");
  const [referUrgency, setReferUrgency] = useState("medium");
  const [orderKind, setOrderKind] = useState<CareOrderType>("lab");
  const backToContinue = () => setStep("continue");

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
        clearPausedCall();
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
  const rejoinBar = onRejoin ? (
    <div className="fixed bottom-5 left-1/2 z-[10001] flex w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-[8px] border border-emerald-500/30 bg-[#111] px-4 py-3 text-white shadow-2xl">
      <p className="text-[12px] text-white/80">
        {t("consult.call.ended_rejoin_hint", "You can rejoin until the visit is marked complete.")}
      </p>
      <button
        type="button"
        onClick={onRejoin}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] bg-emerald-600 px-3 text-[12px] font-semibold hover:bg-emerald-500"
      >
        <Video className="h-3.5 w-3.5" />
        {t("consult.bookings.rejoin", "Rejoin")}
      </button>
    </div>
  ) : null;

  const wrap = (node: ReactNode) => (
    <>
      {rejoinBar}
      {node}
    </>
  );

  if (step === "record") {
    return wrap(
      <ConsultationSummaryModal
        appointmentId={appointmentId}
        patientId={patientId}
        patientName={patientName}
        defaultComplaint={defaultNotes}
        defaultDiagnosis={defaultDiagnosis}
        onClose={onDone}
        onSaved={() => setStep("prescription")}
      />,
    );
  }

  // Step 2 — optional: quick prescription (create + issue + optional pharmacy).
  if (step === "prescription") {
    return wrap(
      <QuickPrescriptionModal
        appointmentId={appointmentId}
        patientName={patientName}
        defaultDiagnosis={defaultDiagnosis}
        defaultNotes={defaultNotes}
        onSkip={() => setStep("continue")}
        onDone={() => setStep("continue")}
      />,
    );
  }

  if (step === "continue") {
    return wrap(
      <CareContinuePanel
        patientName={patientName}
        onChoose={(choice) => {
          if (choice === "done") {
            finalize();
            return;
          }
          if (choice === "facility-book") {
            setStep("booking");
            return;
          }
          const referral = referralKindFromChoice(choice);
          if (referral) {
            setReferKind(referral);
            setReferUrgency(referralUrgencyFromChoice(choice) || "medium");
            setStep("refer");
            return;
          }
          const orderType = orderTypeFromChoice(choice);
          if (orderType) {
            setOrderKind(orderType);
            setStep("order");
          }
        }}
      />,
    );
  }

  if (step === "refer") {
    return wrap(
      <ReferralCreateModal
        open
        kind={referKind}
        patientId={patientId}
        patientName={patientName}
        appointmentId={appointmentId}
        defaultReason={defaultNotes}
        defaultUrgency={referUrgency}
        onClose={backToContinue}
        onSkip={backToContinue}
        onCreated={backToContinue}
      />,
    );
  }

  if (step === "order") {
    return wrap(
      <ClinicalOrderModal
        open
        kind={orderKind}
        patientId={patientId}
        patientName={patientName}
        appointmentId={appointmentId}
        defaultNotes={defaultNotes}
        defaultDiagnosis={defaultDiagnosis}
        onClose={backToContinue}
        onSkip={backToContinue}
        onCreated={backToContinue}
      />,
    );
  }

  return wrap(
    <BookPhysicalModal
      open
      onClose={backToContinue}
      patientId={patientId}
      patientName={patientName}
      patientPhone={patientPhone}
      defaultNotes={defaultNotes}
      onSkip={backToContinue}
      onBooked={backToContinue}
    />,
  );
}
