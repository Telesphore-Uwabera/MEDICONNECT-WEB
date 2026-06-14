// import { useMemo, useState, useCallback, useEffect, useRef } from "react";
// import { useTranslation } from "react-i18next";
// import { DashboardLayout } from "@/components/DashboardLayout";
// import { StatCard } from "@/components/StatCard";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import {
//   ShieldOff,
//   ShieldCheck,
//   Building2,
//   Clock,
//   CheckCircle2,
//   XCircle,
//   SlidersHorizontal,
//   X,
//   Search,
//   ChevronDown,
//   ChevronLeft,
//   ChevronRight,
//   Loader2,
//   Users,
//   LayoutGrid,
//   Stethoscope,
//   Calendar,
//   Hash,
//   BadgeCheck,
//   Ban,
// } from "lucide-react";
// import {
//   useGetAdminHospitals,
//   useApproveHospital,
//   useRejectHospital,
//   useSuspendHospital,
//   type ApiHospital,
// } from "@/hooks/admin/use-admin-hospitals";
// import { useToast } from "@/hooks/use-toast";
// import { cn } from "@/lib/utils";
// import { PageHeader } from "@/components/PageHeader";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type StatusFilter = "all" | "active" | "pending" | "suspended" | "rejected";
// type TypeFilter   = "all" | "private" | "public" | "ngo";
// type SortOption   = "name" | "joined-desc" | "joined-asc";

// const SORT_OPTIONS: { value: SortOption; label: string }[] = [
//   { value: "joined-desc", label: "Joined: Newest first" },
//   { value: "joined-asc",  label: "Joined: Oldest first" },
//   { value: "name",        label: "Name (A–Z)" },
// ];

// interface FilterState {
//   search: string;
//   status: StatusFilter;
//   type:   TypeFilter;
//   sort:   SortOption;
//   page:   number;
// }

// const INITIAL_FILTERS: FilterState = {
//   search: "",
//   status: "all",
//   type:   "all",
//   sort:   "joined-desc",
//   page:   1,
// };

// // ─── Style maps ───────────────────────────────────────────────────────────────

// const statusStyle: Record<string, string> = {
//   active:
//     "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
//   pending:
//     "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
//   suspended:
//     "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
//   rejected: "bg-muted text-muted-foreground border-border",
// };

// const STATUS_DOT: Record<string, string> = {
//   active:    "bg-emerald-500",
//   pending:   "bg-amber-500",
//   suspended: "bg-red-500",
//   rejected:  "bg-muted-foreground",
// };

