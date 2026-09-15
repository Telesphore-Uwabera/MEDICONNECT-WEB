import { toLocalDateInputValue } from "@/lib/date";
import { useTranslation } from "react-i18next";
// Quick post-call prescription step (completion flow: record  THIS  booking).
//
// The doctor fills a diagnosis + medicine items, issues (signs) the prescription
// in one shot, then optionally sends it to a pharmacy (pickup / home delivery).
// Skipping leaves no prescription and continues the flow.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X, Plus, Trash2, Pill, Loader2, FileText, ExternalLink,
  Search, Building2, Check, Truck, Store,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { prepareRichTextForSave, RichTextarea } from "@/components/ui/rich-textarea";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useCreatePrescription,
  useIssuePrescription,
  useMatchingPharmacies,
  useSendToPharmacy,
  type MatchingPharmacy,
  type PrescriptionItem,
} from "@/hooks/doctor/use-doctor-prescriptions";
import {
  useSearchPharmacies,
  type Pharmacy,
} from "@/hooks/patient/use-patient-search-pharmacy";
import type { ApiError } from "@/lib/api";

interface Props {
  /** Provide exactly one of appointmentId / instantConsultationId. */
  appointmentId?: number;
  instantConsultationId?: number;
  patientName?: string;
  defaultDiagnosis?: string;
  defaultNotes?: string;
  /** Skip prescriptions entirely and continue the flow. */
  onSkip: () => void;
  /** Finished (issued, optionally sent)  continue the flow. */
  onDone: () => void;
}

interface PublicMedicine {
  pharmacy_id?: number;
  name: string;
  generic_name?: string | null;
  price?: string | null;
  currency?: string | null;
  unit?: string | null;
  barcode?: string | null;
  rn?: number | string;
}

interface PublicMedicinesResponse {
  count: number;
  medicines: PublicMedicine[];
}

const inputCls =
  "w-full h-9 px-3 rounded-[5px] border border-border bg-background text-[12px] text-foreground outline-none focus:border-primary/50 transition-colors";
const labelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

const resolvePrescriptionPdfUrl = (url: string | null) => {
  const raw = url?.trim();
  if (!raw) return null;
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;

  const apiBase = import.meta.env.VITE_APP_BASE_URL ?? "";
  const apiOrigin = apiBase ? new URL(apiBase, window.location.origin).origin : window.location.origin;
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return `${apiOrigin}${normalized}`;
};
function emptyItem(): PrescriptionItem {
  return {
    medicine_name: "",
    dosage: "",
    frequency: "",
    duration: "",
    quantity: 1,
    instructions: "",
  };
}

function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return toLocalDateInputValue(d);
}

