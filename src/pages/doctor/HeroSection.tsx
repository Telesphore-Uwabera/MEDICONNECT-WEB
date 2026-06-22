// import { useState, useEffect, useRef } from "react";
// import {
//   Search,
//   Calendar,
//   Check,
//   Plus,
//   ChevronLeft,
//   ChevronRight,
//   X,
//   Wifi
// } from "lucide-react";

// import doctorPlaceholder from "@/assets/doctor-hero.png";
// import { HeroHeader } from "@/components/landing/HeroHeader";
// import StartConsult from "@/components/landing/StartConsult";
// import { useGetSearchDoctors } from "@/hooks/patient/use-patient-doctor";

// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";
// import { ConnectDialog } from "@/components/ConnectDialog";
// import { useCallStore } from "@/context/CallStore";
// import type { Doctor } from "@/context/CallStore";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface ApiDoctor {
//   id: number;
//   specialization: string;
//   doctor_degree: string;
//   designations: string;
//   consultation_fee: string;
//   currency: string;
//   instant_consultation: boolean;
//   image: string | null;
//   rating_avg: string;
//   user: {
//     id: number;
//     name: string;
//     avatar: string | null;
//   };
// }

// interface DisplayDoctor {
//   id: number;
//   name: string;
//   role: string;
//   image: string;
//   fee: string;
//   currency: string;
//   instant: boolean;
// }

// function toDisplayDoctor(doc: ApiDoctor): DisplayDoctor {
//   return {
//     id: doc.id,
//     name: doc.user?.name || doc.designations || "Doctor",
//     role: doc.specialization || doc.doctor_degree || "General Practitioner",
//     image: doc.image || doc.user?.avatar || doctorPlaceholder,
//     fee: doc.consultation_fee,
//     currency: doc.currency,
//     instant: doc.instant_consultation,
//   };
// }

// // ─── Date Picker ──────────────────────────────────────────────────────────────

// function DatePicker({
//   value,
//   onChange,
// }: {
//   value: string;
//   onChange: (v: string) => void;
// }) {
//   const [open, setOpen] = useState(false);
//   const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
//   const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
//   const ref = useRef<HTMLDivElement>(null);

//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   useEffect(() => {
//     const handler = (e: MouseEvent) => {
//       if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
//   const firstDay = new Date(viewYear, viewMonth, 1).getDay();

//   const monthNames = [
//     "January","February","March","April","May","June",
//     "July","August","September","October","November","December",
//   ];

//   const prevMonth = () => {
//     if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
//     else setViewMonth((m) => m - 1);
//   };
//   const nextMonth = () => {
//     if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
//     else setViewMonth((m) => m + 1);
//   };

//   const selectDay = (day: number) => {
//     const d = new Date(viewYear, viewMonth, day);
//     const iso = d.toISOString().split("T")[0];
//     onChange(iso);
//     setOpen(false);
//   };

//   const displayValue = value
//     ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
//     : "";

//   const clear = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     onChange("");
//   };

//   return (
//     <div ref={ref} className="relative w-full">
//       <div
//         onClick={() => setOpen((o) => !o)}
//         className="flex items-center gap-2 cursor-pointer w-full"
//       >
//         <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
//         <span className={`text-sm flex-1 ${value ? "text-foreground" : "text-muted-foreground"}`}>
//           {displayValue || "Select date"}
//         </span>
//         {value && (
//           <button
//             onClick={clear}
//             className="text-muted-foreground hover:text-foreground transition-colors"
//           >
//             <X className="w-3.5 h-3.5" />
//           </button>
//         )}
//       </div>
//     {open && (
//         <div className="fixed z-[9999] bg-card border border-border rounded-[6px] shadow-xl p-3 w-[min(260px,90vw)]"
//           style={{
//             bottom: (() => {
//               const el = ref.current;
//               if (!el) return "auto";
//               const rect = el.getBoundingClientRect();
//               return `${window.innerHeight - rect.top + 8}px`;
//             })(),
//             left: (() => {
//               const el = ref.current;
//               if (!el) return 0;
//               const rect = el.getBoundingClientRect();
//               const left = rect.left;
//               const maxLeft = window.innerWidth - Math.min(260, window.innerWidth * 0.9) - 8;
//               return `${Math.min(Math.max(8, left), maxLeft)}px`;
//             })(),
//           }}
//         >
//           {/* Month nav */}
//           <div className="flex items-center justify-between mb-2">
//             <button
//               onClick={prevMonth}
//               className="w-6 h-6 rounded-[4px] hover:bg-muted flex items-center justify-center transition-colors"
//             >
//               <ChevronLeft className="w-3.5 h-3.5" />
//             </button>
//             <span className="text-xs font-semibold text-foreground">
//               {monthNames[viewMonth]} {viewYear}
//             </span>
//             <button
//               onClick={nextMonth}
//               className="w-6 h-6 rounded-[4px] hover:bg-muted flex items-center justify-center transition-colors"
//             >
//               <ChevronRight className="w-3.5 h-3.5" />
//             </button>
//           </div>

//           {/* Day headers */}
//           <div className="grid grid-cols-7 mb-1">
//             {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
//               <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
//                 {d}
//               </div>
//             ))}
//           </div>

