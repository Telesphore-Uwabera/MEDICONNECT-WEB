import { formatDateOnly } from "@/lib/date";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ShieldOff, ShieldCheck, X, Loader2, Ban,
  Building2, MapPin, Phone, Mail, Globe, Hash,
  Calendar, BadgeCheck, Clock, Stethoscope,
  LayoutGrid, Users, AlertCircle, ChevronRight,
  ExternalLink, CheckCircle2, CalendarDays,
  Wallet, FileText, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiHospital } from "@/hooks/admin/use-admin-hospitals";
import {
  useGetAdminHospital,
  useGetHospitalServiceBookings,
} from "@/hooks/admin/use-admin-hospitals";
import { statusStyle, STATUS_DOT, typeStyle } from "./Styles";
import { getInitials } from "./Utils";

 
export interface HospitalPanelProps {
  hospital: ApiHospital | null;
  onClose: () => void;
  onApprove: (h: ApiHospital) => void;
  onReject: (h: ApiHospital) => void;
  onSuspend: (h: ApiHospital) => void;
  isActing: boolean;
}

type TabId = "overview" | "departments" | "schedule" | "bookings";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Building2 className="w-3 h-3" /> },
  { id: "departments", label: "Departments", icon: <LayoutGrid className="w-3 h-3" /> },
  { id: "schedule", label: "Schedule", icon: <Clock className="w-3 h-3" /> },
  { id: "bookings", label: "Bookings", icon: <CalendarDays className="w-3 h-3" /> },
];

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABEL: Record<string, string> = {
  monday: "Mo", tuesday: "Tu", wednesday: "We", thursday: "Th",
  friday: "Fr", saturday: "Sa", sunday: "Su",
};

const bookingStatusStyle: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/25 dark:text-amber-400 dark:border-amber-800/60",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-400 dark:border-emerald-800/60",
  completed: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/25 dark:text-violet-400 dark:border-violet-800/60",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/25 dark:text-red-400 dark:border-red-800/60",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const paymentStatusStyle: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-400 dark:border-emerald-800/60",
  unpaid: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/25 dark:text-amber-400 dark:border-amber-800/60",
  refunded: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/25 dark:text-violet-400 dark:border-violet-800/60",
};

 
function ContentWrap({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[640px]">{children}</div>;
}

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

function LoadingRow() {
  return (
    <div className="flex flex-col gap-2 animate-pulse max-w-[640px]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 rounded-[6px] bg-accent/20" />
      ))}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="px-6 py-5 space-y-4 animate-pulse max-w-[640px]">
      <div className="h-4 w-20 bg-accent/40 rounded" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-[6px] bg-accent/25" />
        ))}
      </div>
      <div className="h-4 w-16 bg-accent/30 rounded mt-2" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-[6px] bg-accent/15" />
        ))}
      </div>
    </div>
  );
}
 
