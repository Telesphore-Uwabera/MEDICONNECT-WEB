// import React, { useState, useRef, useEffect } from "react";
// import { useTranslation } from "react-i18next";
// import { useForm } from "react-hook-form";
// import { toast } from "sonner";
// import { DashboardLayout } from "@/components/DashboardLayout";
// import { PageHeader } from "@/components/PageHeader";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Switch } from "@/components/ui/switch";
// import { Skeleton } from "@/components/ui/skeleton";
// import { cn } from "@/lib/utils";
// import {
//   Building2,
//   MapPin,
//   Phone,
//   Clock,
//   Truck,
//   Plus,
//   Pencil,
//   Trash2,
//   Check,
//   Share2,
//   Calendar,
//   Facebook,
//   Twitter,
//   Instagram,
//   Globe,
//   Linkedin,
//   Link2,
//   Upload,
//   Image as ImageIcon,
//   AlertCircle,
//   RefreshCw,
//   X,
//   CalendarOff,
//   ChevronDown,
//   ChevronUp,
// } from "lucide-react";
// import {
//   useGetPharmacyProfile,
//   useCreateOrUpdateProfile,
//   useUploadLogo,
//   useUploadCoverImage,
//   useGetWorkingHours,
//   useSetWorkingHours,
//   useUpdateWorkingHour,
//   useDeleteWorkingHour,
//   useResetWorkingHours,
//   useGetClosures,
//   useCreateClosure,
//   useUpdateClosure,
//   useDeleteClosure,
//   useCheckClosureDate,
//   type PharmacyProfile,
//   type WorkingHourRecord,
//   type ClosureRecord,
//   type WorkingHourPayload,
// } from "@/hooks/pharmacy/use-pharmacy-profile";

// // ─────────────────────────────────────────────────────────────────────────────
// // Types
// // ─────────────────────────────────────────────────────────────────────────────
// interface WorkingHoursDay {
//   enabled: boolean;
//   opens_at: string;
//   closes_at: string;
// }

// interface WorkingHours {
//   monday: WorkingHoursDay;
//   tuesday: WorkingHoursDay;
//   wednesday: WorkingHoursDay;
//   thursday: WorkingHoursDay;
//   friday: WorkingHoursDay;
//   saturday: WorkingHoursDay;
//   sunday: WorkingHoursDay;
// }

// interface SocialLinks {
//   website: string;
//   facebook: string;
//   twitter: string;
//   instagram: string;
//   linkedin: string;
// }

// interface PharmacyProfileFormData {
//   name_en: string;
//   name_fr: string;
//   description_en: string;
//   registration_number: string;
//   address: string;
//   city: string;
//   province: string;
//   country: string;
//   latitude: string;
//   longitude: string;
//   phone: string;
//   email: string;
//   opens_at: string;
//   closes_at: string;
//   is_open_24h: boolean;
//   offers_delivery: boolean;
//   offers_pickup: boolean;
//   delivery_fee: string;
//   delivery_currency: string;
//   delivery_radius_km: string;
//   estimated_delivery_minutes: string;
//   working_hours: WorkingHours;
//   social_links: SocialLinks;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Constants
// // ─────────────────────────────────────────────────────────────────────────────
// const DAYS_OF_WEEK = [
//   "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
// ] as const;
// type DayKey = (typeof DAYS_OF_WEEK)[number];

// const DAY_LABELS: Record<DayKey, string> = {
//   monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
//   thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
// };

// const SOCIAL_PLATFORMS = [
//   { key: "website" as const, label: "Website", icon: Globe, placeholder: "https://medipharm.rw" },
//   { key: "facebook" as const, label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/medipharm" },
//   { key: "twitter" as const, label: "Twitter / X", icon: Twitter, placeholder: "https://twitter.com/medipharm" },
//   { key: "instagram" as const, label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/medipharm" },
//   { key: "linkedin" as const, label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/company/medipharm" },
// ];

// const DEFAULT_WORKING_HOURS: WorkingHours = {
//   monday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
//   tuesday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
//   wednesday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
//   thursday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
//   friday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
//   saturday: { enabled: true, opens_at: "09:00", closes_at: "15:00" },
//   sunday: { enabled: false, opens_at: "09:00", closes_at: "13:00" },
// };

// const DEFAULT_SOCIAL_LINKS: SocialLinks = {
//   website: "", facebook: "", twitter: "", instagram: "", linkedin: "",
// };

// const STEPS = [
//   { id: "general" as const, label: "General", icon: Building2, sectionTitle: "General information", description: "Name, registration & description" },
//   { id: "location" as const, label: "Location", icon: MapPin, sectionTitle: "Location", description: "Address, city, province & coordinates" },
//   { id: "contact" as const, label: "Contact", icon: Phone, sectionTitle: "Contact details", description: "Phone number & email" },
//   { id: "hours" as const, label: "Hours & Delivery", icon: Truck, sectionTitle: "Hours & delivery", description: "Opening hours & delivery settings" },
//   { id: "working_hours" as const, label: "Working Hours", icon: Calendar, sectionTitle: "Weekly working hours", description: "Per-day open/close schedule" },
//   { id: "social_links" as const, label: "Social Links", icon: Share2, sectionTitle: "Social media & web", description: "Website, Facebook, Instagram…" },
// ];

// // ─────────────────────────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────────────────────────
// const formatPhone = (p: string) =>
//   p?.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4") ?? p;

// const formatTime = (t: string) => {
//   if (!t) return "—";
//   const [h, m] = t.split(":").map(Number);
//   const ampm = h >= 12 ? "PM" : "AM";
//   return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
// };

// const getInitials = (name: string) =>
//   name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??";

// const formatDeliveryFee = (fee: string | number, currency: string) =>
//   `${currency} ${Number(fee).toLocaleString()}`;

// /** Convert API WorkingHourRecord[] → form WorkingHours shape */
// function apiHoursToForm(records: WorkingHourRecord[]): WorkingHours {
//   const base = { ...DEFAULT_WORKING_HOURS };
//   for (const r of records) {
//     const day = r.day_of_week as DayKey;
//     if (day in base) {
//       base[day] = {
//         enabled: !r.is_closed && r.is_active,
//         opens_at: r.open_time ?? "08:00",
//         closes_at: r.close_time ?? "18:00",
//       };
//     }
//   }
//   return base;
// }

// /** Convert API PharmacyProfile → form default values */
// function apiProfileToForm(p: PharmacyProfile): Partial<PharmacyProfileFormData> {
//   const links = p.social_links ?? {};
//   return {
//     name_en: p.name_en ?? "",
//     name_fr: p.name_fr ?? "",
//     description_en: p.description_en ?? "",
//     registration_number: p.registration_number ?? "",
//     address: p.address ?? "",
//     city: p.city ?? "",
//     province: p.province ?? "",
//     country: p.country ?? "",
//     latitude: p.latitude != null ? String(p.latitude) : "",
//     longitude: p.longitude != null ? String(p.longitude) : "",
//     phone: p.phone ?? "",
//     email: p.email ?? "",
//     opens_at: p.opens_at ?? "08:00",
//     closes_at: p.closes_at ?? "18:00",
//     is_open_24h: p.is_open_24h ?? false,
//     offers_delivery: p.offers_delivery ?? true,
//     offers_pickup: p.offers_pickup ?? true,
//     delivery_fee: p.delivery_fee ?? "0",
//     delivery_currency: p.delivery_currency ?? "RWF",
//     delivery_radius_km: p.delivery_radius_km != null ? String(p.delivery_radius_km) : "",
//     estimated_delivery_minutes: p.estimated_delivery_minutes != null ? String(p.estimated_delivery_minutes) : "",
//     social_links: {
//       website: links.website ?? "",
//       facebook: links.facebook ?? "",
//       twitter: links.twitter ?? "",
//       instagram: links.instagram ?? "",
//       linkedin: links.linkedin ?? "",
//     },
//   };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Shared components
// // ─────────────────────────────────────────────────────────────────────────────
// function FormField({ label, error, children, className = "" }: {
//   label: string; error?: string; children: React.ReactNode; className?: string;
// }) {
//   return (
//     <div className={`flex flex-col gap-1.5 ${className}`}>
//       <Label className="text-[10px] text-muted-foreground">{label}</Label>
//       {children}
//       {error && <p className="text-[10px] text-destructive">{error}</p>}
//     </div>
//   );
// }

// function StatCard({ label, value, sub, accent = false }: {
//   label: string; value: number | string; sub?: string; accent?: boolean;
// }) {
//   return (
//     <div className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm flex flex-col gap-0.5">
//       <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
//       <span className={cn("text-2xl font-semibold tabular-nums truncate", accent ? "text-primary" : "text-foreground")}>
//         {value}
//       </span>
//       {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Image Upload buttons (logo + cover)
// // ─────────────────────────────────────────────────────────────────────────────
// function ImageUploaders({ profile }: { profile: PharmacyProfile }) {
//   const logoRef = useRef<HTMLInputElement>(null);
//   const coverRef = useRef<HTMLInputElement>(null);
//   const uploadLogo = useUploadLogo();
//   const uploadCover = useUploadCoverImage();

//   const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     uploadLogo.mutate(file, {
//       onSuccess: () => toast.success("Logo uploaded successfully"),
//       onError: (err) => toast.error(err.message),
//     });
//     e.target.value = "";
//   };

//   const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     uploadCover.mutate(file, {
//       onSuccess: () => toast.success("Cover image uploaded successfully"),
//       onError: (err) => toast.error(err.message),
//     });
//     e.target.value = "";
//   };

//   return (
//     <div className="border-t border-border pt-4 space-y-3">
//       <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
//         <ImageIcon size={15} className="text-primary" />
//         Images
//       </h3>
//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//         {/* Logo */}
//         <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3">
//           <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden">
//             {profile.logo
//               ? <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
//               : <Building2 size={20} className="text-muted-foreground" />}
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-xs font-medium text-foreground">Logo</p>
//             <p className="text-[10px] text-muted-foreground">JPEG/PNG/WebP · max 2MB</p>
//           </div>
//           <Button
//             size="sm"
//             variant="outline"
//             onClick={() => logoRef.current?.click()}
//             disabled={uploadLogo.isPending}
//             className="text-xs h-8 gap-1.5 shrink-0"
//           >
//             {uploadLogo.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
//             Upload
//           </Button>
//           <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={handleLogo} />
//         </div>

//         {/* Cover */}
//         <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3">
//           <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden">
//             {profile.image
//               ? <img src={profile.image} alt="Cover" className="w-full h-full object-cover" />
//               : <ImageIcon size={20} className="text-muted-foreground" />}
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-xs font-medium text-foreground">Cover</p>
//             <p className="text-[10px] text-muted-foreground">JPEG/PNG/WebP · max 4MB</p>
//           </div>
//           <Button
//             size="sm"
//             variant="outline"
//             onClick={() => coverRef.current?.click()}
//             disabled={uploadCover.isPending}
//             className="text-xs h-8 gap-1.5 shrink-0"
//           >
//             {uploadCover.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
//             Upload
//           </Button>
//           <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={handleCover} />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Working Hours Manager (view mode — live edit per row)
// // ─────────────────────────────────────────────────────────────────────────────
// function WorkingHoursManager() {
//   const { data: records = [], isLoading } = useGetWorkingHours();
//   const setHours = useSetWorkingHours();
//   const updateHour = useUpdateWorkingHour();
//   const deleteHour = useDeleteWorkingHour();
//   const resetHours = useResetWorkingHours();

//   const [localHours, setLocalHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
//   const [isDirty, setIsDirty] = useState(false);

//   useEffect(() => {
//     if (records.length > 0) {
//       setLocalHours(apiHoursToForm(records));
//       setIsDirty(false);
//     }
//   }, [records]);

//   const updateDay = (day: DayKey, patch: Partial<WorkingHoursDay>) => {
//     setLocalHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
//     setIsDirty(true);
//   };

//   const applyToAll = (day: DayKey) => {
//     const src = localHours[day];
//     setLocalHours((prev) => {
//       const next = { ...prev };
//       DAYS_OF_WEEK.forEach((d) => {
//         if (d !== day) next[d] = { ...next[d], opens_at: src.opens_at, closes_at: src.closes_at };
//       });
//       return next;
//     });
//     setIsDirty(true);
//   };

//   const handleSave = () => {
//     const payload: WorkingHourPayload[] = DAYS_OF_WEEK.map((day) => ({
//       day_of_week: day,
//       open_time: localHours[day].enabled ? localHours[day].opens_at : null,
//       close_time: localHours[day].enabled ? localHours[day].closes_at : null,
//       is_closed: !localHours[day].enabled,
//     }));
//     setHours.mutate(payload, {
//       onSuccess: () => { toast.success("Working hours saved"); setIsDirty(false); },
//       onError: (e) => toast.error(e.message),
//     });
//   };

//   const handleReset = () => {
//     if (!confirm("Reset all working hours? This cannot be undone.")) return;
//     resetHours.mutate(undefined, {
//       onSuccess: () => { toast.success("Working hours reset"); setLocalHours(DEFAULT_WORKING_HOURS); setIsDirty(false); },
//       onError: (e) => toast.error(e.message),
//     });
//   };

//   if (isLoading) return <div className="space-y-2">{Array(7).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}</div>;

//   return (
//     <div className="space-y-3">
//       {/* Header legend */}
//       <div className="hidden sm:grid grid-cols-[90px_1fr_1fr_auto_auto] gap-2 items-center px-1 mb-1">
//         {["Day", "Opens at", "Closes at", "Copy", "Open"].map((h) => (
//           <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</span>
//         ))}
//       </div>

