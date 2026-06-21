// // import { useState, useEffect, useCallback } from "react";
// // import { Link } from "react-router-dom";
// // import { useTranslation } from "react-i18next";
// // import {
// //   ArrowRight, Stethoscope, ChevronLeft, ChevronRight,
// //   Zap, Wifi, Maximize2,
// // } from "lucide-react";
// // import { Button } from "@/components/ui/button";
// // import { cn } from "@/lib/utils";
// // import { ConnectDialog } from "@/components/ConnectDialog";
// // import { UnifiedModal } from "@/components/DoctorCard";
// // import { useCallStore } from "@/context/CallStore";
// // import type { Doctor } from "@/context/CallStore";

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // type ModalMode = "details" | "connect";

// // interface ApiDoctor {
// //   id: number;
// //   user_id: number;
// //   slug: string;
// //   specialization: string;
// //   doctor_degree: string;
// //   medical_license: string;
// //   designations: string;
// //   bio_en: string;
// //   consultation_fee: string;
// //   currency: string;
// //   is_available: boolean;
// //   instant_consultation: boolean;
// //   bookings_paused: boolean;
// //   consultation_type: "online" | "in_person" | "both";
// //   image: string | null;
// //   preferred_language: string;
// //   city: string | null;
// //   status: "active" | "inactive";
// //   is_active: boolean;
// //   is_featured: boolean;
// //   rating_avg: string;
// //   show_homepage: boolean;
// //   user: { id: number; name: string; avatar: string | null };
// //   hospitals: { id: number; name: string; city?: string }[];
// //   specializations: { id: number; name: string }[];
// // }

// // interface QuickConsultPanelProps {
// //   doctors: ApiDoctor[];
// //   loading: boolean;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const getDoctorImage = (d: ApiDoctor) =>
// //   d.image ??
// //   d.user.avatar ??
// //   `https://ui-avatars.com/api/?name=${encodeURIComponent(d.user.name)}&background=0ea5e9&color=fff&size=600`;

// // const getDoctorName  = (d: ApiDoctor) => d.designations?.trim() || d.user.name;
// // const getDoctorSpecialty = (d: ApiDoctor) =>
// //   d.specializations?.[0]?.name ?? d.specialization ?? "General Practice";

// // const formatFee = (d: ApiDoctor) => {
// //   const fee = parseFloat(d.consultation_fee);
// //   return fee === 0 ? "Free" : `${d.currency} ${fee.toLocaleString()}`;
// // };
// // const formatRating = (d: ApiDoctor) => {
// //   const r = parseFloat(d.rating_avg);
// //   return r > 0 ? r.toFixed(1) : null;
// // };

// // // ─── Skeleton ─────────────────────────────────────────────────────────────────

// // const SliderSkeleton = () => (
// //   <div className="absolute inset-0 bg-muted animate-pulse rounded-sm flex flex-col justify-end p-4 gap-2">
// //     <div className="h-4 w-2/3 rounded bg-muted-foreground/20" />
// //     <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
// //     <div className="h-3 w-1/3 rounded bg-muted-foreground/20" />
// //   </div>
// // );

// // // ─── Slide ────────────────────────────────────────────────────────────────────
// // // Isolated per-slide component so each doctor's call state is independent.

// // function DoctorSlide({
// //   doctor,
// //   active,
// //   index,
// // }: {
// //   doctor: ApiDoctor;
// //   active: boolean;
// //   index: number;
// // }) {
// //   const { t, i18n } = useTranslation();
// //   const call = useCallStore();

// //   const name     = getDoctorName(doctor);
// //   const rating   = formatRating(doctor);
// //   const fee      = formatFee(doctor);

// //   // Matches DoctorCard's CallStore shape
// //   const callDoctor: Doctor = {
// //     id: doctor.id,
// //     user: {
// //       id:     doctor.user.id,
// //       name:   doctor.user.name,
// //       avatar: doctor.user.avatar,
// //     },
// //     specialization: doctor.specialization,
// //   };

// //   // Mirrors DoctorCard exactly
// //   const isThisDoctor     = call.doctor?.id === doctor.id;
// //   const isCallInProgress = isThisDoctor && call.phase !== "idle";
// //   const isConnected      = isThisDoctor && call.phase === "connected";
// //   const isMinimized      = isConnected && call.minimized;

// //   const canConnect = doctor.is_available && !doctor.bookings_paused && doctor.instant_consultation;
// //   const [modalOpen, setModalOpen] = useState(false);
// //   const [initialMode, setInitialMode] = useState<ModalMode>("connect");

// //   const handleConnect = () => {
// //     if (!canConnect) return;
// //     setInitialMode("connect");
// //     setModalOpen(true);
// //   };

// //   const handleMinimize = () => {
// //     if (call.phase !== "idle") {
// //       call.setMinimized(true);
// //     }
// //     setModalOpen(false);
// //   };

// //   const handleCloseCompletely = () => {
// //     setModalOpen(false);
// //     if (isThisDoctor && call.phase !== "idle") {
// //       call.endCallCompletely();
// //     }
// //   };

