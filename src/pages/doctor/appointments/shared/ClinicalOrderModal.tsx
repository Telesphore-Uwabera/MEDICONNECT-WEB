import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetSearchHospitals, type ApiHospital } from "@/hooks/patient/use-patient-search-hospital";
import { useSearchPharmacies, type Pharmacy } from "@/hooks/patient/use-patient-search-pharmacy";
import { useCreateCareOrder, type CareOrderType } from "@/hooks/doctor/use-care-orders";
import { usePatientMedicalRecord } from "@/hooks/doctor/use-doctor-patient-record";
import { CLINICAL_CATALOG, HOSPITAL_PROTOCOL, PHARMACY_PROTOCOL } from "./clinical-catalog";

interface Props {
  open: boolean;
  kind: CareOrderType;
  patientId: number | null;
  patientName?: string;
  appointmentId?: number | null;
  instantConsultationId?: number | null;
  defaultNotes?: string;
  defaultDiagnosis?: string;
  parentOrderId?: number | null;
  hospitalResults?: string | null;
  onClose: () => void;
  onSkip: () => void;
  onCreated: () => void;
}

export function ClinicalOrderModal({
  open,
  kind,
  patientId,
  patientName,
  appointmentId,
  instantConsultationId,
  defaultNotes,
  defaultDiagnosis,
  parentOrderId,
  hospitalResults,
  onClose,
  onSkip,
  onCreated,
}: Props) {
  const { t } = useTranslation();
  const catalog = CLINICAL_CATALOG[kind];
  const protocol = catalog?.needsPharmacy ? PHARMACY_PROTOCOL : HOSPITAL_PROTOCOL;
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const [hospital, setHospital] = useState<ApiHospital | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [selected, setSelected] = useState<string[]>(
    kind === "pharmacy_packet" || kind === "facility_packet" ? [...(catalog?.items || [])] : [],
  );
  const [protocolOn, setProtocolOn] = useState<string[]>([...protocol]);
  const [notes, setNotes] = useState(defaultNotes ?? "");
  const [message, setMessage] = useState("");
  const [otherItem, setOtherItem] = useState("");
  const create = useCreateCareOrder();
  const { data: record } = usePatientMedicalRecord(patientId);

  const { data: hospitalsData, isLoading: loadingHospitals } = useGetSearchHospitals(
    catalog?.needsFacility && !hospital ? { q: debounced } : {},
    Boolean(catalog?.needsFacility && !hospital),
  );
  const { data: pharmaciesData, isLoading: loadingPharmacies } = useSearchPharmacies({
    q: catalog?.needsPharmacy && !pharmacy ? debounced : undefined,
    per_page: 12,
  });

  const hospitals = (hospitalsData as { data?: ApiHospital[] } | undefined)?.data ?? [];
  const pharmacies = pharmaciesData?.data ?? [];
  const items = useMemo(() => {
    const extra = otherItem.trim() ? [otherItem.trim()] : [];
    return [...selected, ...extra];
  }, [selected, otherItem]);

  const destinationOk =
    (!catalog?.needsFacility || !!hospital) && (!catalog?.needsPharmacy || !!pharmacy);
  const protocolReady = protocolOn.length === protocol.length;
  const canSubmit =
    !!patientId &&
    destinationOk &&
    items.length > 0 &&
    protocolReady &&
    message.trim().length > 8 &&
    !create.isPending;

  const toggle = (item: string) =>
    setSelected((prev) => (prev.includes(item) ? prev.filter((row) => row !== item) : [...prev, item]));

  const handleSubmit = () => {
    if (!canSubmit || !patientId) return;
    create.mutate(
      {
        patient_id: patientId,
        appointment_id: appointmentId ?? undefined,
        instant_consultation_id: instantConsultationId ?? undefined,
        order_type: kind,
        hospital_id: hospital ? Number(hospital.id) : undefined,
        pharmacy_id: pharmacy ? Number(pharmacy.id) : undefined,
        title: catalog?.label,
        clinical_notes: notes,
        doctor_message: message,
        protocol: protocolOn,
        parent_order_id: parentOrderId ?? undefined,
        diagnosis: defaultDiagnosis,
        chief_complaint: defaultNotes,
        hospital_results: hospitalResults ?? undefined,
        items,
      },
      {
        onSuccess: () => {
          toast.success(t("pages.doctor.care_order_sent", "Clinical packet sent. The next team can see the patient context."));
          onCreated();
        },
        onError: (error: unknown) => {
          toast.error(error instanceof Error ? error.message : t("pages.doctor.care_order_failed", "Could not send the care order."));
        },
      },
    );
  };

  if (!open || !catalog) return null;

  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{catalog.label}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {patientName ? `${patientName} · ` : ""}
              {t("pages.doctor.care_order_share", "Allergies, current medicines and this consult are attached automatically.")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-[5px] p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          <div className="rounded-[6px] border border-border bg-muted/30 p-3 text-[11px]">
            <p className="font-semibold text-foreground">{t("pages.doctor.care_patient_id_label", "Patient on this packet")}</p>
            <p className="mt-1 text-muted-foreground">
              {patientName || record?.patient?.name || t("pages.doctor.unknown_patient", "Patient")}
              {record?.patient?.email ? ` · ${record.patient.email}` : ""}
              {patientId ? ` · ID ${patientId}` : ""}
            </p>
            {defaultDiagnosis ? <p className="mt-1"><span className="font-semibold">Diagnosis:</span> {defaultDiagnosis}</p> : null}
            {defaultNotes ? <p className="mt-1"><span className="font-semibold">What the patient reported:</span> {defaultNotes}</p> : null}
            {hospitalResults ? <p className="mt-1"><span className="font-semibold">Facility results:</span> {hospitalResults}</p> : null}
          </div>
          {(record?.known_allergies || record?.current_medications || record?.chronic_conditions) && (
            <div className="rounded-[6px] border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-foreground">
              {record.known_allergies ? <p><span className="font-semibold">Allergies:</span> {record.known_allergies}</p> : null}
              {record.current_medications ? <p className="mt-1"><span className="font-semibold">Current medicines:</span> {record.current_medications}</p> : null}
              {record.chronic_conditions ? <p className="mt-1"><span className="font-semibold">Conditions:</span> {record.chronic_conditions}</p> : null}
            </div>
          )}

          {catalog.needsFacility && !hospital && (
            <SearchList
              query={query}
              setQuery={setQuery}
              loading={loadingHospitals}
              placeholder={t("pages.doctor.search_facilities", "Search partner facilities…")}
              rows={hospitals.map((item) => ({ id: item.id, title: item.name_en, sub: [item.city, item.address].filter(Boolean).join(" · ") }))}
              onPick={(id) => setHospital(hospitals.find((row) => row.id === id) || null)}
            />
          )}
          {hospital && (
            <Chosen name={hospital.name_en} onClear={() => setHospital(null)} />
          )}
          {catalog.needsPharmacy && !pharmacy && (
            <SearchList
              query={query}
              setQuery={setQuery}
              loading={loadingPharmacies}
              placeholder={t("pages.doctor.search_pharmacies", "Search partner pharmacies…")}
              rows={pharmacies.map((item) => ({ id: item.id, title: item.name, sub: [item.city, item.address].filter(Boolean).join(" · ") }))}
              onPick={(id) => setPharmacy(pharmacies.find((row) => row.id === id) || null)}
            />
          )}
          {pharmacy && <Chosen name={pharmacy.name} onClear={() => setPharmacy(null)} />}

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {catalog.items.map((item) => (
              <label key={item} className={cn("flex items-start gap-2 rounded-[6px] border px-2.5 py-2 text-[11px]", selected.includes(item) ? "border-primary/40 bg-primary/5" : "border-border")}>
                <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} className="mt-0.5" />
                {item}
              </label>
            ))}
          </div>
          <input
            value={otherItem}
            onChange={(e) => setOtherItem(e.target.value)}
            placeholder={t("pages.doctor.care_order_other", "Other item…")}
            className="h-9 w-full rounded-[5px] border border-border bg-background px-3 text-[12px] outline-none focus:border-primary/50"
          />
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("pages.doctor.care_protocol", "Protocol the next team must follow")}
            </p>
            <div className="space-y-1.5">
              {protocol.map((step) => (
                <label key={step} className="flex items-start gap-2 rounded-[6px] border border-border px-2.5 py-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={protocolOn.includes(step)}
                    onChange={() =>
                      setProtocolOn((prev) =>
                        prev.includes(step) ? prev.filter((row) => row !== step) : [...prev, step],
                      )
                    }
                    className="mt-0.5"
                  />
                  {step}
                </label>
              ))}
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("pages.doctor.care_order_notes", "What the patient told you in this consult")}
            className="w-full rounded-[5px] border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary/50"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder={
              catalog?.needsPharmacy
                ? t("pages.doctor.care_pharmacy_message", "Message to the pharmacy (dispense instructions)")
                : t("pages.doctor.care_facility_message", "Message to the clinic or hospital (why they are coming, what to do)")
            }
            className="w-full rounded-[5px] border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary/50"
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
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[5px] bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("pages.doctor.send_clinical_packet", "Send clinical packet")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Chosen({ name, onClear }: { name: string; onClear: () => void }) {
  return (
    <button type="button" onClick={onClear} className="flex w-full items-center justify-between rounded-[6px] border border-primary/30 bg-primary/5 px-3 py-2 text-left text-xs font-semibold">
      {name}
      <span className="text-[10px] text-primary">Change</span>
    </button>
  );
}

function SearchList({
  query,
  setQuery,
  loading,
  placeholder,
  rows,
  onPick,
}: {
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  placeholder: string;
  rows: { id: number; title: string; sub?: string }[];
  onPick: (id: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Search className="h-3 w-3" />
        Destination
      </label>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-[5px] border border-border bg-background px-3 text-[12px] outline-none focus:border-primary/50" />
      <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
        {loading ? (
          <p className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </p>
        ) : (
          rows.map((row) => (
            <button key={row.id} type="button" onClick={() => onPick(row.id)} className="flex w-full flex-col rounded-[6px] border border-border/70 px-3 py-2 text-left hover:border-primary/40">
              <span className="text-xs font-semibold">{row.title}</span>
              {row.sub ? <span className="text-[11px] text-muted-foreground">{row.sub}</span> : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
