// Shared smart prescription store. In-memory mock with cross-role reactivity.
import { useSyncExternalStore } from "react";
import { medicines as catalog } from "./mock-data";

export type DeliveryChannel = "app" | "email" | "sms";
export type RxStatus = "draft" | "sent-to-patient" | "sent-to-pharmacy" | "filled" | "cancelled" | "active" | "completed" | "rejected" | "pending"  | "dispensed" | "returned"| "expired";

export interface RxMedication {
  name: string;
  dosage: string;
  frequency: string;
  quantity?: number;
  notes?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  rating: number;
  /** medicine name (normalized) -> stock count */
  stock: Record<string, number>;
}

export interface Prescription {
  id: string;
  doctorName: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  issuer: "doctor" | "hospital";
  issuerOrg?: string; // hospital name when issuer = hospital
  date: string; // display
  createdAt: number;
  medications: RxMedication[];
  diagnosis?: string;
  notes?: string;
  status: RxStatus;
  pharmacyId?: string;
  pharmacyName?: string;
  channels: DeliveryChannel[]; // copies sent to patient
}

// ---- Pharmacy directory with stock keyed by lowercased medicine "base name" ----
const norm = (n: string) => n.toLowerCase().split(/\s|\d/)[0];

export const pharmacies: Pharmacy[] = [
  {
    id: "ph1",
    name: "MediPlus Pharmacy",
    address: "KN 4 Ave, Kigali",
    distanceKm: 1.2,
    rating: 4.8,
    stock: { atorvastatin: 120, aspirin: 300, amoxicillin: 80, cetirizine: 60, metformin: 40, tretinoin: 0 },
  },
  {
    id: "ph2",
    name: "City Care Pharmacy",
    address: "KG 11 Ave, Kacyiru",
    distanceKm: 2.7,
    rating: 4.6,
    stock: { atorvastatin: 25, aspirin: 150, amoxicillin: 0, cetirizine: 90, metformin: 60, tretinoin: 12 },
  },
  {
    id: "ph3",
    name: "Wellness Drugstore",
    address: "Nyarutarama Plaza",
    distanceKm: 3.8,
    rating: 4.9,
    stock: { atorvastatin: 60, aspirin: 0, amoxicillin: 35, cetirizine: 0, metformin: 22, tretinoin: 18 },
  },
  {
    id: "ph4",
    name: "Remera Health Pharmacy",
    address: "KG 17 Ave, Remera",
    distanceKm: 5.1,
    rating: 4.5,
    stock: { atorvastatin: 10, aspirin: 200, amoxicillin: 50, cetirizine: 30, metformin: 0, tretinoin: 4 },
  },
];

export const medicineCatalog = catalog;

export interface PharmacyMatch {
  pharmacy: Pharmacy;
  inStock: number;
  total: number;
  missing: string[];
  coverage: number; // 0..1
}

export const matchPharmacies = (meds: RxMedication[]): PharmacyMatch[] => {
  return pharmacies
    .map((p) => {
      const missing: string[] = [];
      let inStock = 0;
      for (const m of meds) {
        const qty = p.stock[norm(m.name)] ?? 0;
        if (qty > 0) inStock++;
        else missing.push(m.name);
      }
      return {
        pharmacy: p,
        inStock,
        total: meds.length,
        missing,
        coverage: meds.length === 0 ? 0 : inStock / meds.length,
      };
    })
    .sort((a, b) => b.coverage - a.coverage || a.pharmacy.distanceKm - b.pharmacy.distanceKm);
};

// ---- Reactive store ----
const seed: Prescription[] = [
  {
    id: "p1", doctorName: "Dr. Elena Vance", patientName: "John Mukasa",
    patientEmail: "john@example.com", patientPhone: "+250 788 111 222",
    issuer: "doctor", date: "Apr 25, 2026", createdAt: Date.now() - 86400000 * 5,
    medications: [
      { name: "Atorvastatin", dosage: "20mg", frequency: "Once daily", quantity: 30 },
      { name: "Aspirin", dosage: "81mg", frequency: "Once daily", quantity: 30 },
    ],
    status: "sent-to-pharmacy", pharmacyId: "ph1", pharmacyName: "MediPlus Pharmacy",
    channels: ["app", "email"],
  },
  {
    id: "p2", doctorName: "Dr. Marcus Thorne", patientName: "Sarah Uwase",
    patientEmail: "sarah@example.com", patientPhone: "+250 788 333 444",
    issuer: "doctor", date: "Apr 22, 2026", createdAt: Date.now() - 86400000 * 8,
    medications: [{ name: "Amoxicillin", dosage: "500mg", frequency: "3x daily, 7 days", quantity: 21 }],
    status: "filled", pharmacyId: "ph1", pharmacyName: "MediPlus Pharmacy",
    channels: ["app", "sms"],
  },
  {
    id: "p3", doctorName: "Dr. Anya Sharma", patientName: "David Niyonzima",
    patientEmail: "david@example.com", patientPhone: "+250 788 555 666",
    issuer: "doctor", date: "Apr 27, 2026", createdAt: Date.now() - 86400000 * 3,
    medications: [
      { name: "Tretinoin Cream", dosage: "0.025%", frequency: "Apply nightly", quantity: 1 },
      { name: "Cetirizine", dosage: "10mg", frequency: "Once daily", quantity: 30 },
    ],
    status: "sent-to-patient", channels: ["app", "email", "sms"],
  },
];

const state = { list: [...seed] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const usePrescriptions = () =>
  useSyncExternalStore(subscribe, () => state.list, () => state.list);

export const addPrescription = (p: Omit<Prescription, "id" | "createdAt" | "date">) => {
  const id = "p" + (state.list.length + 1) + "-" + Date.now().toString(36);
  const now = new Date();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  state.list = [{ ...p, id, createdAt: Date.now(), date }, ...state.list];
  emit();
  return id;
};

export const updatePrescription = (id: string, patch: Partial<Prescription>) => {
  state.list = state.list.map((r) => (r.id === id ? { ...r, ...patch } : r));
  emit();
};
