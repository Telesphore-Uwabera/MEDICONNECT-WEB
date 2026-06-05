import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronRight, ChevronLeft, Plus, Trash2, Pill,
  Calendar, Clock, Video, MapPin, Search, Check,
  Loader2, AlertCircle, FileText, Stethoscope, User,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreatePrescription } from "@/hooks/doctor/use-doctor-prescriptions";
import { useGetAppointments, type Appointment } from "@/hooks/doctor/use-doctor-appointment";
// import { useGetAppointments, type Appointment } from "@/hooks/useDoctorAppointments";
// import { useCreatePrescription } from "@/hooks/useDoctorPrescriptions";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface PrescriptionItem {
  medicine_name: string;
  dosage:        string;
  frequency:     string;
  duration:      string;
  quantity:      number;
  instructions:  string;
}

const EMPTY_ITEM: PrescriptionItem = {
  medicine_name: "",
  dosage:        "",
  frequency:     "",
  duration:      "",
  quantity:      1,
  instructions:  "",
};

type Step = "appointment" | "details" | "medications" | "review";

const STEPS: Step[] = ["appointment", "details", "medications", "review"];

const STEP_META: Record<Step, { label: string; icon: React.ReactNode }> = {
  appointment: { label: "Appointment",  icon: <Calendar    className="h-3.5 w-3.5" /> },
  details:     { label: "Rx Details",   icon: <FileText    className="h-3.5 w-3.5" /> },
  medications: { label: "Medications",  icon: <Pill        className="h-3.5 w-3.5" /> },
  review:      { label: "Review",       icon: <ClipboardList className="h-3.5 w-3.5" /> },
};

/* ─────────────────────────────────────────────
   Prop types
───────────────────────────────────────────── */

interface PrescriptionWizardProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  doctorName?:   string;
  issuer?:       string;
}

/* ─────────────────────────────────────────────
   Small UI atoms
───────────────────────────────────────────── */

const inputCls =
  "w-full h-9 rounded-sm border border-border bg-muted/40 text-[12px] px-3 text-foreground " +
  "placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 " +
  "focus:border-primary/50 transition-all";

const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1 block";

function Field({
  label, children, required,
}: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step 1 — Appointment selector
───────────────────────────────────────────── */

function AppointmentStep({
  selected, onSelect,
}: {
  selected: Appointment | null;
  onSelect: (a: Appointment) => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch confirmed & pending appointments only (relevant for prescriptions)
  const { data, isLoading, isError } = useGetAppointments({ upcoming: true });
  const { data: allData, isLoading: allLoading } = useGetAppointments({});

  // Merge upcoming + all so we have a good pool; deduplicate by id
  const rawList: Appointment[] = (() => {
    const map = new Map<number, Appointment>();
    (allData?.data ?? []).forEach((a) => map.set(a.id, a));
    (data?.data ?? []).forEach((a) => map.set(a.id, a));
    return Array.from(map.values());
  })();

  // Filter to statuses that make sense for prescribing
  const eligible = rawList.filter((a) =>
    ["confirmed", "in_progress", "completed", "pending"].includes(a.status)
  );

  const filtered = eligible.filter((a) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      a.patient?.name?.toLowerCase().includes(q) ||
      a.appointment_date.includes(q) ||
      a.status.includes(q)
    );
  });

  const loading = isLoading || allLoading;

  useEffect(() => { inputRef.current?.focus(); }, []);

  const statusColor: Record<string, string> = {
    pending:     "bg-amber-500",
    confirmed:   "bg-sky-500",
    in_progress: "bg-violet-500",
    completed:   "bg-emerald-500",
  };

  const statusLabel: Record<string, string> = {
    pending:     "Pending",
    confirmed:   "Confirmed",
    in_progress: "In progress",
    completed:   "Completed",
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Select the appointment this prescription is linked to.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name or date…"
          className={cn(inputCls, "pl-8")}
        />
      </div>

      {/* List */}
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
        {loading && (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-sm bg-muted/40 animate-pulse border border-border/40" />
          ))
        )}

        {!loading && isError && (
          <div className="flex flex-col items-center py-10 gap-2 text-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <p className="text-[11px] text-muted-foreground">Failed to load appointments</p>
          </div>
        )}

        {!loading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center py-10 gap-2 text-center">
            <Calendar className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-[11px] text-muted-foreground">No eligible appointments found</p>
          </div>
        )}

        {filtered.map((a) => {
          const isSelected = selected?.id === a.id;
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-sm border text-left transition-all duration-150",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/60 bg-card hover:border-primary/30 hover:bg-secondary/20",
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "h-9 w-9 rounded-sm flex items-center justify-center font-bold text-[10px] flex-shrink-0 border",
                isSelected
                  ? "bg-primary/15 text-primary border-primary/20"
                  : "bg-gradient-to-br from-primary/10 to-primary/5 text-primary border-primary/10",
              )}>
                {(a.patient?.name ?? "PT").slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-semibold text-foreground">
                    {a.patient?.name ?? "Patient"}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                    "bg-secondary/60 border border-border/40 text-muted-foreground",
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusColor[a.status] ?? "bg-muted-foreground")} />
                    {statusLabel[a.status] ?? a.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {a.appointment_date}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {a.appointment_time}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {a.type === "online"
                      ? <Video className="h-3 w-3 text-sky-500" />
                      : <MapPin className="h-3 w-3 text-amber-500" />}
                    {a.type === "online" ? "Online" : "In-person"}
                  </span>
                </div>
              </div>

              {/* Check */}
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-all",
                isSelected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border/60 bg-background",
              )}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step 2 — Rx details