// //   return (
// //     <>
// //       <div
// //         className={cn(
// //           "absolute inset-0 transition-opacity duration-700",
// //           active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
// //         )}
// //       >
// //         {/* Doctor image */}
// //         <img
// //           src={getDoctorImage(doctor)}
// //           alt={name}
// //           className="w-full h-full object-cover"
// //           loading={index === 0 ? "eager" : "lazy"}
// //           onError={(e) => {
// //             e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff&size=600`;
// //           }}
// //         />

// //         {/* Gradient overlay */}
// //         <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

// //         {/* Instant badge */}
// //         <div className="absolute top-3 left-3 z-10">
// //           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-semibold">
// //             <Zap className="h-2.5 w-2.5" />
// //             Instant
// //           </span>
// //         </div>

// //         {/* In-call overlay badge — mirrors DoctorCard's top-right status */}
// //         {isConnected && (
// //           <div className="absolute top-3 right-3 z-10">
// //             <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold">
// //               <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
// //               In call
// //             </span>
// //           </div>
// //         )}
// //         {!isConnected && isCallInProgress && (
// //           <div className="absolute top-3 right-3 z-10">
// //             <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/90 text-white text-[10px] font-semibold">
// //               <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
// //               Connecting
// //             </span>
// //           </div>
// //         )}

// //         {/* Doctor info + connect button */}
// //         <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between gap-3">
// //           <div className="min-w-0">
// //             <p className="text-white font-semibold text-sm leading-tight truncate">{name}</p>
// //             <p className="text-white/70 text-xs mt-0.5 truncate">{getDoctorSpecialty(doctor)}</p>
// //             <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
// //               {rating && (
// //                 <>
// //                   <span className="text-yellow-400 text-xs">★</span>
// //                   <span className="text-white/80 text-xs">{rating}</span>
// //                   <span className="text-white/30 text-xs">·</span>
// //                 </>
// //               )}
// //               <span className="text-white/80 text-xs font-medium">{fee}</span>
// //               {doctor.city && (
// //                 <>
// //                   <span className="text-white/30 text-xs">·</span>
// //                   <span className="text-white/60 text-xs truncate max-w-[80px]">{doctor.city}</span>
// //                 </>
// //               )}
// //             </div>
// //           </div>

// //           {/* Connect button — mirrors DoctorCard's connect button states */}
// //           <button
// //             onClick={handleConnect}
// //             disabled={!canConnect && !isCallInProgress}
// //             className={cn(
// //               "shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm font-medium whitespace-nowrap transition-opacity",
// //               "disabled:opacity-40 disabled:cursor-not-allowed",
// //               isMinimized
// //                 ? "bg-emerald-500 hover:opacity-90 text-white"
// //                 : isCallInProgress
// //                 ? "bg-sky-500 hover:opacity-90 text-white"
// //                 : "bg-primary hover:opacity-90 text-primary-foreground",
// //             )}
// //           >
// //             {isMinimized ? (
// //               <><Maximize2 className="h-3 w-3" />Resume</>
// //             ) : isCallInProgress ? (
// //               <><Wifi className="h-3 w-3" />Open</>
// //             ) : (
// //               <><Wifi className="h-3 w-3" />{t("pages.landing.connect")}</>
// //             )}
// //           </button>
// //         </div>
// //       </div>

// //       {/* UnifiedModal — opens when they click Connect on the slide */}
// //       <UnifiedModal
// //         doctor={doctor as any}
// //         callDoctor={callDoctor}
// //         initialMode={initialMode}
// //         open={modalOpen}
// //         onMinimize={handleMinimize}
// //         onCloseCompletely={handleCloseCompletely}
// //         onBook={() => {}}
// //         canBook={false}
// //         canConnect={canConnect}
// //       />
// //     </>
// //   );
// // }

// // // ─── Component ────────────────────────────────────────────────────────────────

// // export const QuickConsultPanel = ({ doctors, loading }: QuickConsultPanelProps) => {
// //   const { t, i18n } = useTranslation();
// //   const [activeSlide, setActiveSlide] = useState(0);

// //   useEffect(() => { setActiveSlide(0); }, [doctors.length]);

// //   const prevSlide = useCallback(() => {
// //     if (!doctors.length) return;
// //     setActiveSlide((p) => (p - 1 + doctors.length) % doctors.length);
// //   }, [doctors.length]);

// //   const nextSlide = useCallback(() => {
// //     if (!doctors.length) return;
// //     setActiveSlide((p) => (p + 1) % doctors.length);
// //   }, [doctors.length]);

// //   useEffect(() => {
// //     if (doctors.length <= 1) return;
// //     const timer = setInterval(nextSlide, 4000);
// //     return () => clearInterval(timer);
// //   }, [nextSlide, doctors.length]);

