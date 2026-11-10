import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlaskConical, Pill, Scan, Stethoscope } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  useCareOrderAction,
  useGetCareOrders,
  useReviewCareOrder,
  type CareOrder,
} from "@/hooks/doctor/use-care-orders";
import { CLINICAL_CATALOG } from "@/pages/doctor/appointments/shared/clinical-catalog";
import { ClinicalOrderModal } from "@/pages/doctor/appointments/shared/ClinicalOrderModal";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Referral } from "@/hooks/doctor/use-doctor-referrals";
import { toast } from "sonner";
import { ClinicalResultViewer } from "@/components/clinical/ClinicalResultViewer";
import { useDownloadClinicalDocument } from "@/hooks/use-clinical-document";
import { clinicalKindLabel, clinicalStoredLabel } from "@/lib/clinical-i18n";

function iconFor(type: string) {
  if (type === "pharmacy_packet") return Pill;
  if (type === "imaging") return Scan;
  if (type === "lab") return FlaskConical;
  return Stethoscope;
}

const DECISION_KEYS: Record<string, string> = {
  ADVICE_ONLY: "clinical.inbox.decision_advice",
  PRESCRIPTION: "clinical.inbox.decision_prescription",
  INVESTIGATION: "clinical.inbox.decision_investigation",
  SPECIALIST_BOOKING: "clinical.inbox.decision_specialist",
  REFERRAL_LETTER: "clinical.inbox.decision_referral",
  INPATIENT_REFERRAL: "clinical.inbox.decision_inpatient",
};

function labeled(t: (key: string, options?: { defaultValue?: string }) => string, prefix: string, value: string) {
  const key = `${prefix}${String(value || "").toLowerCase()}`;
  return t(key, { defaultValue: String(value || "").replace(/_/g, " ") });
}

function Snapshot({ order }: { order: CareOrder }) {
  const { t } = useTranslation();
  const snap = (order.snapshot || {}) as {
    allergies?: string | null;
    current_medications?: string | null;
    chronic_conditions?: string | null;
    diagnosis?: string | null;
    chief_complaint?: string | null;
    doctor_message?: string | null;
    hospital_results?: string | null;
    patient?: { name?: string; phone?: string; id?: number };
  };
  return (
    <div className="mt-2 space-y-1 rounded-[6px] border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px]">
      {order.patient_code ? <p className="font-semibold text-foreground">{t("clinical.inbox.patient_id", { code: order.patient_code })}</p> : null}
      {snap.patient?.name ? <p>{snap.patient.name}{snap.patient.phone ? ` · ${snap.patient.phone}` : ""}</p> : null}
      {snap.diagnosis ? <p><span className="font-semibold">{t("clinical.inbox.diagnosis")}:</span> {snap.diagnosis}</p> : null}
      {snap.chief_complaint ? <p><span className="font-semibold">{t("clinical.inbox.reported")}:</span> {snap.chief_complaint}</p> : null}
      {order.doctor_message || snap.doctor_message ? (
        <p><span className="font-semibold">{t("clinical.inbox.doctor_message")}:</span> {order.doctor_message || snap.doctor_message}</p>
      ) : null}
      {order.clinical_notes ? <p><span className="font-semibold">{t("clinical.inbox.consult_notes")}:</span> {order.clinical_notes}</p> : null}
      {snap.allergies ? <p><span className="font-semibold">{t("clinical.inbox.allergies")}:</span> {snap.allergies}</p> : null}
      {snap.current_medications ? <p><span className="font-semibold">{t("clinical.inbox.medicines")}:</span> {snap.current_medications}</p> : null}
      {snap.chronic_conditions ? <p><span className="font-semibold">{t("clinical.inbox.conditions")}:</span> {snap.chronic_conditions}</p> : null}
      {!!order.protocol?.length && (
        <p><span className="font-semibold">{t("clinical.inbox.protocol")}:</span> {order.protocol.map((step) => clinicalStoredLabel(t, step)).join(" · ")}</p>
      )}
      {!!order.items?.length && (
        <p><span className="font-semibold">{t("clinical.inbox.requested")}:</span> {order.items.map((item) => clinicalStoredLabel(t, item)).join(", ")}</p>
      )}
      {order.result_notes || snap.hospital_results ? (
        <p><span className="font-semibold">{t("clinical.inbox.facility_reply")}:</span> {order.result_notes || snap.hospital_results}</p>
      ) : null}
      {order.handover_status ? (
        <p><span className="font-semibold">{t("clinical.inbox.handover")}:</span> {labeled(t, "clinical.inbox.handover_", order.handover_status)}</p>
      ) : null}
      <ClinicalResultViewer files={order.result_files} fallbackUrl={order.result_file_url} />
    </div>
  );
}

function OrderActions({
  scope,
  order,
  onSendPharmacy,
}: {
  scope: "hospital" | "pharmacy" | "patient" | "doctor";
  order: CareOrder;
  onSendPharmacy?: (order: CareOrder) => void;
}) {
  const { t } = useTranslation();
  const action = useCareOrderAction(scope === "patient" ? "doctor" : scope === "doctor" ? "doctor" : scope);
  const [reply, setReply] = useState(order.result_notes || "");
  const [files, setFiles] = useState<File[]>([]);
  if (scope === "patient") {
    const type = String(order.order_type);
    const handover = order.handover_status ? labeled(t, "clinical.inbox.handover_", order.handover_status) : "";
    const line = type === "admission" && handover
      ? t("clinical.inbox.admission_line", { handover })
      : order.status === "pending"
        ? (type === "pharmacy_packet" ? t("clinical.inbox.waiting_pharmacy") : type === "follow_up" || type === "home_care" ? t("clinical.inbox.doctor_step_open") : t("clinical.inbox.waiting_facility"))
        : order.status === "accepted"
          ? (type === "pharmacy_packet" ? t("clinical.inbox.pharmacy_has_packet") : t("clinical.inbox.facility_accepted"))
          : order.status === "rejected"
            ? t("clinical.inbox.step_declined")
            : order.status === "completed" && type === "pharmacy_packet"
              ? t("clinical.inbox.pharmacy_dispensed")
              : order.status === "completed"
                ? t("clinical.inbox.step_done")
                : labeled(t, "clinical.inbox.status_", String(order.status || ""));
    return <p className="mt-3 text-[11px] text-muted-foreground">{line}</p>;
  }

  const run = (next: "accept" | "complete" | "reject") => {
    action.mutate(
      {
        id: order.id,
        care_order_id: order.id,
        patient_code: order.patient_code,
        action: next,
        result_notes: reply,
        files: next === "complete" ? files : undefined,
      },
      {
        onSuccess: () => toast.success(scope === "doctor" ? t("clinical.inbox.step_recorded") : next === "complete" ? t("clinical.inbox.reply_sent") : t("clinical.inbox.updated")),
        onError: (error: unknown) => toast.error(error instanceof Error ? error.message : t("clinical.inbox.update_failed")),
      },
    );
  };

  if (scope === "hospital" || scope === "pharmacy") {
    return (
      <div className="mt-3 space-y-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder={scope === "pharmacy" ? t("clinical.inbox.pharmacy_notes") : t("clinical.inbox.facility_notes")}
          className="w-full rounded-[5px] border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary/50"
        />
        {scope === "hospital" && (
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="block w-full text-[11px] text-muted-foreground"
          />
        )}
        <div className="flex flex-wrap gap-2">
          {order.status === "pending" && (
            <button type="button" onClick={() => run("accept")} className="h-8 rounded-[5px] border border-border px-3 text-[11px] font-semibold hover:bg-muted">
              {t("clinical.inbox.accept_patient")}
            </button>
          )}
          <button type="button" onClick={() => run("complete")} className="h-8 rounded-[5px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90">
            {scope === "pharmacy" ? t("clinical.inbox.mark_dispensed") : t("clinical.inbox.send_results")}
          </button>
          {scope === "hospital" && String(order.order_type) === "admission" && ["RECEIVED", "IN_TRANSIT", "ADMITTED", "TRANSFERRED", "DISCHARGED"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => action.mutate(
                {
                  id: order.id,
                  care_order_id: order.id,
                  patient_code: order.patient_code,
                  action: status === "DISCHARGED" || status === "TRANSFERRED" ? "complete" : "accept",
                  result_notes: reply,
                  handover_status: status,
                },
                {
                  onSuccess: () => toast.success(t("clinical.inbox.admission_set", { status: labeled(t, "clinical.inbox.handover_", status) })),
                  onError: (error: unknown) => toast.error(error instanceof Error ? error.message : t("clinical.inbox.admission_failed")),
                },
              )}
              className="h-8 rounded-[5px] border border-border px-3 text-[11px] font-semibold hover:bg-muted"
            >
              {labeled(t, "clinical.inbox.handover_", status)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (scope === "doctor" && ["follow_up", "home_care"].includes(String(order.order_type)) && order.status !== "completed") {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => run("complete")}
          className="h-8 rounded-[5px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t("clinical.inbox.mark_done")}
        </button>
      </div>
    );
  }

  if (scope === "doctor" && order.result_notes && !String(order.order_type).includes("pharmacy")) {
    const needsReview = order.status === "completed" && String(order.review_status || "") !== "reviewed";
    return (
      <div className="mt-3 space-y-2">
        {needsReview ? <DoctorReviewForm order={order} /> : (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            {t("clinical.inbox.reviewed")}{order.management_decision ? ` · ${DECISION_KEYS[order.management_decision] ? t(DECISION_KEYS[order.management_decision]) : order.management_decision}` : ""}. {t("clinical.inbox.review_keeps_episode")}
          </p>
        )}
        {!needsReview && (
          <button
            type="button"
            onClick={() => onSendPharmacy?.(order)}
            className="h-8 rounded-[5px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("clinical.inbox.send_pharmacy")}
          </button>
        )}
      </div>
    );
  }
  return null;
}

function DoctorReviewForm({ order }: { order: CareOrder }) {
  const { t } = useTranslation();
  const review = useReviewCareOrder();
  const [interpretation, setInterpretation] = useState(order.doctor_interpretation || "");
  const [decision, setDecision] = useState(order.management_decision || "ADVICE_ONLY");
  return (
    <div className="space-y-2 rounded-[6px] border border-amber-500/30 bg-amber-500/5 p-3">
      <p className="text-[11px] font-semibold text-foreground">{t("clinical.inbox.review_required")}</p>
      <p className="text-[11px] text-muted-foreground">
        {t("clinical.inbox.review_help")}
      </p>
      <textarea
        value={interpretation}
        onChange={(e) => setInterpretation(e.target.value)}
        rows={3}
        placeholder={t("clinical.inbox.interpretation_placeholder")}
        className="w-full rounded-[5px] border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary/50"
      />
      <select
        value={decision}
        onChange={(e) => setDecision(e.target.value)}
        className="h-8 w-full rounded-[5px] border border-border bg-background px-2 text-[12px]"
      >
        <option value="ADVICE_ONLY">{t("clinical.inbox.decision_advice")}</option>
        <option value="PRESCRIPTION">{t("clinical.inbox.decision_prescription")}</option>
        <option value="INVESTIGATION">{t("clinical.inbox.decision_investigation")}</option>
        <option value="SPECIALIST_BOOKING">{t("clinical.inbox.decision_specialist")}</option>
        <option value="REFERRAL_LETTER">{t("clinical.inbox.decision_referral")}</option>
        <option value="INPATIENT_REFERRAL">{t("clinical.inbox.decision_inpatient")}</option>
      </select>
      <button
        type="button"
        disabled={review.isPending || !interpretation.trim()}
        onClick={() =>
          review.mutate(
            { id: order.id, interpretation: interpretation.trim(), management_decision: decision },
            {
              onSuccess: () => toast.success(t("clinical.inbox.review_saved")),
              onError: (error: unknown) => toast.error(error instanceof Error ? error.message : t("clinical.inbox.review_failed")),
            },
          )
        }
        className="h-8 rounded-[5px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {review.isPending ? t("clinical.inbox.saving") : t("clinical.inbox.record_review")}
      </button>
    </div>
  );
}

export function IncomingCareInbox({
  scope,
  title,
  subtitle,
}: {
  scope: "hospital" | "pharmacy" | "patient" | "doctor";
  title: string;
  subtitle: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useGetCareOrders(scope);
  const downloadDoc = useDownloadClinicalDocument();
  const orders = data ?? [];
  const [pharmacyFrom, setPharmacyFrom] = useState<CareOrder | null>(null);
  const { data: referrals } = useQuery({
    queryKey: [`${scope}-referrals`],
    enabled: scope === "hospital" || scope === "pharmacy",
    queryFn: async () => {
      const res = await apiFetch<{ referrals?: Referral[]; data?: Referral[] }>(`/${scope}/referrals`);
      return Array.isArray(res.referrals) ? res.referrals : Array.isArray(res.data) ? res.data : [];
    },
  });

  return (
    <DashboardLayout role={scope === "doctor" ? "doctor" : scope}>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="space-y-3 p-4 sm:p-6">
        {!!referrals?.length && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {scope === "pharmacy" ? t("clinical.inbox.referrals_pharmacy") : t("clinical.inbox.referrals_facility")}
            </h3>
            {referrals.map((row) => (
              <article key={`ref-${row.id}`} className="rounded-[6px] border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{row.patient?.name || t("clinical.inbox.patient_fallback")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{labeled(t, "clinical.inbox.status_", String(row.status || ""))} · {row.referring_doctor?.name || t("clinical.inbox.doctor_fallback")}</p>
              </article>
            ))}
          </div>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading", "Loading…")}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("clinical.inbox.empty")}
          </p>
        ) : (
          orders.map((order) => {
            const Icon = iconFor(String(order.order_type));
            const fallback = CLINICAL_CATALOG[order.order_type as keyof typeof CLINICAL_CATALOG]?.label || order.title || order.order_type;
            const label = CLINICAL_CATALOG[order.order_type as keyof typeof CLINICAL_CATALOG]
              ? clinicalKindLabel(t, String(order.order_type), fallback)
              : clinicalStoredLabel(t, String(order.title || order.order_type));
            return (
              <article key={order.id} className="rounded-[6px] border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {labeled(t, "clinical.inbox.status_", String(order.status || ""))}
                      {order.review_status ? ` · ${t("clinical.inbox.review_status", { status: order.review_status })}` : ""}
                      {" · "}
                      {order.patient_code || t("clinical.inbox.packet")} · {labeled(t, "clinical.inbox.urgency_", String(order.urgency || "medium"))}
                    </p>
                    <Snapshot order={order} />
                    <button
                      type="button"
                      className="mt-2 text-[11px] font-semibold text-primary hover:underline"
                      onClick={() =>
                        downloadDoc.mutate({
                          path: `/${scope}/care-orders/${order.id}/document`,
                          filename: `investigation-${order.id}.pdf`,
                        })
                      }
                    >
                      {t("clinical.inbox.download_pdf")}
                    </button>
                    <OrderActions scope={scope} order={order} onSendPharmacy={setPharmacyFrom} />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
      {pharmacyFrom && (
        <ClinicalOrderModal
          open
          kind="pharmacy_packet"
          patientId={pharmacyFrom.patient_id ?? null}
          patientName={String((pharmacyFrom.snapshot as { patient?: { name?: string } } | undefined)?.patient?.name || "")}
          parentOrderId={pharmacyFrom.id}
          hospitalResults={pharmacyFrom.result_notes}
          defaultNotes={pharmacyFrom.clinical_notes || ""}
          defaultDiagnosis={String((pharmacyFrom.snapshot as { diagnosis?: string } | undefined)?.diagnosis || "")}
          onClose={() => setPharmacyFrom(null)}
          onSkip={() => setPharmacyFrom(null)}
          onCreated={() => setPharmacyFrom(null)}
        />
      )}
    </DashboardLayout>
  );
}
