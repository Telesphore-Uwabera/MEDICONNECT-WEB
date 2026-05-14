// Pharmacy marketplace store — listings, filters, and orders.
import { useSyncExternalStore } from "react";

export interface PharmacyVendor {
  id: string;
  name: string;
  city: string;
  rating: number;
  deliveryMins: number; // typical delivery time
  initials: string;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number; // 0 = out
  prescriptionRequired: boolean;
  pharmacyId: string;
  rating: number;
  image: string; // emoji icon
}

export const pharmacyVendors: PharmacyVendor[] = [
  { id: "ph1", name: "GreenCross Pharmacy", city: "Kigali", rating: 4.8, deliveryMins: 35, initials: "GC" },
  { id: "ph2", name: "MediPlus Drugstore", city: "Kigali", rating: 4.6, deliveryMins: 50, initials: "MP" },
  { id: "ph3", name: "Care24 Pharmacy", city: "Musanze", rating: 4.7, deliveryMins: 60, initials: "C2" },
  { id: "ph4", name: "Health Hub", city: "Huye", rating: 4.5, deliveryMins: 75, initials: "HH" },
];

export const productCategories = [
  "All",
  "Antibiotic",
  "Cardiovascular",
  "Dermatology",
  "Diabetes",
  "Antihistamine",
  "Pain Relief",
  "Vitamins",
  "Personal Care",
  "Baby Care",
];

export const marketplaceProducts: MarketplaceProduct[] = [
  { id: "mp1", name: "Atorvastatin 20mg", category: "Cardiovascular", brand: "Pfizer", price: 12.5, stock: 142, prescriptionRequired: true, pharmacyId: "ph1", rating: 4.7, image: "💊" },
  { id: "mp2", name: "Amoxicillin 500mg", category: "Antibiotic", brand: "GSK", price: 8.0, stock: 23, prescriptionRequired: true, pharmacyId: "ph1", rating: 4.6, image: "💊" },
  { id: "mp3", name: "Aspirin 81mg", category: "Cardiovascular", brand: "Bayer", price: 4.5, stock: 380, prescriptionRequired: false, pharmacyId: "ph2", rating: 4.8, image: "💊" },
  { id: "mp4", name: "Tretinoin Cream 0.025%", category: "Dermatology", brand: "Janssen", price: 28.0, stock: 0, prescriptionRequired: true, pharmacyId: "ph2", rating: 4.4, image: "🧴" },
  { id: "mp5", name: "Cetirizine 10mg", category: "Antihistamine", brand: "Zyrtec", price: 6.0, stock: 95, prescriptionRequired: false, pharmacyId: "ph3", rating: 4.5, image: "💊" },
  { id: "mp6", name: "Metformin 500mg", category: "Diabetes", brand: "Merck", price: 9.5, stock: 18, prescriptionRequired: true, pharmacyId: "ph3", rating: 4.7, image: "💊" },
  { id: "mp7", name: "Ibuprofen 400mg", category: "Pain Relief", brand: "Advil", price: 5.5, stock: 210, prescriptionRequired: false, pharmacyId: "ph4", rating: 4.8, image: "💊" },
  { id: "mp8", name: "Vitamin D3 1000 IU", category: "Vitamins", brand: "Nature Made", price: 14.0, stock: 88, prescriptionRequired: false, pharmacyId: "ph1", rating: 4.6, image: "🌿" },
  { id: "mp9", name: "Multivitamin Daily", category: "Vitamins", brand: "Centrum", price: 18.5, stock: 64, prescriptionRequired: false, pharmacyId: "ph2", rating: 4.7, image: "🌿" },
  { id: "mp10", name: "Hand Sanitizer 500ml", category: "Personal Care", brand: "Dettol", price: 7.0, stock: 152, prescriptionRequired: false, pharmacyId: "ph4", rating: 4.5, image: "🧴" },
  { id: "mp11", name: "Baby Diapers (Pack of 40)", category: "Baby Care", brand: "Pampers", price: 22.0, stock: 30, prescriptionRequired: false, pharmacyId: "ph3", rating: 4.9, image: "👶" },
  { id: "mp12", name: "Sunscreen SPF 50", category: "Dermatology", brand: "Neutrogena", price: 19.5, stock: 47, prescriptionRequired: false, pharmacyId: "ph2", rating: 4.6, image: "🧴" },
  { id: "mp13", name: "Paracetamol 500mg", category: "Pain Relief", brand: "Tylenol", price: 3.5, stock: 420, prescriptionRequired: false, pharmacyId: "ph1", rating: 4.8, image: "💊" },
  { id: "mp14", name: "Insulin Glargine", category: "Diabetes", brand: "Sanofi", price: 65.0, stock: 12, prescriptionRequired: true, pharmacyId: "ph4", rating: 4.7, image: "💉" },
];

// Cart state ------------------------------------------------------------
interface CartItem { productId: string; qty: number; }
const cart: CartItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const addToCart = (productId: string) => {
  const ex = cart.find((c) => c.productId === productId);
  if (ex) ex.qty += 1;
  else cart.push({ productId, qty: 1 });
  emit();
};
export const removeFromCart = (productId: string) => {
  const i = cart.findIndex((c) => c.productId === productId);
  if (i >= 0) cart.splice(i, 1);
  emit();
};
export const clearCart = () => { cart.length = 0; emit(); };

export const useCart = () =>
  useSyncExternalStore(subscribe, () => cart, () => cart);

export const getPharmacy = (id: string) => pharmacyVendors.find((p) => p.id === id);
