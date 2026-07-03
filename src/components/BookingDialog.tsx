import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
  CalendarDays, Stethoscope, AlertTriangle, Loader2,
} from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useGetSlots,
  useGetSlotsByDate,
  useBookAppointment,
  usePayAppointment,
  useGetDoctorBySlug,
  type ApiSlot,
} from "@/hooks/patient/use-patient-booking";
import { useInvoicePoller } from "@/hooks/patient/use-instant-consultations";
import { useMe } from "@/hooks/useAuth";
import { useGoToRole } from "@/hooks/useRoleManagement";

// ─── Doctor type ───────────────────────────────────────────────────────────────

export interface Doctor {
  id: number;
  slug: string;
  specialization: string;
  doctor_degree: string;
  consultation_fee: string | number;
  currency?: string;
  consultation_type?: "online" | "in_person" | "both";
  image?: string | null;
  user: {
    id: number;
    name: string;
    avatar?: string | null;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** "11:00:00" → "11:00" */
function toTimeLabel(time: string) {
  return time.slice(0, 5);
}

/** Map an ApiSlot array to the shape TimeSlotGrid expects */
function mapSlots(slots: ApiSlot[]) {
  return slots.map((s) => ({
    id: s.id,
    time: toTimeLabel(s.start_time),
    rawTime: s.start_time,
    status: s.status,
    type: s.type,
    duration: s.duration_minutes,
  }));
}

type MappedSlot = ReturnType<typeof mapSlots>[number];

// ─── MiniCalendar ──────────────────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
  allowedDates,
}: {
  selected: Date | undefined;
  onSelect: (d: Date) => void;
  allowedDates: Set<string>;
}) {
  const [cursor, setCursor] = useState(() => selected ?? new Date());

  const weeks = useMemo(() => {
    const start = moment(cursor).startOf("month").startOf("isoWeek");
    const end = moment(cursor).endOf("month").endOf("isoWeek");
    const days: Date[] = [];
    const cur = start.clone();
    while (cur.isSameOrBefore(end, "day")) {
      days.push(cur.toDate());
      cur.add(1, "day");
    }
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [cursor]);

  const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(moment(cursor).subtract(1, "month").toDate())}
          className="h-7 w-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground tracking-wide">
          {moment(cursor).format("MMMM YYYY")}
        </span>
        <button
          onClick={() => setCursor(moment(cursor).add(1, "month").toDate())}
          className="h-7 w-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground/60 py-1">
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => {
            const k = moment(day).format("YYYY-MM-DD");
            const inMonth = moment(day).isSame(cursor, "month");
            const isAllowed = allowedDates.has(k);
            const isDisabled = !inMonth || !isAllowed;
            const isSel = selected ? moment(day).isSame(selected, "day") : false;
            const isTod = moment(day).isSame(moment(), "day");

            return (
              <button
                key={k}
                disabled={isDisabled}
                onClick={() => !isDisabled && onSelect(day)}
                className={cn(
                  "relative flex items-center justify-center h-8 w-full rounded-[6px] text-sm transition-all duration-150",
                  !inMonth && "invisible",
                  isDisabled && inMonth && "text-muted-foreground/30 cursor-not-allowed",
                  !isDisabled && !isSel && "text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer",
                  isSel && "bg-primary text-primary-foreground font-semibold shadow-sm",
                  isTod && !isSel && "font-semibold underline underline-offset-2",
                  isAllowed && !isDisabled && !isSel && "font-medium",
                )}
              >
                {moment(day).format("D")}
                {isAllowed && !isSel && inMonth && (
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

// ─── TimeSlotGrid ──────────────────────────────────────────────────────────────

function TimeSlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: MappedSlot[];
  selected: string | null;
  onSelect: (t: string) => void;
}) {
  const periods = useMemo(() => {
    const morning: MappedSlot[] = [];
    const afternoon: MappedSlot[] = [];
    const evening: MappedSlot[] = [];
    slots.forEach((s) => {
      const h = parseInt(s.time.split(":")[0], 10);
      if (h < 12) morning.push(s);
      else if (h < 17) afternoon.push(s);
      else evening.push(s);
    });
    return [
      { label: "Morning", icon: "🌤", items: morning },
      { label: "Afternoon", icon: "☀️", items: afternoon },
      { label: "Evening", icon: "🌙", items: evening },
    ].filter((p) => p.items.length > 0);
  }, [slots]);

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
        <CalendarDays className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a date to see available slots</p>
      </div>
    );
  }

  const available = slots.filter((s) => s.status === "available").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{available}</span> of {slots.length} slots open
        </span>
      </div>

      {periods.map(({ label, icon, items }) => (
        <div key={label}>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5 flex items-center gap-1">
            <span>{icon}</span> {label}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {items.map((s) => {
              const avail = s.status === "available";
              const sel = selected === s.time;
              return (
                <button
                  key={s.id}
                  disabled={!avail}
                  onClick={() => avail && onSelect(s.time)}
                  className={cn(
                    "py-1.5 rounded-[6px] text-sm font-mono tabular-nums border transition-all duration-150",
                    sel && "bg-primary text-primary-foreground border-primary shadow-sm font-semibold",
                    !sel && avail && "border-border text-foreground hover:border-primary/60 hover:bg-primary/5 hover:text-primary",
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

// ─── BookingDialog ─────────────────────────────────────────────────────────────

export const BookingDialog = ({
  doctor,
  open,
  onOpenChange,
  onConfirmed,
}: {
  doctor: Doctor;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirmed?: (updatedDoctor: Doctor) => void;
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ── Local state ────────────────────────────────────────────────────────────
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ date: string; time: string } | null>(null);
  const [shouldRefetchDoctor, setShouldRefetchDoctor] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const dateKey = date ? moment(date).format("YYYY-MM-DD") : null;

  // ── Reset ALL state every time the dialog opens ────────────────────────────
  useEffect(() => {
    if (open) {
      setDate(undefined);
      setTime(null);
      setConfirmed(null);
      setShouldRefetchDoctor(false);
      queryClient.removeQueries({ queryKey: ["doctor", doctor.slug] });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 1. Fetch all available dates ───────────────────────────────────────────
  const {
    data: slotsData,
    isLoading: slotsLoading,
    isError: slotsError,
  } = useGetSlots(doctor.slug, open);

  // ── 2. Fetch slots for the selected date ───────────────────────────────────
  const {
    data: dayData,
    isLoading: dayLoading,
    isError: dayError,
  } = useGetSlotsByDate(doctor.slug, dateKey, !!dateKey && open);

  // ── 3. Mutations ────────────────────────────────────────────────────────────
  const bookAppointment = useBookAppointment();
  const payAppointment = usePayAppointment();
  const invoicePoller = useInvoicePoller();
  const { data: me } = useMe();
  const { go: goToRole } = useGoToRole();
  // After a stay-and-switch to patient, resume the booking automatically once
  // the session reflects the new role.
  const [resumeBooking, setResumeBooking] = useState(false);
  // Inline switch prompt (a toast button is unclickable behind the modal).
  const [switchPrompt, setSwitchPrompt] = useState<string | null>(null);
  useEffect(() => {
    if (!resumeBooking) return;
    if ((me?.active_role ?? me?.role) === "patient") {
      setResumeBooking(false);
      void handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeBooking, me]);

  // Fresh doctor query (only active after a successful booking) ─────────────────────────────
  const { data: freshDoctorData } = useGetDoctorBySlug(
    shouldRefetchDoctor ? doctor.slug : "",
  );

  // ── Derived: set of allowed calendar dates ─────────────────────────────────
  const allowedDates = useMemo(() => {
    if (!slotsData?.dates) return new Set<string>();
    return new Set(slotsData.dates);
  }, [slotsData]);

  // Auto-select first available date
  useMemo(() => {
    if (slotsData?.dates?.length && !date) {
      setDate(moment(slotsData.dates[0]).toDate());
    }
  }, [slotsData]);

  // ── Derived: mapped slots for the selected day ─────────────────────────────
  const daySlots = useMemo<MappedSlot[]>(() => {
    if (!dateKey || !dayData?.slots[dateKey]) return [];
    return mapSlots(dayData.slots[dateKey]);
  }, [dayData, dateKey]);

  // ── When fresh doctor data arrives, propagate it to the parent ────────────
  // useEffect (not useMemo) so this only runs when freshDoctorData *changes*,
  // not on every render. The shouldRefetchDoctor guard means it only fires
  // after a real booking, never on the next dialog open.
  useEffect(() => {
    if (freshDoctorData && shouldRefetchDoctor && onConfirmed) {
      const updated: Doctor = {
        ...doctor,
        ...(freshDoctorData as Partial<Doctor>),
      };
      onConfirmed(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshDoctorData]);

  // ── Booking handler ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!dateKey || !time) return;

    // ── Gate: only a signed-in patient can book ──────────────────────────────
    const token = localStorage.getItem("auth_token");
    if (!token) {
      // Not signed in → send them to login rather than failing with "Unauthorized".
      toast.message("Please sign in to book", {
        description: "You need a patient account to book a consultation.",
      });
      onOpenChange(false);
      navigate("/auth", { state: { from: window.location.pathname + window.location.search } });
      return;
    }
    const activeRole = (me?.active_role ?? me?.role) as string | undefined;
    if (activeRole && activeRole !== "patient") {
      // Signed in, but acting as doctor/hospital/etc. Show an inline switch CTA.
      setSwitchPrompt(activeRole);
      return;
    }

    const consultationType =
      doctor.consultation_type === "in_person" ? "in_person" : "online";

    const slot = daySlots.find((s) => s.time === time);
    const appointmentTime = slot ? toTimeLabel(slot.rawTime) : time;

    try {
      const res = await bookAppointment.mutateAsync({
        doctor_id: doctor.id,
        type: consultationType,
        appointment_date: dateKey,
        appointment_time: appointmentTime,
      });

      // Invalidate stale queries
      await queryClient.invalidateQueries({ queryKey: ["patient-search-doctors"] });
      await queryClient.invalidateQueries({ queryKey: ["doctor-slots", doctor.slug] });

      // Invalidate cached doctor data so useGetDoctorBySlug re-fetches
      await queryClient.invalidateQueries({ queryKey: ["doctor", doctor.slug] });

      // Enable the doctor re-fetch
      setShouldRefetchDoctor(true);

      setConfirmed({ date: dateKey, time });
      toast.success("Appointment booked", {
        description: `${doctorName} · ${moment(dateKey).format("ddd MMM D")} at ${time}`,
      });

      // Initiate payment if fee > 0
      if (doctor.consultation_fee && Number(doctor.consultation_fee) > 0) {
        // Handle different response structures
        const appointmentId = res.id ?? (res as any).data?.id ?? (res as any).appointment?.id;

        if (!appointmentId) {
          console.error("Booking succeeded but appointment ID is missing from response:", res);
          toast.error("Payment could not be initiated", { description: "We couldn't find the appointment ID. Please pay from your dashboard." });
          return;
        }

        try {
          const payRes = await payAppointment.mutateAsync(appointmentId);
          (window as any).IremboPay?.initiate({
            publicKey: payRes.public_key,
            invoiceNumber: payRes.invoice_number,
            locale: (window as any).IremboPay?.locale?.EN || "en",
            callback: (err: Error | null) => {
              (window as any).IremboPay?.closeModal?.();
              if (err) {
                toast.error("Payment failed", { description: "You can pay later from your dashboard." });
              } else {
                setVerifyingPayment(true);
                invoicePoller.start(
                  payRes.invoice_number,
                  () => {
                    setVerifyingPayment(false);
                    toast.success("Payment successful", { description: "Your appointment is confirmed and paid." });
                    // Invalidate appointments to refresh the UI
                    queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
                    // Send the patient to their appointments list to see / join it.
                    onOpenChange(false);
                    navigate("/patient/appointments");
                  },
                  (msg) => {
                    setVerifyingPayment(false);
                    toast.error("Payment verification failed", { description: msg });
                  }
                );
              }
            }
          });
        } catch (payErr) {
          console.error("Payment initiation failed:", payErr);
          toast.error("Payment could not be initiated", { description: "You can pay later from your dashboard." });
        }
      }

    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "";

      // Session expired / not authenticated → go to login.
      if (status === 401 || /unauthor/i.test(msg)) {
        toast.message("Please sign in to book", {
          description: "Your session has expired or you're not signed in.",
        });
        onOpenChange(false);
        navigate("/auth", { state: { from: window.location.pathname + window.location.search } });
        return;
      }

      // Authenticated but the wrong kind of account (e.g. a doctor).
      if (status === 403) {
        setSwitchPrompt((me?.active_role ?? me?.role ?? "another role") as string);
        return;
      }

      toast.error("Booking failed", {
        description: msg || "Please try again.",
      });
    }
  };

  const reset = () => {
    setTime(null);
    setConfirmed(null);
    setDate(undefined);
    setShouldRefetchDoctor(false);
    queryClient.removeQueries({ queryKey: ["doctor", doctor.slug] });
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const doctorName = doctor.user?.name ?? "Unknown Doctor";
  const doctorAvatar = doctor.user?.avatar ?? doctor.image ?? null;
  const doctorInitial = doctorName.charAt(0);

  const showLoading = slotsLoading && !confirmed;
  const showError = slotsError && !confirmed;
  const showBody = !slotsLoading && !slotsError && !confirmed && !!slotsData;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }} modal={false}>
      {/* modal={false} + the prevent handlers keep this open and interactive while
          the IremboPay widget (rendered outside this dialog) is on screen.
          Because modal=false disables the Radix overlay, we add our own manual overlay. */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md pointer-events-none" />
      )}
      <DialogContent
        className="max-w-[680px] max-h-[calc(100dvh-2rem)] p-0 overflow-hidden gap-0 bg-card/80 backdrop-blur-2xl flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {doctorAvatar
                ? <img src={doctorAvatar} alt={doctorName} className="h-9 w-9 rounded-[6px] object-cover" />
                : doctorInitial}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[14px] font-semibold leading-tight truncate">
                {doctorName}
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Stethoscope className="h-4 w-4" />
                  {doctor.specialization}
                </span>
                {doctor.consultation_fee !== undefined && (
                  <>
                    <span className="text-border">·</span>
                    <span className="font-semibold text-foreground">
                      {Number(doctor.consultation_fee) === 0
                        ? "Free"
                        : `${doctor.consultation_fee} ${doctor.currency ?? "RWF"}`}
                    </span>
                  </>
                )}
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <Video className="h-4 w-4" /> Video consult
                </span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {showLoading && (
          <div className="min-h-0 flex-1 overflow-y-auto flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading available slots…</p>
          </div>
        )}

        {/* Error state */}
        {showError && (
          <div className="min-h-0 flex-1 overflow-y-auto flex flex-col items-center justify-center py-12 gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <p className="text-sm">Could not load availability. Please try again.</p>
          </div>
        )}

        {/* ── NEW: Confirmed state — shows refreshing indicator while doctor re-fetches ── */}
        {confirmed && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10 text-center space-y-5">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[15px] font-semibold">Appointment confirmed</h3>
              <p className="text-sm text-muted-foreground">
                {moment(confirmed.date).format("dddd, MMMM D, YYYY")} at {confirmed.time}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2 inline-flex items-center gap-1.5 border border-border/60 rounded-full px-3 py-1">
                <Video className="h-4 w-4" />
                Video link will be sent before the session
              </p>

              {/* NEW: subtle "syncing" badge while fresh doctor data loads */}
              {shouldRefetchDoctor && !freshDoctorData && !verifyingPayment && (
                <p className="text-xs text-muted-foreground/50 mt-1 flex items-center justify-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing availability…
                </p>
              )}

              {/* Verifying payment */}
              {verifyingPayment && (
                <p className="text-sm text-primary mt-2 flex items-center justify-center gap-1.5 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying payment status…
                </p>
              )}
            </div>
            <Button onClick={() => onOpenChange(false)} className="px-8">
              Done
            </Button>
          </div>
        )}

        {/* Main body */}
        {showBody && (
          <div className="min-h-0 flex-1 flex flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr]">
              {/* Left — calendar */}
              <div className="px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                  Select date
                </p>
                <MiniCalendar
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setTime(null);
                  }}
                  allowedDates={allowedDates}
                />
                {date && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground border border-border/60 rounded-[6px] px-2.5 py-1.5 bg-muted/30">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span className="font-medium text-foreground">{moment(date).format("ddd, MMM D")}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{slotsData.dates.length} day{slotsData.dates.length !== 1 ? "s" : ""} avail.</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="hidden bg-border/60 sm:block" />

              {/* Right — time slots */}
              <div className="px-5 py-5 sm:max-h-[380px] sm:overflow-y-auto">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                  Select time · {daySlots[0]?.duration ?? 30} min
                </p>

                {dayLoading && dateKey && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-sm">Loading slots…</p>
                  </div>
                )}

                {dayError && !dayLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="text-sm">Could not load slots for this date.</p>
                  </div>
                )}

                {!dayLoading && !dayError && (
                  <TimeSlotGrid
                    slots={daySlots}
                    selected={time}
                    onSelect={setTime}
                  />
                )}
              </div>
              </div>
            </div>

            {/* Switch-to-patient prompt (inline, clickable over the modal) */}
            {switchPrompt && (
              <div className="px-4 sm:px-6 py-3 border-t border-amber-400/30 bg-amber-500/10 flex items-start gap-2.5 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">
                    Switch to your patient role to book
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    You're signed in as {switchPrompt}. Switch to patient to book a consultation.
                  </p>
                </div>
                <button
                  onClick={() =>
                    goToRole("patient", {
                      stay: true,
                      onSwitched: () => {
                        setSwitchPrompt(null);
                        setResumeBooking(true);
                      },
                    })
                  }
                  className="h-8 px-3 rounded-[6px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors shrink-0"
                >
                  Switch to patient
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 flex-shrink-0">
              <div className="text-sm text-muted-foreground min-w-0">
                {date && time ? (
                  <span className="font-medium text-foreground truncate">
                    {moment(date).format("ddd, MMM D")} · {time}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">
                    {!date ? "Pick a date" : "Pick a time slot"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-4 text-sm rounded-[6px]"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!date || !time || bookAppointment.isPending}
                  onClick={handleConfirm}
                  className="h-8 px-5 text-sm rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  {bookAppointment.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Booking…</>
                    : "Confirm appointment"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