// //   return (
// //     <div className="rounded-sm bg-card dark:bg-secondary/30 border border-border p-6">
// //       {/* Header */}
// //       <div className="flex items-center justify-between mb-5">
// //         <div>
// //           <h3 className="font-display text-base font-semibold text-foreground">
// //             {t("pages.landing.quick_panel_title")}
// //           </h3>
// //           <p className="text-xs text-muted-foreground mt-0.5">
// //             {t("pages.landing.quick_panel_sub")}
// //           </p>
// //         </div>
// //         <span className="px-2.5 py-1 rounded-full bg-success/20 text-success text-xs font-medium flex items-center gap-1.5">
// //           <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
// //           {t("pages.landing.live")}
// //         </span>
// //       </div>

// //       {/* Slider */}
// //       <div className="relative rounded-sm overflow-hidden" style={{ aspectRatio: "4/3" }}>
// //         {loading && <SliderSkeleton />}

// //         {!loading && doctors.length === 0 && (
// //           <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/40 gap-3 p-6 text-center">
// //             <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
// //               <Stethoscope className="h-6 w-6 text-muted-foreground" />
// //             </div>
// //             <div>
// //               <p className="text-sm font-medium text-foreground">No instant doctors available</p>
// //               <p className="text-xs text-muted-foreground mt-1">
// //                 Check back soon or browse all available doctors below
// //               </p>
// //             </div>
// //             <Link to="/patient/search-doctors">
// //               <Button size="sm" variant="outline">
// //                 Browse Doctors <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
// //               </Button>
// //             </Link>
// //           </div>
// //         )}

// //         {/* Each slide is its own component so call state is per-doctor */}
// //         {doctors.map((d, i) => (
// //           <DoctorSlide
// //             key={d.id}
// //             doctor={d}
// //             active={i === activeSlide}
// //             index={i}
// //           />
// //         ))}

// //         {doctors.length > 1 && (
// //           <>
// //             <button
// //               onClick={prevSlide}
// //               aria-label="Previous doctor"
// //               className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-smooth"
// //             >
// //               <ChevronLeft className="w-4 h-4" />
// //             </button>
// //             <button
// //               onClick={nextSlide}
// //               aria-label="Next doctor"
// //               className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-smooth"
// //             >
// //               <ChevronRight className="w-4 h-4" />
// //             </button>
// //           </>
// //         )}

// //         {doctors.length > 1 && (
// //           <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
// //             {doctors.map((_, i) => (
// //               <button
// //                 key={i}
// //                 aria-label={`Go to slide ${i + 1}`}
// //                 onClick={() => setActiveSlide(i)}
// //                 className={cn(
// //                   "h-1.5 rounded-full transition-all duration-300",
// //                   i === activeSlide ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60",
// //                 )}
// //               />
// //             ))}
// //           </div>
// //         )}
// //       </div>

// //       {/* Stats */}
// //       <div className="mt-5 pt-5 border-t border-border grid grid-cols-3 gap-4 text-center">
// //         {[
// //           { v: "4.2m", l: t("pages.landing.avg_wait") },
// //           { v: "147", l: t("pages.landing.online") },
// //           { v: "8.9k", l: t("pages.landing.sessions") },
// //         ].map((s) => (
// //           <div key={s.l}>
// //             <div className="text-base font-display font-bold tabular-nums text-foreground">{s.v}</div>
// //             <div className="text-[11px] text-muted-foreground">{s.l}</div>
// //           </div>
// //         ))}
// //       </div>
// //     </div>
// //   );
// // };

// import { useState, useEffect, useCallback } from "react";
// import { Link } from "react-router-dom";
// import { useTranslation } from "react-i18next";
// import {
//   ArrowRight, Stethoscope, ChevronLeft, ChevronRight,
//   Zap, Wifi, Maximize2, Plus,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";
// import { ConnectDialog } from "@/components/ConnectDialog";
// import { UnifiedModal } from "@/components/DoctorCard";
// import { useCallStore } from "@/context/CallStore";
// import type { Doctor } from "@/context/CallStore";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type ModalMode = "details" | "connect";

// interface ApiDoctor {
//   id: number;
//   user_id: number;
//   slug: string;
//   specialization: string;
//   doctor_degree: string;
//   medical_license: string;
//   designations: string;
//   bio_en: string;
//   consultation_fee: string;
//   currency: string;
//   is_available: boolean;
//   instant_consultation: boolean;
//   bookings_paused: boolean;
//   consultation_type: "online" | "in_person" | "both";
//   image: string | null;
//   preferred_language: string;
//   city: string | null;
//   status: "active" | "inactive";
//   is_active: boolean;
//   is_featured: boolean;
//   rating_avg: string;
//   show_homepage: boolean;
//   user: { id: number; name: string; avatar: string | null };
//   hospitals: { id: number; name: string; city?: string }[];
//   specializations: { id: number; name: string }[];
// }

// interface QuickConsultPanelProps {
//   doctors: ApiDoctor[];
//   loading: boolean;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const getDoctorImage = (d: ApiDoctor) =>
//   d.image ??
//   d.user.avatar ??
//   `https://ui-avatars.com/api/?name=${encodeURIComponent(d.user.name)}&background=0ea5e9&color=fff&size=600`;

