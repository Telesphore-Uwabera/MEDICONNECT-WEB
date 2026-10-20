import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlaskConical, Pill, Scan, Stethoscope } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  useCareOrderAction,
  useGetCareOrders,
  useHandoverCareOrder,
  useReviewCareOrder,
  type CareOrder,
} from "@/hooks/doctor/use-care-orders";
import { CLINICAL_CATALOG } from "@/pages/doctor/appointments/shared/clinical-catalog";
import { ClinicalOrderModal } from "@/pages/doctor/appointments/shared/ClinicalOrderModal";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Referral } from "@/hooks/doctor/use-doctor-referrals";
import { toast } from "sonner";

function iconFor(type: string) {
  if (type === "pharmacy_packet") return Pill;
  if (type === "imaging") return Scan;
  if (type === "lab") return FlaskConical;
  return Stethoscope;
}

function Snapshot({ order }: { order: CareOrder }) {
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
      {order.patient_code ? <p className="font-semibold text-foreground">Patient ID {order.patient_code}</p> : null}
      {snap.patient?.name ? <p>{snap.patient.name}{snap.patient.phone ? ` · ${snap.patient.phone}` : ""}</p> : null}
      {snap.diagnosis ? <p><span className="font-semibold">Diagnosis:</span> {snap.diagnosis}</p> : null}
      {snap.chief_complaint ? <p><span className="font-semibold">What the patient reported:</span> {snap.chief_complaint}</p> : null}
      {order.doctor_message || snap.doctor_message ? (
        <p><span className="font-semibold">Doctor’s message:</span> {order.doctor_message || snap.doctor_message}</p>
      ) : null}
      {order.clinical_notes ? <p><span className="font-semibold">Consult notes:</span> {order.clinical_notes}</p> : null}
      {snap.allergies ? <p><span className="font-semibold">Allergies:</span> {snap.allergies}</p> : null}
      {snap.current_medications ? <p><span className="font-semibold">Current medicines:</span> {snap.current_medications}</p> : null}
      {snap.chronic_conditions ? <p><span className="font-semibold">Conditions:</span> {snap.chronic_conditions}</p> : null}
      {!!order.protocol?.length && (
        <p><span className="font-semibold">Protocol:</span> {order.protocol.join(" · ")}</p>
      )}
      {!!order.items?.length && (
        <p><span className="font-semibold">Requested:</span> {order.items.join(", ")}</p>
      )}
      {order.result_notes || snap.hospital_results ? (
        <p><span className="font-semibold">Facility reply:</span> {order.result_notes || snap.hospital_results}</p>
      ) : null}
      {order.handover_status ? (
        <p><span className="font-semibold">Handover:</span> {order.handover_status}</p>
      ) : null}
      {order.result_file_url ? (
        <p>
          <a href={order.result_file_url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
            Result file
          </a>
        </p>
      ) : null}
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
  const action = useCareOrderAction(scope === "patient" ? "doctor" : scope === "doctor" ? "doctor" : scope);
  const handover = useHandoverCareOrder();
  const [reply, setReply] = useState(order.result_notes || "");
  const [files, setFiles] = useState<File[]>([]);
  if (scope === "patient") return null;

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
        onSuccess: () => toast.success(next === "complete" ? "Reply sent to the referring doctor." : "Updated."),
        onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update this packet."),
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
          placeholder={scope === "pharmacy" ? "Dispensing notes for the doctor" : "Results and findings for the referring doctor"}
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
              Accept patient
            </button>
          )}
          <button type="button" onClick={() => run("complete")} className="h-8 rounded-[5px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90">
            {scope === "pharmacy" ? "Mark dispensed and reply" : "Send results to doctor"}
          </button>
        </div>
      </div>
    );
  }

  if (scope === "doctor" && String(order.order_type) === "admission") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {["RECEIVED", "IN_TRANSIT", "ADMITTED", "TRANSFERRED", "DISCHARGED"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() =>
              handover.mutate(
                { id: order.id, handover_status: status },
                {
                  onSuccess: () => toast.success(`Handover set to ${status}`),
                  onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update handover."),
                },
              )
            }
            className="h-8 rounded-[5px] border border-border px-3 text-[11px] font-semibold hover:bg-muted"
          >
            {status.replace("_", " ")}
          </button>
        ))}
      </div>
    );
  }

  if (scope === "doctor" && order.result_notes && !String(order.order_type).includes("pharmacy")) {
    const needsReview = order.status === "completed" && String(order.review_status || "") !== "reviewed";
    return (
      <div className="mt-3 space-y-2">
        {needsReview ? <DoctorReviewForm order={order} /> : (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Reviewed{order.management_decision ? ` · ${order.management_decision}` : ""}. An uploaded result does not close the episode by itself.
          </p>
        )}
        {!needsReview && (
          <button
            type="button"
            onClick={() => onSendPharmacy?.(order)}
            className="h-8 rounded-[5px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Send this patient to a registered pharmacy
          </button>
        )}
      </div>
    );
  }
  return null;
}

