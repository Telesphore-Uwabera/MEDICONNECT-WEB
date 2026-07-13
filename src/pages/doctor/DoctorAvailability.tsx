// export default DoctorAvailability;
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Trash2,
} from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  useGetSlots,
  useUpdateSlot,
  useBulkUpdateSlots,
  useCreateAvailabilityPeriod,
  useToggleInstantConsultation,
  useTogglePauseBookings,
  useDeleteAllSchedule,
  type SlotStatus,
  type Slot,
} from "@/hooks/doctor/use-doctor-availability";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

const intervalOptions = [15, 20, 30, 45, 60];

const ALL_STATUSES: SlotStatus[] = [
  "available",
  "booked",
  "blocked",
  "reserved",
];

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/* ─────────────────────────────────────────────
   Slot visual config
───────────────────────────────────────────── */

const isWeekend = (date: moment.Moment) => {
  const day = date.day();
  return day === 0 || day === 6;
};

const getRangeDayStats = (
  range: DateRange | undefined,
  includeWeekends: boolean,
) => {
  if (!range?.from || !range?.to) {
    return { total: 0, schedulable: 0 };
  }

  let total = 0;
  let schedulable = 0;
  const cursor = moment(range.from).startOf("day");
  const end = moment(range.to).startOf("day");

  while (cursor.isSameOrBefore(end)) {
    total += 1;
    if (includeWeekends || !isWeekend(cursor)) schedulable += 1;
    cursor.add(1, "day");
  }

  return { total, schedulable };
};

const slotConfig: Record<
  SlotStatus,
  { card: string; labelKey: string; dot: string; canChange: boolean }
> = {
  available: {
    card: "bg-card border-border text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary cursor-pointer",
    labelKey: "pages.doctor.slot_available",
    dot: "bg-emerald-500",
    canChange: true,
  },
  booked: {
    card: "bg-primary border-primary text-primary-foreground  cursor-pointer hover:bg-primary/90",
    labelKey: "pages.doctor.slot_booked",
    dot: "bg-primary",
    canChange: false,
  },
  blocked: {
    card: "bg-muted border-border text-muted-foreground line-through cursor-pointer hover:border-primary/30 hover:bg-primary/5",
    labelKey: "pages.doctor.slot_blocked",
    dot: "bg-muted-foreground",
    canChange: true,
  },
  reserved: {
    card: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 cursor-pointer hover:bg-amber-500/20",
    labelKey: "pages.doctor.slot_reserved",
    dot: "bg-amber-500",
    canChange: true,
  },
};

