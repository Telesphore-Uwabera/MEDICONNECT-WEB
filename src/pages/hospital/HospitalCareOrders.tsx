import { IncomingCareInbox } from "@/pages/care/IncomingCareInbox";

export default function HospitalCareOrders() {
  return (
    <IncomingCareInbox
      scope="hospital"
      title="Clinical orders"
      subtitle="Labs, imaging, procedures, admissions and nursing requests — with the patient packet the doctor shared"
    />
  );
}
