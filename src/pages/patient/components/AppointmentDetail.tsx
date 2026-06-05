import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetPatientAppointment, ApiAppointmentStatus } from "@/hooks/patient/use-patient-appointment";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Video, MapPin, Calendar, Clock, CreditCard,
  Shield, User, Building2, FileText, Phone, Mail,
  Globe, Star, ExternalLink, Copy, Check, AlertCircle, X,
} from "lucide-react";
import { useState, useEffect } from "react";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ApiAppointmentStatus, string> = {
  pending:     "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  confirmed:   "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  in_progress: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<ApiAppointmentStatus, string> = {
  pending:     "bg-amber-500",
  confirmed:   "bg-sky-500",
  in_progress: "bg-violet-500 animate-pulse",
  completed:   "bg-emerald-500",
  cancelled:   "bg-red-500",
};

const STATUS_LABEL: Record<ApiAppointmentStatus, string> = {
  pending:     "Pending",
  confirmed:   "Confirmed",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str: string) {
  try { return format(parseISO(str), "EEEE, MMMM dd, yyyy"); }
  catch { return str; }
}

function formatTime(str: string) {
  try {
    const t = str.length <= 8 ? `2000-01-01T${str}` : str;
    return format(parseISO(t), "hh:mm a");
  } catch { return str; }
}

function formatCurrency(amount: string, currency: string) {
  const n = parseFloat(amount);
  if (isNaN(n)) return `${amount} ${currency}`;
  return `${n.toLocaleString()} ${currency}`;
}

// ─── Small atoms ─────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-b-0">
      <div className="w-6 h-6 rounded-sm bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3 h-3 text-muted-foreground/70" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
          {label}
        </p>
        <p className={cn("text-[12px] text-foreground", mono && "font-mono")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  accent,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-sm border border-border/70 bg-card shadow-sm overflow-hidden">
      <div className={cn(
        "px-4 py-3 border-b border-border/60 flex items-center gap-2.5",
        accent ?? "bg-muted/30",
      )}>
        <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
          <Icon className="w-3 h-3 text-primary" />
        </div>
        <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-1.5 text-muted-foreground/50 hover:text-primary transition-colors"
      title="Copy"
    >
      {copied
        ? <Check className="w-3 h-3 text-emerald-500" />
        : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-4 animate-pulse">
      {/* Hero */}
      <div className="rounded-sm border border-border/70 bg-card p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-sm bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-5 w-24 rounded-sm bg-muted" />
          </div>
          <div className="h-8 w-24 rounded-sm bg-muted" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-sm bg-muted" />
          ))}
        </div>
      </div>
      {/* Cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-sm border border-border/70 bg-card p-4 space-y-3">
            <div className="h-3 w-24 rounded bg-muted" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-2.5 w-full rounded bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AppointmentDetailContent ─────────────────────────────────────────────────
// Reusable inner content — used by the modal. No layout wrappers.

export function AppointmentDetailContent({
  appointmentId,
  onClose,
}: {
  appointmentId: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useGetPatientAppointment(appointmentId);

  const appt      = (data as any)?.appointment ?? data;
  const canReview = (data as any)?.can_review ?? false;

  const doctor    = appt?.doctor   ?? null;
  const hospital  = appt?.hospital ?? null;
  const insurance = appt?.insurance ?? null;

  const doctorName = doctor
    ? (doctor.designations || doctor.user?.name)
    : hospital?.name_en ?? "—";

  const doctorAvatar = doctor?.image ?? doctor?.user?.avatar ?? null;

  const isActionable =
    appt?.status === "confirmed" || appt?.status === "in_progress";

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to appointments
        </button>
        {appt && (
          <Badge
            variant="outline"
            className={cn("text-[10px] px-2 py-0.5 font-medium border", STATUS_STYLES[appt.status as ApiAppointmentStatus])}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", STATUS_DOT[appt.status as ApiAppointmentStatus])} />
            {STATUS_LABEL[appt.status as ApiAppointmentStatus]}
          </Badge>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading */}
        {isLoading && <DetailSkeleton />}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-4">
            <div className="w-14 h-14 rounded-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-foreground">Failed to load appointment</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">Please try again or go back</p>
            </div>
            <Button size="sm" variant="outline" onClick={onClose} className="rounded-sm text-[11px]">
              <ArrowLeft className="w-3 h-3 mr-1.5" /> Go back
            </Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && appt && (
          <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto">

            {/* ── Hero card ── */}
            <div className="rounded-sm border border-border/70 bg-card shadow-sm overflow-hidden">
              {/* Top accent strip */}
              <div className={cn(
                "h-1 w-full",
                appt.status === "completed"   ? "bg-emerald-500" :
                appt.status === "in_progress" ? "bg-violet-500"  :
                appt.status === "confirmed"   ? "bg-sky-500"     :
                appt.status === "cancelled"   ? "bg-red-500"     :
                "bg-amber-500"
              )} />

              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 border border-primary/15 overflow-hidden">
                    {doctorAvatar ? (
                      <img src={doctorAvatar} alt={doctorName} className="h-full w-full object-cover" />
                    ) : hospital ? (
                      <Building2 className="w-6 h-6" />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-semibold text-foreground leading-tight">
                      {doctorName}
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {doctor
                        ? doctor.specialization || doctor.doctor_degree
                        : hospital
                        ? `${hospital.city}${hospital.address ? ` · ${hospital.address}` : ""}`
                        : "—"}
                    </p>
                    {doctor?.rating_avg && parseFloat(doctor.rating_avg) > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-medium text-foreground">
                          {parseFloat(doctor.rating_avg).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  {isActionable && appt.daily_room_url && (
                    <a
                      href={appt.daily_room_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button
                        size="sm"
                        className="h-8 px-4 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Session
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Button>
                    </a>
                  )}
                </div>

                {/* Stats row */}
                <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
                  {[
                    {
                      icon: appt.type === "online" ? Video : MapPin,
                      label: "Type",
                      value: appt.type === "online" ? "Video consult" : "In-person",
                      color: appt.type === "online" ? "text-sky-500" : "text-amber-500",
                    },
                    {
                      icon: Calendar,
                      label: "Date",
                      value: format(parseISO(appt.appointment_date), "MMM dd, yyyy"),
                      color: "text-muted-foreground",
                    },
                    {
                      icon: Clock,
                      label: "Time",
                      value: formatTime(appt.appointment_time),
                      color: "text-muted-foreground",
                    },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex flex-col items-center py-3 px-2 bg-muted/20">
                      <Icon className={cn("w-3.5 h-3.5 mb-1", color)} />
                      <p className="text-[8px] uppercase tracking-widest font-semibold text-muted-foreground/60">
                        {label}
                      </p>
                      <p className="text-[11px] font-semibold text-foreground mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Detail grid ── */}
            <div className="grid lg:grid-cols-2 gap-4">

              {/* Appointment info */}
              <SectionCard title="Appointment Info" icon={FileText}>
                <InfoRow icon={FileText} label="Booking Type" value={appt.booking_type ?? "—"} />
                <InfoRow icon={Clock}    label="Duration"     value={appt.duration_minutes ? `${appt.duration_minutes} minutes` : "—"} />
                <InfoRow icon={Calendar} label="Date"         value={formatDate(appt.appointment_date)} />
                <InfoRow icon={Clock}    label="Time"         value={formatTime(appt.appointment_time)} />
                {appt.notes && (
                  <InfoRow icon={FileText} label="Notes" value={appt.notes} />
                )}
              </SectionCard>

              {/* Payment */}
              <SectionCard title="Payment" icon={CreditCard}>
                <InfoRow
                  icon={CreditCard}
                  label="Consultation Fee"
                  value={formatCurrency(appt.consultation_fee, appt.currency)}
                />
                {insurance && (
                  <InfoRow
                    icon={Shield}
                    label="Insurance Covered"
                    value={formatCurrency(appt.insurance_covered, appt.currency)}
                  />
                )}
                <InfoRow
                  icon={CreditCard}
                  label="You Pay"
                  value={
                    <span className="font-semibold text-foreground">
                      {formatCurrency(appt.patient_pays, appt.currency)}
                    </span>
                  }
                />
                <InfoRow
                  icon={Check}
                  label="Payment Status"
                  value={
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium",
                      appt.payment_status === "paid" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        appt.payment_status === "paid" ? "bg-emerald-500" : "bg-amber-500"
                      )} />
                      {appt.payment_status ?? "—"}
                    </span>
                  }
                />
                {appt.payment_method && (
                  <InfoRow icon={CreditCard} label="Payment Method" value={appt.payment_method.replace(/_/g, " ")} />
                )}
                {appt.payment_reference && (
                  <InfoRow
                    icon={FileText}
                    label="Reference"
                    mono
                    value={
                      <span className="flex items-center gap-1">
                        {appt.payment_reference}
                        <CopyButton value={appt.payment_reference} />
                      </span>
                    }
                  />
                )}
              </SectionCard>

              {/* Doctor card */}
              {doctor && (
                <SectionCard title="Doctor" icon={User}>
                  <InfoRow icon={User}      label="Full Name"      value={doctor.user?.name ?? "—"} />
                  <InfoRow icon={FileText}  label="Degree"         value={doctor.doctor_degree ?? "—"} />
                  <InfoRow icon={FileText}  label="License"        value={doctor.medical_license ?? "—"} mono />
                  <InfoRow icon={FileText}  label="Specialization" value={doctor.specialization ?? "—"} />
                  <InfoRow
                    icon={Globe}
                    label="Consultation Type"
                    value={doctor.consultation_type?.replace(/_/g, " ") ?? "—"}
                  />
                  {parseFloat(doctor.consultation_fee) > 0 && (
                    <InfoRow
                      icon={CreditCard}
                      label="Fee"
                      value={formatCurrency(doctor.consultation_fee, doctor.currency)}
                    />
                  )}
                </SectionCard>
              )}

              {/* Hospital card */}
              {hospital && (
                <SectionCard title="Hospital" icon={Building2}>
                  <InfoRow icon={Building2} label="Name"    value={hospital.name_en} />
                  <InfoRow icon={MapPin}    label="Address" value={[hospital.address, hospital.city].filter(Boolean).join(", ")} />
                  {hospital.phone && (
                    <InfoRow icon={Phone} label="Phone" value={
                      <a href={`tel:${hospital.phone}`} className="text-primary hover:underline">
                        {hospital.phone}
                      </a>
                    } />
                  )}
                  {hospital.email && (
                    <InfoRow icon={Mail} label="Email" value={
                      <a href={`mailto:${hospital.email}`} className="text-primary hover:underline">
                        {hospital.email}
                      </a>
                    } />
                  )}
                  {hospital.website && (
                    <InfoRow icon={Globe} label="Website" value={
                      <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {hospital.website}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    } />
                  )}
                </SectionCard>
              )}

              {/* Insurance */}
              {insurance && (
                <SectionCard title="Insurance" icon={Shield}>
                  <div className="py-2 flex items-center gap-3 border-b border-border/40">
                    {insurance.logo && (
                      <img src={insurance.logo} alt={insurance.name} className="h-8 w-8 object-contain rounded-sm" />
                    )}
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">{insurance.name}</p>
                      <p className="text-[10px] text-muted-foreground">{insurance.code}</p>
                    </div>
                  </div>
                  <InfoRow icon={Shield}   label="Coverage" value={`${parseFloat(insurance.coverage_percentage ?? 0).toFixed(0)}%`} />
                  <InfoRow icon={Globe}    label="Type"     value={insurance.type ?? "—"} />
                  {insurance.phone && (
                    <InfoRow icon={Phone} label="Phone" value={
                      <a href={`tel:${insurance.phone}`} className="text-primary hover:underline">{insurance.phone}</a>
                    } />
                  )}
                  {insurance.email && (
                    <InfoRow icon={Mail} label="Email" value={
                      <a href={`mailto:${insurance.email}`} className="text-primary hover:underline">{insurance.email}</a>
                    } />
                  )}
                  {insurance.website && (
                    <InfoRow icon={Globe} label="Website" value={
                      <a href={insurance.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {insurance.website}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    } />
                  )}
                </SectionCard>
              )}

              {/* Session info — only when room exists */}
              {appt.daily_room_url && (
                <SectionCard title="Session" icon={Video}>
                  <InfoRow
                    icon={Video}
                    label="Room URL"
                    value={
                      <span className="flex items-center gap-1 break-all">
                        <span className="truncate text-[10px] text-muted-foreground font-mono">
                          {appt.daily_room_name}
                        </span>
                        <CopyButton value={appt.daily_room_url} />
                      </span>
                    }
                  />
                  {appt.session_started_at && (
                    <InfoRow
                      icon={Clock}
                      label="Session Started"
                      value={format(parseISO(appt.session_started_at), "MMM dd, yyyy · hh:mm a")}
                    />
                  )}
                  {appt.session_ended_at && (
                    <InfoRow
                      icon={Clock}
                      label="Session Ended"
                      value={format(parseISO(appt.session_ended_at), "MMM dd, yyyy · hh:mm a")}
                    />
                  )}
                  {isActionable && (
                    <div className="py-3">
                      <a href={appt.daily_room_url} target="_blank" rel="noopener noreferrer">
                        <Button
                          size="sm"
                          className="w-full h-8 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Video Session
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Button>
                      </a>
                    </div>
                  )}
                </SectionCard>
              )}
            </div>

            {/* ── Leave a review CTA ── */}
            {canReview && (
              <div className="rounded-sm border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 px-4 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                    <Star className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
                      How was your appointment?
                    </p>
                    <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                      Share your experience to help others
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-8 px-4 text-[11px] font-semibold rounded-sm shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-sm"
                >
                  <Star className="w-3 h-3 mr-1.5" />
                  Leave Review
                </Button>
              </div>
            )}

            {/* ── Cancellation info ── */}
            {appt.status === "cancelled" && appt.cancellation_reason && (
              <div className="rounded-sm border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 px-4 py-3.5 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-red-700 dark:text-red-400">Cancellation reason</p>
                  <p className="text-[11px] text-red-600/80 dark:text-red-400/70 mt-0.5">{appt.cancellation_reason}</p>
                  {appt.cancelled_at && (
                    <p className="text-[10px] text-red-500/60 mt-1">
                      Cancelled on {format(parseISO(appt.cancelled_at), "MMM dd, yyyy · hh:mm a")}
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ─── AppointmentDetailModal ───────────────────────────────────────────────────
// Slide-over panel. Open by passing a non-null appointmentId, close by onClose.

export function AppointmentDetailModal({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const isOpen = !!appointmentId;

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-background border-l border-border/70 shadow-2xl",
          "flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Close ✕ button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-3 z-10 w-7 h-7 rounded-sm bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border/60"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Inner content — only mount when open to avoid a stale hook call */}
        {appointmentId && (
          <AppointmentDetailContent
            appointmentId={appointmentId}
            onClose={onClose}
          />
        )}
      </div>
    </>
  );
}

// ─── Default export (kept for any existing import) ────────────────────────────
export default AppointmentDetailModal;
