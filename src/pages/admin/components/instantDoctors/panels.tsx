import { useState, useEffect } from "react";
import {
  Loader2,
  X,
  Search,
  ChevronDown,
  Plus,
  AlertCircle,
  DollarSign,
  Hash,
  Phone,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  Activity,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  BookOpen,
  Briefcase,
  Link2,
  BadgeCheck,
  ShieldAlert,
  Star,
  Globe,
  Eye,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useAssignDoctorConsultation,
  useGetDoctorQuickConsultations,
  type ApiDoctorConsultation,
  type ApiQuickConsultation,
  useGetAdminDoctor,
} from "@/hooks/admin/use-admin-doctors";
import {
  useGetAdminDoctors,
  type ApiDoctor,
} from "@/hooks/admin/use-admin-doctors";
import { useGetSpecializationFees } from "@/hooks/admin/use-admin-doctors";
import { cn } from "@/lib/utils";
import {
  getErrorMessage,
  getInitials,
  fmt,
  activeStyle,
  activeDot,
  type PanelTab,
} from "./types";
import { InfoTile, InstantToggleButton } from "./components";
import moment from "moment";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null) =>
  iso ? moment(iso).format("D MMM YYYY") : null;
const fmtFull = (iso?: string | null) =>
  iso ? moment(iso).format("D MMM YYYY [at] HH:mm") : null;

// ─── Quick consult types & helpers ───────────────────────────────────────────

type QCStatus = ApiQuickConsultation["status"];

const QC_STATUS_ALL: QCStatus[] = [
  "pending",
  "confirmed",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "withdrawn",
];

const QC_STATUS_LABEL: Record<QCStatus, string> = {
  pending:     "Pending",
  confirmed:   "Confirmed",
  accepted:    "Accepted",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
  withdrawn:   "Withdrawn",
};

type PillVariant = "default" | "emerald" | "teal" | "amber" | "red" | "violet";

const QC_STATUS_VARIANT: Record<QCStatus, PillVariant> = {
  pending:     "amber",
  confirmed:   "teal",
  accepted:    "teal",
  in_progress: "teal",
  completed:   "emerald",
  cancelled:   "red",
  withdrawn:   "default",
};

type ConsultPanelTab = "details" | "quick_consults";

// ─── Shared drawer shell ──────────────────────────────────────────────────────

function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[50vw]",
          "bg-card border-l border-border/60 flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && children}
      </div>
    </>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: PillVariant;
}) {
  const styles: Record<string, string> = {
    default: "bg-secondary/70 text-muted-foreground border-border/35",
    emerald:
      "bg-emerald-50 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
    teal: "bg-primary/8 text-primary border-primary/20",
    amber:
      "bg-amber-50 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    red:  "bg-red-50 dark:bg-red-950/25 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60",
    violet:
      "bg-violet-50 dark:bg-violet-950/25 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap",
        styles[variant],
      )}
    >
      {children}
    </span>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingRows() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-[88px] rounded-[5px] bg-accent/20" />
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div className="w-9 h-9 rounded-[5px] bg-accent/30 flex items-center justify-center border border-dashed border-primary/20">
        <AlertCircle className="w-4 h-4 text-primary/25" />
      </div>
      <p className="text-[11px] text-muted-foreground/35 max-w-[200px] leading-relaxed">
        {label}
      </p>
    </div>
  );
}

// ─── Doctor details display panel ────────────────────────────────────────────

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const fmtTime = (t: string) => moment(t, "HH:mm:ss").format("h:mm A");

function SectionLabel({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground/40 mb-2 flex items-center gap-1.5">
      {icon} {label}
    </p>
  );
}

function TileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Tile({
  label,
  children,
  span2,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-[5px] border border-border/40 bg-card/60 space-y-1",
        span2 && "col-span-2",
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground/40">
        {label}
      </p>
      <div className="text-[11px] text-foreground">{children}</div>
    </div>
  );
}

function StatusDot({
  ok,
  trueLabel,
  falseLabel,
}: {
  ok: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold flex items-center gap-1",
        ok
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground/50",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          ok ? "bg-emerald-500" : "bg-muted-foreground/25",
        )}
      />
      {ok ? trueLabel : falseLabel}
    </span>
  );
}

