import { Clock3, FileText, Phone, UserCheck, Video, X, CreditCard, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type InstantConsultQueueItem } from "@/hooks/doctor/use-doctor-appointment";
import { DetailRow } from "./AppointmentDetailDrawer";
import { fmtDateTime, fmtRelative } from "./helpers";
import { t } from "i18next";

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  queued: "Awaiting payment",
  waiting: "Awaiting payment",
  confirmed: "Paid",
  accepted: "Accepted",
  in_progress: "In session",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
  payment_expired: "Payment expired",
  completed: "Completed",
};

interface Props {
  item: InstantConsultQueueItem;
  consultId: number | null;
  onClose: () => void;
  onOpenRecord?: () => void;
}

export function InstantConsultDetailDrawer({ item, consultId, onClose, onOpenRecord }: Props) {
  const conducted =
    item.status === "completed"
      ? t("pages.doctor.conducted_yes", { defaultValue: "Yes — session completed" })
      : item.status === "in_progress"
        ? t("pages.doctor.conducted_in_progress", { defaultValue: "In progress" })
        : item.status === "accepted" || item.status === "confirmed"
          ? t("pages.doctor.conducted_not_started", { defaultValue: "Not started yet" })
          : t("pages.doctor.conducted_no", { defaultValue: "No" });

  const paid = String(item.payment_status || "").toLowerCase() === "paid" || item.status === "confirmed" || item.status === "accepted" || item.status === "in_progress" || item.status === "completed";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex flex-col bg-card border-l border-border shadow-2xl w-full max-w-md h-full overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60 bg-card shrink-0">
          <div className="h-10 w-10 rounded-[6px] bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/10">
            {(item.guest_name || item.guest_phone || "PT").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">
              {item.guest_name || item.guest_phone}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-medium border">
                {STATUS_LABEL[item.status] ?? item.status}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">#{item.id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-[6px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {item.status === "completed" && onOpenRecord && (
          <div className="px-5 py-3 border-b border-border/40 bg-secondary/20 shrink-0">
            <Button
              size="sm"
              onClick={onOpenRecord}
              className="h-9 px-4 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] shadow-sm flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {t("pages.doctor.open_consultation_record", { defaultValue: "Open consultation record" })}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pt-2">
          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
              <Video className="h-4 w-4" />
              {t("pages.doctor.consult", { defaultValue: "Consult" })}
            </p>
            <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
              <DetailRow
                label={t("pages.doctor.kind", { defaultValue: "Kind" })}
                value={t("pages.doctor.instant_video", { defaultValue: "Instant video consult" })}
              />
              <DetailRow
                label={t("pages.doctor.record_id", { defaultValue: "Record ID" })}
                value={<span className="font-mono">#{consultId ?? item.id}</span>}
              />
              <DetailRow
                label={t("pages.doctor.conducted", { defaultValue: "Meeting conducted" })}
                value={conducted}
              />
              {item.queue_position != null && item.status !== "completed" && (
                <DetailRow label={t("consult.bookings.queue_position", { defaultValue: "Queue" })} value={`#${item.queue_position}`} />
              )}
            </div>
          </div>

          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {t("pages.doctor.patient")}
            </p>
            <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
              <DetailRow label={t("pages.doctor.name")} value={item.guest_name || "—"} />
              <DetailRow
                label={t("pages.doctor.phone")}
                value={
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
                    {item.guest_phone}
                  </span>
                }
              />
            </div>
          </div>

          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("pages.doctor.chief_complaint", { defaultValue: "Complaint" })}
            </p>
            <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
              <p className="text-sm text-foreground py-1">
                {item.description?.trim() || t("consult.bookings.no_description")}
              </p>
            </div>
          </div>

          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t("pages.doctor.payment")}
            </p>
            <div className="bg-background rounded-[6px] border border-border/50 px-4 py-2">
              <DetailRow
                label={t("pages.doctor.payment_status")}
                value={
                  <span className={cn("inline-flex items-center gap-1.5 capitalize",
                    paid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  )}>
                    {paid && <CheckCircle2 className="h-4 w-4" />}
                    {item.payment_status || (paid ? "paid" : "unpaid")}
                  </span>
                }
              />
            </div>
          </div>

          {item.created_at && (
            <div className="px-5 pt-3 pb-6">
              <p className="text-xs text-muted-foreground/50 text-center flex items-center justify-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {t("pages.doctor.created_relative", { date: fmtRelative(item.created_at) })}
                {" · "}
                {fmtDateTime(item.created_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