//           {/* Days */}
//           <div className="grid grid-cols-7 gap-y-0.5">
//             {Array.from({ length: firstDay }).map((_, i) => (
//               <div key={`e-${i}`} />
//             ))}
//             {Array.from({ length: daysInMonth }).map((_, i) => {
//               const day = i + 1;
//               const date = new Date(viewYear, viewMonth, day);
//               date.setHours(0, 0, 0, 0);
//               const isPast = date < today;
//               const isSelected =
//                 value === `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
//               const isToday =
//                 date.getTime() === today.getTime();

//               return (
//                 <button
//                   key={day}
//                   onClick={() => !isPast && selectDay(day)}
//                   disabled={isPast}
//                   className={`
//                     h-7 w-full rounded-[4px] text-xs font-medium transition-colors
//                     ${isSelected ? "bg-primary text-primary-foreground" : ""}
//                     ${!isSelected && isToday ? "border border-primary text-primary" : ""}
//                     ${!isSelected && !isPast ? "hover:bg-muted text-foreground" : ""}
//                     ${isPast ? "text-muted-foreground/40 cursor-not-allowed" : "cursor-pointer"}
//                   `}
//                 >
//                   {day}
//                 </button>
//               );
//             })}
//           </div>

//           {/* Today shortcut */}
//           <div className="mt-2 pt-2 border-t border-border">
//             <button
//               onClick={() => selectDay(today.getDate())}
//               className="w-full text-xs text-primary font-medium hover:underline"
//             >
//               Today
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── MeetOurDoctorsSlider ─────────────────────────────────────────────────────

// interface SliderProps {
//   doctors: DisplayDoctor[];
//   totalDoctors: number;
//   index: number;
//   setIndex: (n: number) => void;
//   setPaused: (p: boolean) => void;
//   className?: string;
// }

// function MeetOurDoctorsSlider({
//   doctors,
//   totalDoctors,
//   index,
//   setIndex,
//   setPaused,
//   className = "",
// }: SliderProps) {
//   if (doctors.length === 0) return null;

//   const safeIndex = index % doctors.length;
//   const doc = doctors[safeIndex];

//   const prev = () => {
//     setPaused(true);
//     setIndex((safeIndex - 1 + doctors.length) % doctors.length);
//   };
//   const next = () => {
//     setPaused(true);
//     setIndex((safeIndex + 1) % doctors.length);
//   };

//   return (
//     <div className={`bg-card rounded-[8px] p-3 sm:p-4 border border-border ${className}`}>
//       <div className="flex items-center justify-between">
//         <div className="font-bold text-foreground text-xs sm:text-sm">Meet Our Doctors</div>
//         <div className="flex gap-1">
//           <button
//             onClick={prev}
//             className="w-6 h-6 rounded-[4px] bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors grid place-items-center"
//           >
//             <ChevronLeft className="w-3 h-3" />
//           </button>
//           <button
//             onClick={next}
//             className="w-6 h-6 rounded-[4px] bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors grid place-items-center"
//           >
//             <ChevronRight className="w-3 h-3" />
//           </button>
//         </div>
//       </div>

//       <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
//         <img
//           src={doc.image}
//           alt={doc.name}
//           className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-card shrink-0"
//           loading="lazy"
//           onError={(e) => { (e.target as HTMLImageElement).src = doctorPlaceholder; }}
//         />
//         <div className="min-w-0 flex-1">
//           <div className="font-bold text-foreground text-xs sm:text-sm truncate">{doc.name}</div>
//           <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{doc.role}</div>
//         </div>
//         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-primary-foreground text-[9px] sm:text-[10px] font-bold grid place-items-center shrink-0 bg-gradient-primary">
//           {totalDoctors}+
//         </div>
//       </div>

//       <div className="flex justify-center gap-1.5 mt-2 sm:mt-3">
//         {doctors.map((_, i) => (
//           <button
//             key={i}
//             onClick={() => { setPaused(true); setIndex(i); }}
//             aria-label={`Show doctor ${i + 1}`}
//             className={`h-1.5 rounded-full transition-all duration-300 ${
//               i === safeIndex ? "bg-primary w-4" : "bg-muted-foreground/20 w-1.5"
//             }`}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─── HeroSection ──────────────────────────────────────────────────────────────

// export default function HeroSection() {
//   const [activeIdx, setActiveIdx] = useState(0);
//   const [paused, setPaused] = useState(false);
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
//   const [searchValue, setSearchValue] = useState("");
//   const [selectedDate, setSelectedDate] = useState("");

//   const { data: instantDoctorsData, isLoading: doctorsLoading } =
//     useGetSearchDoctors({ instant: true, page: 1, per_page: 6 });

//   const doctors: DisplayDoctor[] = (instantDoctorsData?.data ?? []).map(toDisplayDoctor);
//   const hasDoctors = doctors.length > 0;
//   const activeDoc = hasDoctors ? doctors[activeIdx % doctors.length] : null;

//   // Adjust this to match whatever pagination field your API actually returns
//   // (e.g. response.total, response.meta.total, response.pagination.total).
//   const totalDoctors: number =
//     (instantDoctorsData as any)?.total ??
//     (instantDoctorsData as any)?.meta?.total ??
//     (instantDoctorsData as any)?.pagination?.total ??
//     doctors.length;

