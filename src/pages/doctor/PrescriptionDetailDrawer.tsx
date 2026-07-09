import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateOnly } from "@/lib/date";
import {
  X, Pill, Calendar, Clock, Video, MapPin, FileText,
  User, Phone, Mail, QrCode, Download, Send, CheckCircle2,
  Hash, Stethoscope, Building2, ShieldCheck, Loader2,
  AlertCircle, ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RichTextRenderer } from "@/components/ui/rich-textarea";
import { cn } from "@/lib/utils";
import { useGetPrescription, type Prescription, type PrescriptionStatus } from "@/hooks/doctor/use-doctor-prescriptions";
import { openPrescriptionDocument } from "@/lib/prescription-document";
import { usePublicSettings } from "@/hooks/use-public-settings";

 
function fmtDate(raw?: string | null): string {
  if (!raw) return "-";
  try {
    return formatDateOnly(raw, "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return raw; }
}

function fmtDateTime(raw?: string | null): string {
  if (!raw) return "-";
  try {
    return new Date(raw).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return raw; }
}

function fmtTime(raw?: string | null): string {
  if (!raw) return "-";
  try {
    return new Date(raw).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return raw; }
}

function initials(name?: string): string {
  if (!name) return "PT";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

 
const STATUS_STYLES: Partial<Record<PrescriptionStatus, string>> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
  issued: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  sent_to_pharmacy: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  filled: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  active: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  expired: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
};

const STATUS_DOT: Partial<Record<PrescriptionStatus, string>> = {
  draft: "bg-slate-400",
  issued: "bg-sky-500",
  sent_to_pharmacy: "bg-amber-500",
  filled: "bg-emerald-500",
  cancelled: "bg-red-500",
  active: "bg-green-500",
  completed: "bg-emerald-500",
  expired: "bg-orange-500",
};

const statusLabel = (status: string, t: ReturnType<typeof useTranslation>["t"]): string => ({
  draft: t("pages.doctor.rx_status_draft"),
  issued: t("pages.doctor.rx_status_issued"),
  sent_to_pharmacy: t("pages.doctor.rx_status_sent_pharmacy"),
  filled: t("pages.doctor.rx_status_filled"),
  cancelled: t("pages.doctor.rx_status_cancelled"),
  active: t("pages.doctor.rx_status_active"),
  pending: t("pages.doctor.rx_status_pending"),
  dispensed: t("pages.doctor.rx_status_dispensed"),
  expired: t("pages.doctor.rx_status_expired"),
  completed: t("pages.doctor.rx_status_completed"),
  rejected: t("pages.doctor.rx_status_rejected"),
  returned: t("pages.doctor.rx_status_returned"),
}[status] ?? status);
 
function Section({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border/60 rounded-[6px] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-secondary/30 border-b border-border/50">
        <span className="text-muted-foreground/70">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          {title}
        </span>
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  if (value === undefined || value === null || value === "" || value === "-") {
    return null;
  }
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/30 last:border-b-0">
      <span className="text-xs text-muted-foreground/70 font-medium shrink-0 pt-px">{label}</span>
      <span className={cn(
        "text-sm text-foreground text-right",
        mono && "font-mono text-xs",
      )}>
        {value}
      </span>
    </div>
  );
}

 
function DrawerContent({ prescription }: { prescription: Prescription }) {  const { t } = useTranslation();
  const { data: publicSettings } = usePublicSettings();
  const p = prescription;
  const appt = p.appointment;
  const BASE_URL = import.meta.env.VITE_APP_BASE_URL?.replace("/api/v1", "") ?? "";

  return (
    <div className="flex flex-col gap-3">
 
      <div className="flex items-start gap-4 p-4 border border-border/60 rounded-[6px] bg-gradient-to-br from-primary/5 to-transparent">
        <div className="h-12 w-12 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/15 flex-shrink-0">
          {initials(p.patient?.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-base font-semibold text-foreground leading-tight">
                {p.patient?.name ?? t("pages.doctor.patient")}
              </p>
              {p.patient?.email && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Mail className="h-3.5 w-3.5" />{p.patient.email}
                </p>
              )}
              {p.patient?.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {p.patient.country_code} {p.patient.phone}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-2.5 py-0.5 font-semibold border shrink-0",
                STATUS_STYLES[p.status] ?? "bg-secondary/50 text-muted-foreground border-border/60",
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", STATUS_DOT[p.status] ?? "bg-muted-foreground/40")} />
              {statusLabel(p.status, t)}
            </Badge>
          </div>
        </div>
      </div> 
      <Section title={t("pages.doctor.rx_prescription")} icon={<FileText className="h-3 w-3" />}>
        <Row label={t("pages.doctor.number")} value={p.prescription_number} mono />
        <Row label={t("pages.doctor.diagnosis")} value={<span className="font-medium">{p.diagnosis}</span>} />
        <Row label={t("pages.doctor.notes")} value={p.notes ? <RichTextRenderer value={p.notes} className="text-sm text-foreground" /> : undefined} />
        <Row label={t("pages.doctor.valid_until")} value={fmtDate(p.valid_until)} />
        <Row label={t("pages.doctor.rx_signed")} value={
          p.is_signed
            ? <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3 w-3" /> {t("pages.doctor.yes")} - {fmtDateTime(p.signed_at)}
            </span>
            : <span className="text-muted-foreground/50">{t("pages.doctor.rx_not_signed")}</span>
        } />
        <Row label={t("pages.doctor.created")} value={fmtDateTime(p.created_at)} />
        <Row label={t("pages.doctor.updated")} value={fmtDateTime(p.updated_at)} />
      </Section>
 
      <Section title={t("pages.doctor.medications_count", { count: p.items.length })} icon={<Pill className="h-3 w-3" />}>
        <div className="space-y-3">
          {p.items.map((m, i) => (
            <div
              key={m.id ?? i}
              className="border border-border/50 rounded-[6px] p-3.5 bg-secondary/20"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-6 w-6 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/10 flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm font-semibold text-foreground">{m.medicine_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-8">
                {[
                  [t("pages.doctor.dosage"), m.dosage],
                  [t("pages.doctor.frequency"), m.frequency],
                  [t("pages.doctor.duration"), m.duration],
                  [t("pages.doctor.quantity"), String(m.quantity)],
                ].map(([lbl, val]) => val ? (
                  <div key={lbl} className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground/60 w-16 shrink-0">{lbl}</span>
                    <span className="text-sm font-medium text-foreground">{val}</span>
                  </div>
                ) : null)}
                {m.instructions && (
                  <div className="col-span-2 flex items-start gap-1.5 mt-1">
                    <span className="text-xs text-muted-foreground/60 w-16 shrink-0 pt-px">{t("pages.doctor.instructions")}</span>
                    <RichTextRenderer value={m.instructions} className="text-sm text-muted-foreground italic" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
 
      {appt && (
        <Section title={t("pages.doctor.linked_appointment")} icon={<Calendar className="h-3 w-3" />}>
          <Row label={t("pages.doctor.date")} value={fmtDate(appt.appointment_date)} />
          <Row label={t("pages.doctor.time")} value={fmtTime(appt.appointment_time)} />
          <Row label={t("pages.doctor.type")} value={
            <span className="flex items-center gap-1">
              {appt.type === "online"
                ? <><Video className="h-3 w-3 text-sky-500" /> {t("pages.doctor.online")}</>
                : <><MapPin className="h-3 w-3 text-amber-500" /> {t("pages.doctor.in_person")}</>}
            </span>
          } />
          <Row label={t("pages.doctor.status")} value={appt.status} />
          <Row label={t("pages.doctor.booking_type")} value={appt.booking_type} />
          <Row label={t("pages.doctor.duration")} value={appt.duration_minutes ? `${appt.duration_minutes} min` : undefined} />
          <Row label={t("pages.doctor.fee")} value={
            appt.consultation_fee !== "0.00"
              ? `${appt.currency} ${parseFloat(appt.consultation_fee).toLocaleString()}`
              : t("pages.doctor.free")
          } />
          <Row label={t("pages.doctor.payment")} value={
            appt.payment_status === "paid"
              ? <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" /> {t("pages.doctor.paid")}
                {appt.payment_method && ` Â· ${appt.payment_method.replace(/_/g, " ")}`}
              </span>
              : appt.payment_status
          } />
          {appt.payment_reference && (
            <Row label={t("pages.doctor.reference")} value={appt.payment_reference} mono />
          )}
        </Section>
      )}
 
      {p.pharmacy && (
        <Section title={t("pages.doctor.pharmacy")} icon={<Building2 className="h-3 w-3" />}>
          <Row label={t("pages.doctor.name")} value={p.pharmacy.name} />
          <Row label={t("pages.doctor.address")} value={p.pharmacy.address} />
        </Section>
      )}
 
      {(
        <Section title={t("pages.doctor.documents")} icon={<Download className="h-3 w-3" />}>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => openPrescriptionDocument(p, false, publicSettings)}
              className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium border border-border/60 bg-card hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              {t("pages.doctor.view_document")}
            </button>
            <button
              type="button"
              onClick={() => openPrescriptionDocument(p, true, publicSettings)}
              className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium border border-border/60 bg-card hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              {t("pages.doctor.download_pdf")}
            </button>
            {/* {p.qr_code && (
              <a
                href={`${BASE_URL}${p.qr_code}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium border border-border/60 bg-card hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200"
              >
                <QrCode className="h-4 w-4" />
                View QR Code
                <ExternalLink className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />
              </a>
            )} */}
          </div>
        </Section>
      )}

    </div>
  );
}

/* ─────────────────────────────────────────────
   Public component
───────────────────────────────────────────── */ 
interface PrescriptionDetailDrawerProps {
  prescription: Prescription | null;   // pass the list-item directly
  open: boolean;
  onClose: () => void;
}

export function PrescriptionDetailDrawer({
  prescription, open, onClose,
}: PrescriptionDetailDrawerProps) {
  const { t } = useTranslation();
  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Optionally fetch full detail (has more fields than list response)
  const detailQuery = useGetPrescription(
    open && prescription ? prescription.id : 0,
  );

  const p = detailQuery.data?.prescription ?? prescription;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-card border-l border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-[6px] bg-primary/10 flex items-center justify-center border border-primary/15">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{t("pages.doctor.rx_details_title")}</p>
                  {prescription?.prescription_number && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {prescription.prescription_number}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-9 w-9 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {detailQuery.isLoading && !prescription && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{t("pages.doctor.loading_details")}</p>
                </div>
              )}

              {detailQuery.isError && !prescription && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                  <p className="text-sm text-muted-foreground">{t("pages.doctor.rx_details_load_failed")}</p>
                </div>
              )}

              {p && <DrawerContent prescription={p} />}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-border/60 flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-[6px] text-sm font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {t("pages.doctor.close")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PrescriptionDetailDrawer;

