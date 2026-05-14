// Mock data for MEDICONNECT
export type DoctorStatus = "online" | "busy" | "offline";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  rating: number;
  reviews: number;
  experience: number;
  status: DoctorStatus;
  instantAvailable: boolean;
  fee: number;
  avatar: string;
}

export const doctors: Doctor[] = [
  { id: "d1", name: "Dr. Elena Vance", specialty: "Cardiology", hospital: "King Faisal Hospital", rating: 4.9, reviews: 248, experience: 12, status: "online", instantAvailable: true, fee: 45, avatar: "EV" },
  { id: "d2", name: "Dr. Marcus Thorne", specialty: "General Practice", hospital: "Kigali Medical Center", rating: 4.8, reviews: 412, experience: 9, status: "online", instantAvailable: true, fee: 25, avatar: "MT" },
  { id: "d3", name: "Dr. Anya Sharma", specialty: "Dermatology", hospital: "Rwanda Health Clinic", rating: 4.95, reviews: 189, experience: 8, status: "busy", instantAvailable: false, fee: 35, avatar: "AS" },
  { id: "d4", name: "Dr. Jamal Okafor", specialty: "Pediatrics", hospital: "King Faisal Hospital", rating: 4.85, reviews: 356, experience: 15, status: "online", instantAvailable: true, fee: 30, avatar: "JO" },
  { id: "d5", name: "Dr. Sofia Reyes", specialty: "Neurology", hospital: "Kigali Medical Center", rating: 4.92, reviews: 167, experience: 18, status: "offline", instantAvailable: false, fee: 60, avatar: "SR" },
  { id: "d6", name: "Dr. Liam Chen", specialty: "Orthopedics", hospital: "Rwanda Health Clinic", rating: 4.78, reviews: 223, experience: 11, status: "online", instantAvailable: false, fee: 50, avatar: "LC" },
];

export const specialties = ["All", "Cardiology", "General Practice", "Dermatology", "Pediatrics", "Neurology", "Orthopedics"];

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;      // display string: "May 02, 2026"
  rawDate: string;   // ISO string for sorting: "2026-05-02"
  time: string;
  status: "upcoming" | "completed" | "cancelled";
  type: "video" | "in-person";
}

export const appointments: Appointment[] = [
  { id: "a1", doctorName: "Dr. Elena Vance",   specialty: "Cardiology",       date: "May 02, 2026", rawDate: "2026-05-02", time: "10:30", status: "upcoming",   type: "video"     },
  { id: "a2", doctorName: "Dr. Anya Sharma",   specialty: "Dermatology",      date: "May 05, 2026", rawDate: "2026-05-05", time: "14:00", status: "upcoming",   type: "in-person" },
  { id: "a3", doctorName: "Dr. Marcus Thorne", specialty: "General Practice", date: "Apr 22, 2026", rawDate: "2026-04-22", time: "09:00", status: "completed",  type: "video"     },
  { id: "a4", doctorName: "Dr. Jamal Okafor",  specialty: "Pediatrics",       date: "Apr 18, 2026", rawDate: "2026-04-18", time: "11:30", status: "completed",  type: "in-person" },
];

export interface Prescription {
  id: string;
  doctorName: string;
  patientName: string;
  date: string;
  medications: { name: string; dosage: string; frequency: string }[];
  status: "active" | "filled" | "pending";
}

export const prescriptions: Prescription[] = [
  { id: "p1", doctorName: "Dr. Elena Vance", patientName: "John Mukasa", date: "Apr 25, 2026", status: "active",
    medications: [{ name: "Atorvastatin", dosage: "20mg", frequency: "Once daily" }, { name: "Aspirin", dosage: "81mg", frequency: "Once daily" }] },
  { id: "p2", doctorName: "Dr. Marcus Thorne", patientName: "Sarah Uwase", date: "Apr 22, 2026", status: "filled",
    medications: [{ name: "Amoxicillin", dosage: "500mg", frequency: "3x daily, 7 days" }] },
  { id: "p3", doctorName: "Dr. Anya Sharma", patientName: "David Niyonzima", date: "Apr 27, 2026", status: "pending",
    medications: [{ name: "Tretinoin Cream", dosage: "0.025%", frequency: "Apply nightly" }, { name: "Cetirizine", dosage: "10mg", frequency: "Once daily" }] },
];