//       {DAYS_OF_WEEK.map((day) => {
//         const d = localHours[day];
//         const isWeekend = day === "saturday" || day === "sunday";
//         return (
//           <div key={day} className={cn(
//             "rounded-md border transition-colors",
//             d.enabled ? isWeekend ? "border-primary/20 bg-primary/5" : "border-border bg-card" : "border-border/40 bg-muted/30 opacity-60",
//           )}>
//             {/* Desktop */}
//             <div className="hidden sm:grid grid-cols-[90px_1fr_1fr_auto_auto] gap-2 items-center px-3 py-2.5">
//               <span className={cn("text-xs font-medium capitalize", !d.enabled && "text-muted-foreground", isWeekend && d.enabled && "text-primary")}>
//                 {DAY_LABELS[day].slice(0, 3)}
//               </span>
//               <Input type="time" value={d.opens_at} disabled={!d.enabled}
//                 onChange={(e) => updateDay(day, { opens_at: e.target.value })}
//                 className="h-8 text-xs border-border focus-visible:ring-primary disabled:opacity-30" />
//               <Input type="time" value={d.closes_at} disabled={!d.enabled}
//                 onChange={(e) => updateDay(day, { closes_at: e.target.value })}
//                 className="h-8 text-xs border-border focus-visible:ring-primary disabled:opacity-30" />
//               <button onClick={() => applyToAll(day)} disabled={!d.enabled}
//                 title="Copy to all days"
//                 className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors px-1 font-medium">
//                 ↓ All
//               </button>
//               <Switch checked={d.enabled} onCheckedChange={(v) => updateDay(day, { enabled: v })} />
//             </div>
//             {/* Mobile */}
//             <div className="sm:hidden px-3 py-2.5 space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className={cn("text-xs font-semibold", !d.enabled && "text-muted-foreground", isWeekend && d.enabled && "text-primary")}>
//                   {DAY_LABELS[day]}
//                 </span>
//                 <div className="flex items-center gap-2">
//                   <button onClick={() => applyToAll(day)} disabled={!d.enabled}
//                     className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 font-medium">↓ All</button>
//                   <Switch checked={d.enabled} onCheckedChange={(v) => updateDay(day, { enabled: v })} />
//                 </div>
//               </div>
//               {d.enabled && (
//                 <div className="grid grid-cols-2 gap-2">
//                   <div className="flex flex-col gap-1">
//                     <span className="text-[10px] text-muted-foreground">Opens at</span>
//                     <Input type="time" value={d.opens_at}
//                       onChange={(e) => updateDay(day, { opens_at: e.target.value })}
//                       className="h-8 text-xs border-border focus-visible:ring-primary" />
//                   </div>
//                   <div className="flex flex-col gap-1">
//                     <span className="text-[10px] text-muted-foreground">Closes at</span>
//                     <Input type="time" value={d.closes_at}
//                       onChange={(e) => updateDay(day, { closes_at: e.target.value })}
//                       className="h-8 text-xs border-border focus-visible:ring-primary" />
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         );
//       })}

//       <div className="flex items-center justify-between pt-2">
//         <Button variant="outline" size="sm" onClick={handleReset} disabled={resetHours.isPending}
//           className="text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5 h-8">
//           {resetHours.isPending ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
//           Reset all
//         </Button>
//         {isDirty && (
//           <Button size="sm" onClick={handleSave} disabled={setHours.isPending}
//             className="text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-8">
//             {setHours.isPending ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
//             Save hours
//           </Button>
//         )}
//       </div>
//       <p className="text-[10px] text-muted-foreground pl-1">
//         Use "↓ All" to copy a day's hours across the full week. Changes require saving.
//       </p>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Closures Manager
// // ─────────────────────────────────────────────────────────────────────────────
// function ClosuresManager() {
//   const { data: closures = [], isLoading } = useGetClosures();
//   const createClosure = useCreateClosure();
//   const updateClosure = useUpdateClosure();
//   const deleteClosure = useDeleteClosure();
//   const checkDate = useCheckClosureDate();

//   const [showForm, setShowForm] = useState(false);
//   const [editingId, setEditingId] = useState<number | null>(null);
//   const [form, setForm] = useState({ from_date: "", to_date: "", reason: "" });
//   const [checkDateVal, setCheckDateVal] = useState("");
//   const [checkResult, setCheckResult] = useState<{ is_closed: boolean; reason: string | null } | null>(null);

//   const today = new Date().toISOString().split("T")[0];

//   const handleSubmit = () => {
//     if (!form.from_date || !form.to_date) return;
//     if (editingId !== null) {
//       updateClosure.mutate(
//         { id: editingId, payload: { from_date: form.from_date, to_date: form.to_date, reason: form.reason || undefined } },
//         {
//           onSuccess: () => { toast.success("Closure updated"); setEditingId(null); setShowForm(false); setForm({ from_date: "", to_date: "", reason: "" }); },
//           onError: (e) => toast.error(e.message),
//         }
//       );
//     } else {
//       createClosure.mutate(
//         { from_date: form.from_date, to_date: form.to_date, reason: form.reason || undefined },
//         {
//           onSuccess: () => { toast.success("Closure saved"); setShowForm(false); setForm({ from_date: "", to_date: "", reason: "" }); },
//           onError: (e) => toast.error(e.message),
//         }
//       );
//     }
//   };

//   const handleEdit = (c: ClosureRecord) => {
//     setForm({ from_date: c.from_date, to_date: c.to_date, reason: c.reason ?? "" });
//     setEditingId(c.id);
//     setShowForm(true);
//   };

//   const handleDelete = (id: number) => {
//     if (!confirm("Delete this closure?")) return;
//     deleteClosure.mutate(id, {
//       onSuccess: () => toast.success("Closure removed"),
//       onError: (e) => toast.error(e.message),
//     });
//   };

//   const handleCheck = () => {
//     if (!checkDateVal) return;
//     checkDate.mutate(checkDateVal, {
//       onSuccess: (r) => setCheckResult({ is_closed: r.is_closed, reason: r.reason }),
//       onError: (e) => toast.error(e.message),
//     });
//   };

//   return (
//     <div className="space-y-4">
//       {/* Check date */}
//       <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
//         <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Check a date</p>
//         <div className="flex gap-2 items-center">
//           <Input type="date" value={checkDateVal} min={today}
//             onChange={(e) => { setCheckDateVal(e.target.value); setCheckResult(null); }}
//             className="h-8 text-xs border-border focus-visible:ring-primary flex-1" />
//           <Button size="sm" onClick={handleCheck} disabled={!checkDateVal || checkDate.isPending}
//             className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
//             {checkDate.isPending ? <RefreshCw size={11} className="animate-spin" /> : "Check"}
//           </Button>
//         </div>
//         {checkResult && (
//           <div className={cn("flex items-center gap-2 rounded px-3 py-1.5 text-[11px] font-medium",
//             checkResult.is_closed ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/10 text-primary border border-primary/20")}>
//             {checkResult.is_closed
//               ? <><CalendarOff size={12} /> Closed{checkResult.reason ? ` — ${checkResult.reason}` : ""}</>
//               : <><Check size={12} /> Open on this date</>}
//           </div>
//         )}
//       </div>

//       {/* Existing closures */}
//       {isLoading ? (
//         <div className="space-y-2">{Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}</div>
//       ) : closures.length === 0 ? (
//         <div className="rounded-md border border-border bg-muted/20 px-3 py-4 text-center">
//           <p className="text-[11px] text-muted-foreground italic">No upcoming closures</p>
//         </div>
//       ) : (
//         <div className="space-y-2">
//           {closures.map((c) => (
//             <div key={c.id} className="rounded-md border border-border bg-card px-3 py-2.5 flex items-center justify-between gap-2">
//               <div className="flex items-center gap-2.5 min-w-0">
//                 <CalendarOff size={13} className="text-destructive shrink-0" />
//                 <div className="min-w-0">
//                   <p className="text-[11px] font-medium text-foreground">
//                     {c.from_date} → {c.to_date}
//                   </p>
//                   {c.reason && <p className="text-[10px] text-muted-foreground truncate">{c.reason}</p>}
//                 </div>
//               </div>
//               <div className="flex items-center gap-1 shrink-0">
//                 <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
//                   <Pencil size={12} />
//                 </button>
//                 <button onClick={() => handleDelete(c.id)} disabled={deleteClosure.isPending}
//                   className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
//                   <Trash2 size={12} />
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Add/Edit form */}
//       {showForm && (
//         <div className="rounded-md border border-border bg-card p-3 space-y-3">
//           <div className="flex items-center justify-between">
//             <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
//               {editingId !== null ? "Edit closure" : "New closure"}
//             </p>
//             <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ from_date: "", to_date: "", reason: "" }); }}
//               className="text-muted-foreground hover:text-foreground transition-colors">
//               <X size={13} />
//             </button>
//           </div>
//           <div className="grid grid-cols-2 gap-2">
//             <FormField label="From date">
//               <Input type="date" min={today} value={form.from_date}
//                 onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))}
//                 className="h-8 text-xs border-border focus-visible:ring-primary" />
//             </FormField>
//             <FormField label="To date">
//               <Input type="date" min={form.from_date || today} value={form.to_date}
//                 onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))}
//                 className="h-8 text-xs border-border focus-visible:ring-primary" />
//             </FormField>
//           </div>
//           <FormField label="Reason (optional)">
//             <Input value={form.reason} placeholder="e.g. Christmas Holiday"
//               onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
//               className="h-8 text-xs border-border focus-visible:ring-primary" />
//           </FormField>
//           <Button size="sm" onClick={handleSubmit}
//             disabled={!form.from_date || !form.to_date || createClosure.isPending || updateClosure.isPending}
//             className="w-full h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
//             {(createClosure.isPending || updateClosure.isPending)
//               ? <RefreshCw size={11} className="animate-spin" />
//               : <Check size={11} />}
//             {editingId !== null ? "Update closure" : "Save closure"}
//           </Button>
//         </div>
//       )}

//       {!showForm && (
//         <Button variant="outline" size="sm" onClick={() => setShowForm(true)}
//           className="w-full h-8 text-xs gap-1.5 border-dashed">
//           <Plus size={11} /> Add closure period
//         </Button>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Sidebar
// // ─────────────────────────────────────────────────────────────────────────────
// function UnifiedSidebar({ currentStep, visited, onSelect, mode, profile, onEdit, onDelete }: {
//   currentStep: number; visited: Set<number>; onSelect: (i: number) => void;
//   mode: "create" | "edit" | "view"; profile: PharmacyProfile | null;
//   onEdit: () => void; onDelete: () => void;
// }) {
//   const isForm = mode === "create" || mode === "edit";
//   const pct = Math.round((visited.size / STEPS.length) * 100);

//   return (
//     <div className="w-full sm:w-56 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
//       <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
//         {isForm ? (
//           <div className="space-y-2.5">
//             <div className="flex items-center justify-between">
//               <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Profile setup</span>
//               <span className="text-[11px] font-bold text-primary tabular-nums">{pct}%</span>
//             </div>
//             <div className="h-1.5 rounded-full bg-muted overflow-hidden">
//               <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
//             </div>
//             <p className="text-[10px] text-muted-foreground">{visited.size} of {STEPS.length} sections visited</p>
//           </div>
//         ) : profile ? (
//           <div className="space-y-3">
//             <div className="flex items-center gap-2.5">
//               <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0 overflow-hidden">
//                 {profile.logo
//                   ? <img src={profile.logo} alt="" className="w-full h-full object-cover" />
//                   : getInitials(profile.name_en)}
//               </div>
//               <div className="min-w-0">
//                 <p className="text-xs font-semibold text-foreground truncate leading-tight">{profile.name_en}</p>
//                 <p className="text-[10px] text-muted-foreground truncate mt-0.5">
//                   <span className={cn("inline-flex items-center gap-1",
//                     profile.status === "approved" ? "text-primary" : profile.status === "rejected" ? "text-destructive" : "text-amber-500")}>
//                     <span className="w-1.5 h-1.5 rounded-full inline-block bg-current" />
//                     {profile.status}
//                   </span>
//                 </p>
//               </div>
//             </div>
//             <div className="space-y-1">
//               {[
//                 { label: "City", value: profile.city },
//                 { label: "Delivery", value: profile.offers_delivery ? formatDeliveryFee(profile.delivery_fee, profile.delivery_currency) : "No delivery" },
//               ].map(({ label, value }) => (
//                 <div key={label} className="flex justify-between items-center">
//                   <span className="text-[10px] text-muted-foreground">{label}</span>
//                   <span className="text-[10px] font-medium text-foreground">{value}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ) : null}
//       </div>

//       <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden">
//         {STEPS.map((step, i) => {
//           const Icon = step.icon;
//           const isActive = i === currentStep && isForm;
//           const isDone = visited.has(i) && (!isForm || i !== currentStep);
//           return (
//             <button key={step.id}
//               onClick={() => isForm ? onSelect(i) : undefined}
//               disabled={!isForm}
//               className={cn("flex shrink-0 sm:shrink sm:w-full items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-md text-left transition-all duration-150",
//                 isActive ? "bg-primary/10 text-primary" : isForm ? "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" : "text-muted-foreground cursor-default")}>
//               <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold border transition-all",
//                 isActive ? "bg-primary border-primary text-primary-foreground" : isDone ? "bg-primary/20 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground")}>
//                 {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
//               </div>
//               <div className="flex-1 min-w-0 hidden sm:block">
//                 <div className="flex items-center justify-between gap-1">
//                   <span className={cn("text-xs font-medium leading-tight truncate", isActive ? "text-primary" : "")}>{step.label}</span>
//                   {isActive && <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary shrink-0">editing</span>}
//                   {isDone && isForm && <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">done</span>}
//                 </div>
//                 <p className="hidden sm:block text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">{step.description}</p>
//               </div>
//             </button>
//           );
//         })}
//       </div>

