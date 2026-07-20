import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Activity,
  FileText,
  Pill,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  ChevronDown,
  BarChart2,
  Filter,
  Stethoscope,
  ShieldCheck,
  Star,
  Zap,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { useGetPatientStats } from "@/hooks/patient/use-patient-dashboard";
import { usePatientPaymentStatus, useVerifyPatientPayment } from "@/hooks/patient/use-patient-payments";
import { getRefundsFromResponse, useCreatePatientRefund, usePatientRefunds } from "@/hooks/patient/use-patient-refunds";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityChartPoint {
  label: string;
  doctors_seen: number;
  appointments: number;
  completed: number;
  online: number;
  in_person: number;
  spent: number;
}

interface PatientDashboardResponse {
  filters_applied: {
    period: string;
    from: string;
    to: string;
    appointment_type: string;
    status: string;
    search: string | null;
    chart_group: string;
  };
  today: {
    total: number;
    completed: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    instant_active: number;
  };
  period_stats: {
    unique_doctors: number;
    unique_hospitals: number;
    total_appointments: number;
    completed: number;
    cancelled: number;
    pending: number;
    online_count: number;
    in_person_count: number;
    avg_duration_minutes: number;
    instant_total: number;
    instant_completed: number;
    prescriptions_received: number;
    service_bookings_total: number;
    certificates_issued: number;
  };
  spending: {
    total: number;
    previous_period_total: number;
    change_percent: number | null;
    total_insurance_saved: number;
    breakdown: {
      appointments: {
        total: number;
        online: number;
        in_person: number;
        count: number;
        avg_per_appointment: number;
      };
      service_bookings: {
        total: number;
        booking_count: number;
      };
    };
  };
  activity_chart: ActivityChartPoint[];
  instant: {
    total: number;
    completed: number;
    declined: number;
    pending: number;
    active_now: number;
    avg_duration_min: number;
  };
  prescriptions: {
    total: number;
    issued: number;
    draft: number;
    signed: number;
    active: number;
    expiring_soon: number;
    recent: unknown[];
  };
  certificates: {
    total: number;
    issued: number;
    pending: number;
    rejected: number;
    signed: number;
    had_red_flags: number;
    required_inperson: number;
    expiring_soon: number;
  };
  service_bookings: {
    total: number;
    completed: number;
    pending: number;
    accepted: number;
    rejected: number;
    cancelled: number;
    recent: unknown[];
  };
  reviews: {
    total: number;
    avg_rating: number | null;
    approved: number;
    pending: number;
    rejected: number;
    five_star: number;
    four_star: number;
    three_star: number;
    low_star: number;
    pending_review: number;
    recent: unknown[];
  };
  medical_profile: {
    complete: boolean;
    allergies_count: number;
    conditions_count: number;
    medications_count: number;
    surgeries_count: number;
    smoking_status: string;
    alcohol_use: string;
    has_family_history: boolean;
  };
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month" | "year" | "custom";
type AppointmentType = "all" | "online" | "in_person";
type StatusFilter = "all" | "completed" | "pending" | "cancelled";
type ChartGroup = "day" | "week" | "month";

interface Filters {
  period: Period;
  start_date?: string;
  end_date?: string;
  appointment_type: AppointmentType;
  status: StatusFilter;
  chart_group: ChartGroup;
  search: string;
}

// ─── Label Maps ───────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: Filters = {
  period: "month",
  appointment_type: "all",
  status: "all",
  chart_group: "day",
  search: "",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: "primary" | "success" | "warning" | "danger" | "info" | "violet";
  sub?: string;
  loading?: boolean;
}

