// import { useState, useMemo, useCallback, useEffect, useRef } from "react";
// import { useTranslation } from "react-i18next";
// import { useSendPrescriptionToPharmacy } from "@/hooks/patient/use-patient-prescriptions";
// import { DashboardLayout } from "@/components/DashboardLayout";
// import { PageHeader } from "@/components/PageHeader";
// import { StatCard } from "@/components/StatCard";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import {
//   Download,
//   Pill,
//   Send,
//   MapPin,
//   FileText,
//   SlidersHorizontal,
//   X,
//   Search,
//   ChevronDown,
//   LayoutGrid,
//   Rows3,
//   CalendarRange,
//   CheckCircle2,
//   Loader2,
//   AlertCircle,
//   RefreshCw,
//   Eye,
//   QrCode,
//   Stethoscope,
//   ClipboardList,
//   Clock,
//   Building2,
//   ChevronRight,
//   User,
//   Phone,
//   Mail,
//   BadgeCheck,
//   Info,
//   Store,
//   Check,
//   Truck,
//   Package,
//   Navigation,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import {
//   PrescriptionApiStatus,
//   useGetPatientPrescriptions,
//   type PrescriptionFilters,
//   type Prescription,
// } from "@/hooks/patient/use-patient-prescriptions";
// import { useSearchPharmacies } from "@/hooks/patient/use-patient-search-pharmacy";
// import { type Pharmacy } from "@/hooks/patient/use-patient-search-pharmacy";

// const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

// // ─── Types ────────────────────────────────────────────────────────────────────

// type ViewMode = "table" | "cards";

// interface FilterState {
//   search: string;
//   status: PrescriptionApiStatus | "all";
//   from: string;
//   to: string;
//   is_signed: boolean | "all";
//   sort: "date-asc" | "date-desc";
// }

// const INITIAL_FILTERS: FilterState = {
//   search: "",
//   status: "all",
//   from: "",
//   to: "",
//   is_signed: "all",
//   sort: "date-desc",
// };


// // ─── Status config ────────────────────────────────────────────────────────────

// const STATUS_STYLES: Record<string, string> = {
//   issued: "bg-primary/10 text-primary border-primary/20",
//   sent_to_pharmacy:
//     "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
//   dispensed:
//     "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
//   cancelled:
//     "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
//   expired: "bg-muted text-muted-foreground border-border",
//   pending:
//     "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
// };

// const STATUS_DOT: Record<string, string> = {
//   issued: "bg-primary",
//   sent_to_pharmacy: "bg-violet-500",
//   dispensed: "bg-emerald-500",
//   cancelled: "bg-red-500",
//   expired: "bg-muted-foreground",
//   pending: "bg-amber-500",
// };

// const STATUS_LABEL: Record<string, string> = {
//   issued: "Issued",
//   sent_to_pharmacy: "At Pharmacy",
//   dispensed: "Dispensed",
//   cancelled: "Cancelled",
//   expired: "Expired",
//   pending: "Pending",
// };

// const ALL_STATUSES: PrescriptionApiStatus[] = [
//   "issued",
//   "sent_to_pharmacy",
//   "pending",
//   "dispensed",
//   "expired",
//   "cancelled",
// ];

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function formatDate(iso: string): string {
//   return new Date(iso).toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });
// }

// function formatDateTime(iso: string): string {
//   return new Date(iso).toLocaleString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function isExpiringSoon(validUntil: string): boolean {
//   const diff = new Date(validUntil).getTime() - Date.now();
//   return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
// }

// function isExpired(validUntil: string): boolean {
//   return new Date(validUntil).getTime() < Date.now();
// }

// function getPdfUrl(path: string): string {
//   if (!path) return "";
//   if (path.startsWith("http")) return path;
//   return `${BASE_URL}${path}`;
// }

// // ─── Prescription Details Drawer ──────────────────────────────────────────────

// function PrescriptionDrawer({
//   prescription,
//   onClose,
//   onAction,
// }: {
//   prescription: Prescription | null;
//   onClose: () => void;
//   onAction: (p: Prescription, action: "pdf" | "send") => void;
// }) {
//   const drawerRef = useRef<HTMLDivElement>(null);
//   const p = prescription;

//   // Close on Escape
//   useEffect(() => {
//     const handler = (e: KeyboardEvent) => {
//       if (e.key === "Escape") onClose();
//     };
//     document.addEventListener("keydown", handler);
//     return () => document.removeEventListener("keydown", handler);
//   }, [onClose]);

//   // Trap scroll on body
//   useEffect(() => {
//     if (p) document.body.style.overflow = "hidden";
//     else document.body.style.overflow = "";
//     return () => {
//       document.body.style.overflow = "";
//     };
//   }, [p]);

//   if (!p) return null;

//   const expiring = isExpiringSoon(p.valid_until);
//   const expired = isExpired(p.valid_until);

//   return (
//     <>
//       {/* Backdrop */}
//       <div
//         className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
//         onClick={onClose}
//       />

//       {/* Drawer panel */}
//       <div
//         ref={drawerRef}
//         className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[460px] bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
//       >
//         {/* Drawer header */}
//         <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-card/60 flex-shrink-0">
//           <div className="flex items-center gap-2.5">
//             <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center">
//               <FileText className="w-3.5 h-3.5 text-primary" />
//             </div>
//             <div>
//               <p className="text-[11px] font-semibold text-foreground leading-none">
//                 Prescription details
//               </p>
//               <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
//                 {p.prescription_number}
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
//             aria-label="Close drawer"
//           >
//             <X className="w-3.5 h-3.5" />
//           </button>
//         </div>

//         {/* Scrollable body */}
//         <div className="flex-1 overflow-y-auto">
//           {/* Status + validity banner */}
//           <div
//             className={cn(
//               "px-4 py-2.5 flex items-center justify-between border-b",
//               expiring
//                 ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
//                 : expired
//                   ? "bg-muted/40 border-border/40"
//                   : "bg-card border-border/40",
//             )}
//           >
//             <div className="flex items-center gap-2">
//               <Badge
//                 variant="outline"
//                 className={cn(
//                   "text-[9px] px-1.5 py-0 gap-1 h-5",
//                   STATUS_STYLES[p.status] ??
//                     "bg-muted text-muted-foreground border-border",
//                 )}
//               >
//                 <span
//                   className={cn(
//                     "w-1 h-1 rounded-full",
//                     STATUS_DOT[p.status] ?? "bg-muted-foreground",
//                   )}
//                 />
//                 {STATUS_LABEL[p.status] ?? p.status}
//               </Badge>
//               {p.is_signed && (
//                 <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
//                   <BadgeCheck className="w-3 h-3" />
//                   Doctor signed
//                 </span>
//               )}
//             </div>
//             <span
//               className={cn(
//                 "text-[10px] flex items-center gap-1",
//                 expiring
//                   ? "text-amber-600 dark:text-amber-400 font-medium"
//                   : expired
//                     ? "text-muted-foreground/60"
//                     : "text-muted-foreground/70",
//               )}
//             >
//               <CalendarRange className="h-3 w-3" />
//               {expired ? "Expired" : "Valid until"} {formatDate(p.valid_until)}
//               {expiring && " · Expiring soon"}
//             </span>
//           </div>

//           <div className="p-4 space-y-4">
//             {/* Diagnosis */}
//             {p.diagnosis && (
//               <DrawerSection
//                 icon={<Stethoscope className="w-3.5 h-3.5" />}
//                 title="Diagnosis"
//               >
//                 <p className="text-[12px] font-medium text-foreground">
//                   {p.diagnosis}
//                 </p>
//                 {p.notes && (
//                   <p className="text-[11px] text-muted-foreground/70 mt-1 italic">
//                     {p.notes}
//                   </p>
//                 )}
//               </DrawerSection>
//             )}

//             {/* Medications */}
//             <DrawerSection
//               icon={<Pill className="w-3.5 h-3.5" />}
//               title="Medications"
//             >
//               <div className="space-y-2">
//                 {p.items.map((item, idx) => (
//                   <div
//                     key={item.id}
//                     className="rounded-sm border border-border/40 bg-secondary/20 overflow-hidden"
//                   >
//                     <div className="px-3 py-2 flex items-center justify-between bg-secondary/30 border-b border-border/30">
//                       <div className="flex items-center gap-2">
//                         <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
//                           {idx + 1}
//                         </span>
//                         <p className="text-[11px] font-semibold text-foreground">
//                           {item.medicine_name}
//                         </p>
//                       </div>
//                       <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">
//                         {item.dosage}
//                       </span>
//                     </div>
//                     <div className="px-3 py-2 grid grid-cols-3 gap-2">
//                       <MedDetail label="Frequency" value={item.frequency} />
//                       <MedDetail label="Duration" value={item.duration} />
//                       <MedDetail
//                         label="Quantity"
//                         value={String(item.quantity)}
//                       />
//                     </div>
//                     {item.instructions && (
//                       <div className="px-3 pb-2 flex items-start gap-1.5">
//                         <Info className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
//                         <p className="text-[10px] text-muted-foreground/70 italic">
//                           {item.instructions}
//                         </p>
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </DrawerSection>

//             {/* Doctor info */}
//             <DrawerSection
//               icon={<User className="w-3.5 h-3.5" />}
//               title="Prescribing doctor"
//             >
//               <div className="flex items-start gap-3 p-3 rounded-sm bg-secondary/20 border border-border/40">
//                 <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-[12px] font-semibold flex items-center justify-center shrink-0 overflow-hidden">
//                   {p.doctor.image ? (
//                     <img
//                       src={
//                         p.doctor.image.startsWith("http")
//                           ? p.doctor.image
//                           : `${BASE_URL}/storage/${p.doctor.image}`
//                       }
//                       alt={p.doctor.user.name}
//                       className="w-full h-full object-cover"
//                       onError={(e) => {
//                         (e.target as HTMLImageElement).style.display = "none";
//                       }}
//                     />
//                   ) : (
//                     p.doctor.user.name.charAt(0)
//                   )}
//                 </div>
//                 <div className="min-w-0 flex-1">
//                   <p className="text-[11px] font-semibold text-foreground">
//                     {p.doctor.user.name}
//                   </p>
//                   <p className="text-[10px] text-muted-foreground/70 mt-0.5">
//                     {p.doctor.specialization}
//                     {p.doctor.doctor_degree && (
//                       <span className="ml-1 text-primary font-medium">
//                         · {p.doctor.doctor_degree}
//                       </span>
//                     )}
//                   </p>
//                   <div className="mt-1.5 flex flex-col gap-0.5">
//                     {p.doctor.user.email && (
//                       <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
//                         <Mail className="w-2.5 h-2.5" />
//                         {p.doctor.user.email}
//                       </span>
//                     )}
//                     {p.doctor.user.phone && (
//                       <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
//                         <Phone className="w-2.5 h-2.5" />
//                         {p.doctor.user.phone}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </DrawerSection>

//             {/* Appointment info */}
//             <DrawerSection
//               icon={<ClipboardList className="w-3.5 h-3.5" />}
//               title="Appointment"
//             >
//               <div className="rounded-sm border border-border/40 bg-secondary/20 overflow-hidden">
//                 <div className="grid grid-cols-2 divide-x divide-border/30">
//                   <AppointmentDetail
//                     label="Type"
//                     value={
//                       p.appointment.type === "online" ? "Online" : "In-person"
//                     }
//                     icon={<Building2 className="w-3 h-3" />}
//                   />
//                   <AppointmentDetail
//                     label="Status"
//                     value={p.appointment.status.replace(/_/g, " ")}
//                     icon={<Clock className="w-3 h-3" />}
//                   />
//                 </div>
//                 <div className="border-t border-border/30 grid grid-cols-2 divide-x divide-border/30">
//                   <AppointmentDetail
//                     label="Date"
//                     value={formatDate(p.appointment.appointment_date)}
//                     icon={<CalendarRange className="w-3 h-3" />}
//                   />
//                   <AppointmentDetail
//                     label="Issued at"
//                     value={formatDate(p.created_at)}
//                     icon={<FileText className="w-3 h-3" />}
//                   />
//                 </div>
//               </div>
//             </DrawerSection>

//             {/* Signing info */}
//             {p.is_signed && p.signed_at && (
//               <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/60">
//                 <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
//                 <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
//                   Digitally signed by doctor on {formatDateTime(p.signed_at)}
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Drawer footer actions */}
//         <div className="flex-shrink-0 border-t border-border/60 px-4 py-3 bg-card/60 flex gap-2">
//           <Button
//             size="sm"
//             variant="outline"
//             className="h-8 px-3 text-[11px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all"
//             onClick={() => onAction(p, "pdf")}
//           >
//             <Download className="h-3 w-3 mr-1.5" />
//             Download PDF
//           </Button>
//           {p.qr_code && (
//             <Button
//               size="sm"
//               variant="outline"
//               className="h-8 px-3 text-[11px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all"
//               onClick={() => window.open(getPdfUrl(p.qr_code), "_blank")}
//             >
//               <QrCode className="h-3 w-3 mr-1.5" />
//               QR code
//             </Button>
//           )}
//           {p.status === "issued" && (
//             <Button
//               size="sm"
//               className="h-8 px-3 text-[11px] flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all"
//               onClick={() => onAction(p, "send")}
//             >
//               <Send className="h-3 w-3 mr-1.5" />
//               Send to pharmacy
//             </Button>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Drawer sub-components ────────────────────────────────────────────────────