// const typeStyle: Record<string, string> = {
//   private: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
//   public:  "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
//   ngo:     "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900",
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function getInitials(name: string) {
//   return name
//     .split(" ")
//     .map((n) => n[0])
//     .join("")
//     .slice(0, 2)
//     .toUpperCase();
// }

// function getErrorMessage(error: unknown): string {
//   if (error instanceof Error) return error.message;
//   return "Something went wrong";
// }

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function FilterSection({
//   title,
//   children,
// }: {
//   title: string;
//   children: React.ReactNode;
// }) {
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
//             <span
//               className={cn(
//                 "text-[10px] px-1.5 py-0.5 rounded-full",
//                 value === o.value
//                   ? "bg-white/20 text-white"
//                   : "bg-secondary text-muted-foreground",
//               )}
//             >
//               {o.count}
//             </span>
//           )}
//         </button>
//       ))}
//     </div>
//   );
// }

// // ─── Desktop row ──────────────────────────────────────────────────────────────

// function HospitalRow({
//   h,
//   onManage,
// }: {
//   h: ApiHospital;
//   onManage: (h: ApiHospital) => void;
// }) {
//   return (
//     <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
//       <td className="px-4 py-3">
//         <div className="flex items-center gap-3">
//           <div className="h-9 w-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
//             {getInitials(h.name_en)}
//           </div>
//           <div className="min-w-0">
//             <p className="font-semibold text-[11px] text-foreground truncate">
//               {h.name_en}
//             </p>
//             <p className="text-[10px] text-muted-foreground/70 truncate">
//               {h.user?.name ?? "—"}
//             </p>
//           </div>
//         </div>
//       </td>

//       <td className="px-4 py-3">
//         {h.type ? (
//           <Badge
//             variant="outline"
//             className={cn(
//               "border text-[9px] px-1.5 py-0 font-medium capitalize",
//               typeStyle[h.type] ?? "bg-muted text-muted-foreground border-border",
//             )}
//           >
//             {h.type}
//           </Badge>
//         ) : (
//           <span className="text-muted-foreground/40 text-[11px]">—</span>
//         )}
//       </td>

//       <td className="px-4 py-3">
//         <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80">
//           <span className="flex items-center gap-1">
//             <Stethoscope className="w-3 h-3" />
//             {h.doctors_count}
//           </span>
//           <span className="flex items-center gap-1">
//             <LayoutGrid className="w-3 h-3" />
//             {h.departments_count}
//           </span>
//         </div>
//       </td>

//       <td className="px-4 py-3">
//         <Badge
//           variant="outline"
//           className={cn(
//             "border text-[9px] px-1.5 py-0 font-medium capitalize",
//             statusStyle[h.status],
//           )}
//         >
//           <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[h.status])} />
//           {h.status}
//         </Badge>
//       </td>

//       <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
//         {new Date(h.created_at).toLocaleDateString()}
//       </td>

//       <td className="px-4 py-3 text-right">
//         <Button
//           size="sm"
//           variant="outline"
//           className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
//           onClick={() => onManage(h)}
//         >
//           Manage
//         </Button>
//       </td>
//     </tr>
//   );
// }

// // ─── Mobile card ──────────────────────────────────────────────────────────────

// function HospitalCard({
//   h,
//   onManage,
// }: {
//   h: ApiHospital;
//   onManage: (h: ApiHospital) => void;
// }) {
//   return (
//     <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
//       <div className="h-9 w-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 border border-primary/20">
//         {getInitials(h.name_en)}
//       </div>
//       <div className="flex-1 min-w-0">
//         <div className="flex items-start justify-between gap-2">
//           <div className="min-w-0">
//             <p className="font-semibold text-[12px] text-foreground truncate">
//               {h.name_en}
//             </p>
//             <p className="text-[10px] text-muted-foreground/70 truncate">
//               {h.user?.name ?? "—"}
//             </p>
//           </div>
//           <Badge
//             variant="outline"
//             className={cn(
//               "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
//               statusStyle[h.status],
//             )}
//           >
//             <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[h.status])} />
//             {h.status}
//           </Badge>
//         </div>
//         <div className="flex items-center gap-2 mt-1.5 flex-wrap">
//           {h.type && (
//             <Badge
//               variant="outline"
//               className={cn(
//                 "border text-[9px] px-1.5 py-0 font-medium capitalize",
//                 typeStyle[h.type] ?? "bg-muted text-muted-foreground border-border",
//               )}
//             >
//               {h.type}
//             </Badge>
//           )}
//           <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
//             <Stethoscope className="w-3 h-3" />
//             {h.doctors_count} doctors
//           </span>
//           <span className="text-[10px] text-muted-foreground/50">
//             {new Date(h.created_at).toLocaleDateString()}
//           </span>
//         </div>
//         <Button
//           size="sm"
//           variant="outline"
//           className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
//           onClick={() => onManage(h)}
//         >
//           Manage
//         </Button>
//       </div>
//     </div>
//   );
// }

// // ─── Skeleton ─────────────────────────────────────────────────────────────────

// function SkeletonRows() {
//   return (
//     <>
//       {Array.from({ length: 6 }).map((_, i) => (
//         <tr key={i} className="border-t border-border/40">
//           {Array.from({ length: 6 }).map((_, j) => (
//             <td key={j} className="px-4 py-3">
//               <div
//                 className="h-4 bg-muted/60 rounded animate-pulse"
//                 style={{ width: j === 0 ? "140px" : j === 5 ? "60px" : "80px" }}
//               />
//             </td>
//           ))}
//         </tr>
//       ))}
//     </>
//   );
// }

// // ─── InfoTile ─────────────────────────────────────────────────────────────────

// const InfoTile = ({
//   icon,
//   label,
//   value,
// }: {
//   icon: React.ReactNode;
//   label: string;
//   value: string | number;
// }) => (
//   <div className="p-3 rounded-lg border border-border/60 bg-secondary/30">
//     <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
//       {icon}
//       {label}
//     </div>
//     <p className="text-[13px] font-medium text-foreground truncate">{value}</p>
//   </div>
// );

// // ─── Hospital Panel ───────────────────────────────────────────────────────────

// function HospitalPanel({
//   hospital,
//   onClose,
//   onApprove,
//   onReject,
//   onSuspend,
//   isActing,
// }: {
//   hospital: ApiHospital | null;
//   onClose: () => void;
//   onApprove: (h: ApiHospital) => void;
//   onReject:  (h: ApiHospital) => void;
//   onSuspend: (h: ApiHospital) => void;
//   isActing: boolean;
// }) {
//   const panelRef = useRef<HTMLDivElement>(null);
//   const open = !!hospital;

//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape" && open) onClose();
//     };
//     document.addEventListener("keydown", onKey);
//     return () => document.removeEventListener("keydown", onKey);
//   }, [open, onClose]);

//   useEffect(() => {
//     document.body.style.overflow = open ? "hidden" : "";
//     return () => { document.body.style.overflow = ""; };
//   }, [open]);

//   return (
//     <>
//       {/* Backdrop */}
//       <div
//         onClick={onClose}
//         className={cn(
//           "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
//           open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
//         )}
//       />

//       {/* Panel */}
//       <div
//         ref={panelRef}
//         className={cn(
//           "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] lg:w-[440px]",
//           "bg-card border-l border-border/60 flex flex-col",
//           "transition-transform duration-300 ease-out",
//           open ? "translate-x-0" : "translate-x-full",
//         )}
//       >
//         {hospital && (
//           <>
//             {/* Header */}
//             <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
//               <div>
//                 <p className="text-[14px] font-semibold text-foreground leading-tight">
//                   Manage hospital
//                 </p>
//                 <p className="text-[11px] text-muted-foreground mt-0.5">
//                   Review details & update status
//                 </p>
//               </div>
//               <button
//                 onClick={onClose}
//                 className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
//                 aria-label="Close panel"
//               >
//                 <X className="w-3.5 h-3.5 text-muted-foreground" />
//               </button>
//             </div>

//             {/* Body */}
//             <div className="flex-1 overflow-y-auto">
//               <div className="px-5 py-5 space-y-4">

//                 {/* Identity card */}
//                 <div className="rounded-xl border border-border/60 bg-secondary/20 overflow-hidden">
//                   <div className="h-1 w-full bg-primary/40" />
//                   <div className="p-4 flex items-start gap-4">
//                     <div className="h-16 w-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0 border-2 border-background ring-1 ring-border/40">
//                       {getInitials(hospital.name_en)}
//                     </div>
//                     <div className="min-w-0 flex-1 pt-0.5">
//                       <p className="font-semibold text-[15px] text-foreground leading-tight truncate">
//                         {hospital.name_en}
//                       </p>
//                       <p className="text-[12px] text-muted-foreground truncate mt-0.5">
//                         Admin: {hospital.user?.name ?? "—"}
//                       </p>
//                       <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
//                         {/* Type badge */}
//                         {hospital.type && (
//                           <span
//                             className={cn(
//                               "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize",
//                               typeStyle[hospital.type] ?? "bg-secondary text-foreground border-border/60",
//                             )}
//                           >
//                             <Building2 className="h-3 w-3" />
//                             {hospital.type}
//                           </span>
//                         )}

//                         {/* Status badge */}
//                         <span
//                           className={cn(
//                             "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
//                             statusStyle[hospital.status],
//                           )}
//                         >
//                           <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[hospital.status])} />
//                           {hospital.status}
//                         </span>

//                         {/* Verified badge */}
//                         {hospital.verified_at && (
//                           <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium bg-secondary text-muted-foreground border-border/60">
//                             <ShieldCheck className="h-3 w-3" />
//                             Verified
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Stats grid */}
//                 <div className="grid grid-cols-3 gap-2">
//                   <InfoTile
//                     icon={<Stethoscope className="w-3.5 h-3.5" />}
//                     label="Doctors"
//                     value={hospital.doctors_count}
//                   />
//                   <InfoTile
//                     icon={<LayoutGrid className="w-3.5 h-3.5" />}
//                     label="Departments"
//                     value={hospital.departments_count}
//                   />
//                   <InfoTile
//                     icon={<Users className="w-3.5 h-3.5" />}
//                     label="Services"
//                     value={hospital.services_count}
//                   />
//                 </div>

//                 {/* Details grid */}
//                 <div className="grid grid-cols-2 gap-2.5">
//                   <InfoTile
//                     icon={<Calendar className="w-3.5 h-3.5" />}
//                     label="Joined"
//                     value={new Date(hospital.created_at).toLocaleDateString()}
//                   />
//                   <InfoTile
//                     icon={<Hash className="w-3.5 h-3.5" />}
//                     label="Hospital ID"
//                     value={`#${hospital.id}`}
//                   />
//                   {hospital.verified_at && (
//                     <InfoTile
//                       icon={<BadgeCheck className="w-3.5 h-3.5" />}
//                       label="Verified at"
//                       value={new Date(hospital.verified_at).toLocaleDateString()}
//                     />
//                   )}
//                 </div>

//               </div>
//             </div>

//             {/* Footer — context-aware action buttons */}
//             <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">

//               {/* Approve — shown when pending or rejected */}
//               {(hospital.status === "pending" || hospital.status === "rejected") && (
//                 <Button
//                   variant="outline"
//                   className="w-full h-10 text-[12px] rounded-lg gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
//                   disabled={isActing}
//                   onClick={() => onApprove(hospital)}
//                 >
//                   {isActing ? (
//                     <Loader2 className="h-4 w-4 animate-spin" />
//                   ) : (
//                     <ShieldCheck className="h-4 w-4" />
//                   )}
//                   Approve hospital
//                 </Button>
//               )}

//               {/* Suspend — shown when active */}
//               {hospital.status === "active" && (
//                 <Button
//                   variant="outline"
//                   className="w-full h-10 text-[12px] rounded-lg gap-2"
//                   disabled={isActing}
//                   onClick={() => onSuspend(hospital)}
//                 >
//                   {isActing ? (
//                     <Loader2 className="h-4 w-4 animate-spin" />
//                   ) : (
//                     <ShieldOff className="h-4 w-4" />
//                   )}
//                   Suspend hospital
//                 </Button>
//               )}

//               {/* Reject — shown when pending */}
//               {hospital.status === "pending" && (
//                 <Button
//                   variant="outline"
//                   className="w-full h-10 text-[12px] rounded-lg gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
//                   disabled={isActing}
//                   onClick={() => onReject(hospital)}
//                 >
//                   {isActing ? (
//                     <Loader2 className="h-4 w-4 animate-spin" />
//                   ) : (
//                     <Ban className="h-4 w-4" />
//                   )}
//                   Reject hospital
//                 </Button>
//               )}

//               {/* Reactivate — shown when suspended */}
//               {hospital.status === "suspended" && (
//                 <Button
//                   variant="outline"
//                   className="w-full h-10 text-[12px] rounded-lg gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
//                   disabled={isActing}
//                   onClick={() => onApprove(hospital)}
//                 >
//                   {isActing ? (
//                     <Loader2 className="h-4 w-4 animate-spin" />
//                   ) : (
//                     <ShieldCheck className="h-4 w-4" />
//                   )}
//                   Reactivate hospital
//                 </Button>
//               )}

//               <Button
//                 variant="ghost"
//                 className="w-full h-9 text-[12px] rounded-lg text-muted-foreground"
//                 onClick={onClose}
//               >
//                 Close
//               </Button>
//             </div>
//           </>
//         )}
//       </div>
//     </>
//   );
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────

// function ManageHospitals() {
//   const { t } = useTranslation();
//   const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
//   const [selected, setSelected]     = useState<ApiHospital | null>(null);
//   const [filterOpen, setFilterOpen] = useState(false);
//   const { toast } = useToast();

//   // Debounced search
//   const [searchInput, setSearchInput] = useState("");
//   useEffect(() => {
//     const timer = setTimeout(() => set("search", searchInput), 400);
//     return () => clearTimeout(timer);
//   }, [searchInput]);

//   // ── API ──
//   const { data, isLoading, isError } = useGetAdminHospitals({
//     status: filters.status !== "all" ? filters.status : undefined,
//     type:   filters.type   !== "all" ? filters.type   : undefined,
//     search: filters.search || undefined,
//     page:   filters.page,
//   });

//   const approveMutation = useApproveHospital();
//   const rejectMutation  = useRejectHospital();
//   const suspendMutation = useSuspendHospital();

//   const hospitals  = data?.data      ?? [];
//   const total      = data?.total     ?? 0;
//   const perPage    = data?.per_page  ?? 20;
//   const totalPages = Math.ceil(total / perPage);

//   const statusCounts = useMemo(() => {
//     const counts: Record<string, number> = {};
//     hospitals.forEach((h) => {
//       counts[h.status] = (counts[h.status] ?? 0) + 1;
//     });
//     return counts;
//   }, [hospitals]);

//   const typeCounts = useMemo(() => {
//     const counts: Record<string, number> = {};
//     hospitals.forEach((h) => {
//       if (h.type) counts[h.type] = (counts[h.type] ?? 0) + 1;
//     });
//     return counts;
//   }, [hospitals]);

//   // Client-side sort
//   const sorted = useMemo(() => {
//     return [...hospitals].sort((a, b) => {
//       switch (filters.sort) {
//         case "joined-asc":
//           return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
//         case "name":
//           return a.name_en.localeCompare(b.name_en);
//         default:
//           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
//       }
//     });
//   }, [hospitals, filters.sort]);

//   const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
//     setFilters((prev) => ({
//       ...prev,
//       [key]: value,
//       ...(key !== "page" ? { page: 1 } : {}),
//     }));
//   }, []);

//   const clearAll = useCallback(() => {
//     setFilters(INITIAL_FILTERS);
//     setSearchInput("");
//   }, []);

//   const hasActiveFilters = useMemo(
//     () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
//     [filters],
//   );

//   useEffect(() => {
//     if (filterOpen) document.body.style.overflow = "hidden";
//     else document.body.style.overflow = "";
//     return () => { document.body.style.overflow = ""; };
//   }, [filterOpen]);

//   // ── Actions ──
//   const handleApprove = useCallback(async (h: ApiHospital) => {
//     try {
//       await approveMutation.mutateAsync(h.id);
//       setSelected((prev) => prev ? { ...prev, status: "active", verified_at: new Date().toISOString() } : null);
//       toast({ title: "Hospital approved." });
//     } catch (error: unknown) {
//       toast({ title: getErrorMessage(error), variant: "destructive" });
//     }
//   }, [approveMutation, toast]);

//   const handleReject = useCallback(async (h: ApiHospital) => {
//     try {
//       await rejectMutation.mutateAsync({ id: h.id });
//       setSelected((prev) => prev ? { ...prev, status: "rejected", verified_at: null } : null);
//       toast({ title: "Hospital rejected." });
//     } catch (error: unknown) {
//       toast({ title: getErrorMessage(error), variant: "destructive" });
//     }
//   }, [rejectMutation, toast]);

//   const handleSuspend = useCallback(async (h: ApiHospital) => {
//     try {
//       await suspendMutation.mutateAsync({ id: h.id });
//       setSelected((prev) => prev ? { ...prev, status: "suspended" } : null);
//       toast({ title: "Hospital suspended." });
//     } catch (error: unknown) {
//       toast({ title: getErrorMessage(error), variant: "destructive" });
//     }
//   }, [suspendMutation, toast]);

//   const isActing =
//     approveMutation.isPending ||
//     rejectMutation.isPending  ||
//     suspendMutation.isPending;

//   const pendingCount = statusCounts["pending"] ?? 0;

//   // ── Sidebar content (shared between desktop sidebar & mobile sheet) ──
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
//           <button
//             onClick={clearAll}
//             className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
//           >
//             <X className="w-3 h-3" />
//             Reset all
//           </button>
//         )}
//       </div>

//       <div className="px-3.5">
//         <FilterSection title="Status">
//           <PillGroup<StatusFilter>
//             value={filters.status}
//             onChange={(v) => set("status", v)}
//             options={[
//               { value: "all",       label: "All" },
//               { value: "active",    label: "Active",    count: statusCounts["active"]    ?? 0 },
//               { value: "pending",   label: "Pending",   count: statusCounts["pending"]   ?? 0 },
//               { value: "suspended", label: "Suspended", count: statusCounts["suspended"] ?? 0 },
//               { value: "rejected",  label: "Rejected",  count: statusCounts["rejected"]  ?? 0 },
//             ]}
//           />
//         </FilterSection>

//         <FilterSection title="Type">
//           <PillGroup<TypeFilter>
//             value={filters.type}
//             onChange={(v) => set("type", v)}
//             options={[
//               { value: "all",     label: "All types" },
//               { value: "private", label: "Private", count: typeCounts["private"] ?? 0 },
//               { value: "public",  label: "Public",  count: typeCounts["public"]  ?? 0 },
//               { value: "ngo",     label: "NGO",     count: typeCounts["ngo"]     ?? 0 },
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
//           title={t("pages.admin.overview_title")}
//           subtitle={t("pages.admin.overview_sub")}
//         />

//         <div className="flex flex-1 min-h-0 overflow-hidden">
//           {/* Desktop sidebar */}
//           <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
//             {sidebarContent}
//           </aside>

//           {/* Mobile backdrop */}
//           <div
//             onClick={() => setFilterOpen(false)}
//             className={cn(
//               "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
//               filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
//             )}
//           />

//           {/* Mobile bottom-sheet */}
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
//                 className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors"
//               >
//                 Show results
//               </button>
//             </div>
//           </div>

//           {/* ── Main ── */}
//           <main className="flex-1 overflow-y-auto">
//             {/* Stats */}
//             <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
//               <StatCard
//                 label="Total hospitals"
//                 value={total}
//                 icon={Building2}
//                 accent="primary"
//               />
//               <StatCard
//                 label="Active"
//                 value={statusCounts["active"] ?? 0}
//                 icon={CheckCircle2}
//                 accent="success"
//               />
//               <StatCard
//                 label="Pending review"
//                 value={statusCounts["pending"] ?? 0}
//                 icon={Clock}
//                 accent="warning"
//               />
//               <StatCard
//                 label="Suspended"
//                 value={statusCounts["suspended"] ?? 0}
//                 icon={XCircle}
//                 accent="warning"
//               />
//             </div>

//             {/* Mobile search */}
//             <div className="sm:hidden px-3 pt-3">
//               <div className="relative">
//                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
//                 <input
//                   type="text"
//                   value={searchInput}
//                   onChange={(e) => setSearchInput(e.target.value)}
//                   placeholder="Search name, email, phone…"
//                   className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
//                 />
//                 {searchInput && (
//                   <button
//                     onClick={() => setSearchInput("")}
//                     className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
//                   >
//                     <X className="w-3.5 h-3.5" />
//                   </button>
//                 )}
//               </div>
//             </div>

//             {/* Meta bar */}
//             <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
//               <div className="flex items-center gap-2 sm:gap-3 min-w-0">
//                 <p className="text-[11px] text-muted-foreground shrink-0">
//                   {isLoading ? (
//                     <span className="text-muted-foreground/50">Loading…</span>
//                   ) : (
//                     <>
//                       <span className="font-bold text-foreground">{total}</span>{" "}
//                       {total === 1 ? "hospital" : "hospitals"}
//                     </>
//                   )}
//                   {hasActiveFilters && (
//                     <button
//                       onClick={clearAll}
//                       className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
//                     >
//                       Reset
//                     </button>
//                   )}
//                 </p>

//                 {pendingCount > 0 && (
//                   <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm shrink-0">
//                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
//                     {pendingCount} pending
//                   </span>
//                 )}
//               </div>

//               <div className="flex items-center gap-2 shrink-0">
//                 {/* Desktop search */}
//                 <div className="relative hidden sm:block">
//                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
//                   <input
//                     type="text"
//                     value={searchInput}
//                     onChange={(e) => setSearchInput(e.target.value)}
//                     placeholder="Search name or admin…"
//                     className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
//                   />
//                 </div>

//                 {/* Sort */}
//                 <div className="relative">
//                   <select
//                     value={filters.sort}
//                     onChange={(e) => set("sort", e.target.value as SortOption)}
//                     className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
//                   >
//                     {SORT_OPTIONS.map((o) => (
//                       <option key={o.value} value={o.value}>
//                         {o.label}
//                       </option>
//                     ))}
//                   </select>
//                   <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
//                 </div>

//                 {/* Mobile filter button */}
//                 <button
//                   onClick={() => setFilterOpen(true)}
//                   className={cn(
//                     "md:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm border text-[11px] transition-colors",
//                     hasActiveFilters
//                       ? "bg-primary text-white border-primary"
//                       : "border-border/60 text-muted-foreground bg-card",
//                   )}
//                 >
//                   <SlidersHorizontal className="w-3.5 h-3.5" />
//                   <span className="hidden xs:inline">Filters</span>
//                   {hasActiveFilters && (
//                     <span className="w-1.5 h-1.5 rounded-full bg-white" />
//                   )}
//                 </button>
//               </div>
//             </div>

//             {/* Content */}
//             <div className="p-3 sm:p-4">
//               {isError ? (
//                 <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
//                   <p className="text-[12px] font-semibold text-destructive">
//                     Failed to load hospitals
//                   </p>
//                   <p className="text-[11px] text-muted-foreground/70">
//                     Check your connection and try again
//                   </p>
//                 </div>
//               ) : !isLoading && sorted.length === 0 ? (
//                 <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
//                   <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
//                     <Building2 className="w-6 h-6 text-muted-foreground/50" />
//                   </div>
//                   <div>
//                     <p className="text-[12px] font-semibold text-foreground">
//                       No hospitals match your filters
//                     </p>
//                     <p className="text-[11px] text-muted-foreground/70 mt-1">
//                       Try widening your search criteria
//                     </p>
//                   </div>
//                   <button
//                     onClick={clearAll}
//                     className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
//                   >
//                     Clear all filters
//                   </button>
//                 </div>
//               ) : (
//                 <>
//                   {/* Desktop table */}
//                   <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
//                     <table className="w-full text-[11px]">
//                       <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
//                         <tr>
//                           <th className="text-left px-4 py-3 font-semibold">Hospital</th>
//                           <th className="text-left px-4 py-3 font-semibold">Type</th>
//                           <th className="text-left px-4 py-3 font-semibold">Staff</th>
//                           <th className="text-left px-4 py-3 font-semibold">Status</th>
//                           <th className="text-left px-4 py-3 font-semibold">Joined</th>
//                           <th className="px-4 py-3" />
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {isLoading ? (
//                           <SkeletonRows />
//                         ) : (
//                           sorted.map((h) => (
//                             <HospitalRow key={h.id} h={h} onManage={setSelected} />
//                           ))
//                         )}
//                       </tbody>
//                     </table>
//                   </div>

//                   {/* Mobile cards */}
//                   <div className="md:hidden flex flex-col gap-2">
//                     {isLoading
//                       ? Array.from({ length: 4 }).map((_, i) => (
//                           <div
//                             key={i}
//                             className="h-24 rounded-sm border border-border/60 bg-card animate-pulse"
//                           />
//                         ))
//                       : sorted.map((h) => (
//                           <HospitalCard key={h.id} h={h} onManage={setSelected} />
//                         ))}
//                   </div>

//                   {/* Pagination */}
//                   {totalPages > 1 && (
//                     <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
//                       <p className="text-[11px] text-muted-foreground">
//                         Page{" "}
//                         <span className="font-semibold text-foreground">{filters.page}</span>{" "}
//                         of{" "}
//                         <span className="font-semibold text-foreground">{totalPages}</span>
//                       </p>
//                       <div className="flex items-center gap-1.5">
//                         <button
//                           disabled={filters.page <= 1}
//                           onClick={() => set("page", filters.page - 1)}
//                           className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//                         >
//                           <ChevronLeft className="w-3.5 h-3.5" />
//                         </button>
//                         <button
//                           disabled={filters.page >= totalPages}
//                           onClick={() => set("page", filters.page + 1)}
//                           className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//                         >
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

//       {/* Right-side panel */}
//       <HospitalPanel
//         hospital={selected}
//         onClose={() => setSelected(null)}
//         onApprove={handleApprove}
//         onReject={handleReject}
//         onSuspend={handleSuspend}
//         isActing={isActing}
//       />
//     </DashboardLayout>
//   );
// }

// export default ManageHospitals;


import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard }         from "@/components/StatCard";
import { PageHeader }       from "@/components/PageHeader";
import { Button }           from "@/components/ui/button";
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useGetAdminHospitals,
  useApproveHospital,
  useRejectHospital,
  useSuspendHospital,
  type ApiHospital,
} from "@/hooks/admin/use-admin-hospitals";
import { useToast } from "@/hooks/use-toast";
import { cn }       from "@/lib/utils";

import {
  type FilterState,
  type StatusFilter,
  type TypeFilter,
  type SortOption,
  INITIAL_FILTERS,
  SORT_OPTIONS,
} from "./components/hospital/Types";
import { FilterSection } from "./components/hospital/Filtersection";
import { PillGroup }     from "./components/hospital/Pillgroup";
import { HospitalRow }   from "./components/hospital/Hospitalrow";
import { HospitalCard }  from "./components/hospital/Hospitalcard";
import { SkeletonRows }  from "./components/hospital/Skeletonrows";
import { HospitalPanel } from "./components/hospital/Hospitalpanel";
import { getErrorMessage } from "./components/hospital/Utils";

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageHospitals() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected]     = useState<ApiHospital | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { toast } = useToast();

  // Debounced search value
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => set("search", searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── API ──
  const { data, isLoading, isError } = useGetAdminHospitals({
    status: filters.status !== "all" ? filters.status : undefined,
    type:   filters.type   !== "all" ? filters.type   : undefined,
    search: filters.search || undefined,
    page:   filters.page,
  });

  const approveMutation = useApproveHospital();
  const rejectMutation  = useRejectHospital();
  const suspendMutation = useSuspendHospital();

  const hospitals  = data?.data     ?? [];
  const total      = data?.total    ?? 0;
  const perPage    = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    hospitals.forEach((h) => { counts[h.status] = (counts[h.status] ?? 0) + 1; });
    return counts;
  }, [hospitals]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    hospitals.forEach((h) => { if (h.type) counts[h.type] = (counts[h.type] ?? 0) + 1; });
    return counts;
  }, [hospitals]);

  // Client-side sort
  const sorted = useMemo(() => {
    return [...hospitals].sort((a, b) => {
      switch (filters.sort) {
        case "joined-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return a.name_en.localeCompare(b.name_en);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [hospitals, filters.sort]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" ? { page: 1 } : {}),
    }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchInput("");
  }, []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  // Lock body scroll when mobile filter sheet is open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  // ── Actions ──
  const handleApprove = useCallback(async (h: ApiHospital) => {
    try {
      await approveMutation.mutateAsync(h.id);
      setSelected((prev) =>
        prev ? { ...prev, status: "active", verified_at: new Date().toISOString() } : null,
      );
      toast({ title: "Hospital approved." });
    } catch (error: unknown) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  }, [approveMutation, toast]);

  const handleReject = useCallback(async (h: ApiHospital) => {
    try {
      await rejectMutation.mutateAsync({ id: h.id });
      setSelected((prev) =>
        prev ? { ...prev, status: "rejected", verified_at: null } : null,
      );
      toast({ title: "Hospital rejected." });
    } catch (error: unknown) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  }, [rejectMutation, toast]);

  const handleSuspend = useCallback(async (h: ApiHospital) => {
    try {
      await suspendMutation.mutateAsync({ id: h.id });
      setSelected((prev) => prev ? { ...prev, status: "suspended" } : null);
      toast({ title: "Hospital suspended." });
    } catch (error: unknown) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  }, [suspendMutation, toast]);

  const isActing =
    approveMutation.isPending ||
    rejectMutation.isPending  ||
    suspendMutation.isPending;

  const pendingCount = statusCounts["pending"] ?? 0;

  // ── Sidebar content (shared: desktop sidebar + mobile bottom-sheet) ──
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
          <button
            onClick={clearAll}
            className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<StatusFilter>
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all",       label: "All" },
              { value: "active",    label: "Active",    count: statusCounts["active"]    ?? 0 },
              { value: "pending",   label: "Pending",   count: statusCounts["pending"]   ?? 0 },
              { value: "suspended", label: "Suspended", count: statusCounts["suspended"] ?? 0 },
              { value: "rejected",  label: "Rejected",  count: statusCounts["rejected"]  ?? 0 },
            ]}
          />
        </FilterSection>

        <FilterSection title="Type">
          <PillGroup<TypeFilter>
            value={filters.type}
            onChange={(v) => set("type", v)}
            options={[
              { value: "all",     label: "All types" },
              { value: "private", label: "Private", count: typeCounts["private"] ?? 0 },
              { value: "public",  label: "Public",  count: typeCounts["public"]  ?? 0 },
              { value: "ngo",     label: "NGO",     count: typeCounts["ngo"]     ?? 0 },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.overview_title")}
          subtitle={t("pages.admin.overview_sub")}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile filter backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile bottom-sheet */}
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
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors"
              >
                Show results
              </button>
            </div>
          </div>

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto">

            {/* Stat cards */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Total hospitals" value={total}                          icon={Building2}    accent="primary"  />
              <StatCard label="Active"          value={statusCounts["active"]    ?? 0} icon={CheckCircle2} accent="success"  />
              <StatCard label="Pending review"  value={statusCounts["pending"]   ?? 0} icon={Clock}        accent="warning"  />
              <StatCard label="Suspended"       value={statusCounts["suspended"] ?? 0} icon={XCircle}      accent="warning"  />
            </div>

            {/* Mobile search (below stat cards) */}
            <div className="sm:hidden px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sticky meta bar */}
            <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <p className="text-[11px] text-muted-foreground shrink-0">
                  {isLoading ? (
                    <span className="text-muted-foreground/50">Loading…</span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{total}</span>{" "}
                      {total === 1 ? "hospital" : "hospitals"}
                    </>
                  )}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </p>

                {pendingCount > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingCount} pending
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Desktop search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search name or admin…"
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Sort select */}
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => set("sort", e.target.value as SortOption)}
                    className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/* Mobile filter button */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm border text-[11px] transition-colors",
                    hasActiveFilters
                      ? "bg-primary text-white border-primary"
                      : "border-border/60 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Filters</span>
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="p-3 sm:p-4">
              {isError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <p className="text-[12px] font-semibold text-destructive">
                    Failed to load hospitals
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Check your connection and try again
                  </p>
                </div>
              ) : !isLoading && sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Building2 className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      No hospitals match your filters
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Try widening your search criteria
                    </p>
                  </div>
                  <button
                    onClick={clearAll}
                    className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-[11px]">
                      <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Hospital</th>
                          <th className="text-left px-4 py-3 font-semibold">Type</th>
                          <th className="text-left px-4 py-3 font-semibold">Staff</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="text-left px-4 py-3 font-semibold">Joined</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <SkeletonRows />
                        ) : (
                          sorted.map((h) => (
                            <HospitalRow key={h.id} h={h} onManage={setSelected} />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden flex flex-col gap-2">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-24 rounded-sm border border-border/60 bg-card animate-pulse"
                          />
                        ))
                      : sorted.map((h) => (
                          <HospitalCard key={h.id} h={h} onManage={setSelected} />
                        ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                      <p className="text-[11px] text-muted-foreground">
                        Page{" "}
                        <span className="font-semibold text-foreground">{filters.page}</span>
                        {" "}of{" "}
                        <span className="font-semibold text-foreground">{totalPages}</span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={filters.page <= 1}
                          onClick={() => set("page", filters.page - 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={filters.page >= totalPages}
                          onClick={() => set("page", filters.page + 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
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

      {/* Right-side panel */}
      <HospitalPanel
        hospital={selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onSuspend={handleSuspend}
        isActing={isActing}
      />
    </DashboardLayout>
  );
}

export default ManageHospitals;
