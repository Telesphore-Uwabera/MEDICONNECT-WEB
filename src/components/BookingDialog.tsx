import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { goToSignIn } from "@/lib/auth-session";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "moment/locale/fr";
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
import { useConvertGuest, useCreateGuest, useMe } from "@/hooks/useAuth";
import { clearAuthToken, setAuthToken } from "@/lib/auth-session";
import { Input } from "@/components/ui/input";
import {
  bookableDates,
  calendarDayKind,
  formatLocalDate,
  initialCalendarMonth,
  kigaliDate,
  kigaliMinutes,
  parseIsoDate,
} from "@/lib/booking-calendar";

// ─── Doctor type ───────────────────────────────────────────────────────────────

export interface Doctor {
  id: number;
  slug: string;
  specialization: string;
  doctor_degree: string;
  consultation_fee: string | number;
  currency?: string;
  consultation_type?: "online" | "in_person" | "both" | "instant" | "booking";
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

type MappedSlot = Omit<ReturnType<typeof mapSlots>[number], "status"> & {
  status: ReturnType<typeof mapSlots>[number]["status"] | "past";
};

// ─── MiniCalendar ──────────────────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
  allowedDates,
  focusMonth,
  today,
}: {
  selected: Date | undefined;
  onSelect: (d: Date) => void;
  allowedDates: Set<string>;
  focusMonth: Date;
  today: string;
}) {
  const { t, i18n } = useTranslation();
  const [cursor, setCursor] = useState(focusMonth);
  const focusKey = `${focusMonth.getFullYear()}-${focusMonth.getMonth()}`;

  useEffect(() => {
    setCursor(focusMonth);
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    moment.locale(i18n.language);
  }, [i18n.language]);

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

  const DOW = t("booking.doctorAppointment.days_mon", { returnObjects: true }) as string[];

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
            const k = formatLocalDate(day);
            const inMonth = moment(day).isSame(cursor, "month");
            const kind = calendarDayKind(k, allowedDates, today);
            const isAllowed = kind === "open";
            const isDisabled = !inMonth || !isAllowed;
            const isSel = selected ? formatLocalDate(selected) === k : false;
            const isTod = k === today;

            return (
              <button
                key={k}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                aria-label={
                  kind === "past"
                    ? t("booking.doctorAppointment.dayPast", { defaultValue: "{{date}}, past", date: k })
                    : kind === "open"
                      ? t("booking.doctorAppointment.dayOpen", { defaultValue: "{{date}}, available", date: k })
                      : t("booking.doctorAppointment.dayNone", { defaultValue: "{{date}}, no slots", date: k })
                }
                onClick={() => isAllowed && onSelect(day)}
                className={cn(
                  "relative flex items-center justify-center h-8 w-full rounded-[6px] text-sm transition-all duration-150",
                  !inMonth && "invisible",
                  kind === "past" && inMonth && "text-muted-foreground/35 line-through decoration-muted-foreground/40 cursor-not-allowed",
                  kind === "none" && inMonth && "text-muted-foreground/45 cursor-not-allowed",
                  isAllowed && !isSel && "text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer font-medium",
                  isSel && "bg-primary text-primary-foreground font-semibold shadow-sm",
                  isTod && !isSel && "font-semibold underline underline-offset-2",
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
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {t("booking.doctorAppointment.legendOpen", { defaultValue: "Open" })}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/35" />
          {t("booking.doctorAppointment.legendNone", { defaultValue: "No slots" })}
        </span>
        <span className="inline-flex items-center gap-1 line-through decoration-muted-foreground/40">
          {t("booking.doctorAppointment.legendPast", { defaultValue: "Past" })}
        </span>
      </div>
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
  const { t } = useTranslation();
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
      { label: t("booking.doctorAppointment.morning"), icon: "🌤", items: morning },
      { label: t("booking.doctorAppointment.afternoon"), icon: "☀️", items: afternoon },
      { label: t("booking.doctorAppointment.evening"), icon: "🌙", items: evening },
    ].filter((p) => p.items.length > 0);
  }, [slots, t]);

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
        <CalendarDays className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t("booking.doctorAppointment.selectSlotsPrompt")}</p>
      </div>
    );
  }

  const available = slots.filter((s) => s.status === "available").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground">
          {t("booking.doctorAppointment.slotsOpen", { available, total: slots.length })}
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
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const openAppointmentDetails = useCallback((appointmentId: string | number) => {
    const id = String(appointmentId);
    onOpenChange(false);
    queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
    navigate(`/patient/appointments?appointment_id=${encodeURIComponent(id)}`, {
      state: { openAppointmentId: id, paymentPending: true },
    });
  }, [navigate, onOpenChange, queryClient]);

  // ── Local state ────────────────────────────────────────────────────────────
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ date: string; time: string } | null>(null);
  const [shouldRefetchDoctor, setShouldRefetchDoctor] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [needsAccount, setNeedsAccount] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [guestAccess, setGuestAccess] = useState<{ email: string; password: string } | null>(null);

  const dateKey = date ? moment(date).format("YYYY-MM-DD") : null;

  // ── Reset ALL state every time the dialog opens ────────────────────────────
  useEffect(() => {
    if (open) {
      setDate(undefined);
      setTime(null);
      setConfirmed(null);
      setShouldRefetchDoctor(false);
      setNeedsAccount(false);
      setGuestAccess(null);
      setAccountError(null);
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
  const createGuest = useCreateGuest();
  const convertGuest = useConvertGuest();
  const invoicePoller = useInvoicePoller();
  const { data: me } = useMe();

  // Fresh doctor query (only active after a successful booking) ─────────────────────────────
  const { data: freshDoctorData } = useGetDoctorBySlug(
    shouldRefetchDoctor ? doctor.slug : "",
  );

  // ── Derived: upcoming dates only. Past days in the payload are not selectable.
  const todayKey = kigaliDate();
  const bookableDateList = useMemo(
    () => bookableDates(slotsData?.slots ?? {}),
    [slotsData],
  );
  const allowedDates = useMemo(() => new Set(bookableDateList), [bookableDateList]);
  const focusMonth = useMemo(
    () => initialCalendarMonth(bookableDateList),
    [bookableDateList],
  );

  useEffect(() => {
    if (!open || !slotsData) return;
    const key = date ? formatLocalDate(date) : null;
    if (key && allowedDates.has(key)) return;
    const first = bookableDateList[0];
    setDate(first ? parseIsoDate(first) : undefined);
    if (!first) setTime(null);
  }, [open, slotsData, bookableDateList, allowedDates, date]);

  // ── Derived: mapped slots for the selected day ─────────────────────────────
  // const daySlots = useMemo<MappedSlot[]>(() => {
  //   if (!dateKey || !dayData?.slots[dateKey]) return [];
  //   return mapSlots(dayData.slots[dateKey]);
  // }, [dayData, dateKey]);

  // ── Derived: mapped slots for the selected day ─────────────────────────────
  const daySlots = useMemo<MappedSlot[]>(() => {
    if (!dateKey || !dayData?.slots[dateKey]) return [];
    const mapped = mapSlots(dayData.slots[dateKey]);
    const minutes = kigaliMinutes();
    if (dateKey < todayKey) {
      return mapped.map((s) => ({ ...s, status: "past" }));
    }
    if (dateKey !== todayKey) return mapped;
    return mapped.map((s) => {
      const [hour, minute] = s.rawTime.split(":").map(Number);
      return hour * 60 + (minute || 0) <= minutes ? { ...s, status: "past" } : s;
    });
  }, [dayData, dateKey, todayKey]);

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
      setNeedsAccount(true);
      return;
    }
    const activeRole = (me?.active_role ?? me?.role) as string | undefined;
    if (activeRole && activeRole !== "patient") {
      toast.message(t("header.login_as_patient", { defaultValue: "Log in as patient" }), {
        description: t("header.login_as_patient_hint", {
          defaultValue: "Use Log in as patient next to your profile, then book from Search doctors.",
        }),
      });
      return;
    }

    const consultationType =
      doctor.consultation_type === "in_person" ? "in_person" : "online";

    const slot = daySlots.find((s) => s.time === time);
    const appointmentTime = slot ? toTimeLabel(slot.rawTime) : time;
    const fee = Number(doctor.consultation_fee) || 0;

    try {
      const res = await bookAppointment.mutateAsync({
        doctor_id: doctor.id,
        type: consultationType,
        appointment_date: dateKey,
        appointment_time: appointmentTime,
        ...(fee > 0 ? { amount: fee, fee, consultation_fee: fee } : {}),
      });

      // Invalidate stale queries
      await queryClient.invalidateQueries({ queryKey: ["patient-search-doctors"] });
      await queryClient.invalidateQueries({ queryKey: ["doctor-slots", doctor.slug] });

      // Invalidate cached doctor data so useGetDoctorBySlug re-fetches
      await queryClient.invalidateQueries({ queryKey: ["doctor", doctor.slug] });

      // Enable the doctor re-fetch
      setShouldRefetchDoctor(true);

      setConfirmed({ date: dateKey, time });

      const issuedPassword = (res as { temp_password?: string | null }).temp_password || "";
      const issuedEmail = (res as { account_email?: string | null }).account_email || guestEmail;
      if (issuedPassword) {
        setGuestEmail(issuedEmail);
        setGuestPassword(issuedPassword);
        setGuestAccess({ email: issuedEmail, password: issuedPassword });
      }

      const bookedFee = Number(
        (res as { amount?: number }).amount
        ?? (res as { consultation_fee?: number }).consultation_fee
        ?? (res as { data?: { consultation_fee?: number } }).data?.consultation_fee
        ?? fee,
      ) || 0;
      toast.success(t("booking.doctorAppointment.appointmentBooked"), {
        description: bookedFee > 0
          ? t("booking.doctorAppointment.payToConfirm", "Pay now. The doctor confirms the appointment after payment.")
          : t("booking.doctorAppointment.appointmentBookedDesc", {
            name: doctorName,
            date: moment(dateKey).format("ddd MMM D"),
            time,
          }),
      });
      if (bookedFee > 0) {
        const booked = res as {
          id?: string | number;
          data?: { id?: string | number; appointment?: { id?: string | number } };
          appointment?: { id?: string | number };
        };
        const appointmentId = booked.id ?? booked.data?.id ?? booked.data?.appointment?.id ?? booked.appointment?.id;

        if (!appointmentId) {
          console.error("Booking succeeded but appointment ID is missing from response:", res);
          toast.error(t("booking.doctorAppointment.paymentNotInitiated"), { description: t("booking.doctorAppointment.paymentIdMissingDesc") });
          return;
        }

        try {
          const payRes = await payAppointment.mutateAsync(Number(appointmentId));
          const iremboPay = (window as Window & {
            IremboPay?: {
              initiate?: (options: { publicKey: string; invoiceNumber: string; locale: string; callback: (err: Error | null) => void }) => void;
              closeModal?: () => void;
              locale?: { EN?: string };
            };
          }).IremboPay;
          if (!iremboPay?.initiate) {
            toast.error(t("booking.doctorAppointment.paymentNotInitiated"), { description: t("booking.doctorAppointment.payLaterDesc") });
            openAppointmentDetails(appointmentId);
            return;
          }
          iremboPay.initiate({
            publicKey: payRes.public_key,
            invoiceNumber: payRes.invoice_number,
            locale: iremboPay.locale?.EN || "en",
            callback: (err: Error | null) => {
              iremboPay.closeModal?.();
              if (err) {
                toast.error(t("booking.doctorAppointment.paymentFailed"), { description: t("booking.doctorAppointment.payLaterDesc") });
                openAppointmentDetails(appointmentId);
              } else {
                setVerifyingPayment(true);
                invoicePoller.start(
                  payRes.invoice_number,
                  (result) => {
                    setVerifyingPayment(false);
                    queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
                    if (result?.temp_password) {
                      const email = result.account_email || guestEmail;
                      setGuestEmail(email);
                      setGuestPassword(result.temp_password);
                      setGuestAccess({ email, password: result.temp_password });
                      return;
                    }
                    toast.success(t("booking.doctorAppointment.paymentSuccessful"), {
                      description: result?.account_created
                        ? t("booking.doctorAppointment.accountEmailed", "We emailed a temporary password. Sign in with it to see this appointment. Your doctor keeps these details on your account.")
                        : t("booking.doctorAppointment.paymentSuccessfulDesc"),
                    });
                    onOpenChange(false);
                    navigate("/patient/appointments");
                  },
                  (msg) => {
                    setVerifyingPayment(false);
                    toast.error(t("booking.doctorAppointment.paymentVerificationFailed"), { description: msg });
                  }
                );
              }
            }
          });
        } catch (payErr) {
          console.error("Payment initiation failed:", payErr);
          toast.error(t("booking.doctorAppointment.paymentNotInitiated"), { description: t("booking.doctorAppointment.payLaterDesc") });
          openAppointmentDetails(appointmentId);
        }
      }

    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "";

      // Session expired / not authenticated → go to login.
      if (status === 401 || /unauthor/i.test(msg)) {
        toast.message(t("booking.doctorAppointment.signInToBook"), {
          description: t("booking.doctorAppointment.sessionExpiredDesc"),
        });
        onOpenChange(false);
        goToSignIn(window.location.pathname + window.location.search);
        return;
      }

      // Authenticated but the wrong kind of account (e.g. a doctor).
      if (status === 403) {
        toast.message(t("header.login_as_patient", { defaultValue: "Log in as patient" }), {
          description: t("header.login_as_patient_hint", {
            defaultValue: "Use Log in as patient next to your profile, then book from Search doctors.",
          }),
        });
        return;
      }

      toast.error(t("booking.doctorAppointment.bookingFailed"), {
        description: msg || t("booking.doctorAppointment.tryAgain"),
      });
    }
  };

  const handleCreateAccount = async () => {
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setAccountError(t("booking.doctorAppointment.guestRequired"));
      return;
    }
    setAccountError(null);
    try {
      const guest = await createGuest.mutateAsync({
        name: guestName.trim(),
        phone: guestPhone.trim(),
        country_code: "+250",
      });
      setAuthToken(guest.guest_token);
      let convertedPassword = "";
      try {
        const converted = await convertGuest.mutateAsync({
          guest_token: guest.guest_token,
          name: guestName.trim(),
          phone: guestPhone.trim(),
          country_code: "+250",
          role: "patient",
          email: guestEmail.trim(),
          preferred_language: i18n.language,
        });
        convertedPassword = converted.temp_password || "";
      } catch (error) {
        clearAuthToken();
        throw error;
      }
      setNeedsAccount(false);
      await handleConfirm();
      if (convertedPassword) {
        const email = guestEmail.trim();
        setGuestPassword((current) => current || convertedPassword);
        setGuestAccess((current) => current ?? { email, password: convertedPassword });
      }
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : t("booking.doctorAppointment.guestFailed"));
    }
  };

  const reset = () => {
    setTime(null);
    setConfirmed(null);
    setDate(undefined);
    setShouldRefetchDoctor(false);
    setNeedsAccount(false);
    setAccountError(null);
    queryClient.removeQueries({ queryKey: ["doctor", doctor.slug] });
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const doctorName = doctor.user?.name ?? t("booking.doctorAppointment.unknownDoctor");
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
        {guestAccess && (
          <div className="mx-6 mt-4 rounded-[6px] border border-primary/30 bg-primary/5 p-3 space-y-2">
            <p className="text-sm font-semibold text-foreground">{t("clinical.chart.guest_access_title")}</p>
            <p className="text-xs text-muted-foreground">{t("clinical.chart.guest_access_body")}</p>
            <Input value={guestAccess.email} readOnly />
            <Input data-testid="guest-temp-password" value={guestAccess.password} readOnly />
          </div>
        )}
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
                        ? t("pages.cards.free")
                        : `${doctor.consultation_fee} ${doctor.currency ?? "RWF"}`}
                    </span>
                  </>
                )}
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <Video className="h-4 w-4" /> {t("booking.doctorAppointment.videoConsult")}
                </span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {showLoading && (
          <div className="min-h-0 flex-1 overflow-y-auto flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">{t("booking.doctorAppointment.loadingSlots")}</p>
          </div>
        )}

        {/* Error state */}
        {showError && (
          <div className="min-h-0 flex-1 overflow-y-auto flex flex-col items-center justify-center py-12 gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <p className="text-sm">{t("booking.doctorAppointment.loadError")}</p>
          </div>
        )}

        {/* ── NEW: Confirmed state — shows refreshing indicator while doctor re-fetches ── */}
        {confirmed && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10 text-center space-y-5">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[15px] font-semibold">{t("booking.doctorAppointment.appointmentConfirmed")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("booking.doctorAppointment.confirmedDateTime", {
                  date: moment(confirmed.date).format("dddd, MMMM D, YYYY"),
                  time: confirmed.time,
                })}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2 inline-flex items-center gap-1.5 border border-border/60 rounded-full px-3 py-1">
                <Video className="h-4 w-4" />
                {t("booking.doctorAppointment.videoLinkNotice")}
              </p>

              {/* NEW: subtle "syncing" badge while fresh doctor data loads */}
              {shouldRefetchDoctor && !freshDoctorData && !verifyingPayment && (
                <p className="text-xs text-muted-foreground/50 mt-1 flex items-center justify-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("booking.doctorAppointment.syncingAvailability")}
                </p>
              )}

              {/* Verifying payment */}
              {verifyingPayment && (
                <p className="text-sm text-primary mt-2 flex items-center justify-center gap-1.5 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("booking.doctorAppointment.verifyingPayment")}
                </p>
              )}
            </div>
            <Button onClick={() => onOpenChange(false)} className="px-8">
              {t("booking.doctorAppointment.done")}
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
                  {t("booking.doctorAppointment.selectDate")}
                </p>
                <MiniCalendar
                  selected={date}
                  focusMonth={focusMonth}
                  today={todayKey}
                  onSelect={(d) => {
                    const key = formatLocalDate(d);
                    if (!allowedDates.has(key) || key < todayKey) return;
                    setDate(d);
                    setTime(null);
                  }}
                  allowedDates={allowedDates}
                />
                {bookableDateList.length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t("booking.doctorAppointment.noUpcoming", {
                      defaultValue: "No availability yet. This doctor has not published upcoming openings.",
                    })}
                  </p>
                )}
                {date && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground border border-border/60 rounded-[6px] px-2.5 py-1.5 bg-muted/30">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span className="font-medium text-foreground">{moment(date).format("ddd, MMM D")}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{t("booking.doctorAppointment.daysAvail", { count: slotsData.dates.length })}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="hidden bg-border/60 sm:block" />

              {/* Right — time slots */}
              <div className="px-5 py-5 sm:max-h-[380px] sm:overflow-y-auto">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                  {t("booking.doctorAppointment.selectTimeDuration", { count: daySlots[0]?.duration ?? 30 })}
                </p>

                {dayLoading && dateKey && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-sm">{t("booking.doctorAppointment.loadingSlotsShort")}</p>
                  </div>
                )}

                {dayError && !dayLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="text-sm">{t("booking.doctorAppointment.slotsLoadError")}</p>
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

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-border/60 flex flex-col gap-3 bg-muted/20 flex-shrink-0">
              {needsAccount && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <p className="sm:col-span-2 text-sm text-muted-foreground">
                    {t("booking.doctorAppointment.guestIntro")}
                  </p>
                  <Input data-testid="guest-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder={t("booking.doctorAppointment.guestName")} />
                  <Input data-testid="guest-email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder={t("booking.doctorAppointment.guestEmail")} type="email" />
                  <Input data-testid="guest-phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder={t("booking.doctorAppointment.guestPhone")} />
                  {accountError && <p className="sm:col-span-2 text-sm text-destructive">{accountError}</p>}
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground min-w-0">
                {date && time ? (
                  <span className="font-medium text-foreground truncate">
                    {moment(date).format("ddd, MMM D")} · {time}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">
                    {!date ? t("booking.doctorAppointment.pickDate") : t("booking.doctorAppointment.pickTime")}
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
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  data-testid={needsAccount ? "guest-book-submit" : undefined}
                  disabled={!date || !time || bookAppointment.isPending || createGuest.isPending || convertGuest.isPending}
                  onClick={needsAccount ? handleCreateAccount : handleConfirm}
                  className="h-8 px-5 text-sm rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  {bookAppointment.isPending || createGuest.isPending || convertGuest.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> {t("booking.doctorAppointment.booking")}</>
                    : needsAccount
                      ? t("booking.doctorAppointment.guestBook")
                      : t("booking.doctorAppointment.confirmAppointment")}
                </Button>
              </div>
            </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