const accentMap: Record<KpiCardProps["accent"], string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  info: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  violet: "bg-violet-500/10 text-violet-500 border-violet-500/20",
};

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  loading,
}: KpiCardProps) {
  return (
    <div className="rounded-[6px] border border-border/70 bg-card p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide leading-none">
          {label}
        </span>
        <div
          className={cn(
            "w-8 h-8 rounded-[6px] border flex items-center justify-center flex-shrink-0",
            accentMap[accent],
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-16 rounded bg-muted animate-pulse" />
      ) : (
        <div className="flex items-end gap-2">
            <span className=" leading-none font-bold text-foreground text-sm leading-none">
            {value}
          </span>
          {sub && (
            <span className="text-xs text-muted-foreground mb-0.5 leading-none">
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] border border-border/60 bg-card shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-1.5">
        {String(label ?? "")}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function formatMoney(amount?: number | string | null, currency = "RWF") {
  if (amount === null || amount === undefined || amount === "") return "-";
  const numeric = Number(amount);
  const value = Number.isFinite(numeric) ? numeric.toLocaleString() : amount;
  return (currency || "RWF") + " " + value;
}

function formatPaymentDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPaymentReference(payment?: Record<string, unknown> | null) {
  if (!payment) return "-";
  return String(
    payment.reference_number ??
      payment.payment_reference ??
      payment.ref_number ??
      payment.invoice_number ??
      payment.uuid ??
      "-",
  );
}

function normalizeNullableText(value: unknown) {
  return value === null || value === undefined ? "" : String(value).toLowerCase();
}

function displayNullableText(value: unknown, fallback = "-") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function paymentStatusClass(status?: string | null) {
  const normalized = normalizeNullableText(status);
  if (normalized === "paid" || normalized === "success") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
  }
  if (normalized === "failed" || normalized === "cancelled" || normalized === "expired") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-500";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-500";
}

function refundStatusClass(status?: string | null) {
  const normalized = normalizeNullableText(status);
  if (normalized === "approved" || normalized === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
  }
  if (normalized === "rejected") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-500";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-500";
}

function PaymentLookupPanel() {
  const { t } = useTranslation();
  const [paymentUuidInput, setPaymentUuidInput] = useState("");
  const [paymentUuid, setPaymentUuid] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundStatusFilter, setRefundStatusFilter] = useState("all");
  const paymentStatus = usePatientPaymentStatus(paymentUuid);
  const verifyPayment = useVerifyPatientPayment();
  const createRefund = useCreatePatientRefund();
  const refunds = usePatientRefunds(refundStatusFilter === "all" ? undefined : refundStatusFilter);
  const payment = paymentStatus.data?.data;
  const error = paymentStatus.error ?? verifyPayment.error;
  const refundList = getRefundsFromResponse(refunds.data);

  const submitLookup = () => {
    const uuid = paymentUuidInput.trim();
    if (!uuid) return;
    setPaymentUuid(uuid);
  };

  const submitVerify = async () => {
    const uuid = (paymentUuid ?? paymentUuidInput).trim();
    if (!uuid) return;

    setPaymentUuid(uuid);
    try {
      const response = await verifyPayment.mutateAsync(uuid);
      toast.success(t("pages.patient.payment_verify_success"), {
        description: t("pages.patient.payment_status_now", {
          status: response.data?.status ?? "-",
        }),
      });
    } catch (err) {
      toast.error(t("pages.patient.payment_verify_failed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const submitRefund = async () => {
    const uuid = (paymentUuidInput || paymentUuid || "").trim();
    const reason = refundReason.trim();
    if (!uuid || reason.length < 10) return;

    try {
      await createRefund.mutateAsync({ payment_uuid: uuid, reason });
      setRefundReason("");
      toast.success(t("pages.patient.refund_request_success"));
    } catch (err) {
      toast.error(t("pages.patient.refund_request_failed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="rounded-[6px] border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-col gap-1">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          {t("pages.patient.payment_lookup_title")}
        </h2>
        <p className="text-xs font-medium text-muted-foreground/70">
          {t("pages.patient.payment_lookup_sub")}
        </p>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={paymentUuidInput}
            onChange={(event) => setPaymentUuidInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitLookup();
            }}
            placeholder={t("pages.patient.payment_uuid_placeholder")}
            className="h-10 rounded-[6px] text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={submitLookup}
            disabled={!paymentUuidInput.trim() || paymentStatus.isFetching}
            className="h-10 rounded-[6px] sm:w-36"
          >
            {paymentStatus.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {t("pages.patient.payment_check_status")}
          </Button>
          <Button
            type="button"
            onClick={submitVerify}
            disabled={!(paymentUuid ?? paymentUuidInput).trim() || verifyPayment.isPending}
            className="h-10 rounded-[6px] sm:w-36"
          >
            {verifyPayment.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {t("pages.patient.payment_verify")}
          </Button>
        </div>

        {error ? (
          <div className="rounded-[6px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
            {error instanceof Error ? error.message : t("pages.patient.payment_not_found")}
          </div>
        ) : payment ? (
          <div className="grid gap-3 rounded-[6px] border border-border/60 bg-secondary/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("pages.patient.payment_status")}
              </p>
              <Badge
                variant="outline"
                className={cn("mt-2 rounded-[6px] capitalize", paymentStatusClass(payment.status))}
              >
                {displayNullableText(payment.status)}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("pages.patient.payment_amount")}
              </p>
              <p className="mt-2 text-sm font-bold text-foreground">
                {formatMoney(payment.amount, payment.currency ?? "RWF")}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("pages.patient.payment_invoice")}
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-foreground">
                {getPaymentReference(payment)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("pages.patient.paid_at")}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {formatPaymentDate(payment.paid_at)}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[6px] border border-dashed border-border/70 bg-secondary/10 p-5 text-center text-sm text-muted-foreground">
            {t("pages.patient.payment_lookup_empty")}
          </div>
        )}

        <div className="grid gap-4 border-t border-border/60 pt-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[6px] border border-border/70 bg-secondary/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t("pages.patient.refund_request_title")}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("pages.patient.refund_request_sub")}
                </p>
              </div>
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
            </div>
            <label className="mt-4 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("pages.patient.refund_reason_label")}
            </label>
            <textarea
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              placeholder={t("pages.patient.refund_reason_placeholder")}
              rows={4}
              maxLength={500}
              className="mt-2 w-full resize-none rounded-[6px] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                {t("pages.patient.refund_reason_hint")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {refundReason.trim().length}/500
              </span>
            </div>
            <Button
              type="button"
              onClick={submitRefund}
              disabled={
                createRefund.isPending ||
                !(paymentUuidInput || paymentUuid)?.trim() ||
                refundReason.trim().length < 10
              }
              className="mt-4 h-10 w-full rounded-[6px]"
            >
              {createRefund.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              {t("pages.patient.refund_submit")}
            </Button>
          </div>

          <div className="rounded-[6px] border border-border/70 bg-secondary/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {t("pages.patient.refunds_history_title")}
              </h3>
              <select
                value={refundStatusFilter}
                onChange={(event) => setRefundStatusFilter(event.target.value)}
                className="h-9 rounded-[6px] border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none"
              >
                {["all", "pending", "approved", "rejected", "completed"].map((status) => (
                  <option key={status} value={status}>
                    {t(`pages.patient.refund_status_${status}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
              {refunds.isLoading ? (
                <div className="space-y-2">
                  <div className="h-16 rounded-[6px] bg-muted animate-pulse" />
                  <div className="h-16 rounded-[6px] bg-muted animate-pulse" />
                </div>
              ) : refundList.length ? (
                refundList.map((refund) => (
                  <article
                    key={refund.uuid ?? refund.id}
                    className="rounded-[6px] border border-border/70 bg-background/70 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={cn("rounded-[6px] capitalize", refundStatusClass(refund.status))}
                      >
                        {t(`pages.patient.refund_status_${displayNullableText(refund.status, "pending")}`, {
                          defaultValue: displayNullableText(refund.status, "pending"),
                        })}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {t("pages.patient.refund_requested_on", {
                          date: formatPaymentDate(refund.created_at),
                        })}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium leading-5 text-foreground">
                      {refund.reason}
                    </p>
                    {refund.payment && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("pages.patient.refund_payment")}: {" "}
                        <span className="font-semibold text-foreground">
                          {getPaymentReference(refund.payment)}
                        </span>{" "}
                        - {formatMoney(refund.payment.amount, refund.payment.currency ?? "RWF")}
                      </p>
                    )}
                    {refund.admin_note && (
                      <p className="mt-2 rounded-[6px] border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {t("pages.patient.refund_admin_note")}:
                        </span>{" "}
                        {refund.admin_note}
                      </p>
                    )}
                  </article>
                ))
              ) : (
                <div className="rounded-[6px] border border-dashed border-border/70 bg-background/60 p-5 text-center text-sm text-muted-foreground">
                  {t("pages.patient.refund_empty")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const PatientStats = ({ activeTab }: { activeTab: string }) => {
  const { t } = useTranslation();

  const PERIOD_LABELS: Record<Period, string> = {
    today: t("pages.patient.period_today"),
    week: t("pages.patient.period_week"),
    month: t("pages.patient.period_month"),
    year: t("pages.patient.period_year"),
    custom: t("pages.patient.period_custom"),
  };

  const TYPE_LABELS: Record<AppointmentType, string> = {
    all: t("pages.patient.type_all"),
    online: t("pages.patient.type_online"),
    in_person: t("pages.patient.type_in_person"),
  };

  const STATUS_LABELS: Record<StatusFilter, string> = {
    all: t("pages.patient.status_all"),
    completed: t("pages.patient.status_completed"),
    pending: t("pages.patient.status_pending"),
    cancelled: t("pages.patient.status_cancelled"),
  };

  const GROUP_LABELS: Record<ChartGroup, string> = {
    day: t("pages.patient.group_day"),
    week: t("pages.patient.group_week"),
    month: t("pages.patient.group_month"),
  };

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  // Pass filters to hook — query reruns whenever filters change
  const { data: rawData, isLoading, isFetching } = useGetPatientStats(filters);
  const data = rawData as PatientDashboardResponse | undefined;

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  // Debounced search — fires 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        set("search", searchInput);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
  };

  const hasActiveFilters =
    filters.appointment_type !== "all" ||
    filters.status !== "all" ||
    !!filters.search;

  const ps = data?.period_stats;
  const today = data?.today;
  const spending = data?.spending;
  const prescriptions = data?.prescriptions;
  const certificates = data?.certificates;
  const instant = data?.instant;
  const reviews = data?.reviews;
  const medProfile = data?.medical_profile;
  const chartData = data?.activity_chart ?? [];

  const completionRate = useMemo(() => {
    if (!ps?.total_appointments) return 0;
    return Math.round((ps.completed / ps.total_appointments) * 100);
  }, [ps]);

  if (!["overview", "activity", "clinical", "financial"].includes(activeTab)) {
    return null;
  }

  if (activeTab === "overview") {
    const nextSteps = [
      {
        label: t("pages.patient.upcoming_visits"),
        value: today?.confirmed ?? 0,
        hint: t("pages.patient.upcoming_visits_hint"),
        icon: Calendar,
        tone: "text-primary bg-primary/10",
        to: "/patient/appointments",
      },
      {
        label: t("pages.patient.instant_care"),
        value: instant?.active_now ?? today?.instant_active ?? 0,
        hint: t("pages.patient.instant_care_hint"),
        icon: Zap,
        tone: "text-violet-500 bg-violet-500/10",
        to: "/patient/instant",
      },
      {
        label: t("pages.patient.prescriptions_label"),
        value: prescriptions?.active ?? 0,
        hint: t("pages.patient.prescriptions_hint"),
        icon: Pill,
        tone: "text-emerald-500 bg-emerald-500/10",
        to: "/patient/prescriptions",
      },
    ];

    const profileItems = [
      { label: t("pages.patient.allergies"), value: medProfile?.allergies_count ?? 0 },
      { label: t("pages.patient.conditions"), value: medProfile?.conditions_count ?? 0 },
      { label: t("pages.patient.medications"), value: medProfile?.medications_count ?? 0 },
      { label: t("pages.patient.surgeries"), value: medProfile?.surgeries_count ?? 0 },
    ];

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-[6px] border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  {t("pages.patient.tab_care_hub")}
                </p>
                <h2 className="text-lg font-bold text-foreground mt-1">
                  {t("pages.patient.next_care_title")}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("pages.patient.next_care_sub")}
                </p>
              </div>
              <Link
                to="/patient/search-doctors"
                className="h-9 inline-flex items-center justify-center rounded-[6px] bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t("pages.patient.find_care")}
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {nextSteps.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="rounded-[6px] border border-border/60 bg-secondary/20 p-4 hover:border-primary/40 hover:bg-secondary/40 transition-colors"
                  >
                    <div className={cn("h-9 w-9 rounded-[6px] flex items-center justify-center", item.tone)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className=" mt-4 leading-none font-bold text-foreground text-sm">
                      {isLoading ? "..." : item.value}
                    </p>
                    <p className="text-xs font-semibold text-foreground mt-1">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 ">
                      {item.hint}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("pages.patient.medical_profile_eyebrow")}
                </p>
                <h3 className="text-sm font-semibold text-foreground mt-1">
                  {medProfile?.complete ? t("pages.patient.profile_ready") : t("pages.patient.profile_needs_completion")}
                </h3>
              </div>
              <span
                className={cn(
                  "h-9 w-9 rounded-[6px] flex items-center justify-center",
                  medProfile?.complete ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500",
                )}
              >
                {medProfile?.complete ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {profileItems.map((item) => (
                <div key={item.label} className="rounded-[6px] border border-border/60 bg-secondary/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {isLoading ? "..." : item.value}
                  </p>
                </div>
              ))}
            </div>
            <Link
              to="/patient/medical-records"
              className="mt-auto h-9 inline-flex items-center justify-center rounded-[6px] border border-primary/30 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {t("pages.patient.review_medical_info")}
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("pages.patient.this_period")}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { label: t("pages.patient.stat_appointments"), value: ps?.total_appointments ?? 0 },
                { label: t("pages.patient.stat_completed"), value: ps?.completed ?? 0 },
                { label: t("pages.patient.stat_online"), value: ps?.online_count ?? 0 },
                { label: t("pages.patient.stat_in_person"), value: ps?.in_person_count ?? 0 },
              ].map((item) => (
                <div key={item.label}>
                  <p className=" leading-none font-bold text-foreground text-sm leading-none">
                    {isLoading ? "..." : item.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("pages.patient.tab_payments")}
            </p>
            <p className=" leading-none font-bold text-foreground text-sm font-bold text-foreground mt-4 leading-none">
              {isLoading ? "..." : `RWF ${Number(spending?.total ?? 0).toLocaleString()}`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t("pages.patient.total_spent_period")}
            </p>
            <p className="text-xs text-emerald-500 mt-3">
              {t("pages.patient.insurance_saved", { amount: Number(spending?.total_insurance_saved ?? 0).toLocaleString() })}
            </p>
          </div>

          <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("pages.patient.documents_eyebrow")}
            </p>
            <div className="space-y-3 mt-4">
              {[
                { label: t("pages.patient.certificates_issued"), value: certificates?.issued ?? 0, to: "/patient/fitness-certificates" },
                { label: t("pages.patient.service_bookings"), value: ps?.service_bookings_total ?? 0, to: "/patient/service-bookings" },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center justify-between rounded-[6px] border border-border/60 bg-secondary/20 px-3 py-2 hover:border-primary/40"
                >
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-bold text-foreground">{isLoading ? "..." : item.value}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Filter Bar ── */}
      <div className="rounded-[6px] border border-border/70 bg-card shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mr-2">
            <Filter className="w-4 h-4" />
            {t("pages.patient.filters_label")}
          </div>

          {/* Period */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs rounded-[6px] border-border/60 gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                {PERIOD_LABELS[filters.period]}
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <DropdownMenuItem
                  key={p}
                  className={cn(
                    "text-xs",
                    filters.period === p && "text-primary font-semibold",
                  )}
                  onSelect={() => set("period", p)}
                >
                  {PERIOD_LABELS[p]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Custom date range */}
          {filters.period === "custom" && (
            <>
              <Input
                type="date"
                className="h-8 text-xs rounded-[6px] w-32"
                value={filters.start_date ?? ""}
                onChange={(e) => set("start_date", e.target.value)}
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                className="h-8 text-xs rounded-[6px] w-32"
                value={filters.end_date ?? ""}
                onChange={(e) => set("end_date", e.target.value)}
              />
            </>
          )}

          {/* Appointment Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs rounded-[6px] border-border/60 gap-1.5",
                  filters.appointment_type !== "all" &&
                  "border-primary/40 text-primary bg-primary/5",
                )}
              >
                {TYPE_LABELS[filters.appointment_type]}
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(Object.keys(TYPE_LABELS) as AppointmentType[]).map((t) => (
                <DropdownMenuItem
                  key={t}
                  className={cn(
                    "text-xs",
                    filters.appointment_type === t &&
                    "text-primary font-semibold",
                  )}
                  onSelect={() => set("appointment_type", t)}
                >
                  {TYPE_LABELS[t]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs rounded-[6px] border-border/60 gap-1.5",
                  filters.status !== "all" &&
                  "border-primary/40 text-primary bg-primary/5",
                )}
              >
                {STATUS_LABELS[filters.status]}
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
                <DropdownMenuItem
                  key={s}
                  className={cn(
                    "text-xs",
                    filters.status === s && "text-primary font-semibold",
                  )}
                  onSelect={() => set("status", s)}
                >
                  {STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Chart Group */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs rounded-[6px] border-border/60 gap-1.5"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                {GROUP_LABELS[filters.chart_group]}
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(Object.keys(GROUP_LABELS) as ChartGroup[]).map((g) => (
                <DropdownMenuItem
                  key={g}
                  className={cn(
                    "text-xs",
                    filters.chart_group === g &&
                    "text-primary font-semibold",
                  )}
                  onSelect={() => set("chart_group", g)}
                >
                  {GROUP_LABELS[g]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder={t("pages.patient.search_doctor_hospital_placeholder")}
                className={cn(
                  "h-8 pl-8 pr-3 text-xs rounded-[6px] w-48 transition-colors",
                  filters.search && "border-primary/40 bg-primary/5",
                )}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") set("search", searchInput);
                }}
              />
              {searchInput && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchInput("");
                    set("search", "");
                  }}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              className="h-8 px-4 text-xs rounded-[6px]"
              onClick={() => set("search", searchInput)}
            >
              {t("pages.landing.search_action")}
            </Button>
          </div>

          {isFetching && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            <span className="text-xs text-muted-foreground font-medium mr-1">
              {t("pages.patient.active_label")}
            </span>

            {filters.appointment_type !== "all" && (
              <Badge
                variant="secondary"
                className="text-xs h-6 px-2.5 gap-1.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => set("appointment_type", "all")}
              >
                {TYPE_LABELS[filters.appointment_type]}
                <XCircle className="w-3 h-3" />
              </Badge>
            )}

            {filters.status !== "all" && (
              <Badge
                variant="secondary"
                className="text-xs h-6 px-2.5 gap-1.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => set("status", "all")}
              >
                {STATUS_LABELS[filters.status]}
                <XCircle className="w-3 h-3" />
              </Badge>
            )}

            {filters.search && (
              <Badge
                variant="secondary"
                className="text-xs h-6 px-2.5 gap-1.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => {
                  set("search", "");
                  setSearchInput("");
                }}
              >
                &ldquo;{filters.search}&rdquo;
                <XCircle className="w-3 h-3" />
              </Badge>
            )}

            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-2 transition-colors"
            >
              {t("pages.patient.clear_all")}
            </button>
          </div>
        )}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "activity" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* ── Today's Snapshot ── */}
          <div>
            <SectionLabel>{t("pages.patient.today_section")}</SectionLabel>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
              <KpiCard
                label={t("pages.patient.kpi_total")}
                value={today?.total ?? 0}
                icon={Calendar}
                accent="primary"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_completed")}
                value={today?.completed ?? 0}
                icon={CheckCircle2}
                accent="success"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_pending")}
                value={today?.pending ?? 0}
                icon={Clock}
                accent="warning"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_confirmed")}
                value={today?.confirmed ?? 0}
                icon={CheckCircle2}
                accent="info"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_cancelled")}
                value={today?.cancelled ?? 0}
                icon={XCircle}
                accent="danger"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_instant_active")}
                value={today?.instant_active ?? 0}
                icon={Zap}
                accent="violet"
                loading={isLoading}
              />
            </div>
          </div>

          {/* ── Period Stats ── */}
          <div>
            <SectionLabel>
              {t("pages.patient.period_section")} —{" "}
              {filters.period === "custom" &&
                filters.start_date &&
                filters.end_date
                ? `${filters.start_date} → ${filters.end_date}`
                : data?.filters_applied?.from
                  ? `${data.filters_applied.from} → ${data.filters_applied.to}`
                  : PERIOD_LABELS[filters.period]}
            </SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 mb-1.5">
              <KpiCard
                label={t("pages.patient.kpi_total_appointments")}
                value={ps?.total_appointments ?? 0}
                icon={Calendar}
                accent="primary"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_completed")}
                value={ps?.completed ?? 0}
                icon={CheckCircle2}
                accent="success"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_pending")}
                value={ps?.pending ?? 0}
                icon={Clock}
                accent="warning"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_cancelled")}
                value={ps?.cancelled ?? 0}
                icon={XCircle}
                accent="danger"
                loading={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <KpiCard
                label={t("pages.patient.kpi_online_visits")}
                value={ps?.online_count ?? 0}
                icon={Activity}
                accent="info"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_in_person")}
                value={ps?.in_person_count ?? 0}
                icon={Users}
                accent="primary"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_unique_doctors")}
                value={ps?.unique_doctors ?? 0}
                icon={Stethoscope}
                accent="violet"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_completion_rate")}
                value={`${completionRate}%`}
                icon={TrendingUp}
                accent={completionRate >= 70 ? "success" : "warning"}
                loading={isLoading}
              />
            </div>
          </div>

          {/* ── Activity Chart ── */}
          <div className="rounded-[6px] border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {t("pages.patient.appointment_activity")}
                </h2>
                <p className="text-xs font-medium text-muted-foreground/70 mt-1">
                  {PERIOD_LABELS[filters.period]} · {t("pages.patient.grouped_by", { group: normalizeNullableText(GROUP_LABELS[filters.chart_group]) })}
                  {filters.appointment_type !== "all" &&
                    ` · ${TYPE_LABELS[filters.appointment_type]}`}
                  {filters.status !== "all" &&
                    ` · ${STATUS_LABELS[filters.status]}`}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-[6px] border border-border/60 p-1 bg-background/50">
                {(["area", "bar"] as const).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => setChartType(ct)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-[6px] font-bold transition-colors capitalize",
                      chartType === ct
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {ct === "area" ? t("pages.patient.chart_area") : t("pages.patient.chart_bar")}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3 text-center">
                  <BarChart2 className="w-6 h-6 text-muted-foreground/30" />
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("pages.patient.no_chart_data")}
                  </p>
                </div>
              ) : chartType === "area" ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="gCompleted"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.4}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      formatter={(val) => (
                        <span
                          style={{
                            color: "hsl(var(--muted-foreground))",
                            textTransform: "capitalize",
                            fontWeight: 600,
                          }}
                        >
                          {val}
                        </span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="appointments"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#gTotal)"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#gCompleted)"
                    />
                    <Area
                      type="monotone"
                      dataKey="online"
                      stroke="#0ea5e9"
                      strokeWidth={1.5}
                      fill="none"
                      strokeDasharray="4 4"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                    barSize={8}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.4}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      formatter={(val) => (
                        <span
                          style={{
                            color: "hsl(var(--muted-foreground))",
                            textTransform: "capitalize",
                            fontWeight: 600,
                          }}
                        >
                          {val}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="appointments"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="completed"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="online"
                      fill="#0ea5e9"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="in_person"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "financial" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* ── Spending ── */}
          <div>
            <SectionLabel>{t("pages.patient.spending_section")}</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <KpiCard
                label={t("pages.patient.kpi_total_spent")}
                value={`RWF${spending?.total ?? 0}`}
                icon={TrendingUp}
                accent="primary"
                loading={isLoading}
                sub={
                  spending?.change_percent != null
                    ? `${spending.change_percent > 0 ? "+" : ""}${spending.change_percent}% ${t("pages.patient.vs_prev")}`
                    : undefined
                }
              />
              <KpiCard
                label={t("pages.patient.kpi_insurance_saved")}
                value={`RWF${spending?.total_insurance_saved ?? 0}`}
                icon={ShieldCheck}
                accent="success"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_avg_appointment")}
                value={`RWF${spending?.breakdown.appointments.avg_per_appointment ?? 0}`}
                icon={BarChart2}
                accent="info"
                loading={isLoading}
              />
              <KpiCard
                label={t("pages.patient.kpi_service_bookings")}
                value={spending?.breakdown.service_bookings.booking_count ?? 0}
                icon={FileText}
                accent="violet"
                loading={isLoading}
              />
            </div>
          </div>

          <PaymentLookupPanel />
        </div>
      )}

      {activeTab === "clinical" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* ── Instant / Prescriptions / Certificates ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3">
            {/* Instant Consults */}
            <div className="rounded-[6px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded-[6px] bg-amber-500/10">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                {t("pages.patient.instant_consults")}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: t("pages.patient.kpi_total"), val: instant?.total ?? 0 },
                  { label: t("pages.patient.kpi_completed"), val: instant?.completed ?? 0 },
                  { label: t("pages.patient.kpi_pending"), val: instant?.pending ?? 0 },
                  { label: t("pages.patient.kpi_declined"), val: instant?.declined ?? 0 },
                  { label: t("pages.patient.kpi_active_now"), val: instant?.active_now ?? 0 },
                  {
                    label: t("pages.patient.kpi_avg_duration"),
                    val: `${instant?.avg_duration_min ?? 0}m`,
                  },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 border-b border-border/40 pb-2"
                  >
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className="font-bold text-foreground text-sm">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prescriptions */}
            <div className="rounded-[6px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded-[6px] bg-emerald-500/10">
                  <Pill className="w-4 h-4 text-emerald-500" />
                </div>
                {t("pages.patient.prescriptions_section")}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { key: "total", label: t("pages.patient.kpi_total"), val: prescriptions?.total ?? 0 },
                  { key: "active", label: t("pages.patient.kpi_active"), val: prescriptions?.active ?? 0 },
                  { key: "issued", label: t("pages.patient.kpi_issued"), val: prescriptions?.issued ?? 0 },
                  { key: "signed", label: t("pages.patient.kpi_signed"), val: prescriptions?.signed ?? 0 },
                  { key: "draft", label: t("pages.patient.kpi_draft"), val: prescriptions?.draft ?? 0 },
                  {
                    key: "expiring_soon",
                    label: t("pages.patient.kpi_expiring_soon"),
                    val: prescriptions?.expiring_soon ?? 0,
                  },
                ].map(({ key, label, val }) => (
                  <div
                    key={key}
                    className="flex flex-col gap-1 border-b border-border/40 pb-2"
                  >
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span
                      className={cn(
                        "font-bold text-foreground text-sm",
                        key === "expiring_soon" &&
                        (val as number) > 0 &&
                        "text-amber-500",
                      )}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Certificates */}
            <div className="rounded-[6px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded-[6px] bg-sky-500/10">
                  <FileText className="w-4 h-4 text-sky-500" />
                </div>
                {t("pages.patient.certificates_section")}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { key: "total", label: t("pages.patient.kpi_total"), val: certificates?.total ?? 0 },
                  { key: "issued", label: t("pages.patient.kpi_issued"), val: certificates?.issued ?? 0 },
                  { key: "pending", label: t("pages.patient.kpi_pending"), val: certificates?.pending ?? 0 },
                  { key: "signed", label: t("pages.patient.kpi_signed"), val: certificates?.signed ?? 0 },
                  { key: "red_flags", label: t("pages.patient.kpi_red_flags"), val: certificates?.had_red_flags ?? 0 },
                  {
                    key: "req_inperson",
                    label: t("pages.patient.kpi_req_inperson"),
                    val: certificates?.required_inperson ?? 0,
                  },
                ].map(({ key, label, val }) => (
                  <div
                    key={key}
                    className="flex flex-col gap-1 border-b border-border/40 pb-2"
                  >
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span
                      className={cn(
                        "font-bold text-foreground text-sm",
                        key === "red_flags" &&
                        (val as number) > 0 &&
                        "text-rose-500",
                      )}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* ── Reviews & Medical Profile ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
            {/* Reviews */}
            <div className="rounded-[6px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded-[6px] bg-amber-400/10">
                  <Star className="w-4 h-4 text-amber-400" />
                </div>
                {t("pages.patient.reviews_section")}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: t("pages.patient.kpi_total"), val: reviews?.total ?? 0 },
                  {
                    label: t("pages.patient.kpi_avg_rating"),
                    val:
                      reviews?.avg_rating != null
                        ? reviews.avg_rating.toFixed(1)
                        : "—",
                  },
                  { label: t("pages.patient.kpi_5star"), val: reviews?.five_star ?? 0 },
                  { label: t("pages.patient.kpi_4star"), val: reviews?.four_star ?? 0 },
                  { label: t("pages.patient.kpi_3star"), val: reviews?.three_star ?? 0 },
                  {
                    label: t("pages.patient.kpi_pending_review"),
                    val: reviews?.pending_review ?? 0,
                  },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 border-b border-border/40 pb-2"
                  >
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className="font-bold text-foreground text-sm">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Medical Profile */}
            <div className="rounded-[6px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded-[6px] bg-sky-500/10">
                  <Stethoscope className="w-4 h-4 text-sky-500" />
                </div>
                {t("pages.patient.medical_profile_eyebrow")}
                {medProfile?.complete && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/10 rounded-[4px]"
                  >
                    {t("pages.patient.complete_badge")}
                  </Badge>
                )}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: t("pages.patient.allergies"), val: medProfile?.allergies_count ?? 0 },
                  {
                    label: t("pages.patient.conditions"),
                    val: medProfile?.conditions_count ?? 0,
                  },
                  {
                    label: t("pages.patient.medications"),
                    val: medProfile?.medications_count ?? 0,
                  },
                  { label: t("pages.patient.surgeries"), val: medProfile?.surgeries_count ?? 0 },
                  { label: t("pages.patient.kpi_smoking"), val: medProfile?.smoking_status ?? "—" },
                  { label: t("pages.patient.kpi_alcohol"), val: medProfile?.alcohol_use ?? "—" },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 border-b border-border/40 pb-2"
                  >
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className="font-bold text-foreground text-sm capitalize">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
              {medProfile?.has_family_history && (
                <div className="mt-4 p-2.5 rounded-[6px] border border-amber-500/20 bg-amber-500/10 flex items-center gap-2 text-xs font-medium text-amber-600">
                  <AlertTriangle className="w-4 h-4" /> {t("pages.patient.family_history_note")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientStats;