// function DrawerSection({
//   icon,
//   title,
//   children,
// }: {
//   icon: React.ReactNode;
//   title: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div>
//       <div className="flex items-center gap-1.5 mb-2">
//         <span className="text-muted-foreground/60">{icon}</span>
//         <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
//           {title}
//         </p>
//       </div>
//       {children}
//     </div>
//   );
// }

// function MedDetail({ label, value }: { label: string; value: string }) {
//   return (
//     <div>
//       <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wide">
//         {label}
//       </p>
//       <p className="text-[10px] font-medium text-foreground mt-0.5">{value}</p>
//     </div>
//   );
// }

// function AppointmentDetail({
//   label,
//   value,
//   icon,
// }: {
//   label: string;
//   value: string;
//   icon: React.ReactNode;
// }) {
//   return (
//     <div className="px-3 py-2">
//       <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wide flex items-center gap-1">
//         <span className="text-muted-foreground/40">{icon}</span>
//         {label}
//       </p>
//       <p className="text-[11px] font-medium text-foreground mt-0.5 capitalize">
//         {value}
//       </p>
//     </div>
//   );
// }

// // ─── Filter sidebar atoms ─────────────────────────────────────────────────────

// function FilterSection({
//   title,
//   children,
// }: {
//   title: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="py-3 border-b border-border/50 last:border-b-0">
//       <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
//         {title}
//       </p>
//       {children}
//     </div>
//   );
// }

// function PillGroup<T extends string | boolean>({
//   value,
//   onChange,
//   options,
// }: {
//   value: T;
//   onChange: (v: T) => void;
//   options: { value: T; label: string }[];
// }) {
//   return (
//     <div className="flex flex-col gap-0.5">
//       {options.map((o) => (
//         <button
//           key={String(o.value)}
//           onClick={() => onChange(o.value)}
//           className={cn(
//             "px-2 py-1 rounded-sm text-[10px] border transition-all text-left",
//             value === o.value
//               ? "bg-primary text-primary-foreground border-primary font-medium"
//               : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-secondary/30",
//           )}
//         >
//           {o.label}
//         </button>
//       ))}
//     </div>
//   );
// }

// function DateRangeInput({
//   from,
//   to,
//   onFrom,
//   onTo,
// }: {
//   from: string;
//   to: string;
//   onFrom: (v: string) => void;
//   onTo: (v: string) => void;
// }) {
//   return (
//     <div className="flex flex-col gap-1">
//       <div>
//         <label className="text-[9px] text-muted-foreground/60 mb-1 block uppercase tracking-wide">
//           From
//         </label>
//         <input
//           type="date"
//           value={from}
//           onChange={(e) => onFrom(e.target.value)}
//           className="w-full px-2 py-1 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
//         />
//       </div>
//       <div>
//         <label className="text-[9px] text-muted-foreground/60 mb-1 block uppercase tracking-wide">
//           To
//         </label>
//         <input
//           type="date"
//           value={to}
//           min={from || undefined}
//           onChange={(e) => onTo(e.target.value)}
//           className="w-full px-2 py-1 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
//         />
//       </div>
//     </div>
//   );
// }

// // ─── Status badge atom ────────────────────────────────────────────────────────

// function StatusBadge({ status }: { status: string }) {
//   return (
//     <Badge
//       variant="outline"
//       className={cn(
//         "text-[9px] px-1.5 py-0 gap-1 h-4.5 font-medium",
//         STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border",
//       )}
//     >
//       <span
//         className={cn(
//           "w-1 h-1 rounded-full",
//           STATUS_DOT[status] ?? "bg-muted-foreground",
//         )}
//       />
//       {STATUS_LABEL[status] ?? status}
//     </Badge>
//   );
// }

// // ─── Card view ────────────────────────────────────────────────────────────────

// function PrescriptionCard({
//   p,
//   onAction,
//   onViewDetails,
// }: {
//   p: Prescription;
//   onAction: (p: Prescription, action: "pdf" | "send") => void;
//   onViewDetails: (p: Prescription) => void;
// }) {
//   const expiring = isExpiringSoon(p.valid_until);
//   const expired = isExpired(p.valid_until);

//   return (
//     <div
//       className={cn(
//         "bg-card border rounded-sm overflow-hidden transition-all duration-150 hover:shadow-sm",
//         expiring
//           ? "border-amber-300 dark:border-amber-800"
//           : "border-border/60 hover:border-primary/20",
//       )}
//     >
//       {/* Thin status accent line */}
//       <div
//         className={cn(
//           "h-0.5 w-full",
//           p.status === "issued"
//             ? "bg-primary"
//             : p.status === "dispensed"
//               ? "bg-emerald-500"
//               : p.status === "sent_to_pharmacy"
//                 ? "bg-violet-500"
//                 : p.status === "cancelled"
//                   ? "bg-red-400"
//                   : expiring
//                     ? "bg-amber-400"
//                     : "bg-border",
//         )}
//       />

