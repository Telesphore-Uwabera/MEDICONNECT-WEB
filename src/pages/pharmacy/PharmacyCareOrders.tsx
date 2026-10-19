import { IncomingCareInbox } from "@/pages/care/IncomingCareInbox";

export default function PharmacyCareOrders() {
  return (
    <IncomingCareInbox
      scope="pharmacy"
      title="Pharmacy from doctors"
      subtitle="Patients a MediConnect doctor sent here with a prescription or medicine packet"
    />
  );
}
