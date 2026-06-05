import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  CalendarDays,
  Activity,
  Building2,
  Clock,
  Phone,
  Mail,
  Globe,
  Users,
  Layers,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Stethoscope,
  BadgeCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetOverlay,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Domain types (mirroring the API response)
// ─────────────────────────────────────────────────────────────────────────────
interface DepartmentService {
  id?: number | string;
  department_id?: string;
  name_en: string;
  price?: string | null;
  is_active?: boolean;
  icon?: string;
}

interface Department {
  id?: number | string;
  hospital_id?: string;
  name_en: string;
  icon?: string;
  services?: DepartmentService[];
}

interface Service {
  id?: number | string;
  name_en: string;
  icon?: string;
}

interface WorkingHour {
  id: number;
  hospital_id: string;
  day_of_week: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  max_patients: string | number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Insurance {
  id?: number | string;
  name?: string;
}

interface HospitalInfo {
  id: number | string;
  slug?: string;
  registration_number?: string | null;
  name_en: string;
  name_fr?: string | null;
  name_kiny?: string | null;
  description_en?: string | null;
  type?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo?: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
  is_open_24h?: boolean;
  status?: string | null;
  is_accepting_bookings?: boolean | "1" | "0" | 1 | 0;
  verified_at?: string | null;
  doctors_count?: string | number | null;
  departments_count?: string | number | null;
  services_count?: string | number | null;
  departments?: Department[];
  services?: Service[];
  working_days?: WorkingHour[];
  insurances?: Insurance[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
      {children}
    </p>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  const inner = (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-0.5">
          {label}
        </p>
        <p className="text-[11px] text-foreground break-all leading-snug">{value}</p>
      </div>
      {href && (
        <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-1" />
      )}
    </div>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block hover:bg-muted/30 rounded-sm transition-colors px-1 -mx-1"
    >
      {inner}
    </a>
  ) : (
    <div className="px-1 -mx-1">{inner}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Working Hours Grid
// ─────────────────────────────────────────────────────────────────────────────
function WorkingHoursGrid({ workingHours }: { workingHours: WorkingHour[] }) {
  const sorted = useMemo(
    () =>
      [...workingHours].sort(
        (a, b) =>
          DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
      ),
    [workingHours]
  );

  if (!sorted.length) return null;

  return (
    <div className="grid grid-cols-7 gap-px rounded-sm overflow-hidden border border-border bg-border">
      {sorted.map((wh) => {
        const isOpen = !wh.is_closed && wh.is_active;
        return (
          <div
            key={wh.id}
            className={cn(
              "flex flex-col items-center py-2 px-0.5 text-center bg-card",
              !isOpen && "opacity-45"
            )}
          >
            <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
              {DAY_SHORT[wh.day_of_week]}
            </span>
            <div className="mt-1.5">
              {isOpen ? (
                <>
                  {wh.open_time && wh.close_time ? (
                    <>
                      <p className="text-[8px] tabular-nums font-semibold text-foreground leading-none">
                        {wh.open_time.slice(0, 5)}
                      </p>
                      <p className="text-[8px] tabular-nums text-muted-foreground leading-none mt-0.5">
                        {wh.close_time.slice(0, 5)}
                      </p>
                    </>
                  ) : (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 mx-auto" />
                  )}
                  {wh.max_patients && (
                    <p className="text-[7px] text-muted-foreground mt-0.5 tabular-nums">
                      {wh.max_patients}pts
                    </p>
                  )}
                </>
              ) : (
                <XCircle className="h-3 w-3 text-muted-foreground/40 mx-auto" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule Section (derived from working_days)
// ─────────────────────────────────────────────────────────────────────────────
function ScheduleSection({
  workingHours,
  t,
}: {
  workingHours: WorkingHour[];
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const sorted = useMemo(
    () =>
      [...workingHours].sort(
        (a, b) =>
          DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
      ),
    [workingHours]
  );

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <div className="h-10 w-10 rounded-sm bg-muted/50 border border-border flex items-center justify-center">
          <CalendarDays className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <p className="text-[11px] font-semibold text-foreground">No schedule yet</p>
        <p className="text-[10px] text-muted-foreground">
          {t("pages.cards.no_published")}
        </p>
      </div>
    );
  }

  const activeDays = sorted.filter((wh) => !wh.is_closed && wh.is_active);
  const totalCapacity = activeDays.reduce(
    (s, wh) => s + Number(wh.max_patients ?? 0),
    0
  );

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Activity className="h-2.5 w-2.5" /> Open days this week
          </span>
          <span className="text-[10px] font-semibold tabular-nums text-foreground">
            {activeDays.length} / {sorted.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-primary"
            style={{
              width: `${(activeDays.length / sorted.length) * 100}%`,
            }}
          />
        </div>
        {totalCapacity > 0 && (
          <p className="text-[9px] text-muted-foreground mt-1 tabular-nums">
            {totalCapacity} total patient slots / week
          </p>
        )}
      </div>

      {/* Header row */}
      <div className="flex items-center gap-3 pb-1.5 border-b border-border/60">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex-1">
          Day
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground w-24 text-center">
          Hours
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground w-20 text-right">
          Status
        </span>
      </div>

      {/* Rows */}
      <ul className="divide-y divide-border/40">
        {sorted.map((wh) => {
          const isOpen = !wh.is_closed && wh.is_active;
          const hasHours = wh.open_time && wh.close_time;
          return (
            <li
              key={wh.id}
              className={cn(
                "flex items-center gap-3 py-2.5 transition-colors -mx-1 px-1 rounded-sm",
                isOpen ? "hover:bg-muted/20" : "opacity-50"
              )}
            >
              {/* Day name */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-foreground leading-tight capitalize">
                  {wh.day_of_week}
                </p>
                {isOpen && wh.max_patients && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                    max {wh.max_patients} patients
                  </p>
                )}
              </div>

              {/* Hours */}
              <div className="w-24 text-center">
                {isOpen ? (
                  hasHours ? (
                    <span className="text-[10px] tabular-nums text-foreground font-medium">
                      {wh.open_time!.slice(0, 5)} – {wh.close_time!.slice(0, 5)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">All day</span>
                  )
                ) : (
                  <span className="text-[9px] text-muted-foreground">—</span>
                )}
              </div>

              {/* Status badge */}
              <div className="w-20 text-right">
                {isOpen ? (
                  <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Open
                  </span>
                ) : (
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                    {t("pages.cards.closed")}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Button
// ─────────────────────────────────────────────────────────────────────────────
function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-1.5 text-[10px] font-semibold rounded-sm transition-all",
        active
          ? "bg-background text-foreground shadow-sm border border-border"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
function HospitalViewDrawer({
  hospital,
  open,
  onOpenChange,
}: {
  hospital: HospitalInfo;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"overview" | "schedule">("overview");

  const hoursLabel = hospital.is_open_24h
    ? "Open 24 hours"
    : hospital.opens_at && hospital.closes_at
    ? `${hospital.opens_at.slice(0, 5)} – ${hospital.closes_at.slice(0, 5)}`
    : null;

  const isAccepting =
    hospital.is_accepting_bookings === true ||
    hospital.is_accepting_bookings === "1" ||
    hospital.is_accepting_bookings === 1;

  const verifiedDate = hospital.verified_at
    ? new Date(hospital.verified_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // ── Flatten services from departments[].services (API shape) ──
  // Falls back to top-level hospital.services if present
  const allServices: DepartmentService[] = useMemo(() => {
    if (hospital.services && hospital.services.length > 0) {
      return hospital.services as DepartmentService[];
    }
    return (hospital.departments ?? []).flatMap((dept) => dept.services ?? []);
  }, [hospital.departments, hospital.services]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetOverlay className="backdrop-blur-sm bg-black/40" />
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] flex flex-col gap-0 p-0 bg-background border-l border-border"
      >
        {/* ── Header ── */}
        <SheetHeader className="px-5 py-4 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-sm flex items-center justify-center bg-primary/10 text-primary font-bold text-[13px] shrink-0 border border-primary/15 overflow-hidden">
              {hospital.logo ? (
                <img
                  src={hospital.logo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <SheetTitle className="text-[13px] font-semibold text-foreground leading-tight">
                  {hospital.name_en}
                </SheetTitle>
                {verifiedDate && (
                  <span title={`Verified ${verifiedDate}`} className="shrink-0">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  </span>
                )}
              </div>
              {hospital.name_fr && (
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {hospital.name_fr}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[8px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground border border-border/60">
                  {hospital.type ?? "Hospital"}
                </span>
                <span
                  className={cn(
                    "text-[8px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-sm border",
                    hospital.status === "active"
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      : "bg-muted text-muted-foreground border-border/60"
                  )}
                >
                  {hospital.status ?? "unknown"}
                </span>
                <span
                  className={cn(
                    "text-[8px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-sm border",
                    isAccepting
                      ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                      : "bg-muted text-muted-foreground border-border/60"
                  )}
                >
                  {isAccepting ? "Accepting Bookings" : "Closed Bookings"}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 px-4 py-2 bg-muted/30 border-b border-border shrink-0">
          <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>
            Overview
          </TabBtn>
          <TabBtn active={tab === "schedule"} onClick={() => setTab("schedule")}>
            Schedule
          </TabBtn>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ OVERVIEW TAB ══ */}
          {tab === "overview" && (
            <div className="px-5 py-4 space-y-5">

              {/* Stats row */}
              <div className="grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
                {[
                  {
                    icon: <Users className="h-2.5 w-2.5 text-muted-foreground" />,
                    label: "Doctors",
                    value: hospital.doctors_count ?? 0,
                  },
                  {
                    icon: <Layers className="h-2.5 w-2.5 text-muted-foreground" />,
                    label: "Depts",
                    value: hospital.departments_count ?? 0,
                  },
                  {
                    icon: (
                      <Stethoscope className="h-2.5 w-2.5 text-muted-foreground" />
                    ),
                    label: "Services",
                    value: hospital.services_count ?? 0,
                  },
                ].map(({ icon, label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center py-2.5 px-1 bg-muted/20"
                  >
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      {icon}
                      <span className="text-[8px] uppercase tracking-wider font-semibold">
                        {label}
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-foreground tabular-nums">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Location */}
              <div>
                <SectionLabel>
                  <MapPin className="h-2.5 w-2.5" /> Location
                </SectionLabel>
                <div className="space-y-0.5 divide-y divide-border/40">
                  <InfoRow
                    icon={<MapPin className="h-3 w-3" />}
                    label="Address"
                    value={[
                      hospital.address,
                      hospital.city,
                      hospital.province,
                      hospital.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    href={
                      hospital.latitude && hospital.longitude
                        ? `https://maps.google.com/?q=${hospital.latitude},${hospital.longitude}`
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Contact */}
              <div>
                <SectionLabel>
                  <Phone className="h-2.5 w-2.5" /> Contact
                </SectionLabel>
                <div className="space-y-0.5 divide-y divide-border/40">
                  <InfoRow
                    icon={<Phone className="h-3 w-3" />}
                    label="Phone"
                    value={hospital.phone}
                    href={hospital.phone ? `tel:${hospital.phone}` : undefined}
                  />
                  <InfoRow
                    icon={<Mail className="h-3 w-3" />}
                    label="Email"
                    value={hospital.email}
                    href={
                      hospital.email ? `mailto:${hospital.email}` : undefined
                    }
                  />
                  <InfoRow
                    icon={<Globe className="h-3 w-3" />}
                    label="Website"
                    value={hospital.website}
                    href={hospital.website ?? undefined}
                  />
                </div>
              </div>

              {/* Hours */}
              <div>
                <SectionLabel>
                  <Clock className="h-2.5 w-2.5" /> Opening Hours
                </SectionLabel>
                {hoursLabel && (
                  <p className="text-[10px] text-foreground font-medium mb-2">
                    {hoursLabel}
                  </p>
                )}
                {hospital.working_days && hospital.working_days.length > 0 && (
                  <WorkingHoursGrid workingHours={hospital.working_days} />
                )}
              </div>

              {/* Departments */}
              {hospital.departments && hospital.departments.length > 0 && (
                <div>
                  <SectionLabel>
                    <Layers className="h-2.5 w-2.5" /> Departments
                  </SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {hospital.departments.map((dept) => (
                      <span
                        key={dept.id ?? dept.name_en}
                        className="text-[9px] uppercase tracking-wider font-semibold px-2 py-1 rounded-sm bg-secondary text-muted-foreground border border-border/60 flex items-center gap-1"
                      >
                        <Stethoscope className="h-2.5 w-2.5" />
                        {dept.name_en}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services — flattened from departments[].services or top-level services */}
              {allServices.length > 0 && (
                <div>
                  <SectionLabel>
                    <Activity className="h-2.5 w-2.5" /> Services
                  </SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {allServices.map((svc) => (
                      <span
                        key={svc.id ?? svc.name_en}
                        className="text-[9px] uppercase tracking-wider font-semibold px-2 py-1 rounded-sm bg-secondary text-muted-foreground border border-border/60 flex items-center gap-1"
                      >
                        <Activity className="h-2.5 w-2.5" />
                        {svc.name_en}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {hospital.description_en && (
                <div>
                  <SectionLabel>About</SectionLabel>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {hospital.description_en}
                  </p>
                </div>
              )}

              {/* Registration */}
              {(hospital.registration_number || verifiedDate) && (
                <div>
                  <SectionLabel>
                    <ShieldCheck className="h-2.5 w-2.5" /> Registration
                  </SectionLabel>
                  <div className="space-y-0.5 divide-y divide-border/40">
                    <InfoRow
                      icon={<ShieldCheck className="h-3 w-3" />}
                      label="Reg. Number"
                      value={hospital.registration_number}
                    />
                    {verifiedDate && (
                      <InfoRow
                        icon={<BadgeCheck className="h-3 w-3" />}
                        label="Verified on"
                        value={verifiedDate}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Insurances */}
              {hospital.insurances && hospital.insurances.length > 0 && (
                <div>
                  <SectionLabel>Insurances Accepted</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {hospital.insurances.map((ins, i) => (
                      <span
                        key={ins.id ?? i}
                        className="text-[9px] uppercase tracking-wider font-semibold px-2 py-1 rounded-sm bg-secondary text-muted-foreground border border-border/60"
                      >
                        {ins.name ?? String(ins)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ SCHEDULE TAB ══ */}
          {tab === "schedule" && (
            <div className="px-5 py-4">
              <ScheduleSection
                workingHours={hospital.working_days ?? []}
                t={t}
              />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <SheetFooter className="px-5 py-3 border-t border-border bg-muted/30 shrink-0 flex items-center justify-between sm:justify-between">
          <p className="text-[9px] text-muted-foreground">
            {hospital.slug && (
              <span className="font-mono text-[8px] opacity-60">
                {hospital.slug}
              </span>
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-7 px-3 text-[10px] font-medium rounded-sm"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default HospitalViewDrawer;
