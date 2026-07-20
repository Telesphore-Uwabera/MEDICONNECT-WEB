import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/StatCard";
import { cn } from "@/lib/utils";
import {
  useAdminRefunds,
  useApproveRefund,
  useCompleteRefund,
  useRejectRefund,
  type AdminRefund,
} from "@/hooks/admin/use-admin-refunds";
import { getRefundsFromResponse, getRefundsTotal } from "@/hooks/patient/use-patient-refunds";
import { toast } from "sonner";

const STATUSES = ["all", "pending", "approved", "rejected", "completed"] as const;

function formatMoney(amount?: number | string | null, currency = "RWF") {
  if (amount === null || amount === undefined || amount === "") return "-";
  const numeric = Number(amount);
  const value = Number.isFinite(numeric) ? numeric.toLocaleString() : amount;
  return `${currency || "RWF"} ${value}`;
}

function formatDate(value?: string | null) {
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

function normalizeStatus(status: unknown) {
  return status === null || status === undefined ? "" : String(status).toLowerCase();
}

function statusLabel(status: unknown) {
  const value = status === null || status === undefined || status === "" ? "pending" : String(status);
  return value;
}

function statusClass(status?: string | null) {
  const value = normalizeStatus(status);
  if (value === "approved" || value === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
  }
  if (value === "rejected") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-500";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-500";
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

function getRequester(refund: AdminRefund) {
  return refund.requestedBy ?? refund.requested_by ?? null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

type RefundAction = "approve" | "reject" | "complete";

interface ActionState {
  action: RefundAction;
  refund: AdminRefund;
}

function actionLabel(action: RefundAction) {
  if (action === "approve") return "Approve refund";
  if (action === "reject") return "Reject refund";
  return "Mark completed";
}

export default function AdminRefunds() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    from: "",
    to: "",
  });
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const refundsQuery = useAdminRefunds(filters);
  const approveRefund = useApproveRefund();
  const rejectRefund = useRejectRefund();
  const completeRefund = useCompleteRefund();
  const refunds = getRefundsFromResponse(refundsQuery.data);

  const stats = useMemo(() => {
    const values = {
      total: getRefundsTotal(refundsQuery.data),
      pending: 0,
      approved: 0,
      completed: 0,
    };
    refunds.forEach((refund) => {
      const status = normalizeStatus(refund.status);
      if (status === "pending") values.pending += 1;
      if (status === "approved") values.approved += 1;
      if (status === "completed") values.completed += 1;
    });
    return values;
  }, [refunds, refundsQuery.data?.total]);

  const runAction = async () => {
    if (!actionState) return;
    const note = adminNote.trim();
    if (actionState.action === "reject" && !note) {
      toast.error("Admin note is required to reject a refund.");
      return;
    }

    const payload = { id: actionState.refund.id, admin_note: note || undefined };
    const mutation =
      actionState.action === "approve"
        ? approveRefund
        : actionState.action === "reject"
          ? rejectRefund
          : completeRefund;

    try {
      const response = await mutation.mutateAsync(payload);
      toast.success(response.message);
      setActionState(null);
      setAdminNote("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openAction = (action: RefundAction, refund: AdminRefund) => {
    setActionState({ action, refund });
    setAdminNote(refund.admin_note ?? "");
  };

  const isActionPending =
    approveRefund.isPending || rejectRefund.isPending || completeRefund.isPending;

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={t("pages.admin.refunds.title", { defaultValue: "Refund requests" })}
        subtitle={t("pages.admin.refunds.subtitle", {
          defaultValue: "Review patient refund requests and update their status.",
        })}
        actions={
          <Button
            type="button"
            onClick={() => refundsQuery.refetch()}
            variant="outline"
            className="h-10 rounded-[6px]"
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", refundsQuery.isFetching && "animate-spin")}
            />
            {t("common.refresh", { defaultValue: "Refresh" })}
          </Button>
        }
      />

      <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label={t("pages.admin.refunds.total", { defaultValue: "Total refunds" })}
            value={stats.total}
            icon={CreditCard}
            accent="info"
          />
          <StatCard
            label={t("pages.admin.refunds.pending", { defaultValue: "Pending" })}
            value={stats.pending}
            icon={Clock}
            accent="warning"
          />
          <StatCard
            label={t("pages.admin.refunds.approved", { defaultValue: "Approved" })}
            value={stats.approved}
            icon={CheckCircle2}
            accent="success"
          />
          <StatCard
            label={t("pages.admin.refunds.completed", { defaultValue: "Completed" })}
            value={stats.completed}
            icon={CheckCircle2}
            accent="primary"
          />
        </div>

        <section className="rounded-[6px] border border-border/70 bg-card">
          <div className="grid gap-3 border-b border-border/60 p-4 lg:grid-cols-[1fr_160px_150px_150px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder={t("pages.admin.refunds.search", {
                  defaultValue: "Search requester or invoice...",
                })}
                className="h-10 rounded-[6px] pl-9"
              />
            </div>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
              className="h-10 rounded-[6px] border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`pages.admin.refunds.status_${status}`, {
                    defaultValue: status === "all" ? "All statuses" : status,
                  })}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((current) => ({ ...current, from: event.target.value }))
              }
              className="h-10 rounded-[6px]"
            />
            <Input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((current) => ({ ...current, to: event.target.value }))
              }
              className="h-10 rounded-[6px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilters({ status: "all", search: "", from: "", to: "" })}
              className="h-10 rounded-[6px]"
            >
              <X className="mr-2 h-4 w-4" />
              {t("common.clear", { defaultValue: "Clear" })}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-secondary/30 text-[11px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Payment reference</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refundsQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-t border-border/50">
                      {Array.from({ length: 6 }).map((__, cell) => (
                        <td key={cell} className="px-4 py-4">
                          <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : refunds.length ? (
                  refunds.map((refund) => {
                    const requester = getRequester(refund);
                    const status = normalizeStatus(refund.status);
                    return (
                      <tr
                        key={refund.uuid ?? refund.id}
                        className="border-t border-border/50 align-top hover:bg-secondary/20"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">
                            {requester?.name ?? "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {requester?.email ?? requester?.phone ?? "-"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">
                            {getPaymentReference(refund.payment)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatMoney(refund.payment?.amount, refund.payment?.currency ?? "RWF")}
                          </p>
                        </td>
                        <td className="max-w-[360px] px-4 py-4">
                          <p className="text-sm leading-5 text-foreground">{refund.reason}</p>
                          {refund.admin_note && (
                            <p className="mt-2 rounded-[6px] bg-secondary/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
                              <span className="font-semibold text-foreground">Admin note:</span>{" "}
                              {refund.admin_note}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className={cn("rounded-[6px] capitalize", statusClass(refund.status))}
                          >
                            {statusLabel(refund.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {formatDate(refund.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => openAction("approve", refund)}
                                  className="h-8 rounded-[6px]"
                                >
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAction("reject", refund)}
                                  className="h-8 rounded-[6px] border-rose-500/30 text-rose-500"
                                >
                                  <XCircle className="mr-1 h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {status === "approved" && (
                              <Button
                                size="sm"
                                onClick={() => openAction("complete", refund)}
                                className="h-8 rounded-[6px]"
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No refund requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {actionState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {actionLabel(actionState.action)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {getPaymentReference(actionState.refund.payment)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionState(null)}
                className="rounded-[6px] p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Admin note {actionState.action === "reject" ? "*" : ""}
              </label>
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                rows={5}
                maxLength={500}
                placeholder="Add a note for the patient or internal review..."
                className="mt-2 w-full resize-none rounded-[6px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionState(null)}
                className="rounded-[6px]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={runAction}
                disabled={isActionPending}
                className="rounded-[6px]"
              >
                {isActionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