//   useEffect(() => {
//     if (paused || !hasDoctors) return;
//     const timer = setInterval(
//       () => setActiveIdx((p) => (p + 1) % doctors.length),
//       2000,
//     );
//     return () => clearInterval(timer);
//   }, [paused, hasDoctors, doctors.length]);

//   return (
//     <div className="min-h-screen bg-background overflow-x-hidden relative">
//       {/* Subtle diagonal lines background */}
//       <div
//         className="absolute inset-0 pointer-events-none opacity-[0.35]"
//         style={{
//           backgroundImage:
//             "repeating-linear-gradient(135deg, hsl(var(--accent)) 0 1px, transparent 1px 22px)",
//         }}
//       />

//       <div className="relative pt-4 sm:pt-7">
//         <HeroHeader
//           mobileMenuOpen={mobileMenuOpen}
//           setMobileMenuOpen={setMobileMenuOpen}
//         />

//         {/* ── Hero ── */}
//         <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:p-10 relative">

//           {/* ── Left column ── */}
//           <div className="relative z-10 order-2 lg:order-1">
//       <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-[36px] lg:text-[42px] xl:text-[46px] leading-[1.2] font-extrabold text-foreground tracking-tight text-center lg:text-left">
//               Book a{" "}
//               <span className="text-primary">Doctor Consultation</span>
//               <br className="hidden sm:block" />
//               <span className="mt-2 block">Anytime, Anywhere</span>
//             </h1>
//             <p className="mt-3 sm:mt-5 text-sm sm:text-[15px] text-muted-foreground font-medium text-center lg:text-left max-w-md mx-auto lg:mx-0">
//               Embark on your healing journey with MEDICONNECT
//             </p>

//             {/* Decorative medical illustration — tablet+ only */}
//             <div className="hidden sm:flex justify-between py-6 lg:py-8 items-center w-full">
//               {/* Stethoscope icon */}
//               <svg
//                 width="44"
//                 height="50"
//                 viewBox="0 0 140 160"
//                 fill="none"
//                 xmlns="http://www.w3.org/2000/svg"
//                 aria-hidden="true"
//                 className="lg:w-[52px] lg:h-[60px] shrink-0"
//               >
//                 <style>{`
//                   .bob { animation: bob 2.4s ease-in-out infinite; }
//                   @keyframes bob { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-4px); } }
//                 `}</style>
//                 <g className="bob">
//                   <line x1="50" y1="38" x2="35" y2="58" stroke="#18B19A" strokeWidth="4.5" strokeLinecap="round" />
//                   <line x1="80" y1="38" x2="95" y2="58" stroke="#18B19A" strokeWidth="4.5" strokeLinecap="round" />
//                   <circle cx="33" cy="60" r="5.5" fill="#18B19A" />
//                   <circle cx="97" cy="60" r="5.5" fill="#18B19A" />
//                   <path d="M35 40 Q65 28 95 40" stroke="#18B19A" strokeWidth="4.5" strokeLinecap="round" />
//                   <path d="M65 40 C65 68, 45 82, 40 102 C34 122, 48 140, 68 140 C88 140, 102 122, 102 105" stroke="#18B19A" strokeWidth="5" strokeLinecap="round" />
//                   <circle cx="102" cy="118" r="22" stroke="#18B19A" strokeWidth="5" />
//                   <circle cx="102" cy="118" r="10" fill="#18B19A" opacity="0.18" />
//                   <circle cx="102" cy="118" r="4" fill="#18B19A" />
//                 </g>
//               </svg>

//               {/* ECG line */}
//               <svg
//                 width="100%"
//                 height="50"
//                 viewBox="0 0 400 160"
//                 fill="none"
//                 xmlns="http://www.w3.org/2000/svg"
//                 aria-hidden="true"
//                 className="flex-1 ml-4 lg:ml-6 lg:h-[60px]"
//               >
//                 <style>{`
//                   .pulse-line { animation: dash 2.4s linear infinite; }
//                   @keyframes dash { from { stroke-dashoffset: 120; } to { stroke-dashoffset: 0; } }
//                 `}</style>
//                 <defs>
//                   <marker id="ecg-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
//                     <path d="M2 1L8 5L2 9" fill="none" stroke="#18B19A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//                   </marker>
//                 </defs>
//                 <line x1="0" y1="80" x2="400" y2="80" stroke="#ffff" strokeWidth="1.5" opacity="0.15" />
//                 <path
//                   stroke="#ffff"
//                   strokeWidth="2.5"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   d="M0 80 L35 80 L48 58 L55 104 L63 44 L71 112 L80 80
//                      L130 80 L143 58 L150 104 L158 44 L166 112 L175 80
//                      L225 80 L238 58 L245 104 L253 44 L261 112 L270 80 L390 80"
//                 />
//                 <path
//                   className="pulse-line"
//                   stroke="#18B19A"
//                   strokeWidth="2.5"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeDasharray="8 4"
//                   opacity="0.55"
//                   d="M0 80 L35 80 L48 58 L55 104 L63 44 L71 112 L80 80
//                      L130 80 L143 58 L150 104 L158 44 L166 112 L175 80
//                      L225 80 L238 58 L245 104 L253 44 L261 112 L270 80 L390 80"
//                 />
//                 <line x1="386" y1="80" x2="398" y2="80" stroke="#ffff" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#ecg-arr)" />
//                 <circle cx="63" cy="44" r="3.5" fill="#ffff" opacity="0.7" />
//                 <circle cx="158" cy="44" r="3.5" fill="#ffff" opacity="0.7" />
//                 <circle cx="253" cy="44" r="3.5" fill="#ffff" opacity="0.7" />
//               </svg>
//             </div>