function DoctorEnrichedDetails({
  doctor,
}: {
  doctor: NonNullable<ReturnType<typeof useGetAdminDoctor>["data"]>;
}) {
  const latestAppointment = doctor.appointments?.[0] ?? null;
  const sortedAvailabilities = [...(doctor.availabilities ?? [])].sort(
    (a, b) =>
      DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week),
  );
  const socialEntries = doctor.social_links
    ? (["facebook", "twitter", "linkedin", "instagram", "website"] as const)
        .filter((k) => (doctor.social_links as any)?.[k])
        .map((k) => ({
          key: k,
          url: (doctor.social_links as any)[k] as string,
        }))
    : [];

  return (
    <div className="space-y-4">

      {/* ── Contact ── */}
      <TileGrid>
        <Tile label="Email" span2>
          <span className="break-all">{doctor.user.email ?? "—"}</span>
        </Tile>
        <Tile label="Phone">
          <span className="font-mono">{doctor.user.phone ?? "—"}</span>
        </Tile>
        <Tile label="License">
          <span className="font-mono">{doctor.medical_license ?? "—"}</span>
        </Tile>
        <Tile label="Degree">{doctor.doctor_degree ?? "—"}</Tile>
        <Tile label="Language">
          {doctor.preferred_language?.toUpperCase() ?? "—"}
        </Tile>
      </TileGrid>

      {/* ── Status flags ── */}
      <TileGrid>
        <Tile label="Agreement">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold",
              doctor.agreement_status === "approved"
                ? "text-emerald-600 dark:text-emerald-400"
                : doctor.agreement_status === "pending"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400",
            )}
          >
            {doctor.agreement_status === "approved" ? (
              <BadgeCheck className="w-3 h-3" />
            ) : (
              <ShieldAlert className="w-3 h-3" />
            )}
            {doctor.agreement_status ?? "—"}
          </span>
        </Tile>
        <Tile label="Consult type">
          <span className="capitalize">{doctor.consultation_type ?? "—"}</span>
        </Tile>
        <Tile label="Instant consult">
          <StatusDot
            ok={doctor.instant_consultation}
            trueLabel="Enabled"
            falseLabel="Disabled"
          />
        </Tile>
        <Tile label="Availability">
          <StatusDot
            ok={doctor.is_available}
            trueLabel="Available"
            falseLabel="Unavailable"
          />
        </Tile>
        <Tile label="Bookings">
          <StatusDot
            ok={!doctor.bookings_paused}
            trueLabel="Open"
            falseLabel="Paused"
          />
        </Tile>
        <Tile label="Show on homepage">
          <StatusDot
            ok={doctor.show_homepage}
            trueLabel="Visible"
            falseLabel="Hidden"
          />
        </Tile>
      </TileGrid>

      {/* ── Verification row ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[5px] border border-border/40 bg-card/60">
        <div className="flex items-center gap-2">
          <BadgeCheck
            className={cn(
              "w-4 h-4",
              doctor.verified_at
                ? "text-emerald-500"
                : "text-muted-foreground/30",
            )}
          />
          <span className="text-[11px] text-foreground">
            {doctor.verified_at ? (
              <>
                Verified{" "}
                <span className="text-muted-foreground/45 text-[10px]">
                  {fmtDate(doctor.verified_at)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/50">Not yet verified</span>
            )}
          </span>
        </div>
        <div className="flex gap-1.5">
          {doctor.user.phone && <Pill variant="teal">Phone ✓</Pill>}
          {doctor.user.email_verified_at && (
            <Pill variant="emerald">Email ✓</Pill>
          )}
        </div>
      </div>

      {/* ── Fees ── */}
      {doctor.consultation_fee && (
        <div>
          <SectionLabel
            icon={<DollarSign className="w-3 h-3" />}
            label="Consultation Fees"
          />
          <TileGrid>
            <Tile label="Online fee">
              <span className="font-mono font-semibold text-[12px]">
                {Number(
                  doctor.consultation_fee.resolved_online_fee,
                ).toLocaleString()}{" "}
                RWF
              </span>
            </Tile>
            <Tile label="In-person fee">
              <span className="font-mono font-semibold text-[12px]">
                {Number(
                  doctor.consultation_fee.resolved_in_person_fee,
                ).toLocaleString()}{" "}
                RWF
              </span>
            </Tile>
            {doctor.consultation_fee.specialization_fee && (
              <Tile label="Fee tier" span2>
                <span className="text-muted-foreground/70">
                  {doctor.consultation_fee.specialization_fee.specialization}
                </span>
              </Tile>
            )}
          </TileGrid>
        </div>
      )}

      {/* ── Education ── */}
      {doctor.educations && doctor.educations.length > 0 && (
        <div>
          <SectionLabel
            icon={<GraduationCap className="w-3 h-3" />}
            label="Education"
          />
          <div className="space-y-1.5">
            {doctor.educations.map((edu) => (
              <div
                key={edu.id}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-[5px] border border-border/40 bg-card/60"
              >
                <div className="w-6 h-6 rounded-[5px] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="w-3 h-3 text-primary/60" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground capitalize">
                    {edu.degree}
                  </p>
                  <p className="text-[10px] text-muted-foreground/55 capitalize">
                    {edu.institution}
                  </p>
                  <p className="text-[9.5px] text-muted-foreground/35 mt-0.5">
                    {edu.start_year} – {edu.end_year ?? "Present"} ·{" "}
                    {edu.country}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Experience ── */}
      {doctor.experiences && doctor.experiences.length > 0 && (
        <div>
          <SectionLabel
            icon={<Briefcase className="w-3 h-3" />}
            label="Experience"
          />
          <div className="space-y-1.5">
            {doctor.experiences.map((exp) => (
              <div
                key={exp.id}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-[5px] border border-border/40 bg-card/60"
              >
                <div className="w-6 h-6 rounded-[5px] bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase className="w-3 h-3 text-emerald-600/70 dark:text-emerald-400/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold text-foreground">
                      {exp.job_title}
                    </p>
                    {exp.is_current && <Pill variant="emerald">Current</Pill>}
                  </div>
                  <p className="text-[10px] text-muted-foreground/55">
                    {exp.workplace}
                  </p>
                  <p className="text-[9.5px] text-muted-foreground/35 mt-0.5">
                    {fmtDate(exp.start_date)} –{" "}
                    {exp.is_current ? "Present" : fmtDate(exp.end_date)} ·{" "}
                    {exp.country}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Qualifications ── */}
      {doctor.qualifications && doctor.qualifications.length > 0 && (
        <div>
          <SectionLabel
            icon={<BookOpen className="w-3 h-3" />}
            label="Qualifications"
          />
          <div className="space-y-1.5">
            {doctor.qualifications.map((q) => (
              <div
                key={q.id}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-[5px] border border-border/40 bg-card/60"
              >
                <div className="w-6 h-6 rounded-[5px] bg-violet-50 dark:bg-violet-950/25 border border-violet-200 dark:border-violet-800/50 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-3 h-3 text-violet-500/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-foreground">
                    {q.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground/55">
                    {q.issuing_body}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {q.issued_at && (
                      <span className="text-[9.5px] text-muted-foreground/35">
                        Issued {fmtDate(q.issued_at)}
                      </span>
                    )}
                    {q.expires_at && (
                      <span
                        className={cn(
                          "text-[9.5px]",
                          new Date(q.expires_at) < new Date()
                            ? "text-red-400/70"
                            : "text-muted-foreground/35",
                        )}
                      >
                        · Expires {fmtDate(q.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Availabilities ── */}
      {sortedAvailabilities.length > 0 && (
        <div>
          <SectionLabel
            icon={<Clock className="w-3 h-3" />}
            label="Availability Schedule"
          />
          <div className="space-y-1.5">
            {sortedAvailabilities.map((av) => (
              <div
                key={av.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[5px] border border-border/40 bg-card/60"
              >
                <div className="w-6 h-6 rounded-[5px] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3 text-primary/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground capitalize">
                    {av.day_of_week}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50">
                    {fmtTime(av.start_time)} – {fmtTime(av.end_time)}
                    {" · "}
                    {av.slot_duration_minutes} min slots
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Pill variant={av.type === "online" ? "teal" : "default"}>
                    {av.type}
                  </Pill>
                  {av.is_recurring === 1 && (
                    <Pill variant="emerald">Recurring</Pill>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Social links ── */}
      {socialEntries.length > 0 && (
        <div>
          <SectionLabel
            icon={<Link2 className="w-3 h-3" />}
            label="Social Links"
          />
          <div className="flex flex-col gap-1.5">
            {socialEntries.map(({ key, url }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[5px] border border-border/40 bg-card/60 hover:border-primary/30 hover:bg-accent/10 transition-all group"
              >
                <Globe className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary/60 shrink-0" />
                <span className="text-[10px] font-semibold capitalize text-muted-foreground/60 w-16 shrink-0">
                  {key}
                </span>
                <span className="text-[10px] text-primary/60 truncate group-hover:text-primary transition-colors">
                  {url}
                </span>
                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/25 group-hover:text-primary/50 shrink-0 ml-auto" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Latest appointment ── */}
      {latestAppointment && (
        <div>
          <SectionLabel
            icon={<Calendar className="w-3 h-3" />}
            label="Latest Appointment"
          />
          <div className="p-3 rounded-[5px] border border-border/40 bg-card/60 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-foreground">
                  {latestAppointment.patient?.name ?? "Unknown patient"}
                </p>
                <p className="text-[10px] text-muted-foreground/45">
                  {latestAppointment.patient?.email ??
                    latestAppointment.patient?.phone ??
                    ""}
                </p>
              </div>
              <Pill
                variant={
                  latestAppointment.status === "completed"
                    ? "emerald"
                    : latestAppointment.status === "cancelled"
                      ? "red"
                      : latestAppointment.status === "confirmed"
                        ? "teal"
                        : "amber"
                }
              >
                {latestAppointment.status}
              </Pill>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Pill>
                <Calendar className="w-2 h-2" />
                {fmtDate(latestAppointment.appointment_date)}
              </Pill>
              <Pill
                variant={
                  latestAppointment.type === "online" ? "teal" : "default"
                }
              >
                {latestAppointment.type}
              </Pill>
              <Pill
                variant={
                  latestAppointment.payment_status === "paid"
                    ? "emerald"
                    : latestAppointment.payment_status === "unpaid"
                      ? "amber"
                      : "default"
                }
              >
                {latestAppointment.payment_status}
              </Pill>
              {latestAppointment.patient_pays &&
                Number(latestAppointment.patient_pays) > 0 && (
                  <Pill variant="teal">
                    <DollarSign className="w-2 h-2" />
                    {Number(latestAppointment.patient_pays).toLocaleString()}{" "}
                    {latestAppointment.currency}
                  </Pill>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bio ── */}
      {doctor.bio_en && (
        <div>
          <SectionLabel icon={<Eye className="w-3 h-3" />} label="Bio" />
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed border-l-2 border-primary/20 pl-3">
            {doctor.bio_en}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Quick Consult card ───────────────────────────────────────────────────────

function QuickConsultCard({ qc }: { qc: ApiQuickConsultation }) {
  const isGuest     = !qc.user;
  const callerName  = qc.user?.name  ?? qc.guest_name  ?? "—";
  const callerPhone = qc.user?.phone ?? qc.guest_phone ?? null;
  const callerEmail = qc.user?.email ?? qc.guest_email ?? null;
  const variant     = QC_STATUS_VARIANT[qc.status];
  const isExpired   = qc.expires_at ? new Date(qc.expires_at) < new Date() : false;

  return (
    <div className="p-3.5 rounded-[5px] border border-border/40 bg-card/60 hover:border-primary/25 hover:bg-accent/10 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "w-7 h-7 rounded-[5px] flex items-center justify-center shrink-0 border",
              isGuest
                ? "bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400"
                : "bg-primary/10 border-primary/20 text-primary",
            )}
          >
            {isGuest ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground truncate">{callerName}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {isGuest && <Pill variant="amber">Guest</Pill>}
              {callerPhone && (
                <span className="text-[10px] font-mono text-muted-foreground/45">{callerPhone}</span>
              )}
              {callerEmail && !callerPhone && (
                <span className="text-[10px] text-muted-foreground/45 truncate">{callerEmail}</span>
              )}
            </div>
          </div>
        </div>
        <Pill variant={variant}>{QC_STATUS_LABEL[qc.status]}</Pill>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <Pill>
          <Calendar className="w-2 h-2" />
          {fmtDate(qc.created_at)}
        </Pill>
        {qc.expires_at &&
          !["completed", "cancelled", "withdrawn"].includes(qc.status) && (
            <Pill variant={isExpired ? "red" : "amber"}>
              <Clock className="w-2 h-2" />
              {isExpired ? "Expired" : `Exp. ${fmtFull(qc.expires_at)}`}
            </Pill>
          )}
      </div>

      <div className="flex flex-col gap-1 mb-1.5">
        {qc.accepted_at && (
          <span className="text-[10px] text-muted-foreground/45 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-teal-500/60 shrink-0" />
            Accepted {fmtFull(qc.accepted_at)}
          </span>
        )}
        {qc.completed_at && (
          <span className="text-[10px] text-muted-foreground/45 flex items-center gap-1">
            <Activity className="w-2.5 h-2.5 text-emerald-500/60 shrink-0" />
            Completed {fmtFull(qc.completed_at)}
          </span>
        )}
      </div>

      {qc.daily_room_url && (
        <div className="flex items-center pt-2 border-t border-border/25">
          <a
            href={qc.daily_room_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-primary/65 hover:text-primary hover:underline transition-colors ml-auto"
          >
            <ExternalLink className="w-2.5 h-2.5" /> Room link
          </a>
        </div>
      )}

      {qc.notes && (
        <div className="mt-2 pt-2 border-t border-border/25">
          <p className="text-[10.5px] text-muted-foreground/55 leading-relaxed italic">
            "{qc.notes}"
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 pt-1">
        <span className="text-[9px] font-mono text-muted-foreground/25">#{qc.id}</span>
        {qc.guest_token && (
          <span className="text-[9px] font-mono text-muted-foreground/20 truncate max-w-[120px]">
            token: {qc.guest_token.split("-")[0]}…
          </span>
        )}
        {qc.user?.id && (
          <span className="text-[9px] text-muted-foreground/20">· user #{qc.user.id}</span>
        )}
      </div>
    </div>
  );
}

// ─── Quick Consultations summary bar ─────────────────────────────────────────

function QCSummaryBar({ items, total }: { items: ApiQuickConsultation[]; total: number }) {
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const completed  = items.filter((i) => i.status === "completed").length;
  const pending    = items.filter((i) => i.status === "pending").length;

  return (
    <div className="grid grid-cols-4 gap-2 mb-3">
      {[
        { label: "Total",       value: total      },
        { label: "In Progress", value: inProgress },
        { label: "Completed",   value: completed  },
        { label: "Pending",     value: pending    },
      ].map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center py-2 rounded-[5px] border border-border/40 bg-card/60 gap-0.5"
        >
          <span className="text-[15px] font-bold text-foreground">{value}</span>
          <span className="text-[9px] text-muted-foreground/45">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Quick Consultations tab content ─────────────────────────────────────────

function QuickConsultsContent({ doctorId }: { doctorId: number }) {
  const [statusFilter, setStatusFilter] = useState<QCStatus | "">("");
  const [searchInput,  setSearchInput]  = useState("");
  const [search,       setSearch]       = useState("");
  const [from,         setFrom]         = useState("");
  const [to,           setTo]           = useState("");
  const [page,         setPage]         = useState(1);
  const [showFilters,  setShowFilters]  = useState(false);

  const { data, isLoading, isFetching } = useGetDoctorQuickConsultations({
    doctor_id: doctorId,
    status:    statusFilter || undefined,
    search:    search       || undefined,
    from:      from         || undefined,
    to:        to           || undefined,
    page,
  });

  const applySearch  = () => { setSearch(searchInput); setPage(1); };
  const clearFilters = () => {
    setStatusFilter(""); setSearch(""); setSearchInput("");
    setFrom(""); setTo(""); setPage(1);
  };

  const hasActiveFilters = !!statusFilter || !!search || !!from || !!to;

  const paginatedObj = (data as any)?.data ?? data;
  const items        = paginatedObj?.data ?? (Array.isArray(paginatedObj) ? paginatedObj : []);
  const total        = paginatedObj?.total ?? items.length;
  const perPage      = paginatedObj?.per_page ?? 15;
  const totalPages   = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky filter bar ── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 space-y-2.5 border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { setStatusFilter(""); setPage(1); }}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-[5px] border font-medium transition-all",
              statusFilter === ""
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/40 text-muted-foreground/55 hover:border-primary/40 hover:text-primary/70 hover:bg-accent/20",
            )}
          >
            All
          </button>
          {QC_STATUS_ALL.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                "text-[10px] px-2.5 py-1 rounded-[5px] border font-medium transition-all",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/40 text-muted-foreground/55 hover:border-primary/40 hover:text-primary/70 hover:bg-accent/20",
              )}
            >
              {QC_STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
              placeholder="Search by name or phone…"
              className="w-full h-8 pl-7 pr-2.5 rounded-[5px] border border-border/40 bg-background text-[11px] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <Button
            size="sm" variant="outline"
            className="h-8 w-20 text-[10.5px] rounded-[5px] gap-1.5 shrink-0 hover:border-primary/40 hover:text-primary hover:bg-accent/20"
            onClick={applySearch}
          >
            <Search className="w-2.5 h-2.5" /> Search
          </Button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-[5px] border transition-all shrink-0",
              showFilters || from || to
                ? "border-primary/40 bg-accent/30 text-primary"
                : "border-border/40 text-muted-foreground/40 hover:border-primary/30 hover:text-primary/60",
            )}
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {showFilters && (
          <div className="p-3 rounded-[5px] border border-primary/15 bg-accent/10 space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40">
              Date range (created at)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] text-muted-foreground/40 mb-1">From</label>
                <input
                  type="date" value={from}
                  onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2.5 rounded-[5px] border border-border/40 bg-background text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-[9px] text-muted-foreground/40 mb-1">To</label>
                <input
                  type="date" value={to}
                  onChange={(e) => { setTo(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2.5 rounded-[5px] border border-border/40 bg-background text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-muted-foreground/35 uppercase tracking-wide font-semibold">
              Active:
            </span>
            {statusFilter && (
              <span className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-[5px] border border-primary/20 bg-accent/20 text-primary font-medium">
                {QC_STATUS_LABEL[statusFilter]}
                <button onClick={() => { setStatusFilter(""); setPage(1); }}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-[5px] border border-primary/20 bg-accent/20 text-primary font-medium">
                "{search}"
                <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {(from || to) && (
              <span className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-[5px] border border-primary/20 bg-accent/20 text-primary font-medium">
                {from || "…"} → {to || "…"}
                <button onClick={() => { setFrom(""); setTo(""); setPage(1); }}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-[9.5px] text-muted-foreground/40 hover:text-red-500 transition-colors underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <LoadingRows />
        ) : !items.length ? (
          <EmptyState
            label={
              hasActiveFilters
                ? "No consultations match your filters"
                : "No quick consultations recorded for this doctor yet"
            }
          />
        ) : (
          <div className="space-y-3">
            {!hasActiveFilters && <QCSummaryBar items={items} total={total} />}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground/35">
                {total} total consultation{total !== 1 ? "s" : ""}
                {isFetching && (
                  <span className="ml-2 text-primary/40 animate-pulse">refreshing…</span>
                )}
              </p>
              {items.some((i: ApiQuickConsultation) => i.status === "in_progress") && (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live session
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {items.map((qc: ApiQuickConsultation) => (
                <QuickConsultCard key={qc.id} qc={qc} />
              ))}
            </div>
            {total > perPage && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10.5px] text-muted-foreground/40">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 w-7 p-0 rounded-[5px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 w-7 p-0 rounded-[5px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AssignPanel ──────────────────────────────────────────────────────────────

export function AssignPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [doctorSearch,    setDoctorSearch]    = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDoctor,  setSelectedDoctor]  = useState<ApiDoctor | null>(null);
  const [showDoctorList,  setShowDoctorList]  = useState(false);
  const [selectedFeeId,   setSelectedFeeId]   = useState<number | null>(null);
  const [primarySpec,     setPrimarySpec]     = useState("");
  const [secondarySpec,   setSecondarySpec]   = useState("");

  const assignMutation = useAssignDoctorConsultation();

  const { data: doctorData, isLoading: doctorsLoading } = useGetAdminDoctors({
    status: "active",
    search: debouncedSearch || undefined,
    page: 1,
  });
  const doctors = doctorData?.data ?? [];

  const { data: feesData, isLoading: feesLoading } = useGetSpecializationFees();
  const activeFees  = (feesData ?? []).filter((f) => f.is_active);
  const selectedFee = activeFees.find((f) => f.id === selectedFeeId) ?? null;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(doctorSearch), 350);
    return () => clearTimeout(t);
  }, [doctorSearch]);

  useEffect(() => {
    if (open) {
      setDoctorSearch(""); setDebouncedSearch(""); setSelectedDoctor(null);
      setPrimarySpec(""); setSecondarySpec("");
      setShowDoctorList(false); setSelectedFeeId(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedDoctor)      { toast({ title: "Select a doctor",                       variant: "destructive" }); return; }
    if (!selectedFeeId)       { toast({ title: "Select a fee tier",                      variant: "destructive" }); return; }
    if (!primarySpec.trim())  { toast({ title: "Primary specialization is required",    variant: "destructive" }); return; }
    try {
      await assignMutation.mutateAsync({
        doctor_id:                selectedDoctor.id,
        specialization_fee_id:    selectedFeeId,
        primary_specialization:   primarySpec.trim(),
        secondary_specialization: secondarySpec.trim() || undefined,
      });
      toast({ title: "Doctor assigned to consultation." });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-[5px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
        <div>
          <p className="text-[14px] font-semibold text-foreground leading-tight">Assign doctor</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Add a doctor to the consultation pool</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-[5px] border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Doctor picker */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            Doctor <span className="text-red-500">*</span>
          </label>
          {selectedDoctor ? (
            <div className="flex items-center gap-3 p-3 rounded-[5px] border border-primary/30 bg-primary/5">
              <div className="h-9 w-9 rounded-[5px] bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
                {getInitials(selectedDoctor.user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[12px] text-foreground truncate">{selectedDoctor.user.name}</p>
                <p className="text-[10px] text-muted-foreground/60">
                  {selectedDoctor.specialization ?? selectedDoctor.user.email ?? "—"}
                </p>
              </div>
              <button
                onClick={() => { setSelectedDoctor(null); setDoctorSearch(""); }}
                className="text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => { setDoctorSearch(e.target.value); setShowDoctorList(true); }}
                onFocus={() => setShowDoctorList(true)}
                placeholder="Search by name…"
                className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-[5px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
              />
              {showDoctorList && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border/60 rounded-[5px] shadow-lg max-h-48 overflow-y-auto">
                  {doctorsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : doctors.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 px-3 py-3 text-center">No active doctors found</p>
                  ) : (
                    doctors.map((d) => (
                      <button
                        key={d.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/30 transition-colors text-left"
                        onClick={() => { setSelectedDoctor(d); setShowDoctorList(false); setDoctorSearch(""); }}
                      >
                        <div className="h-7 w-7 rounded-[5px] bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px] shrink-0 border border-primary/20">
                          {getInitials(d.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate">{d.user.name}</p>
                          <p className="text-[10px] text-muted-foreground/60 truncate">
                            {d.specialization ?? d.user.email ?? "—"}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fee tier */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            Fee Tier <span className="text-red-500">*</span>
          </label>
          {feesLoading ? (
            <div className="flex items-center gap-2 py-2 text-[11px] text-muted-foreground/60">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading fee tiers…
            </div>
          ) : activeFees.length === 0 ? (
            <div className="flex items-start gap-2 p-3 rounded-[5px] border border-border/60 bg-secondary/20 text-[11px] text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>No active fee tiers. Create one in Specialization Fees first.</span>
            </div>
          ) : (
            <>
              <div className="relative">
                <select
                  value={selectedFeeId ?? ""}
                  onChange={(e) => setSelectedFeeId(Number(e.target.value) || null)}
                  className="w-full appearance-none px-3 pr-8 py-2 text-[12px] bg-background border border-border/60 rounded-[5px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
                >
                  <option value="">Select fee tier…</option>
                  {activeFees.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.specialization} — {f.online_fee.toLocaleString()} /{" "}
                      {f.in_person_fee.toLocaleString()} {f.currency}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
              </div>
              {selectedFee && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2.5 rounded-[5px] border border-border/60 bg-secondary/30">
                    <p className="text-[10px] text-muted-foreground mb-1">Online</p>
                    <p className="text-[12px] font-medium font-mono text-foreground">
                      {selectedFee.online_fee.toLocaleString()} {selectedFee.currency}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-[5px] border border-border/60 bg-secondary/30">
                    <p className="text-[10px] text-muted-foreground mb-1">In-person</p>
                    <p className="text-[12px] font-medium font-mono text-foreground">
                      {selectedFee.in_person_fee.toLocaleString()} {selectedFee.currency}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            Primary Specialization <span className="text-red-500">*</span>
          </label>
          <input
            type="text" value={primarySpec}
            onChange={(e) => setPrimarySpec(e.target.value)}
            placeholder="e.g. Cardiology"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            Secondary Specialization{" "}
            <span className="ml-1 normal-case text-muted-foreground/50 font-normal">(optional)</span>
          </label>
          <input
            type="text" value={secondarySpec}
            onChange={(e) => setSecondarySpec(e.target.value)}
            placeholder="e.g. Internal Medicine"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 bg-card">
        <div className="flex items-center gap-2">
          <Button
            className="flex-1 h-10 text-[12px] rounded-[5px] gap-2"
            onClick={handleSubmit}
            disabled={assignMutation.isPending || !selectedDoctor || !selectedFeeId || !primarySpec.trim()}
          >
            {assignMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
            {assignMutation.isPending ? "Assigning…" : "Assign doctor"}
          </Button>
          <Button
            variant="ghost"
            className="flex-1 h-10 text-[12px] rounded-[5px] border text-muted-foreground"
            onClick={onClose}
            disabled={assignMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── ConsultationPanel ────────────────────────────────────────────────────────

export function ConsultationPanel({
  consultation,
  onClose,
}: {
  consultation: ApiDoctorConsultation | null;
  onClose: () => void;
}) {
  const open = !!consultation;
  const [tab, setTab] = useState<ConsultPanelTab>("details");

  const { data: singleDoctor, isLoading: doctorLoading } = useGetAdminDoctor(
    consultation?.doctor_id ?? null,
  );

  // Reset to details tab whenever a new consultation is opened
  useEffect(() => {
    if (consultation) setTab("details");
  }, [consultation]);

  const doctorName        = singleDoctor?.user?.name ?? "";
  const doctorImage       = singleDoctor?.image ?? null;
  const doctorSpec        =
    singleDoctor?.primary_specialization ??
    singleDoctor?.specialization ??
    "No specialization";
  const doctorIsActive    = singleDoctor?.is_active ?? consultation?.is_active ?? false;
  const doctorDesignation = singleDoctor?.designations;
  const doctorDegree      = singleDoctor?.doctor_degree;
  const doctorRating      = singleDoctor ? Number(singleDoctor.rating_avg ?? 0) : 0;
  const isFeatured        = singleDoctor?.is_featured ?? false;

  const TABS: { id: ConsultPanelTab; label: string }[] = [
    { id: "details",        label: "Details"        },
    { id: "quick_consults", label: "Quick Consults" },
  ];

  return (
    <Drawer open={open} onClose={onClose}>
      {consultation && (
        <>
          {/* ── Header ── */}
          <div className="flex-shrink-0 border-b border-border/60 bg-card/40">

            {/* Title row */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div>
                <p className="text-[13px] font-bold text-foreground">Doctor details</p>
                <p className="text-[10px] text-muted-foreground/45 mt-0.5">
                  Profile, fees, schedule, and quick consultations
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-[5px] border border-border/45 bg-background/80 flex items-center justify-center hover:bg-accent/40 hover:border-primary/30 transition-all"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>

            {/* Doctor profile strip + Instant toggle */}
            <div className="px-5 pb-3">
              {doctorLoading ? (
                <div className="flex items-center gap-3 animate-pulse">
                  <div className="h-12 w-12 rounded-[5px] bg-accent/30 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 rounded bg-accent/30" />
                    <div className="h-2.5 w-24 rounded bg-accent/20" />
                    <div className="h-2 w-40 rounded bg-accent/15" />
                  </div>
                  <div className="shrink-0 pl-3 border-l border-border/40 flex flex-col items-center gap-1.5">
                    <div className="h-5 w-20 rounded bg-accent/20" />
                    <div className="h-7 w-24 rounded-[5px] bg-accent/20" />
                    <div className="h-3 w-20 rounded bg-accent/10" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3.5">
                  {/* Avatar */}
                  {doctorImage ? (
                    <img
                      src={doctorImage}
                      alt={doctorName}
                      className="h-12 w-12 rounded-[5px] object-cover ring-2 ring-primary/10 border border-primary/20 shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-[5px] bg-primary/10 text-primary flex items-center justify-center font-bold text-[14px] ring-2 ring-primary/10 border border-primary/20 shrink-0">
                      {doctorName ? getInitials(doctorName) : "?"}
                    </div>
                  )}

                  {/* Name + pills */}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[13px] text-foreground truncate leading-tight">
                      {doctorName || "—"}
                    </p>
                    {doctorDesignation && doctorDesignation !== doctorName && (
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">
                        {doctorDesignation}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/45 truncate mt-0.5">{doctorSpec}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {doctorDegree && <Pill variant="teal">{doctorDegree}</Pill>}
                      {doctorRating > 0 && (
                        <Pill variant="amber">
                          <Star className="w-2 h-2" />
                          {doctorRating.toFixed(1)}
                        </Pill>
                      )}
                      {isFeatured && <Pill variant="violet">Featured</Pill>}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full border font-semibold",
                          activeStyle[String(doctorIsActive) as "true" | "false"],
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            activeDot[String(doctorIsActive) as "true" | "false"],
                          )}
                        />
                        {doctorIsActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* Instant Consultation toggle */}
                  <div className="shrink-0 flex flex-col items-center gap-1 pl-3.5 border-l border-border/40 min-w-[90px]">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Zap className="w-2.5 h-2.5 text-primary/50" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground/40">
                        Instant
                      </span>
                    </div>
                    <InstantToggleButton
                      doctorId={consultation.doctor_id}
                      isInstant={consultation.doctor.instant_consultation}
                    />
                    <span className="text-[8.5px] text-muted-foreground/30 text-center leading-tight mt-0.5">
                      Pool availability
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tab strip — Details | Quick Consults only */}
            <div className="flex overflow-x-auto px-5 scrollbar-none border-t border-primary/10">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-[10.5px] font-medium whitespace-nowrap border-b-2 transition-all duration-150",
                    tab === t.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground/45 hover:text-primary/70 hover:border-primary/30",
                  )}
                >
                  {t.label}
                  {t.id === "quick_consults" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/30 -mt-1 -ml-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Body ── */}
          {tab === "quick_consults" ? (
            <div className="flex-1 flex flex-col min-h-0">
              <QuickConsultsContent doctorId={consultation.doctor_id} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">
                {/* Core consultation info tiles */}
                <div className="grid grid-cols-2 gap-2.5">
                  <InfoTile
                    icon={<Hash className="w-3.5 h-3.5" />}
                    label="Doctor ID"
                    value={`#${consultation.doctor_id}`}
                  />
                  <InfoTile
                    icon={<Phone className="w-3.5 h-3.5" />}
                    label="Phone"
                    value={consultation.doctor.user.phone ?? "—"}
                  />
                  <InfoTile
                    icon={<DollarSign className="w-3.5 h-3.5" />}
                    label="Online fee"
                    value={fmt(consultation.specialization_fee?.online_fee ?? null)}
                  />
                  <InfoTile
                    icon={<DollarSign className="w-3.5 h-3.5" />}
                    label="In-person fee"
                    value={fmt(consultation.specialization_fee?.in_person_fee ?? null)}
                  />
                </div>

                {/* Enriched doctor profile */}
                {doctorLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-[60px] rounded-[5px] bg-accent/20" />
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-[5px] bg-accent/20" />
                      ))}
                    </div>
                  </div>
                ) : singleDoctor ? (
                  <DoctorEnrichedDetails doctor={singleDoctor} />
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
