// // components/DoctorCard.tsx
// import { useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Star, MapPin, Clock, Wifi, BriefcaseMedical,
//   Zap, Maximize2, Globe, Video, Building2, X,
//   ShieldCheck, Languages, BadgeCheck, FileText,
//   CalendarCheck, User, ChevronRight,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";
// import { BookingDialog } from "@/components/BookingDialog";
// import { ConnectDialog } from "@/components/ConnectDialog";
// import { useCallStore } from "@/context/CallStore";
// import type { ApiDoctor, ApiDoctorHospital, ApiDoctorSpecialization } from "@/hooks/patient/use-patient-doctor";

// // ─── Avatar ───────────────────────────────────────────────────────────────────

// function DoctorAvatar({
//   doctor,
//   size = "sm",
// }: {
//   doctor: ApiDoctor;
//   size?: "sm" | "lg";
// }) {
//   const [imgError, setImgError] = useState(false);
//   const initials = doctor.user.name
//     .split(" ")
//     .map((n) => n[0])
//     .join("")
//     .slice(0, 2)
//     .toUpperCase();

//   const sizeClass = size === "lg" ? "h-full w-full text-xl" : "h-full w-full text-sm";

//   if (!doctor.image || imgError) {
//     return (
//       <div className={cn(sizeClass, "rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold select-none")}>
//         {initials}
//       </div>
//     );
//   }

//   return (
//     <img
//       src={doctor.image}
//       alt={doctor.user.name}
//       className="h-full w-full object-cover rounded-sm"
//       onError={() => setImgError(true)}
//     />
//   );
// }

// // ─── Consultation badge ───────────────────────────────────────────────────────

// function ConsultBadge({ type }: { type: ApiDoctor["consultation_type"] }) {
//   const map = {
//     online:    { label: "Online",             icon: Video,     cls: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
//     in_person: { label: "In-Person",          icon: Building2, cls: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
//     both:      { label: "Online & In-Person", icon: Globe,     cls: "text-teal-600 bg-teal-500/10 border-teal-500/20" },
//   };
//   const cfg = map[type] ?? map.both;
//   const Icon = cfg.icon;
//   return (
//     <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border", cfg.cls)}>
//       <Icon className="h-2.5 w-2.5" />
//       {cfg.label}
//     </span>
//   );
// }

// // ─── Detail row (used inside modal) ──────────────────────────────────────────

// function DetailRow({
//   icon: Icon,
//   label,
//   value,
//   accent,
// }: {
//   icon: React.ElementType;
//   label: string;
//   value: React.ReactNode;
//   accent?: boolean;
// }) {
//   return (
//     <div className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-b-0">
//       <div className={cn("mt-0.5 flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center", accent ? "bg-primary/10" : "bg-muted/60")}>
//         <Icon className={cn("h-2.5 w-2.5", accent ? "text-primary" : "text-muted-foreground")} />
//       </div>
//       <div className="flex-1 min-w-0">
//         <p className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-0.5">{label}</p>
//         <p className="text-[11px] font-medium text-foreground leading-relaxed">{value}</p>
//       </div>
//     </div>
//   );
// }

// // ─── Doctor Details Modal ─────────────────────────────────────────────────────

// function DoctorDetailsModal({
//   doctor,
//   open,
//   onOpenChange,
//   onBook,
//   onConnect,
//   canBook,
//   canConnect,
// }: {
//   doctor: ApiDoctor;
//   open: boolean;
//   onOpenChange: (v: boolean) => void;
//   onBook: () => void;
//   onConnect: () => void;
//   canBook: boolean;
//   canConnect: boolean;
// }) {
//   if (!open) return null;

//   const fee    = parseFloat(doctor.consultation_fee);
//   const rating = parseFloat(doctor.rating_avg);
//   const feeLabel = fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

//   const status: "online" | "busy" | "offline" =
//     doctor.is_available && !doctor.bookings_paused
//       ? "online"
//       : doctor.bookings_paused
//       ? "busy"
//       : "offline";

//   const statusStyles = {
//     online:  { dot: "bg-emerald-500", pulse: "animate-pulse", label: "Available",   text: "text-emerald-600",       bg: "bg-emerald-500/10 border-emerald-500/20" },
//     busy:    { dot: "bg-amber-500",   pulse: "",              label: "Paused",       text: "text-amber-600",         bg: "bg-amber-500/10 border-amber-500/20" },
//     offline: { dot: "bg-zinc-400",    pulse: "",              label: "Unavailable",  text: "text-muted-foreground",  bg: "bg-muted border-border" },
//   };
//   const s = statusStyles[status];

//   const langMap: Record<string, string> = { en: "English", fr: "French", kiny: "Kinyarwanda" };
//   const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;
//   const bio = doctor.bio_en || doctor.bio_fr || doctor.bio_kiny || null;

//   return (
//     <>
//       <div
//         className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
//         onClick={() => onOpenChange(false)}
//       />
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
//         <div
//           className={cn(
//             "pointer-events-auto w-full max-w-md",
//             "bg-card border border-border/60 rounded-sm shadow-2xl",
//             "flex flex-col max-h-[90dvh] overflow-hidden",
//             "animate-in fade-in-0 zoom-in-95 duration-200",
//           )}
//           onClick={(e) => e.stopPropagation()}
//         >
//           {/* Header band */}
//           <div className="relative bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/50 px-4 pt-4 pb-3 flex-shrink-0">
//             <button
//               onClick={() => onOpenChange(false)}
//               className="absolute top-3 right-3 w-6 h-6 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
//             >
//               <X className="h-3.5 w-3.5" />
//             </button>

//             <div className="flex items-center gap-3">
//               <div className="w-14 h-14 rounded-sm overflow-hidden border border-border/50 shadow-sm flex-shrink-0">
//                 <DoctorAvatar doctor={doctor} size="lg" />
//               </div>
//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
//                   <h2 className="text-[13px] font-semibold text-foreground leading-tight truncate">
//                     {doctor.user.name}
//                   </h2>
//                   {doctor.is_featured && (
//                     <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 flex-shrink-0">
//                       Featured
//                     </span>
//                   )}
//                   {doctor.verified_at && (
//                     <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />
//                   )}
//                 </div>
//                 <p className="text-[10px] text-primary font-medium truncate">
//                   {doctor.specialization}
//                   {doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
//                 </p>
//                 {doctor.designations && (
//                   <p className="text-[9px] text-muted-foreground/70 mt-0.5 truncate">{doctor.designations}</p>
//                 )}
//                 <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
//                   <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border", s.text, s.bg)}>
//                     <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", s.dot, s.pulse)} />
//                     {s.label}
//                   </span>
//                   <ConsultBadge type={doctor.consultation_type} />
//                   {doctor.instant_consultation && (
//                     <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-sm bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
//                       <Zap className="h-2.5 w-2.5" />
//                       Instant
//                     </span>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="mt-3 grid grid-cols-3 gap-1.5">
//               {[
//                 {
//                   icon: <Star className={cn("h-2.5 w-2.5", rating > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />,
//                   top: rating > 0 ? rating.toFixed(1) : "New",
//                   bot: "Rating",
//                 },
//                 {
//                   icon: <Clock className="h-2.5 w-2.5 text-muted-foreground" />,
//                   top: feeLabel,
//                   bot: "Per visit",
//                 },
//                 {
//                   icon: <CalendarCheck className="h-2.5 w-2.5 text-muted-foreground" />,
//                   top: doctor.instant_consultation ? "Instant" : "Scheduled",
//                   bot: "Consult",
//                 },
//               ].map(({ icon, top, bot }) => (
//                 <div key={bot} className="flex flex-col items-center py-1.5 px-2 bg-background/60 rounded-sm border border-border/40">
//                   <div className="flex items-center gap-1 mb-0.5">{icon}</div>
//                   <span className="text-[11px] font-bold text-foreground leading-tight">{top}</span>
//                   <span className="text-[9px] text-muted-foreground leading-tight">{bot}</span>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Scrollable body */}
//           <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
//             {bio && (
//               <div className="mb-3 p-2.5 rounded-sm bg-muted/30 border border-border/40">
//                 <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">About</p>
//                 <p className="text-[10px] text-muted-foreground leading-relaxed">{bio}</p>
//               </div>
//             )}

