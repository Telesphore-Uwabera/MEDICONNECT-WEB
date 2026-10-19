import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Check, Loader2, Pill, Search, Stethoscope, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetSearchHospitals, type ApiHospital } from "@/hooks/patient/use-patient-search-hospital";
import { useGetSearchDoctors, type ApiDoctor } from "@/hooks/patient/use-patient-doctor";
import { useSearchPharmacies, type Pharmacy } from "@/hooks/patient/use-patient-search-pharmacy";
import { useCreateReferral, type ReferralTargetType } from "@/hooks/doctor/use-doctor-referrals";
import { CustomSelect } from "@/components/ui/custom-select";

interface Props {
  open: boolean;
  kind: ReferralTargetType;
  patientId: number | null;
  patientName?: string;
  appointmentId?: number | null;
  instantConsultationId?: number | null;
  defaultReason?: string;
  onClose: () => void;
  onSkip: () => void;
  onCreated: () => void;
}

export function ReferralCreateModal({
  open,
  kind,
  patientId,
  patientName,
  appointmentId,
  instantConsultationId,
  defaultReason,
  onClose,
  onSkip,
  onCreated,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const [reason, setReason] = useState(defaultReason ?? "");
  const [notes, setNotes] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [hospital, setHospital] = useState<ApiHospital | null>(null);
  const [doctor, setDoctor] = useState<ApiDoctor | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);

  const create = useCreateReferral();
  const { data: hospitalsData, isLoading: loadingHospitals } = useGetSearchHospitals(
    kind === "hospital" && !hospital ? { q: debounced } : {},
    kind === "hospital" && !hospital,
  );
  const { data: doctorsData, isLoading: loadingDoctors } = useGetSearchDoctors(
    kind === "doctor" ? { q: debounced, per_page: 12 } : { per_page: 12 },
  );
  const { data: pharmaciesData, isLoading: loadingPharmacies } = useSearchPharmacies(
    kind === "pharmacy" && !pharmacy ? { q: debounced, per_page: 12 } : { per_page: 12 },
  );

  const hospitals = (hospitalsData as { data?: ApiHospital[] } | undefined)?.data ?? [];
  const doctors = doctorsData?.data ?? [];
  const pharmacies = (pharmaciesData as { data?: Pharmacy[] } | undefined)?.data ?? [];

  const selectedName =
    kind === "hospital"
      ? hospital?.name_en
      : kind === "doctor"
        ? doctor?.user?.name || doctor?.designations
        : pharmacy?.name;

  const canSubmit = !!patientId && !!selectedName && reason.trim().length > 3 && !create.isPending;

  const title =
    kind === "hospital"
      ? t("pages.doctor.refer_facility_modal_title", "Refer to a health facility")
      : kind === "pharmacy"
        ? t("pages.doctor.refer_pharmacy_modal_title", "Direct to a partner pharmacy")
        : t("pages.doctor.refer_doctor_modal_title", "Refer to another doctor");

  const handleSubmit = () => {
    if (!canSubmit || !patientId) return;
    create.mutate(
      {
        patient_id: patientId,
        appointment_id: appointmentId ?? undefined,
        instant_consultation_id: instantConsultationId ?? undefined,
        hospital_id: hospital ? Number(hospital.id) : undefined,
        referred_to_doctor_id: doctor ? Number(doctor.id) : undefined,
        pharmacy_id: pharmacy ? Number(pharmacy.id) : undefined,
        reason,
        notes,
        urgency,
      },
      {
        onSuccess: () => {
          toast.success(t("pages.doctor.referral_sent", "Referral sent. The patient will see it in their dashboard."));
          onCreated();
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : t("pages.doctor.referral_send_failed", "Could not send the referral.");
          toast.error(message);
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {patientName && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t("pages.doctor.refer_for_patient", { defaultValue: "Patient: {{name}}", name: patientName })}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-[5px] p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          {!selectedName ? (
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Search className="h-3 w-3" />
                {t("common.search", "Search")}
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  kind === "hospital"
                    ? t("pages.doctor.search_facilities", "Search partner facilities…")
                    : kind === "pharmacy"
                      ? t("pages.doctor.search_pharmacies", "Search partner pharmacies…")
                      : t("pages.doctor.search_doctors", "Search doctors…")
                }
                className="h-9 w-full rounded-[5px] border border-border bg-background px-3 text-[12px] outline-none focus:border-primary/50"
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => {
                setHospital(null);
                setDoctor(null);
                setPharmacy(null);
              }}
              className="flex w-full items-center justify-between rounded-[6px] border border-primary/30 bg-primary/5 px-3 py-2 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                {kind === "hospital" ? <Building2 className="h-4 w-4 text-primary" /> : kind === "pharmacy" ? <Pill className="h-4 w-4 text-primary" /> : <Stethoscope className="h-4 w-4 text-primary" />}
                {selectedName}
              </span>
              <span className="text-[10px] text-primary">{t("common.change", "Change")}</span>
            </button>
          )}

          {!selectedName && (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {kind === "hospital" && (loadingHospitals ? <RowLoading /> : hospitals.map((item) => (
                <PickRow key={item.id} title={item.name_en} sub={[item.city, item.address].filter(Boolean).join(" · ")} onClick={() => setHospital(item)} />
              )))}
              {kind === "doctor" && (loadingDoctors ? <RowLoading /> : doctors.map((item) => (
                <PickRow key={item.id} title={item.user?.name || item.designations || `Doctor #${item.id}`} sub={item.specialization || ""} onClick={() => setDoctor(item)} />
              )))}
              {kind === "pharmacy" && (loadingPharmacies ? <RowLoading /> : pharmacies.map((item) => (
                <PickRow key={item.id} title={item.name} sub={[item.city, item.address].filter(Boolean).join(" · ")} onClick={() => setPharmacy(item)} />
              )))}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("pages.doctor.reason_for_referral", "Reason")}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-[5px] border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("pages.doctor.notes", "Notes")}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-[5px] border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary/50"
            />
          </label>
          <CustomSelect
            value={urgency}
            onChange={setUrgency}
            options={[
              { value: "low", label: t("pages.doctor.urgency_low", "Low") },
              { value: "medium", label: t("pages.doctor.urgency_medium", "Medium") },
              { value: "high", label: t("pages.doctor.urgency_high", "High") },
              { value: "emergency", label: t("pages.doctor.urgency_emergency", "Emergency") },
            ]}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onSkip} className="inline-flex h-9 items-center justify-center rounded-[5px] border border-border px-3 text-xs font-semibold hover:bg-muted">
            {t("common.skip", "Skip")}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-[5px] bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
            )}
          >
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("pages.doctor.send_referral", "Send referral")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PickRow({ title, sub, onClick }: { title: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full flex-col rounded-[6px] border border-border/70 px-3 py-2 text-left hover:border-primary/40 hover:bg-secondary/40">
      <span className="text-xs font-semibold text-foreground">{title}</span>
      {sub ? <span className="text-[11px] text-muted-foreground">{sub}</span> : null}
    </button>
  );
}

function RowLoading() {
  return (
    <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Loading…
    </div>
  );
}