export function QuickPrescriptionModal({
  appointmentId,
  instantConsultationId,
  patientName,
  defaultDiagnosis,
  defaultNotes,
  onSkip,
  onDone,
}: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"form" | "pharmacy">("form");

  // Prescription form
  const [diagnosis, setDiagnosis] = useState(defaultDiagnosis ?? "");
  const [notes, setNotes] = useState(defaultNotes ?? "");
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [items, setItems] = useState<PrescriptionItem[]>([emptyItem()]);

  // Issued prescription
  const [prescriptionId, setPrescriptionId] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const createRx = useCreatePrescription();
  const issueRx = useIssuePrescription();
  const sendRx = useSendToPharmacy();
  const { data: medicinesData, isFetching: medicinesLoading } =
    useQuery<PublicMedicinesResponse>({
      queryKey: ["public-medicines-all"],
      queryFn: () => apiFetch("/public/medicines/all"),
      staleTime: 5 * 60_000,
    });

  const issuing = createRx.isPending || issueRx.isPending;

  const setItem = (i: number, patch: Partial<PrescriptionItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (i: number) =>
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const validItems = items.filter(
    (it) => it.medicine_name.trim() && it.dosage.trim() && it.frequency.trim(),
  );

  const canIssue = diagnosis.trim().length > 0 && validItems.length > 0 && !issuing;

  // Create draft  issue (sign) in sequence.
  const handleIssue = () => {
    if (!canIssue) {
      toast.error(t("pages.doctor.quick_rx.validation_required"));
      return;
    }
    createRx.mutate(
      {
        ...(appointmentId != null ? { appointment_id: appointmentId } : {}),
        ...(instantConsultationId != null ? { instant_consultation_id: instantConsultationId } : {}),
        diagnosis: diagnosis.trim(),
        notes: prepareRichTextForSave(notes),
        valid_until: validUntil || undefined,
        items: validItems.map((it) => ({
          ...it,
          quantity: Number(it.quantity) || 1,
        })),
      },
      {
        onSuccess: (res) => {
          const id = res.prescription.id;
          issueRx.mutate(id, {
            onSuccess: (issued) => {
              setPrescriptionId(id);
              setPdfUrl(issued.prescription.pdf_url ?? (issued as any).pdf_url ?? null);
              toast.success(t("pages.doctor.quick_rx.issued"));
              setPhase("pharmacy");
            },
            onError: (err) =>
              toast.error((err as ApiError)?.message || t("pages.doctor.quick_rx.issue_failed")),
          });
        },
        onError: (err) =>
          toast.error((err as ApiError)?.message || t("pages.doctor.quick_rx.create_failed")),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[9996] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[6px] border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-[6px] bg-primary/10 flex items-center justify-center">
              <Pill className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground leading-tight">
                {phase === "form" ? t("pages.doctor.quick_rx.title") : t("pages.doctor.quick_rx.send_title")}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {patientName ? t("pages.doctor.quick_rx.for_patient", { patient: patientName }) : t("pages.doctor.quick_rx.optional")}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {phase === "form" ? (
            <PrescriptionForm
              diagnosis={diagnosis}
              setDiagnosis={setDiagnosis}
              notes={notes}
              setNotes={setNotes}
              validUntil={validUntil}
              setValidUntil={setValidUntil}
              items={items}
              setItem={setItem}
              addItem={addItem}
              removeItem={removeItem}
              medicines={medicinesData?.medicines ?? []}
              medicinesLoading={medicinesLoading}
            />
          ) : (
            <PharmacyStep
              prescriptionId={prescriptionId!}
              pdfUrl={pdfUrl}
              sending={sendRx.isPending}
              onSend={(payload) =>
                sendRx.mutate(
                  { id: prescriptionId!, payload },
                  {
                    onSuccess: () => {
                      toast.success(t("pages.doctor.quick_rx.sent"));
                      onDone();
                    },
                    onError: (err) =>
                      toast.error(
                        (err as ApiError)?.message || t("pages.doctor.quick_rx.send_failed"),
                      ),
                  },
                )
              }
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border shrink-0">
          <button
            onClick={onSkip}
            className="px-3 h-9 rounded-[6px] text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {phase === "form" ? t("pages.doctor.quick_rx.skip_prescription") : t("pages.doctor.quick_rx.skip_pharmacy")}
          </button>

          {phase === "form" ? (
            <button
              onClick={handleIssue}
              disabled={!canIssue}
              className={cn(
                "px-4 h-9 rounded-[6px] text-[12px] font-semibold flex items-center gap-2 transition-all",
                canIssue
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              {issuing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {t("pages.doctor.quick_rx.issue_prescription")}
            </button>
          ) : (
            <button
              onClick={onDone}
              className="px-4 h-9 rounded-[6px] text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2"
            >
              <Check className="h-3.5 w-3.5" />
              {t("pages.doctor.quick_rx.done")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
 
function PrescriptionForm({
  diagnosis, setDiagnosis, notes, setNotes, validUntil, setValidUntil,
  items, setItem, addItem, removeItem, medicines, medicinesLoading,
}: {
  diagnosis: string; setDiagnosis: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  validUntil: string; setValidUntil: (v: string) => void;
  items: PrescriptionItem[];
  setItem: (i: number, patch: Partial<PrescriptionItem>) => void;
  addItem: () => void;
  removeItem: (i: number) => void;
  medicines: PublicMedicine[];
  medicinesLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <label className={labelCls}>{t("pages.doctor.quick_rx.diagnosis")} *</label>
          <input
            className={inputCls}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder={t("pages.doctor.quick_rx.diagnosis_placeholder")}
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>{t("pages.doctor.quick_rx.valid_until")}</label>
          <input
            type="date"
            className={inputCls}
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelCls}>{t("pages.doctor.quick_rx.notes")}</label>
        <RichTextarea
          value={notes}
          onChange={setNotes}
          placeholder={t("pages.doctor.quick_rx.notes_placeholder")}
          minHeight={110}
          editorClassName="text-[12px]"
        />
      </div>

      {/* Medicine items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelCls}>{t("pages.doctor.quick_rx.medicines")}</label>
          <button
            onClick={addItem}
            className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> {t("pages.doctor.quick_rx.add_medicine")}
          </button>
        </div>

        {items.map((it, i) => (
          <div key={i} className="rounded-[6px] border border-border bg-background/50 p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <MedicineNameCombobox
                value={it.medicine_name}
                onChange={(medicine_name) => setItem(i, { medicine_name })}
                medicines={medicines}
                isLoading={medicinesLoading}
              />
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(i)}
                  className="h-9 w-9 shrink-0 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input className={inputCls} value={it.dosage}
                onChange={(e) => setItem(i, { dosage: e.target.value })} placeholder={t("pages.doctor.quick_rx.dosage")} />
              <input className={inputCls} value={it.frequency}
                onChange={(e) => setItem(i, { frequency: e.target.value })} placeholder={t("pages.doctor.quick_rx.frequency")} />
              <input className={inputCls} value={it.duration}
                onChange={(e) => setItem(i, { duration: e.target.value })} placeholder={t("pages.doctor.quick_rx.duration")} />
              <input className={inputCls} type="number" min={1} value={it.quantity}
                onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} placeholder={t("pages.doctor.quick_rx.qty")} />
            </div>
            <input className={inputCls} value={it.instructions ?? ""}
              onChange={(e) => setItem(i, { instructions: e.target.value })}
              placeholder={t("pages.doctor.quick_rx.instructions_placeholder")} />
          </div>
        ))}
      </div>
    </>
  );
}

function MedicineNameCombobox({
  value,
  onChange,
  medicines,
  isLoading,
}: {
  value: string;
  onChange: (value: string) => void;
  medicines: PublicMedicine[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const query = value.trim().toLowerCase();
  const filtered = useMemo(() => {
    const seen = new Set<string>();
    return medicines
      .filter((medicine) => {
        if (!query) return true;
        return [medicine.name, medicine.generic_name, medicine.barcode]
          .filter(Boolean)
          .some((part) => String(part).toLowerCase().includes(query));
      })
      .filter((medicine) => {
        const key = [
          medicine.name,
          medicine.generic_name ?? "",
          medicine.unit ?? "",
          medicine.price ?? "",
        ].join("|").toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 12);
  }, [medicines, query]);
  const hasExactMatch = medicines.some(
    (medicine) => medicine.name.toLowerCase() === query,
  );

  return (
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        className={cn(inputCls, "pl-8")}
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        placeholder={t("pages.doctor.quick_rx.search_medicine_placeholder")}
        autoComplete="off"
      />

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[10010] overflow-hidden rounded-[6px] border border-border bg-popover shadow-xl">
          <div className="max-h-56 overflow-y-auto p-1">
            {isLoading && (
              <div className="flex items-center gap-2 px-2.5 py-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("pages.doctor.quick_rx.loading_medicines")}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="px-2.5 py-2 text-[11px] text-muted-foreground">
                {t("pages.doctor.quick_rx.no_medicine_found")}
              </div>
            )}

            {filtered.map((medicine) => (
              <button
                key={(medicine.pharmacy_id ?? "p") + "-" + (medicine.rn ?? medicine.barcode ?? medicine.name) + "-" + medicine.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(medicine.name);
                  setOpen(false);
                }}
                className="w-full rounded-[5px] px-2.5 py-2 text-left hover:bg-secondary transition-colors"
              >
                <span className="block text-[12px] font-semibold text-foreground">
                  {medicine.name}
                </span>
                <span className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  {medicine.generic_name && <span>{medicine.generic_name}</span>}
                  {medicine.unit && <span>{medicine.unit}</span>}
                  {medicine.price && (
                    <span>
                      {medicine.price} {medicine.currency ?? ""}
                    </span>
                  )}
                </span>
              </button>
            ))}

            {value.trim() && !hasExactMatch && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen(false)}
                className="mt-1 w-full rounded-[5px] border border-dashed border-primary/40 px-2.5 py-2 text-left text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                {t("pages.doctor.quick_rx.use_custom_medicine", { name: value.trim() })}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

 
function PharmacyStep({
  prescriptionId, pdfUrl, sending, onSend,
}: {
  prescriptionId: number;
  pdfUrl: string | null;
  sending: boolean;
  onSend: (payload: {
    pharmacy_id: number;
    delivery_type: "pickup" | "home_delivery";
    delivery_address?: string;
    notes?: string;
  }) => void;
}) {
  const { t } = useTranslation();
  type PharmacyChoice = (Pharmacy | MatchingPharmacy) & {
    match_count?: number;
    province?: string | null;
    address?: string | null;
  };

  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 350);
  const [pharmacy, setPharmacy] = useState<PharmacyChoice | null>(null);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "home_delivery">("pickup");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const resolvedPdfUrl = resolvePrescriptionPdfUrl(pdfUrl);

  const matchingQuery = useMatchingPharmacies(prescriptionId);
  const fallbackQuery = useSearchPharmacies({ q: debounced, per_page: 8 });
  const useFallback = !prescriptionId || matchingQuery.isError;
  const totalMedicines = matchingQuery.data?.total_medicines ?? 0;

  const pharmacies = useMemo<PharmacyChoice[]>(() => {
    const source = (useFallback
      ? fallbackQuery.data?.data ?? []
      : matchingQuery.data?.data ?? []) as PharmacyChoice[];

    if (useFallback) return source;

    const q = debounced.trim().toLowerCase();
    if (!q) return source;

    return source.filter((p) =>
      [p.name, p.city, p.province, p.address]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(q)),
    );
  }, [debounced, fallbackQuery.data?.data, matchingQuery.data?.data, useFallback]);

  const isFetching = useFallback ? fallbackQuery.isFetching : matchingQuery.isFetching;

  const canSend = useMemo(
    () => !!pharmacy && (deliveryType === "pickup" || address.trim().length > 0) && !sending,
    [pharmacy, deliveryType, address, sending],
  );

  const pharmacyLocation = (p: PharmacyChoice) =>
    [p.city, p.province || p.address].filter(Boolean).join(" - ");

  const matchLabel = (p: PharmacyChoice) => {
    if (useFallback || typeof p.match_count !== "number") return null;
    return totalMedicines > 0 ? `${p.match_count}/${totalMedicines}` : String(p.match_count);
  };

  const send = () => {
    if (!pharmacy) return;
    onSend({
      pharmacy_id: pharmacy.id,
      delivery_type: deliveryType,
      delivery_address: deliveryType === "home_delivery" ? address.trim() : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* {resolvedPdfUrl && (
        <a
          href={resolvedPdfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 items-center justify-between rounded-[6px] border border-primary/30 bg-primary/5 px-3 text-[12px] font-medium text-primary hover:bg-primary/10"
        >
          <span className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            {t("pages.doctor.quick_rx.view_pdf")}
          </span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )} */}

      <p className="text-[11px] text-muted-foreground">
        {t("pages.doctor.quick_rx.send_hint")}
      </p>

      {!pharmacy ? (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className={cn(inputCls, "pl-8")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("pages.doctor.quick_rx.search_pharmacies")}
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1">
            {isFetching && (
              <div className="flex items-center gap-2 px-2 py-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("pages.doctor.quick_rx.searching")}
              </div>
            )}
            {!isFetching && pharmacies.length === 0 && (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">{t("pages.doctor.quick_rx.no_pharmacies")}</p>
            )}
            {pharmacies.map((p) => {
              const matches = matchLabel(p);
              return (
                <button
                  key={p.id}
                  onClick={() => setPharmacy(p)}
                  className="w-full flex items-center gap-2 rounded-[6px] border border-border bg-background px-2.5 py-2 text-left hover:border-primary/50 transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] font-medium text-foreground truncate">{p.name}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {pharmacyLocation(p) || "-"}
                    </span>
                  </span>
                  {matches && (
                    <span
                      title="Matching medicines"
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        (p.match_count ?? 0) > 0
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground",
                      )}
                    >
                      {matches}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-[6px] border border-primary/30 bg-primary/5 px-2.5 py-2">
            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-medium text-foreground truncate">{pharmacy.name}</span>
              <span className="block text-[10px] text-muted-foreground truncate">
                {pharmacyLocation(pharmacy) || "-"}
              </span>
            </span>
            {matchLabel(pharmacy) && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {matchLabel(pharmacy)}
              </span>
            )}
            <button
              onClick={() => setPharmacy(null)}
              className="text-[11px] text-primary hover:text-primary/80 font-medium"
            >
              {t("pages.doctor.quick_rx.change")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "pickup", label: t("pages.doctor.quick_rx.pickup"), icon: Store },
              { key: "home_delivery", label: t("pages.doctor.quick_rx.home_delivery"), icon: Truck },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setDeliveryType(key)}
                className={cn(
                  "flex items-center gap-2 rounded-[6px] border px-3 py-2 text-[12px] font-medium transition-all",
                  deliveryType === key
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {deliveryType === "home_delivery" && (
            <div className="space-y-1">
              <label className={labelCls}>{t("pages.doctor.quick_rx.delivery_address")} *</label>
              <input
                className={inputCls}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("pages.doctor.quick_rx.delivery_address_placeholder")}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className={labelCls}>{t("pages.doctor.quick_rx.notes")}</label>
            <input
              className={inputCls}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("pages.doctor.quick_rx.delivery_notes_placeholder")}
            />
          </div>

          <button
            onClick={send}
            disabled={!canSend}
            className={cn(
              "w-full px-4 h-9 rounded-[6px] text-[12px] font-semibold flex items-center justify-center gap-2 transition-all",
              canSend
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("pages.doctor.quick_rx.send_to_pharmacy")}
          </button>
        </div>
      )}
    </div>
  );
}