//             <div className="rounded-sm border border-border/40 bg-card overflow-hidden divide-y divide-border/40">
//               {locationLabel && (
//                 <DetailRow icon={MapPin} label="Location" value={locationLabel} />
//               )}
//               {doctor.medical_license && (
//                 <DetailRow icon={ShieldCheck} label="Medical License" value={doctor.medical_license} accent />
//               )}
//               {doctor.preferred_language && (
//                 <DetailRow
//                   icon={Languages}
//                   label="Language"
//                   value={langMap[doctor.preferred_language] ?? doctor.preferred_language}
//                 />
//               )}
//               <DetailRow
//                 icon={FileText}
//                 label="Agreement Status"
//                 value={
//                   <span className={cn(
//                     "capitalize text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border",
//                     doctor.agreement_status === "approved"
//                       ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
//                       : "text-amber-600 bg-amber-500/10 border-amber-500/20",
//                   )}>
//                     {doctor.agreement_status}
//                   </span>
//                 }
//               />
//               <DetailRow
//                 icon={User}
//                 label="Profile Status"
//                 value={
//                   <span className={cn(
//                     "capitalize text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border",
//                     doctor.is_active
//                       ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
//                       : "text-zinc-500 bg-muted border-border",
//                   )}>
//                     {doctor.is_active ? "Active" : "Inactive"}
//                   </span>
//                 }
//               />
//               {doctor.verified_at && (
//                 <DetailRow
//                   icon={BadgeCheck}
//                   label="Verified"
//                   value={new Date(doctor.verified_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
//                   accent
//                 />
//               )}
//             </div>

//             {doctor.hospitals && doctor.hospitals.length > 0 && (
//               <div className="mt-3">
//                 <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Hospitals</p>
//                 <div className="space-y-1">
//                   {doctor.hospitals.map((h: ApiDoctorHospital, i: number) => (
//                     <div key={i} className="flex items-center gap-2 p-2 rounded-sm border border-border/40 bg-muted/20">
//                       <Building2 className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
//                       <span className="text-[10px] text-foreground font-medium truncate">{h.name}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {doctor.specializations && doctor.specializations.length > 0 && (
//               <div className="mt-3">
//                 <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Specializations</p>
//                 <div className="flex flex-wrap gap-1">
//                   {doctor.specializations.map((sp: ApiDoctorSpecialization, i: number) => (
//                     <span key={i} className="px-2 py-0.5 text-[9px] font-medium rounded-sm bg-primary/8 text-primary border border-primary/20">
//                       {sp.name}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Footer actions */}
//           <div className="flex-shrink-0 border-t border-border/50 px-4 py-3 flex items-center gap-2 bg-card/80">
//             <Button
//               variant="outline"
//               size="sm"
//               disabled={!canBook}
//               onClick={() => { onOpenChange(false); onBook(); }}
//               className="flex-1 h-7 text-[10px] font-semibold rounded-sm"
//             >
//               <CalendarCheck className="h-3 w-3 mr-1.5" />
//               Book Appointment
//             </Button>

//             {canConnect && (
//               <Button
//                 size="sm"
//                 onClick={() => { onOpenChange(false); onConnect(); }}
//                 className="flex-1 h-7 text-[10px] font-semibold rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground"
//               >
//                 <Wifi className="h-3 w-3 mr-1.5" />
//                 Connect Now
//               </Button>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Main DoctorCard ──────────────────────────────────────────────────────────

// export const DoctorCard = ({
//   doctor: doctorProp,
//   compact = false,
// }: {
//   doctor: ApiDoctor;
//   compact?: boolean;
// }) => {
//   const { t } = useTranslation();
//   const [bookOpen,   setBookOpen]   = useState(false);
//   const [detailOpen, setDetailOpen] = useState(false);
//   const call = useCallStore();

//   // ── NEW: local doctor state — starts from prop, updated after booking ──────
//   // This lets us reflect fresh availability/status without re-mounting the card.
//   const [doctor, setDoctor] = useState<ApiDoctor>(doctorProp);
//   console.log("DoctorCard render:", doctor);

//   // Keep in sync if the parent re-renders with a different doctor object
//   // (e.g. after a list refetch triggered by the parent query invalidation).
//   // We skip the update while a booking dialog is open to avoid flicker.
//   if (!bookOpen && doctorProp !== doctor && doctorProp.id === doctor.id) {
//     // Shallow-merge: parent data wins for most fields, but we keep local state
//     // consistent so the card doesn't jump mid-interaction.
//     setDoctor(doctorProp);
//   }

//   // ── NEW: called by BookingDialog once the fresh doctor GET resolves ────────
//   const handleDoctorUpdated = (updatedDoctor: ApiDoctor) => {
//     setDoctor(updatedDoctor);
//   };

//   const fee      = parseFloat(doctor.consultation_fee);
//   const rating   = parseFloat(doctor.rating_avg);
//   const feeLabel = fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

//   const status: "online" | "busy" | "offline" =
//     doctor.is_available && !doctor.bookings_paused
//       ? "online"
//       : doctor.bookings_paused
//       ? "busy"
//       : "offline";

//   const statusStyles = {
//     online:  { dot: "bg-emerald-500", pulse: "animate-pulse", label: "Available",   text: "text-emerald-600",      bg: "bg-emerald-500/10 border-emerald-500/20" },
//     busy:    { dot: "bg-amber-500",   pulse: "",              label: "Paused",       text: "text-amber-600",        bg: "bg-amber-500/10 border-amber-500/20" },
//     offline: { dot: "bg-zinc-400",    pulse: "",              label: "Unavailable",  text: "text-muted-foreground", bg: "bg-muted border-border" },
//   };
//   const s = statusStyles[status];
// const callDoctor = { id: doctor.id, name: doctor.user.name };
// const isThisDoctor = call.doctor?.id === String(doctor.id);
//   // const callDoctor      = { id: doctor.id, name: doctor.user.name };
//   // const isThisDoctor    = call.doctor?.id === doctor.id;

//   const isCallInProgress = isThisDoctor && call.phase !== "idle";
//   const isConnected     = isThisDoctor && call.phase === "connected";
//   const isMinimized     = isConnected && call.minimized;

//   const canConnect = doctor.is_available && !doctor.bookings_paused && doctor.instant_consultation;
//   const canBook    = doctor.is_available && !doctor.bookings_paused;
//   const connectOpen = isThisDoctor && call.dialogOpen;

//   const handleOpenChange = (v: boolean) => {
//     if (!v && isCallInProgress) call.setMinimized(true);
//     else call.setDialogOpen(v);
//   };

//   const handleConnect = () => {
//     if (!canConnect) return;
//     if (isMinimized)           call.setMinimized(false);
//     else if (isCallInProgress) call.setDialogOpen(true);
//     else                       call.startCall(callDoctor);
//   };

//   const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;

//   return (
//     <>
//       <div
//         className={cn(
//           "relative rounded-sm border border-border bg-card",
//           "overflow-hidden transition-all duration-200 cursor-pointer",
//           "hover:shadow-md hover:-translate-y-px shadow-sm",
//           isConnected && "ring-1 ring-emerald-500/30",
//         )}
//         onClick={() => setDetailOpen(true)}
//       >
//         <div className="p-3.5">

//           {/* Top row */}
//           <div className="flex items-start gap-2.5">
//             <div className="relative shrink-0">
//               <div className="h-9 w-9 rounded-sm overflow-hidden border border-border/40">
//                 <DoctorAvatar doctor={doctor} />
//               </div>
//               <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card", s.dot, s.pulse)} />
//             </div>

//             <div className="flex-1 min-w-0">
//               <div className="flex items-start justify-between gap-1.5">
//                 <div className="min-w-0">
//                   <div className="flex items-center gap-1 flex-wrap">
//                     <h3 className="text-[12px] font-semibold text-foreground truncate leading-tight">
//                       {doctor.user.name}
//                     </h3>
//                     {doctor.is_featured && (
//                       <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
//                         Featured
//                       </span>
//                     )}
//                   </div>
//                   <p className="text-[10px] text-primary font-medium mt-0.5 truncate">
//                     {doctor.specialization}
//                     {doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
//                   </p>
//                 </div>

