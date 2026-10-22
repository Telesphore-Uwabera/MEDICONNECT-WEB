import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import {
  useGetAdminCertificates,
  type AdminCertificateRow,
} from "@/hooks/admin/use-admin-certificates";
import { Loader2, Search, ShieldCheck, Clock, CreditCard, CheckCircle2, XCircle } from "lucide-react";
import { TablePager, paginateRows, tablePageCount } from "@/components/TablePager";

const FILTERS = [
  { id: "all", label: "All submitted" },
  { id: "awaiting_payment", label: "Awaiting payment" },
  { id: "pending", label: "Paid / in queue" },
  { id: "in_review", label: "In review" },
  { id: "issued", label: "Issued" },
  { id: "rejected", label: "Rejected" },
];

function statusClass(status: string) {
  if (status === "issued" || status === "approved") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/25";
  if (status === "pending" || status === "in_review") return "bg-blue-500/10 text-blue-600 border-blue-500/25";
  if (status === "awaiting_payment") return "bg-amber-500/10 text-amber-600 border-amber-500/25";
  if (status === "rejected" || status === "revoked") return "bg-destructive/10 text-destructive border-destructive/25";
  return "bg-muted text-muted-foreground border-border";
}

function money(amount: number, currency = "RWF") {
  return `${Number(amount || 0).toLocaleString()} ${currency}`;
}

function Row({ cert }: { cert: AdminCertificateRow }) {
  const paid = cert.fee_paid || cert.payment_status === "paid";
  return (
    <tr className="border-t border-border/70">
      <td className="px-3 py-2.5 text-[12px] font-mono text-foreground">{cert.certificate_number}</td>
      <td className="px-3 py-2.5 text-[12px] text-foreground">{cert.patient_full_name || "—"}</td>
      <td className="px-3 py-2.5 text-[12px] text-muted-foreground capitalize">{(cert.purpose || "—").replace(/_/g, " ")}</td>
      <td className="px-3 py-2.5">
        <span className={cn("text-[10px] font-semibold rounded-full border px-2 py-0.5", statusClass(cert.status))}>
          {cert.status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-3 py-2.5 text-[12px]">
        <span className={paid ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
          {paid ? `Paid ${money(cert.fee_amount || 5000)}` : "Unpaid"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{cert.doctor?.name || "Unassigned"}</td>
      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{cert.created_at?.slice(0, 16)?.replace("T", " ") || "—"}</td>
      <td className="px-3 py-2.5">
        {cert.status === "issued" && cert.certificate_number ? (
          <Link
            to={`/fitness-certificates/verify/${encodeURIComponent(cert.certificate_number)}`}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Verify
          </Link>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

export default function ManageFitnessCertificates() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetAdminCertificates(status, search.trim() || undefined);
  const summary = data?.summary;
  const rows = data?.certificates ?? [];
  const lastPage = tablePageCount(rows.length);
  const pagedRows = paginateRows(rows, page);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Fitness certificates"
        subtitle="Track 5,000 FRW payments, doctor review, issuance, and public verification."
      />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {[
            { label: "Awaiting payment", value: summary?.awaiting_payment ?? 0, icon: CreditCard },
            { label: "With doctor", value: summary?.pending ?? 0, icon: Clock },
            { label: "Issued", value: summary?.issued ?? 0, icon: CheckCircle2 },
            { label: "Rejected", value: summary?.rejected ?? 0, icon: XCircle },
            { label: "Paid revenue", value: money(summary?.paid_revenue ?? 0, summary?.currency || "RWF"), icon: ShieldCheck },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-[6px] border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              </div>
              <p className="text-sm font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        <p className="text-[12px] text-muted-foreground max-w-3xl">
          Patients only reach the doctor after Irembo confirms 5,000 FRW. The issued PDF appears for the patient after the doctor confirms identity and signs. Admin sees every submitted request and its payment status here.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatus(filter.id)}
                className={cn(
                  "h-8 px-3 rounded-[6px] text-[11px] font-semibold border",
                  status === filter.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or number"
              className="w-full h-8 pl-8 pr-3 rounded-[6px] border border-border bg-card text-[12px] outline-none"
            />
          </div>
        </div>

        <div className="rounded-[6px] border border-border bg-card overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-12">No certificate requests in this filter.</p>
          ) : (
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Number</th>
                  <th className="px-3 py-2 font-semibold">Patient</th>
                  <th className="px-3 py-2 font-semibold">Purpose</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Payment</th>
                  <th className="px-3 py-2 font-semibold">Doctor</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 font-semibold">Public</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((cert) => (
                  <Row key={cert.id} cert={cert} />
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && rows.length > 0 && (
            <div className="px-3 pb-3">
              <TablePager page={page} lastPage={lastPage} total={rows.length} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
