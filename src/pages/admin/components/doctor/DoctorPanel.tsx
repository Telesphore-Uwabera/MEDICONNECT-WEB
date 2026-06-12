import { useEffect, useRef, useState } from "react";
import moment from "moment";
import {
  ShieldOff, ShieldCheck, X, Loader2, Ban, User, GraduationCap, Briefcase,
  Award, Clock, Link2, Building2, AlertCircle, Calendar, Hash, Mail, Phone,
  Stethoscope, Wallet, Trash2, TrendingUp, TrendingDown, BadgeCheck, FileText,
  Globe, ChevronRight, Star, Zap, PauseCircle, CheckCircle2, MapPin, ExternalLink,
  CalendarDays, ToggleLeft, ToggleRight, DollarSign, RefreshCw, Plus,
  Pencil, Check, XCircle, Shield, Activity, PackageCheck, AlertTriangle,
  MessageSquare, Search, ChevronLeft, Filter, UserCheck, UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiDoctor } from "@/hooks/admin/use-admin-doctors";
import {
  useGetAdminDoctor,
  useGetDoctorWallet,
  useTopupDoctorWallet,
  useDeductDoctorWallet,
  useDeleteDoctorWallet,
  useGetAppointments,
  useGetInstantConsultations,
  useAddInstantConsultation,
  useUpdateInstantConsultation,
  useRemoveInstantConsultation,
  useGetCertificationDoctors,
  useAddCertificationDoctor,
  useUpdateCertificationDoctor,
  useRemoveCertificationDoctor,
  useGetSpecializationFees,
  useGetDoctorConsultations,
  useAssignDoctorConsultation,
  useUpdateDoctorConsultation,
  useSetDoctorFeeOverride,
  useGetDoctorQuickConsultations,
  type ApiQuickConsultation,
} from "@/hooks/admin/use-admin-doctors";
import {
  getInitials,
  statusStyle,
  STATUS_DOT,
  consultationStyle,
  CONSULTATION_LABELS,
} from "./Types";
import { ConsultationIcon } from "./Constants";

// ─── Base URL ─────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_APP_BASE_URL ?? "";

function storageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BASE_URL}/storage/${path.replace(/^\/+/, "")}`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const fmtDate  = (iso?: string | null) => iso ? moment(iso).format("D MMM YYYY") : null;
const fmtMonth = (iso?: string | null) => iso ? moment(iso).format("MMM YYYY") : null;
const fmtTime  = (iso?: string | null) => iso ? moment(iso).format("HH:mm") : null;
const fmtFull  = (iso?: string | null) => iso ? moment(iso).format("D MMM YYYY [at] HH:mm") : null;
const isExpired = (iso?: string | null) => iso ? moment(iso).isBefore(moment()) : false;

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId =
  | "overview" | "appointments" | "quick_consults" | "education" | "experience"
  | "qualifications" | "schedule" | "links" | "instant"
  | "certification" | "fees" | "wallet";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview",       label: "Overview",       icon: <User className="w-3 h-3" /> },
  { id: "appointments",   label: "Appointments",   icon: <CalendarDays className="w-3 h-3" /> },
  { id: "quick_consults", label: "Quick Consults", icon: <MessageSquare className="w-3 h-3" /> },
  { id: "education",      label: "Education",      icon: <GraduationCap className="w-3 h-3" /> },
  { id: "experience",     label: "Experience",     icon: <Briefcase className="w-3 h-3" /> },
  { id: "qualifications", label: "Credentials",    icon: <Award className="w-3 h-3" /> },
  { id: "schedule",       label: "Schedule",       icon: <Clock className="w-3 h-3" /> },
  { id: "links",          label: "Links",          icon: <Link2 className="w-3 h-3" /> },
  { id: "instant",        label: "Instant",        icon: <Zap className="w-3 h-3" /> },
  { id: "certification",  label: "Certification",  icon: <Shield className="w-3 h-3" /> },
  { id: "fees",           label: "Fees",           icon: <DollarSign className="w-3 h-3" /> },
  { id: "wallet",         label: "Wallet",         icon: <Wallet className="w-3 h-3" /> },
];

const DAY_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_LABEL: Record<string, string> = {
  monday: "Mo", tuesday: "Tu", wednesday: "We", thursday: "Th",
  friday: "Fr", saturday: "Sa", sunday: "Su",
};

// ─── Quick consult status helpers ─────────────────────────────────────────────

type QCStatus = ApiQuickConsultation["status"];

const QC_STATUS_ALL: QCStatus[] = [
  "pending", "confirmed", "accepted", "in_progress", "completed", "cancelled", "withdrawn",
];

const QC_STATUS_VARIANT: Record<QCStatus, "emerald" | "teal" | "amber" | "red" | "violet" | "default"> = {
  pending:     "amber",
  confirmed:   "teal",
  accepted:    "teal",
  in_progress: "teal",
  completed:   "emerald",
  cancelled:   "red",
  withdrawn:   "default",
};

const QC_STATUS_LABEL: Record<QCStatus, string> = {
  pending:     "Pending",
  confirmed:   "Confirmed",
  accepted:    "Accepted",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
  withdrawn:   "Withdrawn",
};

// ─── Layout wrapper ───────────────────────────────────────────────────────────

function ContentWrap({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[640px]">{children}</div>;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function InfoTile({
  icon, label, value, full = false, mono = false,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  full?: boolean; mono?: boolean;
}) {
  return (
    <div className={cn(
      "group p-3 rounded-[10px] border border-border/40 bg-card/60",
      "hover:border-primary/30 hover:bg-accent/20 transition-all duration-150",
      full && "col-span-2",
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-primary/40 group-hover:text-primary/70 transition-colors">{icon}</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/40">{label}</span>
      </div>
      <p className={cn("text-[11.5px] font-medium text-foreground/85 truncate", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
}

function SectionEmpty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div className="w-9 h-9 rounded-full bg-accent/30 flex items-center justify-center border border-dashed border-primary/20">
        <AlertCircle className="w-4 h-4 text-primary/25" />
      </div>
      <p className="text-[11px] text-muted-foreground/35 max-w-[180px] leading-relaxed">{label}</p>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "rounded-[10px] border border-border/40 bg-card/60 p-4",
      "hover:border-primary/25 hover:bg-accent/10 transition-all duration-150",
      className,
    )}>
      {children}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-[11px] leading-relaxed">
      <span className="text-muted-foreground/40 shrink-0 w-[68px] font-medium pt-px">{label}</span>
      <span className="text-foreground/70 flex-1">{value}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-primary/40">{children}</span>
      <div className="flex-1 h-px bg-primary/10" />
    </div>
  );
}

function Pill({
  children, variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "primary" | "teal" | "amber" | "red" | "emerald" | "violet";
}) {
  const styles: Record<string, string> = {
    default: "bg-secondary/70 text-muted-foreground border-border/35",
    primary: "bg-accent text-accent-foreground border-primary/20",
    teal:    "bg-primary/8 text-primary border-primary/20",
    amber:   "bg-amber-50 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    red:     "bg-red-50 dark:bg-red-950/25 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60",
    emerald: "bg-emerald-50 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
    violet:  "bg-violet-50 dark:bg-violet-950/25 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/60",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap",
      styles[variant],
    )}>
      {children}
    </span>
  );
}

function LoadingRow() {
  return (
    <div className="flex flex-col gap-2 animate-pulse max-w-[640px]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 rounded-[10px] bg-accent/20" />
      ))}
    </div>
  );
}

// ─── Quick Consult card ───────────────────────────────────────────────────────

function QuickConsultCard({ qc }: { qc: ApiQuickConsultation }) {
  const isGuest    = !qc.user;
  const callerName = qc.user?.name ?? qc.guest_name ?? "—";
  const callerPhone = qc.user?.phone ?? qc.guest_phone ?? null;
  const callerEmail = qc.user?.email ?? null;
  const variant    = QC_STATUS_VARIANT[qc.status];

  return (
    <div className="p-3.5 rounded-[10px] border border-border/40 bg-card/60 hover:border-primary/25 hover:bg-accent/10 transition-all">
      {/* Row 1: caller + status */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border text-[9px] font-bold",
            isGuest
              ? "bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400"
              : "bg-primary/10 border-primary/20 text-primary",
          )}>
            {isGuest ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground truncate">{callerName}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {isGuest && (
                <Pill variant="amber">Guest</Pill>
              )}
              {callerPhone && (
                <span className="text-[10px] font-mono text-muted-foreground/45">{callerPhone}</span>
              )}
              {callerEmail && !callerPhone && (
                <span className="text-[10px] text-muted-foreground/45 truncate">{callerEmail}</span>
              )}
            </div>
          </div>
        </div>
        <Pill variant={variant}>
          {QC_STATUS_LABEL[qc.status]}
        </Pill>
      </div>

      {/* Row 2: metadata pills */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <Pill>
          <Calendar className="w-2 h-2" />
          {fmtDate(qc.created_at)}
        </Pill>
        {qc.duration_minutes && (
          <Pill>
            <Clock className="w-2 h-2" />
            {qc.duration_minutes} min
          </Pill>
        )}
        {qc.payment_status && (
          <Pill variant={qc.payment_status === "paid" ? "emerald" : qc.payment_status === "unpaid" ? "amber" : "default"}>
            {qc.payment_status}
          </Pill>
        )}
        {qc.payment_method && (
          <Pill>{qc.payment_method.replace(/_/g, " ")}</Pill>
        )}
        {qc.amount !== null && qc.amount !== undefined && (
          <Pill variant="teal">
            <DollarSign className="w-2 h-2" />
            {Number(qc.amount).toLocaleString()} {qc.currency ?? "RWF"}
          </Pill>
        )}
      </div>

      {/* Row 3: timing + room */}
      {(qc.started_at || qc.ended_at || qc.daily_room_url) && (
        <div className="flex items-center gap-3 pt-2 border-t border-border/25 flex-wrap">
          {qc.started_at && (
            <span className="text-[10px] text-muted-foreground/45 flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 text-emerald-500/60" />
              Started {fmtFull(qc.started_at)}
            </span>
          )}
          {qc.ended_at && (
            <span className="text-[10px] text-muted-foreground/45 flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-primary/40" />
              Ended {fmtFull(qc.ended_at)}
            </span>
          )}
          {qc.daily_room_url && (
            <a
              href={qc.daily_room_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-primary/65 hover:text-primary hover:underline transition-colors ml-auto"
            >
              <ExternalLink className="w-2.5 h-2.5" /> Room
            </a>
          )}
        </div>
      )}

      {/* Row 4: notes */}
      {qc.notes && (
        <div className="mt-2 pt-2 border-t border-border/25">
          <p className="text-[10.5px] text-muted-foreground/55 leading-relaxed italic">"{qc.notes}"</p>
        </div>
      )}

      {/* Row 5: IDs */}
      <div className="flex items-center gap-2 mt-2 pt-1.5">
        <span className="text-[9px] font-mono text-muted-foreground/25">#{qc.id}</span>
        {qc.user?.id && (
          <span className="text-[9px] text-muted-foreground/20">· user #{qc.user.id}</span>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Quick Consultations ─────────────────────────────────────────────────

function QuickConsultsTab({ doctorId }: { doctorId: number }) {
  const [statusFilter, setStatusFilter] = useState<ApiQuickConsultation["status"] | "">("");
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");
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

  const applySearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setSearch("");
    setSearchInput("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const hasActiveFilters = !!statusFilter || !!search || !!from || !!to;

  // ── summary counts from current page for context ──
  const items = data?.data ?? [];

  return (
    <ContentWrap>
      <div className="space-y-3">

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { setStatusFilter(""); setPage(1); }}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all",
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
                "text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/40 text-muted-foreground/55 hover:border-primary/40 hover:text-primary/70 hover:bg-accent/20",
              )}
            >
              {QC_STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* Search + date filters row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
              placeholder="Search by name or phone…"
              className="w-full h-8 pl-7 pr-2.5 rounded-[8px] border border-border/40 bg-background text-[11px] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <Button
            size="sm" variant="outline"
            className="h-8 px-3 text-[10.5px] rounded-[8px] gap-1.5 hover:border-primary/40 hover:text-primary hover:bg-accent/20"
            onClick={applySearch}
          >
            <Search className="w-2.5 h-2.5" /> Search
          </Button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-[8px] border transition-all",
              showFilters || from || to
                ? "border-primary/40 bg-accent/30 text-primary"
                : "border-border/40 text-muted-foreground/40 hover:border-primary/30 hover:text-primary/60 hover:bg-accent/15",
            )}
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {/* Date range panel */}
        {showFilters && (
          <div className="p-3 rounded-[10px] border border-primary/15 bg-accent/10 space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40">Date range (created)</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] text-muted-foreground/40 mb-1">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2.5 rounded-[8px] border border-border/40 bg-background text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-[9px] text-muted-foreground/40 mb-1">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2.5 rounded-[8px] border border-border/40 bg-background text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-muted-foreground/35 uppercase tracking-wide font-semibold">Filters:</span>
            {statusFilter && (
              <span className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full border border-primary/20 bg-accent/20 text-primary font-medium">
                {QC_STATUS_LABEL[statusFilter]}
                <button onClick={() => { setStatusFilter(""); setPage(1); }}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full border border-primary/20 bg-accent/20 text-primary font-medium">
                "{search}"
                <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {(from || to) && (
              <span className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full border border-primary/20 bg-accent/20 text-primary font-medium">
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

        {/* Results */}
        {isLoading ? (
          <LoadingRow />
        ) : !items.length ? (
          <SectionEmpty label={hasActiveFilters ? "No consultations match your filters" : "No quick consultations for this doctor yet"} />
        ) : (
          <>
            {/* Count bar */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground/35">
                {data!.total} total consultation{data!.total !== 1 ? "s" : ""}
                {isFetching && <span className="ml-2 text-primary/40 animate-pulse">refreshing…</span>}
              </p>
              <div className="flex gap-1 items-center">
                {/* mini status breakdown on current page */}
                {(["pending", "in_progress", "completed", "cancelled"] as QCStatus[]).map((s) => {
                  const count = items.filter((i) => i.status === s).length;
                  if (!count) return null;
                  return (
                    <Pill key={s} variant={QC_STATUS_VARIANT[s]}>
                      {count} {QC_STATUS_LABEL[s].toLowerCase()}
                    </Pill>
                  );
                })}
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {items.map((qc) => (
                <QuickConsultCard key={qc.id} qc={qc} />
              ))}
            </div>

            {/* Pagination */}
            {data!.total > data!.per_page && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10.5px] text-muted-foreground/40">
                  Page {page} of {Math.ceil(data!.total / data!.per_page)}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 w-7 p-0 rounded-[8px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 w-7 p-0 rounded-[8px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={page * data!.per_page >= data!.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ doctor }: { doctor: ApiDoctor }) {
  return (
    <ContentWrap>
      <div className="space-y-5">
        {doctor.bio_en && (
          <div className="p-4 rounded-[10px] border border-primary/15 bg-accent/15">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3 h-3 text-primary/50" />
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40">Bio</span>
            </div>
            <p className="text-[12px] text-foreground/60 leading-relaxed">{doctor.bio_en}</p>
          </div>
        )}

        <div>
          <SectionHeading>Profile</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {doctor.specialization && (
              <InfoTile icon={<Stethoscope className="w-2.5 h-2.5" />} label="Specialization" value={doctor.specialization} />
            )}
            {doctor.doctor_degree && (
              <InfoTile icon={<GraduationCap className="w-2.5 h-2.5" />} label="Degree" value={doctor.doctor_degree} />
            )}
            {doctor.medical_license && (
              <InfoTile icon={<BadgeCheck className="w-2.5 h-2.5" />} label="License" value={doctor.medical_license} mono />
            )}
            {doctor.consultation_fee !== undefined && doctor.consultation_fee !== null && (
              <InfoTile
                icon={<Wallet className="w-2.5 h-2.5" />}
                label="Consultation Fee"
                value={`${Number(doctor.consultation_fee).toLocaleString()} ${doctor.currency ?? "RWF"}`}
              />
            )}
            {doctor.rating_avg !== undefined && doctor.rating_avg !== null && (
              <InfoTile icon={<Star className="w-2.5 h-2.5" />} label="Rating" value={`${Number(doctor.rating_avg).toFixed(1)} / 5.0`} />
            )}
            <InfoTile icon={<Calendar className="w-2.5 h-2.5" />} label="Joined" value={fmtDate(doctor.created_at) ?? "—"} />
            <InfoTile icon={<Hash className="w-2.5 h-2.5" />} label="Doctor ID" value={`#${doctor.id}`} mono />
            {doctor.consultation_type && (
              <InfoTile icon={<Activity className="w-2.5 h-2.5" />} label="Consult type" value={CONSULTATION_LABELS[doctor.consultation_type] ?? doctor.consultation_type} />
            )}
          </div>
        </div>

        {(doctor.user.phone || doctor.user.email) && (
          <div>
            <SectionHeading>Contact</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              {doctor.user.phone && (
                <InfoTile icon={<Phone className="w-2.5 h-2.5" />} label="Phone" value={doctor.user.phone} mono />
              )}
              {doctor.user.email && (
                <InfoTile icon={<Mail className="w-2.5 h-2.5" />} label="Email" value={doctor.user.email} full />
              )}
            </div>
          </div>
        )}

        {(doctor.degree_document || doctor.medical_license_document || doctor.national_id_document) && (
          <div>
            <SectionHeading>Documents</SectionHeading>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "Degree document", path: doctor.degree_document },
                { label: "Medical license", path: doctor.medical_license_document },
                { label: "National ID",     path: doctor.national_id_document },
              ].filter((d) => d.path).map((doc) => (
                <a
                  key={doc.label}
                  href={storageUrl(doc.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-[10px] border border-border/40 hover:border-primary/30 hover:bg-accent/15 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-accent flex items-center justify-center border border-primary/20">
                      <FileText className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-[11.5px] font-medium text-foreground/80">{doc.label}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}

        {(doctor.instant_consultation || doctor.is_featured || doctor.bookings_paused ||
          doctor.is_available || doctor.agreement_status || doctor.show_homepage) && (
          <div>
            <SectionHeading>Flags</SectionHeading>
            <div className="flex flex-wrap gap-1.5">
              {doctor.instant_consultation && <Pill variant="teal"><Zap className="w-2 h-2" /> Instant consult</Pill>}
              {doctor.is_featured          && <Pill variant="amber"><Star className="w-2 h-2" /> Featured</Pill>}
              {doctor.bookings_paused      && <Pill variant="red"><PauseCircle className="w-2 h-2" /> Bookings paused</Pill>}
              {doctor.is_available         && <Pill variant="emerald"><CheckCircle2 className="w-2 h-2" /> Available</Pill>}
              {doctor.show_homepage        && <Pill variant="primary"><Globe className="w-2 h-2" /> Homepage</Pill>}
              {doctor.agreement_status     && (
                <Pill><span className="capitalize">Agreement: {doctor.agreement_status}</span></Pill>
              )}
            </div>
          </div>
        )}

        {doctor.hospitals && doctor.hospitals.length > 0 && (
          <div>
            <SectionHeading>Affiliated hospitals</SectionHeading>
            <div className="flex flex-col gap-1.5">
              {doctor.hospitals.map((h) => (
                <Card key={h.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-[8px] bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <Building2 className="w-3 h-3 text-primary/60" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">{h.name}</p>
                    {h.address && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2 h-2 text-primary/30" />
                        <p className="text-[10.5px] text-muted-foreground/50 truncate">{h.address}</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {doctor.pharmacy && (
          <div>
            <SectionHeading>Pharmacy</SectionHeading>
            <Card className="flex items-center gap-3">
              <div className={cn(
                "w-7 h-7 rounded-[8px] flex items-center justify-center border",
                doctor.pharmacy.is_active
                  ? "bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/50"
                  : "bg-red-50 dark:bg-red-950/25 border-red-200 dark:border-red-800/50",
              )}>
                <PackageCheck className={cn("w-3 h-3", doctor.pharmacy.is_active ? "text-emerald-500" : "text-red-500")} />
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-foreground">Pharmacy #{doctor.pharmacy.id}</p>
                <p className="text-[10.5px] text-muted-foreground/50 capitalize">{doctor.pharmacy.status}</p>
              </div>
              <Pill variant={doctor.pharmacy.is_active ? "emerald" : "red"}>
                {doctor.pharmacy.is_active ? "Active" : "Inactive"}
              </Pill>
            </Card>
          </div>
        )}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Appointments ────────────────────────────────────────────────────────

function AppointmentsTab({ doctorId }: { doctorId: number }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetAppointments({
    doctor_id: doctorId,
    status: statusFilter || undefined,
    page,
  });

  const statuses = ["", "confirmed", "pending", "in_progress", "cancelled", "completed"];

  const apptStatusVariant = (s: string): "emerald" | "amber" | "red" | "teal" | "violet" | "default" => {
    if (s === "confirmed")   return "emerald";
    if (s === "pending")     return "amber";
    if (s === "cancelled")   return "red";
    if (s === "in_progress") return "teal";
    if (s === "completed")   return "violet";
    return "default";
  };

  const paymentVariant = (s: string) =>
    s === "paid" ? "emerald" : s === "unpaid" ? "amber" : "default";

  return (
    <ContentWrap>
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                "text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/40 text-muted-foreground/55 hover:border-primary/40 hover:text-primary/70 hover:bg-accent/20",
              )}
            >
              {s === "" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {isLoading ? <LoadingRow /> : !data?.data.length ? (
          <SectionEmpty label="No appointments found for this doctor" />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {data.data.map((appt) => (
                <div
                  key={appt.id}
                  className="p-3.5 rounded-[10px] border border-border/40 bg-card/60 hover:border-primary/25 hover:bg-accent/10 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">{appt.patient.name}</p>
                      <p className="text-[10px] text-muted-foreground/45 mt-0.5 font-mono">
                        {fmtDate(appt.appointment_date)} · {fmtTime(appt.appointment_time)}
                        {appt.duration_minutes ? ` · ${appt.duration_minutes}min` : ""}
                      </p>
                    </div>
                    <Pill variant={apptStatusVariant(appt.status)}>
                      {appt.status.replace("_", " ")}
                    </Pill>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Pill>{appt.type}</Pill>
                    <Pill>{appt.booking_type}</Pill>
                    <Pill variant={paymentVariant(appt.payment_status ?? "")}>
                      {appt.payment_status ?? "—"}
                    </Pill>
                    {appt.payment_method && (
                      <Pill>{appt.payment_method.replace("_", " ")}</Pill>
                    )}
                    {appt.insurance && (
                      <Pill variant="primary">
                        {(appt.insurance as { name?: string }).name ?? "Insured"}
                      </Pill>
                    )}
                    {appt.daily_room_url && (
                      <a
                        href={appt.daily_room_url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9.5px] text-primary/65 hover:text-primary hover:underline transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> Room
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {data.total > data.per_page && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10.5px] text-muted-foreground/40">
                  {data.total} total · page {page}
                </span>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm"
                    className="h-7 text-[10.5px] px-3 rounded-[8px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Button variant="outline" size="sm"
                    className="h-7 text-[10.5px] px-3 rounded-[8px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={page * data.per_page >= data.total}
                    onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Education ───────────────────────────────────────────────────────────

function EducationTab({ doctor }: { doctor: ApiDoctor }) {
  const list = doctor.educations ?? [];
  if (list.length === 0) return <SectionEmpty label="No education records have been added yet" />;

  return (
    <ContentWrap>
      <div className="flex flex-col gap-2.5">
        {list.map((e, i) => (
          <Card key={e.id} className="flex gap-3">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-8 h-8 rounded-[10px] bg-primary/10 flex items-center justify-center border border-primary/20">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
              </div>
              {i < list.length - 1 && <div className="w-px flex-1 min-h-[14px] bg-primary/10 my-1" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1 pb-0.5">
              <p className="text-[12px] font-semibold text-foreground capitalize">{e.degree}</p>
              <FieldRow label="Institution" value={e.institution} />
              <FieldRow label="Country"     value={e.country} />
              {(e.start_year || e.end_year) && (
                <FieldRow label="Period" value={`${e.start_year ?? "?"} – ${e.end_year ?? "Present"}`} />
              )}
            </div>
          </Card>
        ))}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Experience ──────────────────────────────────────────────────────────

function ExperienceTab({ doctor }: { doctor: ApiDoctor }) {
  const list = doctor.experiences ?? [];
  if (list.length === 0) return <SectionEmpty label="No work experience has been added yet" />;

  return (
    <ContentWrap>
      <div className="flex flex-col gap-2.5">
        {list.map((e, i) => (
          <Card key={e.id} className="flex gap-3">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-8 h-8 rounded-[10px] bg-amber-50 dark:bg-amber-950/25 flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
                <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              </div>
              {i < list.length - 1 && <div className="w-px flex-1 min-h-[14px] bg-border/25 my-1" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-semibold text-foreground">{e.job_title}</p>
                {e.is_current && <Pill variant="emerald">Current</Pill>}
              </div>
              <FieldRow label="Workplace" value={e.workplace} />
              <FieldRow label="Country"   value={e.country} />
              {e.start_date && (
                <FieldRow
                  label="Period"
                  value={`${fmtMonth(e.start_date)} – ${e.is_current ? "Present" : (fmtMonth(e.end_date) ?? "—")}`}
                />
              )}
            </div>
          </Card>
        ))}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Qualifications ──────────────────────────────────────────────────────

function QualificationsTab({ doctor }: { doctor: ApiDoctor }) {
  const list = doctor.qualifications ?? [];
  if (list.length === 0) return <SectionEmpty label="No credentials have been added yet" />;

  return (
    <ContentWrap>
      <div className="flex flex-col gap-2.5">
        {list.map((q) => (
          <Card key={q.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/25 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shrink-0 mt-0.5">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[12px] font-semibold text-foreground">{q.title}</p>
              <FieldRow label="Issued by" value={q.issuing_body} />
              <FieldRow label="Issued"    value={fmtDate(q.issued_at)} />
              {q.expires_at && (
                <div className="flex gap-3 text-[11px] leading-relaxed">
                  <span className="text-muted-foreground/40 shrink-0 w-[68px] font-medium pt-px">Expires</span>
                  <span className={cn(isExpired(q.expires_at) ? "text-red-500 font-medium" : "text-foreground/70")}>
                    {fmtDate(q.expires_at)}{isExpired(q.expires_at) && " · Expired"}
                  </span>
                </div>
              )}
              {q.certificate_file && (
                <a
                  href={storageUrl(q.certificate_file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[10.5px] text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  <FileText className="w-2.5 h-2.5" /> View certificate <ExternalLink className="w-2 h-2" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Schedule ────────────────────────────────────────────────────────────

function ScheduleTab({ doctor }: { doctor: ApiDoctor }) {
  const raw = doctor.availabilities ?? [];

  const grouped = DAY_ORDER.reduce<Record<string, typeof raw>>((acc, d) => {
    const slots = raw.filter((a) => (a as unknown as { day_of_week: string }).day_of_week === d);
    if (slots.length) acc[d] = slots;
    return acc;
  }, {});

  if (raw.length === 0) return <SectionEmpty label="No availability schedule has been configured" />;

  return (
    <ContentWrap>
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_ORDER.map((d) => {
            const active = !!grouped[d];
            return (
              <div
                key={d}
                title={d.charAt(0).toUpperCase() + d.slice(1)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-[8px] py-2.5 text-[9px] font-bold",
                  active
                    ? "bg-primary/12 text-primary border border-primary/25"
                    : "bg-muted/15 text-muted-foreground/25 border border-border/15",
                )}
              >
                {DAY_LABEL[d]}
              </div>
            );
          })}
        </div>

        {DAY_ORDER.filter((d) => grouped[d]).map((d) => (
          <div key={d} className="space-y-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-primary/40 px-0.5 capitalize">
              {d}
            </p>
            {grouped[d].map((a) => {
              const slot = a as unknown as {
                id: number; start_time: string; end_time: string;
                slot_duration_minutes?: number; type?: string;
              };
              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between px-3.5 py-2 rounded-[8px] border border-border/35 bg-card/60 hover:border-primary/25 hover:bg-accent/10 transition-colors"
                >
                  <span className="text-[11px] font-mono text-foreground/80 tabular-nums">
                    {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {slot.slot_duration_minutes && (
                      <Pill>{slot.slot_duration_minutes}min slots</Pill>
                    )}
                    {slot.type && (
                      <Pill variant={slot.type === "online" ? "teal" : slot.type === "in_person" ? "emerald" : "default"}>
                        {slot.type.replace("_", " ")}
                      </Pill>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Links ───────────────────────────────────────────────────────────────

function LinksTab({ doctor }: { doctor: ApiDoctor }) {
  const list = doctor.social_links ?? (doctor as unknown as { socialLinks?: typeof doctor.social_links }).socialLinks ?? [];
  if (!list || list.length === 0) return <SectionEmpty label="No social links have been added yet" />;

  return (
    <ContentWrap>
      <div className="flex flex-col gap-2">
        {list.map((l) => (
          <Card key={l.id} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[8px] bg-accent flex items-center justify-center shrink-0 border border-primary/20">
              <Globe className="w-3 h-3 text-primary/60" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground capitalize">{l.platform}</p>
              <a href={l.url} target="_blank" rel="noopener noreferrer"
                className="text-[10.5px] text-primary/65 hover:text-primary hover:underline truncate block transition-colors">
                {l.url}
              </a>
            </div>
            <ChevronRight className="w-3 h-3 text-primary/20 shrink-0" />
          </Card>
        ))}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Instant Consultation ────────────────────────────────────────────────

function InstantTab({ doctor }: { doctor: ApiDoctor }) {
  const { data: list, isLoading } = useGetInstantConsultations();
  const addMutation    = useAddInstantConsultation();
  const updateMutation = useUpdateInstantConsultation();
  const removeMutation = useRemoveInstantConsultation();

  const entry    = list?.find((ic) => ic.doctor?.id === doctor.id);
  const isOnList = !!entry;

  const isAdding   = addMutation.isPending;
  const isToggling = updateMutation.isPending;
  const isRemoving = removeMutation.isPending;

  const handleAdd    = () => addMutation.mutate({ doctor_id: doctor.id, active: true });
  const handleToggle = () => { if (entry) updateMutation.mutate({ id: entry.id, active: !entry.active }); };
  const handleRemove = () => { if (entry) removeMutation.mutate(entry.id); };

  return (
    <ContentWrap>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-[10px] border border-primary/20 bg-accent/20">
          <div className="w-8 h-8 rounded-[8px] bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[12.5px] font-semibold text-foreground">Instant consultation</p>
            <p className="text-[11px] text-muted-foreground/55 mt-0.5 leading-relaxed">
              When enabled and active, this doctor appears in patients' instant consultation list for on-demand bookings.
            </p>
          </div>
        </div>

        {isLoading ? <LoadingRow /> : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-[10px] border border-border/40 bg-card/60">
              <div>
                <p className="text-[12px] font-semibold text-foreground">Whitelist status</p>
                <p className="text-[10.5px] text-muted-foreground/50 mt-0.5">
                  {isOnList
                    ? entry.active ? "Active — visible to patients" : "On list, currently disabled"
                    : "Not on the instant consultation list"}
                </p>
              </div>
              <Pill variant={isOnList ? (entry.active ? "emerald" : "amber") : "default"}>
                {isOnList ? (entry.active ? "Active" : "Disabled") : "Not listed"}
              </Pill>
            </div>

            {!isOnList ? (
              <div>
                <Button
                  size="sm"
                  className="h-9 px-5 text-[11.5px] rounded-[10px] gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={isAdding}
                  onClick={handleAdd}
                >
                  {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add to instant list
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  size="sm" variant="outline"
                  className="h-9 px-5 text-[11.5px] rounded-[10px] gap-2 font-medium hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                  disabled={isToggling || isRemoving}
                  onClick={handleToggle}
                >
                  {isToggling
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : entry.active
                      ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />
                      : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground/40" />
                  }
                  {entry.active ? "Disable" : "Enable"}
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="h-9 px-5 text-[11.5px] rounded-[10px] gap-2 border-red-300/60 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/20 font-medium"
                  disabled={isRemoving || isToggling}
                  onClick={handleRemove}
                >
                  {isRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Remove
                </Button>
              </div>
            )}

            {isOnList && (
              <div className="grid grid-cols-2 gap-2">
                <InfoTile icon={<Hash className="w-2.5 h-2.5" />} label="Entry ID" value={`#${entry.id}`} mono />
                <InfoTile icon={<Calendar className="w-2.5 h-2.5" />} label="Added" value={fmtDate(entry.created_at) ?? "—"} />
              </div>
            )}
          </div>
        )}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Certification ───────────────────────────────────────────────────────

function CertificationTab({ doctor }: { doctor: ApiDoctor }) {
  const { data: list, isLoading } = useGetCertificationDoctors();
  const addMutation    = useAddCertificationDoctor();
  const updateMutation = useUpdateCertificationDoctor();
  const removeMutation = useRemoveCertificationDoctor();

  const entry    = list?.find((cd) => cd.doctor?.id === doctor.id);
  const isOnTeam = !!entry;

  const isAdding         = addMutation.isPending;
  const isTogglingStatus = updateMutation.isPending && updateMutation.variables?.status !== undefined;
  const isTogglingAvail  = updateMutation.isPending && updateMutation.variables?.is_available !== undefined;
  const isRemoving       = removeMutation.isPending;
  const anyUpdating      = updateMutation.isPending;

  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleAdd                = () => addMutation.mutate({ doctor_id: doctor.id });
  const handleToggleStatus       = () => { if (entry) updateMutation.mutate({ id: entry.id, status: entry.status === "active" ? "inactive" : "active" }); };
  const handleToggleAvailability = () => { if (entry) updateMutation.mutate({ id: entry.id, is_available: !entry.is_available }); };

  const handleRemove = async () => {
    if (!entry) return;
    setRemoveError(null);
    try {
      await removeMutation.mutateAsync(entry.id);
    } catch (err: unknown) {
      setRemoveError((err as { message?: string })?.message ?? "Cannot remove at this time.");
    }
  };

  return (
    <ContentWrap>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-[10px] border border-primary/20 bg-accent/20">
          <div className="w-8 h-8 rounded-[8px] bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Shield className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[12.5px] font-semibold text-foreground">Certification team</p>
            <p className="text-[11px] text-muted-foreground/55 mt-0.5 leading-relaxed">
              Certification doctors review and approve patient medical certificates. They handle pending and in-review requests.
            </p>
          </div>
        </div>

        {isLoading ? <LoadingRow /> : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-[10px] border border-border/40 bg-card/60">
              <div>
                <p className="text-[12px] font-semibold text-foreground">Team membership</p>
                <p className="text-[10.5px] text-muted-foreground/50 mt-0.5">
                  {isOnTeam
                    ? `${entry.status === "active" ? "Active member" : "Inactive member"} · ${entry.is_available ? "Available" : "Unavailable"}`
                    : "Not on the certification team"}
                </p>
              </div>
              <Pill variant={isOnTeam ? (entry.status === "active" ? "emerald" : "amber") : "default"}>
                {isOnTeam ? (entry.status === "active" ? "Active" : "Inactive") : "Not a member"}
              </Pill>
            </div>

            {isOnTeam && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3.5 rounded-[10px] border border-amber-200/60 dark:border-amber-800/40 dark:bg-amber-950/8">
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-amber-600/60 dark:text-amber-400/60 mb-1">Pending</p>
                  <p className="text-[24px] font-bold text-amber-700 dark:text-amber-400 tabular-nums leading-none">{entry.pending_count}</p>
                </div>
                <div className="p-3.5 rounded-[10px] border border-primary/20 bg-accent/25 dark:bg-primary/8">
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary/50 mb-1">In review</p>
                  <p className="text-[24px] font-bold text-primary tabular-nums leading-none">{entry.in_review_count}</p>
                </div>
              </div>
            )}

            {removeError && (
              <div className="flex items-start gap-2 p-3 rounded-[10px] border border-red-200/60 bg-red-50/40 dark:border-red-800/40 dark:bg-red-950/8">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 dark:text-red-400">{removeError}</p>
              </div>
            )}

            {!isOnTeam ? (
              <div>
                <Button
                  size="sm"
                  className="h-9 px-5 text-[11.5px] rounded-[10px] gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={isAdding}
                  onClick={handleAdd}
                >
                  {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add to certification team
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline"
                  className="h-9 px-4 text-[11.5px] rounded-[10px] gap-2 font-medium hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                  disabled={anyUpdating || isRemoving}
                  onClick={handleToggleStatus}
                >
                  {isTogglingStatus
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : entry.status === "active"
                      ? <XCircle className="w-3.5 h-3.5 text-amber-500" />
                      : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  }
                  {entry.status === "active" ? "Set inactive" : "Set active"}
                </Button>

                <Button size="sm" variant="outline"
                  className="h-9 px-4 text-[11.5px] rounded-[10px] gap-2 font-medium hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                  disabled={anyUpdating || isRemoving}
                  onClick={handleToggleAvailability}
                >
                  {isTogglingAvail
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : entry.is_available
                      ? <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                      : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  }
                  {entry.is_available ? "Mark unavailable" : "Mark available"}
                </Button>

                <Button size="sm" variant="outline"
                  className="h-9 px-4 text-[11.5px] rounded-[10px] gap-2 border-red-300/60 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/20 font-medium"
                  disabled={isRemoving || anyUpdating}
                  onClick={handleRemove}
                >
                  {isRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Remove
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Fees ────────────────────────────────────────────────────────────────

function FeesTab({ doctor }: { doctor: ApiDoctor }) {
  const { data: fees,          isLoading: feesLoading    } = useGetSpecializationFees();
  const { data: consultations, isLoading: consultLoading } = useGetDoctorConsultations();

  const assignMutation   = useAssignDoctorConsultation();
  const updateMutation   = useUpdateDoctorConsultation();
  const overrideMutation = useSetDoctorFeeOverride();

  const consultation = consultations?.find((c) => c.doctor_id === doctor.id);
  const isActing = assignMutation.isPending || updateMutation.isPending || overrideMutation.isPending;

  const [showOverrideForm,     setShowOverrideForm]     = useState(false);
  const [onlineOverride,       setOnlineOverride]       = useState(consultation?.online_fee_override?.toString() ?? "");
  const [inPersonOverride,     setInPersonOverride]     = useState(consultation?.in_person_fee_override?.toString() ?? "");
  const [overrideReason,       setOverrideReason]       = useState(consultation?.override_reason ?? "");
  const [showAssignForm,       setShowAssignForm]       = useState(false);
  const [assignFeeId,          setAssignFeeId]          = useState("");
  const [assignSpecialization, setAssignSpecialization] = useState(doctor.specialization ?? "");

  const handleAssign = async () => {
    if (!assignFeeId || !assignSpecialization) return;
    await assignMutation.mutateAsync({
      doctor_id: doctor.id,
      specialization_fee_id: Number(assignFeeId),
      primary_specialization: assignSpecialization,
    });
    setShowAssignForm(false);
  };

  const handleOverride = async () => {
    await overrideMutation.mutateAsync({
      doctorId: doctor.id,
      online_fee_override:    onlineOverride   ? Number(onlineOverride)   : null,
      in_person_fee_override: inPersonOverride ? Number(inPersonOverride) : null,
      override_reason: overrideReason || null,
    });
    setShowOverrideForm(false);
  };

  const handleClearOverride = () => {
    overrideMutation.mutate({
      doctorId: doctor.id,
      online_fee_override: null, in_person_fee_override: null, override_reason: null,
    });
  };

  const handleToggleActive = () => {
    if (consultation) updateMutation.mutate({ doctorId: doctor.id, is_active: !consultation.is_active });
  };

  if (feesLoading || consultLoading) return <LoadingRow />;

  const inputCls = "w-full h-9 rounded-[8px] border border-border/45 bg-background px-2.5 text-[11.5px] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/40";

  return (
    <ContentWrap>
      <div className="space-y-4">
        {!consultation ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-[10px] border border-amber-200/60 dark:border-amber-800/40 dark:bg-amber-950/8">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-foreground">No fee tier assigned</p>
                <p className="text-[10.5px] text-muted-foreground/60 mt-0.5">
                  This doctor hasn't been assigned to a specialization fee tier yet.
                </p>
              </div>
            </div>

            {!showAssignForm ? (
              <div>
                <Button size="sm"
                  className="h-9 px-5 text-[11.5px] rounded-[10px] gap-2 font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowAssignForm(true)}>
                  <Plus className="w-3 h-3" /> Assign to fee tier
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-[10px] border border-primary/20 bg-accent/10">
                <p className="text-[12px] font-semibold text-foreground">Assign fee tier</p>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40 mb-1.5">Fee tier</label>
                    <select value={assignFeeId} onChange={(e) => setAssignFeeId(e.target.value)} className={inputCls}>
                      <option value="">Select a specialization fee…</option>
                      {fees?.filter((f) => f.is_active).map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.specialization} — {f.online_fee.toLocaleString()} RWF online / {f.in_person_fee.toLocaleString()} RWF in-person
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40 mb-1.5">Primary specialization</label>
                    <input type="text" value={assignSpecialization} onChange={(e) => setAssignSpecialization(e.target.value)}
                      placeholder="e.g. Cardiology" className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-[10.5px] rounded-[8px]"
                    onClick={() => setShowAssignForm(false)} disabled={isActing}>Cancel</Button>
                  <Button size="sm" className="h-8 px-4 text-[10.5px] rounded-[8px] gap-1.5 font-medium"
                    onClick={handleAssign} disabled={isActing || !assignFeeId || !assignSpecialization}>
                    {isActing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                    Assign
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-[10px] border border-primary/20 bg-card/60 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-primary/10 bg-accent/10">
                <div>
                  <p className="text-[13px] font-bold text-foreground">{consultation.primary_specialization}</p>
                  {consultation.secondary_specialization && (
                    <p className="text-[10.5px] text-muted-foreground/50 mt-0.5">+{consultation.secondary_specialization}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Pill variant={consultation.is_active ? "emerald" : "amber"}>
                    {consultation.is_active ? "Active" : "Inactive"}
                  </Pill>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[7px] hover:bg-accent hover:text-primary"
                    disabled={isActing} onClick={handleToggleActive}>
                    {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-primary/10">
                <div className="p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40 mb-1.5">Online fee</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[22px] font-bold text-foreground tabular-nums">
                      {(consultation.online_fee_override ?? consultation.specialization_fee.online_fee).toLocaleString()}
                    </span>
                    <span className="text-[10.5px] font-medium text-muted-foreground/45">RWF</span>
                  </div>
                  {consultation.online_fee_override !== null && (
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5 line-through">
                      {consultation.specialization_fee.online_fee.toLocaleString()} base
                    </p>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40 mb-1.5">In-person fee</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[22px] font-bold text-foreground tabular-nums">
                      {(consultation.in_person_fee_override ?? consultation.specialization_fee.in_person_fee).toLocaleString()}
                    </span>
                    <span className="text-[10.5px] font-medium text-muted-foreground/45">RWF</span>
                  </div>
                  {consultation.in_person_fee_override !== null && (
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5 line-through">
                      {consultation.specialization_fee.in_person_fee.toLocaleString()} base
                    </p>
                  )}
                </div>
              </div>
            </div>

            {consultation.override_reason && (
              <div className="flex items-start gap-2 p-3 rounded-[10px] border border-amber-200/60 dark:border-amber-800/40 dark:bg-amber-950/8">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10.5px] font-semibold text-foreground/80">Override reason</p>
                  <p className="text-[10.5px] text-muted-foreground/60 mt-0.5">{consultation.override_reason}</p>
                </div>
              </div>
            )}

            {!showOverrideForm ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline"
                  className="h-9 px-4 text-[11.5px] rounded-[10px] gap-2 font-medium hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                  onClick={() => {
                    setOnlineOverride(consultation.online_fee_override?.toString() ?? "");
                    setInPersonOverride(consultation.in_person_fee_override?.toString() ?? "");
                    setOverrideReason(consultation.override_reason ?? "");
                    setShowOverrideForm(true);
                  }}>
                  <Pencil className="w-3 h-3" />
                  {consultation.online_fee_override !== null ? "Edit override" : "Set fee override"}
                </Button>
                {consultation.online_fee_override !== null && (
                  <Button size="sm" variant="outline"
                    className="h-9 px-4 text-[11.5px] rounded-[10px] gap-2 border-red-300/60 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/20 font-medium"
                    disabled={isActing} onClick={handleClearOverride}>
                    {overrideMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                    Clear override
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-[10px] border border-primary/20 bg-accent/10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-foreground">Fee override</p>
                  <button onClick={() => setShowOverrideForm(false)}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-accent/40 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40 mb-1.5">Online fee (RWF)</label>
                    <input type="number" value={onlineOverride} onChange={(e) => setOnlineOverride(e.target.value)}
                      placeholder="Leave blank to use base" className={cn(inputCls, "font-mono")} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40 mb-1.5">In-person fee (RWF)</label>
                    <input type="number" value={inPersonOverride} onChange={(e) => setInPersonOverride(e.target.value)}
                      placeholder="Leave blank to use base" className={cn(inputCls, "font-mono")} />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40 mb-1.5">
                    Reason <span className="normal-case tracking-normal font-normal text-muted-foreground/25">(optional)</span>
                  </label>
                  <input type="text" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Senior consultant discount" className={inputCls} />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-[10.5px] rounded-[8px]"
                    onClick={() => setShowOverrideForm(false)} disabled={isActing}>Cancel</Button>
                  <Button size="sm" className="h-8 px-4 text-[10.5px] rounded-[8px] gap-1.5 font-medium"
                    onClick={handleOverride} disabled={isActing}>
                    {overrideMutation.isPending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                    Apply override
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ContentWrap>
  );
}

// ─── Tab: Wallet ──────────────────────────────────────────────────────────────

function WalletTab({ doctorId }: { doctorId: number }) {
  const { data: wallet, isLoading, isError } = useGetDoctorWallet(doctorId);
  const topupMutation  = useTopupDoctorWallet();
  const deductMutation = useDeductDoctorWallet();
  const deleteMutation = useDeleteDoctorWallet();

  const [mode, setMode]     = useState<"idle" | "topup" | "deduct" | "delete">("idle");
  const [amount, setAmount] = useState("");
  const [note, setNote]     = useState("");

  const isTopuping  = topupMutation.isPending;
  const isDeducting = deductMutation.isPending;
  const isDeleting  = deleteMutation.isPending;
  const isActing    = isTopuping || isDeducting || isDeleting;

  const resetForm = () => { setMode("idle"); setAmount(""); setNote(""); };

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    if (mode === "topup")  await topupMutation.mutateAsync({ id: doctorId, amount: parsed, note: note || undefined });
    if (mode === "deduct") await deductMutation.mutateAsync({ id: doctorId, amount: parsed, note: note || undefined });
    resetForm();
  };

  if (isLoading) {
    return (
      <ContentWrap>
        <div className="space-y-2 animate-pulse">
          <div className="h-24 rounded-[12px] bg-accent/25" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-[12px] bg-accent/15" />)}
          </div>
        </div>
      </ContentWrap>
    );
  }

  const hasWallet = !isError && !!wallet;
  const balance   = hasWallet ? Number(wallet.balance) : 0;
  const currency  = wallet?.currency ?? "RWF";

  return (
    <ContentWrap>
      <div className="space-y-3">
        <div className={cn(
          "rounded-[12px] border p-5",
          hasWallet ? "border-primary/25 bg-accent/15" : "border-border/35 bg-muted/8",
        )}>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-primary/40 mb-2">Wallet balance</p>
          {hasWallet ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-[30px] font-bold text-foreground tabular-nums leading-none">
                  {balance.toLocaleString()}
                </span>
                <span className="text-[12px] font-semibold text-muted-foreground/45">{currency}</span>
              </div>
              {wallet.updated_at && (
                <p className="text-[10px] text-primary/35 mt-2 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Updated {fmtFull(wallet.updated_at)}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/25" />
              <p className="text-[11.5px] text-muted-foreground/35">No wallet found for this doctor</p>
            </div>
          )}
        </div>

        {mode === "idle" && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "topup"  as const, icon: <TrendingUp className="w-3.5 h-3.5" />,  label: "Top up",
                cls: "border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-950/15 hover:bg-emerald-100/60 text-emerald-700 dark:text-emerald-400",
                ibg: "bg-emerald-100 dark:bg-emerald-900/35" },
              { id: "deduct" as const, icon: <TrendingDown className="w-3.5 h-3.5" />, label: "Deduct",
                cls: "border-amber-200/70 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/15 hover:bg-amber-100/60 text-amber-700 dark:text-amber-400",
                ibg: "bg-amber-100 dark:bg-amber-900/35" },
              { id: "delete" as const, icon: <Trash2 className="w-3.5 h-3.5" />,      label: "Delete",
                cls: "border-red-200/70 dark:border-red-800/50 bg-red-50/80 dark:bg-red-950/15 hover:bg-red-100/60 text-red-700 dark:text-red-400",
                ibg: "bg-red-100 dark:bg-red-900/35" },
            ].map((a) => (
              <button key={a.id} onClick={() => setMode(a.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3.5 rounded-[12px] border transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]",
                  a.cls,
                )}>
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", a.ibg)}>{a.icon}</div>
                <span className="text-[10.5px] font-semibold">{a.label}</span>
              </button>
            ))}
          </div>
        )}

        {(mode === "topup" || mode === "deduct") && (
          <div className="rounded-[12px] border border-primary/20 bg-accent/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded-[7px] flex items-center justify-center",
                  mode === "topup" ? "bg-emerald-100 dark:bg-emerald-900/35" : "bg-amber-100 dark:bg-amber-900/35")}>
                  {mode === "topup"
                    ? <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    : <TrendingDown className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                </div>
                <p className="text-[12px] font-semibold text-foreground">
                  {mode === "topup" ? "Top up wallet" : "Deduct from wallet"}
                </p>
              </div>
              <button onClick={resetForm}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-accent/40 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40 mb-1.5">Amount ({currency})</label>
                <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                  className="w-full h-9 rounded-[8px] border border-border/45 bg-background px-2.5 text-[11.5px] font-mono text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40 mb-1.5">
                  Note <span className="normal-case tracking-normal font-normal text-muted-foreground/25">(optional)</span>
                </label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Manual adjustment"
                  className="w-full h-9 rounded-[8px] border border-border/45 bg-background px-2.5 text-[11.5px] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-[10.5px] px-3 rounded-[8px]"
                onClick={resetForm} disabled={isActing}>Cancel</Button>
              <Button size="sm"
                className={cn("h-8 px-5 text-[10.5px] rounded-[8px] gap-1.5 font-medium",
                  mode === "topup" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white")}
                onClick={handleSubmit} disabled={isActing || !amount}>
                {(mode === "topup" ? isTopuping : isDeducting)
                  ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  : mode === "topup" ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {mode === "topup" ? "Confirm top up" : "Confirm deduction"}
              </Button>
            </div>
          </div>
        )}

        {mode === "delete" && (
          <div className="rounded-[12px] border border-red-200/60 dark:border-red-800/40 bg-red-50/40 dark:bg-red-950/8 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/25 flex items-center justify-center shrink-0 border border-red-200/60 dark:border-red-800/40">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground">Delete this wallet?</p>
                <p className="text-[11px] text-muted-foreground/55 mt-0.5 leading-relaxed">
                  All wallet data will be permanently removed and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-[10.5px] px-3 rounded-[8px]"
                onClick={resetForm} disabled={isActing}>Cancel</Button>
              <Button size="sm"
                className="h-8 px-5 text-[10.5px] rounded-[8px] gap-1.5 bg-red-600 hover:bg-red-700 text-white font-medium"
                onClick={async () => { await deleteMutation.mutateAsync(doctorId); resetForm(); }}
                disabled={isActing}>
                {isDeleting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                Delete wallet
              </Button>
            </div>
          </div>
        )}
      </div>
    </ContentWrap>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div className="px-6 py-5 space-y-4 animate-pulse max-w-[640px]">
      <div className="h-4 w-20 bg-accent/40 rounded" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-[10px] bg-accent/25" />)}
      </div>
      <div className="h-4 w-16 bg-accent/30 rounded mt-2" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-[10px] bg-accent/15" />)}
      </div>
    </div>
  );
}

// ─── DoctorPanel ──────────────────────────────────────────────────────────────

export interface DoctorPanelProps {
  doctor:    ApiDoctor | null;
  onClose:   () => void;
  onApprove: (d: ApiDoctor) => void;
  onReject:  (d: ApiDoctor) => void;
  onSuspend: (d: ApiDoctor) => void;
  isActing:  boolean;
}

export function DoctorPanel({
  doctor, onClose, onApprove, onReject, onSuspend, isActing,
}: DoctorPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const open = !!doctor;

  const { data: fullDoctor, isLoading: profileLoading } = useGetAdminDoctor(doctor?.id ?? null);
  const d = fullDoctor ?? doctor;

  useEffect(() => { if (doctor) setTab("overview"); }, [doctor?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px] transition-opacity duration-250",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 z-50 h-full",
          "w-full sm:w-[60vw] max-w-[1100px]",
          "bg-background border-l border-primary/15 flex flex-col shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {d && (
          <>
            {/* ── Header ── */}
            <div className="flex-shrink-0 border-b border-primary/10 bg-card/40">
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 pt-4 pb-3">
                <div>
                  <p className="text-[13px] font-bold text-foreground">Doctor profile</p>
                  <p className="text-[10px] text-muted-foreground/45 mt-0.5">Review details and manage account status</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-[8px] border border-border/45 bg-background/80 flex items-center justify-center hover:bg-accent/40 hover:border-primary/30 transition-all"
                  aria-label="Close"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              {/* Identity strip */}
              <div className="px-6 pb-3 flex items-center gap-4">
                <div className="relative shrink-0">
                  {d.image ? (
                    <img
                      src={storageUrl(d.image)}
                      alt={d.user.name}
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20 border border-primary/15"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px] ring-2 ring-primary/10 border border-primary/20">
                      {getInitials(d.user.name)}
                    </div>
                  )}
                  {d.is_available && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[14px] text-foreground truncate">{d.user.name}</p>
                  <p className="text-[10.5px] text-muted-foreground/45 truncate mt-0.5">
                    {d.specialization ?? d.user.email ?? "—"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border font-semibold",
                    statusStyle[d.status],
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[d.status])} />
                    {d.status}
                  </span>
                  {d.consultation_type && (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border font-medium",
                      consultationStyle[d.consultation_type] ?? "bg-secondary text-foreground border-border/40",
                    )}>
                      {ConsultationIcon[d.consultation_type]}
                      {CONSULTATION_LABELS[d.consultation_type] ?? d.consultation_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex overflow-x-auto px-6 scrollbar-none border-t border-primary/10">
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
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">
              {profileLoading && !fullDoctor ? (
                <PanelSkeleton />
              ) : (
                <div className="px-6 py-5">
                  {tab === "overview"       && <OverviewTab        doctor={d} />}
                  {tab === "appointments"   && <AppointmentsTab    doctorId={d.id} />}
                  {tab === "quick_consults" && <QuickConsultsTab   doctorId={d.id} />}
                  {tab === "education"      && <EducationTab       doctor={d} />}
                  {tab === "experience"     && <ExperienceTab      doctor={d} />}
                  {tab === "qualifications" && <QualificationsTab  doctor={d} />}
                  {tab === "schedule"       && <ScheduleTab        doctor={d} />}
                  {tab === "links"          && <LinksTab           doctor={d} />}
                  {tab === "instant"        && <InstantTab         doctor={d} />}
                  {tab === "certification"  && <CertificationTab   doctor={d} />}
                  {tab === "fees"           && <FeesTab            doctor={d} />}
                  {tab === "wallet"         && <WalletTab          doctorId={d.id} />}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 px-6 py-3.5 border-t border-primary/10 bg-card/40">
              <div className="flex gap-2 items-center max-w-[640px]">
                {(d.status === "pending" || d.status === "rejected") && (
                  <Button size="sm"
                    className="h-9 px-5 text-[11.5px] rounded-[10px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    disabled={isActing} onClick={() => onApprove(d)}>
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    Approve doctor
                  </Button>
                )}
                {d.status === "active" && (
                  <Button size="sm" variant="outline"
                    className="h-9 px-5 text-[11.5px] rounded-[10px] gap-2 font-medium hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={isActing} onClick={() => onSuspend(d)}>
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                    Suspend
                  </Button>
                )}
                {d.status === "pending" && (
                  <Button size="sm" variant="outline"
                    className="h-9 px-5 text-[11.5px] rounded-[10px] gap-2 border-red-300/70 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/20 font-medium"
                    disabled={isActing} onClick={() => onReject(d)}>
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                    Reject
                  </Button>
                )}
                {d.status === "suspended" && (
                  <Button size="sm"
                    className="h-9 px-5 text-[11.5px] rounded-[10px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    disabled={isActing} onClick={() => onApprove(d)}>
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    Reactivate
                  </Button>
                )}
                <Button size="sm" variant="ghost"
                  className="h-9 px-4 text-[11px] rounded-[10px] text-muted-foreground/50 hover:text-primary hover:bg-accent/20"
                  onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
