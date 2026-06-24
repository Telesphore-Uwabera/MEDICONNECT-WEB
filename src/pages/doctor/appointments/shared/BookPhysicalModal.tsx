import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X, Search, Loader2, Building2, MapPin, CalendarDays, Clock, Users2, Stethoscope, Check,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { prepareRichTextForSave, RichTextarea } from "@/components/ui/rich-textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetSearchHospitals, type ApiHospital } from "@/hooks/patient/use-patient-search-hospital";
import {
  useHospitalDetail,
  buildWeekSchedule,
  buildDateSlots,
  buildTimeSlots,
  type Department,
  type HospitalService,
} from "@/hooks/hospital/use-hospital-booking";
import {
  checkServiceBookingAvailability,
  useCreateServiceBooking,
} from "@/hooks/doctor/use-doctor-service-booking";
import type { ApiError } from "@/lib/Api";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Patient's user id (required by the booking API). */
  patientId: number | null;
  patientName?: string;
  patientPhone?: string;
  /** Consultation notes carried over from the call (prefilled, editable). */
  defaultNotes?: string;
  /** Complete the consult without booking a physical visit. */
  onSkip: () => void;
  /** A booking was created — complete the consult. */
  onBooked: () => void;
}

export function BookPhysicalModal({
  open,
  onClose,
  patientId,
  patientName,
  patientPhone,
  defaultNotes,
  onSkip,
  onBooked,
}: Props) {
  const { t } = useTranslation();
  const [hospitalQuery, setHospitalQuery] = useState("");
  const debouncedQuery = useDebounce(hospitalQuery, 350);
  const [hospital, setHospital] = useState<ApiHospital | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [notes, setNotes] = useState(defaultNotes ?? "");
  const [manualPatientId, setManualPatientId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createBooking = useCreateServiceBooking();

  // Search hospitals (paused once one is selected).
  const { data: searchData, isLoading: searching } = useGetSearchHospitals(
    hospital ? {} : { q: debouncedQuery },
  );
  const hospitals: ApiHospital[] = (searchData as any)?.data ?? [];

  // Hospital detail → departments (with nested services) + working days.
  const { data: detail, isLoading: loadingDetail } = useHospitalDetail(hospital?.slug);

  const departments = useMemo<Department[]>(
    () => (detail?.departments ?? []).filter((d) => d.is_active !== false),
    [detail],
  );
  const filteredServices = useMemo<HospitalService[]>(() => {
    if (!selectedDepartment) return [];
    const dept = departments.find((d) => String(d.id) === selectedDepartment);
    return (dept?.services ?? []).filter((s) => s.is_active !== false);
  }, [departments, selectedDepartment]);

  const weekSchedule = useMemo(() => buildWeekSchedule(detail?.working_days ?? []), [detail]);
  const dateSlots = useMemo(
    () => buildDateSlots(detail?.working_days ?? [], detail?.opens_at, detail?.closes_at),
    [detail],
  );
  const activeDateSlot = useMemo(
    () => dateSlots.find((s) => s.date === selectedDate) ?? null,
    [dateSlots, selectedDate],
  );
  const timeSlots = useMemo(
    () => (activeDateSlot ? buildTimeSlots(activeDateSlot.openTime, activeDateSlot.closeTime) : []),
    [activeDateSlot],
  );
  const hasAnyOpenDay = weekSchedule.some((d) => !d.is_closed && d.is_active);

  const chosenDepartment = departments.find((d) => String(d.id) === selectedDepartment) ?? null;
  const chosenService = filteredServices.find((s) => String(s.id) === selectedService) ?? null;
  const effectivePatientId = patientId ?? (manualPatientId ? Number(manualPatientId) : null);

  const canSubmit =
    !!hospital &&
    !!chosenDepartment &&
    !!chosenService &&
    !!selectedDate &&
    !!selectedTime &&
    !!effectivePatientId &&
    !submitting;

  if (!open) return null;

  const pickHospital = (h: ApiHospital) => {
    setHospital(h);
    setSelectedDate(null);
    setSelectedTime("");
    setSelectedDepartment("");
    setSelectedService("");
  };

  const handleBook = async () => {
    if (!canSubmit || !hospital || !chosenDepartment || !chosenService || !effectivePatientId) return;
    setSubmitting(true);
    try {
      const avail = await checkServiceBookingAvailability({
        hospital_id: Number(hospital.id),
        hospital_service_id: Number(chosenService.id),
        preferred_date: selectedDate!,
        preferred_time: selectedTime,
      });
      if (!avail.available) {
        toast.error(avail.reason || t("consult.booking.slot_unavailable"));
        setSubmitting(false);
        return;
      }
      createBooking.mutate(
        {
          patient_id: effectivePatientId,
          hospital_id: Number(hospital.id),
          hospital_service_id: Number(chosenService.id),
          department_id: Number(chosenDepartment.id),
          preferred_date: selectedDate!,
          preferred_time: selectedTime,
          notes: prepareRichTextForSave(notes),
        },
        {
          onSuccess: () => {
            toast.success(t("consult.booking.booked"));
            onBooked();
          },
          onError: (err) => {
            const e = err as ApiError;
            if (e?.status === 409) toast.error(t("consult.booking.duplicate"));
            else if (e?.status === 422) toast.error(e.message || t("consult.booking.slot_unavailable"));
            else toast.error(e?.message || t("consult.booking.create_failed"));
            setSubmitting(false);
          },
        },
      );
    } catch {
      toast.error(t("consult.booking.verify_failed"));
      setSubmitting(false);
    }
  };

  const selectCls =
    "w-full h-9 px-3 rounded-[5px] border border-border bg-background text-[12px] text-foreground outline-none focus:border-primary/50 transition-colors appearance-none";
  const sectionLabel =
    "text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-[6px] bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-foreground">{t("consult.booking.title")}</h2>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                {hospital ? (
                  <>
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {hospital.name_en}
                    {hospital.city ? ` · ${hospital.city}` : ""}
                  </>
                ) : (
                  <>{t("consult.booking.for_patient", { name: patientName || t("consult.bookings.patient") })}{patientPhone ? ` · ${patientPhone}` : ""}</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Patient id fallback */}
          {patientId == null && (
            <div className="space-y-1.5">
              <p className={sectionLabel}>{t("consult.booking.patient_id")}</p>
              <input
                type="number"
                value={manualPatientId}
                onChange={(e) => setManualPatientId(e.target.value)}
                placeholder={t("consult.booking.patient_id_placeholder")}
                className={selectCls}
              />
              <p className="text-[9px] text-muted-foreground/70">
                {t("consult.booking.patient_id_hint")}
              </p>
            </div>
          )}

          {/* Hospital pick / search */}
          {!hospital ? (
            <div className="space-y-2">
              <p className={sectionLabel}><Building2 className="h-2.5 w-2.5" /> {t("consult.booking.hospital")}</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={hospitalQuery}
                  onChange={(e) => setHospitalQuery(e.target.value)}
                  placeholder={t("consult.booking.search_hospitals")}
                  className={cn(selectCls, "pl-8")}
                />
              </div>
              {debouncedQuery.trim().length >= 2 && (
                <div className="border border-border rounded-[5px] divide-y divide-border max-h-44 overflow-y-auto">
                  {searching && (
                    <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("consult.booking.searching")}
                    </div>
                  )}
                  {!searching && hospitals.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground">{t("consult.booking.no_hospitals")}</div>
                  )}
                  {!searching &&
                    hospitals.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => pickHospital(h)}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                      >
                        <p className="text-[12px] font-medium text-foreground">{h.name_en}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {[h.type, h.city].filter(Boolean).join(" · ")}
                        </p>
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 px-3 h-10 rounded-[5px] border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-[12px] font-medium text-foreground truncate">{hospital.name_en}</span>
                </div>
                <button
                  onClick={() => setHospital(null)}
                  className="text-[10px] text-primary hover:underline shrink-0"
                >
                  {t("consult.booking.change")}
                </button>
              </div>

              {loadingDetail && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-[11px]">{t("consult.booking.loading_details")}</span>
                </div>
              )}

              {!loadingDetail && (
                <>
                  {/* Select a date */}
                  {hasAnyOpenDay && (
                    <div>
                      <p className={sectionLabel}><Clock className="h-2.5 w-2.5" /> {t("consult.booking.select_date")}</p>
                      {dateSlots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center gap-2 border border-dashed border-border rounded-[5px]">
                          <CalendarDays className="h-5 w-5 text-muted-foreground/30" />
                          <p className="text-[10px] text-muted-foreground">{t("consult.booking.no_open_dates")}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                          {dateSlots.map((slot) => (
                            <button
                              key={slot.date}
                              onClick={() => {
                                setSelectedDate(slot.date);
                                setSelectedTime("");
                              }}
                              className={cn(
                                "rounded-[5px] border p-2 text-left transition-all",
                                selectedDate === slot.date
                                  ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                                  : "border-border hover:border-primary/60 hover:bg-muted/40",
                              )}
                            >
                              <div className="text-[8px] uppercase font-semibold tracking-wider text-muted-foreground">
                                {format(slot.displayDate, "EEE")}
                              </div>
                              <div className="text-[12px] font-bold text-foreground leading-tight mt-0.5">
                                {format(slot.displayDate, "d")}
                                <span className="text-[9px] font-medium text-muted-foreground ml-0.5">
                                  {format(slot.displayDate, "MMM")}
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

                  {/* Preferred time */}
                  {selectedDate && timeSlots.length > 0 && (
                    <div>
                      <p className={sectionLabel}>{t("consult.booking.preferred_time")} <span className="text-destructive">*</span></p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {timeSlots.map((t) => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={cn(
                              "rounded-[5px] border py-1.5 text-[10px] font-semibold transition-all",
                              selectedTime === t
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-primary/60 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Department */}
                  <div>
                    <p className={sectionLabel}><Building2 className="h-2.5 w-2.5" /> {t("consult.booking.department")} <span className="text-destructive">*</span></p>
                    {departments.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground py-1">{t("consult.booking.no_departments")}</p>
                    ) : (
                      <select
                        value={selectedDepartment}
                        onChange={(e) => {
                          setSelectedDepartment(e.target.value);
                          setSelectedService("");
                        }}
                        className={selectCls}
                      >
                        <option value="">{t("consult.booking.select_department")}</option>
                        {departments.map((d) => (
                          <option key={d.id} value={String(d.id)}>{d.name_en}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Service */}
                  <div>
                    <p className={sectionLabel}><Stethoscope className="h-2.5 w-2.5" /> {t("consult.booking.service")} <span className="text-destructive">*</span></p>
                    {!selectedDepartment ? (
                      <p className="text-[10px] text-muted-foreground/60 py-1 italic">{t("consult.booking.select_department_first")}</p>
                    ) : filteredServices.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground py-1">{t("consult.booking.no_services")}</p>
                    ) : (
                      <select
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className={selectCls}
                      >
                        <option value="">{t("consult.booking.select_service")}</option>
                        {filteredServices.map((s) => (
                          <option key={s.id} value={String(s.id)}>{s.name_en}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Notes (prefilled from the call) */}
          <div>
            <p className={sectionLabel}>{t("consult.booking.notes")} <span className="text-muted-foreground/50 normal-case tracking-normal">({t("consult.booking.optional")})</span></p>
            <RichTextarea
              value={notes}
              onChange={setNotes}
              placeholder={t("consult.booking.notes_placeholder")}
              minHeight={130}
              editorClassName="text-[12px]"
            />
          </div>

          {/* Summary */}
          {hospital && selectedDate && selectedTime && chosenDepartment && chosenService && (
            <div className="rounded-[5px] border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
              <div className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-2.5 w-2.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-foreground truncate">{chosenService.name_en}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {chosenDepartment.name_en} · {format(parseISO(selectedDate), "EEE, MMM d")} at {selectedTime}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border bg-muted/20 shrink-0">
          <button
            onClick={onSkip}
            className="h-9 px-3 rounded-[5px] text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {t("consult.booking.skip_complete")}
          </button>
          <button
            onClick={handleBook}
            disabled={!canSubmit}
            className="h-9 px-4 rounded-[5px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("consult.booking.book_complete")}
          </button>
        </div>
      </div>
    </div>
  );
}
