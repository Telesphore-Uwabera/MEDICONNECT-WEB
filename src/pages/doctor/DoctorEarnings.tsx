import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, TrendingUp, Wallet } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TablePager, paginateRows, tablePageCount } from "@/components/TablePager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listFrom } from "@/lib/list-payload";
import { formatDateOnly } from "@/lib/date";
import {
  useCancelDoctorWithdrawal,
  useDoctorWallet,
  useDoctorWalletEarnings,
  useDoctorWithdrawals,
  useRequestDoctorWithdrawal,
} from "@/hooks/doctor/use-doctor-wallet";

function money(value: unknown, currency = "RWF") {
  const amount = Number(value ?? 0);
  return `${currency} ${(Number.isFinite(amount) ? amount : 0).toLocaleString()}`;
}

export default function DoctorEarnings() {
  const { t } = useTranslation();
  const { data: wallet, isLoading: walletLoading } = useDoctorWallet();
  const { data: earnings, isLoading: earningsLoading } = useDoctorWalletEarnings();
  const { data: withdrawals } = useDoctorWithdrawals(50);
  const requestWithdrawal = useRequestDoctorWithdrawal();
  const cancelWithdrawal = useCancelDoctorWithdrawal();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    amount: "",
    method: "mobile_money",
    account_number: "",
    account_name: "",
    note: "",
  });

  const currency = String(wallet?.currency ?? "RWF");
  const balance = Number(wallet?.balance ?? 0);
  const summary = earnings?.summary;
  const earningRows = listFrom(earnings?.breakdown);
  const payoutRows = listFrom(withdrawals);
  const paged = paginateRows(earningRows, page);
  const lastPage = tablePageCount(earningRows.length);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0 || !form.account_number.trim() || !form.account_name.trim()) {
      toast.error(t("pages.doctor.withdrawal_invalid_amount"));
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({
        amount,
        method: form.method,
        account_number: form.account_number.trim(),
        account_name: form.account_name.trim(),
        note: form.note.trim() || undefined,
      });
      toast.success(t("pages.doctor.withdrawal_sent"));
      setForm((prev) => ({ ...prev, amount: "", note: "" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("pages.doctor.wallet_load_error"));
    }
  };

  return (
    <DashboardLayout role="doctor">
      <div className="flex h-full w-full flex-col">
        <PageHeader title={t("pages.doctor.earnings_page_title")} subtitle={t("pages.doctor.earnings_page_sub")} />
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label={t("pages.doctor.wallet_balance")}
              value={walletLoading ? "…" : money(balance, currency)}
              icon={Wallet}
            />
            <StatCard
              label={t("pages.doctor.earnings")}
              value={earningsLoading ? "…" : money(summary?.total_earned ?? 0, currency)}
              icon={TrendingUp}
              accent="success"
            />
            <StatCard
              label={t("pages.doctor.avg_per_consultation")}
              value={money(summary?.average_per_appointment ?? 0, currency)}
              accent="info"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <form onSubmit={onSubmit} className="space-y-3 rounded-[6px] border border-border/70 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold">{t("pages.doctor.request_payout")}</h3>
              <p className="text-xs text-muted-foreground">{t("pages.doctor.request_payout_desc")}</p>
              <Input
                type="number"
                min="1"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder={t("pages.doctor.amount")}
              />
              <select
                value={form.method}
                onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))}
                className="h-10 w-full rounded-[6px] border border-border bg-background px-3 text-sm"
              >
                <option value="mobile_money">{t("pages.doctor.method_mobile_money", "Mobile money")}</option>
                <option value="bank_transfer">{t("pages.doctor.method_bank", "Bank transfer")}</option>
              </select>
              <Input
                value={form.account_name}
                onChange={(event) => setForm((prev) => ({ ...prev, account_name: event.target.value }))}
                placeholder={t("pages.doctor.account_name", "Account name")}
              />
              <Input
                value={form.account_number}
                onChange={(event) => setForm((prev) => ({ ...prev, account_number: event.target.value }))}
                placeholder={t("pages.doctor.account_number", "Account number")}
              />
              <Input
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder={t("pages.doctor.note", "Note")}
              />
              <Button type="submit" className="w-full rounded-[6px]" disabled={requestWithdrawal.isPending}>
                {requestWithdrawal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("pages.doctor.request_payout")}
              </Button>
            </form>

            <section className="overflow-hidden rounded-[6px] border border-border/70 bg-card shadow-sm">
              <div className="border-b border-border/60 px-5 py-4">
                <h3 className="text-sm font-semibold">{t("pages.doctor.recent_payout_requests")}</h3>
              </div>
              {payoutRows.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("pages.doctor.no_pending_payout_requests")}</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {payoutRows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm font-semibold">{money(row.amount, currency)}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.method?.replace(/_/g, " ")} · {row.created_at ? formatDateOnly(row.created_at) : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="rounded-[6px] capitalize">{row.status}</Badge>
                        {String(row.status).toLowerCase() === "pending" ? (
                          <button
                            type="button"
                            className="text-xs text-destructive"
                            onClick={() => cancelWithdrawal.mutate(row.id)}
                          >
                            {t("pages.doctor.delete")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="overflow-hidden rounded-[6px] border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/60 px-5 py-4">
              <h3 className="text-sm font-semibold">{t("pages.doctor.earnings_history")}</h3>
            </div>
            {earningRows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("pages.doctor.earnings_empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">ID</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.doctor.amount")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.doctor.status")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.patient.documents_col_date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row) => (
                      <tr key={row.id} className="border-t border-border/50">
                        <td className="px-5 py-3">{row.id}</td>
                        <td className="px-5 py-3">{money(row.consultation_fee ?? row.amount, currency)}</td>
                        <td className="px-5 py-3 capitalize">{row.status || "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {row.completed_at ? formatDateOnly(String(row.completed_at)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePager page={page} lastPage={lastPage} total={earningRows.length} onPageChange={setPage} className="border-t border-border/60 px-5 py-3" />
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
