// components/DoctorCard.tsx
import { useTranslation } from "react-i18next";
import { Doctor } from "@/lib/mock-data";
import { Star, MapPin, Clock, Wifi, BriefcaseMedical, Zap, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingDialog } from "@/components/BookingDialog";
import { ConnectDialog } from "@/components/ConnectDialog";
import { useState } from "react";
import { useCallStore } from "@/context/CallStore";

const statusStyles = {
  online: {
    dot: "bg-success", pulse: "animate-pulse", label: "Online",
    text: "text-success", bg: "bg-success/10 border-success/20",
  },
  busy: {
    dot: "bg-warning", pulse: "", label: "Busy",
    text: "text-warning", bg: "bg-warning/10 border-warning/20",
  },
  offline: {
    dot: "bg-muted-foreground/50", pulse: "", label: "Offline",
    text: "text-muted-foreground", bg: "bg-muted border-border",
  },
};

export const DoctorCard = ({
  doctor,
  compact = false,
}: {
  doctor: Doctor;
  compact?: boolean;
}) => {
  const { t } = useTranslation();
  const s = statusStyles[doctor.status];
  const [bookOpen, setBookOpen] = useState(false);

  const call = useCallStore();

  // Whether this card's doctor is the one currently in the store
  const isThisDoctor = call.doctor?.id === doctor.id;

  // Call is "in progress" for any non-idle phase belonging to this doctor
  const isCallInProgress = isThisDoctor && call.phase !== "idle";

  // Specifically connected (used for UI labels)
  const isConnected = isThisDoctor && call.phase === "connected";

  // Minimized only makes sense when connected
  const isMinimized = isConnected && call.minimized;

  // Fix 2: only online + instantAvailable doctors can start a call
  const canConnect = doctor.status === "online" && doctor.instantAvailable;
  const canBook    = doctor.status !== "offline";

  // Fix 4: dialog is open whenever the store says so for this doctor —
  // covers all phases (checking, connecting, ringing, connected, ended)
  const connectOpen = isThisDoctor && call.dialogOpen;

  // Fix 3: minimize during ANY active phase, not just "connected"
  const handleOpenChange = (v: boolean) => {
    if (!v && isCallInProgress) {
      // Backdrop / X pressed while call is in any active phase → minimize
      call.setMinimized(true);
    } else {
      call.setDialogOpen(v);
    }
  };

  // Fix 1 + 2: cover every possible state, guard by canConnect
  const handleConnect = () => {
    // Fix 2: hard guard — busy/offline doctors should never reach here
    // (button is hidden), but guard defensively
    if (!canConnect) return;

    if (isMinimized) {
      // Resuming a minimized connected call
      call.setMinimized(false);
    } else if (isCallInProgress) {
      // Fix 1: call is in-progress for this doctor in any phase
      // (checking / permissions / connecting / ringing / connected)
      // → just re-open the dialog instead of restarting the flow
      call.setDialogOpen(true);
    } else {
      // phase === "idle", or this is a different doctor entirely
      // startCall atomically resets previous state + sets dialogOpen: true
      call.startCall(doctor);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-sm border border-border bg-card",
        "overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:-translate-y-px shadow-sm",
        isConnected && "ring-1 ring-emerald-500/30",
      )}
    >
      <div className="p-3.5">
        {/* Top row */}
        <div className="flex items-start gap-2.5">
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center text-sm font-bold select-none">
              {doctor.avatar}
            </div>
            <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card", s.dot, s.pulse)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0">
                <h3 className="text-[12px] font-semibold text-foreground truncate leading-tight">{doctor.name}</h3>
                <p className="text-[10px] text-primary font-medium mt-0.5 truncate">{doctor.specialty}</p>
              </div>

              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  In call
                </span>
              ) : isCallInProgress ? (
                // Connecting / ringing / checking phase badge
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-sky-600 bg-sky-500/10 border-sky-500/20">
                  <span className="h-1 w-1 rounded-full bg-sky-500 animate-pulse shrink-0" />
                  Connecting
                </span>
              ) : (
                <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0", s.text, s.bg)}>
                  <span className={cn("h-1 w-1 rounded-full shrink-0", s.dot)} />
                  {s.label}
                </span>
              )}
            </div>

            <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              {doctor.hospital}
            </p>
          </div>
        </div>

        {/* Stats row */}
        {!compact && (
          <div className="mt-2.5 grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
            {[
              { icon: <Star className="h-2.5 w-2.5 fill-warning text-warning" />, top: String(doctor.rating), bot: `${doctor.reviews} reviews` },
              { icon: <Clock className="h-2.5 w-2.5 text-muted-foreground" />, top: `${doctor.experience} yrs`, bot: "experience" },
              { icon: <BriefcaseMedical className="h-2.5 w-2.5 text-muted-foreground" />, top: doctor.instantAvailable ? "Instant" : "Scheduled", bot: "consult" },
            ].map(({ icon, top, bot }) => (
              <div key={bot} className="flex flex-col items-center py-1.5 px-1 bg-muted/30">
                <div className="flex items-center gap-1 mb-0.5">{icon}</div>
                <span className="text-[11px] font-semibold text-foreground leading-tight">{top}</span>
                <span className="text-[9px] text-muted-foreground leading-tight">{bot}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 border-t border-border" />

        {/* Bottom row */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {isConnected ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-600">Call in progress</span>
              </>
            ) : isCallInProgress ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span className="text-[10px] font-medium text-sky-600">Connecting…</span>
              </>
            ) : (
              <>
                <Zap className={cn("h-2.5 w-2.5", doctor.instantAvailable ? "text-success" : "text-muted-foreground")} />
                <span className={cn("text-[10px] font-medium", doctor.instantAvailable ? "text-success" : "text-muted-foreground")}>
                  {doctor.instantAvailable ? "Usually replies in 2 min" : "Replies within 24h"}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={!canBook || isCallInProgress}
              onClick={() => canBook && !isCallInProgress && setBookOpen(true)}
              className="h-6 px-2.5 text-[10px] font-medium rounded-sm border-border"
            >
              {t("pages.cards.book")}
            </Button>

            {/* Fix 2: only render Connect button when canConnect is true */}
            {canConnect ? (
              <Button
                size="sm"
                onClick={handleConnect}
                className={cn(
                  "h-6 px-2.5 text-[10px] font-semibold rounded-sm",
                  isMinimized
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : isCallInProgress
                      ? "bg-sky-500 hover:bg-sky-600 text-white"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground",
                )}
              >
                {isMinimized ? (
                  <><Maximize2 className="h-2.5 w-2.5 mr-1" />Resume</>
                ) : isCallInProgress ? (
                  <><Wifi className="h-2.5 w-2.5 mr-1" />Open</>
                ) : (
                  <><Wifi className="h-2.5 w-2.5 mr-1" />{t("pages.cards.connect")}</>
                )}
              </Button>
            ) : (
              // Busy or offline — show a non-interactive status pill
              <Button
                size="sm"
                variant="secondary"
                disabled
                className="h-6 px-2.5 text-[10px] rounded-sm opacity-50 cursor-not-allowed"
              >
                {s.label}
              </Button>
            )}
          </div>
        </div>
      </div>

      <BookingDialog doctor={doctor} open={bookOpen} onOpenChange={setBookOpen} />

      {/* ConnectDialog open state is fully store-driven */}
      <ConnectDialog
        doctor={doctor}
        open={connectOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
};
