import { useState, useMemo } from "react";
import { Building2, Clock, Shield, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useHospitalSchedule } from "@/lib/hospital-store";
import { HospitalBookingDialog } from "@/components/HospitalBookingDialog";
import type { ApiHospital } from "@/hooks/patient/use-patient-search-hospital";
import HospitalViewDrawer from "@/components/hospital/HospitalViewDrawer";

const TYPE_LABEL: Record<ApiHospital["type"], string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  health_center: "Health Center",
  pharmacy_clinic: "Pharmacy Clinic",
};

const TYPE_BADGE_STYLE: Record<ApiHospital["type"], string> = {
  hospital: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  clinic: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  health_center: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  pharmacy_clinic: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
};

function HospitalListItem({ hospital }: { hospital: ApiHospital }) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);

  const schedule = useHospitalSchedule(hospital.name_en);

  const stats = useMemo(() => {
    const active = (schedule?.days ?? []).filter((d) => d.active);
    const openSpots = active.reduce((sum, d) => sum + Math.max(0, d.capacity - d.booked), 0);
    return { openSpots };
  }, [schedule]);

  const initial = hospital.name_en?.charAt(0).toUpperCase() ?? "H";

  return (
    <>
      <div className="bg-card border border-border/70 rounded-[6px] px-3.5 py-2.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10 text-[11px] font-bold select-none">
          {initial}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-semibold text-foreground leading-tight">
              {hospital.name_en}
            </span>
            {hospital.type && (
              <span className={cn(
                "px-1 py-px text-[9px] font-semibold rounded-[6px] border",
                TYPE_BADGE_STYLE[hospital.type],
              )}>
                {TYPE_LABEL[hospital.type]}
              </span>
            )}
            {hospital.is_open_24h && (
              <span className="flex items-center gap-0.5 px-1 py-px text-[9px] font-semibold rounded-[6px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                <Clock className="w-2.5 h-2.5" />
                24h
              </span>
            )}
            {stats.openSpots > 0 && (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                {stats.openSpots} spots
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

        {/* Desktop stats */}
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

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScheduleOpen(true)}
            className="h-7 px-2.5 text-[10px] font-medium rounded-[6px] border-border gap-1.5"
          >
            <CalendarDays className="h-3 w-3" />
            <span className="hidden sm:inline">Schedule</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setBookOpen(true)}
            className="h-7 px-2.5 text-[10px] font-semibold rounded-[6px] bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Book
          </Button>
        </div>
      </div>

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
}

export default HospitalListItem;