//       <div className="p-3.5">
//         {/* Header row */}
//         <div className="flex items-start justify-between gap-2 mb-2.5">
//           <div className="flex items-center gap-2 min-w-0">
//             <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0 overflow-hidden">
//               {p.doctor.image ? (
//                 <img
//                   src={
//                     p.doctor.image.startsWith("http")
//                       ? p.doctor.image
//                       : `${BASE_URL}/storage/${p.doctor.image}`
//                   }
//                   alt=""
//                   className="w-full h-full object-cover"
//                   onError={(e) => {
//                     (e.target as HTMLImageElement).style.display = "none";
//                   }}
//                 />
//               ) : (
//                 p.doctor.user.name.charAt(0)
//               )}
//             </div>
//             <div className="min-w-0">
//               <p className="text-[11px] font-semibold text-foreground truncate">
//                 {p.doctor.user.name}
//               </p>
//               <p className="text-[9px] text-muted-foreground/60 truncate">
//                 {p.doctor.specialization}
//               </p>
//             </div>
//           </div>
//           <div className="flex flex-col items-end gap-1 shrink-0">
//             <StatusBadge status={p.status} />
//             {p.is_signed && (
//               <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
//                 <CheckCircle2 className="w-2.5 h-2.5" />
//                 Signed
//               </span>
//             )}
//           </div>
//         </div>

//         {/* Diagnosis pill */}
//         {p.diagnosis && (
//           <div className="mb-2 px-2 py-1 rounded-sm bg-secondary/30 border border-border/25">
//             <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wide">
//               Diagnosis
//             </p>
//             <p className="text-[10px] font-medium text-foreground mt-0.5">
//               {p.diagnosis}
//             </p>
//           </div>
//         )}

//         {/* Meds compact list */}
//         <div className="space-y-0.5 mb-2.5">
//           {p.items.slice(0, 2).map((item) => (
//             <div
//               key={item.id}
//               className="flex items-center gap-1.5 text-[10px]"
//             >
//               <Pill className="h-2.5 w-2.5 text-primary shrink-0" />
//               <span className="font-medium text-foreground">
//                 {item.medicine_name}
//               </span>
//               <span className="text-muted-foreground/50">·</span>
//               <span className="text-muted-foreground/60">{item.dosage}</span>
//               <span className="text-muted-foreground/40 text-[9px]">
//                 {item.frequency}
//               </span>
//             </div>
//           ))}
//           {p.items.length > 2 && (
//             <p className="text-[9px] text-muted-foreground/50 pl-4">
//               +{p.items.length - 2} more medication
//               {p.items.length - 2 > 1 ? "s" : ""}
//             </p>
//           )}
//         </div>

//         {/* Footer row */}
//         <div className="flex items-center justify-between mb-2.5">
//           <span
//             className={cn(
//               "text-[9px] flex items-center gap-1",
//               expiring
//                 ? "text-amber-600 dark:text-amber-400 font-medium"
//                 : expired
//                   ? "text-muted-foreground/40 line-through"
//                   : "text-muted-foreground/60",
//             )}
//           >
//             <CalendarRange className="h-2.5 w-2.5" />
//             {expired ? "Expired" : "Valid until"} {formatDate(p.valid_until)}
//             {expiring && <span className="font-semibold">· Expiring soon</span>}
//           </span>
//           <span className="text-[9px] text-muted-foreground/40 font-mono">
//             {formatDate(p.created_at)}
//           </span>
//         </div>

//         {/* Actions */}
//         <div className="flex gap-1.5 pt-2 border-t border-border/30">
//           <Button
//             size="sm"
//             variant="outline"
//             className="h-6 px-2 text-[9px] rounded-sm border-border/50 hover:border-primary/30 hover:bg-secondary/30 transition-all gap-1"
//             onClick={() => onViewDetails(p)}
//           >
//             <Eye className="h-2.5 w-2.5" />
//             Details
//           </Button>
//           <Button
//             size="sm"
//             variant="outline"
//             className="h-6 px-2 text-[9px] rounded-sm border-border/50 hover:border-primary/30 hover:bg-secondary/30 transition-all gap-1"
//             onClick={() => onAction(p, "pdf")}
//           >
//             <Download className="h-2.5 w-2.5" />
//             PDF
//           </Button>
//           {p.status === "issued" && (
//             <Button
//               size="sm"
//               className="h-6 px-2 text-[9px] flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm gap-1"
//               onClick={() => onAction(p, "send")}
//             >
//               <Send className="h-2.5 w-2.5" />
//               Send to pharmacy
//             </Button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Loading skeletons ────────────────────────────────────────────────────────

// function SkeletonRow() {
//   return (
//     <tr className="border-t border-border/40">
//       {[140, 160, 70, 100, 60, 90].map((w, i) => (
//         <td key={i} className="px-3 py-2.5">
//           <div
//             className="h-2.5 rounded bg-muted animate-pulse"
//             style={{ width: w }}
//           />
//         </td>
//       ))}
//     </tr>
//   );
// }

// function SkeletonCard() {
//   return (
//     <div className="bg-card border border-border/50 rounded-sm overflow-hidden">
//       <div className="h-0.5 bg-muted animate-pulse" />
//       <div className="p-3.5 space-y-2.5">
//         <div className="flex gap-2">
//           <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
//           <div className="flex-1 space-y-1">
//             <div className="h-2.5 w-28 bg-muted rounded animate-pulse" />
//             <div className="h-2 w-20 bg-muted/60 rounded animate-pulse" />
//           </div>
//         </div>
//         <div className="space-y-1">
//           <div className="h-7 bg-muted/50 rounded animate-pulse" />
//           <div className="h-4 bg-muted/40 rounded animate-pulse" />
//           <div className="h-4 bg-muted/40 rounded animate-pulse" />
//         </div>
//         <div className="flex gap-1.5 pt-2 border-t border-border/30">
//           <div className="h-6 w-14 bg-muted rounded animate-pulse" />
//           <div className="h-6 w-14 bg-muted rounded animate-pulse" />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Pharmacy Selection Modal ────────────────────────────────────────────────

// // ─── Pharmacy Selection Modal ─────────────────────────────────────────────────

