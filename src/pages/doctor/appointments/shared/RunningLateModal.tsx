import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Info, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRunningLate, type Appointment } from "@/hooks/doctor/use-doctor-appointment";
import { DELAY_OPTIONS } from "./types";
import { getErrMsg, fmtTime } from "./helpers";

interface Props {
  appt: Appointment;
  onClose: () => void;
}

export function RunningLateModal({ appt, onClose }: Props) {
  const { t } = useTranslation();
  const [delay, setDelay] = useState<number>(15);
  const runningLate = useRunningLate();

  const handleSubmit = () => {
    runningLate.mutate(
      { id: appt.id, delay_minutes: delay },
      {
        onSuccess: (res) => {
          if (res.next_appointment) {
            toast.success(
              t("pages.doctor.patients_notified_delay_next", { delay: res.delay_minutes, patient: res.next_appointment.patient.name, time: fmtTime(res.next_appointment.appointment_time) })
            );
          } else {
            toast.success(t("pages.doctor.patients_notified_delay", { delay: res.delay_minutes }));
          }
          onClose();
        },
        onError: (err: unknown) => {
          toast.error(getErrMsg(err, t("pages.doctor.failed_notify_patients")));
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-[6px] shadow-2xl w-full max-w-sm p-5 z-10">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-[6px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">{t("pages.doctor.running_late")}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("pages.doctor.running_late_desc", { patient: appt.patient?.name ?? t("pages.doctor.the_patient") })}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto h-6 w-6 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2.5">{t("pages.doctor.delay_duration")}</p>
          <div className="flex flex-wrap gap-1.5">
            {DELAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDelay(d)}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[11px] font-medium border transition-all duration-150",
                  delay === d
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "border-border/60 text-muted-foreground hover:border-amber-400/50 hover:text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
                )}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-[6px] bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 mb-4">
          <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
            {t("pages.doctor.delay_notice", { delay })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 h-8 text-[11px] font-medium">
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={runningLate.isPending}
            className="flex-1 h-8 text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-white border-0"
          >
            {runningLate.isPending ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1" />Notifying…</>
            ) : (
              t("pages.doctor.notify_delay", { delay })
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
