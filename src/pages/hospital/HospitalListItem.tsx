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


// // ─── Hospital List Item ──────────────────────────────────────────────────────────

// function HospitalListItem({ hospitals }) {

//   return (
//     <div className="bg-card border border-border/70 rounded-sm px-3.5 py-2.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
//       <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10">
//         <Building2 className="w-4 h-4" />
//       </div>

//       <div className="flex-1 min-w-0">
//         <div className="flex items-center gap-1.5 flex-wrap">
//           <span className="text-[12px] font-semibold text-foreground leading-tight">
//             {hospital.name_en}
//           </span>
//           <span className={cn("px-1 py-px text-[9px] font-semibold rounded-sm border", TYPE_BADGE_STYLE[hospital.type])}>
//             {TYPE_LABEL[hospital.type]}
//           </span>
//           {hospital.is_open_24h && (
//             <span className="flex items-center gap-0.5 px-1 py-px text-[9px] font-semibold rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
//               <Clock className="w-2.5 h-2.5" />
//               24h
//             </span>
//           )}
//         </div>
//         <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
//           {hospital.city}
//           {hospital.address && ` · ${hospital.address}`}
//           {hospital.departments.length > 0 && ` · ${hospital.departments.slice(0, 2).map((d) => d.name_en).join(", ")}${hospital.departments.length > 2 ? ` +${hospital.departments.length - 2}` : ""}`}
//         </p>
//       </div>

//       <div className="hidden md:flex items-center gap-4 text-[10px] text-muted-foreground/70 flex-shrink-0">
//         <span>
//           <span className="font-semibold text-foreground">{hospital.doctors_count}</span> doctors
//         </span>
//         <span>
//           <span className="font-semibold text-foreground">{hospital.departments_count}</span> depts
//         </span>
//         {hospital.insurances.length > 0 && (
//           <span className="flex items-center gap-1">
//             <Shield className="w-3 h-3" />
//             {hospital.insurances.length} insurance{hospital.insurances.length > 1 ? "s" : ""}
//           </span>
//         )}
//       </div>

//       <button className="flex-shrink-0 px-2.5 py-1 rounded-sm text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-95 shadow-sm">
//         View
//       </button>
//     </div>
//   );
// }

// export default HospitalListItem;


import { Building2, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Type badge config ────────────────────────────────────────────────────────
const TYPE_LABEL = {
  hospital: "Hospital",
  clinic: "Clinic",
  health_center: "Health Center",
  pharmacy: "Pharmacy",
};

const TYPE_BADGE_STYLE = {
  hospital:      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  clinic:        "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  health_center: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  pharmacy:      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
};

// ─── Hospital List Item ──────────────────────────────────────────────────────
function HospitalListItem({ hospital }) {          // ← fixed: was `hospitals`
  return (
    <div className="bg-card border border-border/70 rounded-sm px-3.5 py-2.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10 overflow-hidden">
        {hospital.logo ? (
          <img src={hospital.logo} alt="" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="w-4 h-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold text-foreground leading-tight">
            {hospital.name_en}
          </span>
          {hospital.type && (
            <span className={cn("px-1 py-px text-[9px] font-semibold rounded-sm border", TYPE_BADGE_STYLE[hospital.type] ?? "bg-muted text-muted-foreground border-border")}>
              {TYPE_LABEL[hospital.type] ?? hospital.type}
            </span>
          )}
          {hospital.is_open_24h && (
            <span className="flex items-center gap-0.5 px-1 py-px text-[9px] font-semibold rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
              <Clock className="w-2.5 h-2.5" />
              24h
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
          {hospital.city}
          {hospital.address && ` · ${hospital.address}`}
          {hospital.departments?.length > 0 &&
            ` · ${hospital.departments.slice(0, 2).map((d) => d.name_en).join(", ")}${hospital.departments.length > 2 ? ` +${hospital.departments.length - 2}` : ""}`}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-4 text-[10px] text-muted-foreground/70 flex-shrink-0">
        <span>
          <span className="font-semibold text-foreground">{hospital.doctors_count}</span> doctors
        </span>
        <span>
          <span className="font-semibold text-foreground">{hospital.departments_count}</span> depts
        </span>
        {hospital.insurances?.length > 0 && (
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {hospital.insurances.length} insurance{hospital.insurances.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <button className="flex-shrink-0 px-2.5 py-1 rounded-sm text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-95 shadow-sm">
        View
      </button>
    </div>
  );
}

export default HospitalListItem;