//       {!isForm && profile && (
//         <div className="p-2 sm:p-3 border-t border-border flex flex-row sm:flex-col gap-2">
//           <Button onClick={onEdit} className="flex-1 sm:w-full text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-8">
//             <Pencil size={12} /> Edit profile
//           </Button>
//           <Button variant="outline" onClick={onDelete} className="flex-1 sm:w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 h-8">
//             <Trash2 size={12} /> Delete
//           </Button>
//         </div>
//       )}
//       {isForm && (
//         <div className="hidden sm:block px-3.5 py-3 border-t border-border">
//           <p className="text-[10px] text-muted-foreground leading-relaxed">
//             {mode === "edit" ? "Click any section to jump directly" : "Jump between sections freely — no order needed"}
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Working Hours Form Step (inside the create/edit form)
// // ─────────────────────────────────────────────────────────────────────────────
// function WorkingHoursFormStep({ value, onChange }: { value: WorkingHours; onChange: (v: WorkingHours) => void }) {
//   const updateDay = (day: DayKey, patch: Partial<WorkingHoursDay>) =>
//     onChange({ ...value, [day]: { ...value[day], ...patch } });

//   const applyToAll = (day: DayKey) => {
//     const src = value[day];
//     const updated = { ...value };
//     DAYS_OF_WEEK.forEach((d) => {
//       if (d !== day) updated[d] = { ...updated[d], opens_at: src.opens_at, closes_at: src.closes_at };
//     });
//     onChange(updated);
//   };

//   return (
//     <div className="space-y-2">
//       <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_auto_auto] gap-2 items-center px-1 mb-1">
//         {["Day", "Opens at", "Closes at", "Copy", "Open"].map((h) => (
//           <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</span>
//         ))}
//       </div>
//       {DAYS_OF_WEEK.map((day) => {
//         const d = value[day];
//         const isWeekend = day === "saturday" || day === "sunday";
//         return (
//           <div key={day} className={cn("rounded-md border transition-colors",
//             d.enabled ? isWeekend ? "border-primary/20 bg-primary/5" : "border-border bg-card" : "border-border/40 bg-muted/30 opacity-60")}>
//             <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_auto_auto] gap-2 items-center px-3 py-2.5">
//               <span className={cn("text-xs font-medium capitalize", !d.enabled && "text-muted-foreground", isWeekend && d.enabled && "text-primary")}>
//                 {DAY_LABELS[day].slice(0, 3)}
//               </span>
//               <Input type="time" value={d.opens_at} disabled={!d.enabled}
//                 onChange={(e) => updateDay(day, { opens_at: e.target.value })}
//                 className="h-8 text-xs border-border focus-visible:ring-primary disabled:opacity-30" />
//               <Input type="time" value={d.closes_at} disabled={!d.enabled}
//                 onChange={(e) => updateDay(day, { closes_at: e.target.value })}
//                 className="h-8 text-xs border-border focus-visible:ring-primary disabled:opacity-30" />
//               <button onClick={() => applyToAll(day)} disabled={!d.enabled}
//                 className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors px-1 font-medium">
//                 ↓ All
//               </button>
//               <Switch checked={d.enabled} onCheckedChange={(v) => updateDay(day, { enabled: v })} />
//             </div>
//             <div className="sm:hidden px-3 py-2.5 space-y-2">
//               <div className="flex items-center justify-between">
//                 <span className={cn("text-xs font-semibold capitalize", !d.enabled && "text-muted-foreground", isWeekend && d.enabled && "text-primary")}>
//                   {DAY_LABELS[day]}
//                 </span>
//                 <div className="flex items-center gap-2">
//                   <button onClick={() => applyToAll(day)} disabled={!d.enabled}
//                     className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 font-medium">↓ All</button>
//                   <Switch checked={d.enabled} onCheckedChange={(v) => updateDay(day, { enabled: v })} />
//                 </div>
//               </div>
//               {d.enabled && (
//                 <div className="grid grid-cols-2 gap-2">
//                   <div className="flex flex-col gap-1">
//                     <span className="text-[10px] text-muted-foreground">Opens at</span>
//                     <Input type="time" value={d.opens_at} onChange={(e) => updateDay(day, { opens_at: e.target.value })}
//                       className="h-8 text-xs border-border focus-visible:ring-primary" />
//                   </div>
//                   <div className="flex flex-col gap-1">
//                     <span className="text-[10px] text-muted-foreground">Closes at</span>
//                     <Input type="time" value={d.closes_at} onChange={(e) => updateDay(day, { closes_at: e.target.value })}
//                       className="h-8 text-xs border-border focus-visible:ring-primary" />
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         );
//       })}
//       <p className="text-[10px] text-muted-foreground pt-1 pl-1">Use "↓ All" to copy a day's hours across the full week.</p>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Social Links Form Step
// // ─────────────────────────────────────────────────────────────────────────────
// function SocialLinksFormStep({ value, onChange }: { value: SocialLinks; onChange: (v: SocialLinks) => void }) {
//   return (
//     <div className="space-y-4">
//       <p className="text-[11px] text-muted-foreground -mt-1 mb-2">Add your pharmacy's social media and online profiles. All fields are optional.</p>
//       <div className="grid grid-cols-1 gap-3">
//         {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
//           <FormField key={key} label={label}>
//             <div className="flex items-center gap-2">
//               <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
//               <Input value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })}
//                 placeholder={placeholder} className="border-border focus-visible:ring-primary text-xs h-9" type="url" />
//             </div>
//           </FormField>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Multi-step form
// // ─────────────────────────────────────────────────────────────────────────────
// function PharmacyForm({ mode, defaultValues, workingHoursData, onSuccess, onCancel, currentStep, onStepChange, visited, onVisitedChange }: {
//   mode: "create" | "edit";
//   defaultValues?: Partial<PharmacyProfileFormData>;
//   workingHoursData: WorkingHourRecord[];
//   onSuccess: () => void;
//   onCancel: () => void;
//   currentStep: number;
//   onStepChange: (i: number) => void;
//   visited: Set<number>;
//   onVisitedChange: (v: Set<number>) => void;
// }) {
//   const createOrUpdate = useCreateOrUpdateProfile();
//   const setWorkingHours = useSetWorkingHours();

//   const { register, handleSubmit, trigger, setValue, watch, formState: { errors } } = useForm<PharmacyProfileFormData>({
//     defaultValues: {
//       is_open_24h: false, offers_delivery: true, offers_pickup: true,
//       delivery_currency: "RWF",
//       working_hours: workingHoursData.length > 0 ? apiHoursToForm(workingHoursData) : DEFAULT_WORKING_HOURS,
//       social_links: DEFAULT_SOCIAL_LINKS,
//       ...defaultValues,
//     },
//   });

//   const is24h = watch("is_open_24h");
//   const offersDelivery = watch("offers_delivery");
//   const workingHours = watch("working_hours");
//   const socialLinks = watch("social_links");

//   const step = STEPS[currentStep];
//   const isLast = currentStep === STEPS.length - 1;

//   const goTo = (i: number) => {
//     onVisitedChange(new Set([...visited, i]));
//     onStepChange(i);
//   };

//   const goNext = async () => {
//     if (step.id === "general") {
//       const valid = await trigger(["name_en", "name_fr", "registration_number", "description_en"]);
//       if (!valid) return;
//     }
//     if (isLast) { handleSubmit(onFormSubmit)(); return; }
//     goTo(currentStep + 1);
//   };

//   const onFormSubmit = async (data: PharmacyProfileFormData) => {
//     try {
//       // 1. Save profile
//       await createOrUpdate.mutateAsync({
//         name_en: data.name_en,
//         name_fr: data.name_fr,
//         description_en: data.description_en,
//         registration_number: data.registration_number,
//         address: data.address,
//         city: data.city,
//         province: data.province,
//         country: data.country,
//         latitude: data.latitude ? parseFloat(data.latitude) : undefined,
//         longitude: data.longitude ? parseFloat(data.longitude) : undefined,
//         phone: data.phone,
//         email: data.email,
//         website: data.social_links.website || undefined,
//         opens_at: data.is_open_24h ? undefined : data.opens_at,
//         closes_at: data.is_open_24h ? undefined : data.closes_at,
//         is_open_24h: data.is_open_24h,
//         offers_delivery: data.offers_delivery,
//         offers_pickup: data.offers_pickup,
//         delivery_fee: data.delivery_fee ? parseFloat(data.delivery_fee) : undefined,
//         delivery_currency: data.delivery_currency,
//         delivery_radius_km: data.delivery_radius_km ? parseFloat(data.delivery_radius_km) : undefined,
//         estimated_delivery_minutes: data.estimated_delivery_minutes ? parseFloat(data.estimated_delivery_minutes) : undefined,
//       });

//       // 2. Save working hours
//       const hoursPayload: WorkingHourPayload[] = DAYS_OF_WEEK.map((day) => ({
//         day_of_week: day,
//         open_time: data.working_hours[day].enabled ? data.working_hours[day].opens_at : null,
//         close_time: data.working_hours[day].enabled ? data.working_hours[day].closes_at : null,
//         is_closed: !data.working_hours[day].enabled,
//       }));
//       await setWorkingHours.mutateAsync(hoursPayload);

//       toast.success(mode === "edit" ? "Profile updated successfully" : "Profile created! Awaiting admin approval.");
//       onSuccess();
//     } catch (err: any) {
//       toast.error(err.message ?? "Something went wrong");
//     }
//   };

//   const isPending = createOrUpdate.isPending || setWorkingHours.isPending;

//   return (
//     <div className="flex flex-col flex-1 min-h-0">
//       <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
//         <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
//         <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{step.sectionTitle}</span>
//         <span className="ml-auto text-[10px] text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</span>
//       </div>

//       <div key={currentStep} className="flex-1 overflow-y-auto p-4 sm:p-5">
//         {step.id === "general" && (
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <FormField label="Name (English)" error={errors.name_en?.message}>
//               <Input {...register("name_en", { required: "Required" })} placeholder="MediPharm Kigali"
//                 className="border-border focus-visible:ring-primary text-xs h-9" />
//             </FormField>
//             <FormField label="Name (French)" error={errors.name_fr?.message}>
//               <Input {...register("name_fr", { required: "Required" })} placeholder="MediPharmacie Kigali"
//                 className="border-border focus-visible:ring-primary text-xs h-9" />
//             </FormField>
//             <FormField label="Registration Number" error={errors.registration_number?.message} className="col-span-1 sm:col-span-2">
//               <Input {...register("registration_number", { required: "Required" })} placeholder="RW-PHARM-2024-001"
//                 className="border-border focus-visible:ring-primary font-mono text-xs h-9" />
//             </FormField>
//             <FormField label="Description" error={errors.description_en?.message} className="col-span-1 sm:col-span-2">
//               <Input {...register("description_en", { required: "Required" })} placeholder="Your trusted neighborhood pharmacy…"
//                 className="border-border focus-visible:ring-primary text-xs h-9" />
//             </FormField>
//           </div>
//         )}

//         {step.id === "location" && (
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <FormField label="Street Address" error={errors.address?.message} className="col-span-1 sm:col-span-2">
//               <Input {...register("address", { required: "Required" })} placeholder="KN 5 Rd, Nyarugenge"
//                 className="border-border focus-visible:ring-primary text-xs h-9" />
//             </FormField>
//             <FormField label="City" error={errors.city?.message}>
//               <Input {...register("city", { required: "Required" })} placeholder="Kigali"
//                 className="border-border focus-visible:ring-primary text-xs h-9" />
//             </FormField>
//             <FormField label="Province" error={errors.province?.message}>
//               <Input {...register("province", { required: "Required" })} placeholder="Kigali City"
//                 className="border-border focus-visible:ring-primary text-xs h-9" />
//             </FormField>
//             <FormField label="Country" error={errors.country?.message} className="col-span-1 sm:col-span-2">
//               <Input {...register("country", { required: "Required" })} placeholder="Rwanda"
//                 className="border-border focus-visible:ring-primary text-xs h-9" />
//             </FormField>
//             <FormField label="Latitude" error={errors.latitude?.message}>
//               <Input {...register("latitude", { required: "Required" })} placeholder="-1.9441"
//                 className="border-border focus-visible:ring-primary font-mono text-xs h-9" />
//             </FormField>
//             <FormField label="Longitude" error={errors.longitude?.message}>
//               <Input {...register("longitude", { required: "Required" })} placeholder="30.0619"
//                 className="border-border focus-visible:ring-primary font-mono text-xs h-9" />
//             </FormField>
//           </div>
//         )}

//         {step.id === "contact" && (
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <FormField label="Phone Number" error={errors.phone?.message} className="col-span-1 sm:col-span-2">
//               <Input type="tel" {...register("phone", { required: "Required" })} placeholder="+250788000200"
//                 className="border-border focus-visible:ring-primary text-xs h-9" />
//             </FormField>
//             <FormField label="Email Address" error={errors.email?.message} className="col-span-1 sm:col-span-2">
//               <Input type="email" {...register("email", { required: "Required", pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" } })}
//                 placeholder="info@medipharm.rw" className="border-border focus-visible:ring-primary text-xs h-9" />
//             </FormField>
//           </div>
//         )}