───────────────────────────────────────────── */

interface RxDetails {
  diagnosis:   string;
  notes:       string;
  valid_until: string;
}

function DetailsStep({
  values, onChange,
}: {
  values:   RxDetails;
  onChange: (v: Partial<RxDetails>) => void;
}) {
  // Default valid_until to 30 days from today
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 30);
  const defaultDateStr = defaultDate.toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        Enter the clinical details for this prescription.
      </p>

      <Field label="Diagnosis" required>
        <input
          value={values.diagnosis}
          onChange={(e) => onChange({ diagnosis: e.target.value })}
          placeholder="e.g. Upper respiratory tract infection"
          className={inputCls}
        />
      </Field>

      <Field label="Clinical notes">
        <textarea
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="e.g. Take plenty of fluids and rest"
          rows={3}
          className={cn(
            inputCls,
            "h-auto resize-none py-2 leading-relaxed",
          )}
        />
      </Field>

      <Field label="Valid until">
        <input
          type="date"
          value={values.valid_until || defaultDateStr}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => onChange({ valid_until: e.target.value })}
          className={inputCls}
        />
      </Field>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step 3 — Medication items
───────────────────────────────────────────── */

const FREQUENCY_PRESETS = [
  "Once daily",
  "Twice daily",
  "3 times daily",
  "Every 8 hours",
  "Every 12 hours",
  "Every 4–6 hours as needed",
  "At bedtime",
];

const DURATION_PRESETS = [
  "3 days", "5 days", "7 days", "10 days", "14 days", "30 days",
];

