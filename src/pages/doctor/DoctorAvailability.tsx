import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import {
  CalendarIcon,
  Clock,
  RefreshCw,
  CheckCircle2,
  Ban,
  Zap,
  ZapOff,
  LayoutGrid,
  TrendingUp,
  AlertTriangle,
  BookMarked,
  CalendarCheck,
  PowerOff,
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";
import {
  generateSchedule,
  setSchedule,
  useSchedule,
  type SlotStatus,
} from "@/lib/schedule-store";
import { toast } from "sonner";

const DOCTOR_ID = "d1";
const intervalOptions = [15, 20, 30, 45, 60];

const ALL_STATUSES: SlotStatus[] = [
  "available",
  "booked",
  "blocked",
  "reserved",
];

/* ─── Slot visual config ─── */
const slotConfig: Record<
  SlotStatus,
  {
    card: string;
    label: string;
    dot: string;
    canChange: boolean;
  }
> = {
  available: {
    card: "bg-card border-border text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary cursor-pointer",
    label: "Available",
    dot: "bg-emerald-500",
    canChange: true,
  },
  booked: {
    card: "bg-primary border-primary text-primary-foreground shadow-sm cursor-pointer hover:bg-primary/90",
    label: "Booked",
    dot: "bg-primary",
    canChange: true,
  },
  blocked: {
    card: "bg-muted border-border text-muted-foreground line-through cursor-pointer hover:border-primary/30 hover:bg-primary/5",
    label: "Blocked",
    dot: "bg-muted-foreground",
    canChange: true,
  },
  reserved: {
    card: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 cursor-pointer hover:bg-amber-500/20",
    label: "Reserved",
    dot: "bg-amber-500",
    canChange: true,
  },
};

function StatusMenuItem({
  status,
  current,
  onSelect,
}: {
  status: SlotStatus;
  current: boolean;
  onSelect: () => void;
}) {
  const cfg = slotConfig[status];
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-left transition-colors",
        current
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent/50 hover:text-accent-foreground",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
      {current && (
        <span className="ml-auto text-primary">
          <CheckCircle2 size={11} />
        </span>
      )}
    </button>
  );
}