export interface Medicine {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  status: "in-stock" | "low" | "out";
}

export const medicines: Medicine[] = [
  { id: "m1", name: "Atorvastatin 20mg", category: "Cardiovascular", stock: 142, price: 12.5, status: "in-stock" },
  { id: "m2", name: "Amoxicillin 500mg", category: "Antibiotic", stock: 23, price: 8.0, status: "low" },
  { id: "m3", name: "Aspirin 81mg", category: "Cardiovascular", stock: 380, price: 4.5, status: "in-stock" },
  { id: "m4", name: "Tretinoin Cream", category: "Dermatology", stock: 0, price: 28.0, status: "out" },
  { id: "m5", name: "Cetirizine 10mg", category: "Antihistamine", stock: 95, price: 6.0, status: "in-stock" },
  { id: "m6", name: "Metformin 500mg", category: "Diabetes", stock: 18, price: 9.5, status: "low" },
];

// Patient flow chart data (last 7 days)
export const patientFlowData = [
  { day: "Mon", patients: 124, consultations: 98 },
  { day: "Tue", patients: 142, consultations: 115 },
  { day: "Wed", patients: 156, consultations: 132 },
  { day: "Thu", patients: 138, consultations: 110 },
  { day: "Fri", patients: 178, consultations: 145 },
  { day: "Sat", patients: 92, consultations: 78 },
  { day: "Sun", patients: 64, consultations: 51 },
];

export const revenueData = [
  { month: "Nov", revenue: 42000 },
  { month: "Dec", revenue: 48000 },
  { month: "Jan", revenue: 51000 },
  { month: "Feb", revenue: 47000 },
  { month: "Mar", revenue: 58000 },
  { month: "Apr", revenue: 64000 },
];

export const departmentData = [
  { name: "Cardiology", value: 28, color: "hsl(172 76% 36%)" },
  { name: "General", value: 35, color: "hsl(168 76% 50%)" },
  { name: "Pediatrics", value: 18, color: "hsl(199 89% 48%)" },
  { name: "Other", value: 19, color: "hsl(215 35% 45%)" },
];

export interface PharmacyOrder {
  id: string;
  patient: string;
  doctor: string;
  items: number;
  total: number;
  status: "incoming" | "processing" | "ready" | "delivered";
  time: string;
}

export const pharmacyOrders: PharmacyOrder[] = [
  { id: "o1", patient: "John Mukasa", doctor: "Dr. Elena Vance", items: 2, total: 17.0, status: "incoming", time: "5 min ago" },
  { id: "o2", patient: "Sarah Uwase", doctor: "Dr. Marcus Thorne", items: 1, total: 8.0, status: "processing", time: "22 min ago" },
  { id: "o3", patient: "David Niyonzima", doctor: "Dr. Anya Sharma", items: 2, total: 34.0, status: "ready", time: "1 hr ago" },
  { id: "o4", patient: "Marie Iradukunda", doctor: "Dr. Jamal Okafor", items: 3, total: 26.5, status: "delivered", time: "3 hr ago" },
];

export const generateTimeSlots = (start = 8, end = 17, interval = 30) => {
  const slots: { time: string; status: "available" | "booked" | "blocked" | "reserved" }[] = [];
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += interval) {
      const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      const r = Math.random();
      const status = r < 0.55 ? "available" : r < 0.8 ? "booked" : r < 0.92 ? "reserved" : "blocked";
      slots.push({ time, status });
    }
  }
  return slots;
};