function MedicationRow({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  item:     PrescriptionItem;
  index:    number;
  onChange: (i: number, field: keyof PrescriptionItem, value: string | number) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
}) {
  const set = (field: keyof PrescriptionItem) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange(index, field, e.target.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="border border-border/60 rounded-sm bg-card p-3.5 space-y-3"
    >
      {/* Row header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-sm bg-primary/10 flex items-center justify-center">
            <Pill className="h-3 w-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">
            Medication {index + 1}
          </span>
        </div>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="h-6 w-6 flex items-center justify-center rounded-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Name + dosage */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Medicine name" required>
          <input
            value={item.medicine_name}
            onChange={set("medicine_name")}
            placeholder="e.g. Amoxicillin"
            className={inputCls}
          />
        </Field>
        <Field label="Dosage" required>
          <input
            value={item.dosage}
            onChange={set("dosage")}
            placeholder="e.g. 500mg"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Frequency + duration */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Frequency" required>
          <select
            value={FREQUENCY_PRESETS.includes(item.frequency) ? item.frequency : "__custom"}
            onChange={(e) => {
              if (e.target.value !== "__custom") onChange(index, "frequency", e.target.value);
            }}
            className={inputCls}
          >
            <option value="" disabled>Select…</option>
            {FREQUENCY_PRESETS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
            <option value="__custom">Custom…</option>
          </select>
          {(!FREQUENCY_PRESETS.includes(item.frequency) || item.frequency === "") && (
            <input
              value={item.frequency}
              onChange={set("frequency")}
              placeholder="e.g. Every 8 hours"
              className={cn(inputCls, "mt-1.5")}
            />
          )}
        </Field>
        <Field label="Duration" required>
          <select
            value={DURATION_PRESETS.includes(item.duration) ? item.duration : "__custom"}
            onChange={(e) => {
              if (e.target.value !== "__custom") onChange(index, "duration", e.target.value);
            }}
            className={inputCls}
          >
            <option value="" disabled>Select…</option>
            {DURATION_PRESETS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="__custom">Custom…</option>
          </select>
          {(!DURATION_PRESETS.includes(item.duration) || item.duration === "") && (
            <input
              value={item.duration}
              onChange={set("duration")}
              placeholder="e.g. 7 days"
              className={cn(inputCls, "mt-1.5")}
            />
          )}
        </Field>
      </div>

      {/* Quantity + instructions */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Quantity" required>
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onChange(index, "quantity", parseInt(e.target.value) || 1)}
            className={inputCls}
          />
        </Field>
        <Field label="Instructions">
          <input
            value={item.instructions}
            onChange={set("instructions")}
            placeholder="e.g. Take after meals"
            className={inputCls}
          />
        </Field>
      </div>
    </motion.div>
  );
}

function MedicationsStep({
  items,
  onAdd,
  onChange,
  onRemove,
}: {
  items:    PrescriptionItem[];
  onAdd:    () => void;
  onChange: (i: number, field: keyof PrescriptionItem, value: string | number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Add one or more medications to this prescription.
        </p>
        <span className="text-[10px] font-medium text-primary">{items.length} item{items.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <MedicationRow
              key={i}
              item={item}
              index={i}
              onChange={onChange}
              onRemove={onRemove}
              canRemove={items.length > 1}
            />
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={onAdd}
        className="w-full h-9 flex items-center justify-center gap-2 border border-dashed border-primary/40 text-primary text-[11px] font-medium rounded-sm hover:bg-primary/5 hover:border-primary/60 transition-all duration-200"
      >
        <Plus className="h-3.5 w-3.5" />
        Add another medication
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step 4 — Review
───────────────────────────────────────────── */

function ReviewStep({
  appointment,
  details,
  items,
}: {
  appointment: Appointment;
  details:     RxDetails;
  items:       PrescriptionItem[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        Review everything before submitting.
      </p>

      {/* Appointment */}
      <section className="border border-border/60 rounded-sm p-3.5 space-y-2 bg-secondary/20">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
          <User className="h-3 w-3" /> Patient & appointment
        </p>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/10">
            {(appointment.patient?.name ?? "PT").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">{appointment.patient?.name ?? "Patient"}</p>
            <p className="text-[10px] text-muted-foreground">
              {appointment.appointment_date} · {appointment.appointment_time} ·{" "}
              {appointment.type === "online" ? "Online" : "In-person"}
            </p>
          </div>
        </div>
      </section>

      {/* Diagnosis */}
      <section className="border border-border/60 rounded-sm p-3.5 space-y-2 bg-secondary/20">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
          <Stethoscope className="h-3 w-3" /> Diagnosis & notes
        </p>
        <p className="text-[12px] font-semibold text-foreground">{details.diagnosis}</p>
        {details.notes && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">{details.notes}</p>
        )}
        {details.valid_until && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Valid until {details.valid_until}
          </p>
        )}
      </section>

      {/* Medications */}
      <section className="border border-border/60 rounded-sm p-3.5 space-y-2.5 bg-secondary/20">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
          <Pill className="h-3 w-3" /> Medications ({items.length})
        </p>
        {items.map((m, i) => (
          <div key={i} className="flex items-start gap-2.5 border-t border-border/40 pt-2 first:border-t-0 first:pt-0">
            <div className="h-6 w-6 rounded-sm bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0 border border-primary/10 mt-0.5">
              {i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-foreground">{m.medicine_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {m.dosage} · {m.frequency} · {m.duration} · Qty: {m.quantity}
              </p>
              {m.instructions && (
                <p className="text-[10px] text-muted-foreground/70 italic mt-0.5">{m.instructions}</p>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Wizard shell
───────────────────────────────────────────── */

export function PrescriptionWizard({
  open, onOpenChange, doctorName,
}: PrescriptionWizardProps) {
  const [step,        setStep]        = useState<Step>("appointment");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [details,     setDetails]     = useState<RxDetails>({
    diagnosis:   "",
    notes:       "",
    valid_until: "",
  });
  const [items, setItems] = useState<PrescriptionItem[]>([{ ...EMPTY_ITEM }]);

  const createPrescription = useCreatePrescription();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("appointment");
        setAppointment(null);
        setDetails({ diagnosis: "", notes: "", valid_until: "" });
        setItems([{ ...EMPTY_ITEM }]);
      }, 300);
    }
  }, [open]);

  const stepIndex = STEPS.indexOf(step);

  // ── Validation per step ───────────────────────────────────────────────────
  const canAdvance = useCallback((): boolean => {
    if (step === "appointment") return !!appointment;
    if (step === "details")     return !!details.diagnosis.trim();
    if (step === "medications") {
      return items.every(
        (m) =>
          m.medicine_name.trim() &&
          m.dosage.trim() &&
          m.frequency.trim() &&
          m.duration.trim() &&
          m.quantity > 0,
      );
    }
    return true;
  }, [step, appointment, details, items]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    if (!canAdvance()) {
      toast.error("Please fill in all required fields before continuing.");
      return;
    }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  // ── Items helpers ─────────────────────────────────────────────────────────
  const addItem    = ()                    => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (i: number)           => setItems((p) => p.filter((_, idx) => idx !== i));
  const changeItem = (
    i: number, field: keyof PrescriptionItem, value: string | number,
  ) =>
    setItems((p) =>
      p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)),
    );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!appointment) return;

    const payload = {
      appointment_id: appointment.id,
      diagnosis:      details.diagnosis,
      notes:          details.notes || undefined,
      valid_until:    details.valid_until || undefined,
      items:          items.map((m) => ({
        medicine_name: m.medicine_name,
        dosage:        m.dosage,
        frequency:     m.frequency,
        duration:      m.duration,
        quantity:      m.quantity,
        instructions:  m.instructions || undefined,
      })),
    };

    createPrescription.mutate(payload, {
      onSuccess: (res) => {
        toast.success(
          (res as any)?.message ?? "Prescription created successfully",
        );
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast.error(err?.message ?? "Failed to create prescription");
      },
    });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{   opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-sm shadow-2xl flex flex-col max-h-[90dvh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/15">
                <FileText className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">New Prescription</p>
                {doctorName && (
                  <p className="text-[10px] text-muted-foreground">{doctorName}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 flex items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-0 px-5 py-3 border-b border-border/60 shrink-0 bg-secondary/20">
            {STEPS.map((s, i) => {
              const isDone    = i < stepIndex;
              const isCurrent = s === step;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all duration-200",
                      isDone    ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border/50 text-muted-foreground/50",
                    )}>
                      {isDone ? <Check className="h-2.5 w-2.5" /> : i + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium hidden sm:inline",
                      isCurrent ? "text-foreground" : isDone ? "text-primary" : "text-muted-foreground/50",
                    )}>
                      {STEP_META[s].label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-px mx-2 transition-colors duration-200",
                      isDone ? "bg-primary/40" : "bg-border/50",
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0  }}
                exit={{   opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
              >
                {step === "appointment" && (
                  <AppointmentStep
                    selected={appointment}
                    onSelect={setAppointment}
                  />
                )}
                {step === "details" && (
                  <DetailsStep
                    values={details}
                    onChange={(v) => setDetails((p) => ({ ...p, ...v }))}
                  />
                )}
                {step === "medications" && (
                  <MedicationsStep
                    items={items}
                    onAdd={addItem}
                    onChange={changeItem}
                    onRemove={removeItem}
                  />
                )}
                {step === "review" && appointment && (
                  <ReviewStep
                    appointment={appointment}
                    details={details}
                    items={items}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/60 shrink-0 bg-card">
            <button
              onClick={goBack}
              disabled={stepIndex === 0}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-medium border transition-all duration-200",
                stepIndex === 0
                  ? "opacity-0 pointer-events-none border-transparent"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    s === step
                      ? "w-4 bg-primary"
                      : i < stepIndex
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-border/60",
                  )}
                />
              ))}
            </div>

            {step === "review" ? (
              <button
                onClick={handleSubmit}
                disabled={createPrescription.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-sm text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {createPrescription.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {createPrescription.isPending ? "Creating…" : "Create Prescription"}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canAdvance()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-sm text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Continue
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default PrescriptionWizard;