function SlotChip({
  slot,
  onSetStatus,
}: {
  slot: { time: string; status: SlotStatus };
  onSetStatus: (status: SlotStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = slotConfig[slot.status];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={`${cfg.label} — click to change`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "w-full rounded-sm border px-2 py-2 text-[11px] font-mono font-semibold tabular-nums text-center transition-all duration-150 select-none",
          cfg.card,
        )}
      >
        {slot.time}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Set slot status"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 w-32 rounded-sm border border-border bg-popover shadow-lg overflow-hidden py-1"
        >
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-medium border-b border-border mb-1">
            Set status
          </p>
          {ALL_STATUSES.map((s) => (
            <StatusMenuItem
              key={s}
              status={s}
              current={s === slot.status}
              onSelect={() => {
                onSetStatus(s);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const DoctorAvailability = () => {
  const { t } = useTranslation();
  const schedule = useSchedule(DOCTOR_ID);

  const [instant, setInstant] = useState(true);
  const [scheduleDisabled, setScheduleDisabled] = useState(false);

  const today = useMemo(() => moment().startOf("day").toDate(), []);

  const [range, setRange] = useState<DateRange | undefined>({
    from: schedule ? moment(schedule.startDate).toDate() : today,
    to: schedule
      ? moment(schedule.endDate).toDate()
      : moment(today).add(6, "days").toDate(),
  });

  const [startTime, setStartTime] = useState(schedule?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(schedule?.endTime ?? "17:00");
  const [interval, setInterval] = useState(schedule?.interval ?? 30);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    if (schedule && selectedDay >= schedule.days.length) setSelectedDay(0);
  }, [schedule, selectedDay]);

  const allSlots = useMemo(
    () => schedule?.days.flatMap((d) => d.slots) ?? [],
    [schedule],
  );
  const stats = useMemo(
    () => ({
      total: allSlots.length,
      available: allSlots.filter((s) => s.status === "available").length,
      booked: allSlots.filter((s) => s.status === "booked").length,
      blocked: allSlots.filter((s) => s.status === "blocked").length,
      reserved: allSlots.filter((s) => s.status === "reserved").length,
    }),
    [allSlots],
  );

  const dayCount =
    range?.from && range?.to
      ? moment(range.to).diff(moment(range.from), "days") + 1
      : null;

  const handleGenerate = () => {
    if (!range?.from || !range?.to) {
      toast.error("Pick a start and end date");
      return;
    }
    if (moment(range.to).isBefore(range.from)) {
      toast.error("End date must be after start date");
      return;
    }
    const next = generateSchedule(
      DOCTOR_ID,
      range.from,
      range.to,
      startTime,
      endTime,
      interval,
    );
    setSchedule(next);
    setSelectedDay(0);
    const totalSlots = next.days.reduce((a, d) => a + d.slots.length, 0);
    toast.success("Schedule generated", {
      description: `${next.days.length} days · ${totalSlots} slots · ${interval}-min intervals`,
    });
  };

  const setSlotStatus = useCallback(
    (dayIndex: number, slotIndex: number, status: SlotStatus) => {
      if (!schedule) return;
      const updated = { ...schedule };
      updated.days[dayIndex].slots[slotIndex].status = status;
      setSchedule(updated);
    },
    [schedule],
  );

  const bulkSetDay = (status: SlotStatus) => {
    if (!schedule) return;
    const updated = { ...schedule };
    updated.days[selectedDay].slots.forEach((s) => {
      s.status = status;
    });
    setSchedule(updated);

    const labels: Record<SlotStatus, string> = {
      available: "All slots opened",
      blocked: "All slots blocked",
      booked: "All slots marked as booked",
      reserved: "All slots reserved",
    };
    toast.success(labels[status]);
  };

  const handleDisableSchedule = (disabled: boolean) => {
    setScheduleDisabled(disabled);
    if (disabled) {
      toast.warning("Schedule disabled", {
        description: "You are now hidden from all patient booking flows.",
      });
    } else {
      toast.success("Schedule enabled", {
        description: "Patients can book appointments again.",
      });
    }
  };

  const days = schedule?.days ?? [];
  const currentDay = days[selectedDay];

  const dayStats = useMemo(() => {
    if (!currentDay) return null;
    return {
      available: currentDay.slots.filter((s) => s.status === "available")
        .length,
      booked: currentDay.slots.filter((s) => s.status === "booked").length,
      blocked: currentDay.slots.filter((s) => s.status === "blocked").length,
      reserved: currentDay.slots.filter((s) => s.status === "reserved").length,
    };
  }, [currentDay]);

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.availability_title")}
          subtitle={t("pages.doctor.availability_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* ── Disable schedule banner ── */}
            {scheduleDisabled && (
              <div className="flex items-center gap-3 rounded-sm border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-[11px] text-red-700 dark:text-red-400">
                <AlertTriangle size={14} className="flex-shrink-0 text-red-500" />
                <span className="font-medium">
                  Schedule hidden from patients. New bookings are paused.
                </span>
              </div>
            )}

            {/* ── Top control bar ── */}
            <div className="rounded-sm bg-card border border-border/70 p-4 shadow-sm">
              <div className="flex justify-between items-center gap-4">
                {/* Instant consultation */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors",
                      instant
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {instant ? <Zap size={13} /> : <ZapOff size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground leading-tight">
                      Instant Consultation
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {instant ? "Visible to patients" : "Hidden"}
                    </p>
                  </div>
                  <Switch
                    checked={instant}
                    onCheckedChange={setInstant}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="hidden sm:block h-6 w-px bg-border/60" />

                {/* Disable schedule */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors",
                      scheduleDisabled
                        ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <PowerOff size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground leading-tight">
                      Disable Schedule
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {scheduleDisabled ? "Paused" : "Active"}
                    </p>
                  </div>
                  <Switch
                    checked={scheduleDisabled}
                    onCheckedChange={handleDisableSchedule}
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>
              </div>
            </div>

            {/* ── Stats bar ── */}
            {schedule && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="rounded-sm bg-card border border-border/70 p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-medium">Total slots</p>
                  <p className="text-lg font-semibold text-foreground mt-0.5">{stats.total}</p>
                  <p className="text-[10px] text-muted-foreground/60">{schedule.days.length} days</p>
                </div>
                <div className="rounded-sm bg-card border border-border/70 p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-medium">Available</p>
                  <p className="text-lg font-semibold text-primary mt-0.5">{stats.available}</p>
                  <p className="text-[10px] text-muted-foreground/60">open for booking</p>
                </div>
                <div className="rounded-sm bg-card border border-border/70 p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-medium">Booked</p>
                  <p className="text-lg font-semibold text-foreground mt-0.5">{stats.booked}</p>
                  <p className="text-[10px] text-muted-foreground/60">confirmed</p>
                </div>
                <div className="rounded-sm bg-card border border-border/70 p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-medium">Blocked</p>
                  <p className="text-lg font-semibold text-foreground mt-0.5">{stats.blocked}</p>
                  <p className="text-[10px] text-muted-foreground/60">unavailable</p>
                </div>
                <div className="rounded-sm bg-card border border-border/70 p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-medium">Reserved</p>
                  <p className="text-lg font-semibold text-foreground mt-0.5">{stats.reserved}</p>
                  <p className="text-[10px] text-muted-foreground/60">held</p>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-4 items-start">
              {/* ── Left column ── */}
              <div className="lg:col-span-4 space-y-3">
                {/* Schedule config card */}
                <div className="rounded-sm border border-border/70 bg-card p-4 shadow-sm space-y-3">
                  <h3 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                    <LayoutGrid size={13} className="text-primary" />
                    Custom date range
                  </h3>

                  {/* Date range */}
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                      {t("pages.doctor.pick_range")}
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
                                {moment(range.from).format("MMM D")} → {moment(range.to).format("MMM D, YYYY")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t("pages.doctor.select_range")}</span>
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

                  {/* Time inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                        {t("pages.doctor.start_time")}
                      </Label>
                      <div className="relative">
                        <Clock size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="pl-6 h-8 text-[11px] border-border/60"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                        {t("pages.doctor.end_time")}
                      </Label>
                      <div className="relative">
                        <Clock size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="pl-6 h-8 text-[11px] border-border/60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interval */}
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                      {t("pages.doctor.interval")}
                    </Label>
                    <div className="grid grid-cols-5 gap-1">
                      {intervalOptions.map((m) => (
                        <button
                          key={m}
                          onClick={() => setInterval(m)}
                          className={cn(
                            "py-1.5 rounded-sm text-[11px] font-semibold border transition-all duration-150",
                            interval === m
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/50 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                          )}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-[11px] gap-1.5 shadow-sm"
                  >
                    <RefreshCw size={12} />
                    {t("pages.doctor.generate")}
                  </Button>
                </div>

                {/* Legend */}
                <div className="rounded-sm border border-border/70 bg-card p-3 shadow-sm">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    {t("pages.doctor.legend")}
                  </h4>
                  <div className="space-y-1.5">
                    {(Object.entries(slotConfig) as [SlotStatus, (typeof slotConfig)[SlotStatus]][]).map(([key, cfg]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", cfg.dot)} />
                        <span className="text-[11px] text-foreground capitalize">{cfg.label}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground/60">click to change</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Right column ── */}
              <div className="lg:col-span-8 space-y-3">
                {/* Day picker */}
                <div className="rounded-sm border border-border/70 bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                      <CalendarIcon size={13} className="text-primary" />
                      {t("pages.doctor.day_picker")}
                    </h3>
                    {schedule && (
                      <span className="text-[10px] text-muted-foreground/70">
                        {schedule.days.length} days · {schedule.interval}-min
                      </span>
                    )}
                  </div>

                  {days.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <CalendarIcon size={24} className="mx-auto text-muted-foreground/30" />
                      <p className="text-[11px] text-muted-foreground">{t("pages.doctor.generate_hint")}</p>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border">
                      {days.map((d, i) => {
                        const m = moment(d.date);
                        const dayAvail = d.slots.filter((s) => s.status === "available").length;
                        const dayBooked = d.slots.filter((s) => s.status === "booked").length;
                        const isSelected = selectedDay === i;
                        return (
                          <button
                            key={d.date}
                            onClick={() => setSelectedDay(i)}
                            className={cn(
                              "shrink-0 w-14 rounded-sm border p-2 text-center transition-all duration-150",
                              isSelected
                                ? "bg-primary border-primary shadow-sm"
                                : "border-border/60 hover:border-primary/40 hover:bg-primary/5",
                            )}
                          >
                            <div className={cn(
                              "text-[9px] uppercase tracking-wider font-medium",
                              isSelected ? "text-primary-foreground/80" : "text-muted-foreground/70",
                            )}>
                              {m.format("ddd")}
                            </div>
                            <div className={cn(
                              "text-base font-bold leading-tight",
                              isSelected ? "text-primary-foreground" : "text-foreground",
                            )}>
                              {m.format("D")}
                            </div>
                            <div className="mt-1 flex gap-0.5 justify-center">
                              {dayBooked > 0 && (
                                <span className={cn(
                                  "text-[8px] font-semibold px-1 rounded-sm",
                                  isSelected ? "bg-primary-foreground/30 text-primary-foreground" : "bg-primary/10 text-primary",
                                )}>
                                  {dayBooked}
                                </span>
                              )}
                              {dayAvail > 0 && (
                                <span className={cn(
                                  "text-[8px] font-semibold px-1 rounded-sm",
                                  isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                                )}>
                                  {dayAvail}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Slots panel */}
                {currentDay && dayStats && (
                  <div className="rounded-sm border border-border/70 bg-card p-4 shadow-sm">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-[12px] font-semibold text-foreground">
                          {moment(currentDay.date).format("dddd, MMMM D")}
                        </h3>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {currentDay.slots.length} slots · {schedule?.interval ?? 30} min each
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {dayStats.available > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary gap-1">
                            <span className="h-1 w-1 rounded-full bg-primary" />
                            {dayStats.available} avail
                          </Badge>
                        )}
                        {dayStats.booked > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-foreground/20 bg-foreground text-background gap-1">
                            {dayStats.booked} booked
                          </Badge>
                        )}
                        {dayStats.blocked > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted bg-muted text-muted-foreground gap-1">
                            {dayStats.blocked} blocked
                          </Badge>
                        )}
                        {dayStats.reserved > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1">
                            {dayStats.reserved} reserved
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Bulk actions */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 pb-3 border-b border-border/60">
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide font-medium mr-1">Bulk:</span>
                      <button
                        onClick={() => bulkSetDay("available")}
                        className="flex items-center gap-1 text-[10px] text-primary font-medium px-2 py-1 rounded-sm border border-primary/20 bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        <CheckCircle2 size={11} />
                        Open
                      </button>
                      <button
                        onClick={() => bulkSetDay("blocked")}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium px-2 py-1 rounded-sm border border-border/60 bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <Ban size={11} />
                        Block
                      </button>
                      <button
                        onClick={() => bulkSetDay("booked")}
                        className="flex items-center gap-1 text-[10px] text-foreground font-medium px-2 py-1 rounded-sm border border-border/60 bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <CalendarCheck size={11} />
                        Booked
                      </button>
                      <button
                        onClick={() => bulkSetDay("reserved")}
                        className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium px-2 py-1 rounded-sm border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                      >
                        <BookMarked size={11} />
                        Reserve
                      </button>
                    </div>

                    {/* Slot grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
                      {currentDay.slots.map((s, i) => (
                        <SlotChip
                          key={s.time}
                          slot={s}
                          onSetStatus={(status) => setSlotStatus(selectedDay, i, status)}
                        />
                      ))}
                    </div>

                    {/* Utilisation bar */}
                    {currentDay.slots.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/60">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                            <TrendingUp size={10} />
                            Utilisation
                          </span>
                          <span className="text-[10px] font-semibold text-foreground">
                            {Math.round((dayStats.booked / currentDay.slots.length) * 100)}%
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${(dayStats.booked / currentDay.slots.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default DoctorAvailability;
