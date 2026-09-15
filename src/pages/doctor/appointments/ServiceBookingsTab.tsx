import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Building2, Stethoscope, CalendarClock, User, Phone, Loader2, CalendarX2, X, FileText,
  MapPin, ChevronRight, Clock, Calendar, HeartPulse, ClipboardList,
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RichTextRenderer } from "@/components/ui/rich-textarea";
import {
  useDoctorServiceBookings,
  useDoctorServiceBooking,
  useCancelServiceBooking,
  type ServiceBooking,
  type ServiceBookingStatus,
} from "@/hooks/doctor/use-doctor-service-booking";
import type { ApiError } from "@/lib/api";
import { MedicalRecordView, PatientFilesPanel, PatientVisitsList } from "./shared/PatientMedicalPanels";


const STATUS_FILTERS: Array<{ value: ServiceBookingStatus | "all"; labelKey: string }> = [
  { value: "all", labelKey: "pages.doctor.all" },
  { value: "pending", labelKey: "pages.doctor.status_pending" },
  { value: "accepted", labelKey: "pages.doctor.status_accepted" },
  { value: "completed", labelKey: "pages.doctor.status_completed" },
  { value: "rejected", labelKey: "pages.doctor.status_rejected" },
  { value: "cancelled", labelKey: "pages.doctor.status_cancelled" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  accepted: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  rejected: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};
const STATUS_DOTS: Record<string, string> = {
  pending: "bg-amber-500",
  accepted: "bg-sky-500",
  completed: "bg-emerald-500",
  rejected: "bg-rose-500",
  cancelled: "bg-muted-foreground",
};

const CANCELLABLE = new Set(["pending", "accepted", "completed", "rejected"]);

const hospitalName = (b: ServiceBooking) => b.hospital?.name_en ?? b.hospital?.name ?? "—";
const hospitalCity = (b: ServiceBooking) => b.hospital?.city ?? "";
const serviceName = (b: ServiceBooking) =>
  b.hospital_service?.name_en ?? b.hospital_service?.name ?? b.service?.name_en ?? b.service?.name ?? "—";
const deptName = (b: ServiceBooking) => b.department?.name_en ?? b.department?.name ?? "";
const patientName = (b: ServiceBooking) => b.patient?.name ?? b.user?.name ?? "—";
const patientPhone = (b: ServiceBooking) => b.patient?.phone ?? b.user?.phone ?? "";

// preferred_date may arrive as a full ISO timestamp — take the date part to
// avoid a timezone day-shift. preferred_time is "HH:mm:ss".
const fmtDate = (d?: string | null) => (d ? dayjs(String(d).slice(0, 10)).format("MMM D, YYYY") : "—");
const fmtTime = (t?: string | null) => {
  if (!t) return "—";
  const parsed = dayjs(`2000-01-01T${String(t).length === 5 ? `${t}:00` : t}`);
  return parsed.isValid() ? parsed.format("h:mm A") : String(t).slice(0, 5);
};

const initials = (name: string) =>
  name.trim().slice(0, 2).toUpperCase() || "PT";

function DetailRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-b-0">
      <div className="flex items-center gap-1.5 shrink-0">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="px-5 py-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
        {icon}
        {title}
      </p>
      <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">{children}</div>
    </div>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  const st = status.toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn("text-xs px-2.5 py-0.5 font-medium border capitalize", STATUS_STYLES[st] ?? "bg-muted text-muted-foreground border-border")}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", STATUS_DOTS[st] ?? "bg-muted-foreground")} />
      {st}
    </Badge>
  );
};

type DrawerTab = "details" | "record" | "visits" | "files";
const DRAWER_TABS: Array<{ id: DrawerTab; labelKey: string; icon: ReactNode }> = [
  { id: "details", labelKey: "pages.doctor.details", icon: <Calendar className="h-4 w-4" /> },
  { id: "record", labelKey: "pages.doctor.record", icon: <HeartPulse className="h-4 w-4" /> },
  { id: "visits", labelKey: "pages.doctor.visits", icon: <Stethoscope className="h-4 w-4" /> },
  { id: "files", labelKey: "pages.doctor.files", icon: <ClipboardList className="h-4 w-4" /> },
];

