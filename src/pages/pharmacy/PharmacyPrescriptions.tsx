import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";

import { toast as sonnerToast } from "sonner";
import {
  Pill,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  PackageCheck,
  User,
  Stethoscope,
  Truck,
  ShoppingBag,
  QrCode,
  Download,
  ChevronRight,
  Hash,
  CalendarDays,
  FlaskConical,
  BadgeCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";

import {
  useGetPrescriptionRequests,
  useReviewPrescription,
  useApprovePrescription,
  useRejectPrescription,
  useFulfillPrescription,
  type PrescriptionRequest,
  type PrescriptionStatus,
  type PrescriptionItem,
  type ListPrescriptionParams,
} from "@/hooks/pharmacy/use-prescription-requests";
import { formatDateOnly } from "@/lib/date";

 
type SortOption = "date-desc" | "date-asc" | "patient" | "status";

interface FilterState {
  search: string;
  status: PrescriptionStatus | "all";
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  sort: "date-desc",
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "pages.pharmacy.rx_sort_newest" },
  { value: "date-asc", label: "pages.pharmacy.rx_sort_oldest" },
  { value: "patient", label: "pages.pharmacy.rx_sort_patient" },
  { value: "status", label: "pages.pharmacy.status" },
];

 
const STATUS_STYLES: Record<PrescriptionStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  reviewing:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  approved:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  fulfilled:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
};

const STATUS_DOT: Record<PrescriptionStatus, string> = {
  pending: "bg-amber-500",
  reviewing: "bg-sky-500",
  approved: "bg-violet-500",
  rejected: "bg-red-500",
  fulfilled: "bg-emerald-500",
};

const STATUS_LABEL: Record<PrescriptionStatus, string> = {
  pending: "pages.pharmacy.pending",
  reviewing: "pages.pharmacy.reviewing",
  approved: "pages.pharmacy.approved",
  rejected: "pages.pharmacy.rejected",
  fulfilled: "pages.pharmacy.fulfilled",
};

const STATUS_ORDER: Record<PrescriptionStatus, number> = {
  pending: 0,
  reviewing: 1,
  approved: 2,
  rejected: 3,
  fulfilled: 4,
};


function fmtDate(iso?: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "-";
  return formatDateOnly(iso, undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BASE_URL = import.meta.env.VITE_APP_BASE_URL?.replace(/\/api\/v1\/?$/, "") ?? "";

function resolveUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  // Paths like "storage/..." are served via the /storage Netlify proxy rule.
  return `${BASE_URL}/${path.replace(/^\/+/, "")}`;
}
 
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; dot?: string; count?: number }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-[6px] text-[11px] border transition-all duration-200 text-left flex items-center justify-between gap-2",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          <span className="flex items-center gap-2">
            {o.dot && (
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  value === o.value ? "bg-primary-foreground/70" : o.dot,
                )}
              />
            )}
            {o.label}
          </span>
          {o.count !== undefined && o.count > 0 && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
              value === o.value
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground/70",
            )}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

 
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-b-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 shrink-0 mt-0.5 w-28">
        {label}
      </span>
      <span className="text-[11px] text-foreground text-right leading-relaxed">{value ?? "-"}</span>
    </div>
  );
}

function DrawerSection({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3 h-3 text-primary" />
        </div>
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="rounded-[6px] border border-border/50 bg-card/60 px-3">
        {children}
      </div>
    </div>
  );
}

