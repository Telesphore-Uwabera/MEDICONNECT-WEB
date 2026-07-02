import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  Calendar,
  Users,
  FileText,
  Activity,
  Zap,
  ZapOff,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,

} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  useDoctorDashboard,
  type Period,
  type ChartGroup,
} from "@/hooks/doctor/use-doctor-dashboard";
import {
  useCancelDoctorWithdrawal,
  useDoctorWithdrawals,
  useDoctorWallet,
  useDoctorWalletEarnings,
  useRequestDoctorWithdrawal,
} from "@/hooks/doctor/use-doctor-wallet";

// ─── Period picker options ────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  if (value >= 1000) return `RWF${(value / 1000).toFixed(1)}k`;
  return `RWF${value.toFixed(0)}`;
}

function formatMoney(value: unknown, currency = "RWF") {
  const amount = Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${currency} ${safeAmount.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}



function formatPayoutDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function shortLabel(label: string) {
  // "May 25, 2026" → "May 25"  |  "2026-01" → "Jan" etc.
  const parts = label.split(",");
  return parts[0] ?? label;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function getErrMsg(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

function asRecords(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.data)) return asRecords(record.data);
    if ("amount" in record || "requested_amount" in record || "withdrawal_amount" in record) return [record];
  }
  return [];
}

function getFirstField(record: Record<string, unknown>, fields: string[], fallback: unknown = undefined) {
  for (const field of fields) {
    const value = record[field];
    if (value != null && String(value).trim() !== "") return value;
  }
  return fallback;
}

function getPayoutAmount(record: Record<string, unknown>) {
  return getFirstField(record, ["amount", "requested_amount", "withdrawal_amount"], 0);
}

function getPayoutMethod(record: Record<string, unknown>) {
  return String(getFirstField(record, ["method", "payment_method", "withdrawal_method"], "withdrawal")).replace(/_/g, " ");
}

function getPayoutAccountName(record: Record<string, unknown>) {
  return String(getFirstField(record, ["account_name", "recipient_name", "beneficiary_name"], "-"));
}

function getPayoutAccountNumber(record: Record<string, unknown>) {
  return String(getFirstField(record, ["account_number", "phone_number", "recipient_account", "beneficiary_account"], ""));
}

function getPayoutStatus(record: Record<string, unknown>) {
  return String(getFirstField(record, ["status", "request_status"], "pending"));
}

function getPayoutDate(record: Record<string, unknown>) {
  return getFirstField(record, ["created_at", "requested_at", "submitted_at", "updated_at"]);
}

function getPayoutId(record: Record<string, unknown>) {
  return getFirstField(record, ["id", "withdrawal_id", "request_id"]);
}

function isPayoutRequest(record: Record<string, unknown>) {
  const status = getPayoutStatus(record).toLowerCase();
  const type = String(record.type ?? record.kind ?? record.request_type ?? "").toLowerCase();
  return (
    getPayoutAmount(record) != null &&
    (type.includes("withdraw") ||
      type.includes("payout") ||
      "method" in record ||
      "payment_method" in record ||
      "account_number" in record ||
      "account_name" in record ||
      "phone_number" in record ||
      status.includes("pending") ||
      status.includes("requested") ||
      status.includes("processing") ||
      status.includes("approved") ||
      status.includes("completed") ||
      status.includes("cancelled") ||
      status.includes("rejected"))
  );
}