// const getDoctorName  = (d: ApiDoctor) => d.designations?.trim() || d.user.name;
// const getDoctorSpecialty = (d: ApiDoctor) =>
//   d.specializations?.[0]?.name ?? d.specialization ?? "General Practice";

// const formatFee = (d: ApiDoctor) => {
//   const fee = parseFloat(d.consultation_fee);
//   return fee === 0 ? "Free" : `${d.currency} ${fee.toLocaleString()}`;
// };
// const formatRating = (d: ApiDoctor) => {
//   const r = parseFloat(d.rating_avg);
//   return r > 0 ? r.toFixed(1) : null;
// };

// // ─── Skeleton ─────────────────────────────────────────────────────────────────

// const SliderSkeleton = () => (
//   <div className="absolute inset-0 bg-muted animate-pulse rounded-2xl flex flex-col justify-end p-4 gap-2">
//     <div className="h-4 w-2/3 rounded bg-muted-foreground/20" />
//     <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
//     <div className="h-3 w-1/3 rounded bg-muted-foreground/20" />
//   </div>
// );

// // ─── Slide ────────────────────────────────────────────────────────────────────
// // Isolated per-slide component so each doctor's call state is independent.

// function DoctorSlide({
//   doctor,
//   active,
//   index,
// }: {
//   doctor: ApiDoctor;
//   active: boolean;
//   index: number;
// }) {
//   const { t, i18n } = useTranslation();
//   const call = useCallStore();

//   const name     = getDoctorName(doctor);
//   const rating   = formatRating(doctor);
//   const fee      = formatFee(doctor);

//   // Matches DoctorCard's CallStore shape
//   const callDoctor: Doctor = {
//     id: doctor.id,
//     user: {
//       id:     doctor.user.id,
//       name:   doctor.user.name,
//       avatar: doctor.user.avatar,
//     },
//     specialization: doctor.specialization,
//   };

//   // Mirrors DoctorCard exactly
//   const isThisDoctor     = call.doctor?.id === doctor.id;
//   const isCallInProgress = isThisDoctor && call.phase !== "idle";
//   const isConnected      = isThisDoctor && call.phase === "connected";
//   const isMinimized      = isConnected && call.minimized;

//   const canConnect = doctor.is_available && !doctor.bookings_paused && doctor.instant_consultation;
//   const [modalOpen, setModalOpen] = useState(false);
//   const [initialMode, setInitialMode] = useState<ModalMode>("connect");

//   const handleConnect = () => {
//     if (!canConnect) return;
//     setInitialMode("connect");
//     setModalOpen(true);
//   };

//   const handleMinimize = () => {
//     if (call.phase !== "idle") {
//       call.setMinimized(true);
//     }
//     setModalOpen(false);
//   };

//   const handleCloseCompletely = () => {
//     setModalOpen(false);
//     if (isThisDoctor && call.phase !== "idle") {
//       call.endCallCompletely();
//     }
//   };

//   return (
//     <>
//       <div
//         className={cn(
//           "absolute inset-0 transition-opacity duration-700",
//           active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
//         )}
//       >
//         {/* Photo — clipped to the rounded frame */}
//         <div className="absolute inset-0 rounded-2xl overflow-hidden">
//           <img
//             src={getDoctorImage(doctor)}
//             alt={name}
//             className="w-full h-full object-cover"
//             loading={index === 0 ? "eager" : "lazy"}
//             onError={(e) => {
//               e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff&size=600`;
//             }}
//           />
//           {/* Soft top scrim so badges stay legible on any photo */}
//           <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
//         </div>

//         {/* Instant badge — white pill with a solid blue icon chip, like the reference's "Regular Check-up" tag */}
//         <div className="absolute top-3 left-3 z-10">
//           <span className="inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full bg-white shadow-md">
//             <span className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
//               <Zap className="h-3 w-3 text-primary-foreground" fill="currentColor" />
//             </span>
//             <span className="text-foreground text-[11px] font-semibold">Instant</span>
//           </span>
//         </div>

//         {/* In-call overlay badge — mirrors DoctorCard's status, restyled as a white pill */}
//         {isConnected && (
//           <div className="absolute top-3 right-3 z-10">
//             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-md text-[11px] font-semibold text-emerald-600">
//               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//               In call
//             </span>
//           </div>
//         )}
//         {!isConnected && isCallInProgress && (
//           <div className="absolute top-3 right-3 z-10">
//             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-md text-[11px] font-semibold text-sky-600">
//               <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
//               Connecting
//             </span>
//           </div>
//         )}

