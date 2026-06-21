import React, { useState, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Star,
  Search,
  ChevronRight,
  ArrowLeft,
  Stethoscope,
  Clock,
  ShieldCheck,
  XCircle,
  ClipboardList,
  Pencil,
  Trash2,
  Loader2,
  CalendarDays,
  MessageSquare,
  EyeOff,
  Eye,
  Check,
  X,
  Plus,
  AlertCircle,
  ChevronDown,
  Building2,
  MapPin,
  User,
} from "lucide-react";
import {
  useGetMyReviews,
  useSubmitReview,
  useUpdateReview,
  useDeleteReview,
  STATUS_DISPLAY,
  type Review,
  type ReviewStatus,
  type SubmitReviewPayload,
} from "@/hooks/patient/use-patient-reviews";
import {
  useGetPatientAppointments,
  type ApiAppointment,
} from "@/hooks/patient/use-patient-appointment";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FILTER_TABS: { id: ReviewStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Components
// ─────────────────────────────────────────────────────────────────────────────

function ReviewCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-[6px] border border-border bg-card p-2.5 flex items-start gap-2.5">
      {!compact && (
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-4 w-14 rounded-[4px]" />
        </div>
        <Skeleton className="h-2.5 w-16 rounded" />
        <Skeleton className="h-2.5 w-full rounded" />
        <Skeleton className="h-2.5 w-20 rounded" />
      </div>
      <Skeleton className="h-4 w-4 rounded shrink-0 mt-0.5" />
    </div>
  );
}

function ReviewDetailSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-border bg-muted/30">
        <Skeleton className="h-6 w-16 rounded-[6px]" />
        <div className="flex-1 min-w-0 space-y-1">
          <Skeleton className="h-4 w-42 rounded" />
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Skeleton className="h-6 w-14 rounded-[6px]" />
          <Skeleton className="h-6 w-16 rounded-[6px]" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Skeleton className="w-5 h-5 rounded-[4px]" />
            <Skeleton className="h-2.5 w-12 rounded" />
          </div>
          <div className="p-3 flex items-center gap-2.5">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-2.5 w-20 rounded" />
            </div>
          </div>
        </div>
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Skeleton className="w-5 h-5 rounded-[4px]" />
            <Skeleton className="h-2.5 w-20 rounded" />
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-0.5 py-1.5">
                <Skeleton className="h-2 w-16 rounded" />
                <Skeleton className="h-2.5 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Skeleton className="w-5 h-5 rounded-[4px]" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-2.5 w-full rounded" />
            <Skeleton className="h-2.5 w-3/4 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentSearchSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-full rounded-[6px]" />
      <div className="space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-2.5 p-2 rounded-[6px] border border-border">
            <Skeleton className="w-7 h-7 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              <Skeleton className="h-2.5 w-24 rounded" />
              <Skeleton className="h-2 w-16 rounded" />
              <Skeleton className="h-2 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Star Rating
// ─────────────────────────────────────────────────────────────────────────────

function StarRating({
  rating,
  max = 5,
  size = "sm",
  interactive = false,
  onChange,
}: {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? rating;

  const sizeClass =
    size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-4 w-4";

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            "transition-colors",
            i < active
              ? "text-amber-500 fill-amber-500"
              : "text-muted-foreground/30",
            interactive && "cursor-pointer hover:scale-110 transition-transform",
          )}
          onMouseEnter={() => interactive && setHovered(i + 1)}
          onMouseLeave={() => interactive && setHovered(null)}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="w-5 h-5 rounded-[4px] flex items-center justify-center bg-primary/10 shrink-0">
          <Icon size={11} className="text-primary" />
        </div>
        <h3 className="text-xs font-semibold tracking-tight text-foreground uppercase">
          {title}
        </h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-border last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-xs font-medium text-foreground">
        {value ?? (
          <span className="text-muted-foreground italic font-normal">—</span>
        )}
      </span>
    </div>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-medium border w-fit",
        ok
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/30"
          : "bg-destructive/10 text-destructive border-destructive/25",
      )}
    >
      {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Search & Select — Portal-based dropdown (no overflow clipping)
// ─────────────────────────────────────────────────────────────────────────────

function AppointmentSearchSelect({
  appointments,
  selectedAppt,
  onSelect,
  isLoading,
}: {
  appointments: ApiAppointment[];
  selectedAppt: ApiAppointment | null;
  onSelect: (appt: ApiAppointment | null) => void;
  isLoading: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  const triggerRef = React.useRef<HTMLDivElement>(null);

  // Recalculate position whenever open state changes or on scroll/resize
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      setDropdownRect(triggerRef.current.getBoundingClientRect());
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClose = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        // Check if click is inside the portal dropdown
        const portalEl = document.getElementById("appt-dropdown-portal");
        if (portalEl && portalEl.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const q = searchQuery.toLowerCase();
    return appointments.filter((appt) => {
      const doctorName = appt.doctor?.user?.name?.toLowerCase() ?? "";
      const spec = appt.doctor?.specialization?.toLowerCase() ?? "";
      const desig = appt.doctor?.designations?.toLowerCase() ?? "";
      const clinic = appt.clinic?.name?.toLowerCase() ?? "";
      return (
        doctorName.includes(q) ||
        spec.includes(q) ||
        desig.includes(q) ||
        clinic.includes(q)
      );
    });
  }, [appointments, searchQuery]);

  const doctorName = (a: ApiAppointment) => a.doctor?.user?.name ?? "Unknown Doctor";
  const doctorDesig = (a: ApiAppointment) => a.doctor?.designations ?? "";
  const doctorSpec = (a: ApiAppointment) => a.doctor?.specialization ?? "";
  const clinicName = (a: ApiAppointment) => a.clinic?.name ?? "";

  const handleToggle = () => {
    updatePosition();
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (appt: ApiAppointment) => {
    onSelect(appt);
    setIsOpen(false);
    setSearchQuery("");
  };

  if (isLoading) return <AppointmentSearchSkeleton />;

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-5 gap-1.5 text-center">
        <ClipboardList className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          No completed appointments available to review.
        </p>
        <p className="text-xs text-muted-foreground">
          Only completed appointments that haven&apos;t been reviewed yet are shown.
        </p>
      </div>
    );
  }

  // Portal dropdown content
  const dropdownContent =
    isOpen && dropdownRect
      ? ReactDOM.createPortal(
          <div
            id="appt-dropdown-portal"
            style={{
              position: "fixed",
              top: dropdownRect.bottom + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
            className="rounded-[6px] border border-border bg-card shadow-xl"
          >
            {/* Search inside dropdown */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by doctor, specialization, or clinic…"
                  className="pl-7 h-7 text-[10px] rounded-[6px] border-border focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
              {filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 gap-1.5 text-center">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">
                    No appointments match your search.
                  </p>
                </div>
              ) : (
                filteredAppointments.map((appt) => (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => handleSelect(appt)}
                    className={cn(
                      "w-full text-left flex items-start gap-2.5 p-2 rounded-[6px] border transition-all",
                      selectedAppt?.id === appt.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                      {getInitials(doctorName(appt))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-foreground truncate">
                        {doctorDesig(appt) || doctorName(appt)}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {doctorSpec(appt)}
                      </p>
                      {clinicName(appt) && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Building2 className="h-2 w-2 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground truncate">
                            {clinicName(appt)}
                          </span>
                        </div>
                      )}
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {fmtDate(appt.appointment_date)} ·{" "}
                        <span className="capitalize">{appt.type.replace("_", " ")}</span>
                      </p>
                    </div>
                    {selectedAppt?.id === appt.id && (
                      <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-2.5 py-1.5 border-t border-border bg-muted/30">
              <p className="text-[9px] text-muted-foreground text-center">
                {filteredAppointments.length} of {appointments.length} appointment
                {appointments.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-2 rounded-[6px] border transition-all cursor-pointer",
            isOpen
              ? "border-primary ring-1 ring-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/40",
            selectedAppt && "bg-primary/5"
          )}
        >
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          {selectedAppt ? (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-primary-foreground bg-primary border border-primary/20 shrink-0">
                {getInitials(doctorName(selectedAppt))}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {doctorDesig(selectedAppt) || doctorName(selectedAppt)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {fmtDate(selectedAppt.appointment_date)} · {doctorSpec(selectedAppt)}
                </p>
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground flex-1">
              Search and select an appointment…
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-[6px] border-border shadow-lg" align="start">
        {/* Search inside dropdown */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor, specialization, or clinic…"
              className="pl-7 h-7 text-xs rounded-[6px] border-border focus-visible:ring-primary"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 gap-1.5 text-center">
              <Search className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                No appointments match your search.
              </p>
            </div>
          ) : (
            filteredAppointments.map((appt) => (
              <button
                key={appt.id}
                type="button"
                onClick={() => {
                  onSelect(appt);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className={cn(
                  "w-full text-left flex items-start gap-2.5 p-2 rounded-[6px] border transition-all",
                  selectedAppt?.id === appt.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-muted/40",
                )}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                  {getInitials(doctorName(appt))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {doctorDesig(appt) || doctorName(appt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {doctorSpec(appt)}
                  </p>
                  {clinicName(appt) && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Building2 className="h-2 w-2 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">
                        {clinicName(appt)}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtDate(appt.appointment_date)} ·{" "}
                    <span className="capitalize">{appt.type.replace("_", " ")}</span>
                  </p>
                </div>
                {selectedAppt?.id === appt.id && (
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer count */}
        <div className="px-2.5 py-1.5 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {filteredAppointments.length} of {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit Review Panel
// ─────────────────────────────────────────────────────────────────────────────

function SubmitReviewPanel({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const { data: apptData, isLoading: apptLoading } =
    useGetPatientAppointments({ status: "completed" });

  const eligibleAppointments: ApiAppointment[] =
    (apptData?.data ?? []).filter((a) => a.can_review);

  const submitMut = useSubmitReview();

  const [selectedAppt, setSelectedAppt] = useState<ApiAppointment | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!selectedAppt || !rating) return;
    setError(null);

    const payload: SubmitReviewPayload = {
      appointment_id: selectedAppt.id,
      rating,
      comment: comment.trim() || null,
      is_anonymous: isAnonymous,
    };

    submitMut.mutate(payload, {
      onSuccess: ({ message }) => {
        setDone(true);
        setDoneMessage(message);
        setTimeout(() => {
          onSuccess();
        }, 1800);
      },
      onError: (err) => {
        setError(err.message ?? "Something went wrong. Please try again.");
      },
    });
  };

  const handleClearSelection = () => {
    setSelectedAppt(null);
    setRating(0);
    setComment("");
    setIsAnonymous(false);
    setError(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-border bg-muted/30">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="h-6 text-xs rounded-[6px] border-border gap-1 shrink-0 px-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <p className="text-xs font-semibold text-foreground">Write a Review</p>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Share your experience with a completed appointment
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="w-full  space-y-3">

          {done && (
            <div className="flex items-center gap-2 p-2.5 rounded-[6px] border border-emerald-400/30 bg-emerald-500/10">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                {doneMessage || "Review submitted! It will appear after approval."}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-[6px] border border-destructive/30 bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <SectionCard icon={CalendarDays} title="Select Appointment">
            <div className="space-y-2">
              <AppointmentSearchSelect
                appointments={eligibleAppointments}
                selectedAppt={selectedAppt}
                onSelect={setSelectedAppt}
                isLoading={apptLoading}
              />
              {selectedAppt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="h-5 text-xs text-muted-foreground hover:text-destructive gap-1 px-1"
                >
                  <X className="h-4 w-4" /> Clear selection
                </Button>
              )}
            </div>
          </SectionCard>

          {selectedAppt && (
            <SectionCard icon={Star} title="Your Rating">
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 rounded-[6px] border border-primary/20 bg-primary/5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-primary-foreground bg-primary border border-primary/20 shrink-0">
                    {getInitials(selectedAppt.doctor?.user?.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {selectedAppt.doctor?.designations || selectedAppt.doctor?.user?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(selectedAppt.appointment_date)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rating <span className="text-destructive">*</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <StarRating rating={rating} size="lg" interactive onChange={setRating} />
                    {rating > 0 && (
                      <span className="text-xs font-semibold text-foreground">
                        {rating}/5
                      </span>
                    )}
                  </div>
                  {rating === 0 && (
                    <p className="text-xs text-muted-foreground">
                    Click a star to rate
                  </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Comment (optional)
                  </span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Share your experience…"
                    className="w-full rounded-[6px] border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="anon-submit"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 accent-primary rounded-[3px]"
                  />
                  <label
                    htmlFor="anon-submit"
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Submit anonymously
                  </label>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!rating || submitMut.isPending || done}
                  size="sm"
                  className="text-xs gap-1.5 h-7 rounded-[6px] w-full"
                >
                  {done ? (
                    <>
                      <Check className="h-4 w-4" /> Submitted
                    </>
                  ) : submitMut.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4" /> Submit Review
                    </>
                  )}
                </Button>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Review List Card
// ─────────────────────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  onOpen,
  compact,
}: {
  review: Review;
  onOpen: () => void;
  compact?: boolean;
}) {
  const meta = STATUS_DISPLAY[review.status];

  const StatusIcon =
    review.status === "approved"
      ? ShieldCheck
      : review.status === "rejected"
        ? XCircle
        : Clock;

  return (
    <div
      onClick={onOpen}
      className="rounded-[6px] border border-border bg-card p-2.5 flex items-start gap-2.5 cursor-pointer hover:border-primary/40 hover:bg-card/80 transition-all group"
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0",
          compact && "hidden sm:flex",
        )}
      >
        {getInitials(review.doctor.name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-foreground leading-tight">
            {review.doctor.designations || review.doctor.name}
          </span>
          <Badge
            className={cn(
              "text-xs font-medium rounded-[4px] px-1.5 py-0 border flex items-center gap-0.5 h-4 shrink-0",
              meta.colorClass,
            )}
          >
            <StatusIcon className="h-2 w-2" />
            {meta.label}
          </Badge>
          {review.is_anonymous && (
            <Badge className="text-xs font-medium rounded-[4px] px-1.5 py-0 border h-4 bg-secondary text-muted-foreground border-border flex items-center gap-0.5">
              <EyeOff className="h-2 w-2" />
              Anon
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <StarRating rating={review.rating} />
          <span className="text-xs text-muted-foreground truncate">
            · {review.doctor.specialization}
          </span>
        </div>

        {review.comment && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {review.comment}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-0.5">
          {fmtDate(review.created_at)}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail View
// ─────────────────────────────────────────────────────────────────────────────

function ReviewDetail({
  review,
  onBack,
  onDeleted,
}: {
  review: Review;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const meta = STATUS_DISPLAY[review.status];
  const isPending = review.status === "pending";

  const updateMut = useUpdateReview(review.id);
  const deleteMut = useDeleteReview();

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment ?? "");
  const [isAnonymous, setIsAnonymous] = useState(review.is_anonymous);
  const [saved, setSaved] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    setEditing(false);
    setRating(review.rating);
    setComment(review.comment ?? "");
    setIsAnonymous(review.is_anonymous);
    setSaved(false);
    setSavedMessage("");
    setDeleteError(null);
    setConfirmDelete(false);
  }, [review.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const StatusIcon =
    review.status === "approved"
      ? ShieldCheck
      : review.status === "rejected"
        ? XCircle
        : Clock;

  const handleSave = () => {
    updateMut.mutate(
      { rating, comment: comment.trim() || null, is_anonymous: isAnonymous },
      {
        onSuccess: ({ message }) => {
          setSaved(true);
          setSavedMessage(message || "Review updated.");
          setEditing(false);
          setTimeout(() => setSaved(false), 3000);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleteError(null);
    deleteMut.mutate(review.id, {
      onSuccess: onDeleted,
      onError: (err) => {
        setDeleteError(err.message ?? "Failed to delete review.");
        setConfirmDelete(false);
      },
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-6 text-xs rounded-[6px] border-border gap-1 shrink-0 px-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0 sm:flex-none">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate">
                {review.doctor.designations || review.doctor.name}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                #{review.id}
              </span>
              <Badge
                className={cn(
                  "text-xs font-medium rounded-[4px] px-1.5 border flex items-center gap-0.5",
                  meta.colorClass,
                )}
              >
                <StatusIcon className="h-2 w-2" />
                {meta.label}
              </Badge>
            </div>
          </div>
        </div>

        {isPending && (
          <div className="flex gap-1.5 sm:ml-auto shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs rounded-[6px] border-border gap-1 px-2"
              onClick={() => {
                setEditing((v) => !v);
                setConfirmDelete(false);
              }}
              disabled={updateMut.isPending || deleteMut.isPending}
            >
              <Pencil className="h-4 w-4" />
              {editing ? "Cancel" : "Edit"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-6 text-xs rounded-[6px] gap-1 px-2 transition-colors",
                confirmDelete
                  ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "border-destructive/40 text-destructive hover:bg-destructive/10",
              )}
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {confirmDelete ? "Confirm" : "Delete"}
            </Button>
            {confirmDelete && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs rounded-[6px] border-border gap-1 px-2"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">

        {saved && savedMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-[6px] border border-emerald-400/30 bg-emerald-500/10">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              {savedMessage}
            </p>
          </div>
        )}

        {deleteError && (
          <div className="flex items-start gap-2 p-2.5 rounded-[6px] border border-destructive/30 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{deleteError}</p>
          </div>
        )}

        {review.status === "rejected" && review.rejection_reason && (
          <div className="flex items-start gap-2 p-2.5 rounded-[6px] border border-destructive/30 bg-destructive/10">
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              <strong>Rejection reason: </strong>
              {review.rejection_reason}
            </p>
          </div>
        )}

        <SectionCard icon={Stethoscope} title="Doctor">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
              {getInitials(review.doctor.name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {review.doctor.designations || review.doctor.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {review.doctor.specialization}
              </p>
              {review.doctor.designations && (
                <p className="text-xs text-muted-foreground">
                  {review.doctor.name}
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={CalendarDays} title="Review Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow label="Appointment ID" value={`#${review.appointment_id}`} />
            <InfoRow label="Submitted" value={fmtDateTime(review.created_at)} />
            <InfoRow label="Last updated" value={fmtDateTime(review.updated_at)} />
            <InfoRow
              label="Anonymous"
              value={
                <StatusChip
                  ok={review.is_anonymous}
                  label={review.is_anonymous ? "Yes" : "No"}
                />
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={editing ? Pencil : MessageSquare}
          title={editing ? "Edit your review" : "Your review"}
        >
          {editing ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rating <span className="text-destructive">*</span>
                </span>
                <div className="flex items-center gap-2">
                  <StarRating
                    rating={rating}
                    size="md"
                    interactive
                    onChange={setRating}
                  />
                  <span className="text-xs font-semibold text-foreground">
                    {rating}/5
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Comment (optional)
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Share your experience…"
                  className="w-full rounded-[6px] border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="anon-edit"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <label
                  htmlFor="anon-edit"
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  Submit anonymously
                </label>
              </div>

              <Button
                onClick={handleSave}
                disabled={!rating || updateMut.isPending}
                size="sm"
                className={cn(
                  "text-xs gap-1.5 h-7 rounded-[6px] w-full transition-all",
                  saved
                    ? "bg-emerald-500 text-white hover:bg-emerald-500"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" /> Saved
                  </>
                ) : updateMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" /> Save changes
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} size="md" />
                <span className="text-xs font-semibold text-foreground">
                  {review.rating}/5
                </span>
              </div>
              {review.comment ? (
                <p className="text-xs text-foreground leading-relaxed">
                  {review.comment}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No comment provided.
                </p>
              )}
              {review.is_anonymous && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <EyeOff className="h-4 w-4" />
                  Submitted anonymously
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={Eye} title="Visibility">
          <div className="space-y-1.5">
            <InfoRow
              label="Status"
              value={
                <Badge
                  className={cn(
                    "text-xs font-medium rounded-[4px] px-1.5 border flex items-center gap-0.5 w-fit",
                    meta.colorClass,
                  )}
                >
                  <StatusIcon className="h-2 w-2" />
                  {meta.label}
                </Badge>
              }
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {review.status === "pending"
                ? "Your review is awaiting moderation. It will appear publicly once approved."
                : review.status === "approved"
                  ? "Your review is live and visible to other patients."
                  : "Your review was not approved. See the rejection reason above."}
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel mode type
// ─────────────────────────────────────────────────────────────────────────────

type RightPanel =
  | { mode: "idle" }
  | { mode: "detail"; reviewId: number }
  | { mode: "submit" };

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

function PatientReviews() {
  const { t } = useTranslation();

  const [activeFilter, setActiveFilter] = useState<ReviewStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<RightPanel>({ mode: "idle" });

  const { data: reviews = [], isLoading } = useGetMyReviews();

  const { data: apptData } = useGetPatientAppointments({ status: "completed" });
  const reviewableCount = (apptData?.data ?? []).filter((a) => a.can_review).length;

  const filtered = reviews.filter((r) => {
    const matchFilter = activeFilter === "all" || r.status === activeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.doctor.name.toLowerCase().includes(q) ||
      r.doctor.specialization.toLowerCase().includes(q) ||
      (r.comment?.toLowerCase().includes(q) ?? false);
    return matchFilter && matchSearch;
  });

  const counts = Object.fromEntries(
    FILTER_TABS.map(({ id }) => [
      id,
      id === "all"
        ? reviews.length
        : reviews.filter((r) => r.status === id).length,
    ]),
  ) as Record<ReviewStatus | "all", number>;

  const selectedReview =
    panel.mode === "detail"
      ? (reviews.find((r) => r.id === panel.reviewId) ?? null)
      : null;

  const hasRightPanel = panel.mode !== "idle";

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.reviews_title", "My Reviews")}
          subtitle={t(
            "pages.patient.reviews_sub",
            "Manage your feedback for past consultations",
          )}
        />

        <div className="px-3 py-4 sm:px-5 sm:py-6">
          <div className="rounded-[6px] border border-border bg-card shadow-sm flex min-h-[560px]">

            {/* ── Left panel ── */}
            <div
              className={cn(
                "flex flex-col border-border",
                hasRightPanel
                  ? "hidden sm:flex sm:w-1/2 sm:border-r shrink-0"
                  : "flex w-full sm:w-1/2 sm:border-r sm:flex-none shrink-0",
              )}
            >
              {/* Filter tabs + Write Review button */}
              <div className="flex items-center border-b border-border bg-muted/30 px-2 overflow-x-auto gap-1">
                <div className="flex items-center flex-1 overflow-x-auto">
                  {FILTER_TABS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setActiveFilter(id)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap -mb-px shrink-0",
                        activeFilter === id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                      )}
                    >
                      {label}
                      <span
                        className={cn(
                          "text-xs font-semibold rounded-full px-1 py-0 min-w-[16px] text-center leading-4",
                          activeFilter === id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {counts[id] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>

                {reviewableCount > 0 && (
                  <Button
                    size="sm"
                    className="h-6 text-xs gap-0.5 px-1.5 rounded-[6px] shrink-0 ml-1"
                    onClick={() => setPanel({ mode: "submit" })}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Review</span>
                    <span className="sm:hidden">+</span>
                  </Button>
                )}
              </div>

              {/* Search */}
              <div className="px-2.5 py-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search doctor or comment…"
                    className="pl-7 h-7 text-xs rounded-[6px] border-border focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Reviewable hint */}
              {reviewableCount > 0 && !hasRightPanel && (
                <div
                  className="mx-2.5 mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => setPanel({ mode: "submit" })}
                >
                  <Star className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs text-primary font-medium">
                    {reviewableCount} appointment{reviewableCount !== 1 ? "s" : ""} awaiting review
                  </p>
                  <ChevronRight className="h-4 w-4 text-primary ml-auto shrink-0" />
                </div>
              )}

              {/* List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 mt-1">
                {isLoading ? (
                  <div className="space-y-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <ReviewCardSkeleton key={i} compact={hasRightPanel} />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-28 gap-2">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground text-center">
                      {search || activeFilter !== "all"
                        ? "No reviews match your filter."
                        : "No reviews yet."}
                    </p>
                  </div>
                ) : (
                  filtered.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onOpen={() => setPanel({ mode: "detail", reviewId: review.id })}
                      compact={hasRightPanel}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ── Right panel ── */}
            {panel.mode === "detail" && selectedReview ? (
              <div className="flex-1 min-w-0 flex flex-col min-h-0 border-l border-border">
                <ReviewDetail
                  review={selectedReview}
                  onBack={() => setPanel({ mode: "idle" })}
                  onDeleted={() => setPanel({ mode: "idle" })}
                />
              </div>
            ) : panel.mode === "submit" ? (
              <div className="flex-1 min-w-0 flex flex-col min-h-0 border-l border-border">
                <SubmitReviewPanel
                  onBack={() => setPanel({ mode: "idle" })}
                  onSuccess={() => setPanel({ mode: "idle" })}
                />
              </div>
            ) : (
              <div className="hidden sm:flex flex-1 min-w-0 items-center justify-center text-center p-8 border-l border-border">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">
                      Select a review
                    </p>
                    <p className="text-xs text-muted-foreground max-w-[200px]">
                      Click any review to see details, edit, or delete it.
                    </p>
                  </div>
                  {reviewableCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 h-7 rounded-[6px] mt-1"
                      onClick={() => setPanel({ mode: "submit" })}
                    >
                      <Plus className="h-4 w-4" />
                      Write a review
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PatientReviews;