//         {step.id === "hours" && (
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div className="col-span-1 sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2.5">
//               <div>
//                 <p className="text-xs font-medium text-foreground">Open 24 hours</p>
//                 <p className="text-[10px] text-muted-foreground">Overrides opening/closing times</p>
//               </div>
//               <Switch checked={is24h} onCheckedChange={(v) => setValue("is_open_24h", v)} />
//             </div>
//             <FormField label="Opens At" error={errors.opens_at?.message}>
//               <Input type="time" disabled={is24h} {...register("opens_at", { required: !is24h && "Required" })}
//                 className="border-border focus-visible:ring-primary text-xs h-9 disabled:opacity-40" />
//             </FormField>
//             <FormField label="Closes At" error={errors.closes_at?.message}>
//               <Input type="time" disabled={is24h} {...register("closes_at", { required: !is24h && "Required" })}
//                 className="border-border focus-visible:ring-primary text-xs h-9 disabled:opacity-40" />
//             </FormField>
//             <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
//               {(["offers_delivery", "offers_pickup"] as const).map((key) => (
//                 <div key={key} className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
//                   <p className="text-xs font-medium text-foreground capitalize">{key.replace("offers_", "Offers ")}</p>
//                   <Switch checked={watch(key)} onCheckedChange={(v) => setValue(key, v)} />
//                 </div>
//               ))}
//             </div>
//             {offersDelivery && (
//               <>
//                 <FormField label="Delivery Fee (RWF)" error={errors.delivery_fee?.message}>
//                   <Input type="number" {...register("delivery_fee", { required: "Required" })} placeholder="2000"
//                     className="border-border focus-visible:ring-primary text-xs h-9" />
//                 </FormField>
//                 <FormField label="Radius (km)" error={errors.delivery_radius_km?.message}>
//                   <Input type="number" {...register("delivery_radius_km", { required: "Required" })} placeholder="10"
//                     className="border-border focus-visible:ring-primary text-xs h-9" />
//                 </FormField>
//                 <FormField label="Est. Delivery Time (min)" error={errors.estimated_delivery_minutes?.message} className="col-span-1 sm:col-span-2">
//                   <Input type="number" {...register("estimated_delivery_minutes", { required: "Required" })} placeholder="45"
//                     className="border-border focus-visible:ring-primary text-xs h-9" />
//                 </FormField>
//               </>
//             )}
//           </div>
//         )}

//         {step.id === "working_hours" && (
//           <WorkingHoursFormStep value={workingHours ?? DEFAULT_WORKING_HOURS} onChange={(v) => setValue("working_hours", v)} />
//         )}

//         {step.id === "social_links" && (
//           <SocialLinksFormStep value={socialLinks ?? DEFAULT_SOCIAL_LINKS} onChange={(v) => setValue("social_links", v)} />
//         )}
//       </div>

//       <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border">
//         <Button variant="outline" onClick={() => currentStep === 0 ? onCancel() : goTo(currentStep - 1)}
//           className="border-border text-xs">
//           {currentStep === 0 ? "Cancel" : "← Back"}
//         </Button>
//         <span className="text-[11px] text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</span>
//         <Button onClick={goNext} disabled={isPending}
//           className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 gap-1.5">
//           {isPending && <RefreshCw size={11} className="animate-spin" />}
//           {isLast ? (mode === "edit" ? "Save changes" : "Create profile") : "Next →"}
//         </Button>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // View helpers
// // ─────────────────────────────────────────────────────────────────────────────
// function ViewField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
//   return (
//     <div className="flex flex-col gap-0.5">
//       <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
//       <span className={cn("text-[11px] font-medium text-foreground", mono && "font-mono")}>{value}</span>
//     </div>
//   );
// }

// function WorkingHoursView({ records }: { records: WorkingHourRecord[] }) {
//   const hours = apiHoursToForm(records);
//   return (
//     <div className="space-y-1">
//       {DAYS_OF_WEEK.map((day) => {
//         const d = hours[day];
//         const isWeekend = day === "saturday" || day === "sunday";
//         return (
//           <div key={day} className={cn("flex items-center justify-between rounded-md px-3 py-2 border text-[11px] flex-wrap gap-y-1",
//             d.enabled ? isWeekend ? "border-primary/20 bg-primary/5" : "border-border bg-card" : "border-border/30 bg-muted/20 opacity-50")}>
//             <span className={cn("font-medium w-20 sm:w-24", !d.enabled && "text-muted-foreground", isWeekend && d.enabled && "text-primary")}>
//               {DAY_LABELS[day]}
//             </span>
//             {d.enabled
//               ? <span className="font-mono text-foreground text-[11px]">{formatTime(d.opens_at)} – {formatTime(d.closes_at)}</span>
//               : <span className="text-muted-foreground italic">Closed</span>}
//             <span className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5",
//               d.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
//               {d.enabled ? "Open" : "Closed"}
//             </span>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// function SocialLinksView({ links }: { links: Record<string, string> }) {
//   const active = SOCIAL_PLATFORMS.filter(({ key }) => links[key]);
//   if (active.length === 0) return <p className="text-[11px] text-muted-foreground italic py-2">No social links added.</p>;
//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//       {active.map(({ key, label, icon: Icon }) => (
//         <a key={key} href={links[key]} target="_blank" rel="noopener noreferrer"
//           className="flex items-center gap-2.5 rounded-md border border-border bg-card hover:border-primary/40 hover:bg-primary/5 px-3 py-2 transition-colors group">
//           <div className="w-7 h-7 rounded-full bg-muted group-hover:bg-primary/15 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
//             <Icon size={13} />
//           </div>
//           <div className="flex flex-col min-w-0">
//             <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
//             <span className="text-[11px] font-medium text-foreground group-hover:text-primary truncate transition-colors">
//               {links[key].replace(/^https?:\/\/(www\.)?/, "")}
//             </span>
//           </div>
//         </a>
//       ))}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Profile view (read-only)
// // ─────────────────────────────────────────────────────────────────────────────
// function PharmacyProfileView({ profile, workingHours, closures }: {
//   profile: PharmacyProfile; workingHours: WorkingHourRecord[]; closures: ClosureRecord[];
// }) {
//   const [showClosures, setShowClosures] = useState(false);
//   const links = profile.social_links ?? {};

//   return (
//     <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-5">
//       {/* Status banner */}
//       {profile.status !== "approved" && (
//         <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-medium border",
//           profile.status === "rejected" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-amber-500/10 border-amber-500/20 text-amber-600")}>
//           <AlertCircle size={13} className="shrink-0" />
//           {profile.status === "rejected" ? "Your profile has been rejected. Please edit and resubmit." : "Profile pending admin approval."}
//         </div>
//       )}

//       {/* Images */}
//       <ImageUploaders profile={profile} />

//       {/* General */}
//       <div className="border-t border-border pt-4 space-y-4">
//         <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 size={15} className="text-primary" />General information</h3>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
//           <ViewField label="Name (EN)" value={profile.name_en} />
//           <ViewField label="Name (FR)" value={profile.name_fr || "—"} />
//           <ViewField label="Registration" value={profile.registration_number || "—"} mono />
//           <ViewField label="Country" value={profile.country} />
//         </div>
//         {profile.description_en && (
//           <div className="border-t border-border pt-3">
//             <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
//             <p className="text-[11px] text-foreground leading-relaxed">{profile.description_en}</p>
//           </div>
//         )}
//       </div>

//       {/* Location */}
//       <div className="border-t border-border pt-4 space-y-3">
//         <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin size={15} className="text-primary" />Location</h3>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
//           <div className="col-span-1 sm:col-span-2"><ViewField label="Street" value={profile.address} /></div>
//           <ViewField label="City" value={profile.city} />
//           <ViewField label="Province" value={profile.province || "—"} />
//           {profile.latitude != null && profile.longitude != null && (
//             <ViewField label="Coordinates" value={`${profile.latitude}, ${profile.longitude}`} mono />
//           )}
//         </div>
//       </div>

//       {/* Contact */}
//       <div className="border-t border-border pt-4 space-y-3">
//         <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Phone size={15} className="text-primary" />Contact</h3>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//           <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
//             <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary"><Phone size={13} /></div>
//             <span className="text-[11px] font-medium font-mono text-primary">{formatPhone(profile.phone)}</span>
//           </div>
//           <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
//             <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-[10px] font-bold">@</div>
//             <span className="text-[11px] font-medium text-foreground truncate">{profile.email}</span>
//           </div>
//         </div>
//       </div>

//       {/* Hours & Delivery */}
//       <div className="border-t border-border pt-4 space-y-3">
//         <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Clock size={15} className="text-primary" />Hours & delivery</h3>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
//           {profile.is_open_24h
//             ? <div className="col-span-1 sm:col-span-2"><ViewField label="Hours" value="Open 24 hours" /></div>
//             : <><ViewField label="Opens at" value={formatTime(profile.opens_at)} /><ViewField label="Closes at" value={formatTime(profile.closes_at)} /></>}
//           {profile.offers_delivery && (
//             <>
//               <ViewField label="Delivery fee" value={formatDeliveryFee(profile.delivery_fee, profile.delivery_currency)} />
//               <ViewField label="Radius" value={`${profile.delivery_radius_km} km`} />
//               <div className="col-span-1 sm:col-span-2"><ViewField label="Est. delivery time" value={`${profile.estimated_delivery_minutes} minutes`} /></div>
//             </>
//           )}
//           <div className="col-span-1 sm:col-span-2 flex gap-2 mt-1 flex-wrap">
//             {profile.offers_delivery && <span className="text-[11px] font-medium rounded-full px-3 py-0.5 bg-primary/15 text-primary">✓ Delivery</span>}
//             {profile.offers_pickup && <span className="text-[11px] font-medium rounded-full px-3 py-0.5 bg-primary/15 text-primary">✓ Pickup</span>}
//           </div>
//         </div>
//       </div>

//       {/* Working Hours */}
//       <div className="border-t border-border pt-4 space-y-3">
//         <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calendar size={15} className="text-primary" />Weekly working hours</h3>
//         {workingHours.length > 0 ? <WorkingHoursView records={workingHours} /> : (
//           <p className="text-[11px] text-muted-foreground italic">No working hours configured yet.</p>
//         )}
//         <div className="pt-2 border-t border-border">
//           <WorkingHoursManager />
//         </div>
//       </div>

//       {/* Closures */}
//       <div className="border-t border-border pt-4 space-y-3">
//         <button onClick={() => setShowClosures(!showClosures)}
//           className="flex items-center justify-between w-full group">
//           <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
//             <CalendarOff size={15} className="text-primary" />
//             Closure periods
//             {closures.length > 0 && (
//               <span className="text-[10px] font-semibold bg-destructive/15 text-destructive rounded-full px-2 py-0.5">{closures.length}</span>
//             )}
//           </h3>
//           {showClosures ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
//         </button>
//         {showClosures && <ClosuresManager />}
//       </div>

//       {/* Social Links */}
//       {Object.values(links).some(Boolean) && (
//         <div className="border-t border-border pt-4 space-y-3">
//           <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Share2 size={15} className="text-primary" />Social media & web</h3>
//           <SocialLinksView links={links} />
//         </div>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Empty state
// // ─────────────────────────────────────────────────────────────────────────────
// function EmptyState({ onCreate }: { onCreate: () => void }) {
//   return (
//     <div className="flex-1 flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
//       <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mb-3">
//         <Building2 className="h-7 w-7 text-muted-foreground" />
//       </div>
//       <h2 className="text-sm font-semibold text-foreground mb-2">No pharmacy profile found</h2>
//       <p className="text-[11px] text-muted-foreground mb-5 max-w-xs">
//         Create your pharmacy profile to manage your information, hours, and delivery settings in one place.
//       </p>
//       <Button onClick={onCreate} className="text-primary-foreground bg-primary hover:bg-primary/90">
//         <Plus className="h-4 w-4 mr-1.5" /> Create Profile
//       </Button>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Loading skeleton
// // ─────────────────────────────────────────────────────────────────────────────
// function ProfileSkeleton() {
//   return (
//     <div className="flex-1 p-4 sm:p-5 space-y-5">
//       <div className="space-y-2">
//         <Skeleton className="h-4 w-40" />
//         <div className="grid grid-cols-2 gap-3">
//           <Skeleton className="h-8 rounded" />
//           <Skeleton className="h-8 rounded" />
//           <Skeleton className="h-8 rounded col-span-2" />
//         </div>
//       </div>
//       <div className="space-y-2">
//         <Skeleton className="h-4 w-32" />
//         <Skeleton className="h-8 rounded" />
//         <Skeleton className="h-8 rounded" />
//       </div>
//       <div className="space-y-2">
//         {Array(7).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Main Page
// // ─────────────────────────────────────────────────────────────────────────────
// type Mode = "view" | "create" | "edit";

// const PharmacyProfile = () => {
//   const { t, i18n } = useTranslation();

//   const { data: profile, isLoading: profileLoading, error: profileError, refetch } = useGetPharmacyProfile();
//   const { data: workingHours = [], isLoading: hoursLoading } = useGetWorkingHours();
//   const { data: closures = [] } = useGetClosures();

//   const hasProfile = !!profile;
//   const [mode, setMode] = useState<Mode>("view");
//   const [currentStep, setCurrentStep] = useState(0);
//   const [visited, setVisited] = useState<Set<number>>(new Set([0]));

//   // Detect initial state: no profile → start in create mode
//   useEffect(() => {
//     if (!profileLoading && !hasProfile) setMode("create");
//     if (!profileLoading && hasProfile) setMode("view");
//   }, [profileLoading, hasProfile]);

//   const isForm = mode === "create" || mode === "edit";
//   const isLoading = profileLoading || hoursLoading;

//   const handleFormSuccess = () => {
//     refetch();
//     setMode("view");
//     setCurrentStep(0);
//     setVisited(new Set([0]));
//   };

//   const openEdit = () => {
//     setCurrentStep(0);
//     setVisited(new Set([0]));
//     setMode("edit");
//   };

//   const handleDelete = () => {
//     if (!confirm("Delete your pharmacy profile? This cannot be undone.")) return;
//     // The API doesn't have a delete profile endpoint, so we just reset to create mode
//     // If a delete endpoint exists, call it here
//     setMode("create");
//   };

