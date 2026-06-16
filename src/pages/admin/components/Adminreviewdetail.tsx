import { useState } from "react";
import {
  useGetAdminReview,
  useApproveReview,
  useRejectReview,
  useDeleteReview,
  type ApiReview,
} from "@/hooks/admin/use-admin-reviews";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  User,
  Stethoscope,
  CalendarDays,
  Clock,
  ShieldCheck,
  ShieldX,
  Trash2,
  EyeOff,
  Eye,
  MessageSquare,
  AlertCircle,
  Mail,
  Phone,
  BadgeCheck,
  Globe,
  Hash,
  Activity,
  Award,
  FileText,
  CreditCard,
  Briefcase,
  X,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={cn(
            i < rating
              ? "fill-[hsl(38_92%_50%)] text-[hsl(38_92%_50%)]"
              : "fill-muted text-muted-foreground/30",
          )}
        />
      ))}
      <span className="ml-1 text-[11px] font-semibold text-foreground">
        {rating}/5
      </span>
    </span>
  );
}

function StatusBadge({ status }: { status: ApiReview["status"] }) {
  const map = {
    pending:
      "bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_40%)] border-[hsl(38_92%_50%/0.3)]",
    approved:
      "bg-[hsl(142_71%_45%/0.12)] text-[hsl(142_71%_35%)] border-[hsl(142_71%_45%/0.3)]",
    rejected:
      "bg-[hsl(0_72%_51%/0.12)] text-[hsl(0_72%_45%)] border-[hsl(0_72%_51%/0.3)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        map[status],
      )}
    >
      {status}
    </span>
  );
}

// ─── Skeleton Components ─────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-xl bg-muted p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-2 w-12 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          </div>
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      </div>

      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-2.5 w-20 rounded" />
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden space-y-0">
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className="flex items-start gap-2 px-3 py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-1.5 min-w-[110px] shrink-0">
                  <Skeleton className="h-2.5 w-2.5 rounded" />
                  <Skeleton className="h-2.5 w-16 rounded" />
                </div>
                <Skeleton className="h-2.5 w-32 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-border bg-card p-3">
        <Skeleton className="h-2.5 w-12 rounded mb-2" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-[100px] rounded-md" />
          <Skeleton className="h-7 w-[100px] rounded-md" />
          <Skeleton className="h-7 w-[100px] rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ─── Row building blocks ───────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-primary" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
          {title}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card shadow-soft space-y-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  icon: Icon,
  children,
  mono = false,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-1.5 min-w-[110px] shrink-0 mt-0.5">
        {Icon && <Icon size={11} className="text-muted-foreground shrink-0" />}
        <span className="text-[11px] text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "text-[11px] text-foreground leading-relaxed break-all",
          mono && "font-mono",
        )}
      >
        {children}
      </span>
    </div>
  );
}

function BoolRow({
  label,
  icon: Icon,
  value,
  trueLabel = "Yes",
  falseLabel = "No",
}: {
  label: string;
  icon?: React.ElementType;
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return (
    <Row label={label} icon={Icon}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border",
          value
            ? "bg-[hsl(142_71%_45%/0.1)] text-[hsl(142_71%_35%)] border-[hsl(142_71%_45%/0.25)]"
            : "bg-[hsl(0_72%_51%/0.1)] text-[hsl(0_72%_45%)] border-[hsl(0_72%_51%/0.25)]",
        )}
      >
        {value ? trueLabel : falseLabel}
      </span>
    </Row>
  );
}

// ─── Extended types that INCLUDE all ApiReview fields + extra doctor fields ─────

interface ExtendedDoctorUser {
  name: string;
  email?: string;
  avatar?: string;
  country_code?: string;
  phone?: string;
  gender?: string;
  preferred_language?: string;
  is_verified?: boolean;
  status?: string;
}

interface ExtendedDoctor {
  id: number;
  user_id?: number;
  user: ExtendedDoctorUser;
  specialization?: { name: string };
  slug?: string;
  doctor_degree?: string;
  designations?: string;
  medical_license?: string;
  consultation_type?: string;
  consultation_fee?: string | number;
  currency?: string;
  rating_avg?: number | string;
  agreement_status?: string;
  is_available?: boolean;
  instant_consultation?: boolean;
  bookings_paused?: boolean;
  is_active?: boolean;
  is_featured?: boolean;
  show_homepage?: boolean;
  registration_fee_paid?: boolean;
  bio_en?: string;
  bio_fr?: string;
  bio_kiny?: string;
  seo_title?: string;
  seo_description?: string;
  verified_at?: string;
  image?: string;
  degree_document?: string;
  medical_license_document?: string;
  national_id_document?: string;
  created_at?: string;
  updated_at?: string;
}

