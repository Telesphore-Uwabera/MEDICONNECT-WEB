// import { useMemo, useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Star,
//   MapPin,
//   BedDouble,
//   CalendarCheck,
//   CalendarDays,
//   TrendingUp,
//   Activity,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
//   SheetDescription,
//   SheetFooter,
// } from "@/components/ui/sheet";
// import { HospitalInfo, useHospitalSchedule } from "@/lib/hospital-store";
// import { HospitalBookingDialog } from "@/components/HospitalBookingDialog";
// import { cn } from "@/lib/utils";

// // ─────────────────────────────────────────────────────────────────────────────
// // Schedule Drawer (was Dialog → now Sheet from the right)
// // ─────────────────────────────────────────────────────────────────────────────
// function ScheduleDrawer({
//   hospital,
//   open,
//   onOpenChange,
// }: {
//   hospital: HospitalInfo;
//   open: boolean;
//   onOpenChange: (v: boolean) => void;
// }) {
//   const { t, i18n } = useTranslation();
//   const schedule = useHospitalSchedule(hospital.name);
//   const activeDays = schedule?.days?.filter((d) => d.active) ?? [];
//   const totalCapacity = activeDays.reduce((s, d) => s + d.capacity, 0);
//   const totalBooked   = activeDays.reduce((s, d) => s + d.booked,   0);
//   const overallPct    = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

//   return (
//     <Sheet open={open} onOpenChange={onOpenChange}>
//       <SheetContent
//         side="right"
//         className="w-full sm:max-w-sm flex flex-col gap-0 p-0 bg-background border-l border-border"
//       >
//         {/* Header */}
//         <SheetHeader className="px-5 py-4 border-b border-border bg-muted/40 shrink-0">
//           <div className="flex items-center gap-3">
//             <div className="h-8 w-8 rounded-sm flex items-center justify-center bg-primary/10 text-primary font-bold text-[11px] shrink-0 border border-primary/15">
//               {hospital.image}
//             </div>
//             <div className="min-w-0 flex-1">
//               <SheetTitle className="text-[13px] font-semibold text-foreground leading-tight truncate">
//                 {hospital.name}
//               </SheetTitle>
//               <SheetDescription className="text-[10px] text-muted-foreground mt-0.5">
//                 {t("pages.cards.upcoming_availability")}
//               </SheetDescription>
//             </div>
//           </div>

//           {/* Overall utilisation bar */}
//           {activeDays.length > 0 && (
//             <div className="mt-3 pt-3 border-t border-border/60">
//               <div className="flex items-center justify-between mb-1.5">
//                 <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
//                   <Activity className="h-2.5 w-2.5" /> Overall utilisation
//                 </span>
//                 <span className="text-[10px] font-semibold tabular-nums text-foreground">
//                   {overallPct}%
//                 </span>
//               </div>
//               <div className="h-1.5 rounded-full bg-muted overflow-hidden">
//                 <div
//                   className="h-full rounded-full transition-all duration-500"
//                   style={{
//                     width: `${overallPct}%`,
//                     background:
//                       overallPct >= 100
//                         ? "var(--destructive)"
//                         : overallPct >= 70
//                         ? "hsl(38 92% 50%)"
//                         : "hsl(var(--primary))",
//                   }}
//                 />
//               </div>
//               <p className="text-[9px] text-muted-foreground mt-1 tabular-nums">
//                 {totalBooked} booked of {totalCapacity} total spots
//               </p>
//             </div>
//           )}
//         </SheetHeader>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto">
//           {schedule?.days?.length ? (
//             <>
//               {/* Column headers */}
//               <div className="flex items-center gap-3 px-5 pt-3 pb-2 border-b border-border/60 bg-muted/20 sticky top-0 z-10">
//                 <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex-1">
//                   Date
//                 </span>
//                 <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground w-14 text-center">
//                   Fill
//                 </span>
//                 <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground w-20 text-right">
//                   Status
//                 </span>
//               </div>

//               <ul className="divide-y divide-border/60">
//                 {schedule.days.map((d) => {
//                   const spots = Math.max(0, d.capacity - d.booked);
//                   const pct   = d.capacity > 0 ? (d.booked / d.capacity) * 100 : 0;