// function PharmacySelectionModal({
//   isOpen,
//   onClose,
//   pharmacies,
//   isLoading,
//   onSelect,
//   isSending,
// }: {
//   isOpen: boolean;
//   onClose: () => void;
//   pharmacies: Pharmacy[];
//   isLoading: boolean;
//   onSelect: (
//     pharmacyId: number,
//     deliveryType: "pickup" | "home_delivery",
//     deliveryAddress?: string,
//     notes?: string,
//   ) => void;
//   isSending: boolean;
// }) {
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(
//     null,
//   );
//   const [deliveryType, setDeliveryType] = useState<
//     "pickup" | "home_delivery" | null
//   >(null);
//   const [deliveryAddress, setDeliveryAddress] = useState("");
//   const [notes, setNotes] = useState("");
//   const modalRef = useRef<HTMLDivElement>(null);

//   // Reset everything when modal closes
//   useEffect(() => {
//     if (!isOpen) {
//       setSearchTerm("");
//       setSelectedPharmacy(null);
//       setDeliveryType(null);
//       setDeliveryAddress("");
//       setNotes("");
//     }
//   }, [isOpen]);

//   const filteredPharmacies = useMemo(() => {
//     if (!searchTerm.trim()) return pharmacies;
//     const term = searchTerm.toLowerCase();
//     return pharmacies.filter(
//       (ph) =>
//         ph.name.toLowerCase().includes(term) ||
//         ph.city.toLowerCase().includes(term) ||
//         ph.address.toLowerCase().includes(term),
//     );
//   }, [pharmacies, searchTerm]);

//   useEffect(() => {
//     const handler = (e: KeyboardEvent) => {
//       if (e.key === "Escape") {
//         if (selectedPharmacy) {
//           setSelectedPharmacy(null);
//           setDeliveryType(null);
//           setDeliveryAddress("");
//           setNotes("");
//         } else {
//           onClose();
//         }
//       }
//     };
//     if (isOpen) {
//       document.addEventListener("keydown", handler);
//       document.body.style.overflow = "hidden";
//     }
//     return () => {
//       document.removeEventListener("keydown", handler);
//       document.body.style.overflow = "";
//     };
//   }, [isOpen, onClose, selectedPharmacy]);

//   const canSubmit =
//     deliveryType !== null &&
//     (deliveryType === "pickup" || deliveryAddress.trim().length > 0) &&
//     !isSending;

//   if (!isOpen) return null;

//   // ── Step 2: delivery type + address ──────────────────────────────────────────
//   if (selectedPharmacy) {
//     const canDeliver = selectedPharmacy.offers_delivery;
//     const canPickup = selectedPharmacy.offers_pickup;

//     return (
//       <>
//         <div
//           className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
//           onClick={onClose}
//         />
//         <div
//           ref={modalRef}
//           className="fixed inset-x-4 top-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[440px] md:max-w-[90vw] z-50 bg-background border border-border rounded-lg shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden"
//         >
//           {/* Header */}
//           <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-card/60 flex-shrink-0">
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => {
//                   setSelectedPharmacy(null);
//                   setDeliveryType(null);
//                   setDeliveryAddress("");
//                   setNotes("");
//                 }}
//                 className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
//                 aria-label="Back to pharmacy list"
//               >
//                 <ChevronDown className="w-3.5 h-3.5 rotate-90" />
//               </button>
//               <div>
//                 <p className="text-[11px] font-semibold text-foreground leading-none">
//                   Delivery options
//                 </p>
//                 <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate max-w-[220px]">
//                   {selectedPharmacy.name}
//                 </p>
//               </div>
//             </div>
//             <button
//               onClick={onClose}
//               className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
//             >
//               <X className="w-3.5 h-3.5" />
//             </button>
//           </div>

//           {/* Body */}
//           <div className="flex-1 overflow-y-auto p-4 space-y-3">
//             {/* Step indicator */}
//             <div className="flex items-center gap-2 mb-1">
//               <div className="flex items-center gap-1.5">
//                 <div className="w-4 h-4 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
//                   <Check className="w-2.5 h-2.5 text-primary" />
//                 </div>
//                 <span className="text-[9px] text-muted-foreground/60">
//                   Pharmacy
//                 </span>
//               </div>
//               <div className="flex-1 h-px bg-border/50" />
//               <div className="flex items-center gap-1.5">
//                 <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
//                   <span className="text-[8px] font-bold text-primary-foreground">
//                     2
//                   </span>
//                 </div>
//                 <span className="text-[9px] font-medium text-foreground">
//                   Delivery
//                 </span>
//               </div>
//             </div>

//             {/* Delivery type options */}
//             <div>
//               <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
//                 How would you like to receive it?
//               </p>
//               <div className="space-y-2">
//                 {canPickup && (
//                   <button
//                     onClick={() => {
//                       setDeliveryType("pickup");
//                       setDeliveryAddress(""); // clear address if switching
//                     }}
//                     className={cn(
//                       "w-full text-left p-3 rounded-sm border transition-all",
//                       deliveryType === "pickup"
//                         ? "border-primary bg-primary/5"
//                         : "border-border/40 hover:border-primary/30 hover:bg-secondary/20",
//                     )}
//                   >
//                     <div className="flex items-center justify-between">
//                       <div className="flex items-center gap-3">
//                         <div
//                           className={cn(
//                             "w-8 h-8 rounded-sm flex items-center justify-center transition-colors",
//                             deliveryType === "pickup"
//                               ? "bg-primary/15 text-primary"
//                               : "bg-secondary/40 text-muted-foreground",
//                           )}
//                         >
//                           <Package className="w-4 h-4" />
//                         </div>
//                         <div>
//                           <p className="text-[11px] font-semibold text-foreground">
//                             Pick up in store
//                           </p>
//                           <p className="text-[9px] text-muted-foreground/60 mt-0.5">
//                             {selectedPharmacy.address}, {selectedPharmacy.city}
//                           </p>
//                         </div>
//                       </div>
//                       <div
//                         className={cn(
//                           "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
//                           deliveryType === "pickup"
//                             ? "border-primary"
//                             : "border-border/50",
//                         )}
//                       >
//                         {deliveryType === "pickup" && (
//                           <div className="w-2 h-2 rounded-full bg-primary" />
//                         )}
//                       </div>
//                     </div>
//                   </button>
//                 )}

//                 {canDeliver && (
//                   <button
//                     onClick={() => setDeliveryType("home_delivery")}
//                     className={cn(
//                       "w-full text-left p-3 rounded-sm border transition-all",
//                       deliveryType === "home_delivery"
//                         ? "border-primary bg-primary/5"
//                         : "border-border/40 hover:border-primary/30 hover:bg-secondary/20",
//                     )}
//                   >
//                     <div className="flex items-center justify-between">
//                       <div className="flex items-center gap-3">
//                         <div
//                           className={cn(
//                             "w-8 h-8 rounded-sm flex items-center justify-center transition-colors",
//                             deliveryType === "home_delivery"
//                               ? "bg-primary/15 text-primary"
//                               : "bg-secondary/40 text-muted-foreground",
//                           )}
//                         >
//                           <Truck className="w-4 h-4" />
//                         </div>
//                         <div>
//                           <p className="text-[11px] font-semibold text-foreground">
//                             Home delivery
//                           </p>
//                           <p className="text-[9px] text-muted-foreground/60 mt-0.5">
//                             {selectedPharmacy.delivery_fee}{" "}
//                             {selectedPharmacy.delivery_currency}
//                             {selectedPharmacy.estimated_delivery_minutes
//                               ? ` · ~${selectedPharmacy.estimated_delivery_minutes} min`
//                               : ""}
//                           </p>
//                         </div>
//                       </div>
//                       <div
//                         className={cn(
//                           "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
//                           deliveryType === "home_delivery"
//                             ? "border-primary"
//                             : "border-border/50",
//                         )}
//                       >
//                         {deliveryType === "home_delivery" && (
//                           <div className="w-2 h-2 rounded-full bg-primary" />
//                         )}
//                       </div>
//                     </div>
//                   </button>
//                 )}

//                 {!canDeliver && !canPickup && (
//                   <p className="text-[11px] text-muted-foreground/60 text-center py-6">
//                     This pharmacy has no available fulfillment options.
//                   </p>
//                 )}
//               </div>
//             </div>

//             {/* Delivery address — only shown for home_delivery */}
//             {deliveryType === "home_delivery" && (
//               <div className="space-y-1.5">
//                 <label className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
//                   <Navigation className="w-2.5 h-2.5" />
//                   Delivery address
//                   <span className="text-red-500 ml-0.5">*</span>
//                 </label>
//                 <textarea
//                   value={deliveryAddress}
//                   onChange={(e) => setDeliveryAddress(e.target.value)}
//                   placeholder="Enter your full delivery address…"
//                   rows={3}
//                   className="w-full px-2.5 py-2 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/35 transition-all resize-none"
//                 />
//                 {deliveryAddress.trim().length === 0 && (
//                   <p className="text-[9px] text-red-500/70 flex items-center gap-1">
//                     <AlertCircle className="w-2.5 h-2.5" />
//                     Address is required for home delivery
//                   </p>
//                 )}
//               </div>
//             )}

//             {/* Notes — always optional */}
//             <div className="space-y-1.5">
//               <label className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
//                 <FileText className="w-2.5 h-2.5" />
//                 Notes
//                 <span className="text-muted-foreground/40 font-normal ml-1">
//                   (optional)
//                 </span>
//               </label>
//               <textarea
//                 value={notes}
//                 onChange={(e) => setNotes(e.target.value)}
//                 placeholder="Any special instructions for the pharmacy…"
//                 rows={2}
//                 className="w-full px-2.5 py-2 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/35 transition-all resize-none"
//               />
//             </div>
//           </div>

//           {/* Footer */}
//           <div className="flex-shrink-0 border-t border-border/60 px-4 py-3 bg-card/60 flex gap-2">
//             <Button
//               size="sm"
//               variant="outline"
//               className="h-8 px-3 text-[11px] rounded-sm border-border/60"
//               onClick={() => {
//                 setSelectedPharmacy(null);
//                 setDeliveryType(null);
//                 setDeliveryAddress("");
//                 setNotes("");
//               }}
//             >
//               Back
//             </Button>
//             <Button
//               size="sm"
//               disabled={!canSubmit}
//               className="h-8 px-3 text-[11px] flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
//               onClick={() => {
//                 if (canSubmit && deliveryType) {
//                   onSelect(
//                     selectedPharmacy.id,
//                     deliveryType,
//                     deliveryType === "home_delivery"
//                       ? deliveryAddress.trim()
//                       : undefined,
//                     notes.trim() || undefined,
//                   );
//                 }
//               }}
//             >
//               {isSending ? (
//                 <>
//                   <Loader2 className="h-3 w-3 animate-spin" />
//                   Sending…
//                 </>
//               ) : (
//                 <>
//                   <Send className="h-3 w-3" />
//                   Confirm & send
//                 </>
//               )}
//             </Button>
//           </div>
//         </div>
//       </>
//     );
//   }

//   // ── Step 1: pharmacy list ─────────────────────────────────────────────────────
//   return (
//     <>
//       <div
//         className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
//         onClick={onClose}
//       />
//       <div
//         ref={modalRef}
//         className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[560px] md:max-w-[90vw] z-50 bg-background border border-border rounded-lg shadow-2xl flex flex-col max-h-[80dvh] overflow-hidden"
//       >
//         <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-card/60 flex-shrink-0">
//           <div className="flex items-center gap-2.5">
//             <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center">
//               <Store className="w-3.5 h-3.5 text-primary" />
//             </div>
//             <div>
//               <p className="text-[11px] font-semibold text-foreground leading-none">
//                 Select Pharmacy
//               </p>
//               <p className="text-[10px] text-muted-foreground/60 mt-0.5">
//                 Choose where to send your prescription
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
//           >
//             <X className="w-3.5 h-3.5" />
//           </button>
//         </div>

//         <div className="px-4 py-2.5 border-b border-border/40 flex-shrink-0">
//           <div className="relative">
//             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />
//             <input
//               type="text"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               placeholder="Search by name, city, or address…"
//               className="w-full pl-8 pr-3 py-1.5 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/35 transition-all"
//             />
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto px-2 py-2">
//           {isLoading ? (
//             <div className="space-y-2 py-2">
//               {Array.from({ length: 4 }).map((_, i) => (
//                 <div
//                   key={i}
//                   className="flex items-center gap-3 p-3 rounded-sm border border-border/30 bg-card/40"
//                 >
//                   <div className="w-10 h-10 rounded-sm bg-muted animate-pulse shrink-0" />
//                   <div className="flex-1 space-y-1.5">
//                     <div className="h-2.5 w-32 bg-muted rounded animate-pulse" />
//                     <div className="h-2 w-24 bg-muted/60 rounded animate-pulse" />
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : filteredPharmacies.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
//               <Store className="w-8 h-8 text-muted-foreground/25" />
//               <p className="text-[11px] font-medium text-muted-foreground/60">
//                 {searchTerm
//                   ? "No pharmacies match your search"
//                   : "No pharmacies available"}
//               </p>
//             </div>
//           ) : (
//             <div className="space-y-1">
//               {filteredPharmacies.map((pharmacy) => (
//                 <button
//                   key={pharmacy.id}
//                   onClick={() => setSelectedPharmacy(pharmacy)}
//                   className="w-full text-left p-3 rounded-sm border border-border/30 hover:border-primary/30 hover:bg-secondary/20 transition-all group"
//                 >
//                   <div className="flex items-start gap-3">
//                     <div className="w-10 h-10 rounded-sm bg-primary/5 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
//                       {pharmacy.logo ? (
//                         <img
//                           src={pharmacy.logo}
//                           alt={pharmacy.name}
//                           className="w-full h-full object-cover"
//                           onError={(e) => {
//                             (e.target as HTMLImageElement).style.display =
//                               "none";
//                           }}
//                         />
//                       ) : (
//                         <Store className="w-4 h-4 text-primary/40" />
//                       )}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-center gap-1.5">
//                         <p className="text-[11px] font-semibold text-foreground truncate">
//                           {pharmacy.name}
//                         </p>
//                         {pharmacy.is_verified && (
//                           <BadgeCheck className="w-3 h-3 text-emerald-500 shrink-0" />
//                         )}
//                       </div>
//                       <p className="text-[9px] text-muted-foreground/60 mt-0.5 truncate">
//                         {pharmacy.address}, {pharmacy.city}
//                       </p>
//                       <div className="flex items-center gap-2 mt-1.5 flex-wrap">
//                         {pharmacy.offers_delivery && (
//                           <span className="inline-flex items-center gap-0.5 text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">
//                             <Truck className="w-2.5 h-2.5" />
//                             Delivery
//                           </span>
//                         )}
//                         {pharmacy.offers_pickup && (
//                           <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-secondary/40 px-1.5 py-0.5 rounded-sm">
//                             <Package className="w-2.5 h-2.5" />
//                             Pickup
//                           </span>
//                         )}
//                         {pharmacy.is_open_24h && (
//                           <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-sm">
//                             <Clock className="w-2.5 h-2.5" />
//                             24h
//                           </span>
//                         )}
//                         {pharmacy.estimated_delivery_minutes && (
//                           <span className="text-[9px] text-muted-foreground/50">
//                             ~{pharmacy.estimated_delivery_minutes} min
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                     <div className="w-6 h-6 rounded-full border border-border/50 flex items-center justify-center shrink-0 group-hover:border-primary/50 group-hover:bg-primary/10 transition-colors">
//                       <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
//                     </div>
//                   </div>
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>

//         <div className="flex-shrink-0 border-t border-border/60 px-4 py-3 bg-card/60 flex items-center justify-between">
//           <p className="text-[9px] text-muted-foreground/50">
//             {filteredPharmacies.length} pharmacies available
//           </p>
//           <button
//             onClick={onClose}
//             className="text-[10px] text-muted-foreground hover:text-foreground font-medium px-3 py-1.5 rounded-sm hover:bg-secondary/40 transition-colors"
//           >
//             Cancel
//           </button>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────

// const PatientPrescriptions = () => {
//   const { t, i18n } = useTranslation();

//   const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
//   const [view, setView] = useState<ViewMode>("table");
//   const [filterOpen, setFilterOpen] = useState(false);
//   const [selectedPrescription, setSelectedPrescription] =
//     useState<Prescription | null>(null);
//   const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
//   const [prescriptionToSend, setPrescriptionToSend] =
//     useState<Prescription | null>(null);

//   const apiFilters = useMemo<PrescriptionFilters>(
//     () => ({
//       search: filters.search || undefined,
//       status: filters.status !== "all" ? filters.status : undefined,
//       from: filters.from || undefined,
//       to: filters.to || undefined,
//       is_signed: filters.is_signed !== "all" ? filters.is_signed : undefined,
//     }),
//     [filters],
//   );

//   const { data, isLoading, isError, refetch, isFetching } =
//     useGetPatientPrescriptions(apiFilters);

//   // useSearchPharmacies
//   const { data: pharmaciesResp, isLoading: loadingPharmacies } =
//     useSearchPharmacies({
//       per_page: 100,
//     });

//   console.log("pharmaciesResp", pharmaciesResp);

//   const { mutate: sendToPharmacy, isPending: isSending } =
//     useSendPrescriptionToPharmacy();

//   const handleSendToPharmacy = useCallback(
//     (
//       pharmacyId: number,
//       deliveryType: "pickup" | "home_delivery",
//       deliveryAddress?: string,
//       notes?: string,
//     ) => {
//       if (!prescriptionToSend) return;
//       sendToPharmacy(
//         {
//           prescription_id: prescriptionToSend.id,
//           pharmacy_id: pharmacyId,
//           delivery_type: deliveryType,
//           delivery_address: deliveryAddress,
//           notes,
//         },
//         {
//           onSuccess: () => {
//             setPharmacyModalOpen(false);
//             setPrescriptionToSend(null);
//           },
//         },
//       );
//     },
//     [prescriptionToSend, sendToPharmacy],
//   );

//   const prescriptions = useMemo(() => {
//     const list = data?.prescriptions ?? [];
//     return [...list].sort((a, b) => {
//       if (filters.sort === "date-asc")
//         return (
//           new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
//         );
//       return (
//         new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
//       );
//     });
//   }, [data, filters.sort]);

//   const set = useCallback(
//     <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
//       setFilters((prev) => ({ ...prev, [key]: value }));
//     },
//     [],
//   );

//   const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

//   const hasActiveFilters = useMemo(
//     () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
//     [filters],
//   );

//   useEffect(() => {
//     if (filterOpen) document.body.style.overflow = "hidden";
//     else document.body.style.overflow = "";
//     return () => {
//       document.body.style.overflow = "";
//     };
//   }, [filterOpen]);

//   const issuedCount = prescriptions.filter((p) => p.status === "issued").length;
//   const sentToPharmacyCount = prescriptions.filter(
//     (p) => p.status === "sent_to_pharmacy",
//   ).length;
//   const dispensedCount = prescriptions.filter(
//     (p) => p.status === "dispensed",
//   ).length;
//   const cancelledCount = prescriptions.filter(
//     (p) => p.status === "cancelled",
//   ).length;
//   const expiringSoonCount = prescriptions.filter((p) =>
//     isExpiringSoon(p.valid_until),
//   ).length;

//   const handleAction = useCallback(
//     (p: Prescription, action: "pdf" | "send") => {
//       if (action === "pdf" && p.pdf_url) {
//         window.open(getPdfUrl(p.pdf_url), "_blank");
//       }
//       if (action === "send") {
//         setPrescriptionToSend(p);
//         setPharmacyModalOpen(true);
//       }
//     },
//     [],
//   );

//   const handleViewDetails = useCallback((p: Prescription) => {
//     setSelectedPrescription(p);
//   }, []);

//   const closeDrawer = useCallback(() => {
//     setSelectedPrescription(null);
//   }, []);

//   // ─── Sidebar content ───────────────────────────────────────────────────────

//   const sidebarContent = (
//     <>
//       <div className="px-3 pt-3.5 pb-2.5 flex items-center justify-between border-b border-border/50">
//         <div className="flex items-center gap-1.5">
//           <SlidersHorizontal className="w-3 h-3 text-primary" />
//           <span className="text-[10px] font-semibold text-foreground">
//             Filters
//           </span>
//         </div>
//         {hasActiveFilters && (
//           <button
//             onClick={clearAll}
//             className="text-[9px] text-primary hover:text-primary/70 font-medium flex items-center gap-1 transition-colors"
//           >
//             <X className="w-2.5 h-2.5" />
//             Reset
//           </button>
//         )}
//       </div>

//       <div className="px-3">
//         <FilterSection title="Status">
//           <PillGroup<PrescriptionApiStatus | "all">
//             value={filters.status}
//             onChange={(v) => set("status", v)}
//             options={[
//               { value: "all", label: "All statuses" },
//               ...ALL_STATUSES.map((s) => ({
//                 value: s,
//                 label: STATUS_LABEL[s] ?? s,
//               })),
//             ]}
//           />
//         </FilterSection>

//         <FilterSection title="Signature">
//           <PillGroup<boolean | "all">
//             value={filters.is_signed}
//             onChange={(v) => set("is_signed", v)}
//             options={[
//               { value: "all", label: "All" },
//               { value: true, label: "Signed" },
//               { value: false, label: "Unsigned" },
//             ]}
//           />
//         </FilterSection>

//         <FilterSection title="Date range">
//           <DateRangeInput
//             from={filters.from}
//             to={filters.to}
//             onFrom={(v) => set("from", v)}
//             onTo={(v) => set("to", v)}
//           />
//         </FilterSection>

//         <FilterSection title="Sort">
//           <PillGroup<"date-asc" | "date-desc">
//             value={filters.sort}
//             onChange={(v) => set("sort", v)}
//             options={[
//               { value: "date-desc", label: "Latest first" },
//               { value: "date-asc", label: "Oldest first" },
//             ]}
//           />
//         </FilterSection>
//       </div>
//     </>
//   );

//   // ─── Render ────────────────────────────────────────────────────────────────

//   return (
//     <DashboardLayout role="patient">
//       <div className="flex flex-col h-full">
//         <PageHeader
//           title={t("pages.patient.prescriptions_title", {
//             defaultValue: "My Prescriptions",
//           })}
//           subtitle={t("pages.patient.prescriptions_sub", {
//             defaultValue: "View and manage your prescriptions",
//           })}
//         />

//         <div className="flex flex-1 min-h-0 overflow-hidden">
//           {/* Desktop sidebar */}
//           <aside className="hidden md:flex md:flex-col w-52 flex-shrink-0 border-r border-border/50 bg-card/40 overflow-y-auto">
//             {sidebarContent}
//           </aside>

//           {/* Mobile backdrop */}
//           <div
//             onClick={() => setFilterOpen(false)}
//             className={cn(
//               "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
//               filterOpen
//                 ? "opacity-100 pointer-events-auto"
//                 : "opacity-0 pointer-events-none",
//             )}
//           />

//           {/* Mobile drawer */}
//           <div
//             className={cn(
//               "fixed bottom-0 left-0 right-0 z-50 md:hidden",
//               "bg-card rounded-t-2xl border-t border-border",
//               "max-h-[85dvh] flex flex-col overflow-hidden",
//               "transition-transform duration-300 ease-out",
//               filterOpen ? "translate-y-0" : "translate-y-full",
//             )}
//           >
//             <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
//               <div className="w-10 h-1 rounded-full bg-border" />
//             </div>
//             <div className="overflow-y-auto flex-1">{sidebarContent}</div>
//             <div className="flex-shrink-0 px-4 py-4 border-t border-border">
//               <button
//                 onClick={() => setFilterOpen(false)}
//                 className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-[11px] font-semibold transition-colors"
//               >
//                 Show results
//               </button>
//             </div>
//           </div>

//           {/* ── Main results area ── */}
//           <main className="flex-1 overflow-y-auto">
//             {/* Stats strip */}
//             <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
//               <StatCard
//                 label="Issued"
//                 value={issuedCount}
//                 icon={FileText}
//                 accent="primary"
//               />
//               <StatCard
//                 label="At pharmacy"
//                 value={sentToPharmacyCount}
//                 icon={MapPin}
//                 accent="warning"
//               />
//               <StatCard
//                 label="Dispensed"
//                 value={dispensedCount}
//                 icon={Send}
//                 accent="success"
//               />
//               <StatCard
//                 label="Cancelled"
//                 value={cancelledCount}
//                 icon={X}
//                 accent="primary"
//               />
//             </div>

//             {/* Expiring soon banner */}
//             {expiringSoonCount > 0 && (
//               <div className="mx-4 mt-3 px-3 py-2 rounded-sm bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 flex items-center gap-2">
//                 <CalendarRange className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
//                 <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
//                   {expiringSoonCount} prescription
//                   {expiringSoonCount > 1 ? "s" : ""} expiring within 3 days —
//                   collect soon.
//                 </p>
//               </div>
//             )}

//             {/* Toolbar */}
//             <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-2 flex items-center justify-between gap-3">
//               <div className="flex items-center gap-2">
//                 <p className="text-[10px] text-muted-foreground">
//                   {isLoading ? (
//                     <span className="text-muted-foreground/40">Loading…</span>
//                   ) : (
//                     <>
//                       <span className="font-bold text-foreground">
//                         {prescriptions.length}
//                       </span>{" "}
//                       {prescriptions.length === 1
//                         ? "prescription"
//                         : "prescriptions"}
//                     </>
//                   )}
//                   {hasActiveFilters && !isLoading && (
//                     <button
//                       onClick={clearAll}
//                       className="ml-2 text-primary hover:text-primary/70 hover:underline text-[9px] font-medium"
//                     >
//                       Reset filters
//                     </button>
//                   )}
//                 </p>
//                 {isFetching && !isLoading && (
//                   <span className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
//                     <Loader2 className="w-2.5 h-2.5 animate-spin" />
//                     Refreshing
//                   </span>
//                 )}
//               </div>

//               <div className="flex items-center gap-1.5">
//                 {/* Search */}
//                 <div className="relative hidden sm:block">
//                   <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />
//                   <input
//                     type="text"
//                     value={filters.search}
//                     onChange={(e) => set("search", e.target.value)}
//                     placeholder="Search diagnosis, doctor…"
//                     className="w-48 pl-7 pr-2.5 py-1 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/35 transition-all"
//                   />
//                 </div>

//                 {/* Sort selector */}
//                 <div className="relative">
//                   <select
//                     value={filters.sort}
//                     onChange={(e) =>
//                       set("sort", e.target.value as FilterState["sort"])
//                     }
//                     className="appearance-none pl-2 pr-6 py-1 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
//                   >
//                     <option value="date-desc">Latest first</option>
//                     <option value="date-asc">Oldest first</option>
//                   </select>
//                   <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground/40 pointer-events-none" />
//                 </div>

//                 {/* View toggle */}
//                 <div className="flex rounded-sm border border-border/50 overflow-hidden bg-card">
//                   <button
//                     onClick={() => setView("table")}
//                     aria-label="Table view"
//                     className={cn(
//                       "px-2 py-1 transition-colors",
//                       view === "table"
//                         ? "bg-primary text-primary-foreground"
//                         : "text-muted-foreground hover:text-foreground",
//                     )}
//                   >
//                     <Rows3 className="w-3 h-3" />
//                   </button>
//                   <button
//                     onClick={() => setView("cards")}
//                     aria-label="Card view"
//                     className={cn(
//                       "px-2 py-1 border-l border-border/50 transition-colors",
//                       view === "cards"
//                         ? "bg-primary text-primary-foreground"
//                         : "text-muted-foreground hover:text-foreground",
//                     )}
//                   >
//                     <LayoutGrid className="w-3 h-3" />
//                   </button>
//                 </div>

//                 {/* Mobile filter button */}
//                 <button
//                   onClick={() => setFilterOpen(true)}
//                   className={cn(
//                     "md:hidden flex items-center gap-1 px-2.5 py-1 rounded-sm border text-[10px] transition-colors",
//                     hasActiveFilters
//                       ? "bg-primary text-white border-primary"
//                       : "border-border/50 text-muted-foreground bg-card",
//                   )}
//                 >
//                   <SlidersHorizontal className="w-3 h-3" />
//                   Filters
//                   {hasActiveFilters && (
//                     <span className="w-1.5 h-1.5 rounded-full bg-white" />
//                   )}
//                 </button>
//               </div>
//             </div>

//             {/* ── Content ── */}
//             <div className="p-4">
//               {/* Error state */}
//               {isError && (
//                 <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
//                   <div className="w-12 h-12 rounded-sm bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-200 dark:border-red-900">
//                     <AlertCircle className="w-5 h-5 text-red-500" />
//                   </div>
//                   <div>
//                     <p className="text-[11px] font-semibold text-foreground">
//                       Failed to load prescriptions
//                     </p>
//                     <p className="text-[10px] text-muted-foreground/60 mt-1">
//                       Please check your connection and try again.
//                     </p>
//                   </div>
//                   <button
//                     onClick={() => refetch()}
//                     className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/70 font-semibold"
//                   >
//                     <RefreshCw className="w-3 h-3" />
//                     Retry
//                   </button>
//                 </div>
//               )}

//               {/* Loading skeleton */}
//               {isLoading &&
//                 !isError &&
//                 (view === "table" ? (
//                   <div className="rounded-sm border border-border/60 bg-card overflow-hidden">
//                     <table className="w-full text-[10px]">
//                       <thead className="bg-secondary/30 text-[9px] uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
//                         <tr>
//                           {[
//                             "Doctor",
//                             "Medications",
//                             "Issued",
//                             "Valid Until",
//                             "Status",
//                             "",
//                           ].map((h) => (
//                             <th
//                               key={h}
//                               className="text-left px-3 py-2.5 font-semibold"
//                             >
//                               {h}
//                             </th>
//                           ))}
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {Array.from({ length: 4 }).map((_, i) => (
//                           <SkeletonRow key={i} />
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 ) : (
//                   <div className="grid md:grid-cols-2 gap-2.5">
//                     {Array.from({ length: 4 }).map((_, i) => (
//                       <SkeletonCard key={i} />
//                     ))}
//                   </div>
//                 ))}

//               {/* Empty state */}
//               {!isLoading && !isError && prescriptions.length === 0 && (
//                 <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
//                   <div className="w-12 h-12 rounded-sm bg-muted/50 flex items-center justify-center border border-border/30">
//                     <Pill className="w-5 h-5 text-muted-foreground/40" />
//                   </div>
//                   <div>
//                     <p className="text-[11px] font-semibold text-foreground">
//                       {hasActiveFilters
//                         ? "No prescriptions match your filters"
//                         : "No prescriptions yet"}
//                     </p>
//                     <p className="text-[10px] text-muted-foreground/60 mt-1">
//                       {hasActiveFilters
//                         ? "Try widening your search criteria"
//                         : "Prescriptions issued by your doctor will appear here"}
//                     </p>
//                   </div>
//                   {hasActiveFilters && (
//                     <button
//                       onClick={clearAll}
//                       className="text-[10px] text-primary hover:text-primary/70 font-semibold hover:underline"
//                     >
//                       Clear all filters
//                     </button>
//                   )}
//                 </div>
//               )}

//               {/* Table view */}
//               {!isLoading &&
//                 !isError &&
//                 prescriptions.length > 0 &&
//                 view === "table" && (
//                   <div className="rounded-sm border border-border/60 bg-card overflow-hidden shadow-sm">
//                     <table className="w-full text-[10px]">
//                       <thead className="bg-secondary/30 text-[9px] uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
//                         <tr>
//                           <th className="text-left px-3 py-2.5 font-semibold">
//                             Doctor
//                           </th>
//                           <th className="text-left px-3 py-2.5 font-semibold">
//                             Medications
//                           </th>
//                           <th className="text-left px-3 py-2.5 font-semibold">
//                             Issued
//                           </th>
//                           <th className="text-left px-3 py-2.5 font-semibold">
//                             Valid until
//                           </th>
//                           <th className="text-left px-3 py-2.5 font-semibold">
//                             Status
//                           </th>
//                           <th className="px-3 py-2.5" />
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {prescriptions.map((p) => {
//                           const expiring = isExpiringSoon(p.valid_until);
//                           const expired = isExpired(p.valid_until);
//                           return (
//                             <tr
//                               key={p.id}
//                               className={cn(
//                                 "border-t border-border/35 hover:bg-secondary/15 transition-colors group cursor-pointer",
//                                 expiring &&
//                                   "bg-amber-50/30 dark:bg-amber-950/10",
//                               )}
//                               onClick={() => handleViewDetails(p)}
//                             >
//                               <td className="px-3 py-2.5">
//                                 <div className="flex items-center gap-2">
//                                   <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center justify-center shrink-0 overflow-hidden">
//                                     {p.doctor.image ? (
//                                       <img
//                                         src={
//                                           p.doctor.image.startsWith("http")
//                                             ? p.doctor.image
//                                             : `${BASE_URL}/storage/${p.doctor.image}`
//                                         }
//                                         alt=""
//                                         className="w-full h-full object-cover"
//                                         onError={(e) => {
//                                           (
//                                             e.target as HTMLImageElement
//                                           ).style.display = "none";
//                                         }}
//                                       />
//                                     ) : (
//                                       p.doctor.user.name.charAt(0)
//                                     )}
//                                   </div>
//                                   <div>
//                                     <p className="font-semibold text-[10px] text-foreground">
//                                       {p.doctor.user.name}
//                                     </p>
//                                     <p className="text-[9px] text-muted-foreground/60">
//                                       {p.doctor.specialization}
//                                     </p>
//                                     {p.is_signed && (
//                                       <span className="flex items-center gap-0.5 mt-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
//                                         <CheckCircle2 className="w-2 h-2" />
//                                         Signed
//                                       </span>
//                                     )}
//                                   </div>
//                                 </div>
//                               </td>

//                               <td className="px-3 py-2.5">
//                                 <div className="flex flex-col gap-0.5">
//                                   {p.items.slice(0, 2).map((item) => (
//                                     <span
//                                       key={item.id}
//                                       className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/70"
//                                     >
//                                       <Pill className="h-2 w-2 text-primary shrink-0" />
//                                       <span className="font-medium text-foreground/80">
//                                         {item.medicine_name}
//                                       </span>
//                                       <span className="text-muted-foreground/45">
//                                         · {item.dosage}
//                                       </span>
//                                     </span>
//                                   ))}
//                                   {p.items.length > 2 && (
//                                     <span className="text-[9px] text-muted-foreground/40 pl-3">
//                                       +{p.items.length - 2} more
//                                     </span>
//                                   )}
//                                 </div>
//                               </td>

//                               <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground/60 text-[9px]">
//                                 {formatDate(p.created_at)}
//                               </td>

//                               <td className="px-3 py-2.5 whitespace-nowrap">
//                                 <span
//                                   className={cn(
//                                     "text-[9px]",
//                                     expiring
//                                       ? "text-amber-600 dark:text-amber-400 font-medium"
//                                       : expired
//                                         ? "text-muted-foreground/40"
//                                         : "text-muted-foreground/60",
//                                   )}
//                                 >
//                                   {formatDate(p.valid_until)}
//                                   {expiring && <span className="ml-1">⚠</span>}
//                                 </span>
//                               </td>

//                               <td className="px-3 py-2.5">
//                                 <StatusBadge status={p.status} />
//                               </td>

//                               <td
//                                 className="px-3 py-2.5 text-right"
//                                 onClick={(e) => e.stopPropagation()}
//                               >
//                                 <div className="flex items-center justify-end gap-1">
//                                   <Button
//                                     size="sm"
//                                     variant="outline"
//                                     className="h-6 px-2 text-[9px] rounded-sm border-border/50 hover:border-primary/30 hover:bg-secondary/30 gap-1"
//                                     onClick={() => handleViewDetails(p)}
//                                   >
                                    
//                                     Details
//                                   </Button>
//                                   <Button
//                                     size="sm"
//                                     variant="outline"
//                                     className="h-6 px-2 text-[9px] rounded-sm border-border/50 hover:border-primary/30 hover:bg-secondary/30 gap-1"
//                                     onClick={() => handleAction(p, "pdf")}
//                                   >
//                                    <div className="flex justify-between items-center  " > <Download className="h-2 w-2 text-[9px]" />
//                                    <span className="mx-2" > PDF</span></div>
//                                   </Button>
//                                   {p.status === "issued" && (
//                                     <Button
//                                       size="sm"
//                                       className="h-6 px-2 text-[9px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm gap-1"
//                                       onClick={() => handleAction(p, "send")}
//                                     >
//                                       <Send className="h-2.5 w-2.5" />
//                                       Send
//                                     </Button>
//                                   )}
//                                 </div>
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}

//               {/* Card view */}
//               {!isLoading &&
//                 !isError &&
//                 prescriptions.length > 0 &&
//                 view === "cards" && (
//                   <div className="grid md:grid-cols-2 gap-2.5">
//                     {prescriptions.map((p) => (
//                       <PrescriptionCard
//                         key={p.id}
//                         p={p}
//                         onAction={handleAction}
//                         onViewDetails={handleViewDetails}
//                       />
//                     ))}
//                   </div>
//                 )}
//             </div>
//           </main>
//         </div>
//       </div>

//       {/* Details drawer */}
//       <PrescriptionDrawer
//         prescription={selectedPrescription}
//         onClose={closeDrawer}
//         onAction={(p, action) => {
//           handleAction(p, action);
//         }}
//       />

//       {/* Pharmacy Selection Modal */}
//       <PharmacySelectionModal
//         isOpen={pharmacyModalOpen}
//         onClose={() => {
//           setPharmacyModalOpen(false);
//           setPrescriptionToSend(null);
//         }}
//         pharmacies={pharmaciesResp?.data ?? []}
//         isLoading={loadingPharmacies}
//         onSelect={handleSendToPharmacy}
//         isSending={isSending}
//       />
//     </DashboardLayout>
//   );
// };

// export default PatientPrescriptions;


import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSendPrescriptionToPharmacy } from "@/hooks/patient/use-patient-prescriptions";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Download,
  Pill,
  Send,
  MapPin,
  FileText,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  LayoutGrid,
  Rows3,
  CalendarRange,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PrescriptionApiStatus,
  useGetPatientPrescriptions,
  type PrescriptionFilters,
  type Prescription,
} from "@/hooks/patient/use-patient-prescriptions";
import { useSearchPharmacies } from "@/hooks/patient/use-patient-search-pharmacy";

import {
  ALL_STATUSES,
  STATUS_LABEL,
  INITIAL_FILTERS,
  type FilterState,
  type ViewMode,
  isExpiringSoon,
  getPdfUrl,
} from "./components/prescription-constants";

import {
  StatusBadge,
  FilterSection,
  PillGroup,
  DateRangeInput,
  SkeletonRow,
  SkeletonCard,
  PrescriptionDrawer,
  PrescriptionCard,
  PharmacySelectionModal,
} from "./components/prescription-components";

// ─── Page ─────────────────────────────────────────────────────────────────────

const PatientPrescriptions = () => {
  const { t, i18n } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [prescriptionToSend, setPrescriptionToSend] = useState<Prescription | null>(null);

  const apiFilters = useMemo<PrescriptionFilters>(
    () => ({
      search: filters.search || undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      is_signed: filters.is_signed !== "all" ? filters.is_signed : undefined,
    }),
    [filters],
  );

  const { data, isLoading, isError, refetch, isFetching } = useGetPatientPrescriptions(apiFilters);
  const { data: pharmaciesResp, isLoading: loadingPharmacies } = useSearchPharmacies({ per_page: 100 });
  const { mutate: sendToPharmacy, isPending: isSending } = useSendPrescriptionToPharmacy();

  const handleSendToPharmacy = useCallback(
    (
      pharmacyId: number,
      deliveryType: "pickup" | "home_delivery",
      deliveryAddress?: string,
      notes?: string,
    ) => {
      if (!prescriptionToSend) return;
      sendToPharmacy(
        {
          prescription_id: prescriptionToSend.id,
          pharmacy_id: pharmacyId,
          delivery_type: deliveryType,
          delivery_address: deliveryAddress,
          notes,
        },
        {
          onSuccess: () => {
            setPharmacyModalOpen(false);
            setPrescriptionToSend(null);
          },
        },
      );
    },
    [prescriptionToSend, sendToPharmacy],
  );

  const prescriptions = useMemo(() => {
    const list = data?.prescriptions ?? [];
    return [...list].sort((a, b) =>
      filters.sort === "date-asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [data, filters.sort]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const issuedCount = prescriptions.filter((p) => p.status === "issued").length;
  const sentToPharmacyCount = prescriptions.filter((p) => p.status === "sent_to_pharmacy").length;
  const dispensedCount = prescriptions.filter((p) => p.status === "dispensed").length;
  const cancelledCount = prescriptions.filter((p) => p.status === "cancelled").length;
  const expiringSoonCount = prescriptions.filter((p) => isExpiringSoon(p.valid_until)).length;

  const handleAction = useCallback((p: Prescription, action: "pdf" | "send") => {
    if (action === "pdf" && p.pdf_url) window.open(getPdfUrl(p.pdf_url), "_blank");
    if (action === "send") { setPrescriptionToSend(p); setPharmacyModalOpen(true); }
  }, []);

  const handleViewDetails = useCallback((p: Prescription) => setSelectedPrescription(p), []);
  const closeDrawer = useCallback(() => setSelectedPrescription(null), []);

  // ─── Sidebar content ───────────────────────────────────────────────────────

  const sidebarContent = (
    <>
      <div className="px-3 pt-3.5 pb-2.5 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-[9px] text-primary hover:text-primary/70 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-2.5 h-2.5" />Reset
          </button>
        )}
      </div>
      <div className="px-3">
        <FilterSection title="Status">
          <PillGroup<PrescriptionApiStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all", label: "All statuses" },
              ...ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s })),
            ]}
          />
        </FilterSection>
        <FilterSection title="Signature">
          <PillGroup<boolean | "all">
            value={filters.is_signed}
            onChange={(v) => set("is_signed", v)}
            options={[
              { value: "all", label: "All" },
              { value: true, label: "Signed" },
              { value: false, label: "Unsigned" },
            ]}
          />
        </FilterSection>
        <FilterSection title="Date range">
          <DateRangeInput
            from={filters.from}
            to={filters.to}
            onFrom={(v) => set("from", v)}
            onTo={(v) => set("to", v)}
          />
        </FilterSection>
        <FilterSection title="Sort">
          <PillGroup<"date-asc" | "date-desc">
            value={filters.sort}
            onChange={(v) => set("sort", v)}
            options={[
              { value: "date-desc", label: "Latest first" },
              { value: "date-asc", label: "Oldest first" },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.prescriptions_title", { defaultValue: "My Prescriptions" })}
          subtitle={t("pages.patient.prescriptions_sub", { defaultValue: "View and manage your prescriptions" })}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-52 flex-shrink-0 border-r border-border/50 bg-card/40 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile filter drawer */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 md:hidden",
              "bg-card rounded-t-2xl border-t border-border",
              "max-h-[85dvh] flex flex-col overflow-hidden",
              "transition-transform duration-300 ease-out",
              filterOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-4 border-t border-border">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-[11px] font-semibold transition-colors"
              >
                Show results
              </button>
            </div>
          </div>

          {/* Main results */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats */}
            <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Issued" value={issuedCount} icon={FileText} accent="primary" />
              <StatCard label="At pharmacy" value={sentToPharmacyCount} icon={MapPin} accent="warning" />
              <StatCard label="Dispensed" value={dispensedCount} icon={Send} accent="success" />
              <StatCard label="Cancelled" value={cancelledCount} icon={X} accent="primary" />
            </div>

            {/* Expiring soon banner */}
            {expiringSoonCount > 0 && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-sm bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 flex items-center gap-2">
                <CalendarRange className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  {expiringSoonCount} prescription{expiringSoonCount > 1 ? "s" : ""} expiring within 3 days — collect soon.
                </p>
              </div>
            )}

            {/* Toolbar */}
            <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground">
                  {isLoading ? (
                    <span className="text-muted-foreground/40">Loading…</span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{prescriptions.length}</span>{" "}
                      {prescriptions.length === 1 ? "prescription" : "prescriptions"}
                    </>
                  )}
                  {hasActiveFilters && !isLoading && (
                    <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/70 hover:underline text-[9px] font-medium">
                      Reset filters
                    </button>
                  )}
                </p>
                {isFetching && !isLoading && (
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />Refreshing
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search diagnosis, doctor…"
                    className="w-48 pl-7 pr-2.5 py-1 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/35 transition-all"
                  />
                </div>

                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => set("sort", e.target.value as FilterState["sort"])}
                    className="appearance-none pl-2 pr-6 py-1 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                  >
                    <option value="date-desc">Latest first</option>
                    <option value="date-asc">Oldest first</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground/40 pointer-events-none" />
                </div>

                <div className="flex rounded-sm border border-border/50 overflow-hidden bg-card">
                  <button
                    onClick={() => setView("table")}
                    aria-label="Table view"
                    className={cn("px-2 py-1 transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Rows3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setView("cards")}
                    aria-label="Card view"
                    className={cn("px-2 py-1 border-l border-border/50 transition-colors", view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1 px-2.5 py-1 rounded-sm border text-[10px] transition-colors",
                    hasActiveFilters ? "bg-primary text-white border-primary" : "border-border/50 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Filters
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {isError && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="w-12 h-12 rounded-sm bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Failed to load prescriptions</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Please check your connection and try again.</p>
                  </div>
                  <button onClick={() => refetch()} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/70 font-semibold">
                    <RefreshCw className="w-3 h-3" />Retry
                  </button>
                </div>
              )}

              {isLoading && !isError && (
                view === "table" ? (
                  <div className="rounded-sm border border-border/60 bg-card overflow-hidden">
                    <table className="w-full text-[10px]">
                      <thead className="bg-secondary/30 text-[9px] uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
                        <tr>
                          {["Doctor", "Medications", "Issued", "Valid Until", "Status", ""].map((h) => (
                            <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-2.5">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                )
              )}

              {!isLoading && !isError && prescriptions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="w-12 h-12 rounded-sm bg-muted/50 flex items-center justify-center border border-border/30">
                    <Pill className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">
                      {hasActiveFilters ? "No prescriptions match your filters" : "No prescriptions yet"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {hasActiveFilters ? "Try widening your search criteria" : "Prescriptions issued by your doctor will appear here"}
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="text-[10px] text-primary hover:text-primary/70 font-semibold hover:underline">
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* Table view */}
              {!isLoading && !isError && prescriptions.length > 0 && view === "table" && (
                <div className="rounded-sm border border-border/60 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[10px]">
                    <thead className="bg-secondary/30 text-[9px] uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
                      <tr>
                        {["Doctor", "Medications", "Issued", "Valid until", "Status", ""].map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((p) => {
                        const expiring = isExpiringSoon(p.valid_until);
                        const expired = new Date(p.valid_until).getTime() < Date.now();
                        return (
                          <tr
                            key={p.id}
                            className={cn(
                              "border-t border-border/35 hover:bg-secondary/15 transition-colors group cursor-pointer",
                              expiring && "bg-amber-50/30 dark:bg-amber-950/10",
                            )}
                            onClick={() => handleViewDetails(p)}
                          >
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                                  {p.doctor.image ? (
                                    <img
                                      src={p.doctor.image.startsWith("http") ? p.doctor.image : `${import.meta.env.VITE_APP_BASE_URL}/storage/${p.doctor.image}`}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                  ) : p.doctor.user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-[10px] text-foreground">{p.doctor.user.name}</p>
                                  <p className="text-[9px] text-muted-foreground/60">{p.doctor.specialization}</p>
                                  {p.is_signed && (
                                    <span className="flex items-center gap-0.5 mt-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 className="w-2 h-2" />Signed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col gap-0.5">
                                {p.items.slice(0, 2).map((item) => (
                                  <span key={item.id} className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/70">
                                    <Pill className="h-2 w-2 text-primary shrink-0" />
                                    <span className="font-medium text-foreground/80">{item.medicine_name}</span>
                                    <span className="text-muted-foreground/45">· {item.dosage}</span>
                                  </span>
                                ))}
                                {p.items.length > 2 && (
                                  <span className="text-[9px] text-muted-foreground/40 pl-3">+{p.items.length - 2} more</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground/60 text-[9px]">
                              {new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={cn("text-[9px]", expiring ? "text-amber-600 dark:text-amber-400 font-medium" : expired ? "text-muted-foreground/40" : "text-muted-foreground/60")}>
                                {new Date(p.valid_until).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                {expiring && <span className="ml-1">⚠</span>}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[9px] rounded-sm border-border/50 hover:border-primary/30 hover:bg-secondary/30 gap-1"
                                  onClick={() => handleViewDetails(p)}
                                >
                                  Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[9px] rounded-sm border-border/50 hover:border-primary/30 hover:bg-secondary/30 gap-1"
                                  onClick={() => handleAction(p, "pdf")}
                                >
                                  <Download className="h-2 w-2" />PDF
                                </Button>
                                {p.status === "issued" && (
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-[9px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm gap-1"
                                    onClick={() => handleAction(p, "send")}
                                  >
                                    <Send className="h-2.5 w-2.5" />Send
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Card view */}
              {!isLoading && !isError && prescriptions.length > 0 && view === "cards" && (
                <div className="grid md:grid-cols-2 gap-2.5">
                  {prescriptions.map((p) => (
                    <PrescriptionCard key={p.id} p={p} onAction={handleAction} onViewDetails={handleViewDetails} />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <PrescriptionDrawer
        prescription={selectedPrescription}
        onClose={closeDrawer}
        onAction={handleAction}
      />

      <PharmacySelectionModal
        isOpen={pharmacyModalOpen}
        onClose={() => { setPharmacyModalOpen(false); setPrescriptionToSend(null); }}
        pharmacies={pharmaciesResp?.data ?? []}
        isLoading={loadingPharmacies}
        onSelect={handleSendToPharmacy}
        isSending={isSending}
      />
    </DashboardLayout>
  );
};

export default PatientPrescriptions;