//               <StartConsult />


// {/* ── Search bar ── */}
//             <div className="mt-5 sm:mt-7 bg-card rounded-[6px] border border-border overflow-visible">
//               <div className="flex items-center gap-0">
//                 {/* Search input */}
//                 <div className="flex items-center gap-2.5 px-3 py-2.5 flex-1 min-w-0">
//                   <Search className="w-4 h-4 text-muted-foreground shrink-0" />
//                   <input
//                     value={searchValue}
//                     onChange={(e) => setSearchValue(e.target.value)}
//                     className="bg-transparent outline-none text-xs sm:text-sm w-full placeholder:text-muted-foreground text-foreground min-w-0"
//                     placeholder="Search doctors…"
//                   />
//                 </div>

//                 {/* Divider */}
//                 <div className="w-px self-stretch bg-border my-2 shrink-0" />

//                 {/* Date picker */}
//                 <div className="flex items-center gap-2.5 px-3 py-2.5 w-[140px] sm:w-[175px] shrink-0 relative z-10">
//                   <DatePicker value={selectedDate} onChange={setSelectedDate} />
//                 </div>

//                 {/* Divider */}
//                 <div className="w-px self-stretch bg-border my-2 shrink-0" />

//                 {/* Search button */}
//                 <div className="px-1.5 py-1.5 shrink-0">
//                   <button className="text-primary-foreground font-semibold rounded-[4px] px-3 sm:px-5 py-2 text-xs sm:text-sm bg-gradient-primary hover:opacity-90 transition-opacity whitespace-nowrap">
//                     Search
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ── Right column ── */}
//           <div className="order-1 lg:order-2 w-full max-w-[320px] xs:max-w-[360px] sm:max-w-[440px] md:max-w-[500px] mx-auto lg:max-w-none">

//             {/* Visual block */}
//             <div className="relative h-[280px] xs:h-[300px] sm:h-[390px] md:h-[460px] lg:h-[620px]">

//               {/* Floating plus icons — lg only */}
//               <div className="hidden lg:block absolute left-0 top-10 text-primary/80">
//                 <Plus className="w-10 h-10" strokeWidth={3} />
//                 <Plus className="w-7 h-7 -mt-2 ml-7" strokeWidth={3} />
//               </div>

//               {/* Teal circle backdrop */}
//               <div
//                 className="absolute right-0 top-0 rounded-full overflow-hidden bg-gradient-primary
//                            w-[200px] h-[200px]
//                            xs:w-[220px] xs:h-[220px]
//                            sm:w-[290px] sm:h-[290px]
//                            md:w-[350px] md:h-[350px]
//                            lg:w-[500px] lg:h-[500px]"
//               >
//                 <div className="absolute inset-3 sm:inset-5 rounded-full border border-primary-foreground/30" />
//                 <div className="absolute inset-8 sm:inset-12 rounded-full border border-primary-foreground/20" />
//               </div>

//               {/* Active doctor image */}
//               <div
//                 className="absolute rounded-full overflow-hidden
//                            right-[8px] top-[8px]
//                            w-[184px] h-[184px]
//                            xs:w-[200px] xs:h-[200px]
//                            sm:w-[262px] sm:h-[262px]
//                            md:w-[320px] md:h-[320px]
//                            lg:w-[464px] lg:h-[464px]"
//               >
//                 {doctorsLoading ? (
//                   <div className="w-full h-full bg-muted animate-pulse" />
//                 ) : activeDoc ? (
//                   <img
//                     key={activeDoc.id}
//                     src={activeDoc.image}
//                     alt={activeDoc.name}
//                     onError={(e) => { (e.target as HTMLImageElement).src = doctorPlaceholder; }}
//                     className="w-full h-full object-contain object-bottom transition-opacity duration-500 animate-in fade-in scale-110"
//                   />
//                 ) : (
//                   <img
//                     src={doctorPlaceholder}
//                     alt="No doctors available"
//                     className="w-full h-full object-contain object-bottom opacity-60"
//                   />
//                 )}
//               </div>

//               {/* Regular Check-up badge */}
//               <div
//                 className="absolute left-0 bg-card rounded-[6px] px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1.5 sm:gap-2.5 border border-border shadow-sm
//                            top-[90px] xs:top-[100px] sm:top-[145px] md:top-[175px] lg:top-[270px]"
//               >
//                 <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-[4px] grid place-items-center text-primary-foreground bg-gradient-primary shrink-0">
//                   <Check className="w-3 h-3" strokeWidth={3} />
//                 </div>
//                 <span className="font-semibold text-foreground text-[10px] sm:text-xs whitespace-nowrap">
//                   Regular Check-up
//                 </span>
//               </div>

//               {/* Active doctor card */}
//               {activeDoc && (
//                 <div
//                   className="absolute bg-card rounded-[8px] border border-border shadow-md text-center
//                              right-[-4px] top-[115px] w-[100px] p-2
//                              xs:right-[-4px] xs:top-[120px] xs:w-[110px]
//                              sm:right-[-8px] sm:top-[160px] sm:w-[140px] sm:p-3
//                              md:right-[-12px] md:top-[185px] md:w-[155px]
//                              lg:right-[-24px] lg:top-[205px] lg:w-[175px] lg:p-4"
//                 >
//                   <img
//                     src={activeDoc.image}
//                     alt={activeDoc.name}
//                     onError={(e) => { (e.target as HTMLImageElement).src = doctorPlaceholder; }}
//                     className="w-9 h-9 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full mx-auto object-cover ring-2 ring-card"
//                     loading="lazy"
//                   />
//                   <div className="mt-1.5 font-bold text-foreground text-[10px] sm:text-xs lg:text-sm truncate">
//                     {activeDoc.name}
//                   </div>
//                   <div className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground truncate">
//                     {activeDoc.role}
//                   </div>
//                   <button
//                     onClick={() => setPaused(true)}
//                     className="mt-1.5 flex sm:mt-2 w-full bg-primary text-primary-foreground text-[9px] sm:text-[10px] lg:text-xs font-semibold rounded-[4px] py-1 sm:py-1.5 hover:opacity-90 transition-opacity"
//                   >
//                     <><Wifi className="h-3 w-3" />connect</>
//                   </button>
//                 </div>
//               )}

//               {/* Meet Our Doctors — desktop only, floats over the circle corner */}
//               <MeetOurDoctorsSlider
//                 doctors={doctors}
//                 totalDoctors={totalDoctors}
//                 index={activeIdx}
//                 setIndex={setActiveIdx}
//                 setPaused={setPaused}
//                 className="hidden lg:block absolute right-2 bottom-2 w-[260px]"
//               />
//             </div>

// {/* Meet Our Doctors — tablet only, hidden on mobile */}
//             <MeetOurDoctorsSlider
//               doctors={doctors}
//               totalDoctors={totalDoctors}
//               index={activeIdx}
//               setIndex={setActiveIdx}
//               setPaused={setPaused}
//               className="hidden sm:block lg:hidden mt-4 w-full sm:w-[300px] mx-auto"
//             />
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// }




import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Search,
  Calendar,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Wifi,
  Maximize2,
} from "lucide-react";

import doctorPlaceholder from "@/assets/doctor-hero.png";
import { HeroHeader } from "@/components/landing/HeroHeader";
import StartConsult from "@/components/landing/StartConsult";
import { useGetSearchDoctors } from "@/hooks/patient/use-patient-doctor";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConnectDialog } from "@/components/ConnectDialog";
import { useCallStore } from "@/context/CallStore";
import type { Doctor } from "@/context/CallStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiDoctor {
  id: number;
  specialization: string;
  doctor_degree: string;
  designations: string;
  consultation_fee: string;
  currency: string;
  instant_consultation: boolean;
  is_available: boolean;
  bookings_paused: boolean;
  image: string | null;
  rating_avg: string;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
}

interface DisplayDoctor {
  id: number;
  name: string;
  role: string;
  image: string;
  fee: string;
  currency: string;
  instant: boolean;
  raw: ApiDoctor; // kept for call-state logic (mirrors DoctorSlide using ApiDoctor directly)
}

function toDisplayDoctor(doc: ApiDoctor): DisplayDoctor {
  return {
    id: doc.id,
    name: doc.user?.name || doc.designations || "Doctor",
    role: doc.specialization || doc.doctor_degree || "General Practitioner",
    image: doc.image || doc.user?.avatar || doctorPlaceholder,
    fee: doc.consultation_fee,
    currency: doc.currency,
    instant: doc.instant_consultation,
    raw: doc,
  };
}

// ─── Date Picker ──────────────────────────────────────────────────────────────

