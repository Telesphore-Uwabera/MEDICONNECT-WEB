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
  Building2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  LayoutGrid,
  ChevronsDownUp,
  CalendarX2,
  CalendarCheck2,
  ChevronDown,
  Loader2,
  EyeOff,
  BanIcon,
  Save,
  Eye,
  BookOpen,
} from "lucide-react";
import {
  addDays,
  format,
  getDay,
  differenceInCalendarDays,
  eachDayOfInterval,
  startOfDay,
  isBefore,
} from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  WorkingHour,
  WorkingHourInput,
  useGetWorkingHours,
  useSetWorkingHours,
  useUpdateWorkingHour,
  useResetWorkingHours,
  useGetHospitalStatus,
  useToggleHospitalActive,
  useToggleAcceptingBookings,
} from "@/hooks/hospital/use-working-hours";

const HOSPITAL_NAME = "King Faisal Hospital";

const DAY_ORDER: WorkingHour["day_of_week"][] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

type DayFilter = "all" | "active" | "closed";

/* ─────────────────────────────────────────────
   Strip seconds from "HH:mm:ss" → "HH:mm"
   The DB returns stored times with seconds;
   the API only accepts H:i format.
───────────────────────────────────────────── */
function toHHmm(time: string | null | undefined): string | undefined {
  if (!time) return undefined;
  // "08:00:00" → "08:00",  "08:00" → "08:00"
  return time.slice(0, 5);
}

/* ─────────────────────────────────────────────
   Capacity input with explicit Save button.
   The save button only appears when the local
   value differs from the last committed value.
───────────────────────────────────────────── */
function CapacityInput({
  hour,
  onCommit,
  disabled,
}: {
  hour: WorkingHour;
  onCommit: (id: number, value: number) => void;
  disabled: boolean;
}) {
  const serverVal = hour.max_patients ?? 0;
  const [local, setLocal] = useState<string>(
    hour.max_patients != null ? String(hour.max_patients) : ""
  );
  // Sync from server when not focused (e.g. after bulk action)
  const localNum = parseInt(local || "0", 10);
  const isDirty = !isNaN(localNum) && localNum !== serverVal;

  const handleSave = () => {
    const safe = isNaN(localNum) ? 0 : Math.max(0, localNum);
    setLocal(String(safe));
    onCommit(hour.id, safe);
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">
        Max pts
      </span>
      <div className="flex items-center gap-1">
        <input
          id={`cap-${hour.id}`}
          type="number"
          min={0}
          value={local}
          disabled={disabled}
          onChange={(e) => setLocal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && isDirty && handleSave()}
          className={cn(
            "w-14 h-7 text-[12px] text-center rounded-sm border bg-background px-1",
            "disabled:opacity-40 outline-none",
            "focus:ring-1 focus:ring-primary/30 focus:border-primary/50",
            isDirty
              ? "border-amber-400 dark:border-amber-600"
              : "border-border/60"
          )}
        />
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={disabled}
            title="Save"
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-sm",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-40 shadow-sm"
            )}
          >
            <Save size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toggle row — handles its own pending state
   so an error never leaves the switch frozen.