//                 {isConnected ? (
//                   <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
//                     <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shrink-0" />
//                     In call
//                   </span>
//                 ) : isCallInProgress ? (
//                   <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-sky-600 bg-sky-500/10 border-sky-500/20">
//                     <span className="h-1 w-1 rounded-full bg-sky-500 animate-pulse shrink-0" />
//                     Connecting
//                   </span>
//                 ) : (
//                   <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0", s.text, s.bg)}>
//                     <span className={cn("h-1 w-1 rounded-full shrink-0", s.dot)} />
//                     {s.label}
//                   </span>
//                 )}
//               </div>

//               {locationLabel && (
//                 <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1 truncate">
//                   <MapPin className="h-2.5 w-2.5 shrink-0" />
//                   {locationLabel}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Stats row */}
//           {!compact && (
//             <div className="mt-2.5 grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
//               {[
//                 {
//                   icon: <Star className={cn("h-2.5 w-2.5", rating > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />,
//                   top:  rating > 0 ? rating.toFixed(1) : "New",
//                   bot:  "rating",
//                 },
//                 {
//                   icon: <Clock className="h-2.5 w-2.5 text-muted-foreground" />,
//                   top:  feeLabel,
//                   bot:  "per visit",
//                 },
//                 {
//                   icon: <BriefcaseMedical className="h-2.5 w-2.5 text-muted-foreground" />,
//                   top:  doctor.instant_consultation ? "Instant" : "Scheduled",
//                   bot:  "consult",
//                 },
//               ].map(({ icon, top, bot }) => (
//                 <div key={bot} className="flex flex-col items-center py-1.5 px-1 bg-muted/30">
//                   <div className="flex items-center gap-1 mb-0.5">{icon}</div>
//                   <span className="text-[11px] font-semibold text-foreground leading-tight">{top}</span>
//                   <span className="text-[9px] text-muted-foreground leading-tight">{bot}</span>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* Consultation type + view details hint */}
//           {!compact && (
//             <div className="mt-2 flex items-center justify-between">
//               <ConsultBadge type={doctor.consultation_type} />
//               <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50 font-medium">
//                 View details <ChevronRight className="h-2.5 w-2.5" />
//               </span>
//             </div>
//           )}

//           <div className="mt-2.5 border-t border-border" />

//           {/* Bottom actions */}
//           <div
//             className="mt-2.5 flex items-center justify-between gap-2"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-center gap-1">
//               {isConnected ? (
//                 <>
//                   <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//                   <span className="text-[10px] font-medium text-emerald-600">Call in progress</span>
//                 </>
//               ) : isCallInProgress ? (
//                 <>
//                   <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
//                   <span className="text-[10px] font-medium text-sky-600">Connecting…</span>
//                 </>
//               ) : (
//                 <>
//                   <Zap className={cn("h-2.5 w-2.5", doctor.instant_consultation ? "text-emerald-500" : "text-muted-foreground")} />
//                   <span className={cn("text-[10px] font-medium", doctor.instant_consultation ? "text-emerald-600" : "text-muted-foreground")}>
//                     {doctor.instant_consultation ? "Usually replies in 2 min" : "Replies within 24h"}
//                   </span>
//                 </>
//               )}
//             </div>

//             <div className="flex items-center gap-1.5">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 disabled={!canBook || isCallInProgress}
//                 onClick={() => canBook && !isCallInProgress && setBookOpen(true)}
//                 className="h-6 px-2.5 text-[10px] font-medium rounded-sm border-border"
//               >
//                 {t("pages.cards.book")}
//               </Button>

//               {canConnect ? (
//                 <Button
//                   size="sm"
//                   onClick={handleConnect}
//                   className={cn(
//                     "h-6 px-2.5 text-[10px] font-semibold rounded-sm",
//                     isMinimized
//                       ? "bg-emerald-500 hover:bg-emerald-600 text-white"
//                       : isCallInProgress
//                       ? "bg-sky-500 hover:bg-sky-600 text-white"
//                       : "bg-primary hover:bg-primary/90 text-primary-foreground",
//                   )}
//                 >
//                   {isMinimized ? (
//                     <><Maximize2 className="h-2.5 w-2.5 mr-1" />Resume</>
//                   ) : isCallInProgress ? (
//                     <><Wifi className="h-2.5 w-2.5 mr-1" />Open</>
//                   ) : (
//                     <><Wifi className="h-2.5 w-2.5 mr-1" />{t("pages.cards.connect")}</>
//                   )}
//                 </Button>
//               ) : (
//                 <Button
//                   size="sm"
//                   variant="secondary"
//                   disabled
//                   className="h-6 px-2.5 text-[10px] rounded-sm opacity-50 cursor-not-allowed"
//                 >
//                   {s.label}
//                 </Button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Modals */}
//       <DoctorDetailsModal
//         doctor={doctor}
//         open={detailOpen}
//         onOpenChange={setDetailOpen}
//         onBook={() => setBookOpen(true)}
//         onConnect={handleConnect}
//         canBook={canBook}
//         canConnect={canConnect}
//       />

//       {/* ── NEW: pass onConfirmed so BookingDialog can push fresh doctor data back ── */}
//       <BookingDialog
//         doctor={doctor}
//         open={bookOpen}
//         onOpenChange={setBookOpen}
//         onConfirmed={handleDoctorUpdated}
//       />

//       <ConnectDialog doctor={doctor} open={connectOpen} onOpenChange={handleOpenChange} />
//     </>
//   );
// };



// // components/DoctorCard.tsx
// import { useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Star, MapPin, Clock, Wifi, BriefcaseMedical,
//   Zap, Maximize2, Globe, Video, Building2, X,
//   ShieldCheck, Languages, BadgeCheck, FileText,
//   CalendarCheck, User, ChevronRight,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";
// import { BookingDialog } from "@/components/BookingDialog";
// import { ConnectDialog } from "@/components/ConnectDialog";
// import { useCallStore } from "@/context/CallStore";
// import type { Doctor } from "@/context/CallStore";
// import type { ApiDoctor, ApiDoctorHospital, ApiDoctorSpecialization } from "@/hooks/patient/use-patient-doctor";

// // ─── Avatar ───────────────────────────────────────────────────────────────────

// function DoctorAvatar({
//   doctor,
//   size = "sm",
// }: {
//   doctor: ApiDoctor;
//   size?: "sm" | "lg";
// }) {
//   const [imgError, setImgError] = useState(false);
//   const initials = doctor.user.name
//     .split(" ")
//     .map((n) => n[0])
//     .join("")
//     .slice(0, 2)
//     .toUpperCase();

//   const sizeClass = size === "lg" ? "h-full w-full text-xl" : "h-full w-full text-sm";

//   if (!doctor.image || imgError) {
//     return (
//       <div className={cn(sizeClass, "rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold select-none")}>
//         {initials}
//       </div>
//     );
//   }

//   return (
//     <img
//       src={doctor.image}
//       alt={doctor.user.name}
//       className="h-full w-full object-cover rounded-sm"
//       onError={() => setImgError(true)}
//     />
//   );
// }

// // ─── Consultation badge ───────────────────────────────────────────────────────

// function ConsultBadge({ type }: { type: ApiDoctor["consultation_type"] }) {
//   const map = {
//     online:    { label: "Online",             icon: Video,     cls: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
//     in_person: { label: "In-Person",          icon: Building2, cls: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
//     both:      { label: "Online & In-Person", icon: Globe,     cls: "text-teal-600 bg-teal-500/10 border-teal-500/20" },
//   };
//   const cfg = map[type] ?? map.both;
//   const Icon = cfg.icon;
//   return (
//     <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border", cfg.cls)}>
//       <Icon className="h-2.5 w-2.5" />
//       {cfg.label}
//     </span>
//   );
// }

// // ─── Detail row (used inside modal) ──────────────────────────────────────────