interface ExtendedPatient {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
  country_code?: string;
  phone?: string;
  gender?: string;
  preferred_language?: string;
  is_verified?: boolean;
  status?: string;
  phone_verified_at?: string;
  email_verified_at?: string;
  created_at?: string;
}

// ExtendedReview MUST include ALL fields from ApiReview + our extra fields
interface ExtendedReview {
  id: number;
  status: "pending" | "approved" | "rejected";
  is_active: boolean;
  is_anonymous: boolean;
  rating: number;
  comment: string | null;
  rejection_reason: string | null;
  appointment_id: number | null;
  created_at: string;
  updated_at: string;
  doctor: ExtendedDoctor;
  patient: ExtendedPatient;
  appointment?: { id: number; appointment_date: string };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AdminReviewDetailProps {
  reviewId: number | null;
  onClose?: () => void;
}

export default function AdminReviewDetail({
  reviewId,
  onClose,
}: AdminReviewDetailProps) {
  const { data, isLoading, isError } = useGetAdminReview(reviewId);
  const approve = useApproveReview();
  const reject = useRejectReview();
  const del = useDeleteReview();
  const { toast } = useToast();
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  // Cast to extended type since API returns more fields than the hook type declares
  const review = data?.review as ExtendedReview | undefined;

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !review) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
        <AlertCircle size={28} className="text-destructive" />
        <p className="text-xs">Failed to load review details.</p>
      </div>
    );
  }

  const doctor = review.doctor;
  const patient = review.patient;
  const doctorUser = doctor.user;

  const storageBase = import.meta.env.VITE_APP_STORAGE_URL ?? "";

  function doctorAvatar() {
    if (!doctor.image) return undefined;
    return doctor.image.startsWith("http")
      ? doctor.image
      : `${storageBase}/${doctor.image}`;
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleApprove() {
    await approve.mutateAsync(review.id);
    toast({
      title: "Review approved",
      description: `Review #${review.id} has been approved.`,
    });
    onClose?.();
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    await reject.mutateAsync({ id: review.id, reason: rejectReason.trim() });
    toast({
      title: "Review rejected",
      description: `Review #${review.id} has been rejected.`,
    });
    setRejectOpen(false);
    onClose?.();
  }

  async function handleDelete() {
    await del.mutateAsync(review.id);
    toast({
      title: "Review deleted",
      description: `Review #${review.id} has been deleted.`,
      variant: "destructive",
    });
    onClose?.();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 text-[11px]">
      {/* ── Header card ──────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gradient-primary p-3 text-primary-foreground shadow-medium">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-white/15 p-1.5">
              <MessageSquare size={14} />
            </div>
            <div>
              <p className="text-[10px] font-medium opacity-80">Review</p>
              <p className="text-sm font-bold leading-tight">#{review.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StarRating rating={review.rating} />
            <StatusBadge status={review.status} />
          </div>
        </div>
      </div>

      {/* ── Review details ────────────────────────────────────────────────── */}
      <Section title="Review Details" icon={MessageSquare}>
        <Row label="Review ID" icon={Hash} mono>
          {review.id}
        </Row>
        <Row label="Rating" icon={Star}>
          <StarRating rating={review.rating} />
        </Row>
        <Row label="Status" icon={Activity}>
          <StatusBadge status={review.status} />
        </Row>
        <Row label="Anonymous" icon={EyeOff}>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border",
              review.is_anonymous
                ? "bg-muted text-muted-foreground border-border"
                : "bg-[hsl(142_71%_45%/0.1)] text-[hsl(142_71%_35%)] border-[hsl(142_71%_45%/0.25)]",
            )}
          >
            {review.is_anonymous ? <EyeOff size={9} /> : <Eye size={9} />}
            {review.is_anonymous ? "Anonymous" : "Identified"}
          </span>
        </Row>
        <BoolRow
          label="Active"
          icon={Activity}
          value={review.is_active}
          trueLabel="Active"
          falseLabel="Inactive"
        />
        <Row label="Comment" icon={MessageSquare}>
          {review.comment ?? (
            <span className="text-muted-foreground italic">No comment</span>
          )}
        </Row>
        {review.rejection_reason && (
          <Row label="Rejection Reason" icon={AlertCircle}>
            <span className="text-[hsl(0_72%_45%)]">
              {review.rejection_reason}
            </span>
          </Row>
        )}
        <Row label="Created" icon={CalendarDays}>
          {formatDate(review.created_at)}
        </Row>
        <Row label="Updated" icon={Clock}>
          {formatDate(review.updated_at)}
        </Row>
        {review.appointment && (
          <Row label="Appointment" icon={CalendarDays}>
            #{review.appointment.id} —{" "}
            {formatDate(review.appointment.appointment_date)}
          </Row>
        )}
        {review.appointment_id && (
          <Row label="Appointment ID" icon={Hash} mono>
            {review.appointment_id}
          </Row>
        )}
      </Section>

      {/* ── Patient ───────────────────────────────────────────────────────── */}
      <Section title="Patient" icon={User}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border bg-muted/20">
          <Avatar className="h-8 w-8 rounded-full border-2 border-primary/20 shadow-soft">
            <AvatarImage src={patient.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[11px] font-semibold text-foreground">
              {patient.name}
            </p>
            <p className="text-[10px] text-muted-foreground">{patient.email}</p>
          </div>
        </div>
        <Row label="Patient ID" icon={Hash} mono>
          {patient.id}
        </Row>
        <Row label="Name" icon={User}>
          {patient.name}
        </Row>
        <Row label="Email" icon={Mail}>
          {patient.email ?? "—"}
        </Row>
        <Row label="Phone" icon={Phone}>
          {patient.country_code && patient.phone
            ? `${patient.country_code} ${patient.phone}`
            : (patient.phone ?? "—")}
        </Row>
        <Row label="Gender" icon={User}>
          {patient.gender ?? "—"}
        </Row>
        <Row label="Language" icon={Globe}>
          {patient.preferred_language ?? "—"}
        </Row>
        <BoolRow
          label="Verified"
          icon={BadgeCheck}
          value={patient.is_verified ?? false}
        />
        <Row label="Status" icon={Activity}>
          {patient.status ?? "—"}
        </Row>
        {patient.phone_verified_at && (
          <Row label="Phone Verified" icon={Clock}>
            {formatDate(patient.phone_verified_at)}
          </Row>
        )}
        {patient.email_verified_at && (
          <Row label="Email Verified" icon={Clock}>
            {formatDate(patient.email_verified_at)}
          </Row>
        )}
        <Row label="Joined" icon={CalendarDays}>
          {formatDate(patient.created_at)}
        </Row>
      </Section>

      {/* ── Doctor ────────────────────────────────────────────────────────── */}
      <Section title="Doctor" icon={Stethoscope}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border bg-muted/20">
          <Avatar className="h-8 w-8 rounded-full border-2 border-primary/20 shadow-soft">
            <AvatarImage src={doctorAvatar()} />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
              {doctorUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[11px] font-semibold text-foreground">
              {doctorUser.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {doctor.specialization?.name ?? "—"}
            </p>
          </div>
        </div>

        <Row label="Doctor ID" icon={Hash} mono>
          {doctor.id}
        </Row>
        {doctor.user_id && (
          <Row label="User ID" icon={Hash} mono>
            {doctor.user_id}
          </Row>
        )}
        <Row label="Name" icon={User}>
          {doctorUser.name}
        </Row>
        <Row label="Email" icon={Mail}>
          {doctorUser.email ?? "—"}
        </Row>
        <Row label="Phone" icon={Phone}>
          {doctorUser.country_code && doctorUser.phone
            ? `${doctorUser.country_code} ${doctorUser.phone}`
            : (doctorUser.phone ?? "—")}
        </Row>
        <Row label="Gender" icon={User}>
          {doctorUser.gender ?? "—"}
        </Row>
        <Row label="Language" icon={Globe}>
          {doctorUser.preferred_language ?? "—"}
        </Row>
        <BoolRow
          label="Verified"
          icon={BadgeCheck}
          value={doctorUser.is_verified ?? false}
        />
        <Row label="User Status" icon={Activity}>
          {doctorUser.status ?? "—"}
        </Row>

        {doctor.slug && (
          <Row label="Slug" icon={Hash} mono>
            {doctor.slug}
          </Row>
        )}
        {doctor.specialization && (
          <Row label="Specialization" icon={Stethoscope}>
            {doctor.specialization.name}
          </Row>
        )}
        {doctor.doctor_degree && (
          <Row label="Degree" icon={Award}>
            {doctor.doctor_degree}
          </Row>
        )}
        {doctor.designations && (
          <Row label="Designations" icon={Briefcase}>
            {doctor.designations}
          </Row>
        )}
        {doctor.medical_license && (
          <Row label="License No." icon={FileText}>
            {doctor.medical_license}
          </Row>
        )}
        {doctor.consultation_type && (
          <Row label="Consult. Type" icon={Stethoscope}>
            {doctor.consultation_type}
          </Row>
        )}
        {(doctor.consultation_fee !== undefined || doctor.currency) && (
          <Row label="Consult. Fee" icon={CreditCard}>
            {doctor.consultation_fee} {doctor.currency}
          </Row>
        )}
        {doctor.rating_avg !== undefined && (
          <Row label="Rating Avg" icon={Star}>
            {doctor.rating_avg}
          </Row>
        )}
        {doctor.agreement_status && (
          <Row label="Agreement" icon={ShieldCheck}>
            {doctor.agreement_status}
          </Row>
        )}
        {doctor.is_available !== undefined && (
          <BoolRow
            label="Available"
            icon={Activity}
            value={doctor.is_available}
          />
        )}
        {doctor.instant_consultation !== undefined && (
          <BoolRow
            label="Instant Consult"
            icon={Activity}
            value={doctor.instant_consultation}
          />
        )}
        {doctor.bookings_paused !== undefined && (
          <BoolRow
            label="Bookings Paused"
            icon={Activity}
            value={doctor.bookings_paused}
            falseLabel="No"
            trueLabel="Yes"
          />
        )}
        {doctor.is_active !== undefined && (
          <BoolRow label="Active" icon={Activity} value={doctor.is_active} />
        )}
        {doctor.is_featured !== undefined && (
          <BoolRow label="Featured" icon={Star} value={doctor.is_featured} />
        )}
        {doctor.show_homepage !== undefined && (
          <BoolRow
            label="Show Homepage"
            icon={Eye}
            value={doctor.show_homepage}
          />
        )}
        {doctor.registration_fee_paid !== undefined && (
          <Row label="Reg. Fee Paid" icon={CreditCard}>
            {doctor.registration_fee_paid ? "Yes" : "No"}
          </Row>
        )}
        {doctor.bio_en && (
          <Row label="Bio (EN)" icon={MessageSquare}>
            {doctor.bio_en}
          </Row>
        )}
        {doctor.bio_fr && (
          <Row label="Bio (FR)" icon={MessageSquare}>
            {doctor.bio_fr}
          </Row>
        )}
        {doctor.bio_kiny && (
          <Row label="Bio (Kiny)" icon={MessageSquare}>
            {doctor.bio_kiny}
          </Row>
        )}
        {doctor.seo_title && (
          <Row label="SEO Title" icon={FileText}>
            {doctor.seo_title}
          </Row>
        )}
        {doctor.seo_description && (
          <Row label="SEO Desc." icon={FileText}>
            {doctor.seo_description}
          </Row>
        )}
        {doctor.verified_at && (
          <Row label="Verified At" icon={Clock}>
            {formatDate(doctor.verified_at)}
          </Row>
        )}
        {doctor.created_at && (
          <Row label="Doctor Joined" icon={CalendarDays}>
            {formatDate(doctor.created_at)}
          </Row>
        )}
        {doctor.updated_at && (
          <Row label="Doctor Updated" icon={Clock}>
            {formatDate(doctor.updated_at)}
          </Row>
        )}
      </Section>

      {/* ── Document paths ────────────────────────────────────────────────── */}
      {(doctor.degree_document ||
        doctor.medical_license_document ||
        doctor.national_id_document) && (
        <Section title="Documents" icon={FileText}>
          {doctor.degree_document && (
            <Row label="Degree Doc" icon={FileText} mono>
              {doctor.degree_document}
            </Row>
          )}
          {doctor.medical_license_document && (
            <Row label="License Doc" icon={FileText} mono>
              {doctor.medical_license_document}
            </Row>
          )}
          {doctor.national_id_document && (
            <Row label="National ID" icon={FileText} mono>
              {doctor.national_id_document}
            </Row>
          )}
        </Section>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Actions
        </p>

        <div className="flex justify-between flex-wrap gap-2">
          <div className="">
            {/* Approve */}
            {review.status === "pending" && (
              <Button
                size="sm"
                className="h-7 mr-4 px-3 text-[10px] gap-1 bg-primary hover:bg-[hsl(142_71%_40%)]  shadow-soft w-[100px]"
                onClick={handleApprove}
                disabled={approve.isPending}
              >
                <ThumbsUp size={12} />
                {approve.isPending ? "…" : "Approve"}
              </Button>
            )}
            {/* Reject */}
            {review.status === "pending" && (
              <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-[10px] gap-1 border-destructive/40 text-destructive hover:bg-destructive/5 w-[100px]"
                  >
                    <ThumbsDown size={12} />
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm">
                      Reject Review #{review.id}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                      Provide a reason for rejecting this review. The reason
                      will be stored on the record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Enter rejection reason…"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="text-xs min-h-[72px]"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs h-7 px-3">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="h-7 px-3 text-xs bg-destructive hover:bg-destructive/90"
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || reject.isPending}
                    >
                      {reject.isPending ? "…" : "Confirm"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          {/* Delete — always visible */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-3 text-[10px] gap-1 text-destructive hover:bg-destructive/5 border border-destructive/20 w-[100px]"
              >
                <Trash2 size={12} />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  Delete Review #{review.id}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  This action cannot be undone. The review will be permanently
                  removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs h-7 px-3">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="h-7 px-3 text-xs bg-destructive hover:bg-destructive/90"
                  onClick={handleDelete}
                  disabled={del.isPending}
                >
                  {del.isPending ? "…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
