// Quick post-call prescription step (completion flow: record → THIS → booking).
//
// The doctor fills a diagnosis + medicine items, issues (signs) the prescription
// in one shot, then optionally sends it to a pharmacy (pickup / home delivery).
// Skipping leaves no prescription and continues the flow.

import { useMemo, useState } from "react";
import {
  X, Plus, Trash2, Pill, Loader2, FileText, ExternalLink,
  Search, Building2, Check, Truck, Store,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { prepareRichTextForSave, RichTextarea } from "@/components/ui/rich-textarea";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useCreatePrescription,
  useIssuePrescription,
  useSendToPharmacy,
  type PrescriptionItem,
} from "@/hooks/doctor/use-doctor-prescriptions";
import {
  useSearchPharmacies,
  type Pharmacy,
} from "@/hooks/patient/use-patient-search-pharmacy";
import type { ApiError } from "@/lib/Api";

interface Props {
  appointmentId: number;
  patientName?: string;
  defaultDiagnosis?: string;
  defaultNotes?: string;
  /** Skip prescriptions entirely and continue the flow. */
  onSkip: () => void;
  /** Finished (issued, optionally sent) — continue the flow. */
  onDone: () => void;
}

const inputCls =
  "w-full h-9 px-3 rounded-[5px] border border-border bg-background text-[12px] text-foreground outline-none focus:border-primary/50 transition-colors";
const labelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

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
  return d.toISOString().slice(0, 10);
}

export function QuickPrescriptionModal({
  appointmentId,
  patientName,
  defaultDiagnosis,
  defaultNotes,
  onSkip,
  onDone,
}: Props) {
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

  // Create draft → issue (sign) in sequence.
  const handleIssue = () => {
    if (!canIssue) {
      toast.error("Add a diagnosis and at least one medicine (name, dosage, frequency).");
      return;
    }
    createRx.mutate(
      {
        appointment_id: appointmentId,
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
              toast.success("Prescription issued.");
              setPhase("pharmacy");
            },
            onError: (err) =>
              toast.error((err as ApiError)?.message || "Failed to issue prescription."),
          });
        },
        onError: (err) =>
          toast.error((err as ApiError)?.message || "Failed to create prescription."),
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
                {phase === "form" ? "Quick prescription" : "Send to pharmacy"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {patientName ? `For ${patientName} · optional` : "Optional"}
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
                      toast.success("Prescription sent to pharmacy.");
                      onDone();
                    },
                    onError: (err) =>
                      toast.error(
                        (err as ApiError)?.message || "Failed to send to pharmacy.",
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
            {phase === "form" ? "Skip prescription" : "Skip pharmacy"}
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
              Issue prescription
            </button>
          ) : (
            <button
              onClick={onDone}
              className="px-4 h-9 rounded-[6px] text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2"
            >
              <Check className="h-3.5 w-3.5" />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Prescription form ──────────────────────────────────────────────────────── */

function PrescriptionForm({
  diagnosis, setDiagnosis, notes, setNotes, validUntil, setValidUntil,
  items, setItem, addItem, removeItem,
}: {
  diagnosis: string; setDiagnosis: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  validUntil: string; setValidUntil: (v: string) => void;
  items: PrescriptionItem[];
  setItem: (i: number, patch: Partial<PrescriptionItem>) => void;
  addItem: () => void;
  removeItem: (i: number) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <label className={labelCls}>Diagnosis *</label>
          <input
            className={inputCls}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Malaria"
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Valid until</label>
          <input
            type="date"
            className={inputCls}
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelCls}>Notes</label>
        <RichTextarea
          value={notes}
          onChange={setNotes}
          placeholder="e.g. Take with food"
          minHeight={110}
          editorClassName="text-[12px]"
        />
      </div>

      {/* Medicine items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelCls}>Medicines</label>
          <button
            onClick={addItem}
            className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add medicine
          </button>
        </div>

        {items.map((it, i) => (
          <div key={i} className="rounded-[6px] border border-border bg-background/50 p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <input
                className={cn(inputCls, "flex-1")}
                value={it.medicine_name}
                onChange={(e) => setItem(i, { medicine_name: e.target.value })}
                placeholder="Medicine name *"
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
                onChange={(e) => setItem(i, { dosage: e.target.value })} placeholder="Dosage *" />
              <input className={inputCls} value={it.frequency}
                onChange={(e) => setItem(i, { frequency: e.target.value })} placeholder="Frequency *" />
              <input className={inputCls} value={it.duration}
                onChange={(e) => setItem(i, { duration: e.target.value })} placeholder="Duration" />
              <input className={inputCls} type="number" min={1} value={it.quantity}
                onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} placeholder="Qty" />
            </div>
            <input className={inputCls} value={it.instructions ?? ""}
              onChange={(e) => setItem(i, { instructions: e.target.value })}
              placeholder="Instructions (e.g. Take after meals)" />
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Pharmacy step ──────────────────────────────────────────────────────────── */

function PharmacyStep({
  pdfUrl, sending, onSend,
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
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 350);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "home_delivery">("pickup");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isFetching } = useSearchPharmacies({ q: debounced, per_page: 8 });
  const pharmacies = data?.data ?? [];

  const canSend = useMemo(
    () => !!pharmacy && (deliveryType === "pickup" || address.trim().length > 0) && !sending,
    [pharmacy, deliveryType, address, sending],
  );

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
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-[6px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-600 hover:bg-emerald-500/15 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          View signed prescription PDF
          <ExternalLink className="h-3 w-3 ml-auto" />
        </a>
      )}

      <p className="text-[11px] text-muted-foreground">
        Optionally send this prescription to a pharmacy for the patient.
      </p>

      {/* Pharmacy search */}
      {!pharmacy ? (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className={cn(inputCls, "pl-8")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pharmacies…"
            />
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1">
            {isFetching && (
              <div className="flex items-center gap-2 px-2 py-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </div>
            )}
            {!isFetching && pharmacies.length === 0 && (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">No pharmacies found.</p>
            )}
            {pharmacies.map((p) => (
              <button
                key={p.id}
                onClick={() => setPharmacy(p)}
                className="w-full flex items-center gap-2 rounded-[6px] border border-border bg-background px-2.5 py-2 text-left hover:border-primary/50 transition-colors"
              >
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-medium text-foreground truncate">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {[p.city, p.address].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-[6px] border border-primary/30 bg-primary/5 px-2.5 py-2">
            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-medium text-foreground truncate">{pharmacy.name}</span>
              <span className="block text-[10px] text-muted-foreground truncate">
                {[pharmacy.city, pharmacy.address].filter(Boolean).join(" · ")}
              </span>
            </span>
            <button
              onClick={() => setPharmacy(null)}
              className="text-[11px] text-primary hover:text-primary/80 font-medium"
            >
              Change
            </button>
          </div>

          {/* Delivery type */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "pickup", label: "Pickup", icon: Store },
              { key: "home_delivery", label: "Home delivery", icon: Truck },
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
              <label className={labelCls}>Delivery address *</label>
              <input
                className={inputCls}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. KG 123 St, Kigali"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className={labelCls}>Notes</label>
            <input
              className={inputCls}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call before delivery"
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
            Send to pharmacy
          </button>
        </div>
      )}
    </div>
  );
}
