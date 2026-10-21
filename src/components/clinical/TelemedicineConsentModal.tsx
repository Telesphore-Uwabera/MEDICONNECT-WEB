import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, X } from "lucide-react";
import { TELEMEDICINE_CONSENT_POINTS, TELEMEDICINE_CONSENT_VERSION } from "@/lib/telemedicine-consent";

interface Props {
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    representative_name?: string;
    representative_relationship?: string;
    emergency_override?: boolean;
  }) => void;
}

export function TelemedicineConsentModal({ open, pending, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const [proxy, setProxy] = useState(false);
  const [repName, setRepName] = useState("");
  const [repRel, setRepRel] = useState("");
  const [emergency, setEmergency] = useState(false);

  if (!open) return null;

  const canContinue = emergency || (agreed && (!proxy || (repName.trim().length > 1 && repRel.trim().length > 1)));

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">
              {t("clinical.consent.title", "Consent for telemedicine")}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("clinical.consent.version", { defaultValue: "Form {{version}}", version: TELEMEDICINE_CONSENT_VERSION })}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-[5px] p-1 text-muted-foreground hover:bg-muted" aria-label={t("common.close", "Close")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              "clinical.consent.intro",
              "Please read this before the virtual consultation begins. Normal teleconsultation cannot proceed without consent, except for an emergency where permitted.",
            )}
          </p>
          <ul className="space-y-2">
            {TELEMEDICINE_CONSENT_POINTS.map((point, index) => (
              <li key={index} className="rounded-[6px] border border-border bg-muted/30 px-3 py-2 text-[12px] leading-relaxed text-foreground">
                {t(`clinical.consent.point_${index + 1}`, point)}
              </li>
            ))}
          </ul>

          <label className="flex cursor-pointer items-start gap-2 rounded-[6px] border border-border px-3 py-2">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-primary" />
            <span className="text-[12px] text-foreground">
              {t("clinical.consent.agree", "I consent to this virtual consultation and understand its limits.")}
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2 rounded-[6px] border border-border px-3 py-2">
            <input type="checkbox" checked={proxy} onChange={(e) => setProxy(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-primary" />
            <span className="text-[12px] text-foreground">
              {t("clinical.consent.proxy", "I am a parent, guardian or legally authorized representative.")}
            </span>
          </label>
          {proxy && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder={t("clinical.consent.rep_name", "Representative name")}
                className="h-9 rounded-[6px] border border-border bg-background px-3 text-xs"
              />
              <input
                value={repRel}
                onChange={(e) => setRepRel(e.target.value)}
                placeholder={t("clinical.consent.rep_rel", "Relationship")}
                className="h-9 rounded-[6px] border border-border bg-background px-3 text-xs"
              />
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-2 rounded-[6px] border border-destructive/30 bg-destructive/5 px-3 py-2">
            <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-destructive" />
            <span className="text-[12px] text-foreground">
              {t("clinical.consent.emergency", "This is an emergency. Do not delay care for administrative consent.")}
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button type="button" onClick={onClose} className="h-9 rounded-[5px] border border-border px-3 text-xs font-semibold">
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            disabled={!canContinue || pending}
            onClick={() =>
              onConfirm({
                representative_name: proxy ? repName.trim() : undefined,
                representative_relationship: proxy ? repRel.trim() : undefined,
                emergency_override: emergency,
              })
            }
            className="h-9 rounded-[5px] bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t("clinical.consent.continue", "Continue to consultation")}
          </button>
        </div>
      </div>
    </div>
  );
}
