import { IncomingCareInbox } from "@/pages/care/IncomingCareInbox";

export default function PatientCareOrders() {
  return (
    <IncomingCareInbox
      scope="patient"
      title="Your care orders"
      subtitle="Labs, scans, procedures, pharmacy packets and follow-ups your doctor sent inside MediConnect"
    />
  );
}
