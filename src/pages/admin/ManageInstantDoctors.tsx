
// import { useMemo, useState, useCallback, useEffect } from "react";
// import { useTranslation } from "react-i18next";
// import { DashboardLayout } from "@/components/DashboardLayout";
// import { StatCard } from "@/components/StatCard";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import {
//   Stethoscope,
//   CheckCircle2,
//   XCircle,
//   SlidersHorizontal,
//   X,
//   Search,
//   ChevronLeft,
//   ChevronRight,
//   Loader2,
//   Hash,
//   Phone,
//   Pencil,
//   DollarSign,
//   AlertCircle,
//   ToggleLeft,
//   ToggleRight,
//   Ban,
//   RefreshCw,
//   Plus,
//   ChevronDown,
// } from "lucide-react";

// import {
//   useGetDoctorConsultations,
//   useAssignDoctorConsultation,
//   useUpdateDoctorConsultation,
//   useSetFeeOverride,
//   type ApiDoctorConsultation,
// } from "@/hooks/admin/use-doctor-insitant";
// import {
//   useGetAdminDoctors,
//   type ApiDoctor,
// } from "@/hooks/admin/use-admin-doctors";
// import {
//   useGetSpecializationFees,
//   type ApiSpecializationFee,
// } from "@/hooks/admin/use-admin-specializations";

// import { useToast } from "@/hooks/use-toast";
// import { cn } from "@/lib/utils";
// import { PageHeader } from "@/components/PageHeader";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type StatusFilter   = "all" | "active" | "inactive";
// type OverrideFilter = "all" | "overridden" | "base_rate";
// type SortOption     = "name" | "fee-asc" | "fee-desc";

// const SORT_OPTIONS: { value: SortOption; label: string }[] = [
//   { value: "name",     label: "Name (A–Z)" },
//   { value: "fee-asc",  label: "Online fee: Low → High" },
//   { value: "fee-desc", label: "Online fee: High → Low" },
// ];

// interface FilterState {
//   search:   string;
//   status:   StatusFilter;
//   override: OverrideFilter;
//   sort:     SortOption;
//   page:     number;
// }

// const PAGE_SIZE = 20;

// const INITIAL_FILTERS: FilterState = {
//   search:   "",
//   status:   "all",
//   override: "all",
//   sort:     "name",
//   page:     1,
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function getErrorMessage(error: unknown): string {
//   if (error instanceof Error) return error.message;
//   return "Something went wrong";
// }

// function getInitials(name: string) {
//   return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
// }

// function resolvedFee(c: ApiDoctorConsultation) {
//   return {
//     online:   c.online_fee_override   ?? c.specialization_fee?.online_fee   ?? null,
//     inPerson: c.in_person_fee_override ?? c.specialization_fee?.in_person_fee ?? null,
//   };
// }

// function fmt(n: number | null) {
//   if (n === null) return "—";
//   return n.toLocaleString() + " RWF";
// }

// // ─── Style maps ───────────────────────────────────────────────────────────────

// const activeStyle = {
//   true:  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
//   false: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
// };
// const activeDot = {
//   true:  "bg-emerald-500",
//   false: "bg-red-500",
// };

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <div className="py-3 border-b border-border/60 last:border-b-0">
//       <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
//         {title}
//       </p>
//       {children}
//     </div>
//   );
// }

// function PillGroup<T extends string>({
//   value,
//   onChange,
//   options,
// }: {
//   value: T;
//   onChange: (v: T) => void;
//   options: { value: T; label: string; count?: number }[];
// }) {
//   return (
//     <div className="flex flex-col gap-1">
//       {options.map((o) => (
//         <button
//           key={o.value}
//           onClick={() => onChange(o.value)}
//           className={cn(
//             "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left flex items-center justify-between",
//             value === o.value
//               ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
//               : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
//           )}
//         >
//           <span>{o.label}</span>
//           {o.count !== undefined && (
//             <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", value === o.value ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
//               {o.count}
//             </span>
//           )}
//         </button>
//       ))}
//     </div>
//   );
// }

// // ─── InfoTile ─────────────────────────────────────────────────────────────────

// const InfoTile = ({
//   icon, label, value, highlight,
// }: {
//   icon: React.ReactNode; label: string; value: string | number; highlight?: boolean;
// }) => (
//   <div className={cn("p-3 rounded-lg border bg-secondary/30", highlight ? "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60" : "border-border/60")}>
//     <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">{icon}{label}</div>
//     <p className={cn("text-[13px] font-medium truncate", highlight ? "text-amber-700 dark:text-amber-400" : "text-foreground")}>{value}</p>
//   </div>
// );

// // ─── Skeleton ─────────────────────────────────────────────────────────────────

// function SkeletonRows() {
//   return (
//     <>
//       {Array.from({ length: 6 }).map((_, i) => (
//         <tr key={i} className="border-t border-border/40">
//           {Array.from({ length: 6 }).map((_, j) => (
//             <td key={j} className="px-4 py-3">
//               <div className="h-4 bg-muted/60 rounded animate-pulse" style={{ width: j === 0 ? "140px" : j === 5 ? "60px" : "90px" }} />
//             </td>
//           ))}
//         </tr>
//       ))}
//     </>
//   );
// }

// // ─── Desktop row ──────────────────────────────────────────────────────────────

// function ConsultationRow({ c, onManage }: { c: ApiDoctorConsultation; onManage: (c: ApiDoctorConsultation) => void }) {
//   const fees = resolvedFee(c);
//   const hasOverride = c.online_fee_override !== null || c.in_person_fee_override !== null;
//   const key = String(c.is_active) as "true" | "false";

//   return (
//     <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
//       <td className="px-4 py-3">
//         <div className="flex items-center gap-3">
//           <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
//             {getInitials(c.doctor.user.name)}
//           </div>
//           <div className="min-w-0">
//             <p className="font-semibold text-[11px] text-foreground truncate">{c.doctor.user.name}</p>
//             <p className="text-[10px] text-muted-foreground/60 truncate">{c.doctor.user.phone ?? "—"}</p>
//           </div>
//         </div>
//       </td>
//       <td className="px-4 py-3">
//         <p className="text-[11px] text-foreground truncate">{c.primary_specialization ?? <span className="text-muted-foreground/40">—</span>}</p>
//         {c.secondary_specialization && <p className="text-[10px] text-muted-foreground/60 truncate">{c.secondary_specialization}</p>}
//       </td>
//       <td className="px-4 py-3">
//         <p className={cn("font-mono text-[11px] font-medium", hasOverride && c.online_fee_override !== null ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>{fmt(fees.online)}</p>
//         {hasOverride && c.online_fee_override !== null && c.specialization_fee && (
//           <p className="text-[10px] text-muted-foreground/50 line-through font-mono">{fmt(c.specialization_fee.online_fee)}</p>
//         )}
//       </td>
//       <td className="px-4 py-3">
//         <p className={cn("font-mono text-[11px] font-medium", hasOverride && c.in_person_fee_override !== null ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>{fmt(fees.inPerson)}</p>
//         {hasOverride && c.in_person_fee_override !== null && c.specialization_fee && (
//           <p className="text-[10px] text-muted-foreground/50 line-through font-mono">{fmt(c.specialization_fee.in_person_fee)}</p>
//         )}
//       </td>
//       <td className="px-4 py-3">
//         <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium", activeStyle[key])}>
//           <span className={cn("w-1 h-1 rounded-full mr-1", activeDot[key])} />
//           {c.is_active ? "Active" : "Inactive"}
//         </Badge>
//       </td>
//       <td className="px-4 py-3 text-right">
//         <Button size="sm" variant="outline" className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200" onClick={() => onManage(c)}>
//           Manage
//         </Button>
//       </td>
//     </tr>
//   );
// }

// // ─── Mobile card ──────────────────────────────────────────────────────────────

// function ConsultationCard({ c, onManage }: { c: ApiDoctorConsultation; onManage: (c: ApiDoctorConsultation) => void }) {
//   const fees = resolvedFee(c);
//   const hasOverride = c.online_fee_override !== null || c.in_person_fee_override !== null;
//   const key = String(c.is_active) as "true" | "false";

//   return (
//     <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
//       <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 border border-primary/20">
//         {getInitials(c.doctor.user.name)}
//       </div>
//       <div className="flex-1 min-w-0">
//         <div className="flex items-start justify-between gap-2">
//           <div className="min-w-0">
//             <p className="font-semibold text-[12px] text-foreground truncate">{c.doctor.user.name}</p>
//             <p className="text-[10px] text-muted-foreground/60">{c.primary_specialization ?? "—"}</p>
//           </div>
//           <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0", activeStyle[key])}>
//             <span className={cn("w-1 h-1 rounded-full mr-1", activeDot[key])} />
//             {c.is_active ? "Active" : "Inactive"}
//           </Badge>
//         </div>
//         <div className="flex items-center gap-3 mt-1.5 flex-wrap">
//           <span className={cn("font-mono text-[10px] font-medium", hasOverride ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70")}>
//             Online: {fmt(fees.online)}
//           </span>
//           <span className={cn("font-mono text-[10px] font-medium", hasOverride ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70")}>
//             In-person: {fmt(fees.inPerson)}
//           </span>
//           {hasOverride && (
//             <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-1.5 py-0.5 rounded-sm">
//               Override
//             </span>
//           )}
//         </div>
//         <Button size="sm" variant="outline" className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full" onClick={() => onManage(c)}>
//           Manage
//         </Button>
//       </div>
//     </div>
//   );
// }

// // ─── Assign Panel (create) ────────────────────────────────────────────────────

// function AssignPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
//   const { toast } = useToast();

//   // Doctor search
//   const [doctorSearch, setDoctorSearch]       = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [selectedDoctor, setSelectedDoctor]   = useState<ApiDoctor | null>(null);
//   const [showDoctorList, setShowDoctorList]   = useState(false);

//   // Fee tier
//   const [selectedFeeId, setSelectedFeeId] = useState<number | null>(null);

//   // Form fields
//   const [primarySpec,   setPrimarySpec]   = useState("");
//   const [secondarySpec, setSecondarySpec] = useState("");

//   const assignMutation = useAssignDoctorConsultation();
//   const isSaving = assignMutation.isPending;

//   // Fetch active doctors
//   const { data: doctorData, isLoading: doctorsLoading } = useGetAdminDoctors({
//     status: "active",
//     search: debouncedSearch || undefined,
//     page: 1,
//   });
//   const doctors = doctorData?.data ?? [];

//   // Fetch specialization fees
//   const { data: feesData, isLoading: feesLoading } = useGetSpecializationFees();
//   const activeFees = (feesData ?? []).filter((f) => f.is_active);
//   const selectedFee = activeFees.find((f) => f.id === selectedFeeId) ?? null;

//   useEffect(() => {
//     const t = setTimeout(() => setDebouncedSearch(doctorSearch), 350);
//     return () => clearTimeout(t);
//   }, [doctorSearch]);

//   useEffect(() => {
//     if (open) {
//       setDoctorSearch(""); setDebouncedSearch(""); setSelectedDoctor(null);
//       setPrimarySpec(""); setSecondarySpec(""); setShowDoctorList(false);
//       setSelectedFeeId(null);
//     }
//   }, [open]);

//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
//     document.addEventListener("keydown", onKey);
//     return () => document.removeEventListener("keydown", onKey);
//   }, [open, onClose]);

//   useEffect(() => {
//     document.body.style.overflow = open ? "hidden" : "";
//     return () => { document.body.style.overflow = ""; };
//   }, [open]);

//   const handleSubmit = async () => {
//     if (!selectedDoctor) {
//       toast({ title: "Select a doctor", variant: "destructive" }); return;
//     }
//     if (!selectedFeeId) {
//       toast({ title: "Select a fee tier", variant: "destructive" }); return;
//     }
//     if (!primarySpec.trim()) {
//       toast({ title: "Primary specialization is required", variant: "destructive" }); return;
//     }
//     try {
//       await assignMutation.mutateAsync({
//         doctor_id:              selectedDoctor.id,
//         specialization_fee_id:  selectedFeeId,
//         primary_specialization: primarySpec.trim(),
//         secondary_specialization: secondarySpec.trim() || undefined,
//       });
//       toast({ title: "Doctor assigned to consultation." });
//       onClose();
//     } catch (error) {
//       toast({ title: getErrorMessage(error), variant: "destructive" });
//     }
//   };

//   return (
//     <>
//       <div
//         onClick={onClose}
//         className={cn(
//           "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
//           open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
//         )}
//       />
//       <div
//         className={cn(
//           "fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] lg:w-[460px]",
//           "bg-card border-l border-border/60 flex flex-col",
//           "transition-transform duration-300 ease-out",
//           open ? "translate-x-0" : "translate-x-full",
//         )}
//       >
//         {open && (
//           <>
//             {/* Header */}
//             <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
//               <div>
//                 <p className="text-[14px] font-semibold text-foreground leading-tight">Assign doctor</p>
//                 <p className="text-[11px] text-muted-foreground mt-0.5">Add a doctor to the consultation pool</p>
//               </div>
//               <button onClick={onClose} className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors" aria-label="Close panel">
//                 <X className="w-3.5 h-3.5 text-muted-foreground" />
//               </button>
//             </div>

//             {/* Body */}
//             <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

//               {/* Doctor picker */}
//               <div>
//                 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
//                   Doctor <span className="text-red-500">*</span>
//                 </label>

//                 {selectedDoctor ? (
//                   <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
//                     <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
//                       {getInitials(selectedDoctor.user.name)}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="font-semibold text-[12px] text-foreground truncate">{selectedDoctor.user.name}</p>
//                       <p className="text-[10px] text-muted-foreground/60">{selectedDoctor.specialization ?? selectedDoctor.user.email ?? "—"}</p>
//                     </div>
//                     <button onClick={() => { setSelectedDoctor(null); setDoctorSearch(""); }} className="text-muted-foreground/50 hover:text-foreground transition-colors">
//                       <X className="w-3.5 h-3.5" />
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="relative">
//                     <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
//                     <input
//                       type="text"
//                       value={doctorSearch}
//                       onChange={(e) => { setDoctorSearch(e.target.value); setShowDoctorList(true); }}
//                       onFocus={() => setShowDoctorList(true)}
//                       placeholder="Search by name…"
//                       className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
//                     />
//                     {showDoctorList && (
//                       <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border/60 rounded-sm shadow-lg max-h-48 overflow-y-auto">
//                         {doctorsLoading ? (
//                           <div className="flex items-center justify-center py-4">
//                             <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
//                           </div>
//                         ) : doctors.length === 0 ? (
//                           <p className="text-[11px] text-muted-foreground/60 px-3 py-3 text-center">No active doctors found</p>
//                         ) : (
//                           doctors.map((d) => (
//                             <button
//                               key={d.id}
//                               className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/30 transition-colors text-left"
//                               onClick={() => { setSelectedDoctor(d); setShowDoctorList(false); setDoctorSearch(""); }}
//                             >
//                               <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px] shrink-0 border border-primary/20">
//                                 {getInitials(d.user.name)}
//                               </div>
//                               <div className="min-w-0">
//                                 <p className="text-[11px] font-medium text-foreground truncate">{d.user.name}</p>
//                                 <p className="text-[10px] text-muted-foreground/60 truncate">{d.specialization ?? d.user.email ?? "—"}</p>
//                               </div>
//                             </button>
//                           ))
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Fee tier picker */}
//               <div>
//                 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
//                   Fee Tier <span className="text-red-500">*</span>
//                 </label>