// function DetailRow({
//   icon: Icon,
//   label,
//   value,
//   accent,
// }: {
//   icon: React.ElementType;
//   label: string;
//   value: React.ReactNode;
//   accent?: boolean;
// }) {
//   return (
//     <div className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-b-0">
//       <div className={cn("mt-0.5 flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center", accent ? "bg-primary/10" : "bg-muted/60")}>
//         <Icon className={cn("h-2.5 w-2.5", accent ? "text-primary" : "text-muted-foreground")} />
//       </div>
//       <div className="flex-1 min-w-0">
//         <p className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-0.5">{label}</p>
//         <p className="text-[11px] font-medium text-foreground leading-relaxed">{value}</p>
//       </div>
//     </div>
//   );
// }

// // ─── Doctor Details Modal ─────────────────────────────────────────────────────

// function DoctorDetailsModal({
//   doctor,
//   open,
//   onOpenChange,
//   onBook,
//   onConnect,
//   canBook,
//   canConnect,
// }: {
//   doctor: ApiDoctor;
//   open: boolean;
//   onOpenChange: (v: boolean) => void;
//   onBook: () => void;
//   onConnect: () => void;
//   canBook: boolean;
//   canConnect: boolean;
// }) {
//   if (!open) return null;

//   const fee    = parseFloat(doctor.consultation_fee);
//   const rating = parseFloat(doctor.rating_avg);
//   const feeLabel = fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

//   const status: "online" | "busy" | "offline" =
//     doctor.is_available && !doctor.bookings_paused
//       ? "online"
//       : doctor.bookings_paused
//       ? "busy"
//       : "offline";

//   const statusStyles = {
//     online:  { dot: "bg-emerald-500", pulse: "animate-pulse", label: "Available",   text: "text-emerald-600",       bg: "bg-emerald-500/10 border-emerald-500/20" },
//     busy:    { dot: "bg-amber-500",   pulse: "",              label: "Paused",       text: "text-amber-600",         bg: "bg-amber-500/10 border-amber-500/20" },
//     offline: { dot: "bg-zinc-400",    pulse: "",              label: "Unavailable",  text: "text-muted-foreground",  bg: "bg-muted border-border" },
//   };
//   const s = statusStyles[status];

//   const langMap: Record<string, string> = { en: "English", fr: "French", kiny: "Kinyarwanda" };
//   const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;
//   const bio = doctor.bio_en || doctor.bio_fr || doctor.bio_kiny || null;

//   return (
//     <>
//       <div
//         className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
//         onClick={() => onOpenChange(false)}
//       />
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
//         <div
//           className={cn(
//             "pointer-events-auto w-full max-w-md",
//             "bg-card border border-border/60 rounded-sm shadow-2xl",
//             "flex flex-col max-h-[90dvh] overflow-hidden",
//             "animate-in fade-in-0 zoom-in-95 duration-200",
//           )}
//           onClick={(e) => e.stopPropagation()}
//         >
//           {/* Header band */}
//           <div className="relative bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/50 px-4 pt-4 pb-3 flex-shrink-0">
//             <button
//               onClick={() => onOpenChange(false)}
//               className="absolute top-3 right-3 w-6 h-6 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
//             >
//               <X className="h-3.5 w-3.5" />
//             </button>

//             <div className="flex items-center gap-3">
//               <div className="w-14 h-14 rounded-sm overflow-hidden border border-border/50 shadow-sm flex-shrink-0">
//                 <DoctorAvatar doctor={doctor} size="lg" />
//               </div>
//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
//                   <h2 className="text-[13px] font-semibold text-foreground leading-tight truncate">
//                     {doctor.user.name}
//                   </h2>
//                   {doctor.is_featured && (
//                     <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 flex-shrink-0">
//                       Featured
//                     </span>
//                   )}
//                   {doctor.verified_at && (
//                     <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />
//                   )}
//                 </div>
//                 <p className="text-[10px] text-primary font-medium truncate">
//                   {doctor.specialization}
//                   {doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
//                 </p>
//                 {doctor.designations && (
//                   <p className="text-[9px] text-muted-foreground/70 mt-0.5 truncate">{doctor.designations}</p>
//                 )}
//                 <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
//                   <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border", s.text, s.bg)}>
//                     <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", s.dot, s.pulse)} />
//                     {s.label}
//                   </span>
//                   <ConsultBadge type={doctor.consultation_type} />
//                   {doctor.instant_consultation && (
//                     <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-sm bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
//                       <Zap className="h-2.5 w-2.5" />
//                       Instant
//                     </span>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="mt-3 grid grid-cols-3 gap-1.5">
//               {[
//                 {
//                   icon: <Star className={cn("h-2.5 w-2.5", rating > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />,
//                   top: rating > 0 ? rating.toFixed(1) : "New",
//                   bot: "Rating",
//                 },
//                 {
//                   icon: <Clock className="h-2.5 w-2.5 text-muted-foreground" />,
//                   top: feeLabel,
//                   bot: "Per visit",
//                 },
//                 {
//                   icon: <CalendarCheck className="h-2.5 w-2.5 text-muted-foreground" />,
//                   top: doctor.instant_consultation ? "Instant" : "Scheduled",
//                   bot: "Consult",
//                 },
//               ].map(({ icon, top, bot }) => (
//                 <div key={bot} className="flex flex-col items-center py-1.5 px-2 bg-background/60 rounded-sm border border-border/40">
//                   <div className="flex items-center gap-1 mb-0.5">{icon}</div>
//                   <span className="text-[11px] font-bold text-foreground leading-tight">{top}</span>
//                   <span className="text-[9px] text-muted-foreground leading-tight">{bot}</span>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Scrollable body */}
//           <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
//             {bio && (
//               <div className="mb-3 p-2.5 rounded-sm bg-muted/30 border border-border/40">
//                 <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">About</p>
//                 <p className="text-[10px] text-muted-foreground leading-relaxed">{bio}</p>
//               </div>
//             )}

//             <div className="rounded-sm border border-border/40 bg-card overflow-hidden divide-y divide-border/40">
//               {locationLabel && (
//                 <DetailRow icon={MapPin} label="Location" value={locationLabel} />
//               )}
//               {doctor.medical_license && (
//                 <DetailRow icon={ShieldCheck} label="Medical License" value={doctor.medical_license} accent />
//               )}
//               {doctor.preferred_language && (
//                 <DetailRow
//                   icon={Languages}
//                   label="Language"
//                   value={langMap[doctor.preferred_language] ?? doctor.preferred_language}
//                 />
//               )}
//               <DetailRow
//                 icon={FileText}
//                 label="Agreement Status"
//                 value={
//                   <span className={cn(
//                     "capitalize text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border",
//                     doctor.agreement_status === "approved"
//                       ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
//                       : "text-amber-600 bg-amber-500/10 border-amber-500/20",
//                   )}>
//                     {doctor.agreement_status}
//                   </span>
//                 }
//               />
//               <DetailRow
//                 icon={User}
//                 label="Profile Status"
//                 value={
//                   <span className={cn(
//                     "capitalize text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border",
//                     doctor.is_active
//                       ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
//                       : "text-zinc-500 bg-muted border-border",
//                   )}>
//                     {doctor.is_active ? "Active" : "Inactive"}
//                   </span>
//                 }
//               />
//               {doctor.verified_at && (
//                 <DetailRow
//                   icon={BadgeCheck}
//                   label="Verified"
//                   value={new Date(doctor.verified_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
//                   accent
//                 />
//               )}
//             </div>

//             {doctor.hospitals && doctor.hospitals.length > 0 && (
//               <div className="mt-3">
//                 <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Hospitals</p>
//                 <div className="space-y-1">
//                   {doctor.hospitals.map((h: ApiDoctorHospital, i: number) => (
//                     <div key={i} className="flex items-center gap-2 p-2 rounded-sm border border-border/40 bg-muted/20">
//                       <Building2 className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
//                       <span className="text-[10px] text-foreground font-medium truncate">{h.name}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {doctor.specializations && doctor.specializations.length > 0 && (
//               <div className="mt-3">
//                 <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Specializations</p>
//                 <div className="flex flex-wrap gap-1">
//                   {doctor.specializations.map((sp: ApiDoctorSpecialization, i: number) => (
//                     <span key={i} className="px-2 py-0.5 text-[9px] font-medium rounded-sm bg-primary/8 text-primary border border-primary/20">
//                       {sp.name}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Footer actions */}
//           <div className="flex-shrink-0 border-t border-border/50 px-4 py-3 flex items-center gap-2 bg-card/80">
//             <Button
//               variant="outline"
//               size="sm"
//               disabled={!canBook}
//               onClick={() => { onOpenChange(false); onBook(); }}
//               className="flex-1 h-7 text-[10px] font-semibold rounded-sm"
//             >
//               <CalendarCheck className="h-3 w-3 mr-1.5" />
//               Book Appointment
//             </Button>

