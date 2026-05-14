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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Users2, MapPin, Stethoscope, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  HospitalInfo,
  bookHospitalSpot,
  useHospitalSchedule,
} from "@/lib/hospital-store";

export const HospitalBookingDialog = ({
  hospital,
  open,
  onOpenChange,
}: {
  hospital: HospitalInfo;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const schedule = useHospitalSchedule(hospital.name);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [reason,    setReason]    = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [confirmed, setConfirmed] = useState<{ date: string; service?: string } | null>(null);

  const days    = useMemo(() => schedule?.days ?? [], [schedule]);
  const service = useMemo(
    () => hospital.services.find((s) => s.id === serviceId),
    [hospital.services, serviceId],
  );

  const handleConfirm = () => {
    if (!selected || !service) return;
    const result = bookHospitalSpot(
      hospital.name, selected, reason || service.name, service,
    );
    if ("error" in result) {
      toast.error("Cannot book", { description: result.error });
      return;
    }
    setConfirmed({ date: selected, service: service.name });
    toast.success("Hospital spot reserved", {
      description: `${hospital.name} · ${service.name} · ${format(parseISO(selected), "EEE MMM d")}`,
    });
  };

  const reset = () => {
    setSelected(null);
    setReason("");
    setServiceId("");
    setConfirmed(null);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-sm flex flex-col gap-0 p-0 bg-background border-l border-border"
      >
        {/* ── Header ── */}
        <SheetHeader className="px-5 py-4 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-sm flex items-center justify-center bg-primary/10 text-primary font-bold text-[11px] shrink-0 border border-primary/15">
              {hospital.image}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[13px] font-semibold text-foreground leading-tight">
                Book a hospital spot
              </SheetTitle>
              <SheetDescription className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {hospital.name}
                {hospital.city ? ` · ${hospital.city}` : ""}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {confirmed ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Check className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Spot reserved</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {hospital.name}
                  <br />
                  {format(parseISO(confirmed.date), "EEEE, MMMM d, yyyy")}
                  {confirmed.service && (
                    <>
                      <br />
                      <span className="inline-flex items-center gap-1 mt-1 text-foreground font-medium">
                        <Stethoscope className="h-3 w-3" />
                        {confirmed.service}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 px-5 text-[11px] font-semibold rounded-sm mt-2"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-5">

              {/* ── Date picker ── */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <CalendarDays className="h-2.5 w-2.5" /> Available days
                </p>
                {days.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2 border border-dashed border-border rounded-sm">
                    <CalendarDays className="h-6 w-6 text-muted-foreground/30" />
                    <p className="text-[10px] text-muted-foreground">
                      No service schedule yet for this hospital.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-60 overflow-y-auto pr-0.5">
                    {days.map((d) => {
                      const remaining   = Math.max(0, d.capacity - d.booked);
                      const disabled    = !d.active || remaining === 0;
                      const isSelected  = selected === d.date;
                      const utilization = d.capacity > 0 ? (d.booked / d.capacity) * 100 : 0;

                      return (
                        <button
                          key={d.date}
                          disabled={disabled}
                          onClick={() => setSelected(d.date)}
                          className={cn(
                            "rounded-sm border p-2 text-left transition-all duration-150 relative",
                            isSelected
                              ? "border-primary ring-1 ring-primary/30 bg-primary/5 dark:bg-primary/10"
                              : !disabled
                              ? "border-border hover:border-primary/60 hover:bg-muted/40"
                              : "border-dashed border-border/50 bg-muted/20 opacity-50 cursor-not-allowed",
                          )}
                        >
                          <div className="text-[8px] uppercase font-semibold tracking-wider text-muted-foreground">
                            {format(parseISO(d.date), "EEE")}
                          </div>
                          <div className="text-[12px] font-bold text-foreground leading-tight mt-0.5">
                            {format(parseISO(d.date), "d")}
                            <span className="text-[9px] font-medium text-muted-foreground ml-0.5">
                              {format(parseISO(d.date), "MMM")}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-0.5 text-[9px] text-muted-foreground">
                            <Users2 className="h-2.5 w-2.5" />
                            {d.active ? `${remaining} left` : "Closed"}
                          </div>
                          <div className="h-0.5 mt-1.5 rounded-full bg-border overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                utilization > 85 ? "bg-amber-500" : "bg-primary",
                                disabled && "opacity-30",
                              )}
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Service / department ── */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="service"
                  className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
                >
                  <Stethoscope className="h-2.5 w-2.5" />
                  Service / department <span className="text-destructive">*</span>
                </Label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger
                    id="service"
                    className="h-8 text-[11px] rounded-sm border-border bg-background focus:ring-1 focus:ring-primary/30"
                  >
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent className="text-[11px]">
                    {hospital.services.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-[11px]">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground"> · {s.department}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Reason (optional) ── */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="reason"
                  className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Reason for visit
                  <span className="normal-case tracking-normal font-normal ml-1 text-muted-foreground/60">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Follow-up on results"
                  className="h-8 text-[11px] rounded-sm border-border bg-background placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>

              {/* ── Summary chip (appears when both fields filled) ── */}
              {selected && service && (
                <div className="rounded-sm border border-primary/20 bg-primary/5 dark:bg-primary/10 px-3 py-2.5 flex items-start gap-2">
                  <div className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-foreground">
                      {service.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {format(parseISO(selected), "EEEE, MMMM d, yyyy")} · {hospital.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!confirmed && (
          <SheetFooter className="px-5 py-3.5 border-t border-border bg-muted/30 shrink-0 flex items-center justify-between sm:justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-4 text-[10px] font-medium rounded-sm"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selected || !service}
              onClick={handleConfirm}
              className="h-8 px-4 text-[10px] font-semibold rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              Confirm booking
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};
