import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowRight,
  BedDouble,
  Building2,
  CheckCircle2,
  FlaskConical,
  Pill,
  Scan,
  Syringe,
  X,
} from "lucide-react";
import type { CareOrderType } from "@/hooks/doctor/use-care-orders";
import type { ReferralTargetType } from "@/hooks/doctor/use-doctor-referrals";

export type CareContinueChoice =
  | "facility-book"
  | `order:${CareOrderType}`
  | "done";

interface Props {
  patientName?: string | null;
  onChoose: (choice: CareContinueChoice) => void;
}

export function CareContinuePanel({ patientName, onChoose }: Props) {
  const { t } = useTranslation();
  const name = patientName?.trim();

  const groups: { title: string; blurb: string; actions: { id: CareContinueChoice; title: string; hint: string; icon: typeof Building2 }[] }[] = [
    {
      title: t("pages.doctor.care_group_pharmacy", "1. Partner pharmacy"),
      blurb: t(
        "pages.doctor.care_group_pharmacy_blurb",
        "Use this when the patient only needs the medicines you wrote. They go to a pharmacy already registered on MediConnect — not an outside shop.",
      ),
      actions: [
        {
          id: "order:pharmacy_packet",
          title: t("pages.doctor.care_pharmacy_packet", "Send the medicine packet"),
          hint: t("pages.doctor.care_pharmacy_packet_hint", "Pharmacist sees allergies, current medicines, diagnosis and what to dispense."),
          icon: Pill,
        },
      ],
    },
    {
      title: t("pages.doctor.care_group_facility", "2. Clinic or hospital"),
      blurb: t(
        "pages.doctor.care_group_facility_blurb",
        "Use this for laboratory tests, imaging, procedures or a dated visit. Health facilities here are clinics and hospitals on MediConnect — not another doctor.",
      ),
      actions: [
        {
          id: "order:lab",
          title: t("pages.doctor.care_lab", "Order laboratory tests"),
          hint: t("pages.doctor.care_lab_hint", "FBC, malaria, glucose, HIV, urine, chemistry — with the clinical packet."),
          icon: FlaskConical,
        },
        {
          id: "order:imaging",
          title: t("pages.doctor.care_imaging", "Order imaging / ECG"),
          hint: t("pages.doctor.care_imaging_hint", "X-ray, ultrasound, ECG, CT — the facility receives indication and allergies."),
          icon: Scan,
        },
        {
          id: "facility-book",
          title: t("pages.doctor.care_book_facility_title", "Book a dated visit"),
          hint: t("pages.doctor.care_book_facility_hint", "Pick a registered clinic or hospital, department, service and slot now."),
          icon: Building2,
        },
        {
          id: "order:facility_packet",
          title: t("pages.doctor.care_refer_facility_title", "Send clinic/hospital packet with protocol"),
          hint: t("pages.doctor.care_refer_facility_hint", "Includes patient ID, consult notes, protocol and your message. The facility replies here after tests."),
          icon: Building2,
        },
        {
          id: "order:procedure",
          title: t("pages.doctor.care_procedure", "Send for a procedure"),
          hint: t("pages.doctor.care_procedure_hint", "Dressing, suturing, injection, minor surgery."),
          icon: Syringe,
        },
        {
          id: "order:nursing",
          title: t("pages.doctor.care_nursing", "Nursing / observation"),
          hint: t("pages.doctor.care_nursing_hint", "Vitals, wound care, injections."),
          icon: Activity,
        },
        {
          id: "order:admission",
          title: t("pages.doctor.care_admission", "Admit or observe"),
          hint: t("pages.doctor.care_admission_hint", "Day observation, inpatient or emergency unit."),
          icon: BedDouble,
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-primary/12 text-primary">
            <ArrowRight className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t("pages.doctor.care_continue_title", "What does this patient need next?")}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {name
                ? t("pages.doctor.care_continue_desc_named", {
                    defaultValue:
                      "{{patient}} can finish here, go to a registered pharmacy with the prescription, or visit a registered clinic/hospital for tests. You can only send them to partners on MediConnect.",
                    patient: name,
                  })
                : t(
                    "pages.doctor.care_continue_desc",
                    "Three outcomes: complete the consult, send medicines to a registered pharmacy, or send the patient to a registered clinic or hospital.",
                  )}
            </p>
          </div>
          <button type="button" onClick={() => onChoose("done")} className="rounded-[5px] p-1 text-muted-foreground hover:bg-muted" aria-label={t("common.close", "Close")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <button
            type="button"
            onClick={() => onChoose("done")}
            className="flex w-full items-start gap-3 rounded-[6px] border border-emerald-500/25 bg-emerald-500/5 p-3 text-left hover:border-emerald-500/40"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-emerald-500/15 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-xs font-semibold text-foreground">
                {t("pages.doctor.care_continue_done", "No pharmacy or clinic — complete consult")}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                {t("pages.doctor.care_continue_done_hint", "Advice and the summary are enough. The patient does not need a pharmacy or a facility visit.")}
              </span>
            </span>
          </button>

          {groups.map((group) => (
            <section key={group.title}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.title}</h4>
              <p className="mb-2 mt-1 text-[11px] leading-relaxed text-muted-foreground">{group.blurb}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => onChoose(action.id)}
                      className="flex items-start gap-3 rounded-[6px] border border-border bg-muted/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-foreground">{action.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{action.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function isCareOrderChoice(choice: CareContinueChoice): choice is `order:${CareOrderType}` {
  return typeof choice === "string" && choice.startsWith("order:");
}

export function orderTypeFromChoice(choice: CareContinueChoice): CareOrderType | null {
  return isCareOrderChoice(choice) ? (choice.slice(6) as CareOrderType) : null;
}

export function referralKindFromChoice(_choice: CareContinueChoice): ReferralTargetType | null {
  return null;
}
