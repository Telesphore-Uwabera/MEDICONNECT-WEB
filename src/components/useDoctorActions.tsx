// Shared booking/connect actions for doctor cards.
//
// Both the grid card (DoctorCard) and the list row (DoctorListItem) on
// /patient/search-doctors need identical, working Book / Connect behaviour.
// This hook owns the modal state + handlers, and <DoctorActionModals> renders
// the same UnifiedModal + BookingDialog the grid card uses — so every view's
// buttons function the same.

import { useState } from "react";
import { UnifiedModal } from "@/components/DoctorCard";
import { BookingDialog } from "@/components/BookingDialog";
import { useCallStore } from "@/context/CallStore";
import type { Doctor } from "@/context/CallStore";
import type { ApiDoctor } from "@/hooks/patient/use-patient-doctor";

type ModalMode = "details" | "connect";

export function useDoctorActions(doctorProp: ApiDoctor) {
  const call = useCallStore();
  const [doctor, setDoctor] = useState<ApiDoctor>(doctorProp);
  const [bookOpen, setBookOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<ModalMode>("details");

  // Keep in sync if the parent re-renders with fresh doctor data (e.g. after a
  // list refetch), but not mid-booking.
  if (!bookOpen && doctorProp !== doctor && doctorProp.id === doctor.id) {
    setDoctor(doctorProp);
  }
  const handleDoctorUpdated = (d: ApiDoctor) => setDoctor(d);

  const callDoctor: Doctor = {
    id: doctor.id,
    user: { id: doctor.user.id, name: doctor.user.name, avatar: doctor.user.avatar },
    specialization: doctor.specialization,
  };

  const isThisDoctor = call.doctor?.id === doctor.id;
  const isCallInProgress = isThisDoctor && call.phase !== "idle" && call.phase !== "ended";
  const isConnected = isThisDoctor && call.phase === "connected";

  const canConnect = doctor.is_available && !doctor.bookings_paused && doctor.instant_consultation;
  const canBook = doctor.is_available && !doctor.bookings_paused;

  const openDetails = () => { setInitialMode("details"); setModalOpen(true); };
  const openConnect = () => {
    if (!canConnect && !isCallInProgress) return;
    setInitialMode("connect");
    setModalOpen(true);
  };
  const openBook = () => { if (canBook && !isCallInProgress) setBookOpen(true); };
  const handleMinimize = () => setModalOpen(false);
  const handleCloseCompletely = () => {
    setModalOpen(false);
    if (isCallInProgress) call.endCall();
  };

  return {
    doctor, bookOpen, setBookOpen, modalOpen, initialMode, callDoctor,
    isThisDoctor, isCallInProgress, isConnected, canConnect, canBook,
    openDetails, openConnect, openBook, handleMinimize, handleCloseCompletely, handleDoctorUpdated,
  };
}

export type DoctorActions = ReturnType<typeof useDoctorActions>;

/** Renders the same modals the grid card uses, driven by useDoctorActions state. */
export function DoctorActionModals({ a }: { a: DoctorActions }) {
  return (
    <>
      <UnifiedModal
        doctor={a.doctor}
        callDoctor={a.callDoctor}
        initialMode={a.initialMode}
        open={a.modalOpen}
        onMinimize={a.handleMinimize}
        onCloseCompletely={a.handleCloseCompletely}
        onBook={() => a.setBookOpen(true)}
        canBook={a.canBook}
        canConnect={a.canConnect}
      />
      <BookingDialog
        doctor={a.doctor}
        open={a.bookOpen}
        onOpenChange={a.setBookOpen}
        onConfirmed={a.handleDoctorUpdated}
      />
    </>
  );
}