function DoctorReviewForm({ order }: { order: CareOrder }) {
  const review = useReviewCareOrder();
  const [interpretation, setInterpretation] = useState(order.doctor_interpretation || "");
  const [decision, setDecision] = useState(order.management_decision || "ADVICE_ONLY");
  return (
    <div className="space-y-2 rounded-[6px] border border-amber-500/30 bg-amber-500/5 p-3">
      <p className="text-[11px] font-semibold text-foreground">Clinical review required</p>
      <p className="text-[11px] text-muted-foreground">
        The facility uploaded results. Document your interpretation and next management decision. This does not mark the pharmacy as served.
      </p>
      <textarea
        value={interpretation}
        onChange={(e) => setInterpretation(e.target.value)}
        rows={3}
        placeholder="Findings, interpretation, and plan"
        className="w-full rounded-[5px] border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary/50"
      />
      <select
        value={decision}
        onChange={(e) => setDecision(e.target.value)}
        className="h-8 w-full rounded-[5px] border border-border bg-background px-2 text-[12px]"
      >
        <option value="ADVICE_ONLY">Advice and monitoring</option>
        <option value="PRESCRIPTION">Prescribe medication</option>
        <option value="INVESTIGATION">Further investigations</option>
        <option value="SPECIALIST_BOOKING">Book in-person specialist</option>
        <option value="REFERRAL_LETTER">Referral letter</option>
        <option value="INPATIENT_REFERRAL">Urgent / inpatient</option>
      </select>
      <button
        type="button"
        disabled={review.isPending || !interpretation.trim()}
        onClick={() =>
          review.mutate(
            { id: order.id, interpretation: interpretation.trim(), management_decision: decision },
            {
              onSuccess: () => toast.success("Review saved. The episode stays open only if another clinical task is still needed."),
              onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not save the review."),
            },
          )
        }
        className="h-8 rounded-[5px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {review.isPending ? "Saving…" : "Record review"}
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
              {scope === "pharmacy" ? "Patients directed here with a prescription" : "Patients referred to this clinic or hospital"}
            </h3>
            {referrals.map((row) => (
              <article key={`ref-${row.id}`} className="rounded-[6px] border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{row.patient?.name || "Patient"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{row.status} · {row.referring_doctor?.name || "Doctor"}</p>
              </article>
            ))}
          </div>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading", "Loading…")}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("pages.care.empty", "When a doctor sends labs, imaging, procedures or a medicine packet, it appears here with the patient identity and protocol.")}
          </p>
        ) : (
          orders.map((order) => {
            const Icon = iconFor(String(order.order_type));
            const label = CLINICAL_CATALOG[order.order_type as keyof typeof CLINICAL_CATALOG]?.label || order.title || order.order_type;
            return (
              <article key={order.id} className="rounded-[6px] border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {order.status}
                      {order.review_status ? ` · review ${order.review_status}` : ""}
                      {" · "}
                      {order.patient_code || "packet"} · {order.urgency || "medium"}
                    </p>
                    <Snapshot order={order} />
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