//         {/* Floating doctor card — overlaps the photo like the reference's "John Doe · Book Now" card */}
//         <div className="absolute left-3 right-3 bottom-3 z-20">
//           <div className="rounded-2xl bg-card shadow-[0_10px_30px_-8px_rgba(15,23,42,0.35)] border border-border/60 p-3 flex items-center gap-3">
//             <img
//               src={getDoctorImage(doctor)}
//               alt=""
//               className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
//             />
//             <div className="min-w-0 flex-1">
//               <p className="text-foreground font-semibold text-sm leading-tight truncate">{name}</p>
//               <p className="text-muted-foreground text-xs mt-0.5 truncate">{getDoctorSpecialty(doctor)}</p>
//               <div className="flex items-center gap-1.5 mt-1 flex-wrap">
//                 {rating && (
//                   <>
//                     <span className="text-amber-400 text-xs">★</span>
//                     <span className="text-muted-foreground text-xs">{rating}</span>
//                     <span className="text-border text-xs">·</span>
//                   </>
//                 )}
//                 <span className="text-foreground text-xs font-medium">{fee}</span>
//                 {doctor.city && (
//                   <>
//                     <span className="text-border text-xs">·</span>
//                     <span className="text-muted-foreground text-xs truncate max-w-[80px]">{doctor.city}</span>
//                   </>
//                 )}
//               </div>
//             </div>

