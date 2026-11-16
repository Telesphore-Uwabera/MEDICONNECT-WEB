export type DeliveryChannel = "app" | "email" | "sms";

export type RxStatus =
  | "draft"
  | "sent-to-patient"
  | "sent-to-pharmacy"
  | "filled"
  | "cancelled"
  | "active"
  | "completed"
  | "rejected"
  | "pending"
  | "dispensed"
  | "returned"
  | "expired";

export interface HospitalRxCard {
  id: string | number;
  patientName: string;
  doctorName: string;
  date: string;
  status: RxStatus;
  issuer: "hospital";
  issuerOrg: string;
  channels: DeliveryChannel[];
  pharmacyName: string | null;
  medications: { name: string; dosage: string; frequency: string }[];
  createdAt?: string | number;
}
