import { IncomingCareInbox } from "@/pages/care/IncomingCareInbox";

export default function DoctorCareOrders() {
  return (
    <IncomingCareInbox
      scope="doctor"
      title="Care packets"
      subtitle="Patients you sent to a clinic, hospital or pharmacy — and replies when the facility finishes tests"
    />
  );
}