//             {canConnect && (
//               <Button
//                 size="sm"
//                 onClick={() => { onOpenChange(false); onConnect(); }}
//                 className="flex-1 h-7 text-[10px] font-semibold rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground"
//               >
//                 <Wifi className="h-3 w-3 mr-1.5" />
//                 Connect Now
//               </Button>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Main DoctorCard ──────────────────────────────────────────────────────────

// export const DoctorCard = ({
//   doctor: doctorProp,
//   compact = false,
// }: {
//   doctor: ApiDoctor;
//   compact?: boolean;
// }) => {
//   const { t } = useTranslation();
//   const [bookOpen,   setBookOpen]   = useState(false);
//   const [detailOpen, setDetailOpen] = useState(false);
//   const call = useCallStore();

//   // Local doctor state — starts from prop, updated after booking
//   const [doctor, setDoctor] = useState<ApiDoctor>(doctorProp);

//   // Keep in sync if parent re-renders with a different doctor object
//   if (!bookOpen && doctorProp !== doctor && doctorProp.id === doctor.id) {
//     setDoctor(doctorProp);
//   }

//   const handleDoctorUpdated = (updatedDoctor: ApiDoctor) => {
//     setDoctor(updatedDoctor);
//   };

//   const fee      = parseFloat(doctor.consultation_fee);
//   const rating   = parseFloat(doctor.rating_avg);
//   const feeLabel = fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

//   const status: "online" | "busy" | "offline" =
//     doctor.is_available && !doctor.bookings_paused
//       ? "online"
//       : doctor.bookings_paused
//       ? "busy"
//       : "offline";

//   const statusStyles = {
//     online:  { dot: "bg-emerald-500", pulse: "animate-pulse", label: "Available",   text: "text-emerald-600",      bg: "bg-emerald-500/10 border-emerald-500/20" },
//     busy:    { dot: "bg-amber-500",   pulse: "",              label: "Paused",       text: "text-amber-600",        bg: "bg-amber-500/10 border-amber-500/20" },
//     offline: { dot: "bg-zinc-400",    pulse: "",              label: "Unavailable",  text: "text-muted-foreground", bg: "bg-muted border-border" },
//   };
//   const s = statusStyles[status];

//   // Build a slim Doctor object that matches CallStore's Doctor type
//   const callDoctor: Doctor = {
//     id: doctor.id,
//     user: {
//       id: doctor.user.id,
//       name: doctor.user.name,
//       avatar: doctor.user.avatar,
//     },
//     specialization: doctor.specialization,
//   };

//   // doctor.id is number; call.doctor?.id is also number — safe comparison
//   const isThisDoctor     = call.doctor?.id === doctor.id;
//   const isCallInProgress = isThisDoctor && call.phase !== "idle";
//   const isConnected      = isThisDoctor && call.phase === "connected";
//   const isMinimized      = isConnected && call.minimized;

//   const canConnect = doctor.is_available && !doctor.bookings_paused && doctor.instant_consultation;
//   const canBook    = doctor.is_available && !doctor.bookings_paused;
//   const connectOpen = isThisDoctor && call.dialogOpen;

//   const handleOpenChange = (v: boolean) => {
//     if (!v && isCallInProgress) call.setMinimized(true);
//     else call.setDialogOpen(v);
//   };

//   const handleConnect = () => {
//     if (!canConnect) return;
//     if (isMinimized)           call.setMinimized(false);
//     else if (isCallInProgress) call.setDialogOpen(true);
//     else                       call.startCall(callDoctor);
//   };

//   const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;

//   return (
//     <>
//       <div
//         className={cn(
//           "relative rounded-sm border border-border bg-card",
//           "overflow-hidden transition-all duration-200 cursor-pointer",
//           "hover:shadow-md hover:-translate-y-px shadow-sm",
//           isConnected && "ring-1 ring-emerald-500/30",
//         )}
//         onClick={() => setDetailOpen(true)}
//       >
//         <div className="p-3.5">

//           {/* Top row */}
//           <div className="flex items-start gap-2.5">
//             <div className="relative shrink-0">
//               <div className="h-9 w-9 rounded-sm overflow-hidden border border-border/40">
//                 <DoctorAvatar doctor={doctor} />
//               </div>
//               <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card", s.dot, s.pulse)} />
//             </div>

//             <div className="flex-1 min-w-0">
//               <div className="flex items-start justify-between gap-1.5">
//                 <div className="min-w-0">
//                   <div className="flex items-center gap-1 flex-wrap">
//                     <h3 className="text-[12px] font-semibold text-foreground truncate leading-tight">
//                       {doctor.user.name}
//                     </h3>
//                     {doctor.is_featured && (
//                       <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
//                         Featured
//                       </span>
//                     )}
//                   </div>
//                   <p className="text-[10px] text-primary font-medium mt-0.5 truncate">
//                     {doctor.specialization}
//                     {doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
//                   </p>
//                 </div>

//                 {isConnected ? (
//                   <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
//                     <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shrink-0" />
//                     In call
//                   </span>
//                 ) : isCallInProgress ? (
//                   <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-sky-600 bg-sky-500/10 border-sky-500/20">
//                     <span className="h-1 w-1 rounded-full bg-sky-500 animate-pulse shrink-0" />
//                     Connecting
//                   </span>
//                 ) : (
//                   <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0", s.text, s.bg)}>
//                     <span className={cn("h-1 w-1 rounded-full shrink-0", s.dot)} />
//                     {s.label}
//                   </span>
//                 )}
//               </div>

//               {locationLabel && (
//                 <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1 truncate">
//                   <MapPin className="h-2.5 w-2.5 shrink-0" />
//                   {locationLabel}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Stats row */}
//           {!compact && (
//             <div className="mt-2.5 grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
//               {[
//                 {
//                   icon: <Star className={cn("h-2.5 w-2.5", rating > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />,
//                   top:  rating > 0 ? rating.toFixed(1) : "New",
//                   bot:  "rating",
//                 },
//                 {
//                   icon: <Clock className="h-2.5 w-2.5 text-muted-foreground" />,
//                   top:  feeLabel,
//                   bot:  "per visit",
//                 },
//                 {
//                   icon: <BriefcaseMedical className="h-2.5 w-2.5 text-muted-foreground" />,
//                   top:  doctor.instant_consultation ? "Instant" : "Scheduled",
//                   bot:  "consult",
//                 },
//               ].map(({ icon, top, bot }) => (
//                 <div key={bot} className="flex flex-col items-center py-1.5 px-1 bg-muted/30">
//                   <div className="flex items-center gap-1 mb-0.5">{icon}</div>
//                   <span className="text-[11px] font-semibold text-foreground leading-tight">{top}</span>
//                   <span className="text-[9px] text-muted-foreground leading-tight">{bot}</span>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* Consultation type + view details hint */}
//           {!compact && (
//             <div className="mt-2 flex items-center justify-between">
//               <ConsultBadge type={doctor.consultation_type} />
//               <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50 font-medium">
//                 View details <ChevronRight className="h-2.5 w-2.5" />
//               </span>
//             </div>
//           )}

//           <div className="mt-2.5 border-t border-border" />

//           {/* Bottom actions */}
//           <div
//             className="mt-2.5 flex items-center justify-between gap-2"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-center gap-1">
//               {isConnected ? (
//                 <>
//                   <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//                   <span className="text-[10px] font-medium text-emerald-600">Call in progress</span>
//                 </>
//               ) : isCallInProgress ? (
//                 <>
//                   <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
//                   <span className="text-[10px] font-medium text-sky-600">Connecting…</span>
//                 </>
//               ) : (
//                 <>
//                   <Zap className={cn("h-2.5 w-2.5", doctor.instant_consultation ? "text-emerald-500" : "text-muted-foreground")} />
//                   <span className={cn("text-[10px] font-medium", doctor.instant_consultation ? "text-emerald-600" : "text-muted-foreground")}>
//                     {doctor.instant_consultation ? "Usually replies in 2 min" : "Replies within 24h"}
//                   </span>
//                 </>
//               )}
//             </div>