//   const stats = profile
//     ? {
//         city: profile.city,
//         status: profile.status,
//         hours: profile.is_open_24h ? "24h" : `${formatTime(profile.opens_at)} – ${formatTime(profile.closes_at)}`,
//         delivery: profile.offers_delivery ? formatDeliveryFee(profile.delivery_fee, profile.delivery_currency) : "None",
//         radius: profile.offers_delivery ? `${profile.delivery_radius_km} km` : "—",
//         eta: profile.offers_delivery ? `${profile.estimated_delivery_minutes} min` : "—",
//       }
//     : null;

//   return (
//     <DashboardLayout role="pharmacy">
//       <PageHeader
//         title={t("pages.pharmacy.profile_title")}
//         subtitle={isForm
//           ? mode === "edit" ? "Update your pharmacy information" : "Fill in the details below to get started"
//           : t("pages.pharmacy.profile_sub")}
//       />

//       <div className="px-3 py-4 sm:px-6 sm:py-8 space-y-4 sm:space-y-5">
//         {/* Stats bar */}
//         {stats && !isForm && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
//             <StatCard label="City" value={stats.city} />
//             <StatCard label="Status" value={stats.status} />
//             <StatCard label="Hours" value={stats.hours} />
//             <StatCard label="Delivery fee" value={stats.delivery} accent />
//             <StatCard label="Radius" value={stats.radius} sub="km coverage" />
//             <StatCard label="Est. time" value={stats.eta} sub="delivery ETA" />
//           </div>
//         )}

//         {/* Main card */}
//         <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col sm:flex-row min-h-[560px]">
//           <UnifiedSidebar
//             currentStep={currentStep}
//             visited={visited}
//             onSelect={(i) => { setVisited(new Set([...visited, i])); setCurrentStep(i); }}
//             mode={isLoading ? "view" : mode}
//             profile={profile ?? null}
//             onEdit={openEdit}
//             onDelete={handleDelete}
//           />

//           {isLoading ? (
//             <ProfileSkeleton />
//           ) : isForm ? (
//             <PharmacyForm
//               mode={mode === "edit" ? "edit" : "create"}
//               defaultValues={mode === "edit" && profile ? apiProfileToForm(profile) : undefined}
//               workingHoursData={workingHours}
//               onSuccess={handleFormSuccess}
//               onCancel={() => { if (profile) setMode("view"); }}
//               currentStep={currentStep}
//               onStepChange={setCurrentStep}
//               visited={visited}
//               onVisitedChange={setVisited}
//             />
//           ) : profile ? (
//             <PharmacyProfileView
//               profile={profile}
//               workingHours={workingHours}
//               closures={closures}
//             />
//           ) : (
//             <EmptyState onCreate={() => setMode("create")} />
//           )}
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default PharmacyProfile;



import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Building2, MapPin, Phone, Clock, Truck, Plus, Pencil, Trash2,
  Check, Share2, Calendar, Facebook, Twitter, Instagram, Globe,
  Linkedin, Link2, Upload, Image as ImageIcon, AlertCircle,
  RefreshCw, X, CalendarOff, ChevronDown, ChevronUp, Save,
} from "lucide-react";
import {
  useGetPharmacyProfile, useCreateOrUpdateProfile, useUploadLogo,
  useUploadCoverImage, useGetWorkingHours, useSetWorkingHours,
  useUpdateWorkingHour, useDeleteWorkingHour, useResetWorkingHours,
  useGetClosures, useCreateClosure, useUpdateClosure, useDeleteClosure,
  useCheckClosureDate,
  type PharmacyProfile, type WorkingHourRecord, type ClosureRecord,
  type WorkingHourPayload,
} from "@/hooks/pharmacy/use-pharmacy-profile";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface WorkingHoursDay { enabled: boolean; opens_at: string; closes_at: string; }
interface WorkingHours {
  monday: WorkingHoursDay; tuesday: WorkingHoursDay; wednesday: WorkingHoursDay;
  thursday: WorkingHoursDay; friday: WorkingHoursDay; saturday: WorkingHoursDay; sunday: WorkingHoursDay;
}
interface SocialLinks { website: string; facebook: string; twitter: string; instagram: string; linkedin: string; }

interface PharmacyProfileFormData {
  name_en: string; name_fr: string; description_en: string; registration_number: string;
  address: string; city: string; province: string; country: string; latitude: string; longitude: string;
  phone: string; email: string; opens_at: string; closes_at: string; is_open_24h: boolean;
  offers_delivery: boolean; offers_pickup: boolean; delivery_fee: string; delivery_currency: string;
  delivery_radius_km: string; estimated_delivery_minutes: string;
  working_hours: WorkingHours; social_links: SocialLinks;
}

type SectionId = "general" | "location" | "contact" | "hours" | "working_hours" | "social_links";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type DayKey = (typeof DAYS_OF_WEEK)[number];

const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
  friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

