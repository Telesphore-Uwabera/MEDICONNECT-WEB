import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  useAcceptServiceBooking,
  useCompleteServiceBooking,
  useGetServiceBookings,
  useRejectServiceBooking,
  type BookingStatus,
} from "@/hooks/hospital/use-service-bookings";

const STATUSES: Array<BookingStatus | "all"> = ["all", "pending", "accepted", "rejected", "completed", "cancelled"];

function HospitalServiceBookings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const filters = {
    ...(status === "all" ? {} : { status }),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };
  const list = useGetServiceBookings(filters);
  const accept = useAcceptServiceBooking();
  const reject = useRejectServiceBooking();
  const complete = useCompleteServiceBooking();
  const [completeError, setCompleteError] = useState<string | null>(null);
  const rows = list.data?.data ?? [];
  const busy = accept.isPending || reject.isPending || complete.isPending;

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <PageHeader
          title={t("pages.hospital.service_bookings_title", { defaultValue: "Service bookings" })}
          subtitle={t("pages.hospital.service_bookings_sub", { defaultValue: "Accept, reject, or complete visits at this facility." })}
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t("pages.hospital.filter_status", { defaultValue: "Status" })}
            <select
              className="mt-1 block h-10 rounded-md border border-border bg-background px-2 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as BookingStatus | "all")}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            {t("pages.hospital.date_from", { defaultValue: "From" })}
            <input className="mt-1 block h-10 rounded-md border border-border bg-background px-2 text-sm" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            {t("pages.hospital.date_to", { defaultValue: "To" })}
            <input className="mt-1 block h-10 rounded-md border border-border bg-background px-2 text-sm" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
        {list.isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading", { defaultValue: "Loading..." })}</p> : null}
        {list.isError ? <p className="text-sm text-destructive">{t("pages.hospital.service_bookings_error", { defaultValue: "Could not load bookings." })}</p> : null}
        {completeError ? <p className="text-sm text-destructive">{completeError}</p> : null}
        {!list.isLoading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("pages.hospital.service_bookings_empty", { defaultValue: "No bookings match these filters." })}</p>
        ) : null}
        <ul className="grid gap-3">
          {rows.map((booking) => (
            <li key={booking.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{booking.patient?.name || t("pages.hospital.patient", { defaultValue: "Patient" })}</p>
                  <p className="text-sm text-muted-foreground">{booking.service?.name_en || t("pages.hospital.service", { defaultValue: "Service" })}</p>
                  <p className="text-xs text-muted-foreground">{String(booking.preferred_date || "").slice(0, 10)} {booking.preferred_time || ""} · {booking.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {booking.status === "pending" ? (
                    <Button className="h-10" disabled={busy} onClick={() => accept.mutate({ id: booking.id })}>
                      {t("pages.hospital.accept", { defaultValue: "Accept" })}
                    </Button>
                  ) : null}
                  {booking.status === "pending" ? (
                    <Button className="h-10" variant="outline" disabled={busy} onClick={() => { setReasonFor(booking.id); setReason(""); }}>
                      {t("pages.hospital.reject", { defaultValue: "Reject" })}
                    </Button>
                  ) : null}
                  {booking.status === "accepted" ? (
                    <Button className="h-10" disabled={busy} onClick={() => {
                      setCompleteError(null);
                      complete.mutate(booking.id, {
                        onError: (error) => setCompleteError(error instanceof Error ? error.message : t("pages.hospital.complete_unpaid", { defaultValue: "This booking is not paid yet. The patient must finish payment before it can be completed." })),
                      });
                    }}>
                      {t("pages.hospital.complete", { defaultValue: "Complete" })}
                    </Button>
                  ) : null}
                </div>
              </div>
              {reasonFor === booking.id ? (
                <form
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!reason.trim()) return;
                    reject.mutate({ id: booking.id, rejection_reason: reason.trim() }, { onSuccess: () => setReasonFor(null) });
                  }}
                >
                  <input
                    className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t("pages.hospital.reject_reason", { defaultValue: "Reason for rejecting" })}
                    required
                  />
                  <Button className="h-10" type="submit" disabled={busy || !reason.trim()}>
                    {t("pages.hospital.confirm_reject", { defaultValue: "Confirm reject" })}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}

export default HospitalServiceBookings;