//                 {feesLoading ? (
//                   <div className="flex items-center gap-2 py-2 text-[11px] text-muted-foreground/60">
//                     <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                     Loading fee tiers…
//                   </div>
//                 ) : activeFees.length === 0 ? (
//                   <div className="flex items-start gap-2 p-3 rounded-lg border border-border/60 bg-secondary/20 text-[11px] text-muted-foreground">
//                     <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
//                     <span>No active fee tiers found. Create one in Specialization Fees first.</span>
//                   </div>
//                 ) : (
//                   <>
//                     <div className="relative">
//                       <select
//                         value={selectedFeeId ?? ""}
//                         onChange={(e) => setSelectedFeeId(Number(e.target.value) || null)}
//                         className="w-full appearance-none px-3 pr-8 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
//                       >
//                         <option value="">Select fee tier…</option>
//                         {activeFees.map((f) => (
//                           <option key={f.id} value={f.id}>
//                             {f.specialization} — {f.online_fee.toLocaleString()} / {f.in_person_fee.toLocaleString()} {f.currency}
//                           </option>
//                         ))}
//                       </select>
//                       <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
//                     </div>

//                     {selectedFee && (
//                       <div className="grid grid-cols-2 gap-2 mt-2">
//                         <div className="p-2.5 rounded-lg border border-border/60 bg-secondary/30">
//                           <p className="text-[10px] text-muted-foreground mb-1">Online</p>
//                           <p className="text-[12px] font-medium font-mono text-foreground">
//                             {selectedFee.online_fee.toLocaleString()} {selectedFee.currency}
//                           </p>
//                         </div>
//                         <div className="p-2.5 rounded-lg border border-border/60 bg-secondary/30">
//                           <p className="text-[10px] text-muted-foreground mb-1">In-person</p>
//                           <p className="text-[12px] font-medium font-mono text-foreground">
//                             {selectedFee.in_person_fee.toLocaleString()} {selectedFee.currency}
//                           </p>
//                         </div>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>

//               {/* Primary specialization */}
//               <div>
//                 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
//                   Primary Specialization <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   value={primarySpec}
//                   onChange={(e) => setPrimarySpec(e.target.value)}
//                   placeholder="e.g. Cardiology"
//                   className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
//                 />
//               </div>

//               {/* Secondary specialization */}
//               <div>
//                 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
//                   Secondary Specialization
//                   <span className="ml-1 normal-case text-muted-foreground/50 font-normal">(optional)</span>
//                 </label>
//                 <input
//                   type="text"
//                   value={secondarySpec}
//                   onChange={(e) => setSecondarySpec(e.target.value)}
//                   placeholder="e.g. Internal Medicine"
//                   className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
//                 />
//               </div>
//             </div>