function uniquePayoutRequests(records: Array<Record<string, unknown>>) {
  const seen = new Set<string>();
  return records.filter((record, index) => {
    if (!isPayoutRequest(record)) return false;
    const id = getPayoutId(record);
    const key =
      id != null
        ? `id:${String(id)}`
        : `fallback:${String(getPayoutAmount(record))}:${getPayoutAccountNumber(record)}:${String(getPayoutDate(record) ?? index)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const DoctorOverview = () => {
  const { t, i18n } = useTranslation();

  const {
    data,
    loading,
    error,
    filters,
    updateFilters,
    refresh,
    toggleState,
    toggleLoading,
    toggleInstantConsultation,
    togglePauseBookings,
  } = useDoctorDashboard({ period: "week", chart_group: "day" });
  const { data: wallet, isLoading: walletLoading, isError: walletError } = useDoctorWallet();
  const { data: earnings } = useDoctorWalletEarnings();
  const { data: withdrawals, isLoading: withdrawalsLoading } = useDoctorWithdrawals(15);
  const requestWithdrawal = useRequestDoctorWithdrawal();
  const cancelWithdrawal = useCancelDoctorWithdrawal();

  const [activeTab, setActiveTab] = useState<"overview" | "clinical" | "financial" | "analytics" | "reviews">("overview");
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [localPayoutRequests, setLocalPayoutRequests] = useState<Array<Record<string, unknown>>>([]);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    method: "bank_transfer",
    account_number: "",
    account_name: "",
    note: "",
  });

  useEffect(() => {
    const handleScroll = () => {
      if (!tabsRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    };
    handleScroll();
    window.addEventListener("resize", handleScroll);
    tabsRef.current?.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("resize", handleScroll);
      tabsRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const serverWithdrawals = asRecords(withdrawals);
    const serverIds = new Set(
      serverWithdrawals
        .map((withdrawal) => getPayoutId(withdrawal))
        .filter((id): id is string | number => id != null)
        .map(String),
    );
    const serverFingerprints = new Set(
      serverWithdrawals.map(
        (withdrawal) =>
          `${String(getPayoutAmount(withdrawal))}:${getPayoutMethod(withdrawal)}:${getPayoutAccountNumber(withdrawal)}`,
      ),
    );
    if (serverIds.size === 0 && serverFingerprints.size === 0) return;
    setLocalPayoutRequests((prev) =>
      prev.filter((withdrawal) => {
        const id = getPayoutId(withdrawal);
        const fingerprint = `${String(getPayoutAmount(withdrawal))}:${getPayoutMethod(withdrawal)}:${getPayoutAccountNumber(withdrawal)}`;
        return (id == null || !serverIds.has(String(id))) && !serverFingerprints.has(fingerprint);
      }),
    );
  }, [withdrawals]);

  const scrollBy = (offset: number) => {
    tabsRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };


  // ── Derived values ──────────────────────────────────────────────────────

  const today = data?.today;
  const period = data?.period_stats;
  const revenue = data?.revenue;
  const reviews = data?.reviews;
  const prescriptions = data?.prescriptions;
  const instantStats = data?.instant;

  const patientFlowData = (data?.patient_flow ?? []).map((d) => ({
    ...d,
    day: shortLabel(d.label),
  }));

  const completionData = (data?.completion_rate ?? []).map((d) => ({
    ...d,
    day: shortLabel(d.label),
  }));

  const revenueChangePct = revenue?.change_percent ?? null;
  const revenueUp = revenueChangePct === null ? null : revenueChangePct >= 0;

  const totalRevenue = revenue?.total ?? 0;
  const onlineRevTotal = revenue?.breakdown.online.total ?? 0;
  const inPersonRevTotal = revenue?.breakdown.in_person.total ?? 0;
  const combinedRev = onlineRevTotal + inPersonRevTotal;
  const onlinePct =
    combinedRev > 0 ? Math.round((onlineRevTotal / combinedRev) * 100) : 61;
  const inPersonPct =
    combinedRev > 0 ? Math.round((inPersonRevTotal / combinedRev) * 100) : 39;
  const walletCurrency = "RWF";
  const walletBalance = wallet?.balance ?? 0;
  const todayPending = (today?.pending ?? 0) + (today?.confirmed ?? 0);
  const todayCompleted = today?.completed ?? 0;
  const instantQueue = instantStats?.current_queue ?? 0;

  // ── Quick stats (Today) ─────────────────────────────────────────────────

  const payoutRequests = uniquePayoutRequests([
    ...localPayoutRequests,
    ...asRecords(withdrawals),
  ]);
  const hasPayoutRows = payoutRequests.length > 0;
  const pendingPayoutCount = payoutRequests.filter((withdrawal) => {
    const status = getPayoutStatus(withdrawal).toLowerCase();
    return status.includes("pending") || status.includes("requested") || status.includes("processing");
  }).length;
  const earningsSummary = earnings?.summary;
  const earningsTotal = earningsSummary?.total_earned ?? totalRevenue;
  const earningsAverage = earningsSummary?.average_per_appointment ?? revenue?.avg_per_appointment ?? 0;
  const earningsAppointments = earningsSummary?.total_appointments ?? 0;

  const handleWithdrawalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(withdrawalForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid withdrawal amount.");
      return;
    }

    requestWithdrawal.mutate(
      {
        amount,
        method: withdrawalForm.method,
        account_number: withdrawalForm.account_number.trim(),
        account_name: withdrawalForm.account_name.trim(),
        note: withdrawalForm.note.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          const submittedAt = new Date().toISOString();
          const returnedWithdrawal =
            res && typeof res === "object" && "withdrawal" in res && res.withdrawal && typeof res.withdrawal === "object"
              ? (res.withdrawal as Record<string, unknown>)
              : null;
          setLocalPayoutRequests((prev) => [
            returnedWithdrawal ?? {
              local_id: `local-${submittedAt}-${amount}`,
              kind: "local_withdrawal",
              amount,
              method: withdrawalForm.method,
              account_number: withdrawalForm.account_number.trim(),
              account_name: withdrawalForm.account_name.trim(),
              note: withdrawalForm.note.trim() || undefined,
              status: "pending",
              created_at: submittedAt,
            },
            ...prev,
          ]);
          toast.success("Withdrawal request sent.");
          setWithdrawalForm((prev) => ({ ...prev, amount: "", note: "" }));
          setWithdrawalOpen(false);
        },
        onError: (err) => toast.error(getErrMsg(err, "Could not request withdrawal.")),
      },
    );
  };

  const handleCancelWithdrawal = (id: unknown) => {
    const withdrawalId = Number(id);
    if (!Number.isFinite(withdrawalId)) return;

    cancelWithdrawal.mutate(withdrawalId, {
      onSuccess: () => {
        setLocalPayoutRequests((prev) =>
          prev.filter((withdrawal) => String(getPayoutId(withdrawal)) !== String(withdrawalId)),
        );
        toast.success("Withdrawal request cancelled.");
      },
      onError: (err) => toast.error(getErrMsg(err, "Could not cancel withdrawal.")),
    });
  };

  const quickStats = [
    {
      label: "Completed",
      value: today?.completed ?? 0,
      icon: CheckCircle2,
      color: "text-success bg-success/10",
    },
    {
      label: "Pending",
      value: (today?.pending ?? 0) + (today?.confirmed ?? 0),
      icon: Clock,
      color: "text-warning bg-warning/10",
    },
    {
      label: "Cancelled",
      value: today?.cancelled ?? 0,
      icon: XCircle,
      color: "text-destructive bg-destructive/10",
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub", {
            date: new Date().toLocaleDateString(i18n.language, {
              weekday: "long",
              month: "long",
              day: "numeric",
            }),
          })}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">

            {/* ── Toolbar: period picker + chart group + refresh ── */}
            <div className="flex flex-wrap items-center gap-3">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateFilters({ period: opt.value })}
                  className={cn(
                    "px-4 py-1.5 rounded-[6px] text-xs font-semibold border transition-colors",
                    filters.period === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/60 text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {opt.label}
                </button>
              ))}

              {/* Chart group (day / week / month) */}
              <div className="ml-auto flex items-center gap-2">
                {(["day", "week", "month"] as ChartGroup[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => updateFilters({ chart_group: g })}
                    className={cn(
                      "px-3 py-1.5 rounded-[6px] text-xs border transition-colors capitalize",
                      filters.chart_group === g
                        ? "bg-secondary text-foreground border-border"
                        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {g}
                  </button>
                ))}

                <button
                  onClick={refresh}
                  disabled={loading}
                  className="ml-2 p-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", loading && "animate-spin")}
                  />
                </button>
              </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
              <div className="flex items-center gap-3 rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* ── Scrollable Tabs ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                {
                  label: "Today",
                  value: `${todayPending} waiting`,
                  sub: `${todayCompleted} completed today`,
                  icon: Calendar,
                  tone: "text-primary bg-primary/10 border-primary/20",
                  action: "Open schedule",
                  to: "/doctor/appointments",
                },
                {
                  label: "Instant queue",
                  value: String(instantQueue),
                  sub: toggleState.instant_consultation ? "Visible to patients" : "Hidden from patients",
                  icon: Zap,
                  tone: "text-violet-500 bg-violet-500/10 border-violet-500/20",
                  action: "Manage queue",
                  to: "/doctor/appointments",
                },
                {
                  label: "Wallet",
                  value: walletLoading ? "Loading..." : formatMoney(walletBalance, walletCurrency),
                  sub: "Available balance",
                  icon: Wallet,
                  tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                  action: "Financials",
                  tab: "financial" as const,
                },
                {
                  label: "Prescriptions",
                  value: String(prescriptions?.draft ?? 0),
                  sub: `${prescriptions?.issued ?? 0} issued`,
                  icon: FileText,
                  tone: "text-sky-500 bg-sky-500/10 border-sky-500/20",
                  action: "Open drafts",
                  to: "/doctor/prescriptions",
                },
              ].map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <div className={cn("h-10 w-10 rounded-[6px] border flex items-center justify-center", item.tone)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="text-lg font-bold text-foreground truncate mt-0.5">
                        {item.value}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.sub}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-primary whitespace-nowrap">
                      {item.action}
                    </span>
                  </>
                );

                if ("tab" in item) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => setActiveTab(item.tab)}
                      className="rounded-[6px] border border-border/70 bg-card p-3 shadow-soft flex items-center gap-3 text-left hover:border-primary/40 hover:bg-secondary/20 transition-colors"
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="rounded-[6px] border border-border/70 bg-card p-3 shadow-soft flex items-center gap-3 hover:border-primary/40 hover:bg-secondary/20 transition-colors"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>

            <div className="relative flex items-center border-b border-border/60 mb-4">
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 flex items-center transition-opacity duration-300",
                  showLeftScroll ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
              >
                <button
                  onClick={() => scrollBy(-200)}
                  className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div
                ref={tabsRef}
                className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-px [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full relative z-0"
              >
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                    activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                  )}
                >
                  Today
                </button>
                <button
                  onClick={() => setActiveTab("clinical")}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                    activeTab === "clinical" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                  )}
                >
                  Clinical Records
                </button>
                <button
                  onClick={() => setActiveTab("financial")}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                    activeTab === "financial" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                  )}
                >
                  Financials
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                    activeTab === "analytics" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                  )}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                    activeTab === "reviews" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                  )}
                >
                  Reviews
                </button>
              </div>

              <div
                className={cn(
                  "absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 flex items-center justify-end transition-opacity duration-300",
                  showRightScroll ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
              >
                <button
                  onClick={() => scrollBy(200)}
                  className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {(activeTab === "overview" || activeTab === "analytics") && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === "overview" && (
                  <>
                    <div className="grid lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 rounded-[6px] border border-border/70 bg-card p-5 shadow-soft">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                              Today's Workbench
                            </p>
                            <h3 className="text-lg font-bold text-foreground mt-1">
                              Prioritize the next patient action
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Start with pending appointments, active instant consults, then clinical follow-up.
                            </p>
                          </div>
                          <Link
                            to="/doctor/appointments"
                            className="hidden sm:inline-flex h-8 items-center rounded-[6px] bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            Open appointments
                          </Link>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3">
                          {[
                            { label: "Waiting", value: todayPending, hint: "Pending or confirmed", icon: Clock, tone: "text-warning bg-warning/10" },
                            { label: "Completed", value: todayCompleted, hint: "Done today", icon: CheckCircle2, tone: "text-success bg-success/10" },
                            { label: "Instant queue", value: instantQueue, hint: "Current queue", icon: Zap, tone: "text-violet-500 bg-violet-500/10" },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <div key={item.label} className="rounded-[6px] border border-border/60 bg-secondary/20 p-3">
                                <div className={cn("h-8 w-8 rounded-[6px] flex items-center justify-center", item.tone)}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <p className=" leading-none font-bold text-foreground text-sm mt-3 leading-none">
                                  {item.value}
                                </p>
                                <p className="text-xs font-semibold text-foreground mt-1">
                                  {item.label}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {item.hint}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-soft shadow-soft flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                              Wallet
                            </p>
                            <h3 className="text-sm font-semibold text-foreground mt-1">
                              Available balance
                            </h3>
                          </div>
                          <span className="h-9 w-9 rounded-[6px] bg-primary/15 text-primary flex items-center justify-center">
                            <Wallet className="h-4 w-4" />
                          </span>
                        </div>
                        <p className={cn(" leading-none font-bold text-foreground text-sm tabular-nums", walletLoading && "opacity-40")}>
                          {walletLoading ? "Loading..." : formatMoney(walletBalance, walletCurrency)}
                        </p>
                        <div className="space-y-2">
                          <div className="rounded-[6px] border border-border/60 bg-card/70 p-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                {t("pages.doctor.instant_title")}
                              </p>
                              <p
                                className={cn(
                                  "text-[11px] mt-0.5",
                                  toggleState.instant_consultation ? "text-success" : "text-muted-foreground",
                                )}
                              >
                                {toggleState.instant_consultation
                                  ? t("pages.doctor.instant_visible")
                                  : t("pages.doctor.instant_hidden")}
                              </p>
                            </div>
                            <Switch
                              checked={toggleState.instant_consultation}
                              onCheckedChange={toggleInstantConsultation}
                              disabled={toggleLoading["instant_consultation"]}
                              className="data-[state=checked]:bg-success shrink-0"
                            />
                          </div>

                          <div className="rounded-[6px] border border-border/60 bg-card/70 p-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                Pause bookings
                              </p>
                              <p
                                className={cn(
                                  "text-[11px] mt-0.5",
                                  toggleState.bookings_paused ? "text-warning" : "text-muted-foreground",
                                )}
                              >
                                {toggleState.bookings_paused ? "No new bookings allowed" : "Accepting bookings"}
                              </p>
                            </div>
                            <Switch
                              checked={toggleState.bookings_paused}
                              onCheckedChange={togglePauseBookings}
                              disabled={toggleLoading["bookings_paused"]}
                              className="data-[state=checked]:bg-warning shrink-0"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab("financial")}
                          className="mt-auto h-9 rounded-[6px] border border-primary/30 bg-card/70 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          View financials
                        </button>
                      </div>
                    </div>

                    {/* ── Toggles + today quick stats ── */}
                    {false && (
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        {/* Instant Consultation toggle */}
                        <div
                          className={cn(
                            "rounded-[6px] border p-4 shadow-soft flex flex-col justify-between gap-4",
                            toggleState.instant_consultation
                              ? "bg-success/5 border-success/20"
                              : "bg-card border-border/70",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-[6px] flex items-center justify-center",
                                toggleState.instant_consultation
                                  ? "bg-success/15 text-success"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {toggleState.instant_consultation ? (
                                <Zap className="h-4 w-4" />
                              ) : (
                                <ZapOff className="h-4 w-4" />
                              )}
                            </div>
                            <Switch
                              checked={toggleState.instant_consultation}
                              onCheckedChange={toggleInstantConsultation}
                              disabled={toggleLoading["instant_consultation"]}
                              className="data-[state=checked]:bg-success"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {t("pages.doctor.instant_title")}
                            </p>
                            <p
                              className={cn(
                                "text-xs mt-1",
                                toggleState.instant_consultation
                                  ? "text-success"
                                  : "text-muted-foreground",
                              )}
                            >
                              {toggleState.instant_consultation
                                ? t("pages.doctor.instant_visible")
                                : t("pages.doctor.instant_hidden")}
                            </p>
                          </div>
                        </div>

                        {/* Pause Bookings toggle */}
                        <div
                          className={cn(
                            "rounded-[6px] border p-4 shadow-soft flex flex-col justify-between gap-4",
                            toggleState.bookings_paused
                              ? "bg-warning/5 border-warning/20"
                              : "bg-card border-border/70",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-[6px] flex items-center justify-center",
                                toggleState.bookings_paused
                                  ? "bg-warning/15 text-warning"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {toggleState.bookings_paused ? (
                                <PauseCircle className="h-4 w-4" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                            </div>
                            <Switch
                              checked={toggleState.bookings_paused}
                              onCheckedChange={togglePauseBookings}
                              disabled={toggleLoading["bookings_paused"]}
                              className="data-[state=checked]:bg-warning"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Pause Bookings
                            </p>
                            <p
                              className={cn(
                                "text-xs mt-1",
                                toggleState.bookings_paused
                                  ? "text-warning"
                                  : "text-muted-foreground",
                              )}
                            >
                              {toggleState.bookings_paused
                                ? "No new bookings allowed"
                                : "Accepting bookings"}
                            </p>
                          </div>
                        </div>

                        {/* Today quick stats */}
                        {quickStats.map((s) => {
                          const Icon = s.icon;
                          return (
                            <div
                              key={s.label}
                              className="rounded-[6px] border border-border/70 bg-card p-4 shadow-soft flex items-center gap-4"
                            >
                              <div
                                className={cn(
                                  "h-10 w-10 rounded-[6px] flex items-center justify-center flex-shrink-0",
                                  s.color,
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <p
                                  className={cn(
                                    " leading-none font-bold text-foreground text-sm tabular-nums leading-none",
                                    loading && "opacity-40",
                                  )}
                                >
                                  {s.value}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Today · {s.label}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </>
                )}

                {activeTab === "analytics" && (
                  <>
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          Analytics
                        </p>
                        <h3 className="text-sm font-semibold text-foreground mt-1">
                          Patient flow and period summary
                        </h3>
                      </div>
                    </div>

                    {/* ── Main grid ── */}
                    <div className="grid lg:grid-cols-3 gap-4">
                      {/* Patient flow chart */}
                      <div className="lg:col-span-2 rounded-[6px] border border-border/70 bg-card p-5 shadow-soft">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-foreground">
                            {t("pages.doctor.patient_flow")}
                          </h3>
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                              Patients
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="w-2.5 h-2.5 rounded-full bg-info inline-block" />
                              Consults
                            </span>
                          </div>
                        </div>
                        {loading ? (
                          <div className="h-[200px] flex items-center justify-center">
                            <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
                          </div>
                        ) : patientFlowData.length === 0 ? (
                          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                            No data for this period
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={patientFlowData}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                              />
                              <XAxis
                                dataKey="day"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                width={24}
                                allowDecimals={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  padding: "5px 8px",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="patients"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={{ fill: "hsl(var(--primary))", r: 2.5 }}
                                activeDot={{ r: 4 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="consultations"
                                stroke="hsl(var(--info))"
                                strokeWidth={1.5}
                                dot={false}
                                strokeDasharray="4 3"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      {/* Period summary card */}
                      <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-soft flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-foreground mb-1">
                          Period Summary
                        </h3>

                        {[
                          {
                            label: "Total Appointments",
                            value: period?.total_appointments ?? 0,
                          },
                          { label: "Completed", value: period?.completed ?? 0 },
                          { label: "Pending", value: period?.pending ?? 0 },
                          { label: "Cancelled", value: period?.cancelled ?? 0 },
                          { label: "Online", value: period?.online_count ?? 0 },

                        ].map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                          >
                            <span className="text-xs text-muted-foreground">
                              {row.label}
                            </span>
                            <span
                              className={cn(
                                "text-sm font-semibold text-foreground tabular-nums",
                                loading && "opacity-40",
                              )}
                            >
                              {row.value}
                            </span>
                          </div>
                        ))}

                        {/* Instant stats */}
                        {instantStats && (
                          <div className="mt-2 pt-3 border-t border-border/40">
                            <p className="text-sm font-semibold text-foreground mb-3">
                              Instant Consultations
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: "Total", value: instantStats.total },
                                { label: "Done", value: instantStats.completed },
                                { label: "Queue", value: instantStats.current_queue },
                              ].map((s) => (
                                <div
                                  key={s.label}
                                  className="rounded-[6px] bg-secondary/40 px-3 py-2 text-center"
                                >
                                  <p
                                    className={cn(
                                      "text-base font-bold tabular-nums",
                                      loading && "opacity-40",
                                    )}
                                  >
                                    {s.value}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {s.label}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </>
                )}
              </div>
            )}

            {activeTab === "clinical" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* ── Stats strip (period) ── */}
                {/* loading prop removed — StatCard doesn't accept it */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <StatCard
                    label={t("pages.doctor.stat_today")}
                    value={today?.total ?? 0}
                    icon={Calendar}
                    accent="primary"
                  />
                  <StatCard
                    label="Unique Patients"
                    value={period?.unique_patients ?? 0}
                    icon={Users}
                    accent="info"
                  />
                  <StatCard
                    label="Prescriptions"
                    value={prescriptions?.issued ?? 0}
                    icon={FileText}
                    accent="success"
                  />
                  <StatCard
                    label="Instant Queue"
                    value={instantStats?.current_queue ?? 0}
                    icon={Activity}
                    accent="warning"
                  />
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                  {/* Completion rate bar chart */}
                  <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-soft">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Appointment Completion
                      </h3>
                      {completionData.length > 0 &&
                        (() => {
                          const avg =
                            completionData.reduce((s, d) => s + d.rate, 0) /
                            completionData.length;
                          return (
                            <span className="text-xs font-semibold text-muted-foreground">
                              avg {avg.toFixed(0)}%
                            </span>
                          );
                        })()}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Completion rate · {filters.period}
                    </p>
                    {loading ? (
                      <div className="h-[110px] flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                      </div>
                    ) : completionData.length === 0 ? (
                      <div className="h-[110px] flex items-center justify-center text-sm text-muted-foreground">
                        No data
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={110}>
                        <BarChart data={completionData} barSize={18}>
                          <XAxis
                            dataKey="day"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 4,
                              fontSize: 10,
                              padding: "4px 8px",
                            }}
                            formatter={(v: number) => [`${v}%`, "Rate"]}
                          />
                          {completionData.map((entry, i) => (
                            <Bar key={i} dataKey="rate" radius={[3, 3, 0, 0]}>
                              <Cell
                                key={i}
                                fill={
                                  entry.rate >= 90
                                    ? "hsl(var(--success))"
                                    : entry.rate >= 60
                                      ? "hsl(var(--primary))"
                                      : "hsl(var(--warning))"
                                }
                                fillOpacity={0.85}
                              />
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid lg:grid-cols-3 gap-4">
                  {/* Rating & reviews */}
                  <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-soft">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        Recent Reviews
                      </h3>
                      {reviews?.all_time_avg != null && (
                        <div className="flex items-center gap-1.5 bg-warning/10 px-2.5 py-1 rounded-[6px]">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          <span className="text-sm font-bold text-foreground">
                            {reviews.all_time_avg.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {reviews?.recent && reviews.recent.length > 0 ? (
                      <div className="space-y-3">
                        {reviews.recent.map((r, i) => (
                          <div
                            key={r.id ?? i}
                            className="flex items-start gap-3 p-3 rounded-[6px] bg-secondary/30 border border-border/20"
                          >
                            <div className="h-8 w-8 rounded-[6px] bg-primary-soft text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {r.patient_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                  {r.patient_name}
                                </p>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {new Date(r.created_at).toLocaleDateString(
                                    undefined,
                                    { month: "short", day: "numeric" },
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {Array.from({ length: 5 }).map((_, j) => (
                                  <Star
                                    key={j}
                                    className={cn(
                                      "h-3 w-3",
                                      j < r.rating
                                        ? "fill-warning text-warning"
                                        : "text-border",
                                    )}
                                  />
                                ))}
                              </div>
                              {r.comment && (
                                <p className="text-xs text-muted-foreground mt-1.5 truncate">
                                  {r.comment}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[100px] gap-2">
                        <Star className="h-6 w-6 text-border" />
                        <p className="text-sm text-muted-foreground">
                          No reviews yet
                        </p>
                        {reviews?.period.avg_rating != null && (
                          <p className="text-xs text-muted-foreground">
                            Period avg: {reviews.period.avg_rating.toFixed(1)}★
                          </p>
                        )}
                      </div>
                    )}

                    {/* Star breakdown mini-bars */}
                    {reviews && reviews.period.total > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                        {[
                          { label: "5★", value: reviews.period.five_star },
                          { label: "4★", value: reviews.period.four_star },
                          { label: "3★", value: reviews.period.three_star },
                          { label: "1-2★", value: reviews.period.low_star },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-8">
                              {row.label}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-warning/70"
                                style={{
                                  width: `${(row.value / reviews.period.total) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-4 text-right">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {activeTab === "financial" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid lg:grid-cols-3 gap-4">
                  {/* Wallet balance */}
                  <div className="rounded-[6px] border border-border/70 bg-card  shadow-soft  p-5 shadow-soft flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        Wallet Balance
                      </h3>
                      <span className="h-9 w-9 rounded-[6px] bg-primary/15 text-primary flex items-center justify-center">
                        <Wallet className="h-4 w-4" />
                      </span>
                    </div>

                    <div>
                      <p
                        className={cn(
                          "text-3xl font-bold text-foreground tabular-nums leading-none",
                          walletLoading && "opacity-40",
                        )}
                      >
                        {walletLoading ? "Loading..." : formatMoney(walletBalance, walletCurrency)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Available for withdrawal
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <div className="rounded-[6px] bg-card/70 border border-border/60 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Pending requests
                        </p>
                        <p className="text-sm font-bold text-foreground mt-1">
                          {withdrawalsLoading ? "..." : pendingPayoutCount}
                        </p>
                      </div>
                      <div className="rounded-[6px] bg-card/70 border border-border/60 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Last withdrawn
                        </p>
                        <p className="text-sm font-bold text-foreground mt-1">
                          {formatPayoutDate(wallet?.last_withdrawn)}
                        </p>
                      </div>
                    </div>

                    {walletError && (
                      <p className="text-xs text-destructive">
                        Could not load wallet balance.
                      </p>
                    )}
                  </div>

                  {/* Revenue summary */}
                  <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-soft flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        Earnings
                      </h3>
                      {revenueChangePct !== null && (
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs font-semibold",
                            revenueUp ? "text-success" : "text-destructive",
                          )}
                        >
                          {revenueUp ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {formatPct(revenueChangePct)}
                        </span>
                      )}
                    </div>

                    <div>
                      <p
                        className={cn(
                          "text-3xl font-bold text-foreground tabular-nums leading-none",
                          loading && "opacity-40",
                        )}
                      >
                        {formatMoney(earningsTotal, walletCurrency)}
                      </p>
                      {earningsSummary?.last_appointment_at ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          Last appointment {formatPayoutDate(earningsSummary.last_appointment_at)}
                        </p>
                      ) : revenue && revenue.previous_period_total > 0 ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          vs {formatCurrency(revenue.previous_period_total)} prev
                          period
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-3 mt-auto">
                      {[
                        {
                          label: "Completed appointments",
                          value: formatMoney(earningsTotal, walletCurrency),
                          count: String(earningsAppointments),
                          pct: onlinePct,
                        },
                        {
                          label: "Wallet balance",
                          value: formatMoney(walletBalance, walletCurrency),
                          count: "available",
                          pct: inPersonPct,
                        },
                      ].map((row) => (
                        <div key={row.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-muted-foreground">
                              {row.label}
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              {row.value}
                              <span className="text-muted-foreground font-normal ml-1">
                                ({row.count})
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Avg per consultation
                      </span>
                      <span
                        className={cn(
                          "text-sm font-bold text-foreground",
                          loading && "opacity-40",
                        )}
                      >
                        {formatMoney(earningsAverage, walletCurrency)}
                      </span>
                    </div>
                  </div>

                  {false && (
                    <div className="rounded-[6px] border border-border/70 bg-card p-5 shadow-soft flex flex-col gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Request Payout
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Send available wallet funds to your bank or mobile money account.
                        </p>
                      </div>

                      <form onSubmit={handleWithdrawalSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Amount
                            </span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={withdrawalForm.amount}
                              onChange={(event) =>
                                setWithdrawalForm((prev) => ({ ...prev, amount: event.target.value }))
                              }
                              placeholder="500"
                              className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Method
                            </span>
                            <select
                              value={withdrawalForm.method}
                              onChange={(event) =>
                                setWithdrawalForm((prev) => ({ ...prev, method: event.target.value }))
                              }
                              className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                            >
                              <option value="bank_transfer">Bank transfer</option>
                              <option value="mobile_money">Mobile money</option>
                            </select>
                          </label>
                        </div>

                        <label className="space-y-1.5 block">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Account name
                          </span>
                          <input
                            value={withdrawalForm.account_name}
                            onChange={(event) =>
                              setWithdrawalForm((prev) => ({ ...prev, account_name: event.target.value }))
                            }
                            placeholder="Dr. John Doe"
                            className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                          />
                        </label>

                        <label className="space-y-1.5 block">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Account number
                          </span>
                          <input
                            value={withdrawalForm.account_number}
                            onChange={(event) =>
                              setWithdrawalForm((prev) => ({ ...prev, account_number: event.target.value }))
                            }
                            placeholder="1234567890"
                            className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                          />
                        </label>

                        <label className="space-y-1.5 block">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Note
                          </span>
                          <textarea
                            value={withdrawalForm.note}
                            onChange={(event) =>
                              setWithdrawalForm((prev) => ({ ...prev, note: event.target.value }))
                            }
                            placeholder="Monthly withdrawal"
                            rows={3}
                            className="w-full resize-none rounded-[6px] border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={
                            requestWithdrawal.isPending ||
                            !withdrawalForm.amount ||
                            !withdrawalForm.account_name.trim() ||
                            !withdrawalForm.account_number.trim()
                          }
                          className="h-9 w-full rounded-[6px] bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {requestWithdrawal.isPending ? "Requesting..." : "Request payout"}
                        </button>
                      </form>

                      <div className="border-t border-border/50 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Pending requests
                        </p>
                        {withdrawalsLoading ? (
                          <p className="text-xs text-muted-foreground mt-2">
                            Loading payout requests...
                          </p>
                        ) : payoutRequests.length === 0 ? (
                          <p className="text-xs text-muted-foreground mt-2">
                            No pending payout requests.
                          </p>
                        ) : (
                          <div className="space-y-2 mt-2">
                            {payoutRequests.map((withdrawal, index) => (
                              <div
                                key={String(getPayoutId(withdrawal) ?? withdrawal.local_id ?? index)}
                                className="rounded-[6px] border border-border/60 bg-secondary/20 p-3 flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground">
                                    {formatMoney(getPayoutAmount(withdrawal), walletCurrency)}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {getPayoutMethod(withdrawal)}
                                    {withdrawal.status ? ` · ${String(withdrawal.status)}` : ""}
                                  </p>
                                </div>
                                {Number.isFinite(Number(getPayoutId(withdrawal))) && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelWithdrawal(getPayoutId(withdrawal))}
                                    disabled={cancelWithdrawal.isPending}
                                    className="h-7 rounded-[6px] border border-destructive/30 px-2 text-[11px] font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="rounded-[6px] border border-primary/25 bg-primary/5 p-5 shadow-soft flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Payouts
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Move available wallet funds to a bank or mobile money account.
                        </p>
                      </div>
                      <span className="h-9 w-9 rounded-[6px] bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <Wallet className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="rounded-[6px] border border-border/60 bg-card/80 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Available
                      </p>
                      <p className=" leading-none font-bold text-foreground text-sm mt-1">
                        {formatMoney(walletBalance, walletCurrency)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setWithdrawalOpen(true)}
                      className="mt-auto h-10 rounded-[6px] bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Request payout
                    </button>
                  </div>
                </div>

                <div className="rounded-[6px] border border-border/70 bg-card shadow-soft overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Recent payout requests
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Track submitted withdrawals and cancel pending requests when needed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWithdrawalOpen(true)}
                      className="hidden sm:inline-flex h-8 items-center rounded-[6px] border border-primary/30 px-3 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      New payout
                    </button>
                  </div>

                  {withdrawalsLoading && !hasPayoutRows ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        Loading payout requests...
                      </p>
                    </div>
                  ) : hasPayoutRows ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left">
                        <thead className="bg-secondary/30">
                          <tr>
                            {["Amount", "Method", "Account", "Status", "Date", "Action"].map((head) => (
                              <th
                                key={head}
                                className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                              >
                                {head}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {payoutRequests.map((withdrawal, index) => {
                            const status = getPayoutStatus(withdrawal);
                            const statusLower = status.toLowerCase();
                            const payoutId = getPayoutId(withdrawal);
                            const numericPayoutId = Number(payoutId);
                            const canCancel =
                              Number.isFinite(numericPayoutId) &&
                              (statusLower.includes("pending") ||
                                statusLower.includes("requested") ||
                                statusLower.includes("processing"));

                            return (
                              <tr key={String(payoutId ?? withdrawal.local_id ?? index)} className="border-t border-border/50">
                                <td className="px-5 py-3 text-xs font-semibold text-foreground">
                                  {formatMoney(getPayoutAmount(withdrawal), walletCurrency)}
                                </td>
                                <td className="px-5 py-3 text-xs text-muted-foreground capitalize">
                                  {getPayoutMethod(withdrawal)}
                                </td>
                                <td className="px-5 py-3 text-xs text-muted-foreground">
                                  <span className="block text-foreground">
                                    {getPayoutAccountName(withdrawal)}
                                  </span>
                                  <span>{getPayoutAccountNumber(withdrawal)}</span>
                                </td>
                                <td className="px-5 py-3">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize",
                                      statusLower.includes("cancel")
                                        ? "bg-destructive/10 text-destructive"
                                        : statusLower.includes("complete") || statusLower.includes("approved")
                                          ? "bg-success/10 text-success"
                                          : "bg-warning/10 text-warning",
                                    )}
                                  >
                                    {status.replace(/_/g, " ")}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-xs text-muted-foreground">
                                  {formatPayoutDate(getPayoutDate(withdrawal))}
                                </td>
                                <td className="px-5 py-3">
                                  {canCancel ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelWithdrawal(numericPayoutId)}
                                      disabled={cancelWithdrawal.isPending}
                                      className="h-7 rounded-[6px] border border-destructive/30 px-2.5 text-[11px] font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-5 py-10 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        No payout requests yet
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your withdrawal requests will appear here after submission.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
      <Dialog open={withdrawalOpen} onOpenChange={setWithdrawalOpen}>
        <DialogContent className="sm:max-w-[520px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Request payout</DialogTitle>
            <DialogDescription>
              Submit a withdrawal from your available wallet balance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
            <div className="rounded-[6px] border border-border/60 bg-secondary/20 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Available balance</span>
              <span className="text-sm font-bold text-foreground">
                {formatMoney(walletBalance, walletCurrency)}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Amount
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={withdrawalForm.amount}
                  onChange={(event) =>
                    setWithdrawalForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  placeholder="500"
                  className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Method
                </span>
                <select
                  value={withdrawalForm.method}
                  onChange={(event) =>
                    setWithdrawalForm((prev) => ({ ...prev, method: event.target.value }))
                  }
                  className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="mobile_money">Mobile money</option>
                </select>
              </label>
            </div>

            <label className="space-y-1.5 block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Account name
              </span>
              <input
                value={withdrawalForm.account_name}
                onChange={(event) =>
                  setWithdrawalForm((prev) => ({ ...prev, account_name: event.target.value }))
                }
                placeholder="Dr. John Doe"
                className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Account number
              </span>
              <input
                value={withdrawalForm.account_number}
                onChange={(event) =>
                  setWithdrawalForm((prev) => ({ ...prev, account_number: event.target.value }))
                }
                placeholder="1234567890"
                className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Note
              </span>
              <textarea
                value={withdrawalForm.note}
                onChange={(event) =>
                  setWithdrawalForm((prev) => ({ ...prev, note: event.target.value }))
                }
                placeholder="Monthly withdrawal"
                rows={3}
                className="w-full resize-none rounded-[6px] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawalOpen(false)}
                className="h-9 rounded-[6px] border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  requestWithdrawal.isPending ||
                  !withdrawalForm.amount ||
                  !withdrawalForm.account_name.trim() ||
                  !withdrawalForm.account_number.trim()
                }
                className="h-9 rounded-[6px] bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {requestWithdrawal.isPending ? "Requesting..." : "Request payout"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DoctorOverview;