//             <div className="flex items-center gap-1.5">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 disabled={!canBook || isCallInProgress}
//                 onClick={() => canBook && !isCallInProgress && setBookOpen(true)}
//                 className="h-6 px-2.5 text-[10px] font-medium rounded-sm border-border"
//               >
//                 {t("pages.cards.book")}
//               </Button>

//               {canConnect ? (
//                 <Button
//                   size="sm"
//                   onClick={handleConnect}
//                   className={cn(
//                     "h-6 px-2.5 text-[10px] font-semibold rounded-sm",
//                     isMinimized
//                       ? "bg-emerald-500 hover:bg-emerald-600 text-white"
//                       : isCallInProgress
//                       ? "bg-sky-500 hover:bg-sky-600 text-white"
//                       : "bg-primary hover:bg-primary/90 text-primary-foreground",
//                   )}
//                 >
//                   {isMinimized ? (
//                     <><Maximize2 className="h-2.5 w-2.5 mr-1" />Resume</>
//                   ) : isCallInProgress ? (
//                     <><Wifi className="h-2.5 w-2.5 mr-1" />Open</>
//                   ) : (
//                     <><Wifi className="h-2.5 w-2.5 mr-1" />{t("pages.cards.connect")}</>
//                   )}
//                 </Button>
//               ) : (
//                 <Button
//                   size="sm"
//                   variant="secondary"
//                   disabled
//                   className="h-6 px-2.5 text-[10px] rounded-sm opacity-50 cursor-not-allowed"
//                 >
//                   {s.label}
//                 </Button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Modals */}
//       <DoctorDetailsModal
//         doctor={doctor}
//         open={detailOpen}
//         onOpenChange={setDetailOpen}
//         onBook={() => setBookOpen(true)}
//         onConnect={handleConnect}
//         canBook={canBook}
//         canConnect={canConnect}
//       />

//       <BookingDialog
//         doctor={doctor}
//         open={bookOpen}
//         onOpenChange={setBookOpen}
//         onConfirmed={handleDoctorUpdated}
//       />

//       <ConnectDialog
//         doctor={callDoctor}
//         open={connectOpen}
//         onOpenChange={handleOpenChange}
//       />
//     </>
//   );
// };





// components/DoctorCard.tsx
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Star, MapPin, Clock, Wifi, BriefcaseMedical,
  Zap, Maximize2, Globe, Video, Building2, X,
  ShieldCheck, Languages, BadgeCheck, FileText,
  CalendarCheck, User, ChevronRight, ChevronLeft,
  Minus, ArrowUpRight, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingDialog } from "@/components/BookingDialog";