//             {/* Footer */}
//             <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
//               <Button
//                 className="w-full h-10 text-[12px] rounded-lg gap-2"
//                 onClick={handleSubmit}
//                 disabled={isSaving || !selectedDoctor || !selectedFeeId || !primarySpec.trim()}
//               >
//                 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
//                 {isSaving ? "Assigning…" : "Assign doctor"}
//               </Button>
//               <Button variant="ghost" className="w-full h-9 text-[12px] rounded-lg text-muted-foreground" onClick={onClose} disabled={isSaving}>
//                 Cancel
//               </Button>
//             </div>
//           </>
//         )}
//       </div>
//     </>
//   );
// }

// // ─── Manage Panel (edit + override) ──────────────────────────────────────────

// type PanelTab = "details" | "override";

// function ConsultationPanel({
//   consultation,
//   onClose,
// }: {
//   consultation: ApiDoctorConsultation | null;
//   onClose: () => void;
// }) {
//   const open = !!consultation;
//   const { toast } = useToast();
//   const [tab, setTab] = useState<PanelTab>("details");

//   const [primarySpec,    setPrimarySpec]    = useState("");
//   const [secondarySpec,  setSecondarySpec]  = useState("");
//   const [isActive,       setIsActive]       = useState(true);
//   const [onlineFee,      setOnlineFee]      = useState("");
//   const [inPersonFee,    setInPersonFee]    = useState("");
//   const [overrideReason, setOverrideReason] = useState("");

//   const updateMutation   = useUpdateDoctorConsultation();
//   const overrideMutation = useSetFeeOverride();
//   const isSavingDetails  = updateMutation.isPending;
//   const isSavingOverride = overrideMutation.isPending;

//   useEffect(() => {
//     if (consultation) {
//       setPrimarySpec(consultation.primary_specialization ?? "");
//       setSecondarySpec(consultation.secondary_specialization ?? "");
//       setIsActive(consultation.is_active);
//       setOnlineFee(consultation.online_fee_override !== null ? String(consultation.online_fee_override) : "");
//       setInPersonFee(consultation.in_person_fee_override !== null ? String(consultation.in_person_fee_override) : "");
//       setOverrideReason(consultation.override_reason ?? "");
//       setTab("details");
//     }
//   }, [consultation]);

//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
//     document.addEventListener("keydown", onKey);
//     return () => document.removeEventListener("keydown", onKey);
//   }, [open, onClose]);

//   useEffect(() => {
//     document.body.style.overflow = open ? "hidden" : "";
//     return () => { document.body.style.overflow = ""; };
//   }, [open]);

//   const handleSaveDetails = async () => {
//     if (!consultation) return;
//     try {
//       await updateMutation.mutateAsync({
//         doctor_id: consultation.doctor_id,
//         primary_specialization:   primarySpec.trim()   || undefined,
//         secondary_specialization: secondarySpec.trim() || undefined,
//         is_active: isActive,
//       });
//       toast({ title: "Consultation updated." });
//       onClose();
//     } catch (error) {
//       toast({ title: getErrorMessage(error), variant: "destructive" });
//     }
//   };

//   const handleSaveOverride = async () => {
//     if (!consultation) return;
//     const onlineVal   = onlineFee.trim()   ? Number(onlineFee)   : null;
//     const inPersonVal = inPersonFee.trim() ? Number(inPersonFee) : null;
//     if ((onlineFee.trim() && isNaN(onlineVal!)) || (inPersonFee.trim() && isNaN(inPersonVal!))) {
//       toast({ title: "Enter valid numeric fee values", variant: "destructive" }); return;
//     }
//     try {
//       const res = await overrideMutation.mutateAsync({
//         doctor_id:              consultation.doctor_id,
//         online_fee_override:    onlineVal,
//         in_person_fee_override: inPersonVal,
//         override_reason:        overrideReason.trim() || null,
//       });
//       toast({ title: res.message });
//       onClose();
//     } catch (error) {
//       toast({ title: getErrorMessage(error), variant: "destructive" });
//     }
//   };

//   const handleClearOverride = async () => {
//     if (!consultation) return;
//     try {
//       const res = await overrideMutation.mutateAsync({
//         doctor_id:              consultation.doctor_id,
//         online_fee_override:    null,
//         in_person_fee_override: null,
//         override_reason:        null,
//       });
//       toast({ title: res.message });
//       onClose();
//     } catch (error) {
//       toast({ title: getErrorMessage(error), variant: "destructive" });
//     }
//   };

//   const hasExistingOverride = consultation
//     ? consultation.online_fee_override !== null || consultation.in_person_fee_override !== null
//     : false;

//   return (
//     <>
//       <div
//         onClick={onClose}
//         className={cn(
//           "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
//           open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
//         )}
//       />
//       <div
//         className={cn(
//           "fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] lg:w-[460px]",
//           "bg-card border-l border-border/60 flex flex-col",
//           "transition-transform duration-300 ease-out",
//           open ? "translate-x-0" : "translate-x-full",
//         )}
//       >
//         {consultation && (
//           <>
//             {/* Header */}
//             <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
//               <div>
//                 <p className="text-[14px] font-semibold text-foreground leading-tight">Manage consultation</p>
//                 <p className="text-[11px] text-muted-foreground mt-0.5">Update details or set fee override</p>
//               </div>
//               <button onClick={onClose} className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors" aria-label="Close panel">
//                 <X className="w-3.5 h-3.5 text-muted-foreground" />
//               </button>
//             </div>

