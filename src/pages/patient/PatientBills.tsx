import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Receipt } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TablePager, TABLE_PAGE_SIZE } from "@/components/TablePager";
import { Badge } from "@/components/ui/badge";
import { billsFrom, usePatientBills } from "@/hooks/patient/use-patient-bills";
import { getRefundsFromResponse, getRefundsTotal, usePatientRefunds } from "@/hooks/patient/use-patient-refunds";
import { formatDateOnly } from "@/lib/date";

function money(value: unknown, currency = "RWF") {
  const amount = Number(value ?? 0);
  return `${currency} ${(Number.isFinite(amount) ? amount : 0).toLocaleString()}`;
}

function paidStatuses(status?: string | null) {
  return ["paid", "completed", "success", "successful"].includes(String(status || "").toLowerCase());
}

export default function PatientBills() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const bills = usePatientBills(page, TABLE_PAGE_SIZE);
  const refunds = usePatientRefunds();
  const rows = billsFrom(bills.data);
  const refundRows = getRefundsFromResponse(refunds.data);
  const total = bills.data?.total ?? rows.length;
  const lastPage = bills.data?.last_page ?? 1;
  const paidTotal = useMemo(
    () => rows.filter((row) => paidStatuses(row.status)).reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    [rows],
  );

  return (
    <DashboardLayout role="patient">
      <div className="flex h-full w-full flex-col">
        <PageHeader title={t("pages.patient.bills_title")} subtitle={t("pages.patient.bills_sub")} />
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t("pages.patient.bills_count")} value={total} icon={Receipt} />
            <StatCard label={t("pages.patient.bills_paid")} value={money(paidTotal)} icon={CreditCard} accent="success" />
            <StatCard label={t("pages.patient.refunds_history_title")} value={getRefundsTotal(refunds.data)} accent="warning" />
          </div>

          <section className="overflow-hidden rounded-[6px] border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/60 px-5 py-4">
              <h3 className="text-sm font-semibold">{t("pages.patient.bills_receipts")}</h3>
            </div>
            {bills.isLoading ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.patient.bills_loading")}</p>
            ) : rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.patient.bills_empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">{t("pages.patient.refund_payment")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.doctor.amount")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.doctor.status")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.patient.documents_col_date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={String(row.uuid || row.id || index)} className="border-t border-border/50">
                        <td className="px-5 py-3 font-medium">{row.invoice_number || row.uuid || "—"}</td>
                        <td className="px-5 py-3">{money(row.amount, String(row.currency || "RWF"))}</td>
                        <td className="px-5 py-3">
                          <Badge variant="secondary" className="rounded-[6px] capitalize">{row.status || "—"}</Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {row.paid_at || row.created_at ? formatDateOnly(String(row.paid_at || row.created_at)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePager page={page} lastPage={lastPage} total={total} onPageChange={setPage} className="border-t border-border/60 px-5 py-3" />
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-[6px] border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/60 px-5 py-4">
              <h3 className="text-sm font-semibold">{t("pages.patient.refunds_history_title")}</h3>
            </div>
            {refundRows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.patient.refund_empty")}</p>
            ) : (
              <div className="divide-y divide-border/60">
                {refundRows.map((refund) => (
                  <div key={refund.uuid || refund.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium">{refund.reason}</p>
                      <p className="text-xs text-muted-foreground">{refund.payment?.invoice_number || refund.uuid}</p>
                    </div>
                    <Badge variant="secondary" className="rounded-[6px] capitalize">{refund.status || "pending"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