function MedicineRow({ item, index }: { item: PrescriptionItem; index: number }) {
  return (
    <div className="py-3 border-b border-border/40 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div>
            <p className="text-[12px] font-semibold text-foreground">{item.medicine_name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {item.dosage} · {item.frequency} · {item.duration}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[6px] bg-secondary/60 border border-border/40 text-muted-foreground shrink-0">
          qty {item.quantity}
        </span>
      </div>
      {item.instructions && (
        <p className="text-[10px] text-muted-foreground/70 mt-1.5 ml-7 italic">
          {item.instructions}
        </p>
      )}
    </div>
  );
}

function DetailDrawer({
  rx,
  open,
  onClose,
}: {
  rx: PrescriptionRequest | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"summary" | "people" | "medicines" | "documents">("summary");
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setActiveTab("summary");
  }, [open, rx?.id]);

  const pdfUrl = resolveUrl(rx?.prescription?.pdf_url);
  const qrUrl = resolveUrl(rx?.prescription?.qr_code);
  const patient = rx?.prescription?.patient;
  const doctor = rx?.prescription?.doctor;
  const items = rx?.prescription?.items ?? [];
  const detailTabs = [
    { id: "summary" as const, label: t("pages.pharmacy.summary"), icon: FileText },
    { id: "people" as const, label: t("pages.pharmacy.people"), icon: User },
    { id: "medicines" as const, label: `${t("pages.pharmacy.medicines")} (${items.length})`, icon: FlaskConical },
    { id: "documents" as const, label: t("pages.pharmacy.docs_timeline"), icon: CalendarDays },
  ];

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[560px] lg:w-[640px] bg-background border-l border-border/60 shadow-2xl flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">
                {rx?.prescription?.prescription_number ?? `${t("pages.pharmacy.request")} #${String(rx?.id ?? "").padStart(6, "0")}`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {fmtDate(rx?.created_at)} · {rx?.delivery_type === "pickup" ? t("pages.pharmacy.pickup") : t("pages.pharmacy.delivery")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {rx && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1.5 py-0 font-medium border capitalize",
                  STATUS_STYLES[rx.status],
                )}
              >
                <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[rx.status])} />
                {t(STATUS_LABEL[rx.status])}
              </Badge>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[6px] flex items-center justify-center border border-border/60 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {rx && (
            <>
              <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border/60">
                {detailTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-[12px] font-semibold transition-colors",
                        activeTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === "people" && (
                <>
              {/* Patient */}
              <DrawerSection icon={User} title={t("pages.pharmacy.patient")}>
                <DetailRow label={t("pages.pharmacy.name")} value={patient?.name} />
                <DetailRow label={t("pages.pharmacy.email")} value={patient?.email} />
                <DetailRow
                  label={t("pages.pharmacy.phone")}
                  value={patient?.phone
                    ? `${patient.country_code ?? ""} ${patient.phone}`.trim()
                    : null}
                />
              </DrawerSection>

              {/* Doctor */}
              <DrawerSection icon={Stethoscope} title={t("pages.pharmacy.prescribing_doctor")}>
                <DetailRow label={t("pages.pharmacy.name")} value={doctor?.user?.name} />
                <DetailRow label={t("pages.pharmacy.specialization")} value={doctor?.specialization} />
                <DetailRow label={t("pages.pharmacy.degree")} value={doctor?.doctor_degree} />
                <DetailRow label={t("pages.pharmacy.license")} value={doctor?.medical_license} />
              </DrawerSection>
                </>
              )}

              {activeTab === "summary" && (
                <>
              {/* Prescription details */}
              <DrawerSection icon={FileText} title={t("pages.pharmacy.prescription_details")}>
                <DetailRow label={t("pages.pharmacy.rx_number")} value={rx.prescription?.prescription_number} />
                <DetailRow label={t("pages.pharmacy.diagnosis")} value={rx.prescription?.diagnosis} />
                <DetailRow label={t("pages.pharmacy.notes")} value={rx.prescription?.notes} />
                <DetailRow label={t("pages.pharmacy.valid_until")} value={fmtDate(rx.prescription?.valid_until)} />
                <DetailRow
                  label={t("pages.pharmacy.signed")}
                  value={
                    rx.prescription?.is_signed ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 justify-end">
                        <BadgeCheck className="w-3 h-3" />
                        {fmtDate(rx.prescription.signed_at)}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">{t("pages.pharmacy.not_signed")}</span>
                    )
                  }
                />
              </DrawerSection>

              {/* Delivery */}
              <DrawerSection
                icon={rx.delivery_type === "pickup" ? ShoppingBag : Truck}
                title={t("pages.pharmacy.delivery")}
              >
                <DetailRow
                  label={t("pages.pharmacy.delivery_type")}
                  value={rx.delivery_type === "pickup" ? t("pages.pharmacy.pickup_at_pharmacy") : t("pages.pharmacy.home_delivery")}
                />
                {rx.delivery_address && <DetailRow label={t("pages.pharmacy.address")} value={rx.delivery_address} />}
                {rx.notes && <DetailRow label={t("pages.pharmacy.notes")} value={rx.notes} />}
              </DrawerSection>
                </>
              )}

              {activeTab === "medicines" && (
                <>
              {/* Medicines */}
              {items.length > 0 ? (
                <DrawerSection icon={FlaskConical} title={`${t("pages.pharmacy.medicines")} (${items.length})`}>
                  {items.map((item, i) => (
                    <MedicineRow key={item.id} item={item} index={i} />
                  ))}
                </DrawerSection>
              ) : (
                <div className="rounded-[6px] border border-dashed border-border/70 bg-secondary/10 px-4 py-8 text-center">
                  <p className="text-[13px] font-semibold text-foreground">{t("pages.pharmacy.no_medicines_listed")}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("pages.pharmacy.no_medicines_attached")}</p>
                </div>
              )}
                </>
              )}

              {activeTab === "documents" && (
                <>
              {/* Rejection reason */}
              {rx.status === "rejected" && rx.rejection_reason && (
                <DrawerSection icon={XCircle} title={t("pages.pharmacy.rejection_reason")}>
                  <div className="py-3">
                    <p className="text-[11px] text-red-600 dark:text-red-400 leading-relaxed">
                      {rx.rejection_reason}
                    </p>
                  </div>
                </DrawerSection>
              )}

              {/* Review info */}
              {rx.reviewer && (
                <DrawerSection icon={Clock} title={t("pages.pharmacy.review_info")}>
                  <DetailRow label={t("pages.pharmacy.reviewed_by")} value={rx.reviewer.name} />
                  <DetailRow label={t("pages.pharmacy.reviewed_at")} value={fmtDate(rx.reviewed_at)} />
                </DrawerSection>
              )}

              {/* Documents */}
              {(pdfUrl || qrUrl) && (
                <DrawerSection icon={Hash} title={t("pages.pharmacy.documents")}>
                  <div className="py-3 flex flex-col gap-2">
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[11px] font-medium text-primary hover:underline"
                      >
                        <Download className="w-3 h-3" />
                        {t("pages.pharmacy.download_pdf")}
                      </a>
                    )}
                    {qrUrl && (
                      <a
                        href={qrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[11px] font-medium text-primary hover:underline"
                      >
                        <QrCode className="w-3 h-3" />
                        {t("pages.pharmacy.view_qr_code")}
                      </a>
                    )}
                  </div>
                </DrawerSection>
              )}

              {/* Timestamps */}
              <DrawerSection icon={CalendarDays} title={t("pages.pharmacy.timestamps")}>
                <DetailRow label={t("pages.pharmacy.created")} value={`${fmtDate(rx.created_at)} ${fmtTime(rx.created_at)}`} />
                <DetailRow label={t("pages.pharmacy.updated")} value={`${fmtDate(rx.updated_at)} ${fmtTime(rx.updated_at)}`} />
              </DrawerSection>
                </>
              )}
            </>
          )}
        </div>

        {/* Drawer footer  actions */}
        {rx && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 bg-card/50">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">
                {t("pages.pharmacy.request")}{" "}
                <span className="font-mono font-semibold text-foreground">
                  #{String(rx.id).padStart(6, "0")}
                </span>
              </p>
              <PrescriptionActions rx={rx} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
 
function PrescriptionActions({ rx }: { rx: PrescriptionRequest }) {
  const { t, i18n } = useTranslation();
  const review = useReviewPrescription();
  const approve = useApprovePrescription();
  const reject = useRejectPrescription();
  const fulfill = useFulfillPrescription();

  const busy = review.isPending || approve.isPending || reject.isPending || fulfill.isPending;
  const patientName = rx.prescription?.patient?.name ?? "Patient";

  if (rx.status === "pending") {
    return (
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          review.mutate(rx.id, {  
            onSuccess: () => sonnerToast.success(t("pages.pharmacy.marked_reviewing", "Marked as reviewing")),
          })
        }
        variant="outline"
        className="h-7 px-3 text-[10px] rounded-[6px] border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300 dark:border-sky-900 dark:text-sky-400 dark:hover:bg-sky-950/30 transition-all duration-200"
      >
        {review.isPending
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <><Eye className="w-3 h-3 mr-1" />{t("pages.pharmacy.review")}</>}
      </Button>
    );
  }

  if (rx.status === "reviewing") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            reject.mutate(
              { id: rx.id, reason: t("pages.pharmacy.prescription_expired") },
              { onSuccess: () => sonnerToast.success(t("pages.pharmacy.prescription_rejected")) },
            )
          }
          className="h-7 px-3 text-[10px] rounded-[6px] border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200"
        >
          {reject.isPending
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <><XCircle className="w-3 h-3 mr-1" />{t("pages.pharmacy.reject")}</>}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            approve.mutate(rx.id, {
              onSuccess: () => sonnerToast.success(t("pages.pharmacy.prescription_approved")),
            })
          }
          className="h-7 px-3 text-[10px] font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-[6px] shadow-sm transition-all duration-200"
        >
          {approve.isPending
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <><CheckCircle2 className="w-3 h-3 mr-1" />{t("pages.pharmacy.approve")}</>}
        </Button>
      </div>
    );
  }

  if (rx.status === "approved") {
    return (
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          fulfill.mutate(rx.id, {
            onSuccess: () => sonnerToast.success(t("pages.pharmacy.prescription_fulfilled")),
          })
        }
        className="h-7 px-3 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] shadow-sm transition-all duration-200"
      >
        {fulfill.isPending
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <><PackageCheck className="w-3 h-3 mr-1" />{t("pages.pharmacy.fulfill")}</>}
      </Button>
    );
  }

  return null;
}

 
interface TableHeaderProps {
  label: string;
  sortKey?: SortOption;
  currentSort: SortOption;
  onSort: (sort: SortOption) => void;
  align?: "left" | "right";
}