//             {/* Identity card */}
//             <div className="px-5 pt-4 pb-3 flex-shrink-0">
//               <div className="rounded-xl border border-border/60 bg-secondary/20 overflow-hidden">
//                 <div className="h-1 w-full bg-primary/40" />
//                 <div className="p-4 flex items-center gap-4">
//                   <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base flex-shrink-0 border-2 border-background ring-1 ring-border/40">
//                     {getInitials(consultation.doctor.user.name)}
//                   </div>
//                   <div className="min-w-0 flex-1">
//                     <p className="font-semibold text-[14px] text-foreground leading-tight truncate">{consultation.doctor.user.name}</p>
//                     <p className="text-[11px] text-muted-foreground/70 mt-0.5">{consultation.primary_specialization ?? "No specialization"}</p>
//                     <div className="flex items-center gap-1.5 mt-1.5">
//                       <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium", activeStyle[String(consultation.is_active) as "true" | "false"])}>
//                         <span className={cn("w-1.5 h-1.5 rounded-full", activeDot[String(consultation.is_active) as "true" | "false"])} />
//                         {consultation.is_active ? "Active" : "Inactive"}
//                       </span>
//                       {hasExistingOverride && (
//                         <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900">
//                           <AlertCircle className="w-3 h-3" /> Override active
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Tabs */}
//             <div className="px-5 flex-shrink-0 border-b border-border/60">
//               <div className="flex gap-4">
//                 {(["details", "override"] as PanelTab[]).map((t) => (
//                   <button
//                     key={t}
//                     onClick={() => setTab(t)}
//                     className={cn(
//                       "pb-2.5 text-[11px] font-medium border-b-2 transition-colors",
//                       tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
//                     )}
//                   >
//                     {t === "details" ? "Details" : "Fee Override"}
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {/* Body */}
//             <div className="flex-1 overflow-y-auto px-5 py-5">
//               {tab === "details" ? (
//                 <div className="space-y-4">
//                   <div className="grid grid-cols-2 gap-2.5">
//                     <InfoTile icon={<Hash className="w-3.5 h-3.5" />}       label="Doctor ID"     value={`#${consultation.doctor_id}`} />
//                     <InfoTile icon={<Phone className="w-3.5 h-3.5" />}      label="Phone"         value={consultation.doctor.user.phone ?? "—"} />
//                     <InfoTile icon={<DollarSign className="w-3.5 h-3.5" />} label="Online fee"    value={fmt(consultation.specialization_fee?.online_fee ?? null)} />
//                     <InfoTile icon={<DollarSign className="w-3.5 h-3.5" />} label="In-person fee" value={fmt(consultation.specialization_fee?.in_person_fee ?? null)} />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Primary Specialization</label>
//                     <input type="text" value={primarySpec} onChange={(e) => setPrimarySpec(e.target.value)} placeholder="e.g. Cardiology" className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
//                       Secondary Specialization
//                       <span className="ml-1 normal-case text-muted-foreground/50 font-normal">(optional)</span>
//                     </label>
//                     <input type="text" value={secondarySpec} onChange={(e) => setSecondarySpec(e.target.value)} placeholder="e.g. Internal Medicine" className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
//                   </div>
//                   <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-secondary/30">
//                     <div>
//                       <p className="text-[12px] font-medium text-foreground">Active</p>
//                       <p className="text-[10px] text-muted-foreground/60 mt-0.5">Inactive doctors won't be bookable</p>
//                     </div>
//                     <button onClick={() => setIsActive((v) => !v)} className="text-primary hover:text-primary/80 transition-colors">
//                       {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />}
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {hasExistingOverride && (
//                     <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/60 flex items-start gap-2">
//                       <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
//                       <div>
//                         <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Override is currently active</p>
//                         {consultation.override_reason && <p className="text-[10px] text-amber-600/80 dark:text-amber-500 mt-0.5">"{consultation.override_reason}"</p>}
//                       </div>
//                     </div>
//                   )}
//                   {consultation.specialization_fee && (
//                     <div className="grid grid-cols-2 gap-2.5">
//                       <InfoTile icon={<DollarSign className="w-3.5 h-3.5" />} label="Base online"    value={fmt(consultation.specialization_fee.online_fee)} />
//                       <InfoTile icon={<DollarSign className="w-3.5 h-3.5" />} label="Base in-person" value={fmt(consultation.specialization_fee.in_person_fee)} />
//                     </div>
//                   )}
//                   <div>
//                     <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Online Fee Override (RWF)</label>
//                     <input type="number" min="0" value={onlineFee} onChange={(e) => setOnlineFee(e.target.value)} placeholder="Leave empty to use base rate" className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all font-mono" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">In-Person Fee Override (RWF)</label>
//                     <input type="number" min="0" value={inPersonFee} onChange={(e) => setInPersonFee(e.target.value)} placeholder="Leave empty to use base rate" className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all font-mono" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
//                       Reason
//                       <span className="ml-1 normal-case text-muted-foreground/50 font-normal">(optional)</span>
//                     </label>
//                     <input type="text" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. Senior consultant discount" className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Footer */}
//             <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
//               {tab === "details" ? (
//                 <>
//                   <Button className="w-full h-10 text-[12px] rounded-lg gap-2" onClick={handleSaveDetails} disabled={isSavingDetails}>
//                     {isSavingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
//                     {isSavingDetails ? "Saving…" : "Save changes"}
//                   </Button>
//                   <Button variant="ghost" className="w-full h-9 text-[12px] rounded-lg text-muted-foreground" onClick={onClose} disabled={isSavingDetails}>Cancel</Button>
//                 </>
//               ) : (
//                 <>
//                   <Button className="w-full h-10 text-[12px] rounded-lg gap-2" onClick={handleSaveOverride} disabled={isSavingOverride}>
//                     {isSavingOverride ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
//                     {isSavingOverride ? "Applying…" : "Apply override"}
//                   </Button>
//                   {hasExistingOverride && (
//                     <Button variant="outline" className="w-full h-9 text-[12px] rounded-lg gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30" onClick={handleClearOverride} disabled={isSavingOverride}>
//                       {isSavingOverride ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
//                       Clear override
//                     </Button>
//                   )}
//                   <Button variant="ghost" className="w-full h-9 text-[12px] rounded-lg text-muted-foreground" onClick={onClose} disabled={isSavingOverride}>Cancel</Button>
//                 </>
//               )}
//             </div>
//           </>
//         )}
//       </div>
//     </>
//   );
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────

// function ManageInstantDoctors() {
//   const { t } = useTranslation();
//   const [filters, setFilters]         = useState<FilterState>(INITIAL_FILTERS);
//   const [selected, setSelected]       = useState<ApiDoctorConsultation | null>(null);
//   const [assignOpen, setAssignOpen]   = useState(false);
//   const [filterOpen, setFilterOpen]   = useState(false);
//   const [searchInput, setSearchInput] = useState("");

//   useEffect(() => {
//     const timer = setTimeout(() => set("search", searchInput), 400);
//     return () => clearTimeout(timer);
//   }, [searchInput]);

//   const { data, isLoading, isError, refetch, isFetching } = useGetDoctorConsultations();
//   const allConsultations = data?.doctor_consultations ?? [];

//   const filtered = useMemo(() => {
//     let list = allConsultations;

//     if (filters.status !== "all")
//       list = list.filter((c) => filters.status === "active" ? c.is_active : !c.is_active);

//     if (filters.override !== "all")
//       list = list.filter((c) =>
//         filters.override === "overridden"
//           ? c.online_fee_override !== null || c.in_person_fee_override !== null
//           : c.online_fee_override === null && c.in_person_fee_override === null,
//       );

//     if (filters.search.trim()) {
//       const q = filters.search.toLowerCase();
//       list = list.filter((c) =>
//         c.doctor.user.name.toLowerCase().includes(q) ||
//         (c.primary_specialization ?? "").toLowerCase().includes(q) ||
//         (c.secondary_specialization ?? "").toLowerCase().includes(q) ||
//         (c.doctor.user.phone ?? "").includes(q),
//       );
//     }

//     return [...list].sort((a, b) => {
//       if (filters.sort === "fee-asc")  return (resolvedFee(a).online ?? 0) - (resolvedFee(b).online ?? 0);
//       if (filters.sort === "fee-desc") return (resolvedFee(b).online ?? 0) - (resolvedFee(a).online ?? 0);
//       return a.doctor.user.name.localeCompare(b.doctor.user.name);
//     });
//   }, [allConsultations, filters]);

//   const totalPages    = Math.ceil(filtered.length / PAGE_SIZE);
//   const paginated     = filtered.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE);
//   const total         = allConsultations.length;
//   const activeCount   = allConsultations.filter((c) => c.is_active).length;
//   const inactiveCount = allConsultations.filter((c) => !c.is_active).length;
//   const overrideCount = allConsultations.filter((c) => c.online_fee_override !== null || c.in_person_fee_override !== null).length;

//   const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
//     setFilters((prev) => ({ ...prev, [key]: value, ...(key !== "page" ? { page: 1 } : {}) }));
//   }, []);

//   const clearAll = useCallback(() => { setFilters(INITIAL_FILTERS); setSearchInput(""); }, []);

//   const hasActiveFilters = useMemo(
//     () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
//     [filters],
//   );

//   useEffect(() => {
//     document.body.style.overflow = filterOpen ? "hidden" : "";
//     return () => { document.body.style.overflow = ""; };
//   }, [filterOpen]);

//   const sidebarContent = (
//     <>
//       <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
//         <div className="flex items-center gap-2">
//           <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
//             <SlidersHorizontal className="w-3 h-3 text-primary" />
//           </div>
//           <span className="text-[11px] font-semibold text-foreground">Filters</span>
//         </div>
//         {hasActiveFilters && (
//           <button onClick={clearAll} className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
//             <X className="w-3 h-3" />Reset all
//           </button>
//         )}
//       </div>
//       <div className="px-3.5">
//         <FilterSection title="Status">
//           <PillGroup<StatusFilter>
//             value={filters.status}
//             onChange={(v) => set("status", v)}
//             options={[
//               { value: "all",      label: "All" },
//               { value: "active",   label: "Active",   count: activeCount },
//               { value: "inactive", label: "Inactive", count: inactiveCount },
//             ]}
//           />
//         </FilterSection>
//         <FilterSection title="Fee">
//           <PillGroup<OverrideFilter>
//             value={filters.override}
//             onChange={(v) => set("override", v)}
//             options={[
//               { value: "all",        label: "All" },
//               { value: "overridden", label: "Override active", count: overrideCount },
//               { value: "base_rate",  label: "Base rate only" },
//             ]}
//           />
//         </FilterSection>
//       </div>
//     </>
//   );

//   return (
//     <DashboardLayout role="admin">
//       <div className="flex flex-col h-full">
//         <PageHeader
//           title={t("pages.instant_doctors.overview_title")}
//           subtitle={t("pages.instant_doctors.overview_sub")}
//         />

//         <div className="flex flex-1 min-h-0 overflow-hidden">
//           {/* Desktop sidebar */}
//           <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
//             {sidebarContent}
//           </aside>

//           {/* Mobile backdrop */}
//           <div
//             onClick={() => setFilterOpen(false)}
//             className={cn("fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300", filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}
//           />

//           {/* Mobile bottom-sheet */}
//           <div
//             className={cn(
//               "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-2xl border-t border-border max-h-[85dvh] flex flex-col overflow-hidden transition-transform duration-300 ease-out",
//               filterOpen ? "translate-y-0" : "translate-y-full",
//             )}
//           >
//             <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
//               <div className="w-10 h-1 rounded-full bg-border" />
//             </div>
//             <div className="overflow-y-auto flex-1">{sidebarContent}</div>
//             <div className="flex-shrink-0 px-4 py-4 border-t border-border">
//               <button onClick={() => setFilterOpen(false)} className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors">
//                 Show results
//               </button>
//             </div>
//           </div>

//           {/* ── Main ── */}
//           <main className="flex-1 overflow-y-auto">
//             {/* Stats */}
//             <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
//               <StatCard label="Total consultations" value={total}         icon={Stethoscope}  accent="primary" />
//               <StatCard label="Active"              value={activeCount}   icon={CheckCircle2} accent="success" />
//               <StatCard label="Inactive"            value={inactiveCount} icon={XCircle}      accent="warning" />
//               <StatCard label="With override"       value={overrideCount} icon={DollarSign}   accent="warning" />
//             </div>

//             {/* Mobile search */}
//             <div className="sm:hidden px-3 pt-3">
//               <div className="relative">
//                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
//                 <input
//                   type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
//                   placeholder="Search name, specialization, phone…"
//                   className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
//                 />
//                 {searchInput && (
//                   <button onClick={() => setSearchInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
//                     <X className="w-3.5 h-3.5" />
//                   </button>
//                 )}
//               </div>
//             </div>

//             {/* Meta bar */}
//             <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
//               <div className="flex items-center gap-2 min-w-0">
//                 <p className="text-[11px] text-muted-foreground shrink-0">
//                   {isLoading ? <span className="text-muted-foreground/50">Loading…</span> : (
//                     <><span className="font-bold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "record" : "records"}</>
//                   )}
//                   {hasActiveFilters && (
//                     <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors">Reset</button>
//                   )}
//                 </p>
//                 {overrideCount > 0 && (
//                   <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm shrink-0">
//                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{overrideCount} overridden
//                   </span>
//                 )}
//               </div>

//               <div className="flex items-center gap-2 shrink-0">
//                 {/* Desktop search */}
//                 <div className="relative hidden sm:block">
//                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
//                   <input
//                     type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
//                     placeholder="Search name, specialization…"
//                     className="w-52 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
//                   />
//                 </div>

//                 {/* Sort */}
//                 <div className="relative">
//                   <select value={filters.sort} onChange={(e) => set("sort", e.target.value as SortOption)} className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[130px] sm:max-w-none">
//                     {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
//                   </select>
//                   <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
//                 </div>

//                 {/* Refresh */}
//                 <button onClick={() => refetch()} disabled={isFetching} className="hidden sm:flex p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 transition-colors" title="Refresh">
//                   <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
//                 </button>

//                 {/* Assign button */}
//                 <Button size="sm" className="h-8 px-3 text-[11px] rounded-sm gap-1.5" onClick={() => setAssignOpen(true)}>
//                   <Plus className="w-3.5 h-3.5" />
//                   <span className="hidden sm:inline">Assign doctor</span>
//                   <span className="sm:hidden">Assign</span>
//                 </Button>

//                 {/* Mobile filter button */}
//                 <button
//                   onClick={() => setFilterOpen(true)}
//                   className={cn("md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-colors", hasActiveFilters ? "bg-primary text-white border-primary" : "border-border/60 text-muted-foreground bg-card")}
//                 >
//                   <SlidersHorizontal className="w-3.5 h-3.5" />
//                   {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
//                 </button>
//               </div>
//             </div>

//             {/* Content */}
//             <div className="p-3 sm:p-4">
//               {isError ? (
//                 <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
//                   <p className="text-[12px] font-semibold text-destructive">Failed to load consultations</p>
//                   <p className="text-[11px] text-muted-foreground/70">Check your connection and try again</p>
//                 </div>
//               ) : !isLoading && paginated.length === 0 ? (
//                 <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
//                   <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
//                     <Stethoscope className="w-6 h-6 text-muted-foreground/50" />
//                   </div>
//                   <div>
//                     <p className="text-[12px] font-semibold text-foreground">
//                       {hasActiveFilters ? "No records match your filters" : "No consultations yet"}
//                     </p>
//                     <p className="text-[11px] text-muted-foreground/70 mt-1">
//                       {hasActiveFilters ? "Try widening your search criteria" : "Assign doctors to start managing consultations"}
//                     </p>
//                   </div>
//                   {hasActiveFilters ? (
//                     <button onClick={clearAll} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
//                       Clear all filters
//                     </button>
//                   ) : (
//                     <Button size="sm" className="mt-1 h-8 px-4 text-[11px] rounded-sm gap-1.5" onClick={() => setAssignOpen(true)}>
//                       <Plus className="w-3.5 h-3.5" />Assign first doctor
//                     </Button>
//                   )}
//                 </div>
//               ) : (
//                 <>
//                   {/* Desktop table */}
//                   <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
//                     <table className="w-full text-[11px]">
//                       <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
//                         <tr>
//                           <th className="text-left px-4 py-3 font-semibold">Doctor</th>
//                           <th className="text-left px-4 py-3 font-semibold">Specialization</th>
//                           <th className="text-left px-4 py-3 font-semibold">Online Fee</th>
//                           <th className="text-left px-4 py-3 font-semibold">In-Person Fee</th>
//                           <th className="text-left px-4 py-3 font-semibold">Status</th>
//                           <th className="px-4 py-3" />
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {isLoading ? <SkeletonRows /> : paginated.map((c) => (
//                           <ConsultationRow key={c.id} c={c} onManage={setSelected} />
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>

//                   {/* Mobile cards */}
//                   <div className="md:hidden flex flex-col gap-2">
//                     {isLoading
//                       ? Array.from({ length: 4 }).map((_, i) => (
//                           <div key={i} className="h-24 rounded-sm border border-border/60 bg-card animate-pulse" />
//                         ))
//                       : paginated.map((c) => (
//                           <ConsultationCard key={c.id} c={c} onManage={setSelected} />
//                         ))}
//                   </div>

//                   {/* Pagination */}
//                   {totalPages > 1 && (
//                     <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
//                       <p className="text-[11px] text-muted-foreground">
//                         Page <span className="font-semibold text-foreground">{filters.page}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
//                       </p>
//                       <div className="flex items-center gap-1.5">
//                         <button disabled={filters.page <= 1} onClick={() => set("page", filters.page - 1)} className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
//                           <ChevronLeft className="w-3.5 h-3.5" />
//                         </button>
//                         <button disabled={filters.page >= totalPages} onClick={() => set("page", filters.page + 1)} className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
//                           <ChevronRight className="w-3.5 h-3.5" />
//                         </button>
//                       </div>
//                     </div>
//                   )}
//                 </>
//               )}
//             </div>
//           </main>
//         </div>
//       </div>

//       <AssignPanel       open={assignOpen}   onClose={() => setAssignOpen(false)} />
//       <ConsultationPanel consultation={selected} onClose={() => setSelected(null)} />
//     </DashboardLayout>
//   );
// }

// export default ManageInstantDoctors;




import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope, CheckCircle2, XCircle, SlidersHorizontal, X, Search,
  ChevronLeft, ChevronRight, Loader2, Hash, Phone, Pencil, DollarSign,
  AlertCircle, ToggleLeft, ToggleRight, Ban, RefreshCw, Plus, ChevronDown, Zap,
} from "lucide-react";

import {
  useGetDoctorConsultations, useAssignDoctorConsultation,
  useUpdateDoctorConsultation, useSetFeeOverride, useToggleInstantConsultation,
  type ApiDoctorConsultation,
} from "@/hooks/admin/use-doctor-insitant";
import { useGetAdminDoctors, type ApiDoctor } from "@/hooks/admin/use-admin-doctors";
import { useGetSpecializationFees } from "@/hooks/admin/use-admin-specializations";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter   = "all" | "active" | "inactive";
type OverrideFilter = "all" | "overridden" | "base_rate";
type InstantFilter  = "all" | "instant" | "non_instant";
type SortOption     = "name" | "fee-asc" | "fee-desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name",     label: "Name (A–Z)" },
  { value: "fee-asc",  label: "Online fee: Low → High" },
  { value: "fee-desc", label: "Online fee: High → Low" },
];

interface FilterState {
  search: string; status: StatusFilter; override: OverrideFilter;
  instant: InstantFilter; sort: SortOption; page: number;
}

const PAGE_SIZE = 20;
const INITIAL_FILTERS: FilterState = {
  search: "", status: "all", override: "all", instant: "all", sort: "name", page: 1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function resolvedFee(c: ApiDoctorConsultation) {
  return {
    online:   c.online_fee_override   ?? c.specialization_fee?.online_fee   ?? null,
    inPerson: c.in_person_fee_override ?? c.specialization_fee?.in_person_fee ?? null,
  };
}
function fmt(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString() + " RWF";
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const activeStyle = {
  true:  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  false: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};
const activeDot = { true: "bg-emerald-500", false: "bg-red-500" };
const instantStyle = {
  true:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  false: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/30 dark:text-slate-500 dark:border-slate-800",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn("px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left flex items-center justify-between",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30")}>
          <span>{o.label}</span>
          {o.count !== undefined && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
              value === o.value ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

const InfoTile = ({ icon, label, value, highlight }: {
  icon: React.ReactNode; label: string; value: string | number; highlight?: boolean;
}) => (
  <div className={cn("p-3 rounded-lg border bg-secondary/30",
    highlight ? "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60" : "border-border/60")}>
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">{icon}{label}</div>
    <p className={cn("text-[13px] font-medium truncate",
      highlight ? "text-amber-700 dark:text-amber-400" : "text-foreground")}>{value}</p>
  </div>
);

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-muted/60 rounded animate-pulse"
                style={{ width: j === 0 ? "140px" : j === 6 ? "60px" : "90px" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── InstantToggleButton ──────────────────────────────────────────────────────

function InstantToggleButton({ doctorId, isInstant, compact = false }: {
  doctorId: number; isInstant: boolean; compact?: boolean;
}) {
  const { toast } = useToast();
  const toggleMutation = useToggleInstantConsultation();
  const isPending = toggleMutation.isPending;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleMutation.mutateAsync({ doctor_id: doctorId, active: !isInstant });
      toast({ title: res.message });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  if (compact) {
    return (
      <button onClick={handleToggle} disabled={isPending}
        title={isInstant ? "Disable instant consultation" : "Enable instant consultation"}
        className={cn(
          "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-sm border font-medium transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isInstant
            ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900"
            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
        )}>
        {isPending
          ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
          : <Zap className={cn("w-2.5 h-2.5", isInstant && "fill-blue-500 text-blue-500 dark:fill-blue-400 dark:text-blue-400")} />
        }
        {isInstant ? "Instant" : "Off"}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-secondary/30">
      <div>
        <p className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
          <Zap className={cn("w-3.5 h-3.5", isInstant ? "text-blue-500 fill-blue-500" : "text-muted-foreground/40")} />
          Instant Consultation
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {isInstant ? "Doctor appears in instant consultation pool" : "Doctor is not available for instant calls"}
        </p>
      </div>
      <button onClick={handleToggle} disabled={isPending}
        className="disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {isPending
          ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          : isInstant
            ? <ToggleRight className="w-8 h-8 text-blue-500" />
            : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />
        }
      </button>
    </div>
  );
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

function ConsultationRow({ c, onManage }: { c: ApiDoctorConsultation; onManage: (c: ApiDoctorConsultation) => void }) {
  const fees = resolvedFee(c);
  const hasOverride = c.online_fee_override !== null || c.in_person_fee_override !== null;
  const key = String(c.is_active) as "true" | "false";

  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
            {getInitials(c.doctor.user.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">{c.doctor.user.name}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate">{c.doctor.user.phone ?? "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-[11px] text-foreground truncate">{c.primary_specialization ?? <span className="text-muted-foreground/40">—</span>}</p>
        {c.secondary_specialization && <p className="text-[10px] text-muted-foreground/60 truncate">{c.secondary_specialization}</p>}
      </td>
      <td className="px-4 py-3">
        <p className={cn("font-mono text-[11px] font-medium", hasOverride && c.online_fee_override !== null ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>{fmt(fees.online)}</p>
        {hasOverride && c.online_fee_override !== null && c.specialization_fee && (
          <p className="text-[10px] text-muted-foreground/50 line-through font-mono">{fmt(c.specialization_fee.online_fee)}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className={cn("font-mono text-[11px] font-medium", hasOverride && c.in_person_fee_override !== null ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>{fmt(fees.inPerson)}</p>
        {hasOverride && c.in_person_fee_override !== null && c.specialization_fee && (
          <p className="text-[10px] text-muted-foreground/50 line-through font-mono">{fmt(c.specialization_fee.in_person_fee)}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <InstantToggleButton doctorId={c.doctor_id} isInstant={c.doctor.instant_consultation} compact />
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium", activeStyle[key])}>
          <span className={cn("w-1 h-1 rounded-full mr-1", activeDot[key])} />
          {c.is_active ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <Button size="sm" variant="outline"
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(c)}>
          Manage
        </Button>
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function ConsultationCard({ c, onManage }: { c: ApiDoctorConsultation; onManage: (c: ApiDoctorConsultation) => void }) {
  const fees = resolvedFee(c);
  const hasOverride = c.online_fee_override !== null || c.in_person_fee_override !== null;
  const key = String(c.is_active) as "true" | "false";

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 border border-primary/20">
        {getInitials(c.doctor.user.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{c.doctor.user.name}</p>
            <p className="text-[10px] text-muted-foreground/60">{c.primary_specialization ?? "—"}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <InstantToggleButton doctorId={c.doctor_id} isInstant={c.doctor.instant_consultation} compact />
            <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize", activeStyle[key])}>
              <span className={cn("w-1 h-1 rounded-full mr-1", activeDot[key])} />
              {c.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className={cn("font-mono text-[10px] font-medium", hasOverride ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70")}>
            Online: {fmt(fees.online)}
          </span>
          <span className={cn("font-mono text-[10px] font-medium", hasOverride ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70")}>
            In-person: {fmt(fees.inPerson)}
          </span>
          {hasOverride && (
            <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-1.5 py-0.5 rounded-sm">
              Override
            </span>
          )}
        </div>
        <Button size="sm" variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(c)}>
          Manage
        </Button>
      </div>
    </div>
  );
}

// ─── Assign Panel ─────────────────────────────────────────────────────────────

function AssignPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [doctorSearch, setDoctorSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor]   = useState<ApiDoctor | null>(null);
  const [showDoctorList, setShowDoctorList]   = useState(false);
  const [selectedFeeId, setSelectedFeeId]     = useState<number | null>(null);
  const [primarySpec,   setPrimarySpec]       = useState("");
  const [secondarySpec, setSecondarySpec]     = useState("");

  const assignMutation = useAssignDoctorConsultation();
  const isSaving = assignMutation.isPending;

  const { data: doctorData, isLoading: doctorsLoading } = useGetAdminDoctors({
    status: "active", search: debouncedSearch || undefined, page: 1,
  });
  const doctors = doctorData?.data ?? [];
  const { data: feesData, isLoading: feesLoading } = useGetSpecializationFees();
  const activeFees = (feesData ?? []).filter((f) => f.is_active);
  const selectedFee = activeFees.find((f) => f.id === selectedFeeId) ?? null;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(doctorSearch), 350);
    return () => clearTimeout(t);
  }, [doctorSearch]);

  useEffect(() => {
    if (open) {
      setDoctorSearch(""); setDebouncedSearch(""); setSelectedDoctor(null);
      setPrimarySpec(""); setSecondarySpec(""); setShowDoctorList(false); setSelectedFeeId(null);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedDoctor) { toast({ title: "Select a doctor", variant: "destructive" }); return; }
    if (!selectedFeeId)  { toast({ title: "Select a fee tier", variant: "destructive" }); return; }
    if (!primarySpec.trim()) { toast({ title: "Primary specialization is required", variant: "destructive" }); return; }
    try {
      await assignMutation.mutateAsync({
        doctor_id: selectedDoctor.id, specialization_fee_id: selectedFeeId,
        primary_specialization: primarySpec.trim(),
        secondary_specialization: secondarySpec.trim() || undefined,
      });
      toast({ title: "Doctor assigned to consultation." });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <>
      <div onClick={onClose} className={cn("fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} />
      <div className={cn("fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] lg:w-[460px]",
        "bg-card border-l border-border/60 flex flex-col transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "translate-x-full")}>
        {open && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">Assign doctor</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Add a doctor to the consultation pool</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Doctor picker */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Doctor <span className="text-red-500">*</span>
                </label>
                {selectedDoctor ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
                      {getInitials(selectedDoctor.user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[12px] text-foreground truncate">{selectedDoctor.user.name}</p>
                      <p className="text-[10px] text-muted-foreground/60">{selectedDoctor.specialization ?? selectedDoctor.user.email ?? "—"}</p>
                    </div>
                    <button onClick={() => { setSelectedDoctor(null); setDoctorSearch(""); }} className="text-muted-foreground/50 hover:text-foreground transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input type="text" value={doctorSearch}
                      onChange={(e) => { setDoctorSearch(e.target.value); setShowDoctorList(true); }}
                      onFocus={() => setShowDoctorList(true)} placeholder="Search by name…"
                      className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
                    {showDoctorList && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border/60 rounded-sm shadow-lg max-h-48 overflow-y-auto">
                        {doctorsLoading
                          ? <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                          : doctors.length === 0
                            ? <p className="text-[11px] text-muted-foreground/60 px-3 py-3 text-center">No active doctors found</p>
                            : doctors.map((d) => (
                              <button key={d.id}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/30 transition-colors text-left"
                                onClick={() => { setSelectedDoctor(d); setShowDoctorList(false); setDoctorSearch(""); }}>
                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px] shrink-0 border border-primary/20">
                                  {getInitials(d.user.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-medium text-foreground truncate">{d.user.name}</p>
                                  <p className="text-[10px] text-muted-foreground/60 truncate">{d.specialization ?? d.user.email ?? "—"}</p>
                                </div>
                              </button>
                            ))
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Fee tier */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                  Fee Tier <span className="text-red-500">*</span>
                </label>
                {feesLoading
                  ? <div className="flex items-center gap-2 py-2 text-[11px] text-muted-foreground/60"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading fee tiers…</div>
                  : activeFees.length === 0
                    ? <div className="flex items-start gap-2 p-3 rounded-lg border border-border/60 bg-secondary/20 text-[11px] text-muted-foreground"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>No active fee tiers found. Create one in Specialization Fees first.</span></div>
                    : (
                      <>
                        <div className="relative">
                          <select value={selectedFeeId ?? ""} onChange={(e) => setSelectedFeeId(Number(e.target.value) || null)}
                            className="w-full appearance-none px-3 pr-8 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer">
                            <option value="">Select fee tier…</option>
                            {activeFees.map((f) => (<option key={f.id} value={f.id}>{f.specialization} — {f.online_fee.toLocaleString()} / {f.in_person_fee.toLocaleString()} {f.currency}</option>))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
                        </div>
                        {selectedFee && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="p-2.5 rounded-lg border border-border/60 bg-secondary/30"><p className="text-[10px] text-muted-foreground mb-1">Online</p><p className="text-[12px] font-medium font-mono text-foreground">{selectedFee.online_fee.toLocaleString()} {selectedFee.currency}</p></div>
                            <div className="p-2.5 rounded-lg border border-border/60 bg-secondary/30"><p className="text-[10px] text-muted-foreground mb-1">In-person</p><p className="text-[12px] font-medium font-mono text-foreground">{selectedFee.in_person_fee.toLocaleString()} {selectedFee.currency}</p></div>
                          </div>
                        )}
                      </>
                    )
                }
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Primary Specialization <span className="text-red-500">*</span></label>
                <input type="text" value={primarySpec} onChange={(e) => setPrimarySpec(e.target.value)} placeholder="e.g. Cardiology"
                  className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Secondary Specialization <span className="ml-1 normal-case text-muted-foreground/50 font-normal">(optional)</span></label>
                <input type="text" value={secondarySpec} onChange={(e) => setSecondarySpec(e.target.value)} placeholder="e.g. Internal Medicine"
                  className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
              </div>
            </div>
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <Button className="w-full h-10 text-[12px] rounded-lg gap-2" onClick={handleSubmit}
                disabled={isSaving || !selectedDoctor || !selectedFeeId || !primarySpec.trim()}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isSaving ? "Assigning…" : "Assign doctor"}
              </Button>
              <Button variant="ghost" className="w-full h-9 text-[12px] rounded-lg text-muted-foreground" onClick={onClose} disabled={isSaving}>Cancel</Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Manage Panel ─────────────────────────────────────────────────────────────

type PanelTab = "details" | "override";

function ConsultationPanel({ consultation, onClose }: { consultation: ApiDoctorConsultation | null; onClose: () => void }) {
  const open = !!consultation;
  const { toast } = useToast();
  const [tab, setTab] = useState<PanelTab>("details");
  const [primarySpec,    setPrimarySpec]    = useState("");
  const [secondarySpec,  setSecondarySpec]  = useState("");
  const [isActive,       setIsActive]       = useState(true);
  const [onlineFee,      setOnlineFee]      = useState("");
  const [inPersonFee,    setInPersonFee]    = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const updateMutation   = useUpdateDoctorConsultation();
  const overrideMutation = useSetFeeOverride();
  const isSavingDetails  = updateMutation.isPending;
  const isSavingOverride = overrideMutation.isPending;

  useEffect(() => {
    if (consultation) {
      setPrimarySpec(consultation.primary_specialization ?? "");
      setSecondarySpec(consultation.secondary_specialization ?? "");
      setIsActive(consultation.is_active);
      setOnlineFee(consultation.online_fee_override !== null ? String(consultation.online_fee_override) : "");
      setInPersonFee(consultation.in_person_fee_override !== null ? String(consultation.in_person_fee_override) : "");
      setOverrideReason(consultation.override_reason ?? "");
      setTab("details");
    }
  }, [consultation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSaveDetails = async () => {
    if (!consultation) return;
    try {
      await updateMutation.mutateAsync({
        doctor_id: consultation.doctor_id,
        primary_specialization:   primarySpec.trim()   || undefined,
        secondary_specialization: secondarySpec.trim() || undefined,
        is_active: isActive,
      });
      toast({ title: "Consultation updated." });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleSaveOverride = async () => {
    if (!consultation) return;
    const onlineVal   = onlineFee.trim()   ? Number(onlineFee)   : null;
    const inPersonVal = inPersonFee.trim() ? Number(inPersonFee) : null;
    if ((onlineFee.trim() && isNaN(onlineVal!)) || (inPersonFee.trim() && isNaN(inPersonVal!))) {
      toast({ title: "Enter valid numeric fee values", variant: "destructive" }); return;
    }
    try {
      const res = await overrideMutation.mutateAsync({
        doctor_id: consultation.doctor_id,
        online_fee_override: onlineVal, in_person_fee_override: inPersonVal,
        override_reason: overrideReason.trim() || null,
      });
      toast({ title: res.message });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleClearOverride = async () => {
    if (!consultation) return;
    try {
      const res = await overrideMutation.mutateAsync({
        doctor_id: consultation.doctor_id,
        online_fee_override: null, in_person_fee_override: null, override_reason: null,
      });
      toast({ title: res.message });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  const hasExistingOverride = consultation
    ? consultation.online_fee_override !== null || consultation.in_person_fee_override !== null
    : false;

  return (
    <>
      <div onClick={onClose} className={cn("fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} />
      <div className={cn("fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] lg:w-[460px]",
        "bg-card border-l border-border/60 flex flex-col transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "translate-x-full")}>
        {consultation && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">Manage consultation</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Update details or set fee override</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Identity card */}
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="rounded-xl border border-border/60 bg-secondary/20 overflow-hidden">
                <div className="h-1 w-full bg-primary/40" />
                <div className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base flex-shrink-0 border-2 border-background ring-1 ring-border/40">
                    {getInitials(consultation.doctor.user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[14px] text-foreground leading-tight truncate">{consultation.doctor.user.name}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">{consultation.primary_specialization ?? "No specialization"}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                        activeStyle[String(consultation.is_active) as "true" | "false"])}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", activeDot[String(consultation.is_active) as "true" | "false"])} />
                        {consultation.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                        instantStyle[String(consultation.doctor.instant_consultation) as "true" | "false"])}>
                        <Zap className={cn("w-2.5 h-2.5",
                          consultation.doctor.instant_consultation ? "fill-blue-500 text-blue-500 dark:fill-blue-400" : "text-slate-400")} />
                        {consultation.doctor.instant_consultation ? "Instant on" : "Instant off"}
                      </span>
                      {hasExistingOverride && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900">
                          <AlertCircle className="w-3 h-3" /> Override active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 flex-shrink-0 border-b border-border/60">
              <div className="flex gap-4">
                {(["details", "override"] as PanelTab[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={cn("pb-2.5 text-[11px] font-medium border-b-2 transition-colors",
                      tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                    {t === "details" ? "Details" : "Fee Override"}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {tab === "details" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    <InfoTile icon={<Hash className="w-3.5 h-3.5" />}       label="Doctor ID"     value={`#${consultation.doctor_id}`} />
                    <InfoTile icon={<Phone className="w-3.5 h-3.5" />}      label="Phone"         value={consultation.doctor.user.phone ?? "—"} />
                    <InfoTile icon={<DollarSign className="w-3.5 h-3.5" />} label="Online fee"    value={fmt(consultation.specialization_fee?.online_fee ?? null)} />
                    <InfoTile icon={<DollarSign className="w-3.5 h-3.5" />} label="In-person fee" value={fmt(consultation.specialization_fee?.in_person_fee ?? null)} />
                  </div>

                  {/* ── Instant toggle ── lives here, fires API independently ── */}
                  <InstantToggleButton
                    doctorId={consultation.doctor_id}
                    isInstant={consultation.doctor.instant_consultation}
                  />

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Primary Specialization</label>
                    <input type="text" value={primarySpec} onChange={(e) => setPrimarySpec(e.target.value)} placeholder="e.g. Cardiology"
                      className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                      Secondary Specialization <span className="ml-1 normal-case text-muted-foreground/50 font-normal">(optional)</span>
                    </label>
                    <input type="text" value={secondarySpec} onChange={(e) => setSecondarySpec(e.target.value)} placeholder="e.g. Internal Medicine"
                      className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-secondary/30">
                    <div>
                      <p className="text-[12px] font-medium text-foreground">Active</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Inactive doctors won't be bookable</p>
                    </div>
                    <button onClick={() => setIsActive((v) => !v)} className="text-primary hover:text-primary/80 transition-colors">
                      {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {hasExistingOverride && (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/60 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Override is currently active</p>
                        {consultation.override_reason && <p className="text-[10px] text-amber-600/80 dark:text-amber-500 mt-0.5">"{consultation.override_reason}"</p>}
                      </div>
                    </div>
                  )}
                  {consultation.specialization_fee && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <InfoTile icon={<DollarSign className="w-3.5 h-3.5" />} label="Base online"    value={fmt(consultation.specialization_fee.online_fee)} />
                      <InfoTile icon={<DollarSign className="w-3.5 h-3.5" />} label="Base in-person" value={fmt(consultation.specialization_fee.in_person_fee)} />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">Online Fee Override (RWF)</label>
                    <input type="number" min="0" value={onlineFee} onChange={(e) => setOnlineFee(e.target.value)} placeholder="Leave empty to use base rate"
                      className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">In-Person Fee Override (RWF)</label>
                    <input type="number" min="0" value={inPersonFee} onChange={(e) => setInPersonFee(e.target.value)} placeholder="Leave empty to use base rate"
                      className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
                      Reason <span className="ml-1 normal-case text-muted-foreground/50 font-normal">(optional)</span>
                    </label>
                    <input type="text" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. Senior consultant discount"
                      className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              {tab === "details" ? (
                <>
                  <Button className="w-full h-10 text-[12px] rounded-lg gap-2" onClick={handleSaveDetails} disabled={isSavingDetails}>
                    {isSavingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    {isSavingDetails ? "Saving…" : "Save changes"}
                  </Button>
                  <Button variant="ghost" className="w-full h-9 text-[12px] rounded-lg text-muted-foreground" onClick={onClose} disabled={isSavingDetails}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button className="w-full h-10 text-[12px] rounded-lg gap-2" onClick={handleSaveOverride} disabled={isSavingOverride}>
                    {isSavingOverride ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                    {isSavingOverride ? "Applying…" : "Apply override"}
                  </Button>
                  {hasExistingOverride && (
                    <Button variant="outline"
                      className="w-full h-9 text-[12px] rounded-lg gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                      onClick={handleClearOverride} disabled={isSavingOverride}>
                      {isSavingOverride ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      Clear override
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full h-9 text-[12px] rounded-lg text-muted-foreground" onClick={onClose} disabled={isSavingOverride}>Cancel</Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageInstantDoctors() {
  const { t } = useTranslation();
  const [filters, setFilters]         = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected]       = useState<ApiDoctorConsultation | null>(null);
  const [assignOpen, setAssignOpen]   = useState(false);
  const [filterOpen, setFilterOpen]   = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, ...(key !== "page" ? { page: 1 } : {}) }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => set("search", searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput, set]);

  const { data, isLoading, isError, refetch, isFetching } = useGetDoctorConsultations();
  const allConsultations = data?.doctor_consultations ?? [];

  const filtered = useMemo(() => {
    let list = allConsultations;

    if (filters.status !== "all")
      list = list.filter((c) => filters.status === "active" ? c.is_active : !c.is_active);

    if (filters.override !== "all")
      list = list.filter((c) =>
        filters.override === "overridden"
          ? c.online_fee_override !== null || c.in_person_fee_override !== null
          : c.online_fee_override === null && c.in_person_fee_override === null,
      );

    if (filters.instant !== "all")
      list = list.filter((c) =>
        filters.instant === "instant" ? c.doctor.instant_consultation : !c.doctor.instant_consultation,
      );

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter((c) =>
        c.doctor.user.name.toLowerCase().includes(q) ||
        (c.primary_specialization ?? "").toLowerCase().includes(q) ||
        (c.secondary_specialization ?? "").toLowerCase().includes(q) ||
        (c.doctor.user.phone ?? "").includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (filters.sort === "fee-asc")  return (resolvedFee(a).online ?? 0) - (resolvedFee(b).online ?? 0);
      if (filters.sort === "fee-desc") return (resolvedFee(b).online ?? 0) - (resolvedFee(a).online ?? 0);
      return a.doctor.user.name.localeCompare(b.doctor.user.name);
    });
  }, [allConsultations, filters]);

  const totalPages    = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated     = filtered.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE);
  const total         = allConsultations.length;
  const activeCount   = allConsultations.filter((c) => c.is_active).length;
  const inactiveCount = allConsultations.filter((c) => !c.is_active).length;
  const overrideCount = allConsultations.filter((c) => c.online_fee_override !== null || c.in_person_fee_override !== null).length;
  const instantCount  = allConsultations.filter((c) => c.doctor.instant_consultation).length;

  const clearAll = useCallback(() => { setFilters(INITIAL_FILTERS); setSearchInput(""); }, []);
  const hasActiveFilters = useMemo(() => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS), [filters]);

  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const sidebarContent = (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" />Reset all
          </button>
        )}
      </div>
      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<StatusFilter> value={filters.status} onChange={(v) => set("status", v)}
            options={[
              { value: "all",      label: "All" },
              { value: "active",   label: "Active",   count: activeCount },
              { value: "inactive", label: "Inactive", count: inactiveCount },
            ]} />
        </FilterSection>
        <FilterSection title="Instant Consultation">
          <PillGroup<InstantFilter> value={filters.instant} onChange={(v) => set("instant", v)}
            options={[
              { value: "all",         label: "All" },
              { value: "instant",     label: "Instant enabled",  count: instantCount },
              { value: "non_instant", label: "Instant disabled", count: total - instantCount },
            ]} />
        </FilterSection>
        <FilterSection title="Fee">
          <PillGroup<OverrideFilter> value={filters.override} onChange={(v) => set("override", v)}
            options={[
              { value: "all",        label: "All" },
              { value: "overridden", label: "Override active", count: overrideCount },
              { value: "base_rate",  label: "Base rate only" },
            ]} />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.instant_doctors.overview_title")}
          subtitle={t("pages.instant_doctors.overview_sub")}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          <div onClick={() => setFilterOpen(false)}
            className={cn("fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} />

          <div className={cn("fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-2xl border-t border-border max-h-[85dvh] flex flex-col overflow-hidden transition-transform duration-300 ease-out",
            filterOpen ? "translate-y-0" : "translate-y-full")}>
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-4 border-t border-border">
              <button onClick={() => setFilterOpen(false)} className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors">Show results</button>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto">
            {/* Stats */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Total consultations" value={total}         icon={Stethoscope}  accent="primary" />
              <StatCard label="Active"              value={activeCount}   icon={CheckCircle2} accent="success" />
              <StatCard label="Inactive"            value={inactiveCount} icon={XCircle}      accent="warning" />
              <StatCard label="Instant enabled"     value={instantCount}  icon={Zap}          accent="primary" />
            </div>

            {/* Mobile search */}
            <div className="sm:hidden px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, specialization, phone…"
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
                {searchInput && <button onClick={() => setSearchInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
              </div>
            </div>

            {/* Meta bar */}
            <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-[11px] text-muted-foreground shrink-0">
                  {isLoading ? <span className="text-muted-foreground/50">Loading…</span> : (
                    <><span className="font-bold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "record" : "records"}</>
                  )}
                  {hasActiveFilters && <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors">Reset</button>}
                </p>
                {instantCount > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900 px-2 py-0.5 rounded-sm shrink-0">
                    <Zap className="w-2.5 h-2.5 fill-blue-500 text-blue-500 dark:fill-blue-400" />{instantCount} instant
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search name, specialization…"
                    className="w-52 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
                </div>
                <div className="relative">
                  <select value={filters.sort} onChange={(e) => set("sort", e.target.value as SortOption)}
                    className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-[130px] sm:max-w-none">
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>
                <button onClick={() => refetch()} disabled={isFetching}
                  className="hidden sm:flex p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 transition-colors" title="Refresh">
                  <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
                </button>
                <Button size="sm" className="h-8 px-3 text-[11px] rounded-sm gap-1.5" onClick={() => setAssignOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Assign doctor</span>
                  <span className="sm:hidden">Assign</span>
                </Button>
                <button onClick={() => setFilterOpen(true)}
                  className={cn("md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-colors",
                    hasActiveFilters ? "bg-primary text-white border-primary" : "border-border/60 text-muted-foreground bg-card")}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              {isError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <p className="text-[12px] font-semibold text-destructive">Failed to load consultations</p>
                  <p className="text-[11px] text-muted-foreground/70">Check your connection and try again</p>
                </div>
              ) : !isLoading && paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Stethoscope className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">{hasActiveFilters ? "No records match your filters" : "No consultations yet"}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">{hasActiveFilters ? "Try widening your search criteria" : "Assign doctors to start managing consultations"}</p>
                  </div>
                  {hasActiveFilters
                    ? <button onClick={clearAll} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">Clear all filters</button>
                    : <Button size="sm" className="mt-1 h-8 px-4 text-[11px] rounded-sm gap-1.5" onClick={() => setAssignOpen(true)}><Plus className="w-3.5 h-3.5" />Assign first doctor</Button>
                  }
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-[11px]">
                      <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Doctor</th>
                          <th className="text-left px-4 py-3 font-semibold">Specialization</th>
                          <th className="text-left px-4 py-3 font-semibold">Online Fee</th>
                          <th className="text-left px-4 py-3 font-semibold">In-Person Fee</th>
                          <th className="text-left px-4 py-3 font-semibold">Instant</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? <SkeletonRows /> : paginated.map((c) => (
                          <ConsultationRow key={c.id} c={c} onManage={setSelected} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden flex flex-col gap-2">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-sm border border-border/60 bg-card animate-pulse" />)
                      : paginated.map((c) => <ConsultationCard key={c.id} c={c} onManage={setSelected} />)
                    }
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                      <p className="text-[11px] text-muted-foreground">
                        Page <span className="font-semibold text-foreground">{filters.page}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button disabled={filters.page <= 1} onClick={() => set("page", filters.page - 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button disabled={filters.page >= totalPages} onClick={() => set("page", filters.page + 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <AssignPanel       open={assignOpen} onClose={() => setAssignOpen(false)} />
      <ConsultationPanel consultation={selected} onClose={() => setSelected(null)} />
    </DashboardLayout>
  );
}

export default ManageInstantDoctors;