import { ConnectDialogContent } from "@/components/ConnectDialog";
import { useCallStore } from "@/context/CallStore";
import type { Doctor } from "@/context/CallStore";
import type { ApiDoctor, ApiDoctorHospital, ApiDoctorSpecialization } from "@/hooks/patient/use-patient-doctor";
import { readConsultSession } from "@/hooks/patient/se-consultation-session"

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = "details" | "connect";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function DoctorAvatar({
  doctor,
  size = "sm",
}: {
  doctor: ApiDoctor;
  size?: "sm" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const initials = doctor.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClass = size === "lg" ? "h-full w-full text-xl" : "h-full w-full text-sm";

  if (!doctor.image || imgError) {
    return (
      <div className={cn(sizeClass, "rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold select-none")}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={doctor.image}
      alt={doctor.user.name}
      className="h-full w-full object-cover rounded-sm"
      onError={() => setImgError(true)}
    />
  );
}

// ─── Consultation badge ───────────────────────────────────────────────────────

function ConsultBadge({ type }: { type: ApiDoctor["consultation_type"] }) {
  const map = {
    online:    { label: "Online",             icon: Video,     cls: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
    in_person: { label: "In-Person",          icon: Building2, cls: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
    both:      { label: "Online & In-Person", icon: Globe,     cls: "text-teal-600 bg-teal-500/10 border-teal-500/20" },
  };
  const cfg = map[type] ?? map.both;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border", cfg.cls)}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-b-0">
      <div className={cn("mt-0.5 flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center", accent ? "bg-primary/10" : "bg-muted/60")}>
        <Icon className={cn("h-2.5 w-2.5", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-[11px] font-medium text-foreground leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

// ─── Resume Pill ──────────────────────────────────────────────────────────────

function ResumePill({
  doctorName,
  phase,
  onResume,
  onEndCompletely,
}: {
  doctorName: string;
  phase: string;
  onResume: () => void;
  onEndCompletely: () => void;
}) {
  const isLive = phase === "connected";

  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 animate-in slide-in-from-bottom-3 fade-in duration-300">
      <button
        onClick={onEndCompletely}
        title="End call completely"
        className="h-8 w-8 rounded-full bg-destructive/90 hover:bg-destructive text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={onResume}
        className={cn(
          "flex items-center gap-2.5 pl-3 pr-4 h-10 rounded-full shadow-xl border transition-all hover:scale-[1.02] active:scale-[0.98]",
          isLive
            ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-400/30 text-white"
            : "bg-card border-border text-foreground hover:bg-muted",
        )}
      >
        {isLive && (
          <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
        )}
        <span className="text-[11px] font-semibold leading-none truncate max-w-[120px]">
          {isLive ? "Live · " : ""}{doctorName}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    </div>,
    document.body,
  );
}

// ─── Saved Session Pill ───────────────────────────────────────────────────────
// Floating pill shown when a saved queue session exists but no live call is running.

function SavedSessionPill({
  doctorName,
  onResume,
  onDismiss,
}: {
  doctorName: string;
  onResume: () => void;
  onDismiss: () => void;
}) {
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 animate-in slide-in-from-bottom-3 fade-in duration-300">
      <button
        onClick={onDismiss}
        title="Dismiss"
        className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 border border-border text-muted-foreground flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={onResume}
        className="flex items-center gap-2.5 pl-3 pr-4 h-10 rounded-full shadow-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 text-violet-700 dark:text-violet-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <RotateCcw className="h-3 w-3 shrink-0" />
        <span className="text-[11px] font-semibold leading-none truncate max-w-[130px]">
          Resume · {doctorName}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    </div>,
    document.body,
  );
}

// ─── Unified Modal ────────────────────────────────────────────────────────────

interface UnifiedModalProps {
  doctor: ApiDoctor;
  callDoctor: Doctor;
  initialMode: ModalMode;
  open: boolean;
  onMinimize: () => void;
  onCloseCompletely: () => void;
  onBook: () => void;
  canBook: boolean;
  canConnect: boolean;
}

function UnifiedModal({
  doctor,
  callDoctor,
  initialMode,
  open,
  onMinimize,
  onCloseCompletely,
  onBook,
  canBook,
  canConnect,
}: UnifiedModalProps) {
  const [mode, setMode] = useState<ModalMode>(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  if (!open) return null;

  const fee    = parseFloat(doctor.consultation_fee);
  const rating = parseFloat(doctor.rating_avg);
  const feeLabel = fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

  const status: "online" | "busy" | "offline" =
    doctor.is_available && !doctor.bookings_paused
      ? "online"
      : doctor.bookings_paused
      ? "busy"
      : "offline";

  const statusStyles = {
    online:  { dot: "bg-emerald-500", pulse: "animate-pulse", label: "Available",   text: "text-emerald-600",       bg: "bg-emerald-500/10 border-emerald-500/20" },
    busy:    { dot: "bg-amber-500",   pulse: "",              label: "Paused",       text: "text-amber-600",         bg: "bg-amber-500/10 border-amber-500/20" },
    offline: { dot: "bg-zinc-400",    pulse: "",              label: "Unavailable",  text: "text-muted-foreground",  bg: "bg-muted border-border" },
  };
  const s = statusStyles[status];

  const langMap: Record<string, string> = { en: "English", fr: "French", kiny: "Kinyarwanda" };
  const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;
  const bio = doctor.bio_en || doctor.bio_fr || doctor.bio_kiny || null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onMinimize}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto w-full",
            mode === "connect" ? "max-w-[420px]" : "max-w-md",
            "bg-card border border-border/60 rounded-xl shadow-2xl",
            "flex flex-col max-h-[90dvh] overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-200",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Shared header bar ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {mode === "connect" && (
                <button
                  onClick={() => setMode("details")}
                  className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                  title="Back to details"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="text-[11px] font-semibold text-foreground/70 truncate">
                {mode === "details" ? doctor.user.name : "Instant consultation"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onMinimize}
                title="Minimize (keep session alive)"
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onCloseCompletely}
                title="Close and end session"
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── Content area ── */}
          {mode === "details" ? (
            <>
              {/* Doctor details header band */}
              <div className="relative bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/50 px-4 pt-4 pb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-sm overflow-hidden border border-border/50 shadow-sm flex-shrink-0">
                    <DoctorAvatar doctor={doctor} size="lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <h2 className="text-[13px] font-semibold text-foreground leading-tight truncate">
                        {doctor.user.name}
                      </h2>
                      {doctor.is_featured && (
                        <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 flex-shrink-0">
                          Featured
                        </span>
                      )}
                      {doctor.verified_at && (
                        <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-primary font-medium truncate">
                      {doctor.specialization}
                      {doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
                    </p>
                    {doctor.designations && (
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5 truncate">{doctor.designations}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border", s.text, s.bg)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", s.dot, s.pulse)} />
                        {s.label}
                      </span>
                      <ConsultBadge type={doctor.consultation_type} />
                      {doctor.instant_consultation && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-sm bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                          <Zap className="h-2.5 w-2.5" />
                          Instant
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {[
                    {
                      icon: <Star className={cn("h-2.5 w-2.5", rating > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />,
                      top: rating > 0 ? rating.toFixed(1) : "New",
                      bot: "Rating",
                    },
                    {
                      icon: <Clock className="h-2.5 w-2.5 text-muted-foreground" />,
                      top: feeLabel,
                      bot: "Per visit",
                    },
                    {
                      icon: <CalendarCheck className="h-2.5 w-2.5 text-muted-foreground" />,
                      top: doctor.instant_consultation ? "Instant" : "Scheduled",
                      bot: "Consult",
                    },
                  ].map(({ icon, top, bot }) => (
                    <div key={bot} className="flex flex-col items-center py-1.5 px-2 bg-background/60 rounded-sm border border-border/40">
                      <div className="flex items-center gap-1 mb-0.5">{icon}</div>
                      <span className="text-[11px] font-bold text-foreground leading-tight">{top}</span>
                      <span className="text-[9px] text-muted-foreground leading-tight">{bot}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {bio && (
                  <div className="mb-3 p-2.5 rounded-sm bg-muted/30 border border-border/40">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">About</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{bio}</p>
                  </div>
                )}

                <div className="rounded-sm border border-border/40 bg-card overflow-hidden divide-y divide-border/40">
                  {locationLabel && (
                    <DetailRow icon={MapPin} label="Location" value={locationLabel} />
                  )}
                  {doctor.medical_license && (
                    <DetailRow icon={ShieldCheck} label="Medical License" value={doctor.medical_license} accent />
                  )}
                  {doctor.preferred_language && (
                    <DetailRow
                      icon={Languages}
                      label="Language"
                      value={langMap[doctor.preferred_language] ?? doctor.preferred_language}
                    />
                  )}
                  <DetailRow
                    icon={FileText}
                    label="Agreement Status"
                    value={
                      <span className={cn(
                        "capitalize text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border",
                        doctor.agreement_status === "approved"
                          ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                          : "text-amber-600 bg-amber-500/10 border-amber-500/20",
                      )}>
                        {doctor.agreement_status}
                      </span>
                    }
                  />
                  <DetailRow
                    icon={User}
                    label="Profile Status"
                    value={
                      <span className={cn(
                        "capitalize text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border",
                        doctor.is_active
                          ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                          : "text-zinc-500 bg-muted border-border",
                      )}>
                        {doctor.is_active ? "Active" : "Inactive"}
                      </span>
                    }
                  />
                  {doctor.verified_at && (
                    <DetailRow
                      icon={BadgeCheck}
                      label="Verified"
                      value={new Date(doctor.verified_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      accent
                    />
                  )}
                </div>

                {doctor.hospitals && doctor.hospitals.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Hospitals</p>
                    <div className="space-y-1">
                      {doctor.hospitals.map((h: ApiDoctorHospital, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-sm border border-border/40 bg-muted/20">
                          <Building2 className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-[10px] text-foreground font-medium truncate">{h.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {doctor.specializations && doctor.specializations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Specializations</p>
                    <div className="flex flex-wrap gap-1">
                      {doctor.specializations.map((sp: ApiDoctorSpecialization, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-[9px] font-medium rounded-sm bg-primary/8 text-primary border border-primary/20">
                          {sp.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex-shrink-0 border-t border-border/50 px-4 py-3 flex items-center gap-2 bg-card/80">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canBook}
                  onClick={() => { onMinimize(); onBook(); }}
                  className="flex-1 h-7 text-[10px] font-semibold rounded-sm"
                >
                  <CalendarCheck className="h-3 w-3 mr-1.5" />
                  Book Appointment
                </Button>

                {canConnect && (
                  <Button
                    size="sm"
                    onClick={() => setMode("connect")}
                    className="flex-1 h-7 text-[10px] font-semibold rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Wifi className="h-3 w-3 mr-1.5" />
                    Connect Now
                  </Button>
                )}
              </div>
            </>
          ) : (
            <ConnectDialogContent
              doctor={callDoctor}
              onMinimize={onMinimize}
              onCloseCompletely={onCloseCompletely}
            />
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── Main DoctorCard ──────────────────────────────────────────────────────────

export const DoctorCard = ({
  doctor: doctorProp,
  compact = false,
}: {
  doctor: ApiDoctor;
  compact?: boolean;
}) => {
  const { t } = useTranslation();
  const [bookOpen,    setBookOpen]    = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [initialMode, setInitialMode] = useState<ModalMode>("details");
  const call = useCallStore();

  const [doctor, setDoctor] = useState<ApiDoctor>(doctorProp);

  // Check for a saved (queue) session for this doctor on mount and after modal closes
  const [hasSavedSession, setHasSavedSession] = useState(
    () => !!readConsultSession(doctorProp.id),
  );
  // Whether the user has dismissed the saved-session pill from this card
  const [savedSessionPillDismissed, setSavedSessionPillDismissed] = useState(false);

  // Re-check saved session whenever the modal closes (session may have been cleared inside)
  useEffect(() => {
    if (!modalOpen) {
      setHasSavedSession(!!readConsultSession(doctor.id));
    }
  }, [modalOpen, doctor.id]);

  if (!bookOpen && doctorProp !== doctor && doctorProp.id === doctor.id) {
    setDoctor(doctorProp);
  }

  const handleDoctorUpdated = (updatedDoctor: ApiDoctor) => setDoctor(updatedDoctor);

  const fee      = parseFloat(doctor.consultation_fee);
  const rating   = parseFloat(doctor.rating_avg);
  const feeLabel = fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

  const status: "online" | "busy" | "offline" =
    doctor.is_available && !doctor.bookings_paused
      ? "online"
      : doctor.bookings_paused
      ? "busy"
      : "offline";

  const statusStyles = {
    online:  { dot: "bg-emerald-500", pulse: "animate-pulse", label: "Available",   text: "text-emerald-600",      bg: "bg-emerald-500/10 border-emerald-500/20" },
    busy:    { dot: "bg-amber-500",   pulse: "",              label: "Paused",       text: "text-amber-600",        bg: "bg-amber-500/10 border-amber-500/20" },
    offline: { dot: "bg-zinc-400",    pulse: "",              label: "Unavailable",  text: "text-muted-foreground", bg: "bg-muted border-border" },
  };
  const s = statusStyles[status];

  const callDoctor: Doctor = {
    id: doctor.id,
    user: { id: doctor.user.id, name: doctor.user.name, avatar: doctor.user.avatar },
    specialization: doctor.specialization,
  };

  const isThisDoctor     = call.doctor?.id === doctor.id;
  const isCallInProgress = isThisDoctor && call.phase !== "idle" && call.phase !== "ended";
  const isConnected      = isThisDoctor && call.phase === "connected";

  const canConnect = doctor.is_available && !doctor.bookings_paused && doctor.instant_consultation;
  const canBook    = doctor.is_available && !doctor.bookings_paused;

  // Show live resume pill when a call is running but modal is closed
  const showResumePill = isCallInProgress && !modalOpen && !bookOpen;

  // Show saved-session pill when there's a saved queue session but NO live call
  const showSavedSessionPill =
    hasSavedSession &&
    !isCallInProgress &&
    !modalOpen &&
    !bookOpen &&
    !savedSessionPillDismissed;

  const openDetails = () => {
    setInitialMode("details");
    setModalOpen(true);
  };

  const openConnect = () => {
    if (!canConnect) return;
    if (!isCallInProgress) call.startCall(callDoctor);
    setInitialMode("connect");
    setModalOpen(true);
  };

  /** Open directly to connect mode to surface the resume banner */
  const openResume = () => {
    setInitialMode("connect");
    setModalOpen(true);
  };

  const handleMinimize = () => setModalOpen(false);

  const handleCloseCompletely = () => {
    setModalOpen(false);
    if (isCallInProgress) call.endCall();
  };

  const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;

  return (
    <>
      {/* ── Card ── */}
      <div
        className={cn(
          "relative rounded-sm border border-border bg-card",
          "overflow-hidden transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:-translate-y-px shadow-sm",
          isConnected && "ring-1 ring-emerald-500/30",
          // Subtle violet ring when a saved session is pending
          hasSavedSession && !isCallInProgress && "ring-1 ring-violet-500/25",
        )}
        onClick={openDetails}
      >
        <div className="p-3.5">
          {/* Top row */}
          <div className="flex items-start gap-2.5">
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-sm overflow-hidden border border-border/40">
                <DoctorAvatar doctor={doctor} />
              </div>
              <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card", s.dot, s.pulse)} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <h3 className="text-[12px] font-semibold text-foreground truncate leading-tight">
                      {doctor.user.name}
                    </h3>
                    {doctor.is_featured && (
                      <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-primary font-medium mt-0.5 truncate">
                    {doctor.specialization}
                    {doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
                  </p>
                </div>

                {isConnected ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    In call
                  </span>
                ) : isCallInProgress ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-sky-600 bg-sky-500/10 border-sky-500/20">
                    <span className="h-1 w-1 rounded-full bg-sky-500 animate-pulse shrink-0" />
                    Connecting
                  </span>
                ) : hasSavedSession ? (
                  // Saved-session badge
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-violet-600 bg-violet-500/10 border-violet-500/20">
                    <RotateCcw className="h-2 w-2 shrink-0" />
                    In queue
                  </span>
                ) : (
                  <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0", s.text, s.bg)}>
                    <span className={cn("h-1 w-1 rounded-full shrink-0", s.dot)} />
                    {s.label}
                  </span>
                )}
              </div>

              {locationLabel && (
                <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {locationLabel}
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          {!compact && (
            <div className="mt-2.5 grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
              {[
                {
                  icon: <Star className={cn("h-2.5 w-2.5", rating > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />,
                  top:  rating > 0 ? rating.toFixed(1) : "New",
                  bot:  "rating",
                },
                {
                  icon: <Clock className="h-2.5 w-2.5 text-muted-foreground" />,
                  top:  feeLabel,
                  bot:  "per visit",
                },
                {
                  icon: <BriefcaseMedical className="h-2.5 w-2.5 text-muted-foreground" />,
                  top:  doctor.instant_consultation ? "Instant" : "Scheduled",
                  bot:  "consult",
                },
              ].map(({ icon, top, bot }) => (
                <div key={bot} className="flex flex-col items-center py-1.5 px-1 bg-muted/30">
                  <div className="flex items-center gap-1 mb-0.5">{icon}</div>
                  <span className="text-[11px] font-semibold text-foreground leading-tight">{top}</span>
                  <span className="text-[9px] text-muted-foreground leading-tight">{bot}</span>
                </div>
              ))}
            </div>
          )}

          {!compact && (
            <div className="mt-2 flex items-center justify-between">
              <ConsultBadge type={doctor.consultation_type} />
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50 font-medium">
                View details <ChevronRight className="h-2.5 w-2.5" />
              </span>
            </div>
          )}

          <div className="mt-2.5 border-t border-border" />

          {/* Bottom actions */}
          <div
            className="mt-2.5 flex items-center justify-between gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-600">Call in progress</span>
                </>
              ) : isCallInProgress ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-sky-600">Connecting…</span>
                </>
              ) : hasSavedSession ? (
                <>
                  <RotateCcw className="h-2.5 w-2.5 text-violet-500" />
                  <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">Queue session saved</span>
                </>
              ) : (
                <>
                  <Zap className={cn("h-2.5 w-2.5", doctor.instant_consultation ? "text-emerald-500" : "text-muted-foreground")} />
                  <span className={cn("text-[10px] font-medium", doctor.instant_consultation ? "text-emerald-600" : "text-muted-foreground")}>
                    {doctor.instant_consultation ? "Usually replies in 2 min" : "Replies within 24h"}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={!canBook || isCallInProgress}
                onClick={() => canBook && !isCallInProgress && setBookOpen(true)}
                className="h-6 px-2.5 text-[10px] font-medium rounded-sm border-border"
              >
                {t("pages.cards.book")}
              </Button>

              {/* Saved-session resume button — shown instead of Connect when a session exists */}
              {hasSavedSession && !isCallInProgress ? (
                <Button
                  size="sm"
                  onClick={openResume}
                  className="h-6 px-2.5 text-[10px] font-semibold rounded-sm bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <RotateCcw className="h-2.5 w-2.5 mr-1" />
                  Resume
                </Button>
              ) : canConnect ? (
                <Button
                  size="sm"
                  onClick={
                    showResumePill
                      ? () => { setInitialMode("connect"); setModalOpen(true); }
                      : openConnect
                  }
                  className={cn(
                    "h-6 px-2.5 text-[10px] font-semibold rounded-sm",
                    isConnected
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : isCallInProgress
                      ? "bg-sky-500 hover:bg-sky-600 text-white"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground",
                  )}
                >
                  {isConnected ? (
                    <><Maximize2 className="h-2.5 w-2.5 mr-1" />Resume</>
                  ) : isCallInProgress ? (
                    <><Wifi className="h-2.5 w-2.5 mr-1" />Open</>
                  ) : (
                    <><Wifi className="h-2.5 w-2.5 mr-1" />{t("pages.cards.connect")}</>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                  className="h-6 px-2.5 text-[10px] rounded-sm opacity-50 cursor-not-allowed"
                >
                  {s.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Live-call resume pill ── */}
      {showResumePill && (
        <ResumePill
          doctorName={doctor.user.name}
          phase={call.phase}
          onResume={() => { setInitialMode("connect"); setModalOpen(true); }}
          onEndCompletely={handleCloseCompletely}
        />
      )}

      {/* ── Saved-session pill (no live call, but token is saved) ── */}
      {showSavedSessionPill && (
        <SavedSessionPill
          doctorName={doctor.user.name}
          onResume={openResume}
          onDismiss={() => setSavedSessionPillDismissed(true)}
        />
      )}

      {/* ── Unified modal ── */}
      <UnifiedModal
        doctor={doctor}
        callDoctor={callDoctor}
        initialMode={initialMode}
        open={modalOpen}
        onMinimize={handleMinimize}
        onCloseCompletely={handleCloseCompletely}
        onBook={() => setBookOpen(true)}
        canBook={canBook}
        canConnect={canConnect}
      />

      {/* ── Booking dialog ── */}
      <BookingDialog
        doctor={doctor}
        open={bookOpen}
        onOpenChange={setBookOpen}
        onConfirmed={handleDoctorUpdated}
      />
    </>
  );
};
