import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import {
  CalendarIcon,
  Users2,
  CheckCircle2,
  XCircle,
  PowerOff,
  Building2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  LayoutGrid,
  ChevronsDownUp,
  CalendarX2,
  CalendarCheck2,
  ChevronDown,
} from "lucide-react";
import {
  addDays,
  format,
  parseISO,
  getDay,
  differenceInCalendarDays,
} from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  HospitalDayConfig as DayConfig,
  setHospitalSchedule,
  updateHospitalDay,
  useHospitalSchedule,
} from "@/lib/hospital-store";

const HOSPITAL_NAME = "King Faisal Hospital";

type DayFilter = "all" | "active" | "closed";

/* ─── Utilisation bar ─── */
function UtilBar({
  booked,
  capacity,
  active,
}: {
  booked: number;
  capacity: number;
  active: boolean;
}) {
  const pct =
    capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  const overbooked = booked > capacity;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground/70">
          {booked} / {capacity} booked
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold tabular-nums",
            overbooked
              ? "text-red-600"
              : pct > 85
                ? "text-amber-600"
                : "text-foreground",
          )}
        >
          {overbooked ? "Over capacity" : `${pct}%`}
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            overbooked
              ? "bg-red-500"
              : pct > 85
                ? "bg-amber-500"
                : "bg-primary",
            !active && "opacity-30",
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Main component ─── */

