import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import {
  useGetMyReviews,
  useUpdateReview,
  useDeleteReview,
  STATUS_DISPLAY,
  type Review,
  type ReviewStatus,
} from "@/hooks/patient/use-patient-reviews";

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
  size?: "sm" | "md";
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? rating;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            "transition-colors",
            i < active
              ? "text-amber-500 fill-amber-500"
              : "text-muted-foreground/30",
            interactive && "cursor-pointer",
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
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border">
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary/10 shrink-0">
          <Icon size={13} className="text-primary" />
        </div>
        <h3 className="text-xs font-semibold tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border w-fit",
        ok
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/30"
          : "bg-destructive/10 text-destructive border-destructive/25",
      )}
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
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
      className="rounded-lg border border-border bg-card p-3 sm:p-4 flex items-start gap-3 cursor-pointer hover:border-primary/40 hover:bg-card/80 transition-all group"
    >
      <div
        className={cn(
          "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0",
          compact && "hidden sm:flex",
        )}
      >
        {getInitials(review.doctor.name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-foreground leading-tight">
            {review.doctor.designations}
          </span>
          <Badge
            className={cn(
              "text-[10px] font-medium rounded-full px-2 py-0 border flex items-center gap-1 h-5 shrink-0",
              meta.colorClass,
            )}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {meta.label}
          </Badge>
          {review.is_anonymous && (
            <Badge className="text-[10px] font-medium rounded-full px-2 py-0 border h-5 bg-secondary text-muted-foreground border-border flex items-center gap-1">
              <EyeOff className="h-2.5 w-2.5" />
              Anonymous
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <StarRating rating={review.rating} />
          <span className="text-[10px] text-muted-foreground">
            · {review.doctor.specialization}
          </span>
        </div>

        {review.comment && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
            {review.comment}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground mt-0.5">
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

  // Reset local state when a different review is selected
  React.useEffect(() => {
    setEditing(false);
    setRating(review.rating);
    setComment(review.comment ?? "");
    setIsAnonymous(review.is_anonymous);
    setSaved(false);
  }, [review.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const StatusIcon =
    review.status === "approved"
      ? ShieldCheck
      : review.status === "rejected"
        ? XCircle
        : Clock;

  const handleSave = () => {
    updateMut.mutate(
      { rating, comment: comment || null, is_anonymous: isAnonymous },
      {
        onSuccess: () => {
          setSaved(true);
          setEditing(false);
          setTimeout(() => setSaved(false), 2500);
        },
      },
    );
  };

  const handleDelete = () => {
    deleteMut.mutate(review.id, { onSuccess: onDeleted });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-7 text-xs border-border gap-1.5 shrink-0"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </Button>
          <div className="flex-1 min-w-0 sm:flex-none">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate">
                {review.doctor.designations}
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                #{review.id}
              </span>
              <Badge
                className={cn(
                  "text-[10px] font-medium rounded-full px-2.5 border flex items-center gap-1",
                  meta.colorClass,
                )}
              >
                <StatusIcon className="h-2.5 w-2.5" />
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
              className="h-7 text-xs border-border gap-1.5"
              onClick={() => setEditing((v) => !v)}
              disabled={updateMut.isPending}
            >
              <Pencil className="h-3 w-3" />
              {editing ? "Cancel" : "Edit"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">

        {/* Rejection notice */}
        {review.status === "rejected" && review.rejection_reason && (
          <div className="flex items-start gap-2.5 p-3 rounded-md border border-destructive/30 bg-destructive/10">
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              <strong>Rejection reason: </strong>
              {review.rejection_reason}
            </p>
          </div>
        )}

        {/* Doctor info */}
        <SectionCard icon={Stethoscope} title="Doctor">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
              {getInitials(review.doctor.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {review.doctor.designations}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {review.doctor.specialization}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {review.doctor.name}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Review details */}
        <SectionCard icon={CalendarDays} title="Review Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow
              label="Appointment ID"
              value={String(review.appointment_id)}
            />
            <InfoRow label="Submitted" value={fmtDateTime(review.created_at)} />
            <InfoRow
              label="Last updated"
              value={fmtDateTime(review.updated_at)}
            />
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

        {/* Your review / Edit form */}
        <SectionCard
          icon={editing ? Pencil : MessageSquare}
          title={editing ? "Edit your review" : "Your review"}
        >
          {editing ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Rating
                </span>
                <StarRating
                  rating={rating}
                  size="md"
                  interactive
                  onChange={setRating}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Comment (optional)
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Share your experience…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anon"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <label
                  htmlFor="anon"
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  Submit anonymously
                </label>
              </div>

              <Button
                onClick={handleSave}
                disabled={!rating || updateMut.isPending}
                className={cn(
                  "text-xs gap-2 transition-all",
                  saved
                    ? "bg-emerald-500 text-white hover:bg-emerald-500"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {saved ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Saved
                  </>
                ) : updateMut.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" /> Save changes
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} size="md" />
                <span className="text-sm font-semibold text-foreground">
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
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <EyeOff className="h-3 w-3" />
                  Submitted anonymously
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Visibility */}
        <SectionCard icon={Eye} title="Visibility">
          <div className="space-y-2">
            <InfoRow
              label="Status"
              value={
                <Badge
                  className={cn(
                    "text-[11px] font-medium rounded-full px-2.5 border flex items-center gap-1 w-fit",
                    meta.colorClass,
                  )}
                >
                  <StatusIcon className="h-2.5 w-2.5" />
                  {meta.label}
                </Badge>
              }
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
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
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

function PatientReviews() {
  const { t } = useTranslation();

  const [activeFilter, setActiveFilter] = useState<ReviewStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: reviews = [], isLoading } = useGetMyReviews();

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

  const selectedReview = reviews.find((r) => r.id === selectedId) ?? null;

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

        <div className="px-3 py-4 sm:px-6 sm:py-8">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex min-h-[580px]">
            {/* ── Left panel ── */}
            <div
              className={cn(
                "flex flex-col border-border",
                selectedId !== null
                  ? "hidden sm:flex sm:w-72 sm:border-r lg:w-80 shrink-0"
                  : "flex-1",
              )}
            >
              {/* Filter tabs */}
              <div className="flex items-center border-b border-border bg-muted/30 px-2 sm:px-3 overflow-x-auto">
                {FILTER_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveFilter(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap -mb-px shrink-0",
                      activeFilter === id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        "text-[10px] font-semibold rounded-full px-1.5 py-0 min-w-[18px] text-center leading-5",
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

              {/* Search */}
              <div className="px-3 py-2.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by doctor or comment…"
                    className="pl-8 h-8 text-xs border-border focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      No reviews found.
                    </p>
                  </div>
                ) : (
                  filtered.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onOpen={() => setSelectedId(review.id)}
                      compact={selectedId !== null}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ── Right panel ── */}
            {selectedId !== null && selectedReview ? (
              <div className="flex-1 flex flex-col min-h-0">
                <ReviewDetail
                  review={selectedReview}
                  onBack={() => setSelectedId(null)}
                  onDeleted={() => setSelectedId(null)}
                />
              </div>
            ) : (
              <div className="hidden sm:flex flex-1 items-center justify-center text-center p-10">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Select a review
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Click any review on the left to see details, edit, or delete
                    it.
                  </p>
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