───────────────────────────────────────────── */
function ToggleRow({
  label,
  activeLabel,
  inactiveLabel,
  icon: Icon,
  activeColor,   // Tailwind colour token used for icon bg + switch
  checked,       // true = the "bad" state is on (hidden / paused)
  onToggle,
  loading,       // still fetching initial status
}: {
  label: string;
  activeLabel: string;
  inactiveLabel: string;
  icon: React.ElementType;
  activeColor: "red" | "amber";
  checked: boolean;
  onToggle: () => void;
  loading: boolean;
}) {
  const [pending, setPending] = useState(false);

  const handle = async () => {
    setPending(true);
    try {
      await onToggle();
    } finally {
      // Always clear — whether success or error
      setPending(false);
    }
  };

  const colorMap = {
    red: {
      icon: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
      muted: "bg-muted text-muted-foreground",
      switch: "data-[state=checked]:bg-red-500",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
      muted: "bg-muted text-muted-foreground",
      switch: "data-[state=checked]:bg-amber-500",
    },
  };
  const colors = colorMap[activeColor];

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors",
          checked ? colors.icon : colors.muted
        )}
      >
        {loading || pending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Icon size={13} />
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-foreground leading-tight">
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          {checked ? activeLabel : inactiveLabel}
        </p>
      </div>
      <Switch
        checked={checked}
        disabled={loading || pending}
        onCheckedChange={handle}
        className={colors.switch}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const HospitalSchedule = () => {
  const { t } = useTranslation();

  const today = useMemo(() => startOfDay(new Date()), []);

  const [range, setRange] = useState<DateRange | undefined>({
    from: today,
    to: addDays(today, 13),
  });
  const [defaultCapacity, setDefaultCapacity] = useState(40);
  const [filter, setFilter] = useState<DayFilter>("all");

  /* ─── Queries ─── */
  const { data: workingHours = [], isLoading: hoursLoading } =
    useGetWorkingHours();
  const { data: status, isLoading: statusLoading } = useGetHospitalStatus();

  /* ─── Mutations ─── */
  const setSchedule = useSetWorkingHours();
  const updateHour = useUpdateWorkingHour();
  const resetHours = useResetWorkingHours();
  const toggleActive = useToggleHospitalActive();
  const toggleAccepting = useToggleAcceptingBookings();

  /* ─── Derived status ─── */
  const isActive = status?.is_active ?? true;
  const isAccepting = status?.is_accepting_bookings ?? true;

  /* ─── Sorted & filtered days ─── */
  const sortedHours = useMemo(
    () =>
      [...workingHours].sort(
        (a, b) =>
          DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
      ),
    [workingHours]
  );

  const dayCount =
    range?.from && range?.to
      ? differenceInCalendarDays(range.to, range.from) + 1
      : null;

  const filteredHours = useMemo(() => {
    if (filter === "active") return sortedHours.filter((d) => !d.is_closed);
    if (filter === "closed") return sortedHours.filter((d) => d.is_closed);
    return sortedHours;
  }, [sortedHours, filter]);

  const totals = useMemo(() => {
    const active = sortedHours.filter((d) => !d.is_closed);
    const totalCap = active.reduce((a, d) => a + (d.max_patients ?? 0), 0);
    return {
      activeDays: active.length,
      offDays: sortedHours.length - active.length,
      totalDays: sortedHours.length,
      capacity: totalCap,
    };
  }, [sortedHours]);

  const isMutating =
    setSchedule.isPending ||
    updateHour.isPending ||
    resetHours.isPending;

  /* ─── Generate schedule ─── */
  const generate = () => {
    if (!range?.from || !range?.to) {
      toast.error("Pick a start and end date");
      return;
    }
    if (workingHours.length > 0) {
      if (!window.confirm("This will replace the current schedule. Continue?"))
        return;
    }

    const days = eachDayOfInterval({ start: range.from, end: range.to });
    const seen = new Set<string>();
    const hours: WorkingHourInput[] = [];

    for (const d of days) {
      const dow = format(d, "EEEE").toLowerCase() as WorkingHour["day_of_week"];
      if (seen.has(dow)) continue;
      seen.add(dow);

      const jsDay = getDay(d);
      const isWeekend = jsDay === 0 || jsDay === 6;

      hours.push(
        isWeekend
          ? { day_of_week: dow, is_closed: true }
          : {
              day_of_week: dow,
              // Use H:i format — no seconds
              open_time: "08:00",
              close_time: "17:00",
              is_closed: false,
              max_patients: defaultCapacity,
            }
      );
    }

    setSchedule.mutate(hours, {
      onSuccess: (res) =>
        toast.success(t("pages.hospital.schedule_generated"), {
          description: `${res.working_hours.length} days saved`,
        }),
      onError: (err) => toast.error(err.message),
    });
  };

  /* ─── Toggle a single day open/closed ─── */
  const toggleDay = (hour: WorkingHour, isClosed: boolean) => {
    updateHour.mutate(
      {
        id: hour.id,
        patch: {
          is_closed: isClosed,
          // Strip seconds before sending back to API
          ...(!isClosed && hour.open_time
            ? {
                open_time: toHHmm(hour.open_time),
                close_time: toHHmm(hour.close_time),
              }
            : {}),
        },
      },
      { onError: (err) => toast.error(err.message) }
    );
  };

  /* ─── Save capacity for a single day ─── */
  const commitCapacity = (id: number, max_patients: number) => {
    updateHour.mutate(
      { id, patch: { max_patients } },
      {
        onSuccess: () => toast.success("Capacity updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  /* ─── Bulk actions — always strip seconds ─── */
  const bulkActivate = (active: boolean) => {
    const payload: WorkingHourInput[] = sortedHours.map((h) => ({
      day_of_week: h.day_of_week,
      is_closed: !active,
      ...(!active && h.open_time
        ? { open_time: toHHmm(h.open_time), close_time: toHHmm(h.close_time) }
        : {}),
      ...(h.max_patients ? { max_patients: h.max_patients } : {}),
    }));
    setSchedule.mutate(payload, {
      onSuccess: () =>
        toast.success(active ? "All days activated" : "All days closed"),
      onError: (err) => toast.error(err.message),
    });
  };

  const bulkCloseWeekends = () => {
    const weekends: WorkingHour["day_of_week"][] = ["saturday", "sunday"];
    const payload: WorkingHourInput[] = sortedHours.map((h) => ({
      day_of_week: h.day_of_week,
      is_closed: weekends.includes(h.day_of_week) ? true : h.is_closed,
      ...(!h.is_closed && h.open_time
        ? { open_time: toHHmm(h.open_time), close_time: toHHmm(h.close_time) }
        : {}),
      ...(h.max_patients ? { max_patients: h.max_patients } : {}),
    }));
    setSchedule.mutate(payload, {
      onSuccess: () => toast.success("Weekends closed"),
      onError: (err) => toast.error(err.message),
    });
  };

  const bulkSetCapacity = () => {
    const payload: WorkingHourInput[] = sortedHours.map((h) => ({
      day_of_week: h.day_of_week,
      is_closed: h.is_closed,
      ...(h.open_time
        ? { open_time: toHHmm(h.open_time), close_time: toHHmm(h.close_time) }
        : {}),
      max_patients: defaultCapacity,
    }));
    setSchedule.mutate(payload, {
      onSuccess: () =>
        toast.success(`Capacity set to ${defaultCapacity} for all days`),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleReset = () => {
    if (!window.confirm("This will delete all working hours. Continue?")) return;
    resetHours.mutate(undefined, {
      onSuccess: () => toast.success("Working hours reset"),
      onError: (err) => toast.error(err.message),
    });
  };

  /* ─── Toggle callbacks (returned as promises for ToggleRow) ─── */
  const handleToggleActive = () =>
    new Promise<void>((resolve, reject) => {
      toggleActive.mutate(undefined, {
        onSuccess: (res) => {
          toast[res.is_active ? "success" : "warning"](res.message);
          resolve();
        },
        onError: (err) => {
          toast.error(err.message);
          reject(err);
        },
      });
    });

  const handleToggleAccepting = () =>
    new Promise<void>((resolve, reject) => {
      toggleAccepting.mutate(undefined, {
        onSuccess: (res) => {
          toast[res.is_accepting_bookings ? "success" : "warning"](res.message);
          resolve();
        },
        onError: (err) => {
          toast.error(err.message);
          reject(err);
        },
      });
    });

  /* ─── Render ─── */
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
              <div className="flex flex-wrap justify-between items-center gap-4">
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
                      {hoursLoading
                        ? "Loading…"
                        : totals.totalDays > 0
                        ? `${totals.totalDays} days configured`
                        : "No schedule yet"}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block h-6 w-px bg-border/60" />

                {/* Hide from patients — red toggle */}
                <ToggleRow
                  label="Hide from patients"
                  activeLabel="Hidden from search"
                  inactiveLabel="Visible in search"
                  icon={!isActive ? EyeOff : Eye}
                  activeColor="red"
                  checked={!isActive}
                  onToggle={handleToggleActive}
                  loading={statusLoading}
                />

                <div className="hidden sm:block h-6 w-px bg-border/60" />

                {/* Pause bookings — amber toggle */}
                <ToggleRow
                  label="Pause bookings"
                  activeLabel="Not accepting"
                  inactiveLabel="Accepting bookings"
                  icon={!isAccepting ? BanIcon : BookOpen}
                  activeColor="amber"
                  checked={!isAccepting}
                  onToggle={handleToggleAccepting}
                  loading={statusLoading}
                />
              </div>
            </div>

            {/* ── Status banners ── */}
            {!isActive && (
              <div className="flex items-center gap-3 rounded-sm border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-[11px] text-red-700 dark:text-red-400">
                <AlertTriangle size={14} className="flex-shrink-0 text-red-500" />
                <span className="font-medium">
                  Hospital is hidden from patient search. No new bookings possible.
                </span>
              </div>
            )}
            {isActive && !isAccepting && (
              <div className="flex items-center gap-3 rounded-sm border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle size={14} className="flex-shrink-0 text-amber-500" />
                <span className="font-medium">
                  Hospital is visible but not accepting bookings.
                </span>
              </div>
            )}

            {/* ── Stats row ── */}
            {sortedHours.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="Total days" value={totals.totalDays} accent="primary" />
                <StatCard label="Active days" value={totals.activeDays} accent="success" />
                <StatCard label="Total capacity" value={totals.capacity} accent="info" />
                <StatCard label="Off days" value={totals.offDays} accent="primary" />
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

                  {/* Date range — disabled before today */}
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
                          // Disable every day strictly before today
                          disabled={(date) => isBefore(date, today)}
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
                          Math.max(1, parseInt(e.target.value || "1"))
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
                    disabled={setSchedule.isPending}
                    className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-[11px] gap-1.5 shadow-sm"
                  >
                    {setSchedule.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {t("pages.hospital.generate_btn")}
                  </Button>
                </div>

                {/* Bulk actions */}
                {sortedHours.length > 0 && (
                  <div className="rounded-sm border border-border/70 bg-card p-4 shadow-sm space-y-2">
                    <h3 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                      <ChevronsDownUp size={13} className="text-primary" />
                      Bulk actions
                    </h3>
                    <div className="space-y-1.5">
                      <button
                        onClick={() => bulkActivate(true)}
                        disabled={isMutating}
                        className="w-full flex items-center gap-1.5 text-[10px] text-primary font-medium px-2.5 py-1.5 rounded-sm border border-primary/20 bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        <CalendarCheck2 size={11} />
                        Activate all days
                      </button>
                      <button
                        onClick={() => bulkActivate(false)}
                        disabled={isMutating}
                        className="w-full flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium px-2.5 py-1.5 rounded-sm border border-border/60 bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                      >
                        <CalendarX2 size={11} />
                        Close all days
                      </button>
                      <button
                        onClick={bulkCloseWeekends}
                        disabled={isMutating}
                        className="w-full flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium px-2.5 py-1.5 rounded-sm border border-border/60 bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={11} />
                        Close weekends only
                      </button>
                      <button
                        onClick={bulkSetCapacity}
                        disabled={isMutating}
                        className="w-full flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium px-2.5 py-1.5 rounded-sm border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                      >
                        <Users2 size={11} />
                        Apply capacity ({defaultCapacity}) to all
                      </button>
                      <button
                        onClick={handleReset}
                        disabled={isMutating}
                        className="w-full flex items-center gap-1.5 text-[10px] text-red-600 dark:text-red-400 font-medium px-2.5 py-1.5 rounded-sm border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={11} />
                        Reset all hours
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
                        {hoursLoading
                          ? "Loading schedule…"
                          : sortedHours.length === 0
                          ? t("pages.hospital.no_schedule_yet")
                          : t("pages.hospital.days_configured", {
                              count: sortedHours.length,
                            })}
                      </p>
                    </div>

                    {sortedHours.length > 0 && (
                      <div className="flex items-center gap-1 p-0.5 rounded-sm bg-secondary/50 border border-border/40">
                        {(["all", "active", "closed"] as DayFilter[]).map((f) => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                              "px-2.5 py-1 text-[10px] font-medium rounded-sm transition-all",
                              filter === f
                                ? "bg-card text-foreground shadow-sm border border-border/60"
                                : "text-muted-foreground hover:text-foreground"
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
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Capacity summary bar */}
                  {sortedHours.length > 0 && (
                    <div className="mb-4 pb-4 border-b border-border/60">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                          <TrendingUp size={10} />
                          Active days / total days
                        </span>
                        <span className="text-[10px] font-semibold text-foreground">
                          {totals.activeDays} / {totals.totalDays}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{
                            width: `${
                              totals.totalDays > 0
                                ? Math.round(
                                    (totals.activeDays / totals.totalDays) * 100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Day list */}
                  {hoursLoading ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-[11px]">Loading schedule…</span>
                    </div>
                  ) : filteredHours.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                      <CalendarIcon
                        size={24}
                        className="mx-auto text-muted-foreground/30"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {sortedHours.length === 0
                          ? t("pages.hospital.no_schedule_hint")
                          : `No ${filter} days in this period.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                      {filteredHours.map((hour) => (
                        <div
                          key={hour.id}
                          className={cn(
                            "rounded-sm border px-3 py-2.5 flex items-center gap-3 transition-all duration-150",
                            !hour.is_closed
                              ? "border-border/60 bg-card hover:border-primary/30 hover:bg-primary/5"
                              : "border-dashed border-border/40 bg-muted/30"
                          )}
                        >
                          {/* Day name */}
                          <div className="w-12 shrink-0">
                            <div
                              className={cn(
                                "text-[11px] font-bold capitalize leading-tight",
                                !hour.is_closed
                                  ? "text-foreground"
                                  : "text-muted-foreground/40"
                              )}
                            >
                              {hour.day_of_week.slice(0, 3)}
                            </div>
                            <div className="text-[9px] text-muted-foreground/60 capitalize">
                              {hour.day_of_week}
                            </div>
                          </div>

                          {/* Status + times */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {!hour.is_closed ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary gap-1"
                                >
                                  <CheckCircle2 size={9} />
                                  Open
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
                              {!hour.is_closed && hour.open_time && (
                                <span className="text-[9px] text-muted-foreground/70">
                                  {/* Display stripped form */}
                                  {toHHmm(hour.open_time)} –{" "}
                                  {toHHmm(hour.close_time)}
                                </span>
                              )}
                            </div>
                            {!hour.is_closed && hour.max_patients != null && (
                              <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                                <Users2 size={9} />
                                <span>{hour.max_patients} max patients</span>
                              </div>
                            )}
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Capacity with save button */}
                            <CapacityInput
                              hour={hour}
                              onCommit={commitCapacity}
                              disabled={hour.is_closed || updateHour.isPending}
                            />

                            {/* Open/closed toggle */}
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">
                                Open
                              </span>
                              <Switch
                                checked={!hour.is_closed}
                                disabled={updateHour.isPending}
                                onCheckedChange={(v) => toggleDay(hour, !v)}
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
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