function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const iso = d.toISOString().split("T")[0];
    onChange(iso);
    setOpen(false);
  };

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div ref={ref} className="relative w-full">
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 cursor-pointer w-full"
      >
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className={`text-sm flex-1 ${value ? "text-foreground" : "text-muted-foreground"}`}>
          {displayValue || "Select date"}
        </span>
        {value && (
          <button
            onClick={clear}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    {open && (
        <div className="fixed z-[9999] bg-card border border-border rounded-[6px] shadow-xl p-3 w-[min(260px,90vw)]"
          style={{
            bottom: (() => {
              const el = ref.current;
              if (!el) return "auto";
              const rect = el.getBoundingClientRect();
              return `${window.innerHeight - rect.top + 8}px`;
            })(),
            left: (() => {
              const el = ref.current;
              if (!el) return 0;
              const rect = el.getBoundingClientRect();
              const left = rect.left;
              const maxLeft = window.innerWidth - Math.min(260, window.innerWidth * 0.9) - 8;
              return `${Math.min(Math.max(8, left), maxLeft)}px`;
            })(),
          }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={prevMonth}
              className="w-6 h-6 rounded-[4px] hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-foreground">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-6 h-6 rounded-[4px] hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(viewYear, viewMonth, day);
              date.setHours(0, 0, 0, 0);
              const isPast = date < today;
              const isSelected =
                value === `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday =
                date.getTime() === today.getTime();

              return (
                <button
                  key={day}
                  onClick={() => !isPast && selectDay(day)}
                  disabled={isPast}
                  className={`
                    h-7 w-full rounded-[4px] text-xs font-medium transition-colors
                    ${isSelected ? "bg-primary text-primary-foreground" : ""}
                    ${!isSelected && isToday ? "border border-primary text-primary" : ""}
                    ${!isSelected && !isPast ? "hover:bg-muted text-foreground" : ""}
                    ${isPast ? "text-muted-foreground/40 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-border">
            <button
              onClick={() => selectDay(today.getDate())}
              className="w-full text-xs text-primary font-medium hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MeetOurDoctorsSlider ─────────────────────────────────────────────────────

interface SliderProps {
  doctors: DisplayDoctor[];
  totalDoctors: number;
  index: number;
  setIndex: (n: number) => void;
  setPaused: (p: boolean) => void;
  className?: string;
}

function MeetOurDoctorsSlider({
  doctors,
  totalDoctors,
  index,
  setIndex,
  setPaused,
  className = "",
}: SliderProps) {
  if (doctors.length === 0) return null;

  const safeIndex = index % doctors.length;
  const doc = doctors[safeIndex];

  const prev = () => {
    setPaused(true);
    setIndex((safeIndex - 1 + doctors.length) % doctors.length);
  };
  const next = () => {
    setPaused(true);
    setIndex((safeIndex + 1) % doctors.length);
  };

  return (
    <div className={`bg-card rounded-[8px] p-3 sm:p-4 border border-border ${className}`}>
      <div className="flex items-center justify-between">
        <div className="font-bold text-foreground text-xs sm:text-sm">Meet Our Doctors</div>
        <div className="flex gap-1">
          <button
            onClick={prev}
            className="w-6 h-6 rounded-[4px] bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors grid place-items-center"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={next}
            className="w-6 h-6 rounded-[4px] bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors grid place-items-center"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
        <img
          src={doc.image}
          alt={doc.name}
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-card shrink-0"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = doctorPlaceholder; }}
        />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-foreground text-xs sm:text-sm truncate">{doc.name}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{doc.role}</div>
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-primary-foreground text-[9px] sm:text-[10px] font-bold grid place-items-center shrink-0 bg-gradient-primary">
          {totalDoctors}+
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-2 sm:mt-3">
        {doctors.map((_, i) => (
          <button
            key={i}
            onClick={() => { setPaused(true); setIndex(i); }}
            aria-label={`Show doctor ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === safeIndex ? "bg-primary w-4" : "bg-muted-foreground/20 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── HeroSection ──────────────────────────────────────────────────────────────

export default function HeroSection() {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const handleSearch = () => {
  const query = searchValue.trim();

  if (query) {
    localStorage.setItem("doctorSearchQuery", query);
  }

  navigate("/patient/search-doctors");
};
  const call = useCallStore();

  const { data: instantDoctorsData, isLoading: doctorsLoading } =
    useGetSearchDoctors({ instant: true, page: 1, per_page: 6 });

  const doctors: DisplayDoctor[] = (instantDoctorsData?.data ?? []).map(toDisplayDoctor);
  const hasDoctors = doctors.length > 0;
  const activeDoc = hasDoctors ? doctors[activeIdx % doctors.length] : null;

  // `total` is a top-level field on the paginated response.
  const totalDoctors: number = instantDoctorsData?.total ?? doctors.length;

  // ── Call state, scoped to whichever doctor is currently active ─────────────
  // Mirrors DoctorSlide's CallStore shape
  const callDoctor: Doctor | null = activeDoc
    ? {
        id: activeDoc.raw.id,
        user: {
          id: activeDoc.raw.user.id,
          name: activeDoc.raw.user.name,
          avatar: activeDoc.raw.user.avatar,
        },
        specialization: activeDoc.raw.specialization,
      }
    : null;

  const isThisDoctor     = !!activeDoc && call.doctor?.id === activeDoc.id;
  const isCallInProgress = isThisDoctor && call.phase !== "idle";
  const isConnected      = isThisDoctor && call.phase === "connected";
  const isMinimized      = isConnected && call.minimized;

  const canConnect =
    !!activeDoc &&
    activeDoc.raw.is_available &&
    !activeDoc.raw.bookings_paused &&
    activeDoc.raw.instant_consultation;

  const connectOpen = isThisDoctor && call.dialogOpen;

  const handleOpenChange = (v: boolean) => {
    if (!v && isCallInProgress) call.setMinimized(true);
    else call.setDialogOpen(v);
  };

  const handleConnect = () => {
    if (!callDoctor || !canConnect) return;
    if (isMinimized)           call.setMinimized(false);
    else if (isCallInProgress) call.setDialogOpen(true);
    else                       call.startCall(callDoctor);
  };

  useEffect(() => {
    if (paused || !hasDoctors) return;
    const timer = setInterval(
      () => setActiveIdx((p) => (p + 1) % doctors.length),
      2000,
    );
    return () => clearInterval(timer);
  }, [paused, hasDoctors, doctors.length]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      {/* Subtle diagonal lines background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, hsl(var(--accent)) 0 1px, transparent 1px 22px)",
        }}
      />

      <div className="relative pt-4 sm:pt-7">
        {/* <HeroHeader
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        /> */}

        {/* ── Hero ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:p-10 relative">

          {/* ── Left column ── */}
          <div className="relative z-10 order-2 lg:order-1">
      <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-[36px] lg:text-[42px] xl:text-[46px] leading-[1.2] font-extrabold text-foreground tracking-tight text-center lg:text-left">
              Book a{" "}
              <span className="text-primary">Doctor Consultation</span>
              <br className="hidden sm:block" />
              <span className="mt-2 block">Anytime, Anywhere</span>
            </h1>
            <p className="mt-3 sm:mt-5 text-sm sm:text-[15px] text-muted-foreground font-medium text-center lg:text-left max-w-md mx-auto lg:mx-0">
              Embark on your healing journey with MEDICONNECT
            </p>

            {/* Decorative medical illustration — tablet+ only */}
            <div className="hidden sm:flex justify-between py-6 lg:py-8 items-center w-full">
              {/* Stethoscope icon */}
              <svg
                width="44"
                height="50"
                viewBox="0 0 140 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="lg:w-[52px] lg:h-[60px] shrink-0"
              >
                <style>{`
                  .bob { animation: bob 2.4s ease-in-out infinite; }
                  @keyframes bob { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-4px); } }
                `}</style>
                <g className="bob">
                  <line x1="50" y1="38" x2="35" y2="58" stroke="#18B19A" strokeWidth="4.5" strokeLinecap="round" />
                  <line x1="80" y1="38" x2="95" y2="58" stroke="#18B19A" strokeWidth="4.5" strokeLinecap="round" />
                  <circle cx="33" cy="60" r="5.5" fill="#18B19A" />
                  <circle cx="97" cy="60" r="5.5" fill="#18B19A" />
                  <path d="M35 40 Q65 28 95 40" stroke="#18B19A" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M65 40 C65 68, 45 82, 40 102 C34 122, 48 140, 68 140 C88 140, 102 122, 102 105" stroke="#18B19A" strokeWidth="5" strokeLinecap="round" />
                  <circle cx="102" cy="118" r="22" stroke="#18B19A" strokeWidth="5" />
                  <circle cx="102" cy="118" r="10" fill="#18B19A" opacity="0.18" />
                  <circle cx="102" cy="118" r="4" fill="#18B19A" />
                </g>
              </svg>

              {/* ECG line */}
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
                  <marker id="ecg-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M2 1L8 5L2 9" fill="none" stroke="#18B19A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                </defs>
                <line x1="0" y1="80" x2="400" y2="80" stroke="#ffff" strokeWidth="1.5" opacity="0.15" />
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
                <line x1="386" y1="80" x2="398" y2="80" stroke="#ffff" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#ecg-arr)" />
                <circle cx="63" cy="44" r="3.5" fill="#ffff" opacity="0.7" />
                <circle cx="158" cy="44" r="3.5" fill="#ffff" opacity="0.7" />
                <circle cx="253" cy="44" r="3.5" fill="#ffff" opacity="0.7" />
              </svg>
            </div>


              <StartConsult />


{/* ── Search bar ── */}
            <div className="mt-5 sm:mt-7 bg-card rounded-[6px] border border-border overflow-visible">
              <div className="flex items-center gap-0">
                {/* Search input */}
                {/* <div className="flex items-center gap-2.5 px-3 py-2.5 flex-1 min-w-0">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="bg-transparent outline-none text-xs sm:text-sm w-full placeholder:text-muted-foreground text-foreground min-w-0"
                    placeholder="Search doctors…"
                  />
                </div> */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 flex-1 min-w-0">
  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
  <input
    value={searchValue}
    onChange={(e) => setSearchValue(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
    className="bg-transparent outline-none text-xs sm:text-sm w-full placeholder:text-muted-foreground text-foreground min-w-0"
    placeholder="Search doctors…"
  />
</div>

                

                {/* Divider */}
                <div className="w-px self-stretch bg-border my-2 shrink-0" />

                {/* Search button */}
                <div className="px-1.5 py-1.5 shrink-0">
                <button
  onClick={handleSearch}
  className="text-primary-foreground font-semibold rounded-[4px] px-3 sm:px-5 py-2 text-xs sm:text-sm bg-gradient-primary hover:opacity-90 transition-opacity whitespace-nowrap"
>
  Search
</button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="order-1 lg:order-2 w-full max-w-[320px] xs:max-w-[360px] sm:max-w-[440px] md:max-w-[500px] mx-auto lg:max-w-none">

            {/* Visual block */}
            <div className="relative h-[280px] xs:h-[300px] sm:h-[390px] md:h-[460px] lg:h-[620px]">

              {/* Floating plus icons — lg only */}
              <div className="hidden lg:block absolute left-10 top-10 text-primary/80">
                <Plus className="w-10 h-10" strokeWidth={3} />
                <Plus className="w-7 h-7 -mt-2 ml-7" strokeWidth={3} />
              </div>

              {/* Teal circle backdrop */}
              <div
                className="absolute right-0 top-0 rounded-full overflow-hidden bg-gradient-primary
                           w-[200px] h-[200px]
                           xs:w-[220px] xs:h-[220px]
                           sm:w-[290px] sm:h-[290px]
                           md:w-[350px] md:h-[350px]
                           lg:w-[500px] lg:h-[500px]"
              >
                <div className="absolute inset-3 sm:inset-5 rounded-full border border-primary-foreground/30" />
                <div className="absolute inset-8 sm:inset-12 rounded-full border border-primary-foreground/20" />
              </div>

              {/* Active doctor image */}
              <div
                className="absolute rounded-full overflow-hidden
                           right-[8px] top-[8px]
                           w-[184px] h-[184px]
                           xs:w-[200px] xs:h-[200px]
                           sm:w-[262px] sm:h-[262px]
                           md:w-[320px] md:h-[320px]
                           lg:w-[464px] lg:h-[464px]"
              >
                {doctorsLoading ? (
                  <div className="w-full h-full bg-muted animate-pulse" />
                ) : activeDoc ? (
                  <img
                    key={activeDoc.id}
                    src={activeDoc.image}
                    alt={activeDoc.name}
                    onError={(e) => { (e.target as HTMLImageElement).src = doctorPlaceholder; }}
                    className="w-full h-full object-contain object-bottom transition-opacity duration-500 animate-in fade-in scale-110"
                  />
                ) : (
                  <img
                    src={doctorPlaceholder}
                    alt="No doctors available"
                    className="w-full h-full object-contain object-bottom opacity-60"
                  />
                )}
              </div>

              {/* Regular Check-up badge */}
              <div
                className="absolute left-20 bg-card rounded-[6px] px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1.5 sm:gap-2.5 border border-border shadow-sm
                           top-[90px] xs:top-[100px] sm:top-[145px] md:top-[175px] lg:top-[270px]"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-[4px] grid place-items-center text-primary-foreground bg-gradient-primary shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </div>
                <span className="font-semibold text-foreground text-[10px] sm:text-xs whitespace-nowrap">
                  Regular Check-up
                </span>
              </div>

              {/* Active doctor card */}
              {activeDoc && (
                <div
                  className="absolute bg-card rounded-[6px] border border-border shadow-md text-center
                             right-[-4px] top-[115px] w-[100px] p-2
                             xs:right-[-4px] xs:top-[120px] xs:w-[100px]
                             sm:right-[-8px] sm:top-[160px] sm:w-[110px] sm:p-3
                             md:right-[-12px] md:top-[185px] md:w-[120px]
                             lg:right-[-24px] lg:top-[205px] lg:w-[140px] "
                >
                  <img
                    src={activeDoc.image}
                    alt={activeDoc.name}
                    onError={(e) => { (e.target as HTMLImageElement).src = doctorPlaceholder; }}
                    className="w-9 h-9 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full mx-auto object-cover ring-2 ring-card"
                    loading="lazy"
                  />
                  <div className="mt-1.5 font-semibold text-foreground text-[8px] sm:text-xs lg:text-[10px] truncate">
                    {activeDoc.name}
                  </div>
                  

                  {/* Connect button — mirrors QuickConsultPanel/DoctorSlide's connect button states */}
                  <button
                    onClick={handleConnect}
                    disabled={!canConnect && !isCallInProgress}
                    className={cn(
                      "mt-1.5 sm:mt-2 px-2 py-2 inline-flex items-center justify-around gap-1.5",
                      "text-[9px] sm:text-[10px] lg:text-xs font-semibold rounded-[4px] py-1 sm:py-1.5",
                      "transition-opacity disabled:opacity-40 disabled:cursor-not-allowed",
                      isMinimized
                        ? "bg-emerald-500 hover:opacity-90 text-white"
                        : isCallInProgress
                        ? "bg-sky-500 hover:opacity-90 text-white"
                        : "bg-primary hover:opacity-90 text-primary-foreground",
                    )}
                  >
                    {isMinimized ? (
                      <><Maximize2 className="h-3 w-3 mr-4" />Resume</>
                    ) : isCallInProgress ? (
                      <><Wifi className="h-3 w-3 mr-4" />Open</>
                    ) : (
                      <><Wifi className="h-3 w-3 mr-4" />Connect</>
                    )}
                  </button>
                </div>
              )}

              {/* Meet Our Doctors — desktop only, floats over the circle corner */}
              <MeetOurDoctorsSlider
                doctors={doctors}
                totalDoctors={totalDoctors}
                index={activeIdx}
                setIndex={setActiveIdx}
                setPaused={setPaused}
                className="hidden lg:block absolute right-2 bottom-2 w-[260px]"
              />
            </div>

{/* Meet Our Doctors — tablet only, hidden on mobile */}
            <MeetOurDoctorsSlider
              doctors={doctors}
              totalDoctors={totalDoctors}
              index={activeIdx}
              setIndex={setActiveIdx}
              setPaused={setPaused}
              className="hidden sm:block lg:hidden mt-4 w-full sm:w-[300px] mx-auto"
            />
          </div>
        </section>
      </div>

      {/* ConnectDialog — portaled to body, wrapped in our own modal shell.
          ConnectDialog/ConnectDialogContent render bare, unstyled content
          (no backdrop, no centering, no z-index) — they're explicitly
          marked `@deprecated, use inside UnifiedModal instead` in that file.
          Since we don't have UnifiedModal here and were asked not to touch
          ConnectDialog.tsx, we supply the modal chrome from this side
          instead: a centered, scrollable, backdrop-blurred shell that
          ConnectDialog's content drops into unchanged. */}
      {activeDoc && callDoctor && connectOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleOpenChange(false);
            }}
          >
            <div
              className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <ConnectDialog
                doctor={callDoctor}
                open={connectOpen}
                onOpenChange={handleOpenChange}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