//                   return (
//                     <li
//                       key={d.date}
//                       className={cn(
//                         "flex items-center gap-3 px-5 py-3 transition-colors",
//                         d.active
//                           ? "hover:bg-muted/30"
//                           : "opacity-50",
//                       )}
//                     >
//                       {/* Date */}
//                       <div className="flex-1 min-w-0">
//                         <p className="text-[11px] font-semibold text-foreground leading-tight">
//                           {d.date}
//                         </p>
//                         {!d.active && (
//                           <p className="text-[9px] text-muted-foreground mt-0.5">
//                             {t("pages.cards.closed")}
//                           </p>
//                         )}
//                       </div>

//                       {d.active ? (
//                         <>
//                           {/* Fill bar + fraction */}
//                           <div className="w-14 flex flex-col gap-1 items-center">
//                             <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
//                               <div
//                                 className="h-full rounded-full transition-all duration-300"
//                                 style={{
//                                   width: `${pct}%`,
//                                   background:
//                                     pct >= 100
//                                       ? "var(--destructive)"
//                                       : pct >= 70
//                                       ? "hsl(38 92% 50%)"
//                                       : "hsl(var(--primary))",
//                                 }}
//                               />
//                             </div>
//                             <p className="text-[9px] text-muted-foreground tabular-nums">
//                               {d.booked}/{d.capacity}
//                             </p>
//                           </div>

//                           {/* Status */}
//                           <div className="w-20 text-right">
//                             {spots > 0 ? (
//                               <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
//                                 {t("pages.cards.spots_left", { count: spots })}
//                               </span>
//                             ) : (
//                               <span className="text-[9px] font-medium text-muted-foreground">
//                                 {t("pages.cards.fully_booked")}
//                               </span>
//                             )}
//                           </div>
//                         </>
//                       ) : (
//                         <span className="text-[9px] text-muted-foreground ml-auto">—</span>
//                       )}
//                     </li>
//                   );
//                 })}
//               </ul>
//             </>
//           ) : (
//             <div className="flex flex-col items-center justify-center py-16 text-center gap-3 px-6">
//               <div className="h-12 w-12 rounded-sm bg-muted/50 border border-border flex items-center justify-center">
//                 <CalendarDays className="h-5 w-5 text-muted-foreground/40" />
//               </div>
//               <div>
//                 <p className="text-[12px] font-semibold text-foreground">No schedule yet</p>
//                 <p className="text-[10px] text-muted-foreground mt-0.5">
//                   {t("pages.cards.no_published")}
//                 </p>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <SheetFooter className="px-5 py-3 border-t border-border bg-muted/30 shrink-0 flex items-center justify-between sm:justify-between">
//           <p className="text-[9px] text-muted-foreground">
//             <span className="font-semibold text-foreground">{activeDays.length}</span> active day{activeDays.length !== 1 ? "s" : ""}
//           </p>
//           <Button
//             size="sm"
//             variant="outline"
//             onClick={() => onOpenChange(false)}
//             className="h-7 px-3 text-[10px] font-medium rounded-sm"
//           >
//             Close
//           </Button>
//         </SheetFooter>
//       </SheetContent>
//     </Sheet>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Hospital Card
// // ─────────────────────────────────────────────────────────────────────────────
// export const HospitalCard = ({ hospital }: { hospital: HospitalInfo }) => {
//   console.log("Rendering card for hospital:", hospital);
//   const { t, i18n } = useTranslation();
//   const [bookOpen,     setBookOpen]     = useState(false);
//   const [scheduleOpen, setScheduleOpen] = useState(false);
//   const schedule = useHospitalSchedule(hospital.name);

//   const stats = useMemo(() => {
//     const days      = schedule?.days ?? [];
//     const active    = days.filter((d) => d.active);
//     const openSpots = active.reduce(
//       (sum, d) => sum + Math.max(0, d.capacity - d.booked), 0
//     );
//     return { activeDays: active.length, openSpots };
//   }, [schedule]);

//   return (
//     <>
//       <div className="rounded-sm border border-border bg-card shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 overflow-hidden">

