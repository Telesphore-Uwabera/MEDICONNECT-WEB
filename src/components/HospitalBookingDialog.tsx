import { useState, useMemo, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetOverlay,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Users2,
  MapPin,
  Stethoscope,
  CalendarDays,
  Loader2,
  Building2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMe } from "@/hooks/useAuth";
import { useGoToRole } from "@/hooks/useRoleManagement";
import {
  useHospitalDetail,
  useCreateBooking,
  buildWeekSchedule,
  buildDateSlots,
  buildTimeSlots,
  type BookingPayload,
  type Department,
  type HospitalService,
} from "@/hooks/hospital/use-hospital-booking";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface HospitalBasic {
  id: number | string;
  slug?: string;
  name_en: string;
  city?: string | null;
  logo?: string | null;
}

interface BookingConfirmed {
  date: string;
  time: string;
  serviceName: string;
  departmentName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const HospitalBookingDialog = ({
  hospital,
  open,
  onOpenChange,
}: {
  hospital: HospitalBasic;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language === "fr" ? fr : undefined;

  const { data: detail, isLoading } = useHospitalDetail(
    open ? hospital.slug : undefined
  );

  const createBooking = useCreateBooking();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { go: goToRole } = useGoToRole();
  // Resume the booking after a stay-and-switch to patient.
  const [resumeBooking, setResumeBooking] = useState(false);
  // Inline "switch to patient" prompt (a toast button is unclickable behind the
  // modal sheet, so we show it inside the dialog). Holds the current role.
  const [switchPrompt, setSwitchPrompt] = useState<string | null>(null);
  useEffect(() => {
    if (!resumeBooking) return;
    if ((me?.active_role ?? me?.role) === "patient") {
      setResumeBooking(false);
      handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeBooking, me]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState<BookingConfirmed | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────────

  const departments = useMemo<Department[]>(
    () => (detail?.departments ?? []).filter((d) => d.is_active !== false),
    [detail]
  );

  /**
   * Services are nested inside each department in the API response:
   *   detail.departments[n].services[]
   *
   * Find the selected department first, then read its services array.
   * This fixes: "Property 'services' does not exist on type 'Department[]'"
   */
  const filteredServices = useMemo<HospitalService[]>(() => {
    if (!selectedDepartment) return [];
    const dept = departments.find((d) => String(d.id) === selectedDepartment);
    return (dept?.services ?? []).filter((s) => s.is_active !== false);
  }, [departments, selectedDepartment]);

  /**
   * weekSchedule uses detail.working_days (the correct API key).
   * This fixes: "Property 'working_days' does not exist on type 'HospitalDetail'"
   */
  const weekSchedule = useMemo(
    () => buildWeekSchedule(detail?.working_days ?? []),
    [detail]
  );

  /**
   * dateSlots — only upcoming open days within the next 14 days.
   * Falls back to detail.opens_at / closes_at when a day row has null times.
   */
  const dateSlots = useMemo(
    () =>
      buildDateSlots(
        detail?.working_days ?? [],
        detail?.opens_at,
        detail?.closes_at
      ),
    [detail]
  );

  const activeDateSlot = useMemo(
    () => dateSlots.find((s) => s.date === selectedDate) ?? null,
    [dateSlots, selectedDate]
  );

  const timeSlots = useMemo(
    () =>
      activeDateSlot
        ? buildTimeSlots(activeDateSlot.openTime, activeDateSlot.closeTime)
        : [],
    [activeDateSlot]
  );

  const chosenDepartment = useMemo(
    () => departments.find((d) => String(d.id) === selectedDepartment) ?? null,
    [departments, selectedDepartment]
  );

  const chosenService = useMemo(
    () => filteredServices.find((s) => String(s.id) === selectedService) ?? null,
    [filteredServices, selectedService]
  );

  const canConfirm =
    !!selectedDate && !!selectedTime && !!chosenDepartment && !!chosenService;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const hasAnyOpenDay = weekSchedule.some((d) => !d.is_closed && d.is_active);

  const handleDepartmentChange = (val: string) => {
    setSelectedDepartment(val);
    setSelectedService("");
  };

  const handleConfirm = () => {
    if (!canConfirm || !chosenService || !chosenDepartment) return;

    // ── Gate: only a signed-in patient can book ──────────────────────────────
    const token = localStorage.getItem("auth_token");
    if (!token) {
      // Not signed in → send to login instead of failing with "not authenticated".
      toast.message(t("booking.doctorAppointment.signInToBook"), {
        description: t("booking.hospitalAppointment.signInDesc"),
      });
      onOpenChange(false);
      navigate("/auth", { state: { from: window.location.pathname + window.location.search } });
      return;
    }
    const activeRole = (me?.active_role ?? me?.role) as string | undefined;
    if (activeRole && activeRole !== "patient") {
      setSwitchPrompt(activeRole);
      return;
    }

    const payload: BookingPayload = {
      hospital_id: hospital.id,
      hospital_service_id: chosenService.id,
      department_id: chosenDepartment.id,
      preferred_date: selectedDate!,
      preferred_time: selectedTime,
      notes: notes || undefined,
    };

    createBooking.mutate(payload, {
      onSuccess: () => {
        setConfirmed({
          date: selectedDate!,
          time: selectedTime,
          serviceName: chosenService.name_en,
          departmentName: chosenDepartment.name_en,
        });
        toast.success(t("booking.hospitalAppointment.bookingConfirmed"), {
          description: t("booking.hospitalAppointment.bookingConfirmedDesc", {
            hospital: hospital.name_en,
            service: chosenService.name_en,
            date: selectedDate,
            time: selectedTime,
          }),
        });
      },
      onError: (err: Error) => {
        const status = (err as { status?: number })?.status;
        const msg = err?.message ?? "";

        // Session expired / not authenticated → go to login.
        if (status === 401 || /unauthor|not authenticated/i.test(msg)) {
          toast.message(t("booking.doctorAppointment.signInToBook"), {
            description: t("booking.doctorAppointment.sessionExpiredDesc"),
          });
          onOpenChange(false);
          navigate("/auth", { state: { from: window.location.pathname + window.location.search } });
          return;
        }

        // Authenticated but the wrong kind of account.
        if (status === 403) {
          setSwitchPrompt((me?.active_role ?? me?.role ?? "another role") as string);
          return;
        }

        toast.error(t("booking.doctorAppointment.bookingFailed"), { description: msg || t("booking.doctorAppointment.tryAgain") });
      },
    });
  };

  const reset = () => {
    setSelectedDate(null);
    setSelectedTime("");
    setSelectedDepartment("");
    setSelectedService("");
    setNotes("");
    setConfirmed(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <SheetOverlay className="bg-background/70 backdrop-blur-[2px]" />
      <SheetContent
        side="right"
        className="w-full sm:max-w-[680px] flex flex-col gap-0 p-0 bg-background border-l border-border"
      >
        {/* ── Header ── */}
        <SheetHeader className="px-4 sm:px-5 py-4 border-b border-border bg-card/95 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-[6px] flex items-center justify-center bg-primary/10 text-primary font-bold text-[11px] shrink-0 border border-primary/15 overflow-hidden">
              {hospital.logo ? (
                <img
                  src={hospital.logo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                hospital.name_en.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[13px] font-semibold text-foreground leading-tight">
                {t("booking.title")}
              </SheetTitle>
              <SheetDescription className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {hospital.name_en}
                {hospital.city ? ` · ${hospital.city}` : ""}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-[11px]">{t("booking.hospitalAppointment.loadingDetails")}</p>
            </div>
          )}

          {/* Success state */}
          {!isLoading && confirmed && (
            <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Check className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {t("booking.spotReserved")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {hospital.name_en}
                  <br />
                  {t("booking.doctorAppointment.confirmedDateTime", {
                    date: format(parseISO(confirmed.date), "EEEE, MMMM d, yyyy", { locale: dateFnsLocale }),
                    time: confirmed.time,
                  })}
                  <br />
                  <span className="inline-flex items-center gap-1 mt-1 text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {confirmed.departmentName}
                  </span>
                  <br />
                  <span className="inline-flex items-center gap-1 text-foreground font-medium">
                    <Stethoscope className="h-3 w-3" />
                    {confirmed.serviceName}
                  </span>
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 px-5 text-[11px] font-semibold rounded-[6px] mt-2"
              >
                {t("booking.doctorAppointment.done")}
              </Button>
            </div>
          )}

          {/* Form */}
          {!isLoading && !confirmed && (
            <div className="px-4 sm:px-5 py-4 space-y-4">

              {/* ── Weekly schedule overview ── */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <CalendarDays className="h-2.5 w-2.5" /> {t("booking.hospitalAppointment.workingDays")}
                </p>

                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-7">
                  {weekSchedule.map((day) => {
                    const isOpen = !day.is_closed && day.is_active;
                    return (
                      <div
                        key={day.dayName}
                        className={cn(
                          "flex flex-col items-center rounded-[6px] py-2 px-0.5 border text-center",
                          isOpen
                            ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                            : "border-border bg-muted/30 opacity-50"
                        )}
                      >
                        <span
                          className={cn(
                            "text-[9px] font-semibold uppercase tracking-wider",
                            isOpen
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {day.shortName}
                        </span>
                        <span
                          className={cn(
                            "mt-1 text-[8px]",
                            isOpen
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground/50"
                          )}
                        >
                          {isOpen ? t("pages.landing.open") : t("pages.cards.closed")}
                        </span>
                        {isOpen && day.openTime && day.closeTime && (
                          <span className="mt-0.5 text-[7px] text-muted-foreground leading-tight">
                            {day.openTime}–{day.closeTime}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!hasAnyOpenDay && (
                  <p className="mt-2 text-[10px] text-muted-foreground text-center py-1">
                    {t("booking.hospitalAppointment.noOpenDays")}
                  </p>
                )}
              </div>

              {/* ── Selectable date cards (next 14 days, open days only) ── */}
              {hasAnyOpenDay && (
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <Clock className="h-2.5 w-2.5" /> {t("booking.hospitalAppointment.selectADate")}
                  </p>

                  {dateSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center gap-2 border border-dashed border-border rounded-[6px]">
                      <CalendarDays className="h-5 w-5 text-muted-foreground/30" />
                      <p className="text-[10px] text-muted-foreground">
                        {t("booking.hospitalAppointment.noOpenDatesSoon")}
                      </p>
                    </div>
                  ) : (
                    <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-2 xl:grid-cols-3">
                      {dateSlots.map((slot) => (
                        <button
                          key={slot.date}
                          onClick={() => {
                            setSelectedDate(slot.date);
                            setSelectedTime("");
                          }}
                          className={cn(
                            "rounded-[6px] border p-2 text-left transition-all duration-150",
                            selectedDate === slot.date
                              ? "border-primary ring-1 ring-primary/30 bg-primary/5 dark:bg-primary/10"
                              : "border-border hover:border-primary/60 hover:bg-muted/40"
                          )}
                        >
                          <div className="text-[8px] uppercase font-semibold tracking-wider text-muted-foreground">
                            {format(slot.displayDate, "EEE", { locale: dateFnsLocale })}
                          </div>
                          <div className="text-[12px] font-bold text-foreground leading-tight mt-0.5">
                            {format(slot.displayDate, "d")}
                            <span className="text-[9px] font-medium text-muted-foreground ml-0.5">
                              {format(slot.displayDate, "MMM", { locale: dateFnsLocale })}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-0.5 text-[9px] text-muted-foreground">
                            <Users2 className="h-2.5 w-2.5 shrink-0" />
                            {slot.openTime}–{slot.closeTime}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Time slots ── */}
              {selectedDate && timeSlots.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    {t("booking.hospitalAppointment.preferredTime")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {timeSlots.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={cn(
                          "rounded-[6px] border py-1.5 text-[10px] font-semibold transition-all",
                          selectedTime === t
                            ? "border-primary bg-primary/5 text-primary dark:bg-primary/10"
                            : "border-border hover:border-primary/60 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Department dropdown ── */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="department"
                  className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
                >
                  <Building2 className="h-2.5 w-2.5" />
                  {t("booking.hospitalAppointment.department")} <span className="text-destructive">*</span>
                </Label>
                {departments.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-1">
                    {t("booking.hospitalAppointment.noDepartments")}
                  </p>
                ) : (
                  <Select
                    value={selectedDepartment}
                    onValueChange={handleDepartmentChange}
                  >
                    <SelectTrigger
                      id="department"
                      className="h-8 text-[11px] rounded-[6px] border-border bg-background focus:ring-1 focus:ring-primary/30"
                    >
                      <SelectValue placeholder={t("booking.hospitalAppointment.selectDepartmentPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="text-[11px]">
                      {departments.map((d) => (
                        <SelectItem
                          key={d.id}
                          value={String(d.id)}
                          className="text-[11px]"
                        >
                          {d.name_en}
                          {d.floor ? (
                            <span className="text-muted-foreground">
                              {" "}· {d.floor}
                            </span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* ── Service dropdown (filtered by selected department's nested services) ── */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="service"
                  className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
                >
                  <Stethoscope className="h-2.5 w-2.5" />
                  {t("booking.hospitalAppointment.service")} <span className="text-destructive">*</span>
                </Label>

                {!selectedDepartment ? (
                  <p className="text-[10px] text-muted-foreground/60 py-1 italic">
                    {t("booking.hospitalAppointment.selectDepartmentFirst")}
                  </p>
                ) : filteredServices.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-1">
                    {t("booking.hospitalAppointment.noServicesForDept")}
                  </p>
                ) : (
                  <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                  >
                    <SelectTrigger
                      id="service"
                      className="h-8 text-[11px] rounded-[6px] border-border bg-background focus:ring-1 focus:ring-primary/30"
                    >
                      <SelectValue placeholder={t("booking.hospitalAppointment.selectServicePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="text-[11px]">
                      {filteredServices.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={String(s.id)}
                          className="text-[11px]"
                        >
                          <span className="font-medium">{s.name_en}</span>
                          {/* {s.price ? (
                            <span className="text-muted-foreground">
                              {" "}· {Number(s.price).toLocaleString()}{" "}
                              {s.currency ?? ""}
                            </span>
                          ) : null} */}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* ── Notes ── */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="notes"
                  className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {t("booking.hospitalAppointment.notes")}
                  <span className="normal-case tracking-normal font-normal ml-1 text-muted-foreground/60">
                    ({t("common.optional")})
                  </span>
                </Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("booking.hospitalAppointment.notesPlaceholder")}
                  className="h-8 text-[11px] rounded-[6px] border-border bg-background placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>

              {/* ── Summary chip ── */}
              {selectedDate && selectedTime && chosenDepartment && chosenService && (
                <div className="rounded-[6px] border border-primary/20 bg-primary/5 dark:bg-primary/10 px-3 py-2.5 flex items-start gap-2">
                  <div className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-foreground truncate">
                      {chosenService.name_en}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      <span className="inline-flex items-center gap-0.5">
                        <Building2 className="h-2.5 w-2.5" />
                        {chosenDepartment.name_en}
                      </span>
                      {" · "}
                      {t("booking.doctorAppointment.confirmedDateTime", {
                        date: format(parseISO(selectedDate), "EEEE, MMMM d, yyyy", { locale: dateFnsLocale }),
                        time: selectedTime,
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Switch-to-patient prompt (inline, so it's clickable over the sheet) ── */}
        {!confirmed && !isLoading && switchPrompt && (
          <div className="px-4 sm:px-5 py-3 border-t border-amber-400/30 bg-amber-500/10 shrink-0">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground">
                  {t("booking.doctorAppointment.switchToPatientTitle")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("booking.hospitalAppointment.switchToPatientDesc", { role: switchPrompt })}
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
                {t("booking.doctorAppointment.switchToPatient")}
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {!confirmed && !isLoading && (
          <SheetFooter className="px-4 sm:px-5 py-3.5 border-t border-border bg-card/95 backdrop-blur shrink-0 flex items-center justify-between sm:justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-4 text-[10px] font-medium rounded-[6px]"
            >
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              disabled={!canConfirm || createBooking.isPending}
              onClick={handleConfirm}
              className="h-8 px-4 text-[10px] font-semibold rounded-[6px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5"
            >
              {createBooking.isPending && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {t("booking.confirmBooking")}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};