const SOCIAL_PLATFORMS = [
  { key: "website" as const, label: "Website", icon: Globe, placeholder: "https://medipharm.rw" },
  { key: "facebook" as const, label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/medipharm" },
  { key: "twitter" as const, label: "Twitter / X", icon: Twitter, placeholder: "https://twitter.com/medipharm" },
  { key: "instagram" as const, label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/medipharm" },
  { key: "linkedin" as const, label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/company/medipharm" },
];

const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  tuesday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  wednesday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  thursday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  friday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  saturday: { enabled: true, opens_at: "09:00", closes_at: "15:00" },
  sunday: { enabled: false, opens_at: "09:00", closes_at: "13:00" },
};

const DEFAULT_SOCIAL_LINKS: SocialLinks = { website: "", facebook: "", twitter: "", instagram: "", linkedin: "" };

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType; description: string }[] = [
  { id: "general", label: "General", icon: Building2, description: "Name, registration & description" },
  { id: "location", label: "Location", icon: MapPin, description: "Address, city, province & coordinates" },
  { id: "contact", label: "Contact", icon: Phone, description: "Phone number & email" },
  { id: "hours", label: "Hours & Delivery", icon: Truck, description: "Opening hours & delivery settings" },
  { id: "working_hours", label: "Working Hours", icon: Calendar, description: "Per-day open/close schedule" },
  { id: "social_links", label: "Social Links", icon: Share2, description: "Website, Facebook, Instagram…" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FIX: Strip seconds from time strings so we always send "HH:MM" not "HH:MM:SS".
 * The API requires H:i format. Some browsers and APIs return seconds.
 */
const normalizeTime = (t: string): string => {
  if (!t) return t;
  const parts = t.split(":");
  return `${parts[0].padStart(2, "0")}:${(parts[1] ?? "00").padStart(2, "0")}`;
};

/**
 * FIX: Strip ISO timestamp to plain date string.
 * API may return "2026-05-31T22:00:00.000000Z" — we only want "2026-05-31".
 */
const normalizeDate = (d: string): string => {
  if (!d) return d;
  return d.split("T")[0];
};

const formatPhone = (p: string) => p?.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4") ?? p;

const formatTime = (t: string) => {
  if (!t) return "—";
  const norm = normalizeTime(t);
  const [h, m] = norm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const formatDateDisplay = (d: string): string => {
  const plain = normalizeDate(d);
  if (!plain) return d;
  try {
    return new Date(plain + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return plain;
  }
};

const getInitials = (name: string) => name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??";
const formatDeliveryFee = (fee: string | number, currency: string) => `${currency} ${Number(fee).toLocaleString()}`;

function apiHoursToForm(records: WorkingHourRecord[]): WorkingHours {
  const base: WorkingHours = JSON.parse(JSON.stringify(DEFAULT_WORKING_HOURS));
  for (const r of records) {
    const day = r.day_of_week as DayKey;
    if (day in base) {
      base[day] = {
        enabled: !r.is_closed && r.is_active,
        // FIX: normalise time from API before storing in form state
        opens_at: normalizeTime(r.open_time ?? "08:00"),
        closes_at: normalizeTime(r.close_time ?? "18:00"),
      };
    }
  }
  return base;
}

function apiProfileToForm(p: PharmacyProfile): Partial<PharmacyProfileFormData> {
  const links = p.social_links ?? {};
  return {
    name_en: p.name_en ?? "", name_fr: p.name_fr ?? "", description_en: p.description_en ?? "",
    registration_number: p.registration_number ?? "", address: p.address ?? "", city: p.city ?? "",
    province: p.province ?? "", country: p.country ?? "",
    latitude: p.latitude != null ? String(p.latitude) : "",
    longitude: p.longitude != null ? String(p.longitude) : "",
    phone: p.phone ?? "", email: p.email ?? "",
    // FIX: normalise times from profile
    opens_at: normalizeTime(p.opens_at ?? "08:00"),
    closes_at: normalizeTime(p.closes_at ?? "18:00"),
    is_open_24h: p.is_open_24h ?? false, offers_delivery: p.offers_delivery ?? true,
    offers_pickup: p.offers_pickup ?? true, delivery_fee: p.delivery_fee ?? "0",
    delivery_currency: p.delivery_currency ?? "RWF",
    delivery_radius_km: p.delivery_radius_km != null ? String(p.delivery_radius_km) : "",
    estimated_delivery_minutes: p.estimated_delivery_minutes != null ? String(p.estimated_delivery_minutes) : "",
    social_links: {
      website: links.website ?? "", facebook: links.facebook ?? "", twitter: links.twitter ?? "",
      instagram: links.instagram ?? "", linkedin: links.linkedin ?? "",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared small components
// ─────────────────────────────────────────────────────────────────────────────
function FormField({ label, error, children, className = "" }: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle size={10} />{error}</p>}
    </div>
  );
}

function ViewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-medium text-foreground", mono && "font-mono")}>{value || "—"}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: Prominent Edit/Save bar — now uses real Button components so they
// are clearly discoverable rather than tiny text links.
// ─────────────────────────────────────────────────────────────────────────────
function SectionEditBar({ onEdit, onCancel, onSave, isEditing, isSaving }: {
  onEdit: () => void; onCancel: () => void; onSave: () => void; isEditing: boolean; isSaving: boolean;
}) {
  if (!isEditing) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={onEdit}
        className="h-7 px-3 text-xs gap-1.5 border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-150"
      >
        <Pencil size={11} />
        Edit
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className="h-7 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
      >
        <X size={11} /> Cancel
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="h-7 px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/30"
      >
        {isSaving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
        Save changes
      </Button>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, editBar, isEditing }: {
  title: string; icon: React.ElementType; children: React.ReactNode; editBar?: React.ReactNode; isEditing?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border bg-card transition-all duration-200",
      isEditing
        ? "border-primary/50 shadow-md shadow-primary/5 ring-1 ring-primary/20"
        : "border-border hover:border-border/80",
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
            isEditing ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}>
            <Icon size={14} />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {isEditing && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
              editing
            </span>
          )}
        </div>
        {editBar}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub, accent = false }: {
  label: string; value: number | string; sub?: string; accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm flex flex-col gap-0.5 hover:border-border/80 transition-colors">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
      <span className={cn("text-xl font-bold tabular-nums truncate mt-0.5", accent ? "text-primary" : "text-foreground")}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: DateInput — wraps <input type="date"> with a visible calendar icon
// that works in dark mode by inverting the native picker indicator.
// ─────────────────────────────────────────────────────────────────────────────
function DateInput({ value, onChange, min, className }: {
  value: string; onChange: (v: string) => void; min?: string; className?: string;
}) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all",
          "[color-scheme:dark]",
          // Make the native calendar icon always visible
          "[&::-webkit-calendar-picker-indicator]:opacity-60",
          "[&::-webkit-calendar-picker-indicator]:invert",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:hover:opacity-100",
          className,
        )}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ activeSection, onSelect, mode, profile, visitedSteps, onCreateNew }: {
  activeSection: SectionId; onSelect: (id: SectionId) => void;
  mode: "setup" | "view"; profile: PharmacyProfile | null;
  visitedSteps?: Set<number>; onCreateNew?: () => void;
}) {
  const isSetup = mode === "setup";
  const pct = visitedSteps ? Math.round((visitedSteps.size / SECTIONS.length) * 100) : 0;

  return (
    <div className="w-full sm:w-60 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        {isSetup ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Profile setup</span>
              <span className="text-[11px] font-bold text-primary tabular-nums">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground">{visitedSteps?.size ?? 0} of {SECTIONS.length} sections visited</p>
          </div>
        ) : profile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0 overflow-hidden">
                {profile.logo ? <img src={profile.logo} alt="" className="w-full h-full object-cover" /> : getInitials(profile.name_en)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate leading-tight">{profile.name_en}</p>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5",
                  profile.status === "approved" ? "text-emerald-500" : profile.status === "rejected" ? "text-destructive" : "text-amber-500")}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-current" />
                  {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 divide-y divide-border/60">
              {[
                { label: "City", value: profile.city },
                { label: "Delivery", value: profile.offers_delivery ? formatDeliveryFee(profile.delivery_fee, profile.delivery_currency) : "No delivery" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center px-3 py-2">
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  <span className="text-[10px] font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Nav */}
      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden">
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          const isActive = section.id === activeSection;
          const isDone = isSetup && visitedSteps?.has(i);
          return (
            <button key={section.id} onClick={() => onSelect(section.id)}
              className={cn(
                "flex shrink-0 sm:shrink sm:w-full items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all duration-150 group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all",
                isActive ? "bg-primary border-primary text-primary-foreground"
                  : isDone ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500"
                    : "bg-muted border-border text-muted-foreground",
              )}>
                {isDone && !isActive ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <span className={cn("text-xs font-semibold leading-tight block truncate", isActive && "text-primary")}>
                  {section.label}
                </span>
                <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">{section.description}</p>
              </div>
              {!isSetup && isActive && (
                <div className="hidden sm:block w-1 h-4 rounded-full bg-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {!isSetup && onCreateNew && (
        <div className="p-3 border-t border-border">
          <Button variant="outline" onClick={onCreateNew}
            className="w-full text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground">
            <RefreshCw size={11} /> Reset & recreate
          </Button>
        </div>
      )}
      {isSetup && (
        <div className="hidden sm:block px-4 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">Jump between sections freely — no order needed</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Upload Row
// ─────────────────────────────────────────────────────────────────────────────
function ImageUploadRow({ profile }: { profile: PharmacyProfile }) {
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const uploadLogo = useUploadLogo();
  const uploadCover = useUploadCoverImage();

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    uploadLogo.mutate(file, { onSuccess: () => toast.success("Logo uploaded"), onError: (e) => toast.error(e.message) });
    e.target.value = "";
  };
  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    uploadCover.mutate(file, { onSuccess: () => toast.success("Cover uploaded"), onError: (e) => toast.error(e.message) });
    e.target.value = "";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[
        { label: "Logo", hint: "max 2MB", ref: logoRef, current: profile.logo, isPending: uploadLogo.isPending, handler: handleLogo, isRound: true },
        { label: "Cover image", hint: "max 4MB", ref: coverRef, current: profile.image, isPending: uploadCover.isPending, handler: handleCover, isRound: false },
      ].map(({ label, hint, ref, current, isPending, handler, isRound }) => (
        <div key={label} className="rounded-xl border border-border bg-muted/20 p-3 flex items-center gap-3 hover:border-border/80 transition-colors">
          <div className={cn("w-12 h-12 bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden", isRound ? "rounded-full" : "rounded-lg")}>
            {current ? <img src={current} alt={label} className="w-full h-full object-cover" />
              : <ImageIcon size={18} className="text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground">JPEG/PNG/WebP · {hint}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={isPending}
            className="text-xs h-8 gap-1.5 shrink-0">
            {isPending ? <RefreshCw size={11} className="animate-spin" /> : <Upload size={11} />}
            {current ? "Change" : "Upload"}
          </Button>
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={handler} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Working Hours Grid
// FIX: All time values pass through normalizeTime so we never send seconds.
// ─────────────────────────────────────────────────────────────────────────────
function WorkingHoursGrid({ value, onChange, readonly = false }: {
  value: WorkingHours; onChange?: (v: WorkingHours) => void; readonly?: boolean;
}) {
  const updateDay = (day: DayKey, patch: Partial<WorkingHoursDay>) =>
    onChange?.({ ...value, [day]: { ...value[day], ...patch } });

  const applyToAll = (day: DayKey) => {
    const src = value[day];
    const next = { ...value };
    DAYS_OF_WEEK.forEach((d) => {
      if (d !== day) next[d] = { ...next[d], opens_at: src.opens_at, closes_at: src.closes_at };
    });
    onChange?.(next);
  };

  return (
    <div className="space-y-1.5">
      {!readonly && (
        <div className="hidden sm:grid grid-cols-[96px_1fr_1fr_auto_auto] gap-2 px-3 mb-1">
          {["Day", "Opens at", "Closes at", "Copy", "Open"].map((h) => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</span>
          ))}
        </div>
      )}

      {DAYS_OF_WEEK.map((day) => {
        const d = value[day];
        const isWeekend = day === "saturday" || day === "sunday";

        if (readonly) {
          return (
            <div key={day} className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2.5 border text-xs transition-colors",
              d.enabled
                ? isWeekend ? "border-primary/20 bg-primary/5" : "border-border bg-card/50"
                : "border-border/30 bg-muted/10 opacity-50",
            )}>
              <span className={cn("font-semibold w-24", !d.enabled && "text-muted-foreground", isWeekend && d.enabled && "text-primary")}>
                {DAY_LABELS[day]}
              </span>
              {d.enabled
                ? <span className="font-mono text-foreground text-[11px]">{formatTime(d.opens_at)} – {formatTime(d.closes_at)}</span>
                : <span className="text-muted-foreground italic text-[11px]">Closed</span>}
              <span className={cn(
                "text-[10px] font-bold rounded-full px-2.5 py-0.5",
                d.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
              )}>
                {d.enabled ? "Open" : "Closed"}
              </span>
            </div>
          );
        }

        return (
          <div key={day} className={cn(
            "rounded-lg border transition-all duration-150",
            d.enabled
              ? isWeekend ? "border-primary/25 bg-primary/5" : "border-border bg-card"
              : "border-border/40 bg-muted/20 opacity-55",
          )}>
            {/* Desktop */}
            <div className="hidden sm:grid grid-cols-[96px_1fr_1fr_auto_auto] gap-2 items-center px-3 py-2.5">
              <span className={cn("text-xs font-semibold", !d.enabled && "text-muted-foreground", isWeekend && d.enabled && "text-primary")}>
                {DAY_LABELS[day].slice(0, 3)}
              </span>
              <input
                type="time"
                value={normalizeTime(d.opens_at)}
                disabled={!d.enabled}
                onChange={(e) => updateDay(day, { opens_at: normalizeTime(e.target.value) })}
                className={cn(
                  "w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all [color-scheme:dark]",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "[&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert",
                  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-100",
                )}
              />
              <input
                type="time"
                value={normalizeTime(d.closes_at)}
                disabled={!d.enabled}
                onChange={(e) => updateDay(day, { closes_at: normalizeTime(e.target.value) })}
                className={cn(
                  "w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all [color-scheme:dark]",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "[&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert",
                  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-100",
                )}
              />
              <button
                onClick={() => applyToAll(day)}
                disabled={!d.enabled}
                title="Copy to all days"
                className="text-[10px] font-bold text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors px-1"
              >
                ↓ All
              </button>
              <Switch checked={d.enabled} onCheckedChange={(v) => updateDay(day, { enabled: v })} />
            </div>

            {/* Mobile */}
            <div className="sm:hidden px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-bold", !d.enabled && "text-muted-foreground", isWeekend && d.enabled && "text-primary")}>
                  {DAY_LABELS[day]}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => applyToAll(day)} disabled={!d.enabled}
                    className="text-[10px] font-bold text-muted-foreground hover:text-primary disabled:opacity-30">
                    ↓ All
                  </button>
                  <Switch checked={d.enabled} onCheckedChange={(v) => updateDay(day, { enabled: v })} />
                </div>
              </div>
              {d.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">Opens at</span>
                    <input
                      type="time"
                      value={normalizeTime(d.opens_at)}
                      onChange={(e) => updateDay(day, { opens_at: normalizeTime(e.target.value) })}
                      className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">Closes at</span>
                    <input
                      type="time"
                      value={normalizeTime(d.closes_at)}
                      onChange={(e) => updateDay(day, { closes_at: normalizeTime(e.target.value) })}
                      className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Closures Manager
// FIX: normalizeDate strips ISO timestamps; DateInput shows calendar icon.
// ─────────────────────────────────────────────────────────────────────────────
function ClosuresManager() {
  const { data: closures = [], isLoading } = useGetClosures();
  const createClosure = useCreateClosure();
  const updateClosure = useUpdateClosure();
  const deleteClosure = useDeleteClosure();
  const checkDate = useCheckClosureDate();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ from_date: "", to_date: "", reason: "" });
  const [checkDateVal, setCheckDateVal] = useState("");
  const [checkResult, setCheckResult] = useState<{ is_closed: boolean; reason: string | null } | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const resetForm = () => { setShowForm(false); setEditingId(null); setForm({ from_date: "", to_date: "", reason: "" }); };

  const handleSubmit = () => {
    if (!form.from_date || !form.to_date) return;
    const payload = { from_date: form.from_date, to_date: form.to_date, reason: form.reason || undefined };
    if (editingId !== null) {
      updateClosure.mutate({ id: editingId, payload }, {
        onSuccess: () => { toast.success("Closure updated"); resetForm(); },
        onError: (e) => toast.error(e.message),
      });
    } else {
      createClosure.mutate(payload, {
        onSuccess: () => { toast.success("Closure saved"); resetForm(); },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleCheck = () => {
    if (!checkDateVal) return;
    checkDate.mutate(checkDateVal, {
      onSuccess: (r) => setCheckResult({ is_closed: r.is_closed, reason: r.reason }),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-3">
      {/* Check a date */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Check a date</p>
        <div className="flex gap-2 items-center">
          {/* FIX: use DateInput for consistent icon visibility */}
          <div className="flex-1">
            <DateInput
              value={checkDateVal}
              min={today}
              onChange={(v) => { setCheckDateVal(v); setCheckResult(null); }}
            />
          </div>
          <Button size="sm" onClick={handleCheck} disabled={!checkDateVal || checkDate.isPending}
            className="h-9 text-xs bg-primary text-primary-foreground px-4 shrink-0">
            {checkDate.isPending ? <RefreshCw size={11} className="animate-spin" /> : "Check"}
          </Button>
        </div>
        {checkResult && (
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-semibold border",
            checkResult.is_closed
              ? "bg-destructive/10 text-destructive border-destructive/25"
              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
          )}>
            {checkResult.is_closed
              ? <><CalendarOff size={12} /> Closed{checkResult.reason ? ` — ${checkResult.reason}` : ""}</>
              : <><Check size={12} /> Open on this date</>}
          </div>
        )}
      </div>

      {/* Existing closures list */}
      {isLoading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : closures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-6 text-center">
          <CalendarOff size={20} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-[11px] text-muted-foreground">No upcoming closures scheduled</p>
        </div>
      ) : (
        <div className="space-y-2">
          {closures.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-border/80 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <CalendarOff size={13} className="text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                {/* FIX: use formatDateDisplay to convert ISO timestamps to readable dates */}
                <p className="text-xs font-semibold text-foreground">
                  {formatDateDisplay(c.from_date)} → {formatDateDisplay(c.to_date)}
                </p>
                {c.reason && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.reason}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    // FIX: normalise dates before populating the edit form
                    setForm({
                      from_date: normalizeDate(c.from_date),
                      to_date: normalizeDate(c.to_date),
                      reason: c.reason ?? "",
                    });
                    setEditingId(c.id);
                    setShowForm(true);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this closure?")) {
                      deleteClosure.mutate(c.id, {
                        onSuccess: () => toast.success("Closure removed"),
                        onError: (e) => toast.error(e.message),
                      });
                    }
                  }}
                  disabled={deleteClosure.isPending}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm ? (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-primary">{editingId !== null ? "Edit closure" : "New closure period"}</p>
            <button onClick={resetForm}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From date">
              {/* FIX: DateInput ensures calendar icon is visible */}
              <DateInput value={form.from_date} min={today} onChange={(v) => setForm((f) => ({ ...f, from_date: v }))} />
            </FormField>
            <FormField label="To date">
              <DateInput value={form.to_date} min={form.from_date || today} onChange={(v) => setForm((f) => ({ ...f, to_date: v }))} />
            </FormField>
          </div>
          <FormField label="Reason (optional)">
            <Input
              value={form.reason}
              placeholder="e.g. Christmas Holiday"
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="h-9 text-xs"
            />
          </FormField>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={resetForm} className="flex-1 h-9 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSubmit}
              disabled={!form.from_date || !form.to_date || createClosure.isPending || updateClosure.isPending}
              className="flex-1 h-9 text-xs bg-primary text-primary-foreground gap-1.5">
              {(createClosure.isPending || updateClosure.isPending) ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
              {editingId !== null ? "Update closure" : "Save closure"}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}
          className="w-full h-9 text-xs gap-2 border-dashed hover:border-primary hover:text-primary transition-colors">
          <Plus size={12} /> Add closure period
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section panels — General, Location, Contact, Hours, Working Hours, Social
// ─────────────────────────────────────────────────────────────────────────────

function GeneralSection({ profile, onSaved }: { profile: PharmacyProfile; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name_en: profile.name_en, name_fr: profile.name_fr ?? "",
      description_en: profile.description_en ?? "", registration_number: profile.registration_number ?? "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    save.mutate(data, {
      onSuccess: () => { toast.success("General info updated"); setEditing(false); onSaved(); },
      onError: (e) => toast.error(e.message),
    });
  });

  return (
    <SectionCard title="General information" icon={Building2} isEditing={editing}
      editBar={<SectionEditBar onEdit={() => setEditing(true)} onCancel={() => { reset(); setEditing(false); }} onSave={onSubmit} isEditing={editing} isSaving={save.isPending} />}>
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Name (English)" error={errors.name_en?.message}>
            <Input {...register("name_en", { required: "Required" })} className="h-9 text-xs" />
          </FormField>
          <FormField label="Name (French)">
            <Input {...register("name_fr")} className="h-9 text-xs" />
          </FormField>
          <FormField label="Registration Number" className="col-span-1 sm:col-span-2">
            <Input {...register("registration_number")} className="h-9 text-xs font-mono" />
          </FormField>
          <FormField label="Description" className="col-span-1 sm:col-span-2">
            <Input {...register("description_en")} className="h-9 text-xs" />
          </FormField>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <ViewRow label="Name (EN)" value={profile.name_en} />
          <ViewRow label="Name (FR)" value={profile.name_fr ?? ""} />
          <ViewRow label="Registration" value={profile.registration_number ?? ""} mono />
          {profile.description_en && (
            <div className="col-span-1 sm:col-span-2 pt-3 border-t border-border/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Description</p>
              <p className="text-xs text-foreground leading-relaxed">{profile.description_en}</p>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function LocationSection({ profile, onSaved }: { profile: PharmacyProfile; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      address: profile.address ?? "", city: profile.city ?? "", province: profile.province ?? "",
      country: profile.country ?? "",
      latitude: profile.latitude != null ? String(profile.latitude) : "",
      longitude: profile.longitude != null ? String(profile.longitude) : "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    save.mutate({
      ...data,
      latitude: data.latitude ? parseFloat(data.latitude) : undefined,
      longitude: data.longitude ? parseFloat(data.longitude) : undefined,
    }, {
      onSuccess: () => { toast.success("Location updated"); setEditing(false); onSaved(); },
      onError: (e) => toast.error(e.message),
    });
  });

  return (
    <SectionCard title="Location" icon={MapPin} isEditing={editing}
      editBar={<SectionEditBar onEdit={() => setEditing(true)} onCancel={() => { reset(); setEditing(false); }} onSave={onSubmit} isEditing={editing} isSaving={save.isPending} />}>
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Street Address" error={errors.address?.message} className="col-span-1 sm:col-span-2">
            <Input {...register("address", { required: "Required" })} className="h-9 text-xs" />
          </FormField>
          <FormField label="City" error={errors.city?.message}>
            <Input {...register("city", { required: "Required" })} className="h-9 text-xs" />
          </FormField>
          <FormField label="Province">
            <Input {...register("province")} className="h-9 text-xs" />
          </FormField>
          <FormField label="Country" error={errors.country?.message} className="col-span-1 sm:col-span-2">
            <Input {...register("country", { required: "Required" })} className="h-9 text-xs" />
          </FormField>
          <FormField label="Latitude">
            <Input {...register("latitude")} placeholder="-1.9441" className="h-9 text-xs font-mono" />
          </FormField>
          <FormField label="Longitude">
            <Input {...register("longitude")} placeholder="30.0619" className="h-9 text-xs font-mono" />
          </FormField>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-1 sm:col-span-2"><ViewRow label="Street" value={profile.address} /></div>
          <ViewRow label="City" value={profile.city} />
          <ViewRow label="Province" value={profile.province ?? ""} />
          <ViewRow label="Country" value={profile.country} />
          {profile.latitude != null && (
            <ViewRow label="Coordinates" value={`${profile.latitude}, ${profile.longitude}`} mono />
          )}
        </div>
      )}
    </SectionCard>
  );
}

function ContactSection({ profile, onSaved }: { profile: PharmacyProfile; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { phone: profile.phone ?? "", email: profile.email ?? "" },
  });

  const onSubmit = handleSubmit((data) => {
    save.mutate(data, {
      onSuccess: () => { toast.success("Contact details updated"); setEditing(false); onSaved(); },
      onError: (e) => toast.error(e.message),
    });
  });

  return (
    <SectionCard title="Contact details" icon={Phone} isEditing={editing}
      editBar={<SectionEditBar onEdit={() => setEditing(true)} onCancel={() => { reset(); setEditing(false); }} onSave={onSubmit} isEditing={editing} isSaving={save.isPending} />}>
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Phone Number" error={errors.phone?.message} className="col-span-1 sm:col-span-2">
            <Input type="tel" {...register("phone", { required: "Required" })} className="h-9 text-xs" />
          </FormField>
          <FormField label="Email Address" error={errors.email?.message} className="col-span-1 sm:col-span-2">
            <Input type="email" {...register("email", {
              required: "Required",
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" },
            })} className="h-9 text-xs" />
          </FormField>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <Phone size={13} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Phone</p>
              <span className="text-xs font-bold font-mono text-primary">{formatPhone(profile.phone)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-[11px] font-bold shrink-0">@</div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground mb-0.5">Email</p>
              <span className="text-xs font-semibold text-foreground truncate block">{profile.email}</span>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function HoursSection({ profile, onSaved }: { profile: PharmacyProfile; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      is_open_24h: profile.is_open_24h,
      // FIX: normalise times from profile
      opens_at: normalizeTime(profile.opens_at ?? "08:00"),
      closes_at: normalizeTime(profile.closes_at ?? "18:00"),
      offers_delivery: profile.offers_delivery,
      offers_pickup: profile.offers_pickup,
      delivery_fee: profile.delivery_fee ?? "0",
      delivery_currency: profile.delivery_currency ?? "RWF",
      delivery_radius_km: profile.delivery_radius_km != null ? String(profile.delivery_radius_km) : "",
      estimated_delivery_minutes: profile.estimated_delivery_minutes != null ? String(profile.estimated_delivery_minutes) : "",
    },
  });
  const is24h = watch("is_open_24h");
  const offersDelivery = watch("offers_delivery");

  const onSubmit = handleSubmit((data) => {
    save.mutate({
      is_open_24h: data.is_open_24h,
      // FIX: normalise before sending so no seconds leak through
      opens_at: data.is_open_24h ? undefined : normalizeTime(data.opens_at),
      closes_at: data.is_open_24h ? undefined : normalizeTime(data.closes_at),
      offers_delivery: data.offers_delivery,
      offers_pickup: data.offers_pickup,
      delivery_fee: data.delivery_fee ? parseFloat(data.delivery_fee) : undefined,
      delivery_currency: data.delivery_currency,
      delivery_radius_km: data.delivery_radius_km ? parseFloat(data.delivery_radius_km) : undefined,
      estimated_delivery_minutes: data.estimated_delivery_minutes ? parseFloat(data.estimated_delivery_minutes) : undefined,
    }, {
      onSuccess: () => { toast.success("Hours & delivery updated"); setEditing(false); onSaved(); },
      onError: (e) => toast.error(e.message),
    });
  });

  return (
    <SectionCard title="Hours & delivery" icon={Truck} isEditing={editing}
      editBar={<SectionEditBar onEdit={() => setEditing(true)} onCancel={() => { reset(); setEditing(false); }} onSave={onSubmit} isEditing={editing} isSaving={save.isPending} />}>
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-xs font-semibold">Open 24 hours</p>
              <p className="text-[10px] text-muted-foreground">Overrides open/close times</p>
            </div>
            <Switch checked={is24h} onCheckedChange={(v) => setValue("is_open_24h", v)} />
          </div>
          <FormField label="Opens At">
            <input
              type="time"
              disabled={is24h}
              {...register("opens_at")}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary [color-scheme:dark] disabled:opacity-40 transition-all [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </FormField>
          <FormField label="Closes At">
            <input
              type="time"
              disabled={is24h}
              {...register("closes_at")}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary [color-scheme:dark] disabled:opacity-40 transition-all [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </FormField>
          <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-3">
            {(["offers_delivery", "offers_pickup"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="text-xs font-semibold capitalize">{key.replace("offers_", "Offers ")}</p>
                <Switch checked={watch(key)} onCheckedChange={(v) => setValue(key, v)} />
              </div>
            ))}
          </div>
          {offersDelivery && (
            <>
              <FormField label="Delivery Fee (RWF)">
                <Input type="number" {...register("delivery_fee")} className="h-9 text-xs" />
              </FormField>
              <FormField label="Radius (km)">
                <Input type="number" {...register("delivery_radius_km")} className="h-9 text-xs" />
              </FormField>
              <FormField label="Est. Delivery Time (min)" className="col-span-1 sm:col-span-2">
                <Input type="number" {...register("estimated_delivery_minutes")} className="h-9 text-xs" />
              </FormField>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {profile.is_open_24h
            ? <div className="col-span-1 sm:col-span-2"><ViewRow label="Hours" value="Open 24 hours" /></div>
            : (
              <>
                <ViewRow label="Opens at" value={formatTime(profile.opens_at)} />
                <ViewRow label="Closes at" value={formatTime(profile.closes_at)} />
              </>
            )}
          {profile.offers_delivery && (
            <>
              <ViewRow label="Delivery fee" value={formatDeliveryFee(profile.delivery_fee, profile.delivery_currency)} />
              <ViewRow label="Radius" value={`${profile.delivery_radius_km} km`} />
              <div className="col-span-1 sm:col-span-2">
                <ViewRow label="Est. delivery time" value={`${profile.estimated_delivery_minutes} minutes`} />
              </div>
            </>
          )}
          <div className="col-span-1 sm:col-span-2 flex gap-2 flex-wrap">
            {profile.offers_delivery && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1 bg-primary/15 text-primary">
                <Check size={10} /> Delivery
              </span>
            )}
            {profile.offers_pickup && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1 bg-primary/15 text-primary">
                <Check size={10} /> Pickup
              </span>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function WorkingHoursSection({ workingHoursData }: { workingHoursData: WorkingHourRecord[] }) {
  const [editing, setEditing] = useState(false);
  const setHours = useSetWorkingHours();
  const resetHours = useResetWorkingHours();

  const saved = workingHoursData.length > 0 ? apiHoursToForm(workingHoursData) : DEFAULT_WORKING_HOURS;
  const [localHours, setLocalHours] = useState<WorkingHours>(saved);

  useEffect(() => { setLocalHours(saved); }, [workingHoursData]);

  const handleSave = () => {
    const payload: WorkingHourPayload[] = DAYS_OF_WEEK.map((day) => ({
      day_of_week: day,
      // FIX: normalise time before sending to API
      open_time: localHours[day].enabled ? normalizeTime(localHours[day].opens_at) : null,
      close_time: localHours[day].enabled ? normalizeTime(localHours[day].closes_at) : null,
      is_closed: !localHours[day].enabled,
    }));
    setHours.mutate(payload, {
      onSuccess: () => { toast.success("Working hours saved"); setEditing(false); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleCancel = () => { setLocalHours(saved); setEditing(false); };

  const handleReset = () => {
    if (!confirm("Reset all working hours to defaults?")) return;
    resetHours.mutate(undefined, {
      onSuccess: () => { toast.success("Working hours reset"); setLocalHours(DEFAULT_WORKING_HOURS); setEditing(false); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-3">
      <SectionCard title="Weekly working hours" icon={Calendar} isEditing={editing}
        editBar={<SectionEditBar onEdit={() => setEditing(true)} onCancel={handleCancel} onSave={handleSave} isEditing={editing} isSaving={setHours.isPending} />}>
        <WorkingHoursGrid value={localHours} onChange={editing ? setLocalHours : undefined} readonly={!editing} />
        {editing && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={resetHours.isPending}
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5 h-8">
              {resetHours.isPending ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Reset all to defaults
            </Button>
            <p className="text-[10px] text-muted-foreground">Use "↓ All" to copy times across all days</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Closure periods" icon={CalendarOff}>
        <ClosuresManager />
      </SectionCard>
    </div>
  );
}

function SocialLinksSection({ profile, onSaved }: { profile: PharmacyProfile; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  const links = profile.social_links ?? {};

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      website: links.website ?? "", facebook: links.facebook ?? "", twitter: links.twitter ?? "",
      instagram: links.instagram ?? "", linkedin: links.linkedin ?? "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    save.mutate({ website: data.website || undefined }, {
      onSuccess: () => { toast.success("Social links updated"); setEditing(false); onSaved(); },
      onError: (e) => toast.error(e.message),
    });
  });

  const activeLinks = SOCIAL_PLATFORMS.filter(({ key }) => links[key as keyof typeof links]);

  return (
    <SectionCard title="Social media & web" icon={Share2} isEditing={editing}
      editBar={<SectionEditBar onEdit={() => setEditing(true)} onCancel={() => { reset(); setEditing(false); }} onSave={onSubmit} isEditing={editing} isSaving={save.isPending} />}>
      {editing ? (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">All fields are optional.</p>
          {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
            <FormField key={key} label={label}>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  {...register(key as any)}
                  placeholder={placeholder}
                  type="url"
                  className="flex-1 h-9 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
              </div>
            </FormField>
          ))}
        </div>
      ) : activeLinks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-6 text-center">
          <Share2 size={20} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-[11px] text-muted-foreground">No social links added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeLinks.map(({ key, label, icon: Icon }) => (
            <a key={key} href={links[key as keyof typeof links] as string} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 hover:border-primary/40 hover:bg-primary/5 px-4 py-3 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/15 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all">
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-[11px] font-semibold truncate group-hover:text-primary transition-colors">
                  {(links[key as keyof typeof links] as string).replace(/^https?:\/\/(www\.)?/, "")}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Router
// ─────────────────────────────────────────────────────────────────────────────
function SectionRouter({ activeSection, profile, workingHours, closures, onSaved }: {
  activeSection: SectionId; profile: PharmacyProfile;
  workingHours: WorkingHourRecord[]; closures: ClosureRecord[]; onSaved: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
      {profile.status !== "approved" && (
        <div className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold border",
          profile.status === "rejected"
            ? "bg-destructive/10 border-destructive/25 text-destructive"
            : "bg-amber-500/10 border-amber-500/25 text-amber-500",
        )}>
          <AlertCircle size={14} className="shrink-0" />
          {profile.status === "rejected"
            ? "Your profile was rejected. Please edit and resubmit."
            : "Your profile is pending admin approval."}
        </div>
      )}

      {activeSection === "general" && (
        <>
          <SectionCard title="Images" icon={ImageIcon}>
            <ImageUploadRow profile={profile} />
          </SectionCard>
          <GeneralSection profile={profile} onSaved={onSaved} />
        </>
      )}
      {activeSection === "location" && <LocationSection profile={profile} onSaved={onSaved} />}
      {activeSection === "contact" && <ContactSection profile={profile} onSaved={onSaved} />}
      {activeSection === "hours" && <HoursSection profile={profile} onSaved={onSaved} />}
      {activeSection === "working_hours" && <WorkingHoursSection workingHoursData={workingHours} />}
      {activeSection === "social_links" && <SocialLinksSection profile={profile} onSaved={onSaved} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup Wizard (multi-step create form)
// FIX: All time inputs here also use normalizeTime before sending to API.
// ─────────────────────────────────────────────────────────────────────────────
function SetupWizard({ workingHoursData, onSuccess }: { workingHoursData: WorkingHourRecord[]; onSuccess: () => void }) {
  const createOrUpdate = useCreateOrUpdateProfile();
  const setWorkingHours = useSetWorkingHours();

  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const currentIdx = SECTIONS.findIndex((s) => s.id === activeSection);
  const isLast = currentIdx === SECTIONS.length - 1;

  const { register, handleSubmit, trigger, setValue, watch, formState: { errors } } = useForm<PharmacyProfileFormData>({
    defaultValues: {
      is_open_24h: false, offers_delivery: true, offers_pickup: true,
      delivery_currency: "RWF", working_hours: DEFAULT_WORKING_HOURS, social_links: DEFAULT_SOCIAL_LINKS,
    },
  });

  const is24h = watch("is_open_24h");
  const offersDelivery = watch("offers_delivery");
  const workingHours = watch("working_hours");
  const socialLinks = watch("social_links");

  const goTo = (id: SectionId) => {
    const idx = SECTIONS.findIndex((s) => s.id === id);
    setVisited((v) => new Set([...v, idx]));
    setActiveSection(id);
  };

  const goNext = async () => {
    if (activeSection === "general") {
      const valid = await trigger(["name_en", "registration_number"]);
      if (!valid) return;
    }
    if (isLast) { handleSubmit(onFinalSubmit)(); return; }
    goTo(SECTIONS[currentIdx + 1].id);
  };

  const onFinalSubmit = async (data: PharmacyProfileFormData) => {
    try {
      await createOrUpdate.mutateAsync({
        name_en: data.name_en, name_fr: data.name_fr, description_en: data.description_en,
        registration_number: data.registration_number, address: data.address, city: data.city,
        province: data.province, country: data.country,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
        phone: data.phone, email: data.email, website: data.social_links.website || undefined,
        is_open_24h: data.is_open_24h,
        // FIX: normalise before sending
        opens_at: data.is_open_24h ? undefined : normalizeTime(data.opens_at),
        closes_at: data.is_open_24h ? undefined : normalizeTime(data.closes_at),
        offers_delivery: data.offers_delivery, offers_pickup: data.offers_pickup,
        delivery_fee: data.delivery_fee ? parseFloat(data.delivery_fee) : undefined,
        delivery_currency: data.delivery_currency,
        delivery_radius_km: data.delivery_radius_km ? parseFloat(data.delivery_radius_km) : undefined,
        estimated_delivery_minutes: data.estimated_delivery_minutes ? parseFloat(data.estimated_delivery_minutes) : undefined,
      });

      const hoursPayload: WorkingHourPayload[] = DAYS_OF_WEEK.map((day) => ({
        day_of_week: day,
        // FIX: normalise working hours before sending
        open_time: data.working_hours[day].enabled ? normalizeTime(data.working_hours[day].opens_at) : null,
        close_time: data.working_hours[day].enabled ? normalizeTime(data.working_hours[day].closes_at) : null,
        is_closed: !data.working_hours[day].enabled,
      }));
      await setWorkingHours.mutateAsync(hoursPayload);

      toast.success("Profile created! Awaiting admin approval.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    }
  };

  const isPending = createOrUpdate.isPending || setWorkingHours.isPending;
  const section = SECTIONS[currentIdx];

  const timeInputClass = "w-full h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary [color-scheme:dark] disabled:opacity-40 transition-all [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer";

  return (
    <div className="flex flex-col sm:flex-row flex-1 min-h-0">
      <Sidebar activeSection={activeSection} onSelect={goTo} mode="setup" profile={null} visitedSteps={visited} />

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 px-5 pt-4 pb-3.5 border-b border-border">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary-foreground">{currentIdx + 1}</span>
          </div>
          <span className="text-sm font-bold text-foreground">{section.label}</span>
          <span className="ml-auto text-[11px] text-muted-foreground font-medium">
            Step {currentIdx + 1} of {SECTIONS.length}
          </span>
        </div>

        <div key={activeSection} className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeSection === "general" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Name (English) *" error={errors.name_en?.message}>
                <Input {...register("name_en", { required: "Required" })} placeholder="MediPharm Kigali" className="h-9 text-xs" />
              </FormField>
              <FormField label="Name (French)">
                <Input {...register("name_fr")} placeholder="MediPharmacie Kigali" className="h-9 text-xs" />
              </FormField>
              <FormField label="Registration Number *" error={errors.registration_number?.message} className="col-span-1 sm:col-span-2">
                <Input {...register("registration_number", { required: "Required" })} placeholder="RW-PHARM-2024-001" className="h-9 text-xs font-mono" />
              </FormField>
              <FormField label="Description" className="col-span-1 sm:col-span-2">
                <Input {...register("description_en")} placeholder="Your trusted neighborhood pharmacy…" className="h-9 text-xs" />
              </FormField>
            </div>
          )}

          {activeSection === "location" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Street Address *" error={errors.address?.message} className="col-span-1 sm:col-span-2">
                <Input {...register("address", { required: "Required" })} placeholder="KN 5 Rd, Nyarugenge" className="h-9 text-xs" />
              </FormField>
              <FormField label="City *" error={errors.city?.message}>
                <Input {...register("city", { required: "Required" })} placeholder="Kigali" className="h-9 text-xs" />
              </FormField>
              <FormField label="Province">
                <Input {...register("province")} placeholder="Kigali City" className="h-9 text-xs" />
              </FormField>
              <FormField label="Country *" error={errors.country?.message} className="col-span-1 sm:col-span-2">
                <Input {...register("country", { required: "Required" })} placeholder="Rwanda" className="h-9 text-xs" />
              </FormField>
              <FormField label="Latitude">
                <Input {...register("latitude")} placeholder="-1.9441" className="h-9 text-xs font-mono" />
              </FormField>
              <FormField label="Longitude">
                <Input {...register("longitude")} placeholder="30.0619" className="h-9 text-xs font-mono" />
              </FormField>
            </div>
          )}

          {activeSection === "contact" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Phone Number *" error={errors.phone?.message} className="col-span-1 sm:col-span-2">
                <Input type="tel" {...register("phone", { required: "Required" })} placeholder="+250788000200" className="h-9 text-xs" />
              </FormField>
              <FormField label="Email Address *" error={errors.email?.message} className="col-span-1 sm:col-span-2">
                <Input type="email" {...register("email", { required: "Required", pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" } })}
                  placeholder="info@medipharm.rw" className="h-9 text-xs" />
              </FormField>
            </div>
          )}

          {activeSection === "hours" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold">Open 24 hours</p>
                  <p className="text-[10px] text-muted-foreground">Overrides open/close times</p>
                </div>
                <Switch checked={is24h} onCheckedChange={(v) => setValue("is_open_24h", v)} />
              </div>
              <FormField label="Opens At">
                <input type="time" disabled={is24h} {...register("opens_at")} className={timeInputClass} />
              </FormField>
              <FormField label="Closes At">
                <input type="time" disabled={is24h} {...register("closes_at")} className={timeInputClass} />
              </FormField>
              <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-3">
                {(["offers_delivery", "offers_pickup"] as const).map((key) => (
                  <div key={key} className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <p className="text-xs font-semibold capitalize">{key.replace("offers_", "Offers ")}</p>
                    <Switch checked={watch(key)} onCheckedChange={(v) => setValue(key, v)} />
                  </div>
                ))}
              </div>
              {offersDelivery && (
                <>
                  <FormField label="Delivery Fee (RWF)">
                    <Input type="number" {...register("delivery_fee")} placeholder="2000" className="h-9 text-xs" />
                  </FormField>
                  <FormField label="Radius (km)">
                    <Input type="number" {...register("delivery_radius_km")} placeholder="10" className="h-9 text-xs" />
                  </FormField>
                  <FormField label="Est. Delivery Time (min)" className="col-span-1 sm:col-span-2">
                    <Input type="number" {...register("estimated_delivery_minutes")} placeholder="45" className="h-9 text-xs" />
                  </FormField>
                </>
              )}
            </div>
          )}

          {activeSection === "working_hours" && (
            <div className="space-y-2">
              <WorkingHoursGrid
                value={workingHours ?? DEFAULT_WORKING_HOURS}
                onChange={(v) => setValue("working_hours", v)}
              />
              <p className="text-[10px] text-muted-foreground pt-2">Use "↓ All" to copy a day's hours across the full week.</p>
            </div>
          )}

          {activeSection === "social_links" && (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">All fields are optional.</p>
              {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
                <FormField key={key} label={label}>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      {...register(`social_links.${key}` as any)}
                      placeholder={placeholder}
                      type="url"
                      className="flex-1 h-9 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                    />
                  </div>
                </FormField>
              ))}
            </div>
          )}
        </div>

        {/* Wizard footer */}
        <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-t border-border">
          <Button variant="outline" onClick={() => { if (currentIdx > 0) goTo(SECTIONS[currentIdx - 1].id); }}
            disabled={currentIdx === 0} className="text-xs h-9 px-4">
            ← Back
          </Button>
          <div className="flex items-center gap-1.5">
            {SECTIONS.map((_, i) => (
              <div key={i} className={cn(
                "rounded-full transition-all duration-300",
                i === currentIdx ? "w-4 h-1.5 bg-primary" : visited.has(i) ? "w-1.5 h-1.5 bg-primary/40" : "w-1.5 h-1.5 bg-muted-foreground/25",
              )} />
            ))}
          </div>
          <Button onClick={goNext} disabled={isPending}
            className="text-xs h-9 px-5 bg-primary text-primary-foreground gap-1.5 shadow-sm shadow-primary/30">
            {isPending && <RefreshCw size={11} className="animate-spin" />}
            {isLast ? "Create profile" : "Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state & skeleton
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
        <Building2 className="h-9 w-9 text-muted-foreground" />
      </div>
      <h2 className="text-base font-bold text-foreground mb-2">No pharmacy profile found</h2>
      <p className="text-xs text-muted-foreground mb-6 max-w-xs leading-relaxed">
        Create your pharmacy profile to manage your information, hours, and delivery settings in one place.
      </p>
      <Button onClick={onCreate} className="text-primary-foreground bg-primary hover:bg-primary/90 gap-2 h-10 px-5">
        <Plus className="h-4 w-4" /> Create Profile
      </Button>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex-1 p-4 sm:p-5 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Skeleton className="h-7 w-7 rounded-lg" /><Skeleton className="h-4 w-36" /></div>
            <Skeleton className="h-7 w-14 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-8 rounded-lg" /><Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg col-span-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Page
// ─────────────────────────────────────────────────────────────────────────────
type PageMode = "setup" | "view";

const PharmacyProfile = () => {
  const { t, i18n } = useTranslation();
  const { data: profile, isLoading: profileLoading, refetch } = useGetPharmacyProfile();
  const { data: workingHours = [], isLoading: hoursLoading } = useGetWorkingHours();
  const { data: closures = [] } = useGetClosures();

  const [pageMode, setPageMode] = useState<PageMode>("view");
  const [activeSection, setActiveSection] = useState<SectionId>("general");

  const hasProfile = !!profile;
  const isLoading = profileLoading || hoursLoading;

  useEffect(() => {
    if (!profileLoading && !hasProfile) setPageMode("setup");
    if (!profileLoading && hasProfile) setPageMode("view");
  }, [profileLoading, hasProfile]);

  const handleSetupSuccess = () => { refetch(); setPageMode("view"); setActiveSection("general"); };

  const stats = profile ? {
    city: profile.city,
    status: profile.status.charAt(0).toUpperCase() + profile.status.slice(1),
    hours: profile.is_open_24h ? "24h" : `${formatTime(profile.opens_at)} – ${formatTime(profile.closes_at)}`,
    delivery: profile.offers_delivery ? formatDeliveryFee(profile.delivery_fee, profile.delivery_currency) : "None",
    radius: profile.offers_delivery ? `${profile.delivery_radius_km} km` : "—",
    eta: profile.offers_delivery ? `${profile.estimated_delivery_minutes} min` : "—",
  } : null;

  return (
    <DashboardLayout role="pharmacy">
      <PageHeader
        title={t("pages.pharmacy.profile_title")}
        subtitle={pageMode === "setup" ? "Fill in the details below to get started" : t("pages.pharmacy.profile_sub")}
      />

      <div className="px-3 py-4 sm:px-6 sm:py-8 space-y-4 sm:space-y-5">
        {/* Stats bar */}
        {stats && pageMode === "view" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <StatCard label="City" value={stats.city} />
            <StatCard label="Status" value={stats.status} accent={profile?.status === "approved"} />
            <StatCard label="Hours" value={stats.hours} />
            <StatCard label="Delivery fee" value={stats.delivery} accent />
            <StatCard label="Radius" value={stats.radius} sub="km coverage" />
            <StatCard label="Est. time" value={stats.eta} sub="delivery ETA" />
          </div>
        )}

        {/* Main card */}
        <div className={cn(
          "rounded-xl border border-border bg-card overflow-hidden shadow-sm",
          "flex flex-col sm:flex-row min-h-[600px]",
        )}>
          {isLoading ? (
            <div className="flex flex-col sm:flex-row flex-1">
              <div className="w-full sm:w-60 border-b sm:border-b-0 sm:border-r border-border bg-card/50 p-3 space-y-2">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}
              </div>
              <ProfileSkeleton />
            </div>
          ) : pageMode === "setup" ? (
            <SetupWizard workingHoursData={workingHours} onSuccess={handleSetupSuccess} />
          ) : profile ? (
            <div className="flex flex-col sm:flex-row flex-1 min-h-0">
              <Sidebar
                activeSection={activeSection}
                onSelect={setActiveSection}
                mode="view"
                profile={profile}
                onCreateNew={() => setPageMode("setup")}
              />
              <SectionRouter
                activeSection={activeSection}
                profile={profile}
                workingHours={workingHours}
                closures={closures}
                onSaved={refetch}
              />
            </div>
          ) : (
            <EmptyState onCreate={() => setPageMode("setup")} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyProfile;
