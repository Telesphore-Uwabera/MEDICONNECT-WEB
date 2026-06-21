import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  CalendarCheck,
  CalendarDays,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HospitalInfo, useHospitalSchedule } from "@/lib/hospital-store";
import { HospitalBookingDialog } from "@/components/HospitalBookingDialog";
import { cn } from "@/lib/utils";
import HospitalViewDrawer from "./hospital/HospitalViewDrawer";

// ─────────────────────────────────────────────────────────────────────────────
// Hospital Card
// Kept lean on purpose: identity, one status line, two stats, top departments.
// Everything else (insurances, full department list, schedule table) lives in
// HospitalViewDrawer behind "View details" so the grid stays scannable.
// ─────────────────────────────────────────────────────────────────────────────
export const HospitalCard = ({ hospital }) => {
  const { t } = useTranslation();
  const [bookOpen, setBookOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const schedule = useHospitalSchedule(hospital.name_en);

  const stats = useMemo(() => {
    const days = schedule?.days ?? [];
    const active = days.filter((d) => d.active);
    const openSpots = active.reduce(
      (sum, d) => sum + Math.max(0, d.capacity - d.booked),
      0,
    );
    return { activeDays: active.length, openSpots };
  }, [schedule]);

  const initial = hospital.name_en?.charAt(0).toUpperCase() ?? "H";
  const topDepartments = hospital.departments?.slice(0, 2) ?? [];
  const extraDepartments = Math.max(0, (hospital.departments?.length ?? 0) - 2);

  return (
    <>
      <div className="rounded-sm border border-border bg-card shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 overflow-hidden">
        {/* ── Top strip: type + status, one line, no clutter ── */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-muted/60 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {hospital.type ?? "Hospital"}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold",
              hospital.is_accepting_bookings && stats.openSpots > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {hospital.is_accepting_bookings && stats.openSpots > 0
              ? t("pages.cards.spots", { count: stats.openSpots })
              : t("pages.cards.fully_booked")}
          </span>
        </div>

        {/* ── Body ── */}
        <div className="px-3.5 pt-3 pb-3">
          {/* Identity row */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-sm flex items-center justify-center bg-primary/10 text-primary font-bold text-sm shrink-0 select-none border border-primary/15 overflow-hidden">
              {hospital.logo ? (
                <img src={hospital.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                {hospital.name_en}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {hospital.city}
              </p>
            </div>
          </div>

          {/* Two compact stats instead of three — doctors + open days */}
          <div className="mt-3 grid grid-cols-2 divide-x divide-border rounded-sm border border-border overflow-hidden">
            <div className="flex items-center justify-center gap-1.5 py-1.5 bg-muted/20">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                {hospital.doctors_count ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground">doctors</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1.5 bg-muted/20">
              <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                {stats.activeDays}
              </span>
              <span className="text-[10px] text-muted-foreground">open days</span>
            </div>
          </div>

          {/* At most 2 department pills + an overflow count, no full list */}
          {topDepartments.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {topDepartments.map((dept) => (
                <span
                  key={dept.id ?? dept.name_en}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground border border-border/60"
                >
                  {dept.name_en}
                </span>
              ))}
              {extraDepartments > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground border border-border/60">
                  +{extraDepartments} more
                </span>
              )}
            </div>
          )}

          {/* Actions: one ghost link into the drawer, one primary booking CTA */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDetailsOpen(true)}
              className="h-8 px-3 text-xs font-medium rounded-sm border-border gap-1.5 flex-1"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {t("pages.cards.view_details", { defaultValue: "View details" })}
            </Button>
            <Button
              size="sm"
              onClick={() => setBookOpen(true)}
              disabled={!hospital.is_accepting_bookings}
              className="h-8 px-3 text-xs font-semibold rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
            >
              {t("pages.cards.book_spot")}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Drawers ── */}
      {/* HospitalViewDrawer now owns: full department list, insurances,
          schedule table, capacity bars — everything trimmed from the card. */}
      <HospitalViewDrawer
        hospital={hospital}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <HospitalBookingDialog
        hospital={hospital}
        open={bookOpen}
        onOpenChange={setBookOpen}
      />
    </>
  );
};