export function ServiceBookingsTab() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ServiceBookingStatus | "all">("all");
  const [selected, setSelected] = useState<ServiceBooking | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("details");

  const { data: bookings = [], isLoading } = useDoctorServiceBookings(
    status === "all" ? {} : { status },
  );

  // Full detail for the drawer. The list rows are eager-loaded with the nested
  // hospital/service/patient objects, so the row data always wins — the single
  // fetch only fills in fields the row might omit (e.g. notes/created_at).
  const { data: detailData, isFetching: loadingDetail } = useDoctorServiceBooking(selected?.id ?? null);
  const detail: ServiceBooking | null = selected
    ? ({ ...(detailData ?? {}), ...selected } as ServiceBooking)
    : null;

  const drawerPatientId: number | null = detail
    ? ((detail.patient as any)?.id ?? (detail.user as any)?.id ?? (detail as any).patient_id ?? null)
    : null;

  const cancelBooking = useCancelServiceBooking();

  const closeDrawer = () => {
    setSelected(null);
    setConfirming(false);
  };

  const handleCancel = (id: number) => {
    cancelBooking.mutate(id, {
      onSuccess: () => {
        toast.success(t("consult.bookings.cancelled_toast"));
        closeDrawer();
      },
      onError: (err) => {
        const e = err as ApiError;
        toast.error(
          e?.status === 422
            ? e.message || t("consult.bookings.cannot_cancel")
            : e?.message || t("consult.bookings.failed_cancel"),
        );
        setConfirming(false);
      },
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              "px-4 h-9 rounded-full  font-medium border  text-xs transition-colors",
              status === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-[6px] bg-muted/40 border border-border/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && bookings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-16 w-16 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center">
            <CalendarX2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("consult.bookings.empty_title")}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-[280px] leading-relaxed">
              {t("consult.bookings.empty_desc")}
            </p>
          </div>
        </div>
      )}

      {/* Condensed list — click a row for full details */}
      {!isLoading &&
        bookings.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setSelected(b);
              setConfirming(false);
              setDrawerTab("details");
            }}
            className="w-full text-left rounded-[6px] border border-border bg-card p-4 hover:bg-muted/40 hover:border-primary/30 transition-colors flex items-center gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                {hospitalName(b)}
                <span className="text-muted-foreground font-normal truncate">· {serviceName(b)}</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-x-3 gap-y-0.5 flex-wrap mt-1">
                <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{patientName(b)}</span>
                <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />{fmtDate(b.preferred_date)} · {fmtTime(b.preferred_time)}</span>
              </p>
            </div>
            <StatusBadge status={String(b.status)} />
            <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
          </button>
        ))}

      {/* ── Details drawer (matches AppointmentDetailDrawer) ── */}
      {detail && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="relative flex flex-col bg-card border-l border-border shadow-2xl w-full max-w-md h-full overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60 bg-card shrink-0">
              <div className="h-10 w-10 rounded-[6px] bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/10">
                {initials(patientName(detail))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground truncate">{hospitalName(detail)}</p>
                <div className="flex items-center gap-3 mt-1">
                  <StatusBadge status={String(detail.status)} />
                  <span className="text-xs text-muted-foreground">#{detail.id}</span>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="h-8 w-8 rounded-[6px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-3 border-b border-border/60 bg-card shrink-0">
              {DRAWER_TABS.map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setDrawerTab(tabItem.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    drawerTab === tabItem.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tabItem.icon}
                  {t(tabItem.labelKey)}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pt-2">
              {drawerTab === "record" && <div className="px-4 pb-4"><MedicalRecordView patientId={drawerPatientId} /></div>}
              {drawerTab === "visits" && <div className="px-4 pb-4"><PatientVisitsList patientId={drawerPatientId} /></div>}
              {drawerTab === "files" && <div className="px-4 pb-4"><PatientFilesPanel patientId={drawerPatientId} sourceId={detail.id} /></div>}

              {drawerTab === "details" && (
                <>
                  {loadingDetail && (
                    <p className="px-5 text-xs text-muted-foreground flex items-center gap-2 mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> {t("consult.bookings.loading_detail")}
                    </p>
                  )}

                  <Section title={t("consult.bookings.schedule")} icon={<Calendar className="h-4 w-4" />}>
                    <DetailRow label={t("pages.doctor.date")} value={fmtDate(detail.preferred_date)} icon={<Calendar className="h-4 w-4" />} />
                    <DetailRow label={t("pages.doctor.time")} value={fmtTime(detail.preferred_time)} icon={<Clock className="h-4 w-4" />} />
                  </Section>

                  <Section title={t("consult.booking.hospital")} icon={<Building2 className="h-4 w-4" />}>
                    <DetailRow label={t("pages.doctor.name")} value={hospitalName(detail)} />
                    {hospitalCity(detail) && (
                      <DetailRow label={t("pages.doctor.city")} value={
                        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground/60" />{hospitalCity(detail)}</span>
                      } />
                    )}
                  </Section>

                  <Section title={t("consult.booking.service")} icon={<Stethoscope className="h-4 w-4" />}>
                    <DetailRow label={t("pages.doctor.name")} value={serviceName(detail)} />
                    {deptName(detail) && <DetailRow label={t("pages.doctor.department")} value={deptName(detail)} />}
                  </Section>

                  <Section title={t("consult.bookings.patient")} icon={<User className="h-4 w-4" />}>
                    <DetailRow label={t("pages.doctor.name")} value={patientName(detail)} />
                    {patientPhone(detail) && (
                      <DetailRow label={t("pages.doctor.phone")} value={
                        <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-muted-foreground/60" />{patientPhone(detail)}</span>
                      } />
                    )}
                  </Section>

                  {detail.notes && (
                    <Section title={t("consult.booking.notes")} icon={<FileText className="h-4 w-4" />}>
                      <RichTextRenderer value={detail.notes} className="py-1 text-sm text-foreground" />
                    </Section>
                  )}

                  {detail.created_at && (
                    <p className="px-5 pt-2 pb-4 text-xs text-muted-foreground/50 text-center">
                      {t("consult.bookings.created", { date: dayjs(detail.created_at).format("MMM D, YYYY") })}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Cancel */}
            {CANCELLABLE.has(String(detail.status).toLowerCase()) && (
              <div className="px-5 py-4 border-t border-border/60 bg-secondary/20 shrink-0 flex items-center justify-end gap-3">
                {confirming ? (
                  <>
                    <span className="text-xs text-muted-foreground mr-auto">{t("consult.bookings.cancel_confirm")}</span>
                    <button
                      onClick={() => setConfirming(false)}
                      className="h-9 px-4 rounded-[6px] text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
                    >
                      {t("consult.bookings.keep")}
                    </button>
                    <button
                      onClick={() => handleCancel(detail.id)}
                      disabled={cancelBooking.isPending}
                      className="h-9 px-4 rounded-[6px] text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {cancelBooking.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t("consult.bookings.yes_cancel")}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirming(true)}
                    className="h-9 px-4 rounded-[6px] text-sm font-medium border border-border text-muted-foreground hover:text-rose-600 hover:border-rose-300 transition-colors flex items-center gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    {t("consult.booking.cancel")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
