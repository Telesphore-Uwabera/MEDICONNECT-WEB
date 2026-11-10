import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { startInAppCallFromJoin } from "@/lib/scheduled-call";
import { useCallContext } from "@/context/CallContext";
import { canJoinAppointment, type JoinableAppointment } from "@/lib/appointment-join";

interface NextAppointment extends JoinableAppointment {
  id: number;
  doctor?: { user?: { name?: string }; specialization?: string; name?: string };
}

/** The patient's next visit, with a one-tap join when the slot is open. */
export function PatientNextVisit({ appointment }: { appointment?: NextAppointment | null }) {
  const { t } = useTranslation();
  const { startCall } = useCallContext();
  const join = useMutation({
    mutationFn: (id: number) => apiFetch<{ token?: string; room_url?: string; join_url?: string; room_name?: string }>(`/patient/appointments/${id}/join`, { method: "POST" }),
    onSuccess: (res, id) => {
      const started = startInAppCallFromJoin(startCall, res, { consultationId: id, isOwner: false });
      if (started) return;
      const url = res.join_url || res.room_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error(t("clinical.flow.join_failed"));
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : t("clinical.flow.join_failed"));
    },
  });

  if (!appointment) {
    return (
      <section data-testid="next-visit" className="rounded-xl border border-dashed border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">{t("clinical.flow.no_visit_title")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("clinical.flow.no_visit_body")}</p>
        <Link to="/patient/search-doctors" className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t("clinical.flow.book_doctor")}
        </Link>
      </section>
    );
  }

  const doctor = appointment.doctor?.user?.name || appointment.doctor?.name || t("clinical.flow.your_doctor");
  const ready = canJoinAppointment(appointment);

  return (
    <section data-testid="next-visit" className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("clinical.flow.next_visit")}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{doctor}</p>
      <p className="text-xs text-muted-foreground">{appointment.appointment_date} · {String(appointment.appointment_time || "").slice(0, 5)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="next-visit-join"
          disabled={join.isPending}
          onClick={() => {
            if (!ready) {
              toast.message(t("clinical.flow.join_early"));
              return;
            }
            join.mutate(appointment.id);
          }}
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {t("clinical.flow.join_now")}
        </button>
        <Link to={`/patient/appointments?appointment_id=${appointment.id}`} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t("clinical.flow.visit_details")}
        </Link>
        <Link to="/patient/prescriptions" className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t("clinical.flow.prescriptions")}
        </Link>
        <Link to="/patient/documents" className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t("clinical.flow.documents")}
        </Link>
      </div>
    </section>
  );
}
