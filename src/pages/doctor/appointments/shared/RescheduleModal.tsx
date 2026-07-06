import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRescheduleAppointment, type Appointment } from "@/hooks/doctor/use-doctor-appointment";
import { getErrMsg } from "./helpers";

interface Props {
  appt: Appointment;
  onClose: () => void;
}

export function RescheduleModal({ appt, onClose }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState(appt.appointment_date?.slice(0, 10) ?? "");
  const [time, setTime] = useState(appt.appointment_time?.slice(0, 5) ?? "");
  const reschedule = useRescheduleAppointment();

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleSubmit = () => {
    if (!date || !time) return;
    reschedule.mutate(
      { id: appt.id, payload: { appointment_date: date, appointment_time: time } },
      {
        onSuccess: (res) => {
          toast.success(res.message ?? t("pages.doctor.appointment_rescheduled"));
          onClose();
        },
        onError: (err: unknown) => {
          toast.error(getErrMsg(err, t("pages.doctor.failed_reschedule_appointment")));
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-[6px] shadow-2xl w-full max-w-sm p-5 z-10">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-[6px] bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 flex items-center justify-center shrink-0">
            <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">{t("pages.doctor.reschedule_appointment")}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("pages.doctor.reschedule_desc", { patient: appt.patient?.name ?? t("pages.doctor.this_patient") })}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto h-6 w-6 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">{t("pages.doctor.date")}</p>
            <input
              type="date"
              value={date}
              min={todayStr}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all h-8"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">{t("pages.doctor.time")}</p>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all h-8"
            />
          </div>
        </div>

        {reschedule.isError && (
          <div className="flex items-center gap-2 p-3 rounded-[6px] bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 mb-4">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-[10px] text-red-700 dark:text-red-400 leading-relaxed">
              {getErrMsg(reschedule.error, t("pages.doctor.could_not_reschedule"))}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 h-8 text-[11px] font-medium">
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={reschedule.isPending || !date || !time}
            className="flex-1 h-8 text-[11px] font-semibold bg-sky-600 hover:bg-sky-500 text-white border-0"
          >
            {reschedule.isPending ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1" />Rescheduling…</>
            ) : (
              t("pages.doctor.confirm_reschedule")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