function OverviewTab({ h }: { h: ApiHospital }) {
  return (
    <ContentWrap>
      <div className="space-y-5">

        {h.description_en && (
          <div className="p-4 rounded-[6px] border border-primary/15 bg-accent/15">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3 h-3 text-primary/50" />
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary/40">About</span>
            </div>
            <p className="text-[12px] text-foreground/60 leading-relaxed">{h.description_en}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Stethoscope className="w-4 h-4 text-primary/50 mx-auto mb-1.5" />, count: h.doctors_count, label: "Doctors" },
            { icon: <LayoutGrid className="w-4 h-4 text-primary/50 mx-auto mb-1.5" />, count: h.departments_count, label: "Depts" },
            { icon: <Users className="w-4 h-4 text-primary/50 mx-auto mb-1.5" />, count: h.services_count, label: "Services" },
          ].map(({ icon, count, label }) => (
            <div key={label} className="p-3.5 rounded-[6px] border border-border/40 bg-card/60 text-center hover:border-primary/30 hover:bg-accent/20 transition-all">
              {icon}
              <p className="text-[22px] font-bold text-foreground tabular-nums leading-none">{count}</p>
              <p className="text-[9px] text-muted-foreground/40 mt-1 font-medium uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Profile */}
        <div>
          <SectionHeading>Profile</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {h.registration_number && (
              <InfoTile icon={<Hash className="w-2.5 h-2.5" />} label="Registration no." value={h.registration_number} mono full />
            )}
            <InfoTile icon={<Hash className="w-2.5 h-2.5" />} label="Hospital ID" value={`#${h.id}`} mono />
            <InfoTile icon={<Calendar className="w-2.5 h-2.5" />} label="Joined" value={formatDateOnly(h.created_at)} />
            {h.verified_at && (
              <InfoTile icon={<BadgeCheck className="w-2.5 h-2.5" />} label="Verified at" value={formatDateOnly(h.verified_at)} />
            )}
            {h.opens_at && h.closes_at && !h.is_open_24h && (
              <InfoTile icon={<Clock className="w-2.5 h-2.5" />} label="Hours" value={`${h.opens_at.slice(0, 5)} - ${h.closes_at.slice(0, 5)}`} />
            )}
            {h.is_open_24h && (
              <InfoTile icon={<Clock className="w-2.5 h-2.5" />} label="Hours" value="Open 24 hours" />
            )}
          </div>
        </div>

        {/* Location */}
        {(h.address || h.city || h.country) && (
          <div>
            <SectionHeading>Location</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              {h.address && <InfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="Address" value={h.address} full />}
              {h.city && <InfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="City" value={h.city} />}
              {h.province && <InfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="Province" value={h.province} />}
              {h.country && <InfoTile icon={<Globe className="w-2.5 h-2.5" />} label="Country" value={h.country} />}
            </div>
          </div>
        )}

        {/* Contact */}
        {(h.phone || h.email || h.website) && (
          <div>
            <SectionHeading>Contact</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              {h.phone && <InfoTile icon={<Phone className="w-2.5 h-2.5" />} label="Phone" value={h.phone} mono />}
              {h.email && <InfoTile icon={<Mail className="w-2.5 h-2.5" />} label="Email" value={h.email} full />}
            </div>
            {h.website && (
              <a
                href={h.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-between p-3 rounded-[6px] border border-border/40 hover:border-primary/30 hover:bg-accent/15 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[6px] bg-accent flex items-center justify-center border border-primary/20">
                    <Globe className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[11.5px] font-medium text-foreground/80 truncate max-w-[240px]">{h.website}</span>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0" />
              </a>
            )}
          </div>
        )}

        {/* Admin account */}
        {h.user && (
          <div>
            <SectionHeading>Admin account</SectionHeading>
            <div className="p-3.5 rounded-[6px] border border-border/40 bg-card/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] border border-primary/20 shrink-0">
                {getInitials(h.user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground truncate">{h.user.name}</p>
                {h.user.email && (
                  <p className="text-[10.5px] text-muted-foreground/50 truncate mt-0.5">{h.user.email}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                {h.user.is_verified && (
                  <Pill variant="emerald"><BadgeCheck className="w-2 h-2" /> Verified</Pill>
                )}
                {h.user.status && (
                  <Pill variant={h.user.status === "active" ? "teal" : "amber"}>{h.user.status}</Pill>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Flags */}
        <div>
          <SectionHeading>Flags</SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {h.is_accepting_bookings && (
              <Pill variant="emerald"><CheckCircle2 className="w-2 h-2" /> Accepting bookings</Pill>
            )}
            {h.is_open_24h && (
              <Pill variant="teal"><Clock className="w-2 h-2" /> Open 24h</Pill>
            )}
            {h.show_homepage && (
              <Pill variant="primary"><Globe className="w-2 h-2" /> On homepage</Pill>
            )}
            {h.registration_fee_paid
              ? <Pill variant="emerald"><Wallet className="w-2 h-2" /> Fee paid</Pill>
              : <Pill variant="amber"><Wallet className="w-2 h-2" /> Fee unpaid</Pill>
            }
            {h.agreement_status && (
              <Pill><span className="capitalize">Agreement: {h.agreement_status}</span></Pill>
            )}
            {!h.is_active && (
              <Pill variant="red"><AlertCircle className="w-2 h-2" /> Inactive</Pill>
            )}
          </div>
        </div>

      </div>
    </ContentWrap>
  );
}
 
function DepartmentsTab({ h }: { h: ApiHospital }) {
  const list = h.departments ?? [];
  if (list.length === 0) return <SectionEmpty label="No departments have been added to this hospital yet" />;

  return (
    <ContentWrap>
      <div className="flex flex-col gap-2.5">
        {list.map((dept) => (
          <div
            key={dept.id}
            className="rounded-[6px] border border-border/40 bg-card/60 overflow-hidden hover:border-primary/25 transition-all duration-150"
          >
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/30 bg-accent/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[6px] bg-primary/10 flex items-center justify-center border border-primary/20">
                  <LayoutGrid className="w-3 h-3 text-primary" />
                </div>
                <p className="text-[12px] font-semibold text-foreground">{dept.name_en}</p>
              </div>
              {dept.services && (
                <Pill>{dept.services.length} service{dept.services.length !== 1 ? "s" : ""}</Pill>
              )}
            </div>

            {dept.services && dept.services.length > 0 && (
              <div className="divide-y divide-border/25">
                {dept.services.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between px-3.5 py-2 hover:bg-accent/10 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight className="w-2.5 h-2.5 text-primary/20 shrink-0" />
                      <span className="text-[11px] text-foreground/70 truncate">{svc.name_en}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono font-semibold text-foreground/80">
                        {Number(svc.price).toLocaleString()} RWF
                      </span>
                      <Pill variant={svc.is_active ? "emerald" : "red"}>
                        {svc.is_active ? "Active" : "Off"}
                      </Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ContentWrap>
  );
}

 
function ScheduleTab({ h }: { h: ApiHospital }) {
  const days = h.working_days ?? [];
  if (days.length === 0) return <SectionEmpty label="No working schedule has been configured" />;

  const byDay = Object.fromEntries(days.map((d) => [d.day_of_week, d]));

  return (
    <ContentWrap>
      <div className="space-y-3">
        {/* Week visual */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_ORDER.map((d) => {
            const isOpen = byDay[d] && !byDay[d].is_closed;
            return (
              <div
                key={d}
                title={d.charAt(0).toUpperCase() + d.slice(1)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-[6px] py-2.5 text-[9px] font-bold",
                  isOpen
                    ? "bg-primary/12 text-primary border border-primary/25"
                    : "bg-muted/15 text-muted-foreground/25 border border-border/15",
                )}
              >
                {DAY_LABEL[d]}
              </div>
            );
          })}
        </div>

        {/* Day detail rows */}
        {DAY_ORDER.filter((d) => byDay[d]).map((d) => {
          const day = byDay[d];
          return (
            <div
              key={d}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-[6px] border transition-all duration-150",
                day.is_closed
                  ? "border-border/25 bg-muted/8 opacity-50"
                  : "border-border/40 bg-card/60 hover:border-primary/25 hover:bg-accent/10",
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  day.is_closed ? "bg-muted-foreground/20" : "bg-emerald-500",
                )} />
                <span className="text-[11px] font-medium text-foreground/70 capitalize">{d}</span>
              </div>
              <div className="flex items-center gap-3">
                {!day.is_closed && day.open_time && day.close_time ? (
                  <span className="text-[11px] font-mono text-foreground/80 tabular-nums">
                    {day.open_time.slice(0, 5)} - {day.close_time.slice(0, 5)}
                  </span>
                ) : (
                  <span className="text-[10.5px] text-muted-foreground/35">Closed</span>
                )}
                {day.max_patients && (
                  <Pill><Users className="w-2 h-2" /> {day.max_patients} max</Pill>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ContentWrap>
  );
}
 
function BookingsTab({ hospitalId }: { hospitalId: number }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useGetHospitalServiceBookings({
    hospital_id: hospitalId,
    status: statusFilter || undefined,
    search: search || undefined,
    page,
  });

  const statuses = ["", "pending", "accepted", "completed", "rejected", "cancelled"];

  return (
    <ContentWrap>
      <div className="space-y-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by patient name..."
          className="w-full h-8 rounded-[6px] border border-border/45 bg-background px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />

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
              {s === "" ? "All" : s}
            </button>
          ))}
        </div>

        {isLoading ? <LoadingRow /> : !data?.data.length ? (
          <SectionEmpty label="No service bookings found for this hospital" />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {data.data.map((booking) => (
                <div
                  key={booking.id}
                  className="p-3.5 rounded-[6px] border border-border/40 bg-card/60 hover:border-primary/25 hover:bg-accent/10 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {booking.patient.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/45 mt-0.5 font-mono">
                        #{booking.id}
                        {booking.preferred_date && <> · {formatDateOnly(booking.preferred_date)}</>}
                        {" · "}{formatDateOnly(booking.created_at)}
                      </p>
                    </div>
                    <span className={cn(
                      "inline-flex items-center text-[9.5px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap capitalize shrink-0",
                      bookingStatusStyle[booking.status] ?? "bg-muted text-muted-foreground border-border",
                    )}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {booking.service_name && (
                      <Pill><Activity className="w-2 h-2" /> {booking.service_name}</Pill>
                    )}
                    {booking.department_name && (
                      <Pill><LayoutGrid className="w-2 h-2" /> {booking.department_name}</Pill>
                    )}
                    {booking.doctor && (
                      <Pill variant="teal">
                        <Stethoscope className="w-2 h-2" />
                        {booking.doctor.name ?? `Dr. #${booking.doctor.id}`}
                      </Pill>
                    )}
                    {booking.payment_status && (
                      <span className={cn(
                        "inline-flex items-center text-[9.5px] px-2 py-0.5 rounded-full border font-medium capitalize",
                        paymentStatusStyle[booking.payment_status] ?? "bg-secondary text-muted-foreground border-border/35",
                      )}>
                        <Wallet className="w-2 h-2 mr-1" />
                        {booking.payment_status}
                      </span>
                    )}
                    {booking.payment_method && (
                      <Pill>{booking.payment_method.replace("_", " ")}</Pill>
                    )}
                    {booking.amount && (
                      <Pill variant="primary">
                        {Number(booking.amount).toLocaleString()} RWF
                      </Pill>
                    )}
                  </div>

                  {booking.notes && (
                    <p className="mt-2 text-[10.5px] text-muted-foreground/45 leading-relaxed border-t border-border/25 pt-2">
                      {booking.notes}
                    </p>
                  )}
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
                    className="h-7 text-[10.5px] px-3 rounded-[6px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Button variant="outline" size="sm"
                    className="h-7 text-[10.5px] px-3 rounded-[6px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
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

 
export function HospitalPanel({
  hospital, onClose, onApprove, onReject, onSuspend, isActing,
}: HospitalPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const open = !!hospital;

  useEffect(() => { if (hospital) setTab("overview"); }, [hospital?.id]);

  const { data: fullHospital, isLoading: profileLoading } = useGetAdminHospital(hospital?.id ?? null);
  const h = fullHospital ?? hospital;

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
          "w-full sm:w-[60vw] max-w-[860px]",
          "bg-background border-l border-primary/15 flex flex-col shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {h && (
          <> 
            <div className="flex-shrink-0 border-b border-primary/10 bg-card/40">

              {/* Top bar */}
              <div className="flex items-center justify-between px-6 pt-4 pb-3">
                <div>
                  <p className="text-[13px] font-bold text-foreground">Hospital profile</p>
                  <p className="text-[10px] text-muted-foreground/45 mt-0.5">Review details and manage account status</p>
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
                <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px] ring-2 ring-primary/10 border border-primary/20 shrink-0">
                  {getInitials(h.name_en)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[14px] text-foreground truncate">{h.name_en}</p>
                  <p className="text-[10.5px] text-muted-foreground/45 truncate mt-0.5">
                    {[h.city, h.country].filter(Boolean).join(", ") || h.user?.name || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border font-semibold",
                    statusStyle[h.status],
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[h.status])} />
                    {h.status}
                  </span>
                  {h.type && (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border font-medium capitalize",
                      typeStyle[h.type] ?? "bg-secondary text-foreground border-border/40",
                    )}>
                      <Building2 className="w-2.5 h-2.5" />
                      {h.type}
                    </span>
                  )}
                  {h.verified_at && (
                    <Pill variant="emerald"><BadgeCheck className="w-2 h-2" /> Verified</Pill>
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
              {profileLoading && !fullHospital ? (
                <PanelSkeleton />
              ) : (
                <div className="px-6 py-5">
                  {tab === "overview" && <OverviewTab h={h} />}
                  {tab === "departments" && <DepartmentsTab h={h} />}
                  {tab === "schedule" && <ScheduleTab h={h} />}
                  {tab === "bookings" && <BookingsTab hospitalId={h.id} />}
                </div>
              )}
            </div>
 
            <div className="flex-shrink-0 px-6 py-3.5 border-t border-primary/10 bg-card/40">
              <div className="flex gap-2 items-center max-w-[640px]">
                {(h.status === "pending" || h.status === "rejected") && (
                  <Button size="sm"
                    className="h-9 px-5 text-[11.5px] rounded-[6px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    disabled={isActing} onClick={() => onApprove(h)}>
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    Approve hospital
                  </Button>
                )}
                {h.status === "active" && (
                  <Button size="sm" variant="outline"
                    className="h-9 px-5 text-[11.5px] rounded-[6px] gap-2 font-medium hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={isActing} onClick={() => onSuspend(h)}>
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                    Suspend
                  </Button>
                )}
                {h.status === "pending" && (
                  <Button size="sm" variant="outline"
                    className="h-9 px-5 text-[11.5px] rounded-[6px] gap-2 border-red-300/70 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/20 font-medium"
                    disabled={isActing} onClick={() => onReject(h)}>
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                    Reject
                  </Button>
                )}
                {h.status === "suspended" && (
                  <Button size="sm"
                    className="h-9 px-5 text-[11.5px] rounded-[6px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    disabled={isActing} onClick={() => onApprove(h)}>
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    Reactivate
                  </Button>
                )}
                <Button size="sm" variant="ghost"
                  className="h-9 px-4 text-[11px] rounded-[6px] text-muted-foreground/50 hover:text-primary hover:bg-accent/20"
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