function TableHeader({ label, sortKey, currentSort, onSort, align = "left" }: TableHeaderProps) {
  const isActive = sortKey === currentSort || (sortKey === "date-desc" && currentSort === "date-asc");
  const isAsc = currentSort === "date-asc" || currentSort === "patient";

  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 border-b border-border/60 bg-muted/30 whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
        sortKey && "cursor-pointer hover:text-foreground hover:bg-muted/50 transition-colors select-none",
      )}
      onClick={() => sortKey && onSort(sortKey)}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {label}
        {sortKey && (
          isActive ? (
            isAsc ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />
          )
        )}
      </span>
    </th>
  );
}

/**
 * Table row  shows only the 5 most useful columns:
 * Rx #, Patient, Delivery, Status, Date + Actions
 * Everything else lives in the detail drawer.
 */
function PrescriptionTableRow({
  rx,
  onViewDetails,
  index,
}: {
  rx: PrescriptionRequest;
  onViewDetails: (rx: PrescriptionRequest) => void;
  index: number;
}) {
  const { t } = useTranslation();
  const patient = rx.prescription?.patient;
  const items = rx.prescription?.items ?? [];

  return (
    <tr
      className={cn(
        "group border-b border-border/40 hover:bg-muted/30 transition-colors duration-150 cursor-pointer",
        index % 2 === 0 ? "bg-card" : "bg-card/50",
      )}
      onClick={() => onViewDetails(rx)}
    >
      {/* Rx # */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[6px] bg-primary/8 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 text-primary/70" />
          </div>
          <div>
            <p className="text-[11px] font-mono font-semibold text-foreground">
              #{String(rx.id).padStart(6, "0")}
            </p>
            <p className="text-[9px] text-muted-foreground/60 mt-0.5 max-w-[120px] truncate">
              {rx.prescription?.prescription_number ?? "-"}
            </p>
          </div>
        </div>
      </td>

      {/* Patient */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-secondary/60 flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate max-w-[140px]">
              {patient?.name ?? "-"}
            </p>
            <p className="text-[9px] text-muted-foreground/60 truncate max-w-[140px]">
              {patient?.phone
                ? `${patient.country_code ?? ""} ${patient.phone}`.trim()
                : patient?.email ?? "-"}
            </p>
          </div>
        </div>
      </td>

      {/* Medicines summary */}
      <td className="px-3 py-3 whitespace-nowrap">
        {items.length > 0 ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-[6px] bg-primary/8 border border-primary/15 text-primary/80 font-medium truncate max-w-[100px]">
              {items[0].medicine_name}
            </span>
            {items.length > 1 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-[6px] bg-secondary/50 border border-border/40 text-muted-foreground">
                +{items.length - 1}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">-</span>
        )}
      </td>

      {/* Delivery type */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={cn(
          "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-[6px] border font-medium",
          rx.delivery_type === "pickup"
            ? "bg-secondary/40 border-border/30 text-muted-foreground"
            : "bg-primary/5 border-primary/15 text-primary",
        )}>
          {rx.delivery_type === "pickup"
            ? <><ShoppingBag className="w-2.5 h-2.5" />{t("pages.pharmacy.pickup")}</>
            : <><Truck className="w-2.5 h-2.5" />{t("pages.pharmacy.delivery")}</>}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-3 whitespace-nowrap">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1.5 py-0 font-medium border capitalize",
            STATUS_STYLES[rx.status],
          )}
        >
          <span className={cn(
            "w-1 h-1 rounded-full mr-1",
            STATUS_DOT[rx.status],
            rx.status === "pending" && "animate-pulse",
          )} />
          {t(STATUS_LABEL[rx.status])}
        </Badge>
      </td>

      {/* Date */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="text-[10px] text-muted-foreground">
          <p className="font-medium text-foreground">{fmtDate(rx.created_at)}</p>
          <p className="mt-0.5">{fmtTime(rx.created_at)}</p>
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(rx); }}
            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-[6px] border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
          >
            <Eye className="w-3 h-3" />
            Details
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <PrescriptionActions rx={rx} />
          </div>
        </div>
      </td>
    </tr>
  );
}

 
const PharmacyPrescriptions = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [drawerRx, setDrawerRx] = useState<PrescriptionRequest | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const clearAll = useCallback(() => { setFilters(INITIAL_FILTERS); setPage(1); }, []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  useEffect(() => {
    document.body.style.overflow = filterOpen || drawerRx !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen, drawerRx]);

  useEffect(() => { setPage(1); }, [filters.search, filters.status, filters.sort]);

  const apiParams: ListPrescriptionParams = useMemo(
    () => ({ ...(filters.status !== "all" && { status: filters.status }) }),
    [filters.status],
  );

  const { data, isLoading, isError, refetch } = useGetPrescriptionRequests(apiParams);
  const requests: PrescriptionRequest[] = data?.data ?? [];

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return requests
      .filter((rx) => {
        if (!q) return true;
        const patient = rx.prescription?.patient;
        const doctor = rx.prescription?.doctor;
        return (
          (patient?.name ?? "").toLowerCase().includes(q) ||
          (rx.prescription?.diagnosis ?? "").toLowerCase().includes(q) ||
          (rx.prescription?.prescription_number ?? "").toLowerCase().includes(q) ||
          String(rx.id).includes(q) ||
          (doctor?.user?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "date-asc":
            return (a.created_at ?? "").localeCompare(b.created_at ?? "");
          case "patient":
            return (a.prescription?.patient?.name ?? "").localeCompare(
              b.prescription?.patient?.name ?? "",
            );
          case "status":
            return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          default:
            return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        }
      });
  }, [requests, filters.search, filters.sort]);

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === "pending").length,
    reviewing: requests.filter((r) => r.status === "reviewing").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    fulfilled: requests.filter((r) => r.status === "fulfilled").length,
  }), [requests]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, filtered.length);
 
  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: t("pages.pharmacy.status"),
      value: filters.status,
      options: [
        { value: "all", label: t("pages.pharmacy.all_statuses") },
        { value: "pending", label: t("pages.pharmacy.pending") },
        { value: "reviewing", label: t("pages.pharmacy.reviewing") },
        { value: "approved", label: t("pages.pharmacy.approved") },
        { value: "rejected", label: t("pages.pharmacy.rejected") },
        { value: "fulfilled", label: t("pages.pharmacy.fulfilled") },
      ],
      onChange: (v: string) => set("status", v as any)
    }
  ], [filters.status, set, t]);

 
  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.rx_title", "Prescription Requests")}
          subtitle={t("pages.pharmacy.rx_sub", "Review and fulfill incoming prescriptions")}
        />


        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-4 pt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <StatCard
              label={t("pages.pharmacy.total_requests")}
              value={isLoading ? "-" : requests.length}
              icon={FileText}
              accent="primary"
            />
            <StatCard
              label={t("pages.pharmacy.pending")}
              value={isLoading ? "-" : counts.pending}
              icon={Clock}
              accent="warning"
            />
            <StatCard
              label={t("pages.pharmacy.reviewing")}
              value={isLoading ? "-" : counts.reviewing}
              icon={Eye}
              accent="primary"
            />
            <StatCard
              label={t("pages.pharmacy.approved")}
              value={isLoading ? "-" : counts.approved}
              icon={CheckCircle2}
              accent="success"
            />
            <StatCard
              label={t("pages.pharmacy.fulfilled")}
              value={isLoading ? "-" : counts.fulfilled}
              icon={PackageCheck}
              accent="success"
            />
          </div>

          {/* Meta / toolbar bar */}
          <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </span>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{filtered.length}</span>{" "}
                  {filtered.length === 1 ? "prescription" : "prescriptions"}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </p>
              )}

              {/* Status quick-filter chips */}
              {!isLoading && (
                <div className="hidden lg:flex items-center gap-2">
                  {counts.pending > 0 && (
                    <button onClick={() => set("status", "pending")}
                      className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {counts.pending} pending
                    </button>
                  )}
                  {counts.reviewing > 0 && (
                    <button onClick={() => set("status", "reviewing")}
                      className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      {counts.reviewing} reviewing
                    </button>
                  )}
                  {counts.approved > 0 && (
                    <button onClick={() => set("status", "approved")}
                      className="flex items-center gap-1 text-[10px] font-medium text-violet-700 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200 dark:border-violet-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      {counts.approved} approved
                    </button>
                  )}
                  {counts.fulfilled > 0 && (
                    <button onClick={() => set("status", "fulfilled")}
                      className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {counts.fulfilled} fulfilled
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                title={t("pages.pharmacy.refresh")}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
              </button>

              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => set("search", e.target.value)}
                  placeholder={t("pages.pharmacy.search_patient_rx")}
                  className="w-52 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as SortOption)}
                  className="appearance-none pl-2.5 pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{t(o.label)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
              </div>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>

          <FilterBar
            open={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            fields={filterFields}
            cols={{ default: 1, sm: 2, lg: 3 }}
          />
          {/* Table */}
          <div className="flex-1 p-4">
            {isError && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{t("pages.pharmacy.failed_load_prescriptions")}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{t("pages.pharmacy.check_connection_try_again")}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => refetch()} className="text-[11px] h-7 px-3 rounded-[6px] mt-1">
                  <RefreshCw className="w-3 h-3 mr-1.5" />Retry
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="border border-border/60 rounded-[6px] overflow-hidden">
                <div className="animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border/40 last:border-b-0">
                      <div className="h-8 w-8 rounded-[6px] bg-muted/60" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 rounded bg-muted/60 w-1/3" />
                        <div className="h-2 rounded bg-muted/40 w-1/4" />
                      </div>
                      <div className="h-6 w-16 rounded-[6px] bg-muted/60" />
                      <div className="h-6 w-20 rounded-[6px] bg-muted/60" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && !isError && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Pill className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {hasActiveFilters ? t("pages.pharmacy.no_prescriptions_match") : t("pages.pharmacy.no_prescription_requests")}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {hasActiveFilters ? t("pages.pharmacy.try_widening_search") : t("pages.pharmacy.requests_will_appear")}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {!isLoading && !isError && filtered.length > 0 && (
              <div className="border border-border/60 rounded-[6px] overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <TableHeader label={t("pages.pharmacy.rx_number")} sortKey="date-desc" currentSort={filters.sort} onSort={(s) => set("sort", s)} />
                        <TableHeader label={t("pages.pharmacy.patient")} sortKey="patient" currentSort={filters.sort} onSort={(s) => set("sort", s)} />
                        <TableHeader label={t("pages.pharmacy.medicines")} currentSort={filters.sort} onSort={() => { }} />
                        <TableHeader label={t("pages.pharmacy.delivery")} currentSort={filters.sort} onSort={() => { }} />
                        <TableHeader label={t("pages.pharmacy.status")} sortKey="status" currentSort={filters.sort} onSort={(s) => set("sort", s)} />
                        <TableHeader
                          label={t("pages.pharmacy.date")}
                          sortKey="date-desc"
                          currentSort={filters.sort}
                          onSort={(s) => set("sort", filters.sort === "date-desc" ? "date-asc" : "date-desc")}
                        />
                        <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 border-b border-border/60 bg-muted/30 whitespace-nowrap text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((rx, i) => (
                        <PrescriptionTableRow
                          key={rx.id}
                          rx={rx}
                          onViewDetails={setDrawerRx}
                          index={(page - 1) * pageSize + i}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        Showing{" "}
                        <span className="font-semibold text-foreground">{startItem}</span>-
                        <span className="font-semibold text-foreground">{endItem}</span> of{" "}
                        <span className="font-semibold text-foreground">{filtered.length}</span>
                      </span>
                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-[10px] text-muted-foreground">{t("pages.pharmacy.rows")}</span>
                        <select
                          value={pageSize}
                          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                          className="text-[10px] bg-background border border-border/60 rounded-[6px] px-1.5 py-0.5 outline-none focus:border-primary/50"
                        >
                          {[10, 25, 50, 100].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(1)} disabled={page === 1}
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-0.5 mx-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (page <= 3) pageNum = i + 1;
                          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = page - 2 + i;
                          return (
                            <button key={pageNum} onClick={() => setPage(pageNum)}
                              className={cn(
                                "w-7 h-7 rounded-[6px] flex items-center justify-center text-[10px] font-medium transition-all",
                                page === pageNum
                                  ? "bg-primary text-primary-foreground border border-primary"
                                  : "border border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                              )}>
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <DetailDrawer
        rx={drawerRx}
        open={drawerRx !== null}
        onClose={() => setDrawerRx(null)}
      />
    </DashboardLayout>
  );
};

export default PharmacyPrescriptions;

