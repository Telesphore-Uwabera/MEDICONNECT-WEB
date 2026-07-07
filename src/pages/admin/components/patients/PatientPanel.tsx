import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiPatient } from "@/hooks/admin/use-admin-patients";
import { formatDateOnly } from "@/lib/date";
 import {X, ShieldOff, ShieldCheck, Loader2,
  Phone, Calendar, Globe, Hash, Cake,
  UserCircle, CheckCircle2, BadgeCheck,
  User, MapPin, Droplets, CreditCard,
  HeartPulse, Users, FileText, Activity,
  AlertCircle,
} from "lucide-react";
import { STATUS_STYLE, STATUS_DOT, formatDob, calcAge } from "./Types";
import { PatientConsultationsTab } from "./PatientConsultationsTab";

 
export interface PatientPanelProps {
  patient: ApiPatient | null;
  onClose: () => void;
  onToggleStatus: (p: ApiPatient) => void;
  isActing: boolean;
}

type TabId = "overview" | "medical" | "consultations" | "verification";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <User className="w-3 h-3" /> },
  { id: "medical", label: "Medical", icon: <HeartPulse className="w-3 h-3" /> },
  { id: "consultations", label: "Consultations", icon: <FileText className="w-3 h-3" /> },
  { id: "verification", label: "Verification", icon: <BadgeCheck className="w-3 h-3" /> },
];

 
function InfoTile({
  icon, label, value, full = false, mono = false,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  full?: boolean; mono?: boolean;
}) {
  return (
    <div className={cn(
      "group p-3 rounded-[6px] border border-border/40 bg-card/60",
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-primary/40">{children}</span>
      <div className="flex-1 h-px bg-primary/10" />
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

function Pill({
  children, variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "primary" | "teal" | "amber" | "red" | "emerald" | "violet";
}) {
  const styles: Record<string, string> = {
    default: "bg-secondary/70 text-muted-foreground border-border/35",
    primary: "bg-accent text-accent-foreground border-primary/20",
    teal: "bg-primary/8 text-primary border-primary/20",
    amber: "bg-amber-50 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    red: "bg-red-50 dark:bg-red-950/25 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60",
    emerald: "bg-emerald-50 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
    violet: "bg-violet-50 dark:bg-violet-950/25 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/60",
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

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

 
function OverviewTab({ p }: { p: ApiPatient }) {
  const profile = p.patient;
  return (
    <div className="space-y-5">

      {/* Account */}
      <div>
        <SectionHeading>Account</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          <InfoTile icon={<Hash className="w-2.5 h-2.5" />} label="Patient ID" value={`#${p.id}`} mono />
          <InfoTile icon={<Calendar className="w-2.5 h-2.5" />} label="Joined" value={formatDateOnly(p.created_at)} />
          <InfoTile
            icon={<Phone className="w-2.5 h-2.5" />}
            label="Phone"
            value={`${p.country_code ?? ""} ${p.phone}`.trim()}
            mono
          />
          {p.preferred_language && (
            <InfoTile
              icon={<Globe className="w-2.5 h-2.5" />}
              label="Language"
              value={p.preferred_language === "en" ? "English" : p.preferred_language}
            />
          )}
          {profile?.date_of_birth && (
            <InfoTile
              icon={<Cake className="w-2.5 h-2.5" />}
              label="Date of birth"
              value={`${formatDob(profile.date_of_birth)} (${calcAge(profile.date_of_birth)})`}
              full
            />
          )}
        </div>
      </div>

      {/* Location */}
      {profile && (profile.address || profile.city || profile.country) && (
        <div>
          <SectionHeading>Location</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {profile.address && <InfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="Address" value={profile.address} full />}
            {profile.city && <InfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="City" value={profile.city} />}
            {profile.province && <InfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="Province" value={profile.province} />}
            {profile.country && <InfoTile icon={<Globe className="w-2.5 h-2.5" />} label="Country" value={profile.country} />}
          </div>
        </div>
      )}

      {/* Flags */}
      <div>
        <SectionHeading>Flags</SectionHeading>
        <div className="flex flex-wrap gap-1.5">
          {p.is_verified && (
            <Pill variant="emerald"><BadgeCheck className="w-2 h-2" /> Verified</Pill>
          )}
          {p.phone_verified_at
            ? <Pill variant="teal"><CheckCircle2 className="w-2 h-2" /> Phone verified</Pill>
            : <Pill variant="amber"><AlertCircle className="w-2 h-2" /> Phone unverified</Pill>
          }
          {p.email_verified_at
            ? <Pill variant="teal"><CheckCircle2 className="w-2 h-2" /> Email verified</Pill>
            : <Pill variant="amber"><AlertCircle className="w-2 h-2" /> Email unverified</Pill>
          }
          <Pill variant={p.status === "active" ? "emerald" : p.status === "pending" ? "amber" : "red"}>
            <span className="capitalize">{p.status}</span>
          </Pill>
        </div>
      </div>

      {!profile && <SectionEmpty label="This patient hasn't completed their profile yet" />}
    </div>
  );
}

function MedicalTab({ p }: { p: ApiPatient }) {
  const profile = p.patient;
  if (!profile) return <SectionEmpty label="No medical profile has been set up for this patient" />;

  return (
    <div className="space-y-5">

      {/* Medical details */}
      <div>
        <SectionHeading>Medical info</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          {profile.gender && (
            <InfoTile icon={<UserCircle className="w-2.5 h-2.5" />} label="Gender" value={profile.gender} />
          )}
          {profile.blood_type && (
            <InfoTile icon={<Droplets className="w-2.5 h-2.5" />} label="Blood type" value={profile.blood_type} />
          )}
          {profile.national_id && (
            <InfoTile icon={<CreditCard className="w-2.5 h-2.5" />} label="National ID" value={profile.national_id} mono full />
          )}
        </div>
      </div>

      {/* Insurance */}
      {(profile.insurance_number || profile.insurance_id) && (
        <div>
          <SectionHeading>Insurance</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {profile.insurance_number && (
              <InfoTile icon={<FileText className="w-2.5 h-2.5" />} label="Insurance no." value={profile.insurance_number} mono full />
            )}
            {profile.insurance_id && (
              <InfoTile icon={<Hash className="w-2.5 h-2.5" />} label="Insurance ID" value={`#${profile.insurance_id}`} mono />
            )}
          </div>
        </div>
      )}

      {/* Emergency contact */}
      {profile.emergency_contact_name && (
        <div>
          <SectionHeading>Emergency contact</SectionHeading>
          <div className="p-3.5 rounded-[6px] border border-border/40 bg-card/60 flex items-center gap-3 hover:border-primary/30 hover:bg-accent/20 transition-all">
            <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-[11px] border border-red-200 dark:border-red-800/50 shrink-0">
              {getInitials(profile.emergency_contact_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground truncate">
                {profile.emergency_contact_name}
              </p>
              {profile.emergency_contact_phone && (
                <p className="text-[10.5px] text-muted-foreground/50 font-mono mt-0.5">
                  {profile.emergency_contact_phone}
                </p>
              )}
            </div>
            {profile.emergency_contact_relation && (
              <Pill variant="amber">
                <Users className="w-2 h-2" />
                {profile.emergency_contact_relation}
              </Pill>
            )}
          </div>
        </div>
      )}

      {/* Activity flag */}
      {profile.is_active !== undefined && (
        <div>
          <SectionHeading>Status</SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {profile.is_active
              ? <Pill variant="emerald"><Activity className="w-2 h-2" /> Profile active</Pill>
              : <Pill variant="red"><AlertCircle className="w-2 h-2" /> Profile inactive</Pill>
            }
          </div>
        </div>
      )}
    </div>
  );
}

function VerificationTab({ p }: { p: ApiPatient }) {
  const checks = [
    { label: "Account verified", date: p.is_verified ? p.updated_at : null, always: true },
    { label: "Phone verified", date: p.phone_verified_at },
    { label: "Email verified", date: p.email_verified_at },
  ];

  return (
    <div className="space-y-5">
      <div>
        <SectionHeading>Verification status</SectionHeading>
        <div className="flex flex-col gap-2">
          {checks.map(({ label, date }) => (
            <div
              key={label}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-[6px] border transition-all duration-150",
                date
                  ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/15"
                  : "border-border/40 bg-card/60 opacity-60",
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border",
                  date
                    ? "bg-emerald-500 border-emerald-600 text-white"
                    : "bg-muted border-border/40",
                )}>
                  <CheckCircle2 className="w-2.5 h-2.5" />
                </div>
                <span className="text-[11.5px] font-medium text-foreground/80">{label}</span>
              </div>
              <span className={cn(
                "text-[10.5px] font-medium font-mono",
                date ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/35",
              )}>
                {date ? formatDateOnly(date) : "Not verified"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading>Account timeline</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          <InfoTile
            icon={<Calendar className="w-2.5 h-2.5" />}
            label="Created"
            value={formatDateOnly(p.created_at)}
          />
          <InfoTile
            icon={<Calendar className="w-2.5 h-2.5" />}
            label="Last updated"
            value={formatDateOnly(p.updated_at)}
          />
        </div>
      </div>
    </div>
  );
}

 
export function PatientPanel({ patient, onClose, onToggleStatus, isActing }: PatientPanelProps) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const open = !!patient;

  // Reset tab when a different patient is opened
  useEffect(() => { if (patient) setTab("overview"); }, [patient?.id]);

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
          "w-full sm:w-[460px] lg:w-[500px]",
          "bg-background border-l border-primary/15 flex flex-col shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {patient && (
          <> 
            <div className="flex-shrink-0 border-b border-primary/10 bg-card/40">

              {/* Top bar */}
              <div className="flex items-center justify-between px-6 pt-4 pb-3">
                <div>
                  <p className="text-[13px] font-bold text-foreground">Patient profile</p>
                  <p className="text-[10px] text-muted-foreground/45 mt-0.5">
                    Review details and manage account access
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-[6px] border border-border/45 bg-background/80 flex items-center justify-center hover:bg-accent/40 hover:border-primary/30 transition-all"
                  aria-label="Close"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              {/* Identity strip */}
              <div className="px-6 pb-3 flex items-center gap-4">
                {patient.avatar ? (
                  <img
                    src={patient.avatar}
                    alt={patient.name}
                    className="h-11 w-11 rounded-full object-cover shrink-0 ring-2 ring-primary/10 border border-primary/20"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px] ring-2 ring-primary/10 border border-primary/20 shrink-0">
                    {getInitials(patient.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[14px] text-foreground truncate">{patient.name}</p>
                  <p className="text-[10.5px] text-muted-foreground/45 truncate mt-0.5">{patient.email}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {/* Status badge */}
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border font-semibold",
                    STATUS_STYLE[patient.status],
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[patient.status])} />
                    {patient.status}
                  </span>

                  {/* Role */}
                  <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border font-medium bg-secondary text-foreground border-border/40">
                    <UserCircle className="w-2.5 h-2.5" /> Patient
                  </span>

                  {/* Verified */}
                  {patient.is_verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-400 dark:border-emerald-800/60">
                      <BadgeCheck className="w-2.5 h-2.5" /> Verified
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
 
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5">
                {tab === "overview" && <OverviewTab p={patient} />}
                {tab === "medical" && <MedicalTab p={patient} />}
                {tab === "consultations" && <PatientConsultationsTab patientId={patient.id} />}
                {tab === "verification" && <VerificationTab p={patient} />}
              </div>
            </div>
 
            <div className="flex-shrink-0 px-6 py-3.5 border-t border-primary/10 bg-card/40">
              <div className="flex gap-2 items-center">
                <Button
                  size="sm"
                  variant={patient.status === "active" ? "outline" : "default"}
                  className={cn(
                    "h-9 px-5 text-[11.5px] rounded-[6px] gap-2 font-medium",
                    patient.status === "active"
                      ? "hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white",
                  )}
                  disabled={isActing}
                  onClick={() => onToggleStatus(patient)}
                >
                  {isActing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : patient.status === "active" ? (
                    <ShieldOff className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {patient.status === "active"
                    ? t("admin.users.suspend")
                    : t("admin.users.reactivate")}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-4 text-[11px] rounded-[6px] text-muted-foreground/50 hover:text-primary hover:bg-accent/20"
                  onClick={onClose}
                >
                  {t("admin.common.close")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

