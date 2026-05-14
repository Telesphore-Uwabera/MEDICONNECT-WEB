import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Pill,
  MapPin,
  Star,
  Check,
  AlertCircle,
  Send,
  User,
  Mail,
  Smartphone,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addPrescription,
  matchPharmacies,
  type RxMedication,
  type DeliveryChannel,
} from "@/lib/prescription-store";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doctorName: string;
  issuer: "doctor" | "hospital";
  issuerOrg?: string;
  defaultPatientName?: string;
}

type Step = 1 | 2 | 3 | 4;

const emptyMed = (): RxMedication => ({
  name: "",
  dosage: "",
  frequency: "",
  quantity: 30,
});

export const PrescriptionWizard = ({
  open,
  onOpenChange,
  doctorName,
  issuer,
  issuerOrg,
  defaultPatientName,
}: Props) => {
  const [step, setStep] = useState<Step>(1);
  const [patientName, setPatientName] = useState(defaultPatientName ?? "");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState<RxMedication[]>([emptyMed()]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [route, setRoute] = useState<"pharmacy" | "patient-only" | null>(null);
  const [channels, setChannels] = useState<DeliveryChannel[]>(["app", "email"]);

  const matches = useMemo(
    () => matchPharmacies(meds.filter((m) => m.name.trim())),
    [meds],
  );

  const reset = () => {
    setStep(1);
    setPatientName(defaultPatientName ?? "");
    setPatientEmail("");
    setPatientPhone("");
    setDiagnosis("");
    setNotes("");
    setMeds([emptyMed()]);
    setSelectedPharmacy(null);
    setRoute(null);
    setChannels(["app", "email"]);
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const validMeds = meds.filter(
    (m) => m.name.trim() && m.dosage.trim() && m.frequency.trim(),
  );
  const canStep2 = patientName.trim() && validMeds.length > 0;
  const toggleChannel = (c: DeliveryChannel) =>
    setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const finalize = () => {
    if (!route) return;
    const finalChannels = Array.from(
      new Set<DeliveryChannel>(["app", ...channels]),
    );
    const pharmacy =
      route === "pharmacy"
        ? matches.find((m) => m.pharmacy.id === selectedPharmacy)
        : null;

    addPrescription({
      doctorName,
      patientName: patientName.trim(),
      patientEmail: patientEmail.trim(),
      patientPhone: patientPhone.trim(),
      issuer,
      issuerOrg,
      medications: validMeds,
      diagnosis: diagnosis.trim() || undefined,
      notes: notes.trim() || undefined,
      status: route === "pharmacy" ? "sent-to-pharmacy" : "sent-to-patient",
      pharmacyId: pharmacy?.pharmacy.id,
      pharmacyName: pharmacy?.pharmacy.name,
      channels: finalChannels,
    });

    toast({
      title:
        route === "pharmacy"
          ? "Prescription forwarded"
          : "Prescription sent to patient",
      description:
        route === "pharmacy"
          ? `Sent to ${pharmacy?.pharmacy.name}. Patient also received a copy via ${finalChannels.join(", ")}.`
          : `Patient received it via ${finalChannels.join(", ")}.`,
    });
    close(false);
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
      >
        <SheetHeader className="p-6 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Smart prescription
          </SheetTitle>
          <SheetDescription>
            Step {step} of 4 ·{" "}
            {step === 1
              ? "Patient & medications"
              : step === 2
                ? "Choose pharmacy"
                : step === 3
                  ? "Confirm route"
                  : "Delivery channels"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col flex-1 min-h-0 p-6 gap-4">
          {/* Stepper */}
          <div className="flex items-center gap-2 px-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  s <= step ? "bg-primary" : "bg-secondary",
                )}
              />
            ))}
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {/* Step 1 — Patient + meds */}
            {step === 1 && (
              <div className="space-y-5 py-2">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Patient name *</Label>
                    <Input
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="+250 …"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="patient@email.com"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Diagnosis</Label>
                    <Input
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Hypertension"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">
                      Medications *
                    </Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMeds((m) => [...m, emptyMed()])}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {meds.map((m, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border p-3 bg-card"
                      >
                        <div className="grid sm:grid-cols-12 gap-2">
                          <Input
                            className="sm:col-span-4"
                            placeholder="Name (e.g. Atorvastatin)"
                            value={m.name}
                            onChange={(e) =>
                              setMeds((p) =>
                                p.map((x, j) =>
                                  j === i ? { ...x, name: e.target.value } : x,
                                ),
                              )
                            }
                          />
                          <Input
                            className="sm:col-span-2"
                            placeholder="Dosage"
                            value={m.dosage}
                            onChange={(e) =>
                              setMeds((p) =>
                                p.map((x, j) =>
                                  j === i
                                    ? { ...x, dosage: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                          <Input
                            className="sm:col-span-3"
                            placeholder="Frequency"
                            value={m.frequency}
                            onChange={(e) =>
                              setMeds((p) =>
                                p.map((x, j) =>
                                  j === i
                                    ? { ...x, frequency: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                          <Input
                            className="sm:col-span-2"
                            type="number"
                            placeholder="Qty"
                            value={m.quantity ?? ""}
                            onChange={(e) =>
                              setMeds((p) =>
                                p.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        quantity:
                                          Number(e.target.value) || undefined,
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="sm:col-span-1 text-destructive"
                            disabled={meds.length === 1}
                            onClick={() =>
                              setMeds((p) => p.filter((_, j) => j !== i))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notes for patient</Label>
                  <Textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take with food, avoid alcohol…"
                  />
                </div>
              </div>
            )}

            {/* Step 2 — Pharmacy match */}
            {step === 2 && (
              <div className="space-y-3 py-2">
                <div className="rounded-sm bg-primary-soft/50 border border-primary/20 p-3 text-sm">
                  Showing pharmacies ranked by stock coverage for the{" "}
                  {validMeds.length} prescribed medication
                  {validMeds.length !== 1 ? "s" : ""}. Discuss the best option
                  with your patient.
                </div>
                {matches.map((m) => {
                  const full = m.coverage === 1;
                  const partial = m.coverage > 0 && m.coverage < 1;
                  const selected = selectedPharmacy === m.pharmacy.id;
                  return (
                    <button
                      key={m.pharmacy.id}
                      onClick={() => setSelectedPharmacy(m.pharmacy.id)}
                      className={cn(
                        "w-full text-left rounded-md border p-4 transition-smooth",
                        selected
                          ? "border-primary ring-2 ring-primary/30 bg-primary-soft/30"
                          : "border-border hover:border-primary/40 bg-card",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold flex items-center gap-2">
                            {m.pharmacy.name}
                            {selected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {m.pharmacy.address} · {m.pharmacy.distanceKm} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              {m.pharmacy.rating}
                            </span>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "border-transparent shrink-0",
                            full && "bg-success/10 text-success",
                            partial && "bg-warning/10 text-warning",
                            !full &&
                              !partial &&
                              "bg-destructive/10 text-destructive",
                          )}
                        >
                          {m.inStock}/{m.total} in stock
                        </Badge>
                      </div>
                      {m.missing.length > 0 && (
                        <div className="mt-2 text-xs text-warning flex items-start gap-1">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>Out of stock: {m.missing.join(", ")}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 3 — Route */}
            {step === 3 && (
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Confirm with your patient how they want to receive this
                  prescription.
                </p>
                <button
                  onClick={() => {
                    setRoute("pharmacy");
                  }}
                  disabled={!selectedPharmacy}
                  className={cn(
                    "w-full text-left rounded-md border p-4 transition-smooth disabled:opacity-50",
                    route === "pharmacy"
                      ? "border-primary ring-2 ring-primary/30 bg-primary-soft/30"
                      : "border-border hover:border-primary/40 bg-card",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-sm bg-primary-soft text-primary flex items-center justify-center">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">
                        Forward to pharmacy now
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedPharmacy
                          ? `Patient will collect at ${matches.find((m) => m.pharmacy.id === selectedPharmacy)?.pharmacy.name}`
                          : "Pick a pharmacy in step 2 first"}
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setRoute("patient-only")}
                  className={cn(
                    "w-full text-left rounded-md border p-4 transition-smooth",
                    route === "patient-only"
                      ? "border-primary ring-2 ring-primary/30 bg-primary-soft/30"
                      : "border-border hover:border-primary/40 bg-card",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-sm bg-primary-soft text-primary flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">Send to patient only</div>
                      <div className="text-xs text-muted-foreground">
                        Patient decides where to fill it later.
                      </div>
                    </div>
                  </div>
                </button>
                <div className="rounded-sm bg-secondary/60 p-3 text-xs text-muted-foreground">
                  ℹ The patient always receives a personal copy in their
                  account, regardless of pharmacy choice.
                </div>
              </div>
            )}

            {/* Step 4 — Channels */}
            {step === 4 && (
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Patient copy delivery — the in-app record is always created.
                </p>
                {[
                  {
                    c: "app" as const,
                    icon: User,
                    label: "In-app record",
                    desc: "Always included — appears in patient's Prescriptions tab",
                    locked: true,
                  },
                  {
                    c: "email" as const,
                    icon: Mail,
                    label: "Email",
                    desc: patientEmail || "No email provided",
                    locked: false,
                  },
                  {
                    c: "sms" as const,
                    icon: Smartphone,
                    label: "SMS",
                    desc: patientPhone || "No phone provided",
                    locked: false,
                  },
                ].map(({ c, icon: I, label, desc, locked }) => {
                  const checked =
                    c === "app"
                      ? true
                      : channels.includes(c as DeliveryChannel);
                  const disabled =
                    locked ||
                    (c === "email" && !patientEmail) ||
                    (c === "sms" && !patientPhone);
                  return (
                    <label
                      key={c}
                      className={cn(
                        "flex items-start gap-3 rounded-md border p-3 cursor-pointer",
                        checked
                          ? "border-primary bg-primary-soft/20"
                          : "border-border bg-card",
                        disabled && !locked && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() =>
                          !locked && toggleChannel(c as DeliveryChannel)
                        }
                        className="mt-0.5"
                      />
                      <I className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-xs text-muted-foreground">
                          {desc}
                        </div>
                      </div>
                    </label>
                  );
                })}

                <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm space-y-1">
                  <div className="font-medium flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-primary" />
                    Summary
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>
                      Patient:{" "}
                      <span className="text-foreground">{patientName}</span>
                    </div>
                    <div>
                      Medications:{" "}
                      <span className="text-foreground">
                        {validMeds.length}
                      </span>
                    </div>
                    <div>
                      Route:{" "}
                      <span className="text-foreground">
                        {route === "pharmacy"
                          ? `Forward to ${matches.find((m) => m.pharmacy.id === selectedPharmacy)?.pharmacy.name}`
                          : "Send to patient only"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <SheetFooter className="border-t border-border p-6 gap-2 sm:gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => (s - 1) as Step)}
              >
                Back
              </Button>
            )}
            {step < 4 && (
              <Button
                className="bg-gradient-primary hover:opacity-90"
                disabled={
                  (step === 1 && !canStep2) ||
                  (step === 3 && !route) ||
                  (step === 2 && !selectedPharmacy && false)
                }
                onClick={() => setStep((s) => (s + 1) as Step)}
              >
                Next
              </Button>
            )}
            {step === 4 && (
              <Button
                className="bg-gradient-primary hover:opacity-90"
                onClick={finalize}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {route === "pharmacy"
                  ? "Forward & notify patient"
                  : "Send to patient"}
              </Button>
            )}
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};