/* ─────────────────────────────────────────────
   StatusMenuItem
───────────────────────────────────────────── */

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
  const { t } = useTranslation();
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left transition-colors",
        current
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent/50 hover:text-accent-foreground",
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", cfg.dot)} />
      {t(cfg.labelKey)}
      {current && (
        <span className="ml-auto text-primary">
          <CheckCircle2 size={14} />
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────
   SlotChip
───────────────────────────────────────────── */

function SlotChip({
  slot,
  onSetStatus,
  isPending,
}: {
  slot: Slot;
  onSetStatus: (status: SlotStatus) => void;
  isPending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = slotConfig[slot.status];
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayTime = slot.start_time.slice(0, 5);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          if (slot.status !== "booked") setOpen((v) => !v);
        }}
        disabled={isPending}
        title={`${t(cfg.labelKey)} - ${t("pages.doctor.click_to_change")}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "w-full rounded-[6px] border px-3 py-2.5 text-sm font-mono font-semibold tabular-nums text-center transition-all duration-150 select-none",
          cfg.card,
          isPending && "opacity-50 cursor-wait",
        )}
      >
        {isPending ? (
          <Loader2 size={14} className="mx-auto animate-spin" />
        ) : (
          displayTime
        )}
      </button>

      {open && slot.status !== "booked" && (
        <div
          role="listbox"
          aria-label={t("pages.doctor.set_slot_status")}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 w-40 rounded-[6px] border border-border bg-popover overflow-hidden py-1"
        >
          <p className="px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground font-medium border-b border-border mb-1">
            {t("pages.doctor.set_status")}
          </p>
          {ALL_STATUSES.filter((s) => s !== "booked").map((s) => (
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

/* ─────────────────────────────────────────────
   DayCard
───────────────────────────────────────────── */

function DayCard({
  day,
  index,
  isSelected,
  onSelect,
}: {
  day: { date: string; slots: Slot[] };
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}) {
  const { t } = useTranslation();
  const m = moment(day.date);
  const isToday = m.isSame(moment(), "day");

  const dayAvail = day.slots.filter((s) => s.status === "available").length;
  const dayBooked = day.slots.filter((s) => s.status === "booked").length;
  const dayBlocked = day.slots.filter((s) => s.status === "blocked").length;
  const dayReserved = day.slots.filter((s) => s.status === "reserved").length;
  const totalSlots = day.slots.length;

  const bookedPct = totalSlots > 0 ? (dayBooked / totalSlots) * 100 : 0;
  const availPct = totalSlots > 0 ? (dayAvail / totalSlots) * 100 : 0;
  const blockedPct = totalSlots > 0 ? (dayBlocked / totalSlots) * 100 : 0;
  const reservedPct = totalSlots > 0 ? (dayReserved / totalSlots) * 100 : 0;

  return (
    <button
      onClick={() => onSelect(index)}
      className={cn(
        "shrink-0 w-20 flex flex-col items-center rounded-[6px] border p-3 transition-all duration-200 relative",
        isSelected
          ? "bg-primary border-primary scale-[1.03] z-10"
          : "bg-card border-border/70 hover:border-primary/30 hover:scale-[1.02]",
        isToday && !isSelected && "ring-1 ring-primary/30",
      )}
    >
      {isToday && (
        <span
          className={cn(
            "absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap",
            isSelected
              ? "bg-primary-foreground text-primary"
              : "bg-primary text-primary-foreground",
          )}
        >
          {t("pages.doctor.today")}
        </span>
      )}

      <div className="flex flex-row justify-around items-center w-full">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            isSelected
              ? "text-primary-foreground/60"
              : "text-muted-foreground/50",
          )}
        >
          {m.format("ddd")}
        </span>

        <span
          className={cn(
            "text-sm font-bold leading-tight",
            isSelected ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {m.format("D")}
        </span>
      </div>

      <div className="w-full flex h-[3px] rounded-full overflow-hidden gap-px mt-1">
        {bookedPct > 0 && (
          <div
            className="bg-primary h-full rounded-l-full"
            style={{ width: `${bookedPct}%` }}
          />
        )}
        {availPct > 0 && (
          <div
            className="bg-emerald-400 h-full"
            style={{ width: `${availPct}%` }}
          />
        )}
        {blockedPct > 0 && (
          <div
            className="bg-muted-foreground/30 h-full"
            style={{ width: `${blockedPct}%` }}
          />
        )}
        {reservedPct > 0 && (
          <div
            className="bg-amber-400 h-full rounded-r-full"
            style={{ width: `${reservedPct}%` }}
          />
        )}
      </div>

      <div className="flex gap-1 mt-2 justify-center">
        {dayBooked > 0 && (
          <span
            className={cn(
              "text-xs font-bold px-1.5 py-0.5 rounded leading-none",
              isSelected
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {dayBooked}
          </span>
        )}
        {dayAvail > 0 && (
          <span
            className={cn(
              "text-xs font-bold px-1.5 py-0.5 rounded leading-none",
              isSelected
                ? "bg-primary-foreground/10 text-primary-foreground/80"
                : "bg-muted text-muted-foreground",
            )}
          >
            {dayAvail}
          </span>
        )}
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   MonthSection — Each month is a separate scrollable row
───────────────────────────────────────────── */

function MonthSection({
  monthLabel,
  monthKey,
  days,
  globalStartIndex,
  selectedDay,
  onSelectDay,
}: {
  monthLabel: string;
  monthKey: string;
  days: { day: { date: string; slots: Slot[] }; index: number }[];
  globalStartIndex: number;
  selectedDay: number;
  onSelectDay: (index: number) => void;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = selectedRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const isVisible =
        elementRect.left >= containerRect.left &&
        elementRect.right <= containerRect.right;

      if (!isVisible) {
        element.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [selectedDay]);

  return (
    <div className="min-w-0 space-y-1.5">
      {/* Month header */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-2 h-2 rounded-full bg-primary/60" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {monthLabel}
        </span>
        <span className="text-xs text-muted-foreground/50">
          {t("pages.doctor.days_count", { count: days.length })}
        </span>
        <div className="flex-1 h-px bg-border/40 ml-2" />
      </div>

      {/* Days row */}
      <div className="relative min-w-0 max-w-full overflow-hidden">
        <div
          ref={scrollRef}
          className="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent m-2 px-1"
        >
          {days.map(({ day, index }) => (
            <DayCard
              key={day.date}
              day={day}
              index={index}
              isSelected={selectedDay === index}
              onSelect={onSelectDay}
            />
          ))}
        </div>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-1 w-3 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-1 w-3 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DayPickerByMonth — Groups days into month sections
───────────────────────────────────────────── */

function DayPickerByMonth({
  days,
  selectedDay,
  onSelectDay,
  slotsLoading,
}: {
  days: { date: string; slots: Slot[] }[];
  selectedDay: number;
  onSelectDay: (index: number) => void;
  slotsLoading: boolean;
}) {
  const { t } = useTranslation();
  const monthGroups = useMemo(() => {
    const groups: {
      monthLabel: string;
      monthKey: string;
      days: { day: (typeof days)[0]; index: number }[];
    }[] = [];

    days.forEach((day, index) => {
      const m = moment(day.date);
      const monthKey = m.format("YYYY-MM");
      const monthLabel = m.format("MMMM YYYY");

      const existingGroup = groups.find((g) => g.monthKey === monthKey);
      if (existingGroup) {
        existingGroup.days.push({ day, index });
      } else {
        groups.push({ monthLabel, monthKey, days: [{ day, index }] });
      }
    });

    return groups;
  }, [days]);

  if (slotsLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, gi) => (
          <div key={gi} className="space-y-2">
            <div className="flex items-center gap-3 px-1">
              <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="shrink-0 w-20 h-28 rounded-[6px] bg-muted animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
        <div className="w-14 h-14 rounded-[6px] bg-muted flex items-center justify-center">
          <CalendarDays size={24} className="text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t("pages.doctor.no_schedule_generated")}
          </p>
          <p className="text-xs text-muted-foreground max-w-[260px]">
            {t("pages.doctor.no_schedule_generated_desc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 max-h-[235px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border pr-1">
      {monthGroups.map((group) => (
        <MonthSection
          key={group.monthKey}
          monthLabel={group.monthLabel}
          monthKey={group.monthKey}
          days={group.days}
          globalStartIndex={group.days[0]?.index ?? 0}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */

const DoctorAvailability = () => {
  const { t, i18n } = useTranslation();

  /* ── Date range & form state ── */
  const today = useMemo(() => moment().startOf("day").toDate(), []);
  const [range, setRange] = useState<DateRange | undefined>({
    from: today,
    to: moment(today).add(6, "days").toDate(),
  });
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [interval, setInterval] = useState(30);
  const [includeWeekends, setIncludeWeekends] = useState(true);

  /* ── Derive from/to for slot query ── */
  const fromStr = range?.from ? moment(range.from).format("YYYY-MM-DD") : "";
  const toStr = range?.to ? moment(range.to).format("YYYY-MM-DD") : "";

  /* ── Track whether schedule has been generated for current range ── */
  const [generatedRange, setGeneratedRange] = useState<{
    from: string;
    to: string;
  } | null>(null);

  /* ── Reset confirmation state ── */
  const [resetConfirming, setResetConfirming] = useState(false);
  const resetConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  /* ── API hooks ── */
  const {
    data: slotsData,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
  } = useGetSlots(
    generatedRange
      ? { from: generatedRange.from, to: generatedRange.to }
      : undefined,
  );

  const updateSlotMutation = useUpdateSlot();
  const bulkUpdateMutation = useBulkUpdateSlots();
  const createPeriodMutation = useCreateAvailabilityPeriod();
  const toggleInstantMutation = useToggleInstantConsultation();
  const togglePauseMutation = useTogglePauseBookings();
  const deleteAllScheduleMutation = useDeleteAllSchedule();

  /* ── Toggle state from API ── */
  const [instant, setInstant] = useState<boolean | null>(null);
  const [scheduleDisabled, setScheduleDisabled] = useState<boolean | null>(
    null,
  );

  // Sync toggle state from slots response (doctor flags)
  useEffect(() => {
    if (!slotsData) return;
    if (instant === null) setInstant(slotsData.doctor.instant_consultation);
    if (scheduleDisabled === null)
      setScheduleDisabled(slotsData.doctor.bookings_paused);
  }, [slotsData]);

  // Clean up confirm timer on unmount
  useEffect(() => {
    return () => {
      if (resetConfirmTimerRef.current)
        clearTimeout(resetConfirmTimerRef.current);
    };
  }, []);

  /* ── Build day list from slots response ── */
  const days = useMemo(() => {
    if (!slotsData?.slots) return [];
    return Object.entries(slotsData.slots)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => ({ date, slots }));
  }, [slotsData]);

  const [selectedDay, setSelectedDay] = useState(0);
  useEffect(() => {
    setSelectedDay(0);
  }, [generatedRange]);

  const currentDay = days[selectedDay] ?? null;

  /* ── Stats ── */
  const allSlots = useMemo(() => days.flatMap((d) => d.slots), [days]);
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

  const dayCount =
    range?.from && range?.to
      ? moment(range.to).diff(moment(range.from), "days") + 1
      : null;
  const rangeDayStats = useMemo(
    () => getRangeDayStats(range, includeWeekends),
    [range, includeWeekends],
  );

  /* ── Pending slot ids (optimistic UX) ── */
  const [pendingSlotIds, setPendingSlotIds] = useState<Set<number>>(new Set());

  /* ─────────────────────────────────────────
     Handlers
  ───────────────────────────────────────── */

  const handleGenerate = () => {
    if (!range?.from || !range?.to) {
      toast.error(t("pages.doctor.pick_start_end_date"));
      return;
    }
    if (moment(range.to).isBefore(range.from)) {
      toast.error(t("pages.doctor.end_after_start"));
      return;
    }

    const daysOfWeek: string[] = [];
    let generatedDays = 0;
    const cursor = moment(range.from).startOf("day");
    const end = moment(range.to).startOf("day");
    while (cursor.isSameOrBefore(end)) {
      if (includeWeekends || !isWeekend(cursor)) {
        const dow = DAY_NAMES[cursor.day()];
        if (!daysOfWeek.includes(dow)) daysOfWeek.push(dow);
        generatedDays += 1;
      }
      cursor.add(1, "day");
    }

    if (generatedDays === 0) {
      toast.error(t("pages.doctor.no_schedulable_days"), {
        description: t("pages.doctor.no_schedulable_days_desc"),
      });
      return;
    }

    createPeriodMutation.mutate(
      {
        from_date: fromStr,
        to_date: toStr,
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: interval,
        type: "online",
        hospital_id: null,
      },
      {
        onSuccess: (res) => {
          setGeneratedRange({ from: fromStr, to: toStr });
          const totalSlots = res.saved.reduce(
            (sum, d) => sum + d.slots_generated,
            0,
          );
          const daysCount = res.saved.length;
          toast.success(res.message, {
            description: t("pages.doctor.schedule_generated_desc", {
              days: daysCount,
              slots: totalSlots,
              interval,
              weekends: includeWeekends
                ? t("pages.doctor.weekends_included")
                : t("pages.doctor.weekends_excluded"),
            }),
          });
        },
        onError: (err) => {
          toast.error(err.message || t("pages.doctor.generate_schedule_failed"));
        },
      },
    );
  };

  /* ── Reset schedule — two-step confirmation ── */
  const handleResetSchedule = () => {
    if (!resetConfirming) {
      // First click: enter confirm state, auto-cancel after 4 s
      setResetConfirming(true);
      resetConfirmTimerRef.current = setTimeout(() => {
        setResetConfirming(false);
      }, 4000);
      return;
    }

    // Second click: execute
    if (resetConfirmTimerRef.current)
      clearTimeout(resetConfirmTimerRef.current);
    setResetConfirming(false);

    deleteAllScheduleMutation.mutate(undefined, {
      onSuccess: (res) => {
        setGeneratedRange(null);
        toast.success(res.message || t("pages.doctor.schedule_reset"), {
          description: t("pages.doctor.schedule_reset_desc"),
        });
      },
      onError: (err) => {
        toast.error(err.message || t("pages.doctor.reset_schedule_failed"));
      },
    });
  };

  const handleSetSlotStatus = useCallback(
    (slot: Slot, status: SlotStatus) => {
      if (slot.status === "booked") return;
      setPendingSlotIds((prev) => new Set(prev).add(slot.id));
      updateSlotMutation.mutate(
        { id: slot.id, status: status as Exclude<SlotStatus, "booked"> },
        {
          onSuccess: () => {
            toast.success(t("pages.doctor.slot_updated_to", { status: t(slotConfig[status].labelKey) }));
          },
          onError: (err) => {
            toast.error(err.message || t("pages.doctor.update_slot_failed"));
          },
          onSettled: () => {
            setPendingSlotIds((prev) => {
              const next = new Set(prev);
              next.delete(slot.id);
              return next;
            });
          },
        },
      );
    },
    [updateSlotMutation],
  );

  const handleBulkSetDay = (status: SlotStatus) => {
    if (!currentDay || status === "booked") return;
    const date = currentDay.date;
    bulkUpdateMutation.mutate(
      { date, status: status as Exclude<SlotStatus, "booked"> },
      {
        onSuccess: (res) => {
          const labels: Record<SlotStatus, string> = {
            available: t("pages.doctor.all_slots_opened"),
            blocked: t("pages.doctor.all_slots_blocked"),
            booked: t("pages.doctor.all_slots_marked_booked"),
            reserved: t("pages.doctor.all_slots_reserved"),
          };
          toast.success(t("pages.doctor.bulk_update_success", { label: labels[status], count: res.updated }));
        },
        onError: (err) => {
          toast.error(err.message || t("pages.doctor.bulk_update_failed"));
        },
      },
    );
  };

  const handleToggleInstant = () => {
    toggleInstantMutation.mutate(undefined, {
      onSuccess: (res) => {
        setInstant(res.instant_consultation);
        toast.success(res.message);
      },
      onError: (err) => {
        toast.error(err.message || t("pages.doctor.toggle_instant_failed"));
      },
    });
  };

  const handleTogglePause = () => {
    togglePauseMutation.mutate(undefined, {
      onSuccess: (res) => {
        setScheduleDisabled(res.bookings_paused);
        if (res.bookings_paused) {
          toast.warning(t("pages.doctor.schedule_disabled"), {
            description: t("pages.doctor.schedule_disabled_desc"),
          });
        } else {
          toast.success(t("pages.doctor.schedule_enabled"), {
            description: t("pages.doctor.schedule_enabled_desc"),
          });
        }
      },
      onError: (err) => {
        toast.error(err.message || t("pages.doctor.toggle_schedule_failed"));
      },
    });
  };

  const isGenerating = createPeriodMutation.isPending;
  const isBulkUpdating = bulkUpdateMutation.isPending;
  const isResetting = deleteAllScheduleMutation.isPending;

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.availability_title")}
          subtitle={t("pages.doctor.availability_sub")}
        />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-w-0 max-w-full overflow-x-hidden p-3 sm:p-4 space-y-4">
            {/* ── Disable schedule banner ── */}
            {scheduleDisabled && (
              <div className="flex items-center gap-3 rounded-[6px] border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-5 py-4 text-sm text-red-700 dark:text-red-400">
                <AlertTriangle
                  size={16}
                  className="flex-shrink-0 text-red-500"
                />
                <span className="font-medium">
                  {t("pages.doctor.schedule_hidden_banner")}
                </span>
              </div>
            )}

            {/* ── Top control bar ── */}
            <div className="min-w-0 max-w-full overflow-hidden rounded-[6px] bg-card border border-border/70 p-3">
              <div className="grid min-w-0 gap-3 md:grid-cols-3">
                {/* Instant consultation */}
                <div className="flex min-w-0 max-w-full items-center gap-3 rounded-[6px] border border-border/50 bg-background/40 p-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] transition-colors",
                      instant
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {instant ? <Zap size={16} /> : <ZapOff size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {t("pages.doctor.instant_consultation")}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {instant ? t("pages.doctor.visible_to_patients") : t("pages.doctor.hidden")}
                    </p>
                  </div>
                  <Switch
                    checked={instant ?? false}
                    onCheckedChange={handleToggleInstant}
                    disabled={toggleInstantMutation.isPending}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Disable schedule */}
                <div className="flex min-w-0 max-w-full items-center gap-3 rounded-[6px] border border-border/50 bg-background/40 p-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] transition-colors",
                      scheduleDisabled
                        ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <PowerOff size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {t("pages.doctor.disable_schedule")}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {scheduleDisabled ? t("pages.doctor.paused") : t("pages.doctor.active")}
                    </p>
                  </div>
                  <Switch
                    checked={scheduleDisabled ?? false}
                    onCheckedChange={handleTogglePause}
                    disabled={togglePauseMutation.isPending}
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>

                {/* ── {t("pages.doctor.reset_schedule")} ── */}
                <div className="flex min-w-0 max-w-full items-center gap-3 rounded-[6px] border border-border/50 bg-background/40 p-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] transition-colors",
                      resetConfirming
                        ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Trash2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {t("pages.doctor.reset_schedule")}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {t("pages.doctor.remove_slots_periods")}
                    </p>
                  </div>
                  <button
                    onClick={handleResetSchedule}
                    disabled={isResetting}
                    className={cn(
                      "flex shrink-0 items-center gap-2 px-3 py-2 rounded-[6px] border text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
                      resetConfirming
                        ? "border-red-500 bg-red-500 text-white hover:bg-red-600 animate-pulse"
                        : "border-border/60 bg-muted text-muted-foreground hover:border-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30",
                    )}
                  >
                    {isResetting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {isResetting
                      ? t("pages.doctor.resetting")
                      : resetConfirming
                        ? t("pages.doctor.confirm_reset")
                        : t("pages.doctor.reset")}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Stats bar ── */}
            {(days.length > 0 || slotsLoading) && (
              <div className="grid min-w-0 grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-5 gap-2">
                {[
                  {
                    label: t("pages.doctor.total_slots"),
                    value: stats.total,
                    sub: t("pages.doctor.days_count_plain", { count: days.length }),
                    valueClass: "text-foreground",
                  },
                  {
                    label: t("pages.doctor.slot_available"),
                    value: stats.available,
                    sub: t("pages.doctor.open_for_booking"),
                    valueClass: "text-primary",
                  },
                  {
                    label: t("pages.doctor.slot_booked"),
                    value: stats.booked,
                    sub: t("pages.doctor.confirmed_lower"),
                    valueClass: "text-foreground",
                  },
                  {
                    label: t("pages.doctor.slot_blocked"),
                    value: stats.blocked,
                    sub: t("pages.doctor.unavailable"),
                    valueClass: "text-foreground",
                  },
                  {
                    label: t("pages.doctor.slot_reserved"),
                    value: stats.reserved,
                    sub: t("pages.doctor.held"),
                    valueClass: "text-foreground",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="min-w-0 rounded-[6px] bg-card border border-border/70 p-4"
                  >
                    <p className="text-xs uppercase tracking-widest text-muted-foreground/80 font-medium">
                      {s.label}
                    </p>
                    {slotsLoading ? (
                      <div className="h-8 w-12 bg-muted animate-pulse rounded mt-1" />
                    ) : (
                      <p
                        className={cn(
                          "text-xl font-semibold mt-1",
                          s.valueClass,
                        )}
                      >
                        {s.value}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      {s.sub}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid min-w-0 max-w-full xl:grid-cols-12 gap-4 items-start overflow-x-hidden">
              {/* ── Left column ── */}
              <div className="min-w-0 xl:col-span-4 space-y-3">
                {/* Schedule config card */}
                <div className="min-w-0 max-w-full overflow-hidden rounded-[6px] border border-border/70 bg-card p-4 sm:p-5 space-y-4">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <LayoutGrid size={16} className="text-primary" />
                    {t("pages.doctor.custom_range")}
                  </h3>

                  {/* Date range */}
                  <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground/80">
                      {t("pages.doctor.pick_range")}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full min-w-0 h-auto min-h-10 justify-start gap-2.5 font-normal border-border/60 hover:border-primary/40 hover:bg-primary/5 px-3 py-2 text-sm"
                        >
                          <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex flex-col items-start flex-1 min-w-0">
                            {range?.from && range?.to ? (
                              <span className="max-w-full truncate font-medium text-foreground">
                                {moment(range.from).format("MMM D")} →{" "}
                                {moment(range.to).format("MMM D, YYYY")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {t("pages.doctor.select_range")}
                              </span>
                            )}
                          </div>
                          {dayCount !== null && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-[6px] bg-primary/10 text-primary shrink-0">
                              {dayCount}d
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={range}
                          onSelect={(newRange) => {
                            if (!newRange) return setRange(undefined);
                            const clampedFrom =
                              newRange.from && newRange.from < today
                                ? today
                                : newRange.from;
                            setRange({ from: clampedFrom, to: newRange.to });
                          }}
                          numberOfMonths={1}
                          initialFocus
                          disabled={{ before: today }}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Weekend mode */}
                  <div className="min-w-0 overflow-hidden rounded-[6px] border border-border/60 bg-background/50 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {t("pages.doctor.weekend_days")}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {includeWeekends
                            ? t("pages.doctor.weekends_generated")
                            : t("pages.doctor.weekdays_only_generated")}
                        </p>
                      </div>
                      <div className="flex w-full rounded-[6px] border border-border/60 bg-muted/40 p-1 sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setIncludeWeekends(false)}
                          className={cn(
                            "h-8 flex-1 px-3 rounded-[6px] text-xs font-semibold transition-colors sm:flex-none",
                            !includeWeekends
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {t("pages.doctor.exclude")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIncludeWeekends(true)}
                          className={cn(
                            "h-8 flex-1 px-3 rounded-[6px] text-xs font-semibold transition-colors sm:flex-none",
                            includeWeekends
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {t("pages.doctor.include")}
                        </button>
                      </div>
                    </div>
                    {rangeDayStats.total > 0 && (
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        {t("pages.doctor.schedule_days_preview", {
                          schedulable: rangeDayStats.schedulable,
                          total: rangeDayStats.total,
                        })}
                      </p>
                    )}
                  </div>

                  {/* Time inputs */}
                  <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground/80">
                        {t("pages.doctor.start_time")}
                      </Label>
                      <div className="relative">
                        <Clock
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none"
                        />
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="pl-8 h-10 text-sm border-border/60"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground/80">
                        {t("pages.doctor.end_time")}
                      </Label>
                      <div className="relative">
                        <Clock
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none"
                        />
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="pl-8 h-10 text-sm border-border/60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interval */}
                  <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground/80">
                      {t("pages.doctor.interval")}
                    </Label>
                    <div className="grid min-w-0 grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {intervalOptions.map((m) => (
                        <button
                          key={m}
                          onClick={() => setInterval(m)}
                          className={cn(
                            "py-2 rounded-[6px] text-sm font-semibold border transition-all duration-150",
                            interval === m
                              ? "bg-primary text-primary-foreground border-primary"
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
                    disabled={isGenerating}
                    className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm gap-2"
                  >
                    {isGenerating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    {isGenerating
                      ? t("pages.doctor.generating")
                      : t("pages.doctor.generate")}
                  </Button>
                </div>

                {/* Legend */}
                <div className="min-w-0 max-w-full overflow-hidden rounded-[6px] border border-border/70 bg-card p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    {t("pages.doctor.legend")}
                  </h4>
                  <div className="space-y-2">
                    {(
                      Object.entries(slotConfig) as [
                        SlotStatus,
                        (typeof slotConfig)[SlotStatus],
                      ][]
                    ).map(([key, cfg]) => (
                      <div key={key} className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "h-3 w-3 rounded-full flex-shrink-0",
                            cfg.dot,
                          )}
                        />
                        <span className="text-sm text-foreground capitalize">
                          {t(cfg.labelKey)}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground/60">
                          {cfg.canChange ? t("pages.doctor.click_to_change") : t("pages.doctor.locked")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Right column ── */}
              <div className="min-w-0 xl:col-span-8 space-y-3">
                {/* Day Picker — grouped by month */}
                <div className="min-w-0 max-w-full overflow-hidden rounded-[6px] border border-border/70 bg-card p-4 sm:p-5">
                  <div className="flex min-w-0 items-center justify-between gap-3 mb-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-8 h-8 rounded-[6px] bg-primary/10 flex items-center justify-center">
                        <CalendarDays size={16} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground leading-tight">
                          {t("pages.doctor.day_picker")}
                        </h3>
                        {days.length > 0 && (
                          <p className="truncate text-sm text-muted-foreground/60">
                            {t("pages.doctor.days_interval_meta", {
                              days: days.length,
                              interval,
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    {days.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setSelectedDay(Math.max(0, selectedDay - 1))
                          }
                          disabled={selectedDay === 0}
                          className="w-8 h-8 rounded-[6px] border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() =>
                            setSelectedDay(
                              Math.min(days.length - 1, selectedDay + 1),
                            )
                          }
                          disabled={selectedDay >= days.length - 1}
                          className="w-8 h-8 rounded-[6px] border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <DayPickerByMonth
                    days={days}
                    selectedDay={selectedDay}
                    onSelectDay={setSelectedDay}
                    slotsLoading={slotsLoading}
                  />
                </div>

                {/* Slots panel */}
                {currentDay && dayStats && (
                  <div className="min-w-0 max-w-full overflow-hidden rounded-[6px] border border-border/70 bg-card p-4 sm:p-5">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                      <div>
                        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                          {moment(currentDay.date).format("dddd, MMMM D")}
                          {slotsFetching && (
                            <Loader2
                              size={14}
                              className="animate-spin text-muted-foreground"
                            />
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          {t("pages.doctor.slots_interval_meta", {
                            slots: currentDay.slots.length,
                            interval,
                          })}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {dayStats.available > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 border-primary/20 bg-primary/5 text-primary gap-1.5"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {t("pages.doctor.available_short_count", { count: dayStats.available })}
                          </Badge>
                        )}
                        {dayStats.booked > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 border-foreground/20 bg-foreground text-background gap-1.5"
                          >
                            {t("pages.doctor.booked_count_short", { count: dayStats.booked })}
                          </Badge>
                        )}
                        {dayStats.blocked > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 border-muted bg-muted text-muted-foreground gap-1.5"
                          >
                            {t("pages.doctor.blocked_count_short", { count: dayStats.blocked })}
                          </Badge>
                        )}
                        {dayStats.reserved > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1.5"
                          >
                            {t("pages.doctor.reserved_count_short", { count: dayStats.reserved })}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Bulk actions */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border/60">
                      <span className="text-xs text-muted-foreground/70 uppercase tracking-wide font-medium mr-2">
                        {t("pages.doctor.bulk")}
                      </span>
                      <button
                        onClick={() => handleBulkSetDay("available")}
                        disabled={isBulkUpdating}
                        className="flex items-center gap-1.5 text-xs text-primary font-medium px-3 py-1.5 rounded-[6px] border border-primary/20 bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        {t("pages.doctor.open")}
                      </button>
                      <button
                        onClick={() => handleBulkSetDay("blocked")}
                        disabled={isBulkUpdating}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-3 py-1.5 rounded-[6px] border border-border/60 bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                      >
                        <Ban size={14} />
                        {t("pages.doctor.block")}
                      </button>
                      <button
                        onClick={() => handleBulkSetDay("reserved")}
                        disabled={isBulkUpdating}
                        className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium px-3 py-1.5 rounded-[6px] border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                      >
                        <BookMarked size={14} />
                        {t("pages.doctor.reserve")}
                      </button>
                      {isBulkUpdating && (
                        <Loader2
                          size={14}
                          className="animate-spin text-muted-foreground ml-2"
                        />
                      )}
                    </div>

                    {/* Slot grid */}
                    <div className="grid min-w-0 grid-cols-2 min-[360px]:grid-cols-3 min-[480px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8 gap-1.5">
                      {currentDay.slots.map((slot) => (
                        <SlotChip
                          key={slot.id}
                          slot={slot}
                          isPending={pendingSlotIds.has(slot.id)}
                          onSetStatus={(status) =>
                            handleSetSlotStatus(slot, status)
                          }
                        />
                      ))}
                    </div>

                    {/* {t("pages.doctor.utilisation")} bar */}
                    {currentDay.slots.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-border/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground/70 flex items-center gap-1.5">
                            <TrendingUp size={14} />
                            {t("pages.doctor.utilisation")}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {Math.round(
                              (dayStats.booked / currentDay.slots.length) * 100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{
                              width: `${(dayStats.booked / currentDay.slots.length) * 100}%`,
                            }}
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
