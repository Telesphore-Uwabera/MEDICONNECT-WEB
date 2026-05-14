import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Check, Clock, Video, ChevronLeft, ChevronRight,
  CalendarDays, Stethoscope, AlertTriangle,
} from "lucide-react";
import {
  format, parseISO, addMonths, subMonths,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Doctor } from "@/lib/mock-data";
import { useSchedule, bookSlot } from "@/lib/schedule-store";
import {
  checkHospitalAvailability,
  incrementHospitalBooked,
  useHospitalSchedule,
} from "@/lib/hospital-store";
import { toast } from "sonner";

// ─── Inline mini-calendar ─────────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
  allowedDates,
  hospitalCheck,
}: {
  selected: Date | undefined;
  onSelect: (d: Date) => void;
  allowedDates: Set<string>;
  hospitalCheck: (k: string) => { ok: boolean; reason?: string } | null;
}) {
  const [cursor, setCursor] = useState(() => selected ?? new Date());

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(cursor),     { weekStartsOn: 1 });
    const days  = eachDayOfInterval({ start, end });
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [cursor]);

  const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(subMonths(cursor, 1))}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[12px] font-semibold text-foreground tracking-wide">
          {format(cursor, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/60 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => {
            const k        = format(day, "yyyy-MM-dd");
            const inMonth  = isSameMonth(day, cursor);
            const isAllowed = allowedDates.has(k);
            const hResult  = hospitalCheck(k);
            const blocked  = hResult?.ok === false;
            const isDisabled = !inMonth || !isAllowed || blocked;
            const isSel    = selected ? isSameDay(day, selected) : false;
            const isTod    = isToday(day);

            return (
              <button
                key={k}
                disabled={isDisabled}
                onClick={() => !isDisabled && onSelect(day)}
                className={cn(
                  "relative flex items-center justify-center h-8 w-full rounded-md text-[12px] transition-all duration-150",
                  !inMonth && "invisible",
                  isDisabled && inMonth && "text-muted-foreground/30 cursor-not-allowed",
                  !isDisabled && !isSel && "text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer",
                  isSel && "bg-primary text-primary-foreground font-semibold shadow-sm",
                  isTod && !isSel && "font-semibold underline underline-offset-2",
                  isAllowed && !isDisabled && !isSel && "font-medium",
                )}
              >
                {format(day, "d")}
                {/* availability dot */}
                {isAllowed && !blocked && !isSel && inMonth && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-0.5 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Time slot grid ───────────────────────────────────────────────────────────

function TimeSlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: { time: string; status: string }[];
  selected: string | null;
  onSelect: (t: string) => void;
}) {
  const periods = useMemo(() => {
    const morning:   typeof slots = [];
    const afternoon: typeof slots = [];
    const evening:   typeof slots = [];
    slots.forEach((s) => {
      const h = parseInt(s.time.split(":")[0], 10);
      if (h < 12)      morning.push(s);
      else if (h < 17) afternoon.push(s);
      else             evening.push(s);
    });
    return [
      { label: "Morning",   icon: "🌤", items: morning   },
      { label: "Afternoon", icon: "☀️",  items: afternoon },
      { label: "Evening",   icon: "🌙", items: evening   },
    ].filter((p) => p.items.length > 0);
  }, [slots]);

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
        <CalendarDays className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-[11px] text-muted-foreground">Select a date to see available slots</p>
      </div>
    );
  }

  const available = slots.filter((s) => s.status === "available").length;

  return (
    <div className="space-y-3">
      {/* Slot count badge */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground">{available}</span> of {slots.length} slots open
        </span>
      </div>

      {periods.map(({ label, icon, items }) => (
        <div key={label}>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5 flex items-center gap-1">
            <span>{icon}</span> {label}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {items.map((s) => {
              const avail = s.status === "available";
              const sel   = selected === s.time;
              return (
                <button
                  key={s.time}
                  disabled={!avail}
                  onClick={() => avail && onSelect(s.time)}
                  className={cn(
                    "py-1.5 rounded-md text-[11px] font-mono tabular-nums border transition-all duration-150",
                    sel   && "bg-primary text-primary-foreground border-primary shadow-sm font-semibold",
                    !sel && avail  && "border-border text-foreground hover:border-primary/60 hover:bg-primary/5 hover:text-primary",
                    !avail && "bg-muted/40 text-muted-foreground/30 border-border/40 line-through cursor-not-allowed",
                  )}
                >
                  {s.time}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export const BookingDialog = ({
  doctor,
  open,
  onOpenChange,
}: {
  doctor: Doctor;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const schedule = useSchedule(doctor.id);
  useHospitalSchedule(doctor.hospital);

  const [date,      setDate]      = useState<Date | undefined>(
    schedule ? parseISO(schedule.days[0].date) : undefined,
  );
  const [time,      setTime]      = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ date: string; time: string } | null>(null);

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;

  const day = useMemo(
    () => schedule?.days.find((d) => d.date === dateKey),
    [schedule, dateKey],
  );

  const allowedDates = useMemo(
    () => new Set(schedule?.days.map((d) => d.date) ?? []),
    [schedule],
  );

  const hospitalCheck = (k: string) =>
    checkHospitalAvailability(doctor.hospital, k);

  const hospitalBlocked =
    dateKey
      ? (() => { const h = hospitalCheck(dateKey); return h?.ok === false ? h.reason : null; })()
      : null;

  const handleConfirm = () => {
    if (!dateKey || !time) return;
    const hCheck = checkHospitalAvailability(doctor.hospital, dateKey);
    if (hCheck.ok === false) {
      toast.error("Cannot book", { description: hCheck.reason });
      return;
    }
    const appt = bookSlot(doctor.id, doctor.name, doctor.specialty, dateKey, time);
    if (appt) {
      incrementHospitalBooked(doctor.hospital, dateKey);
      setConfirmed({ date: dateKey, time });
      toast.success("Appointment confirmed", {
        description: `${doctor.name} · ${format(parseISO(dateKey), "EEE MMM d")} at ${time}`,
      });
    } else {
      toast.error("Slot no longer available");
    }
  };

  const reset = () => { setTime(null); setConfirmed(null); };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-[680px] p-0 overflow-hidden gap-0">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {doctor.avatar}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[14px] font-semibold leading-tight truncate">
                {doctor.name}
              </DialogTitle>
              <DialogDescription className="text-[11px] mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {doctor.specialty}
                </span>
                <span className="text-border">·</span>
                <span className="font-semibold text-foreground">${doctor.fee}</span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <Video className="h-3 w-3" /> Video consult
                </span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {confirmed ? (
          /* ── Success state ── */
          <div className="px-6 py-10 text-center space-y-5">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[15px] font-semibold">Appointment confirmed</h3>
              <p className="text-[12px] text-muted-foreground">
                {format(parseISO(confirmed.date), "EEEE, MMMM d, yyyy")} at {confirmed.time}
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-2 inline-flex items-center gap-1.5 border border-border/60 rounded-full px-3 py-1">
                <Video className="h-3 w-3" />
                Video link will be sent before the session
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="px-8">
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* ── Body: calendar + slots side by side ── */}
            <div className="grid grid-cols-[1fr_1px_1fr] min-h-[320px]">

              {/* Left — calendar */}
              <div className="px-5 py-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                  Select date
                </p>
                <MiniCalendar
                  selected={date}
                  onSelect={(d) => { setDate(d); setTime(null); }}
                  allowedDates={allowedDates}
                  hospitalCheck={hospitalCheck}
                />
                {/* Selected date pill */}
                {date && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border/60 rounded-md px-2.5 py-1.5 bg-muted/30">
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    <span className="font-medium text-foreground">{format(date, "EEE, MMM d")}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{schedule ? `${schedule.days.length} days avail.` : "—"}</span>
                  </div>
                )}
                {hospitalBlocked && (
                  <div className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive bg-destructive/8 border border-destructive/20 rounded-md px-2.5 py-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-px" />
                    <span>{hospitalBlocked}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="bg-border/60" />

              {/* Right — time slots */}
              <div className="px-5 py-5 overflow-y-auto max-h-[380px]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                  Select time · 30 min
                </p>
                <TimeSlotGrid
                  slots={day?.slots ?? []}
                  selected={time}
                  onSelect={setTime}
                />
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between gap-3 bg-muted/20">
              {/* Summary */}
              <div className="text-[11px] text-muted-foreground min-w-0">
                {date && time ? (
                  <span className="font-medium text-foreground truncate">
                    {format(date, "EEE, MMM d")} · {time}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">
                    {!date ? "Pick a date" : "Pick a time slot"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-4 text-[12px] rounded-md"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!date || !time || !!hospitalBlocked}
                  onClick={handleConfirm}
                  className="h-8 px-5 text-[12px] rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  Confirm appointment
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
