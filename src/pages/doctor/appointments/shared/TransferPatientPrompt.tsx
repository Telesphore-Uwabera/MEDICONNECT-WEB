import { useTranslation } from "react-i18next";
import { ArrowRight, Building2, CheckCircle2, X } from "lucide-react";

interface Props {
  patientName?: string | null;
  onConfirm: () => void;
  onDecline: () => void;
}

export function TransferPatientPrompt({ patientName, onConfirm, onDecline }: Props) {
  const { t } = useTranslation();
  const name = patientName?.trim();

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-primary/12 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t("pages.doctor.transfer_patient_prompt_title", "Want to transfer the patient?")}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {name
                ? t("pages.doctor.transfer_patient_prompt_desc_named", {
                    defaultValue:
                      "Would you like to send {{patient}} to a health facility for an in-person visit?",
                    patient: name,
                  })
                : t(
                    "pages.doctor.transfer_patient_prompt_desc",
                    "Would you like to send this patient to a health facility for an in-person visit?",
                  )}
            </p>
          </div>
          <button
            type="button"
            onClick={onDecline}
            className="rounded-[5px] p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("common.close", "Close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-[6px] border border-primary/20 bg-primary/8 p-3 text-xs text-muted-foreground">
            {t(
              "pages.doctor.transfer_patient_prompt_hint",
              "Choose Yes to open the facility booking form. Choose No to finish the consultation without booking a transfer.",
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onDecline}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[5px] border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("pages.doctor.complete_without_transfer", "No, complete")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[5px] bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("pages.doctor.transfer_patient_yes", "Yes, transfer patient")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}