//             {/* Connect button — mirrors DoctorCard's connect button states */}
//             <button
//               onClick={handleConnect}
//               disabled={!canConnect && !isCallInProgress}
//               className={cn(
//                 "shrink-0 inline-flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-full font-semibold whitespace-nowrap transition-all",
//                 "shadow-md hover:shadow-lg hover:-translate-y-0.5",
//                 "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none",
//                 isMinimized
//                   ? "bg-emerald-500 hover:bg-emerald-500/90 text-white shadow-emerald-500/30"
//                   : isCallInProgress
//                   ? "bg-sky-500 hover:bg-sky-500/90 text-white shadow-sky-500/30"
//                   : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/30",
//               )}
//             >
//               {isMinimized ? (
//                 <><Maximize2 className="h-3 w-3" />Resume</>
//               ) : isCallInProgress ? (
//                 <><Wifi className="h-3 w-3" />Open</>
//               ) : (
//                 <><Wifi className="h-3 w-3" />{t("pages.landing.connect")}</>
//               )}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* UnifiedModal — opens when they click Connect on the slide */}
//       <UnifiedModal
//         doctor={doctor as any}
//         callDoctor={callDoctor}
//         initialMode={initialMode}
//         open={modalOpen}
//         onMinimize={handleMinimize}
//         onCloseCompletely={handleCloseCompletely}
//         onBook={() => {}}
//         canBook={false}
//         canConnect={canConnect}
//       />
//     </>
//   );
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export const QuickConsultPanel = ({ doctors, loading }: QuickConsultPanelProps) => {
//   const { t, i18n } = useTranslation();
//   const [activeSlide, setActiveSlide] = useState(0);

//   useEffect(() => { setActiveSlide(0); }, [doctors.length]);

//   const prevSlide = useCallback(() => {
//     if (!doctors.length) return;
//     setActiveSlide((p) => (p - 1 + doctors.length) % doctors.length);
//   }, [doctors.length]);

//   const nextSlide = useCallback(() => {
//     if (!doctors.length) return;
//     setActiveSlide((p) => (p + 1) % doctors.length);
//   }, [doctors.length]);

//   useEffect(() => {
//     if (doctors.length <= 1) return;
//     const timer = setInterval(nextSlide, 4000);
//     return () => clearInterval(timer);
//   }, [nextSlide, doctors.length]);

//   return (
//     <div className="relative rounded-3xl bg-card border border-border/60 p-6 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.08)] overflow-hidden">
//       {/* Decorative accent, echoes the blue "+" motif from the brand banner */}
//       <Plus className="absolute -top-3 -right-3 h-20 w-20 text-primary/[0.06] pointer-events-none" strokeWidth={3} />

//       {/* Header */}
//       <div className="relative flex items-center justify-between mb-5">
//         <div className="flex items-center gap-2">
//           <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
//             <Plus className="h-4 w-4 text-primary" strokeWidth={3} />
//           </span>
//           <div>
//             <h3 className="font-display text-base font-semibold text-foreground">
//               {t("pages.landing.quick_panel_title")}
//             </h3>
//             <p className="text-xs text-muted-foreground mt-0.5">
//               {t("pages.landing.quick_panel_sub")}
//             </p>
//           </div>
//         </div>
//         <span className="px-3 py-1.5 rounded-full bg-success/15 text-success text-xs font-semibold flex items-center gap-1.5 shrink-0">
//           <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
//           {t("pages.landing.live")}
//         </span>
//       </div>

//       {/* Slide-position dots, sit above the photo so the floating card stays clean */}
//       {!loading && doctors.length > 1 && (
//         <div className="relative flex items-center justify-center gap-1.5 mb-3">
//           {doctors.map((_, i) => (
//             <button
//               key={i}
//               aria-label={`Go to slide ${i + 1}`}
//               onClick={() => setActiveSlide(i)}
//               className={cn(
//                 "h-1.5 rounded-full transition-all duration-300",
//                 i === activeSlide ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-primary/40",
//               )}
//             />
//           ))}
//         </div>
//       )}

//       {/* Slider — soft blue glow behind the frame, like the circular backdrop in the banner */}
//       <div className="relative">
//         <div className="absolute -inset-2 bg-gradient-to-br from-primary/25 via-sky-300/15 to-transparent rounded-[1.75rem] blur-xl -z-10" />

//         <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
//           {loading && <SliderSkeleton />}

//           {!loading && doctors.length === 0 && (
//             <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/40 gap-3 p-6 text-center rounded-2xl">
//               <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
//                 <Stethoscope className="h-6 w-6 text-primary" />
//               </div>
//               <div>
//                 <p className="text-sm font-medium text-foreground">No instant doctors available</p>
//                 <p className="text-xs text-muted-foreground mt-1">
//                   Check back soon or browse all available doctors below
//                 </p>
//               </div>
//               <Link to="/patient/search-doctors">
//                 <Button size="sm" className="rounded-full">
//                   Browse Doctors <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
//                 </Button>
//               </Link>
//             </div>
//           )}

//           {/* Each slide is its own component so call state is per-doctor */}
//           {doctors.map((d, i) => (
//             <DoctorSlide
//               key={d.id}
//               doctor={d}
//               active={i === activeSlide}
//               index={i}
//             />
//           ))}

//           {doctors.length > 1 && (
//             <>
//               <button
//                 onClick={prevSlide}
//                 aria-label="Previous doctor"
//                 className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white shadow-md hover:shadow-lg text-foreground flex items-center justify-center transition-all hover:-translate-x-0.5"
//               >
//                 <ChevronLeft className="w-4 h-4" />
//               </button>
//               <button
//                 onClick={nextSlide}
//                 aria-label="Next doctor"
//                 className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white shadow-md hover:shadow-lg text-foreground flex items-center justify-center transition-all hover:translate-x-0.5"
//               >
//                 <ChevronRight className="w-4 h-4" />
//               </button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* Stats */}
//       <div className="relative mt-5 pt-5 border-t border-border grid grid-cols-3 gap-3 text-center">
//         {[
//           { v: "4.2m", l: t("pages.landing.avg_wait") },
//           { v: "147", l: t("pages.landing.online") },
//           { v: "8.9k", l: t("pages.landing.sessions") },
//         ].map((s) => (
//           <div key={s.l} className="rounded-xl bg-muted/40 py-2.5">
//             <div className="text-base font-display font-bold tabular-nums text-foreground">{s.v}</div>
//             <div className="text-[11px] text-muted-foreground">{s.l}</div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };



import { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import docJohn from "@/assets/doctor-hero.png";
import docSarah from "@/assets/doc-john.png";
import docMike from "@/assets/doc-david.png";
import docEmma from "@/assets/doc-sarah.png";
import docDavid from "@/assets/doctor-hero.png";
import { HeroHeader } from "@/components/landing/HeroHeader";
import HeroCta from "@/components/landing/HeroCta";
import StartConsult from "@/components/landing/StartConsult";
import { useGetSearchDoctors } from "@/hooks/patient/use-patient-doctor";

// ─── Constants ────────────────────────────────────────────────────────────────

const mockDoctors = [
  {
    name: "Dr. John Doe",
    role: "MBBS, Cardiologist",
    exp: "12k+",
    img: docJohn,
    hero: docJohn,
  },
  {
    name: "Dr. Sarah Lee",
    role: "Neurologist",
    exp: "8k+",
    img: docSarah,
    hero: docSarah,
  },
  {
    name: "Dr. Mike Ross",
    role: "Dentist",
    exp: "15k+",
    img: docMike,
    hero: docMike,
  },
  {
    name: "Dr. Emma Wilson",
    role: "Pediatrician",
    exp: "10k+",
    img: docEmma,
    hero: docEmma,
  },
  {
    name: "Dr. David Kim",
    role: "Orthopedic",
    exp: "6k+",
    img: docDavid,
    hero: docDavid,
  },
];

// ─── MeetOurDoctorsSlider ─────────────────────────────────────────────────────

interface SliderProps {
  index: number;
  setIndex: (n: number) => void;
  setPaused: (p: boolean) => void;
  className?: string;
}

function MeetOurDoctorsSlider({
  index,
  setIndex,
  setPaused,
  className = "",
}: SliderProps) {
  const prev = () => {
    setPaused(true);
    setIndex((index - 1 + mockDoctors.length) % mockDoctors.length);
  };
  const next = () => {
    setPaused(true);
    setIndex((index + 1) % mockDoctors.length);
  };
  const doc = mockDoctors[index];

  return (
    <div
      className={`bg-card rounded-xl p-3 sm:p-4 border border-border ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="font-bold text-foreground text-xs sm:text-sm">
          Meet Our Doctors
        </div>
        <div className="flex gap-1">
          <button
            onClick={prev}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-smooth grid place-items-center"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={next}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-smooth grid place-items-center"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
        <img
          src={doc.img}
          alt={doc.name}
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-card shrink-0"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="font-bold text-foreground text-xs sm:text-sm truncate">
            {doc.name}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {doc.role}
          </div>
        </div>
        <div className="ml-auto w-8 h-8 sm:w-10 sm:h-10 rounded-full text-primary-foreground text-[9px] sm:text-[10px] font-bold grid place-items-center shrink-0 bg-gradient-primary">
          {doc.exp}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-2 sm:mt-3">
        {mockDoctors.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setPaused(true);
              setIndex(i);
            }}
            aria-label={`Show doctor ${i + 1}`}
            className={`h-1.5 rounded-full transition-smooth ${
              i === index ? "bg-primary w-4" : "bg-muted-foreground/20 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── HeroSection ──────────────────────────────────────────────────────────────

export default function HeroSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useGetSearchDoctors();
  
  console.log("useGetSearchDoctors",data);

  const activeDoc = mockDoctors[activeIdx];

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(
      () => setActiveIdx((p) => (p + 1) % mockDoctors.length),
      2000,
    );
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Subtle diagonal lines background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, hsl(var(--accent)) 0 1px, transparent 1px 22px)",
        }}
      />

      <div className="relative pt-4 sm:pt-7">
        <HeroHeader
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* ── Hero ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center px-5 py-8 sm:px-6 md:px-8 lg:p-10 relative">
          {/* Left column */}
          <div className="relative z-10 order-2 lg:order-1">
            <h1 className="text-3xl sm:text-4xl md:text-[42px] lg:text-[50px] leading-[1.1] lg:leading-[1.05] font-extrabold text-foreground tracking-tight text-center lg:text-left">
              Consult <span className="text-primary">Best Doctors</span>{" "}
              <br className="hidden sm:block" /> Your Nearby Location
            </h1>
            <p className="mt-4 sm:mt-6 text-sm sm:text-[15px] text-muted-foreground font-medium text-center lg:text-left">
              Embark on your healing journey with MediConnect
            </p>

            {/* Decorative medical illustration — hidden on mobile to avoid clutter */}
            <div className="hidden sm:flex justify-between py-8 lg:py-10 items-center w-full">
              {/* Stethoscope icon */}
              <svg
                width="44"
                height="50"
                viewBox="0 0 140 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="lg:w-[52px] lg:h-[60px]"
              >
                <style>{`
      .bob { animation: bob 2.4s ease-in-out infinite; }
      @keyframes bob { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-4px); } }
    `}</style>
                <g className="bob">
                  <line
                    x1="50"
                    y1="38"
                    x2="35"
                    y2="58"
                    stroke="#18B19A"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="80"
                    y1="38"
                    x2="95"
                    y2="58"
                    stroke="#18B19A"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                  <circle cx="33" cy="60" r="5.5" fill="#18B19A" />
                  <circle cx="97" cy="60" r="5.5" fill="#18B19A" />
                  <path
                    d="M35 40 Q65 28 95 40"
                    stroke="#18B19A"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M65 40 C65 68, 45 82, 40 102 C34 122, 48 140, 68 140 C88 140, 102 122, 102 105"
                    stroke="#18B19A"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="102"
                    cy="118"
                    r="22"
                    stroke="#18B19A"
                    strokeWidth="5"
                  />
                  <circle
                    cx="102"
                    cy="118"
                    r="10"
                    fill="#18B19A"
                    opacity="0.18"
                  />
                  <circle cx="102" cy="118" r="4" fill="#18B19A" />
                </g>
              </svg>

              {/* ECG line — fills remaining space */}
              <svg
                width="100%"
                height="50"
                viewBox="0 0 400 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="flex-1 ml-4 lg:ml-6 lg:h-[60px]"
              >
                <style>{`
      .pulse-line { animation: dash 2.4s linear infinite; }
      @keyframes dash { from { stroke-dashoffset: 120; } to { stroke-dashoffset: 0; } }
    `}</style>
                <defs>
                  <marker
                    id="ecg-arr"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M2 1L8 5L2 9"
                      fill="none"
                      stroke="#18B19A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </marker>
                </defs>
                <line
                  x1="0"
                  y1="80"
                  x2="400"
                  y2="80"
                  stroke="#ffff"
                  strokeWidth="1.5"
                  opacity="0.15"
                />
                <path
                  stroke="#ffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M0 80 L35 80 L48 58 L55 104 L63 44 L71 112 L80 80
         L130 80 L143 58 L150 104 L158 44 L166 112 L175 80
         L225 80 L238 58 L245 104 L253 44 L261 112 L270 80 L390 80"
                />
                <path
                  className="pulse-line"
                  stroke="#18B19A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="8 4"
                  opacity="0.55"
                  d="M0 80 L35 80 L48 58 L55 104 L63 44 L71 112 L80 80
         L130 80 L143 58 L150 104 L158 44 L166 112 L175 80
         L225 80 L238 58 L245 104 L253 44 L261 112 L270 80 L390 80"
                />
                <line
                  x1="386"
                  y1="80"
                  x2="398"
                  y2="80"
                  stroke="#ffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  markerEnd="url(#ecg-arr)"
                />
                <circle cx="63" cy="44" r="3.5" fill="#ffff" opacity="0.7" />
                <circle cx="158" cy="44" r="3.5" fill="#ffff" opacity="0.7" />
                <circle cx="253" cy="44" r="3.5" fill="#ffff" opacity="0.7" />
              </svg>
            </div>

            <div className="mt-6 sm:mt-0 flex items-center justify-center lg:justify-start gap-6">
              <StartConsult />
            </div>

            {/* Search bar */}
            <div
              className="mt-6 sm:mt-8 bg-card rounded-[6px] p-2 flex flex-col sm:flex-row items-stretch sm:items-center
                         gap-2 border border-border"
            >
              <div className="flex items-center gap-3 px-3 sm:px-4 flex-1">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground text-foreground"
                  placeholder="Search doctors, clinics, hospitals, etc"
                />
              </div>
              <div className="hidden sm:block w-px h-7 bg-border" />
              <div className="flex items-center gap-3 px-3 sm:px-4 flex-1">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground text-foreground"
                  placeholder="Date"
                />
              </div>
              <button className="text-primary-foreground font-semibold rounded-[6px] px-6 py-3 text-sm bg-gradient-primary w-full sm:w-auto">
                Search
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="order-1 lg:order-2 w-full max-w-[360px] sm:max-w-[440px] md:max-w-[500px] mx-auto lg:max-w-none">
            {/* Visual block: circle, doctor image, badge, card — its own height, never grows past it */}
            <div className="relative h-[300px] sm:h-[400px] md:h-[470px] lg:h-[640px]">
              {/* Floating plus icons — desktop only, avoids overlap on small screens */}
              <div className="hidden lg:block absolute left-0 top-10 text-primary/80">
                <Plus className="w-10 h-10" strokeWidth={3} />
                <Plus className="w-7 h-7 -mt-2 ml-7" strokeWidth={3} />
              </div>

              {/* Teal circle backdrop */}
              <div
                className="absolute right-0 top-0 rounded-full overflow-hidden bg-gradient-primary
                           w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] md:w-[360px] md:h-[360px] lg:w-[520px] lg:h-[520px]"
              >
                <div className="absolute inset-3 sm:inset-5 rounded-full border border-primary-foreground/30" />
                <div className="absolute inset-8 sm:inset-12 rounded-full border border-primary-foreground/20" />
              </div>

              {/* Active doctor image */}
              <div
                className="absolute rounded-full overflow-hidden
                           right-[8px] top-[8px] w-[200px] h-[200px]
                           sm:right-[16px] sm:top-[16px] sm:w-[270px] sm:h-[270px]
                           md:w-[330px] md:h-[330px]
                           lg:w-[480px] lg:h-[480px]"
              >
                <img
                  key={activeDoc.name}
                  src={activeDoc.hero}
                  alt={activeDoc.name}
                  className="w-full h-full object-contain object-bottom transition-opacity duration-500 animate-in fade-in scale-110"
                />
              </div>

              {/* Regular Check-up badge */}
              <div
                className="absolute left-0 bg-card rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-3 flex items-center gap-1.5 sm:gap-3 border border-border
                           top-[95px] sm:top-[150px] md:top-[180px] lg:top-[280px]"
              >
                <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md grid place-items-center text-primary-foreground bg-gradient-primary shrink-0">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />
                </div>
                <span className="font-semibold text-foreground text-[10px] sm:text-sm whitespace-nowrap">
                  Regular Check-up
                </span>
              </div>

              {/* Active doctor card */}
              <div
                className="absolute bg-card rounded-xl p-2.5 sm:p-4 text-center border border-border
                           right-[-4px] top-[120px] w-[110px]
                           sm:right-[-10px] sm:top-[165px] sm:w-[150px]
                           md:right-[-15px] md:top-[195px] md:w-[160px]
                           lg:right-[-30px] lg:top-[210px] lg:w-[180px]"
              >
                <img
                  src={activeDoc.img}
                  alt={activeDoc.name}
                  className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full mx-auto object-cover ring-4 ring-card"
                  loading="lazy"
                />
                <div className="mt-1.5 sm:mt-2 font-bold text-foreground text-[11px] sm:text-sm truncate">
                  {activeDoc.name}
                </div>
                <div className="text-[9px] sm:text-xs text-muted-foreground truncate">
                  {activeDoc.role}
                </div>
                <button
                  onClick={() => setPaused(true)}
                  className="mt-1.5 sm:mt-3 w-full bg-primary text-secondary text-[9px] sm:text-xs font-semibold rounded-[6px] py-1 sm:py-2 hover:bg-primary hover:text-primary-foreground transition-smooth"
                >
                  Book Now
                </button>
              </div>

              {/* Meet Our Doctors slider — desktop only here, floats over the circle's corner */}
              <MeetOurDoctorsSlider
                index={activeIdx}
                setIndex={setActiveIdx}
                setPaused={setPaused}
                className="hidden lg:block absolute right-2 bottom-2 w-[260px]"
              />
            </div>

            {/* Meet Our Doctors slider — mobile/tablet, sits below the visual in normal flow */}
            <MeetOurDoctorsSlider
              index={activeIdx}
              setIndex={setActiveIdx}
              setPaused={setPaused}
              className="lg:hidden mt-4 w-full sm:w-[300px] mx-auto"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