//         {/* ── Top strip ── */}
//         <div className="flex items-center justify-between px-3.5 py-1.5 bg-muted/60 border-b border-border">
//           <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
//             {hospital.type ?? "Hospital"}
//           </span>
//           <span
//             className={cn(
//               "text-[10px] font-semibold",
//               stats.openSpots > 0
//                 ? "text-emerald-600 dark:text-emerald-400"
//                 : "text-muted-foreground",
//             )}
//           >
//             {stats.openSpots > 0
//               ? t("pages.cards.spots", { count: stats.openSpots })
//               : t("pages.cards.fully_booked")}
//           </span>
//         </div>

//         {/* ── Body ── */}
//         <div className="px-3.5 pt-3 pb-3">

//           {/* Identity row */}
//           <div className="flex items-center gap-3">
//             <div className="h-9 w-9 rounded-sm flex items-center justify-center bg-primary/10 text-primary font-bold text-[11px] shrink-0 select-none border border-primary/15">
//               {hospital.image}
//             </div>
//             <div className="min-w-0 flex-1">
//               <h3 className="text-[12px] font-semibold text-foreground leading-tight truncate">
//                 {hospital.name}
//               </h3>
//               <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5 truncate">
//                 <MapPin className="h-2.5 w-2.5 shrink-0" />
//                 {hospital.address}
//               </p>
//             </div>
//           </div>

//           {/* Stats grid */}
//           <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
//             {[
//               {
//                 icon: <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />,
//                 label: "Rating",
//                 value: hospital.rating,
//               },
//               {
//                 icon: <BedDouble className="h-2.5 w-2.5 text-muted-foreground" />,
//                 label: "Beds",
//                 value: t("pages.cards.beds", { count: hospital.beds }),
//               },
//               {
//                 icon: <CalendarCheck className="h-2.5 w-2.5 text-muted-foreground" />,
//                 label: "Open days",
//                 value: t("pages.cards.open_days", { count: stats.activeDays }),
//               },
//             ].map(({ icon, label, value }) => (
//               <div key={label} className="flex flex-col items-center py-2 px-1 bg-muted/20">
//                 <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
//                   {icon}
//                   <span className="text-[8px] uppercase tracking-wider font-semibold">{label}</span>
//                 </div>
//                 <span className="text-[10px] font-semibold text-foreground">{value}</span>
//               </div>
//             ))}
//           </div>

//           {/* Specialties */}
//           {hospital.specialties.length > 0 && (
//             <div className="mt-2.5 flex flex-wrap gap-1">
//               {hospital.specialties.map((s) => (
//                 <span
//                   key={s}
//                   className="text-[8px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground border border-border/60"
//                 >
//                   {s}
//                 </span>
//               ))}
//             </div>
//           )}

//           {/* Services count */}
//           <p className="mt-2 text-[9px] text-muted-foreground">
//             {t("pages.cards.services_available", { count: hospital.services.length })}
//           </p>

//           {/* Actions */}
//           <div className="mt-3 flex items-center gap-2">
//             <Button
//               size="sm"
//               variant="outline"
//               onClick={() => setScheduleOpen(true)}
//               className="h-7 px-2.5 text-[10px] font-medium rounded-sm border-border gap-1.5 flex-1"
//             >
//               <CalendarDays className="h-3 w-3" />
//               {t("pages.cards.view_schedule")}
//             </Button>
//             <Button
//               size="sm"
//               onClick={() => setBookOpen(true)}
//               className="h-7 px-2.5 text-[10px] font-semibold rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
//             >
//               {t("pages.cards.book_spot")}
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* ── Drawers ── */}
//       <ScheduleDrawer
//         hospital={hospital}
//         open={scheduleOpen}
//         onOpenChange={setScheduleOpen}
//       />
//       <HospitalBookingDialog
//         hospital={hospital}
//         open={bookOpen}
//         onOpenChange={setBookOpen}
//       />
//     </>
//   );
// };


import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Star,
  MapPin,
  BedDouble,
  CalendarCheck,
  CalendarDays,
  Activity,
  Users,
  Building2,
  Clock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { HospitalInfo, useHospitalSchedule } from "@/lib/hospital-store";