const HospitalSchedule = () => {
  const { t } = useTranslation();
  const stored = useHospitalSchedule(HOSPITAL_NAME);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [range, setRange] = useState<DateRange | undefined>({
    from: stored ? parseISO(stored.startDate) : today,
    to: stored ? parseISO(stored.endDate) : addDays(today, 13),
  });

  const [defaultCapacity, setDefaultCapacity] = useState(
    stored?.days[0]?.capacity ?? 40,
  );

  const [hospitalDisabled, setHospitalDisabled] = useState(false);
  const [filter, setFilter] = useState<DayFilter>("all");

  const days: DayConfig[] = stored?.days ?? [];

  /* ─── Day count for chip ─── */
  const dayCount =
    range?.from && range?.to
      ? differenceInCalendarDays(range.to, range.from) + 1
      : null;

  /* ─── Filtered day list ─── */
  const filteredDays = useMemo(() => {
    if (filter === "active") return days.filter((d) => d.active);
    if (filter === "closed") return days.filter((d) => !d.active);
    return days;
  }, [days, filter]);

  /* ─── Aggregated stats ─── */
  const totals = useMemo(() => {
    const active = days.filter((d) => d.active);
    const totalCap = active.reduce((a, d) => a + d.capacity, 0);
    const totalBooked = active.reduce((a, d) => a + d.booked, 0);
    return {
      activeDays: active.length,
      offDays: days.length - active.length,
      totalDays: days.length,
      capacity: totalCap,
      booked: totalBooked,
      utilPct: totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0,
      overbooked: days.filter((d) => d.active && d.booked > d.capacity).length,
    };
  }, [days]);

  /* ─── Generate schedule ─── */
  const generate = () => {
    if (!range?.from || !range?.to) {
      toast.error("Pick a start and end date");
      return;
    }
    if (range.to < range.from) {
      toast.error("End date must be after start date");
      return;
    }

    if (days.length > 0) {
      const confirmed = window.confirm(
        "This will replace the current schedule. Continue?",
      );
      if (!confirmed) return;
    }

    const next: DayConfig[] = [];
    let d = new Date(range.from);
    while (d <= range.to) {
      const dow = getDay(d);
      const isWeekend = dow === 0 || dow === 6;
      next.push({
        date: format(d, "yyyy-MM-dd"),
        capacity: defaultCapacity,
        active: !isWeekend,
        booked: 0,
      });
      d = addDays(d, 1);
    }
    setHospitalSchedule({
      hospital: HOSPITAL_NAME,
      startDate: format(range.from, "yyyy-MM-dd"),
      endDate: format(range.to, "yyyy-MM-dd"),
      days: next,
    });
    toast.success(t("pages.hospital.schedule_generated"), {
      description: t("pages.hospital.schedule_generated_desc", {
        days: next.length,
        active: next.filter((d) => d.active).length,
      }),
    });
  };

  /* ─── Update a single day ─── */
  const updateDay = (idx: number, patch: Partial<DayConfig>) => {
    const target = filteredDays[idx];
    if (!target) return;
    updateHospitalDay(HOSPITAL_NAME, target.date, patch);
  };

  /* ─── Bulk actions ─── */
  const bulkActivate = (active: boolean) => {
    if (!stored) return;
    setHospitalSchedule({
      ...stored,
      days: stored.days.map((d) => ({ ...d, active })),
    });
    toast.success(active ? "All days activated" : "All days closed");
  };

  const bulkCloseWeekends = () => {
    if (!stored) return;
    setHospitalSchedule({
      ...stored,
      days: stored.days.map((d) => {
        const dow = getDay(parseISO(d.date));
        return dow === 0 || dow === 6 ? { ...d, active: false } : d;
      }),
    });
    toast.success("Weekends closed");
  };

  const bulkSetCapacity = () => {
    if (!stored) return;
    setHospitalSchedule({
      ...stored,
      days: stored.days.map((d) => ({ ...d, capacity: defaultCapacity })),
    });
    toast.success(`Capacity set to ${defaultCapacity} for all days`);
  };

  /* ─── Disable toggle handler ─── */
  const handleDisable = (v: boolean) => {
    setHospitalDisabled(v);
    if (v) {
      toast.warning("Hospital hidden from patients", {
        description: "New bookings are paused. You can still edit the schedule",
      });
    } else {
      toast.success("Hospital schedule enabled", {
        description: "Patients can book appointments again",
      });
    }
  };

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.schedule_title")}
          subtitle={t("pages.hospital.schedule_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* ── Control bar ── */}
            <div className="rounded-sm bg-card border border-border/70 p-4 shadow-sm">
              <div className="flex justify-between items-center gap-4">
                {/* Hospital identity */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                    <Building2 size={13} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground leading-tight">
                      {HOSPITAL_NAME}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {totals.totalDays > 0
                        ? `${totals.totalDays} days configured`
                        : "No schedule yet"}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block h-6 w-px bg-border/60" />

                {/* Disable schedule */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors",
                      hospitalDisabled
                        ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <PowerOff size={13} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground leading-tight">
                      Disable Schedule
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {hospitalDisabled ? "Paused" : "Active"}
                    </p>
                  </div>
                  <Switch
                    checked={hospitalDisabled}
                    onCheckedChange={handleDisable}
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>
              </div>
            </div>

            {/* ── Disable banner ── */}
            {hospitalDisabled && (
              <div className="flex items-center gap-3 rounded-sm border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-[11px] text-red-700 dark:text-red-400">
                <AlertTriangle
                  size={14}
                  className="flex-shrink-0 text-red-500"
                />
                <span className="font-medium">
                  Schedule hidden from patients. New bookings are paused.
                </span>
              </div>
            )}

            {/* ── Overbooked warning ── */}
            {totals.overbooked > 0 && (
              <div className="flex items-center gap-3 rounded-sm border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle
                  size={14}
                  className="flex-shrink-0 text-amber-500"
                />
                <span className="font-medium">
                  {totals.overbooked} day{totals.overbooked > 1 ? "s" : ""} over
                  capacity.
                </span>
              </div>
            )}

            {/* ── Stats row ── */}
            {days.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <StatCard
                  label="Total days"
                  value={totals.totalDays}
                  accent="primary"
                />
                <StatCard
                  label="Active days"
                  value={totals.activeDays}
                  accent="success"
                />
                <StatCard
                  label="Total capacity"
                  value={totals.capacity}
                  accent="info"
                />
                <StatCard
                  label="Total booked"
                  value={totals.booked}
                  accent="warning"
                />
                <StatCard
                  label="Off days"
                  value={totals.offDays}
                  accent="primary"
                />
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-4 items-start">
              {/* ── Left column ── */}
              <div className="lg:col-span-4 space-y-3">
                {/* Config card */}
                <div className="rounded-sm border border-border/70 bg-card p-4 shadow-sm space-y-3">
                  <h3 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                    <LayoutGrid size={13} className="text-primary" />
                    {t("pages.hospital.service_period")}
                  </h3>

                  {/* Date range */}
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                      {t("pages.hospital.date_range")}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-9 justify-start gap-2 font-normal border-border/60 hover:border-primary/40 hover:bg-primary/5 px-2.5 text-[11px]"
                        >
                          <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="flex flex-col items-start flex-1 min-w-0">
                            {range?.from && range?.to ? (
                              <span className="font-medium text-foreground">
                                {format(range.from, "MMM d")} →{" "}
                                {format(range.to, "MMM d, yyyy")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {t("pages.doctor.select_range")}
                              </span>
                            )}
                          </div>
                          {dayCount !== null && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary shrink-0">
                              {dayCount}d
                            </span>
                          )}
                          <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={range}
                          onSelect={setRange}
                          numberOfMonths={1}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Default capacity */}
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                      {t("pages.hospital.default_capacity")}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={defaultCapacity}
                      onChange={(e) =>
                        setDefaultCapacity(
                          Math.max(1, parseInt(e.target.value || "1")),
                        )
                      }
                      className="h-8 text-[11px] border-border/60"
                    />
                    <p className="text-[10px] text-muted-foreground/60">
                      {t("pages.hospital.capacity_hint")}
                    </p>
                  </div>

                  <Button
                    onClick={generate}
                    className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-[11px] gap-1.5 shadow-sm"
                  >
                    <RefreshCw size={12} />
                    {t("pages.hospital.generate_btn")}
                  </Button>
                </div>

                {/* Bulk actions card */}
                {days.length > 0 && (
                  <div className="rounded-sm border border-border/70 bg-card p-4 shadow-sm space-y-2">
                    <h3 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                      <ChevronsDownUp size={13} className="text-primary" />
                      Bulk actions
                    </h3>

                    <div className="space-y-1.5">
                      <button
                        onClick={() => bulkActivate(true)}
                        className="w-full flex items-center gap-1.5 text-[10px] text-primary font-medium px-2.5 py-1.5 rounded-sm border border-primary/20 bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        <CalendarCheck2 size={11} />
                        Activate all days
                      </button>
                      <button
                        onClick={() => bulkActivate(false)}
                        className="w-full flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium px-2.5 py-1.5 rounded-sm border border-border/60 bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <CalendarX2 size={11} />
                        Close all days
                      </button>
                      <button
                        onClick={bulkCloseWeekends}
                        className="w-full flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium px-2.5 py-1.5 rounded-sm border border-border/60 bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <XCircle size={11} />
                        Close weekends only
                      </button>
                      <button
                        onClick={bulkSetCapacity}
                        className="w-full flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium px-2.5 py-1.5 rounded-sm border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                      >
                        <Users2 size={11} />
                        Apply capacity ({defaultCapacity}) to all
                      </button>
                    </div>
                  </div>
                )}

                {/* Tips */}
                <div className="rounded-sm border border-border/70 bg-card p-3 shadow-sm">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    {t("pages.hospital.tips")}
                  </h4>
                  <div className="space-y-1.5 text-[10px] text-muted-foreground/70 leading-relaxed">
                    <p>{t("pages.hospital.tip_1")}</p>
                    <p>{t("pages.hospital.tip_2")}</p>
                    <p>{t("pages.hospital.tip_3")}</p>
                  </div>
                </div>
              </div>

              {/* ── Right column ── */}
              <div className="lg:col-span-8">
                <div className="rounded-sm border border-border/70 bg-card p-4 shadow-sm">
                  {/* Header + filter tabs */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-[12px] font-semibold text-foreground">
                        {t("pages.hospital.daily_schedule")}
                      </h3>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {days.length === 0
                          ? t("pages.hospital.no_schedule_yet")
                          : t("pages.hospital.days_configured", {
                              count: days.length,
                            })}
                      </p>
                    </div>

                    {/* Filter pills */}
                    {days.length > 0 && (
                      <div className="flex items-center gap-1 p-0.5 rounded-sm bg-secondary/50 border border-border/40">
                        {(["all", "active", "closed"] as DayFilter[]).map(
                          (f) => (
                            <button
                              key={f}
                              onClick={() => setFilter(f)}
                              className={cn(
                                "px-2.5 py-1 text-[10px] font-medium rounded-sm transition-all",
                                filter === f
                                  ? "bg-card text-foreground shadow-sm border border-border/60"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {f.charAt(0).toUpperCase() + f.slice(1)}
                              {f === "active" && (
                                <span className="ml-1 text-[9px] text-primary">
                                  {totals.activeDays}
                                </span>
                              )}
                              {f === "closed" && (
                                <span className="ml-1 text-[9px] text-muted-foreground">
                                  {totals.offDays}
                                </span>
                              )}
                              {f === "all" && (
                                <span className="ml-1 text-[9px] text-muted-foreground">
                                  {totals.totalDays}
                                </span>
                              )}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  {/* Utilisation summary bar */}
                  {days.length > 0 && (
                    <div className="mb-4 pb-4 border-b border-border/60">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                          <TrendingUp size={10} />
                          Overall utilisation (active days)
                        </span>
                        <span className="text-[10px] font-semibold text-foreground">
                          {totals.utilPct}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            totals.utilPct > 85 ? "bg-amber-500" : "bg-primary",
                          )}
                          style={{ width: `${totals.utilPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Day list */}
                  {filteredDays.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                      <CalendarIcon
                        size={24}
                        className="mx-auto text-muted-foreground/30"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {days.length === 0
                          ? t("pages.hospital.no_schedule_hint")
                          : `No ${filter} days in this period.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                      {filteredDays.map((d, i) => {
                        const overbooked = d.booked > d.capacity;
                        return (
                          <div
                            key={d.date}
                            className={cn(
                              "rounded-sm border px-3 py-2.5 flex items-center gap-3 transition-all duration-150",
                              d.active
                                ? overbooked
                                  ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20"
                                  : "border-border/60 bg-card hover:border-primary/30 hover:bg-primary/5"
                                : "border-dashed border-border/40 bg-muted/30",
                            )}
                          >
                            {/* Date column */}
                            <div className="w-10 text-center shrink-0">
                              <div className="text-[9px] uppercase font-medium text-muted-foreground/70">
                                {format(parseISO(d.date), "EEE")}
                              </div>
                              <div
                                className={cn(
                                  "text-base font-bold leading-tight",
                                  d.active
                                    ? "text-foreground"
                                    : "text-muted-foreground/40",
                                )}
                              >
                                {format(parseISO(d.date), "d")}
                              </div>
                              <div className="text-[9px] text-muted-foreground/60">
                                {format(parseISO(d.date), "MMM")}
                              </div>
                            </div>

                            {/* Status badge + utilisation */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {d.active ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary gap-1"
                                  >
                                    <CheckCircle2 size={9} />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 border-border bg-muted text-muted-foreground gap-1"
                                  >
                                    <XCircle size={9} />
                                    Closed
                                  </Badge>
                                )}
                                {overbooked && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 gap-1"
                                  >
                                    <AlertTriangle size={9} />
                                    Over capacity
                                  </Badge>
                                )}
                              </div>

                              {d.active && (
                                <UtilBar
                                  booked={d.booked}
                                  capacity={d.capacity}
                                  active={d.active}
                                />
                              )}
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Booked override */}
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">
                                  Booked
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={d.booked}
                                  disabled={!d.active}
                                  onChange={(e) =>
                                    updateDay(i, {
                                      booked: Math.max(
                                        0,
                                        parseInt(e.target.value || "0"),
                                      ),
                                    })
                                  }
                                  className="w-14 h-7 text-[12px] text-center rounded-sm border border-border/60 bg-background px-1 disabled:opacity-40 outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                                />
                              </div>

                              {/* Capacity */}
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">
                                  Capacity
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={d.capacity}
                                  disabled={!d.active}
                                  onChange={(e) =>
                                    updateDay(i, {
                                      capacity: Math.max(
                                        0,
                                        parseInt(e.target.value || "0"),
                                      ),
                                    })
                                  }
                                  className="w-14 h-7 text-[12px] text-center rounded-sm border border-border/60 bg-background px-1 disabled:opacity-40 outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                                />
                              </div>

                              {/* Active toggle */}
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">
                                  Open
                                </span>
                                <Switch
                                  checked={d.active}
                                  onCheckedChange={(v) =>
                                    updateDay(i, { active: v })
                                  }
                                  className="data-[state=checked]:bg-primary"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default HospitalSchedule;