import { HospitalBookingDialog } from "@/components/HospitalBookingDialog";
import { cn } from "@/lib/utils";
import HospitalViewDrawer from "./hospital/HospitalViewDrawer";


// ─────────────────────────────────────────────────────────────────────────────
// Hospital Card
// ─────────────────────────────────────────────────────────────────────────────
export const HospitalCard = ({ hospital }) => {
  const { t, i18n } = useTranslation();
  const [bookOpen,     setBookOpen]     = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const schedule = useHospitalSchedule(hospital.name_en);

  const stats = useMemo(() => {
    const days      = schedule?.days ?? [];
    const active    = days.filter((d) => d.active);
    const openSpots = active.reduce(
      (sum, d) => sum + Math.max(0, d.capacity - d.booked), 0
    );
    return { activeDays: active.length, openSpots };
  }, [schedule]);

  // Derive a display initial for the avatar
  const initial = hospital.name_en?.charAt(0).toUpperCase() ?? "H";

  return (
    <>
      <div className="rounded-sm border border-border bg-card shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 overflow-hidden">

        {/* ── Top strip ── */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-muted/60 border-b border-border">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {hospital.type ?? "Hospital"}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold",
              hospital.is_accepting_bookings
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {hospital.is_accepting_bookings
              ? stats.openSpots > 0
                ? t("pages.cards.spots", { count: stats.openSpots })
                : t("pages.cards.fully_booked")
              : t("pages.cards.fully_booked")}
          </span>
        </div>

        {/* ── Body ── */}
        <div className="px-3.5 pt-3 pb-3">

          {/* Identity row */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-sm flex items-center justify-center bg-primary/10 text-primary font-bold text-[11px] shrink-0 select-none border border-primary/15 overflow-hidden">
              {hospital.logo ? (
                <img src={hospital.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[12px] font-semibold text-foreground leading-tight truncate">
                {hospital.name_en}
              </h3>
              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5 truncate">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {hospital.city}{hospital.address ? `, ${hospital.address}` : ""}
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
            {[
              {
                icon: <Users className="h-2.5 w-2.5 text-muted-foreground" />,
                label: "Doctors",
                value: hospital.doctors_count ?? 0,
              },
              {
                icon: <Building2 className="h-2.5 w-2.5 text-muted-foreground" />,
                label: "Depts",
                value: hospital.departments_count ?? 0,
              },
              {
                icon: <CalendarCheck className="h-2.5 w-2.5 text-muted-foreground" />,
                label: "Open days",
                value: t("pages.cards.open_days", { count: stats.activeDays }),
              },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex flex-col items-center py-2 px-1 bg-muted/20">
                <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                  {icon}
                  <span className="text-[8px] uppercase tracking-wider font-semibold">{label}</span>
                </div>
                <span className="text-[10px] font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Departments as specialty tags */}
          {hospital.departments?.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {hospital.departments.slice(0, 4).map((dept) => (
                <span
                  key={dept.id ?? dept.name_en}
                  className="text-[8px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground border border-border/60"
                >
                  {dept.name_en}
                </span>
              ))}
              {hospital.departments.length > 4 && (
                <span className="text-[8px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground border border-border/60">
                  +{hospital.departments.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Insurances count — replaces old services count */}
          <p className="mt-2 text-[9px] text-muted-foreground">
            {hospital.insurances?.length > 0
              ? `${hospital.insurances.length} insurance${hospital.insurances.length !== 1 ? "s" : ""} accepted`
              : "No insurances listed"}
          </p>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              className="h-7 px-2.5 text-[10px] font-medium rounded-sm border-border gap-1.5 flex-1"
            >
              <CalendarDays className="h-3 w-3" />
              {t("pages.cards.view_schedule")}
            </Button>
            <Button
              size="sm"
              onClick={() => setBookOpen(true)}
              disabled={!hospital.is_accepting_bookings}
              className="h-7 px-2.5 text-[10px] font-semibold rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
            >
              {t("pages.cards.book_spot")}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Drawers ── */}

      <HospitalViewDrawer
        hospital={hospital}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />
      
 <HospitalBookingDialog
        hospital={hospital}
        open={bookOpen}
        onOpenChange={setBookOpen}
      />

    </>
  );
};
