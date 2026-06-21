import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Truck,
  Plus,
  Pencil,
  Trash2,
  Check,
  Share2,
  Calendar,
  Facebook,
  Twitter,
  Instagram,
  Globe,
  Linkedin,
  Link2,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  X,
  CalendarOff,
  ChevronDown,
  ChevronUp,
  Save,
  Info,
  BadgeCheck,
} from "lucide-react";
import {
  useGetPharmacyProfile,
  useCreateOrUpdateProfile,
  useUploadLogo,
  useUploadCoverImage,
  useGetWorkingHours,
  useSetWorkingHours,
  useUpdateWorkingHour,
  useDeleteWorkingHour,
  useResetWorkingHours,
  useGetClosures,
  useCreateClosure,
  useUpdateClosure,
  useDeleteClosure,
  useCheckClosureDate,
  type PharmacyProfile,
  type WorkingHourRecord,
  type ClosureRecord,
  type WorkingHourPayload,
} from "@/hooks/pharmacy/use-pharmacy-profile";
import EmptyState from "./components/EmptyState";
import ProfileSkeleton from "./components/ProfileSkeleton";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface WorkingHoursDay {
  enabled: boolean;
  opens_at: string;
  closes_at: string;
}
interface WorkingHours {
  monday: WorkingHoursDay;
  tuesday: WorkingHoursDay;
  wednesday: WorkingHoursDay;
  thursday: WorkingHoursDay;
  friday: WorkingHoursDay;
  saturday: WorkingHoursDay;
  sunday: WorkingHoursDay;
}
interface SocialLinks {
  website: string;
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
}

interface PharmacyProfileFormData {
  name_en: string;
  name_fr: string;
  description_en: string;
  registration_number: string;
  address: string;
  city: string;
  province: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  opens_at: string;
  closes_at: string;
  is_open_24h: boolean;
  offers_delivery: boolean;
  offers_pickup: boolean;
  delivery_fee: string;
  delivery_currency: string;
  delivery_radius_km: string;
  estimated_delivery_minutes: string;
  working_hours: WorkingHours;
  social_links: SocialLinks;
  // Optional fields surfaced in the General section's edit form
  name_kiny?: string;
  description_fr?: string;
  description_kiny?: string;
  seo_title?: string;
  seo_description?: string;
}

type SectionId =
  | "general"
  | "location"
  | "contact"
  | "hours"
  | "working_hours"
  | "social_links";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
type DayKey = (typeof DAYS_OF_WEEK)[number];

const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const SOCIAL_PLATFORMS = [
  {
    key: "website" as const,
    label: "Website",
    icon: Globe,
    placeholder: "https://medipharm.rw",
  },
  {
    key: "facebook" as const,
    label: "Facebook",
    icon: Facebook,
    placeholder: "https://facebook.com/medipharm",
  },
  {
    key: "twitter" as const,
    label: "Twitter / X",
    icon: Twitter,
    placeholder: "https://twitter.com/medipharm",
  },
  {
    key: "instagram" as const,
    label: "Instagram",
    icon: Instagram,
    placeholder: "https://instagram.com/medipharm",
  },
  {
    key: "linkedin" as const,
    label: "LinkedIn",
    icon: Linkedin,
    placeholder: "https://linkedin.com/company/medipharm",
  },
];

const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  tuesday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  wednesday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  thursday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  friday: { enabled: true, opens_at: "08:00", closes_at: "18:00" },
  saturday: { enabled: true, opens_at: "09:00", closes_at: "15:00" },
  sunday: { enabled: false, opens_at: "09:00", closes_at: "13:00" },
};

const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  website: "",
  facebook: "",
  twitter: "",
  instagram: "",
  linkedin: "",
};

const SECTIONS: {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    id: "general",
    label: "General",
    icon: Building2,
    description: "Name, registration & description",
  },
  {
    id: "location",
    label: "Location",
    icon: MapPin,
    description: "Address, city, province & coordinates",
  },
  {
    id: "contact",
    label: "Contact",
    icon: Phone,
    description: "Phone number & email",
  },
  {
    id: "hours",
    label: "Hours & Delivery",
    icon: Truck,
    description: "Opening hours & delivery settings",
  },
  {
    id: "working_hours",
    label: "Working Hours",
    icon: Calendar,
    description: "Per-day open/close schedule",
  },
  {
    id: "social_links",
    label: "Social Links",
    icon: Share2,
    description: "Website, Facebook, Instagram…",
  },
];

const normalizeTime = (t: string): string => {
  if (!t) return t;
  const parts = t.split(":");
  return `${parts[0].padStart(2, "0")}:${(parts[1] ?? "00").padStart(2, "0")}`;
};

const normalizeDate = (d: string): string => {
  if (!d) return d;
  return d.split("T")[0];
};

const formatPhone = (p: string) =>
  p?.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4") ?? p;

const formatTime = (t: string) => {
  if (!t) return "—";
  const norm = normalizeTime(t);
  const [h, m] = norm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const formatDateDisplay = (d: string): string => {
  const plain = normalizeDate(d);
  if (!plain) return d;
  try {
    return new Date(plain + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return plain;
  }
};

const getInitials = (name: string) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "??";
const formatDeliveryFee = (fee: string | number, currency: string) =>
  `${currency} ${Number(fee).toLocaleString()}`;

// FIX: logo/cover come back from the API as relative storage paths
// (e.g. "pharmacies/logos/xyz.png"), not full URLs — that's why they were
// rendering broken before. Resolve them against the backend host. Swap the
// env var below for whatever your `apiFetch` utility already uses to know
// the API base URL, so this stays in sync automatically.
const STORAGE_BASE_URL =
  (import.meta as any)?.env?.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "";
function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (!STORAGE_BASE_URL) return path; // fallback so something still renders in dev
  return `${STORAGE_BASE_URL}/storage/${path.replace(/^\/+/, "")}`;
}

function apiHoursToForm(records: WorkingHourRecord[]): WorkingHours {
  const base: WorkingHours = JSON.parse(JSON.stringify(DEFAULT_WORKING_HOURS));
  for (const r of records) {
    const day = r.day_of_week as DayKey;
    if (day in base) {
      base[day] = {
        enabled: !r.is_closed && r.is_active,
        // FIX: normalise time from API before storing in form state
        opens_at: normalizeTime(r.open_time ?? "08:00"),
        closes_at: normalizeTime(r.close_time ?? "18:00"),
      };
    }
  }
  return base;
}

function apiProfileToForm(
  p: PharmacyProfile,
): Partial<PharmacyProfileFormData> {
  const links = p.social_links ?? {};
  return {
    name_en: p.name_en ?? "",
    name_fr: p.name_fr ?? "",
    name_kiny: (p as any).name_kiny ?? "",
    description_en: p.description_en ?? "",
    description_fr: (p as any).description_fr ?? "",
    description_kiny: (p as any).description_kiny ?? "",
    registration_number: p.registration_number ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    province: p.province ?? "",
    country: p.country ?? "",
    latitude: p.latitude != null ? String(p.latitude) : "",
    longitude: p.longitude != null ? String(p.longitude) : "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    // FIX: normalise times from profile
    opens_at: normalizeTime(p.opens_at ?? "08:00"),
    closes_at: normalizeTime(p.closes_at ?? "18:00"),
    is_open_24h: p.is_open_24h ?? false,
    offers_delivery: p.offers_delivery ?? true,
    offers_pickup: p.offers_pickup ?? true,
    delivery_fee: p.delivery_fee ?? "0",
    delivery_currency: p.delivery_currency ?? "RWF",
    delivery_radius_km:
      p.delivery_radius_km != null ? String(p.delivery_radius_km) : "",
    estimated_delivery_minutes:
      p.estimated_delivery_minutes != null
        ? String(p.estimated_delivery_minutes)
        : "",
    seo_title: (p as any).seo_title ?? "",
    seo_description: (p as any).seo_description ?? "",
    social_links: {
      // FIX: `website` is returned as a top-level profile field, not nested
      // inside social_links — fall back to it so it isn't lost on reload.
      website: (p as any).website ?? links.website ?? "",
      facebook: links.facebook ?? "",
      twitter: links.twitter ?? "",
      instagram: links.instagram ?? "",
      linkedin: links.linkedin ?? "",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared small components
// ─────────────────────────────────────────────────────────────────────────────
function FormField({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-[11px] font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-[10px] text-destructive flex items-center gap-1">
          <AlertCircle size={10} />
          {error}
        </p>
      )}
    </div>
  );
}

function ViewRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-xs font-medium text-foreground",
          mono && "font-mono",
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: Prominent Edit/Save bar — now uses real Button components so they
// are clearly discoverable rather than tiny text links.
// ─────────────────────────────────────────────────────────────────────────────
function SectionEditBar({
  onEdit,
  onCancel,
  onSave,
  isEditing,
  isSaving,
}: {
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  isEditing: boolean;
  isSaving: boolean;
}) {
  if (!isEditing) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={onEdit}
        className="h-7 px-3 text-xs gap-1.5 border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-150"
      >
        <Pencil size={11} />
        Edit
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className="h-7 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
      >
        <X size={11} /> Cancel
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="h-7 px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/30"
      >
        {isSaving ? (
          <RefreshCw size={11} className="animate-spin" />
        ) : (
          <Save size={11} />
        )}
        Save changes
      </Button>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  editBar,
  isEditing,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  editBar?: React.ReactNode;
  isEditing?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-all duration-200",
        isEditing
          ? "border-primary/50 shadow-md shadow-primary/5 ring-1 ring-primary/20"
          : "border-border hover:border-border/80",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
              isEditing
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon size={14} />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {isEditing && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
              editing
            </span>
          )}
        </div>
        {editBar}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: read-only card surfacing every remaining profile field (slug,
// verification status, inventory mode, timestamps…) that previously had
// nowhere to display.
// ─────────────────────────────────────────────────────────────────────────────
function SystemDetailsCard({ profile }: { profile: PharmacyProfile }) {
  const p = profile as any;
  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Slug", value: p.slug ?? "—", mono: true },
    { label: "Inventory mode", value: p.inventory_mode ?? "—" },
    { label: "Shown on homepage", value: p.show_homepage ? "Yes" : "No" },
    {
      label: "Registration fee paid",
      value: p.registration_fee_paid ? "Yes" : "No",
    },
    { label: "Active", value: p.is_active ? "Yes" : "No" },
    {
      label: "Verified on",
      value: p.verified_at
        ? formatDateDisplay(p.verified_at)
        : "Not yet verified",
    },
    {
      label: "Created",
      value: p.created_at ? formatDateDisplay(p.created_at) : "—",
    },
    {
      label: "Last updated",
      value: p.updated_at ? formatDateDisplay(p.updated_at) : "—",
    },
  ];
  return (
    <SectionCard title="System & verification" icon={Info}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
        {rows.map((r) => (
          <ViewRow
            key={r.label}
            label={r.label}
            value={r.value}
            mono={r.mono}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm flex flex-col gap-0.5 hover:border-border/80 transition-colors">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </span>
      <span
        className={cn(
          "text-[10px] font-bold tabular-nums truncate mt-0.5",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: DateInput — wraps <input type="date"> with a visible calendar icon
// that works in dark mode by inverting the native picker indicator.
// ─────────────────────────────────────────────────────────────────────────────
function DateInput({
  value,
  onChange,
  min,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all",
          "[color-scheme:dark]",
          // Make the native calendar icon always visible
          "[&::-webkit-calendar-picker-indicator]:opacity-60",
          "[&::-webkit-calendar-picker-indicator]:invert",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:hover:opacity-100",
          className,
        )}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({
  activeSection,
  onSelect,
  mode,
  profile,
  visitedSteps,
  onCreateNew,
}: {
  activeSection: SectionId;
  onSelect: (id: SectionId) => void;
  mode: "setup" | "view";
  profile: PharmacyProfile | null;
  visitedSteps?: Set<number>;
  onCreateNew?: () => void;
}) {
  const isSetup = mode === "setup";
  const pct = visitedSteps
    ? Math.round((visitedSteps.size / SECTIONS.length) * 100)
    : 0;
  const logoUrl = profile ? resolveImageUrl(profile.logo) : undefined;

  return (
    <div className="w-full sm:w-60 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        {isSetup ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Profile setup
              </span>
              <span className="text-[11px] font-bold text-primary tabular-nums">
                {pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {visitedSteps?.size ?? 0} of {SECTIONS.length} sections visited
            </p>
          </div>
        ) : profile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0 overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(profile.name_en)
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate leading-tight">
                  {profile.name_en}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5",
                    profile.status === "approved"
                      ? "text-emerald-500"
                      : profile.status === "rejected"
                        ? "text-destructive"
                        : "text-amber-500",
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-current" />
                  {profile.status.charAt(0).toUpperCase() +
                    profile.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 divide-y divide-border/60">
              {[
                { label: "City", value: profile.city },
                {
                  label: "Delivery",
                  value: profile.offers_delivery
                    ? formatDeliveryFee(
                        profile.delivery_fee,
                        profile.delivery_currency,
                      )
                    : "No delivery",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center px-3 py-2"
                >
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Nav */}
      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden">
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          const isActive = section.id === activeSection;
          const isDone = isSetup && visitedSteps?.has(i);
          return (
            <button
              key={section.id}
              onClick={() => onSelect(section.id)}
              className={cn(
                "flex shrink-0 sm:shrink sm:w-full items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all duration-150 group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : isDone
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500"
                      : "bg-muted border-border text-muted-foreground",
                )}
              >
                {isDone && !isActive ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <span
                  className={cn(
                    "text-xs font-semibold leading-tight block truncate",
                    isActive && "text-primary",
                  )}
                >
                  {section.label}
                </span>
                <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                  {section.description}
                </p>
              </div>
              {!isSetup && isActive && (
                <div className="hidden sm:block w-1 h-4 rounded-full bg-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {!isSetup && onCreateNew && (
        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            onClick={onCreateNew}
            className="w-full text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={11} /> Reset & recreate
          </Button>
        </div>
      )}
      {isSetup && (
        <div className="hidden sm:block px-4 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Jump between sections freely — no order needed
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Hero — cover image + overlapping logo. This is the primary visual
// identity of the pharmacy, so it now gets a full-width banner at the top
// of the page instead of being buried as two small thumbnails inside the
// General tab. Upload buttons live directly on the image they affect.
// ─────────────────────────────────────────────────────────────────────────────
function ProfileHero({ profile }: { profile: PharmacyProfile }) {
  const p = profile as any;
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const uploadLogo = useUploadLogo();
  const uploadCover = useUploadCoverImage();
  const [copied, setCopied] = useState(false);

  const coverUrl = resolveImageUrl(profile.image);
  const logoUrl = resolveImageUrl(profile.logo);
  const isVerified = !!p.verified_at;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadLogo.mutate(file, {
      onSuccess: () => toast.success("Logo updated"),
      onError: (e) => toast.error(e.message),
    });
    e.target.value = "";
  };
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadCover.mutate(file, {
      onSuccess: () => toast.success("Cover photo updated"),
      onError: (e) => toast.error(e.message),
    });
    e.target.value = "";
  };

  const handleCopySlug = async () => {
    if (!p.slug) return;
    const url = `${window.location.origin}/pharmacy/${p.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-card shadow-sm">
      {/* Cover photo */}
      <div className="relative h-32 sm:h-48 bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${profile.name_en} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-muted to-muted flex items-center justify-center">
            <ImageIcon size={26} className="text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/5" />
        <button
          onClick={() => coverRef.current?.click()}
          disabled={uploadCover.isPending}
          className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-[11px] font-semibold px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          {uploadCover.isPending ? (
            <RefreshCw size={11} className="animate-spin" />
          ) : (
            <Upload size={11} />
          )}
          {coverUrl ? "Change cover" : "Add cover"}
        </button>
        <input
          ref={coverRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          className="hidden"
          onChange={handleCoverChange}
        />
      </div>

      {/* Logo + identity row */}
      <div className="relative px-4 sm:px-6 pb-4 pt-12">
        <div className="absolute -top-9 sm:-top-10 left-4 sm:left-6 group">
          <div className="relative w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-2xl border-4 border-card bg-muted overflow-hidden shadow-md">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${profile.name_en} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-base font-bold text-primary bg-primary/10">
                {getInitials(profile.name_en)}
              </div>
            )}
            <button
              onClick={() => logoRef.current?.click()}
              disabled={uploadLogo.isPending}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all"
              title="Change logo"
            >
              {uploadLogo.isPending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
            </button>
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3 sm:ml-28">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground truncate">
                {profile.name_en}
              </h2>
              {isVerified && (
                <span
                  title={`Verified on ${formatDateDisplay(p.verified_at)}`}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5"
                >
                  <BadgeCheck size={11} /> Verified
                </span>
              )}
              <span
                className={cn(
                  "text-[10px] font-bold rounded-full px-2 py-0.5 capitalize",
                  ["active", "approved"].includes(profile.status)
                    ? "bg-primary/15 text-primary"
                    : profile.status === "rejected"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-amber-500/15 text-amber-500",
                )}
              >
                {profile.status}
              </span>
            </div>
            {(profile.name_fr || p.name_kiny) && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {[profile.name_fr, p.name_kiny].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {p.slug && (
            <button
              onClick={handleCopySlug}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary border border-border rounded-full px-3 py-1.5 hover:border-primary/40 transition-colors shrink-0 self-start sm:self-auto"
            >
              <Link2 size={11} /> {copied ? "Copied!" : `/pharmacy/${p.slug}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Working Hours Grid
// FIX: All time values pass through normalizeTime so we never send seconds.
// ─────────────────────────────────────────────────────────────────────────────
function WorkingHoursGrid({
  value,
  onChange,
  readonly = false,
}: {
  value: WorkingHours;
  onChange?: (v: WorkingHours) => void;
  readonly?: boolean;
}) {
  const updateDay = (day: DayKey, patch: Partial<WorkingHoursDay>) =>
    onChange?.({ ...value, [day]: { ...value[day], ...patch } });

  const applyToAll = (day: DayKey) => {
    const src = value[day];
    const next = { ...value };
    DAYS_OF_WEEK.forEach((d) => {
      if (d !== day)
        next[d] = {
          ...next[d],
          opens_at: src.opens_at,
          closes_at: src.closes_at,
        };
    });
    onChange?.(next);
  };

  return (
    <div className="space-y-1.5">
      {!readonly && (
        <div className="hidden sm:grid grid-cols-[96px_1fr_1fr_auto_auto] gap-2 px-3 mb-1">
          {["Day", "Opens at", "Closes at", "Copy", "Open"].map((h) => (
            <span
              key={h}
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {DAYS_OF_WEEK.map((day) => {
        const d = value[day];
        const isWeekend = day === "saturday" || day === "sunday";

        if (readonly) {
          return (
            <div
              key={day}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 border text-xs transition-colors",
                d.enabled
                  ? isWeekend
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-card/50"
                  : "border-border/30 bg-muted/10 opacity-50",
              )}
            >
              <span
                className={cn(
                  "font-semibold w-24",
                  !d.enabled && "text-muted-foreground",
                  isWeekend && d.enabled && "text-primary",
                )}
              >
                {DAY_LABELS[day]}
              </span>
              {d.enabled ? (
                <span className="font-mono text-foreground text-[11px]">
                  {formatTime(d.opens_at)} – {formatTime(d.closes_at)}
                </span>
              ) : (
                <span className="text-muted-foreground italic text-[11px]">
                  Closed
                </span>
              )}
              <span
                className={cn(
                  "text-[10px] font-bold rounded-full px-2.5 py-0.5",
                  d.enabled
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {d.enabled ? "Open" : "Closed"}
              </span>
            </div>
          );
        }

        return (
          <div
            key={day}
            className={cn(
              "rounded-lg border transition-all duration-150",
              d.enabled
                ? isWeekend
                  ? "border-primary/25 bg-primary/5"
                  : "border-border bg-card"
                : "border-border/40 bg-muted/20 opacity-55",
            )}
          >
            {/* Desktop */}
            <div className="hidden sm:grid grid-cols-[96px_1fr_1fr_auto_auto] gap-2 items-center px-3 py-2.5">
              <span
                className={cn(
                  "text-xs font-semibold",
                  !d.enabled && "text-muted-foreground",
                  isWeekend && d.enabled && "text-primary",
                )}
              >
                {DAY_LABELS[day].slice(0, 3)}
              </span>
              <input
                type="time"
                value={normalizeTime(d.opens_at)}
                disabled={!d.enabled}
                onChange={(e) =>
                  updateDay(day, { opens_at: normalizeTime(e.target.value) })
                }
                className={cn(
                  "w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all [color-scheme:dark]",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "[&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert",
                  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-100",
                )}
              />
              <input
                type="time"
                value={normalizeTime(d.closes_at)}
                disabled={!d.enabled}
                onChange={(e) =>
                  updateDay(day, { closes_at: normalizeTime(e.target.value) })
                }
                className={cn(
                  "w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all [color-scheme:dark]",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "[&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert",
                  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-100",
                )}
              />
              <button
                onClick={() => applyToAll(day)}
                disabled={!d.enabled}
                title="Copy to all days"
                className="text-[10px] font-bold text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors px-1"
              >
                ↓ All
              </button>
              <Switch
                checked={d.enabled}
                onCheckedChange={(v) => updateDay(day, { enabled: v })}
              />
            </div>

            {/* Mobile */}
            <div className="sm:hidden px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-bold",
                    !d.enabled && "text-muted-foreground",
                    isWeekend && d.enabled && "text-primary",
                  )}
                >
                  {DAY_LABELS[day]}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => applyToAll(day)}
                    disabled={!d.enabled}
                    className="text-[10px] font-bold text-muted-foreground hover:text-primary disabled:opacity-30"
                  >
                    ↓ All
                  </button>
                  <Switch
                    checked={d.enabled}
                    onCheckedChange={(v) => updateDay(day, { enabled: v })}
                  />
                </div>
              </div>
              {d.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      Opens at
                    </span>
                    <input
                      type="time"
                      value={normalizeTime(d.opens_at)}
                      onChange={(e) =>
                        updateDay(day, {
                          opens_at: normalizeTime(e.target.value),
                        })
                      }
                      className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      Closes at
                    </span>
                    <input
                      type="time"
                      value={normalizeTime(d.closes_at)}
                      onChange={(e) =>
                        updateDay(day, {
                          closes_at: normalizeTime(e.target.value),
                        })
                      }
                      className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Closures Manager
// FIX: normalizeDate strips ISO timestamps; DateInput shows calendar icon.
// ─────────────────────────────────────────────────────────────────────────────
function ClosuresManager() {
  const { data: closures = [], isLoading } = useGetClosures();
  const createClosure = useCreateClosure();
  const updateClosure = useUpdateClosure();
  const deleteClosure = useDeleteClosure();
  const checkDate = useCheckClosureDate();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ from_date: "", to_date: "", reason: "" });
  const [checkDateVal, setCheckDateVal] = useState("");
  const [checkResult, setCheckResult] = useState<{
    is_closed: boolean;
    reason: string | null;
  } | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ from_date: "", to_date: "", reason: "" });
  };

  const handleSubmit = () => {
    if (!form.from_date || !form.to_date) return;
    const payload = {
      from_date: form.from_date,
      to_date: form.to_date,
      reason: form.reason || undefined,
    };
    if (editingId !== null) {
      updateClosure.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            toast.success("Closure updated");
            resetForm();
          },
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      createClosure.mutate(payload, {
        onSuccess: () => {
          toast.success("Closure saved");
          resetForm();
        },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleCheck = () => {
    if (!checkDateVal) return;
    checkDate.mutate(checkDateVal, {
      onSuccess: (r) =>
        setCheckResult({ is_closed: r.is_closed, reason: r.reason }),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-3">
      {/* Check a date */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Check a date
        </p>
        <div className="flex gap-2 items-center">
          {/* FIX: use DateInput for consistent icon visibility */}
          <div className="flex-1">
            <DateInput
              value={checkDateVal}
              min={today}
              onChange={(v) => {
                setCheckDateVal(v);
                setCheckResult(null);
              }}
            />
          </div>
          <Button
            size="sm"
            onClick={handleCheck}
            disabled={!checkDateVal || checkDate.isPending}
            className="h-9 text-xs bg-primary text-primary-foreground px-4 shrink-0"
          >
            {checkDate.isPending ? (
              <RefreshCw size={11} className="animate-spin" />
            ) : (
              "Check"
            )}
          </Button>
        </div>
        {checkResult && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-semibold border",
              checkResult.is_closed
                ? "bg-destructive/10 text-destructive border-destructive/25"
                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
            )}
          >
            {checkResult.is_closed ? (
              <>
                <CalendarOff size={12} /> Closed
                {checkResult.reason ? ` — ${checkResult.reason}` : ""}
              </>
            ) : (
              <>
                <Check size={12} /> Open on this date
              </>
            )}
          </div>
        )}
      </div>

      {/* Existing closures list */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : closures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-6 text-center">
          <CalendarOff
            size={20}
            className="text-muted-foreground mx-auto mb-2"
          />
          <p className="text-[11px] text-muted-foreground">
            No upcoming closures scheduled
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {closures.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-border/80 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <CalendarOff size={13} className="text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                {/* FIX: use formatDateDisplay to convert ISO timestamps to readable dates */}
                <p className="text-xs font-semibold text-foreground">
                  {formatDateDisplay(c.from_date)} →{" "}
                  {formatDateDisplay(c.to_date)}
                </p>
                {c.reason && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {c.reason}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    // FIX: normalise dates before populating the edit form
                    setForm({
                      from_date: normalizeDate(c.from_date),
                      to_date: normalizeDate(c.to_date),
                      reason: c.reason ?? "",
                    });
                    setEditingId(c.id);
                    setShowForm(true);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this closure?")) {
                      deleteClosure.mutate(c.id, {
                        onSuccess: () => toast.success("Closure removed"),
                        onError: (e) => toast.error(e.message),
                      });
                    }
                  }}
                  disabled={deleteClosure.isPending}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm ? (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-primary">
              {editingId !== null ? "Edit closure" : "New closure period"}
            </p>
            <button
              onClick={resetForm}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From date">
              {/* FIX: DateInput ensures calendar icon is visible */}
              <DateInput
                value={form.from_date}
                min={today}
                onChange={(v) => setForm((f) => ({ ...f, from_date: v }))}
              />
            </FormField>
            <FormField label="To date">
              <DateInput
                value={form.to_date}
                min={form.from_date || today}
                onChange={(v) => setForm((f) => ({ ...f, to_date: v }))}
              />
            </FormField>
          </div>
          <FormField label="Reason (optional)">
            <Input
              value={form.reason}
              placeholder="e.g. Christmas Holiday"
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              className="h-9 text-xs"
            />
          </FormField>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              className="flex-1 h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={
                !form.from_date ||
                !form.to_date ||
                createClosure.isPending ||
                updateClosure.isPending
              }
              className="flex-1 h-9 text-xs bg-primary text-primary-foreground gap-1.5"
            >
              {createClosure.isPending || updateClosure.isPending ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <Check size={11} />
              )}
              {editingId !== null ? "Update closure" : "Save closure"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          className="w-full h-9 text-xs gap-2 border-dashed hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={12} /> Add closure period
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section panels — General, Location, Contact, Hours, Working Hours, Social
// ─────────────────────────────────────────────────────────────────────────────

function GeneralSection({
  profile,
  onSaved,
}: {
  profile: PharmacyProfile;
  onSaved: () => void;
}) {
  const p = profile as any;
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name_en: profile.name_en,
      name_fr: profile.name_fr ?? "",
      name_kiny: p.name_kiny ?? "",
      description_en: profile.description_en ?? "",
      description_fr: p.description_fr ?? "",
      description_kiny: p.description_kiny ?? "",
      registration_number: profile.registration_number ?? "",
      seo_title: p.seo_title ?? "",
      seo_description: p.seo_description ?? "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    save.mutate(data, {
      onSuccess: () => {
        toast.success("General info updated");
        setEditing(false);
        onSaved();
      },
      onError: (e) => toast.error(e.message),
    });
  });

  const descriptions = [
    { lang: "English", value: profile.description_en },
    { lang: "Français", value: p.description_fr },
    { lang: "Ikinyarwanda", value: p.description_kiny },
  ].filter((d) => d.value);

  return (
    <SectionCard
      title="General information"
      icon={Building2}
      isEditing={editing}
      editBar={
        <SectionEditBar
          onEdit={() => setEditing(true)}
          onCancel={() => {
            reset();
            setEditing(false);
          }}
          onSave={onSubmit}
          isEditing={editing}
          isSaving={save.isPending}
        />
      }
    >
      {editing ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Name (English) *" error={errors.name_en?.message}>
              <Input
                {...register("name_en", { required: "Required" })}
                className="h-9 text-xs"
              />
            </FormField>
            <FormField label="Name (French)">
              <Input {...register("name_fr")} className="h-9 text-xs" />
            </FormField>
            <FormField label="Name (Kinyarwanda)">
              <Input {...register("name_kiny")} className="h-9 text-xs" />
            </FormField>
          </div>
          <FormField label="Registration Number">
            <Input
              {...register("registration_number")}
              className="h-9 text-xs font-mono"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/60">
            <FormField label="Description (English)">
              <Input {...register("description_en")} className="h-9 text-xs" />
            </FormField>
            <FormField label="Description (French)">
              <Input {...register("description_fr")} className="h-9 text-xs" />
            </FormField>
            <FormField label="Description (Kinyarwanda)">
              <Input
                {...register("description_kiny")}
                className="h-9 text-xs"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-border/60">
            <FormField label="SEO title">
              <Input
                {...register("seo_title")}
                placeholder="Shown in search engine results"
                className="h-9 text-xs"
              />
            </FormField>
            <FormField label="SEO description">
              <Input
                {...register("seo_description")}
                placeholder="Short summary shown under the search result title"
                className="h-9 text-xs"
              />
            </FormField>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <ViewRow label="Name (EN)" value={profile.name_en} />
            <ViewRow label="Name (FR)" value={profile.name_fr ?? ""} />
            <ViewRow label="Name (Kinyarwanda)" value={p.name_kiny ?? ""} />
            <div className="col-span-1 sm:col-span-3">
              <ViewRow
                label="Registration"
                value={profile.registration_number ?? ""}
                mono
              />
            </div>
          </div>
          {descriptions.length > 0 && (
            <div className="pt-3 border-t border-border/60 space-y-3">
              {descriptions.map((d) => (
                <div key={d.lang}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    {d.lang}
                  </p>
                  <p className="text-xs text-foreground leading-relaxed">
                    {d.value}
                  </p>
                </div>
              ))}
            </div>
          )}
          {(p.seo_title || p.seo_description) && (
            <div className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <ViewRow label="SEO title" value={p.seo_title ?? ""} />
              <ViewRow
                label="SEO description"
                value={p.seo_description ?? ""}
              />
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function LocationSection({
  profile,
  onSaved,
}: {
  profile: PharmacyProfile;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      address: profile.address ?? "",
      city: profile.city ?? "",
      province: profile.province ?? "",
      country: profile.country ?? "",
      latitude: profile.latitude != null ? String(profile.latitude) : "",
      longitude: profile.longitude != null ? String(profile.longitude) : "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    save.mutate(
      {
        ...data,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Location updated");
          setEditing(false);
          onSaved();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  });

  return (
    <SectionCard
      title="Location"
      icon={MapPin}
      isEditing={editing}
      editBar={
        <SectionEditBar
          onEdit={() => setEditing(true)}
          onCancel={() => {
            reset();
            setEditing(false);
          }}
          onSave={onSubmit}
          isEditing={editing}
          isSaving={save.isPending}
        />
      }
    >
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Street Address"
            error={errors.address?.message}
            className="col-span-1 sm:col-span-2"
          >
            <Input
              {...register("address", { required: "Required" })}
              className="h-9 text-xs"
            />
          </FormField>
          <FormField label="City" error={errors.city?.message}>
            <Input
              {...register("city", { required: "Required" })}
              className="h-9 text-xs"
            />
          </FormField>
          <FormField label="Province">
            <Input {...register("province")} className="h-9 text-xs" />
          </FormField>
          <FormField
            label="Country"
            error={errors.country?.message}
            className="col-span-1 sm:col-span-2"
          >
            <Input
              {...register("country", { required: "Required" })}
              className="h-9 text-xs"
            />
          </FormField>
          <FormField label="Latitude">
            <Input
              {...register("latitude")}
              placeholder="-1.9441"
              className="h-9 text-xs font-mono"
            />
          </FormField>
          <FormField label="Longitude">
            <Input
              {...register("longitude")}
              placeholder="30.0619"
              className="h-9 text-xs font-mono"
            />
          </FormField>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-1 sm:col-span-2">
            <ViewRow label="Street" value={profile.address} />
          </div>
          <ViewRow label="City" value={profile.city} />
          <ViewRow label="Province" value={profile.province ?? ""} />
          <ViewRow label="Country" value={profile.country} />
          {profile.latitude != null && (
            <ViewRow
              label="Coordinates"
              value={`${profile.latitude}, ${profile.longitude}`}
              mono
            />
          )}
        </div>
      )}
    </SectionCard>
  );
}

function ContactSection({
  profile,
  onSaved,
}: {
  profile: PharmacyProfile;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { phone: profile.phone ?? "", email: profile.email ?? "" },
  });

  const onSubmit = handleSubmit((data) => {
    save.mutate(data, {
      onSuccess: () => {
        toast.success("Contact details updated");
        setEditing(false);
        onSaved();
      },
      onError: (e) => toast.error(e.message),
    });
  });

  return (
    <SectionCard
      title="Contact details"
      icon={Phone}
      isEditing={editing}
      editBar={
        <SectionEditBar
          onEdit={() => setEditing(true)}
          onCancel={() => {
            reset();
            setEditing(false);
          }}
          onSave={onSubmit}
          isEditing={editing}
          isSaving={save.isPending}
        />
      }
    >
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Phone Number"
            error={errors.phone?.message}
            className="col-span-1 sm:col-span-2"
          >
            <Input
              type="tel"
              {...register("phone", { required: "Required" })}
              className="h-9 text-xs"
            />
          </FormField>
          <FormField
            label="Email Address"
            error={errors.email?.message}
            className="col-span-1 sm:col-span-2"
          >
            <Input
              type="email"
              {...register("email", {
                required: "Required",
                pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" },
              })}
              className="h-9 text-xs"
            />
          </FormField>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <Phone size={13} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Phone</p>
              <span className="text-xs font-bold font-mono text-primary">
                {formatPhone(profile.phone)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-[11px] font-bold shrink-0">
              @
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground mb-0.5">Email</p>
              <span className="text-xs font-semibold text-foreground truncate block">
                {profile.email}
              </span>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function HoursSection({
  profile,
  onSaved,
}: {
  profile: PharmacyProfile;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      is_open_24h: profile.is_open_24h,
      // FIX: normalise times from profile
      opens_at: normalizeTime(profile.opens_at ?? "08:00"),
      closes_at: normalizeTime(profile.closes_at ?? "18:00"),
      offers_delivery: profile.offers_delivery,
      offers_pickup: profile.offers_pickup,
      delivery_fee: profile.delivery_fee ?? "0",
      delivery_currency: profile.delivery_currency ?? "RWF",
      delivery_radius_km:
        profile.delivery_radius_km != null
          ? String(profile.delivery_radius_km)
          : "",
      estimated_delivery_minutes:
        profile.estimated_delivery_minutes != null
          ? String(profile.estimated_delivery_minutes)
          : "",
    },
  });
  const is24h = watch("is_open_24h");
  const offersDelivery = watch("offers_delivery");

  const onSubmit = handleSubmit((data) => {
    save.mutate(
      {
        is_open_24h: data.is_open_24h,
        // FIX: normalise before sending so no seconds leak through
        opens_at: data.is_open_24h ? undefined : normalizeTime(data.opens_at),
        closes_at: data.is_open_24h ? undefined : normalizeTime(data.closes_at),
        offers_delivery: data.offers_delivery,
        offers_pickup: data.offers_pickup,
        delivery_fee: data.delivery_fee
          ? parseFloat(data.delivery_fee)
          : undefined,
        delivery_currency: data.delivery_currency,
        delivery_radius_km: data.delivery_radius_km
          ? parseFloat(data.delivery_radius_km)
          : undefined,
        estimated_delivery_minutes: data.estimated_delivery_minutes
          ? parseFloat(data.estimated_delivery_minutes)
          : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Hours & delivery updated");
          setEditing(false);
          onSaved();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  });

  return (
    <SectionCard
      title="Hours & delivery"
      icon={Truck}
      isEditing={editing}
      editBar={
        <SectionEditBar
          onEdit={() => setEditing(true)}
          onCancel={() => {
            reset();
            setEditing(false);
          }}
          onSave={onSubmit}
          isEditing={editing}
          isSaving={save.isPending}
        />
      }
    >
      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-xs font-semibold">Open 24 hours</p>
              <p className="text-[10px] text-muted-foreground">
                Overrides open/close times
              </p>
            </div>
            <Switch
              checked={is24h}
              onCheckedChange={(v) => setValue("is_open_24h", v)}
            />
          </div>
          <FormField label="Opens At">
            <input
              type="time"
              disabled={is24h}
              {...register("opens_at")}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary [color-scheme:dark] disabled:opacity-40 transition-all [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </FormField>
          <FormField label="Closes At">
            <input
              type="time"
              disabled={is24h}
              {...register("closes_at")}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary [color-scheme:dark] disabled:opacity-40 transition-all [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </FormField>
          <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-3">
            {(["offers_delivery", "offers_pickup"] as const).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3"
              >
                <p className="text-xs font-semibold capitalize">
                  {key.replace("offers_", "Offers ")}
                </p>
                <Switch
                  checked={watch(key)}
                  onCheckedChange={(v) => setValue(key, v)}
                />
              </div>
            ))}
          </div>
          {offersDelivery && (
            <>
              <FormField label="Delivery Fee (RWF)">
                <Input
                  type="number"
                  {...register("delivery_fee")}
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField label="Radius (km)">
                <Input
                  type="number"
                  {...register("delivery_radius_km")}
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField
                label="Est. Delivery Time (min)"
                className="col-span-1 sm:col-span-2"
              >
                <Input
                  type="number"
                  {...register("estimated_delivery_minutes")}
                  className="h-9 text-xs"
                />
              </FormField>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {profile.is_open_24h ? (
            <div className="col-span-1 sm:col-span-2">
              <ViewRow label="Hours" value="Open 24 hours" />
            </div>
          ) : (
            <>
              <ViewRow label="Opens at" value={formatTime(profile.opens_at)} />
              <ViewRow
                label="Closes at"
                value={formatTime(profile.closes_at)}
              />
            </>
          )}
          {profile.offers_delivery && (
            <>
              <ViewRow
                label="Delivery fee"
                value={formatDeliveryFee(
                  profile.delivery_fee,
                  profile.delivery_currency,
                )}
              />
              <ViewRow
                label="Radius"
                value={`${profile.delivery_radius_km} km`}
              />
              <div className="col-span-1 sm:col-span-2">
                <ViewRow
                  label="Est. delivery time"
                  value={`${profile.estimated_delivery_minutes} minutes`}
                />
              </div>
            </>
          )}
          <div className="col-span-1 sm:col-span-2 flex gap-2 flex-wrap">
            {profile.offers_delivery && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1 bg-primary/15 text-primary">
                <Check size={10} /> Delivery
              </span>
            )}
            {profile.offers_pickup && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1 bg-primary/15 text-primary">
                <Check size={10} /> Pickup
              </span>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function WorkingHoursSection({
  workingHoursData,
}: {
  workingHoursData: WorkingHourRecord[];
}) {
  const [editing, setEditing] = useState(false);
  const setHours = useSetWorkingHours();
  const resetHours = useResetWorkingHours();

  const saved =
    workingHoursData.length > 0
      ? apiHoursToForm(workingHoursData)
      : DEFAULT_WORKING_HOURS;
  const [localHours, setLocalHours] = useState<WorkingHours>(saved);

  useEffect(() => {
    setLocalHours(saved);
  }, [workingHoursData]);

  const handleSave = () => {
    const payload: WorkingHourPayload[] = DAYS_OF_WEEK.map((day) => ({
      day_of_week: day,
      // FIX: normalise time before sending to API
      open_time: localHours[day].enabled
        ? normalizeTime(localHours[day].opens_at)
        : null,
      close_time: localHours[day].enabled
        ? normalizeTime(localHours[day].closes_at)
        : null,
      is_closed: !localHours[day].enabled,
    }));
    setHours.mutate(payload, {
      onSuccess: () => {
        toast.success("Working hours saved");
        setEditing(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleCancel = () => {
    setLocalHours(saved);
    setEditing(false);
  };

  const handleReset = () => {
    if (!confirm("Reset all working hours to defaults?")) return;
    resetHours.mutate(undefined, {
      onSuccess: () => {
        toast.success("Working hours reset");
        setLocalHours(DEFAULT_WORKING_HOURS);
        setEditing(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-3">
      <SectionCard
        title="Weekly working hours"
        icon={Calendar}
        isEditing={editing}
        editBar={
          <SectionEditBar
            onEdit={() => setEditing(true)}
            onCancel={handleCancel}
            onSave={handleSave}
            isEditing={editing}
            isSaving={setHours.isPending}
          />
        }
      >
        <WorkingHoursGrid
          value={localHours}
          onChange={editing ? setLocalHours : undefined}
          readonly={!editing}
        />
        {editing && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetHours.isPending}
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5 h-8"
            >
              {resetHours.isPending ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <Trash2 size={11} />
              )}
              Reset all to defaults
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Use "↓ All" to copy times across all days
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Closure periods" icon={CalendarOff}>
        <ClosuresManager />
      </SectionCard>
    </div>
  );
}

function SocialLinksSection({
  profile,
  onSaved,
}: {
  profile: PharmacyProfile;
  onSaved: () => void;
}) {
  const p = profile as any;
  const [editing, setEditing] = useState(false);
  const save = useCreateOrUpdateProfile();
  // FIX: `website` lives on the top-level profile field, the rest live
  // inside social_links — merge them so neither display nor edit loses it.
  const links = {
    ...(profile.social_links ?? {}),
    website: p.website ?? profile.social_links?.website ?? "",
  };

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      website: links.website ?? "",
      facebook: links.facebook ?? "",
      twitter: links.twitter ?? "",
      instagram: links.instagram ?? "",
      linkedin: links.linkedin ?? "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    // FIX: previously this only ever sent `{ website }`, so editing
    // facebook/twitter/instagram/linkedin silently did nothing. Send
    // website at the top level and the rest grouped under social_links,
    // matching the shape the API returns.
    save.mutate(
      {
        website: data.website || undefined,
        social_links: {
          facebook: data.facebook || undefined,
          twitter: data.twitter || undefined,
          instagram: data.instagram || undefined,
          linkedin: data.linkedin || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Social links updated");
          setEditing(false);
          onSaved();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  });

  const activeLinks = SOCIAL_PLATFORMS.filter(
    ({ key }) => links[key as keyof typeof links],
  );

  return (
    <SectionCard
      title="Social media & web"
      icon={Share2}
      isEditing={editing}
      editBar={
        <SectionEditBar
          onEdit={() => setEditing(true)}
          onCancel={() => {
            reset();
            setEditing(false);
          }}
          onSave={onSubmit}
          isEditing={editing}
          isSaving={save.isPending}
        />
      }
    >
      {editing ? (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            All fields are optional.
          </p>
          {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
            <FormField key={key} label={label}>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  {...register(key as any)}
                  placeholder={placeholder}
                  type="url"
                  className="flex-1 h-9 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
              </div>
            </FormField>
          ))}
        </div>
      ) : activeLinks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-6 text-center">
          <Share2 size={20} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-[11px] text-muted-foreground">
            No social links added yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeLinks.map(({ key, label, icon: Icon }) => (
            <a
              key={key}
              href={links[key as keyof typeof links] as string}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 hover:border-primary/40 hover:bg-primary/5 px-4 py-3 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/15 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all">
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="text-[11px] font-semibold truncate group-hover:text-primary transition-colors">
                  {(links[key as keyof typeof links] as string).replace(
                    /^https?:\/\/(www\.)?/,
                    "",
                  )}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Router
// ─────────────────────────────────────────────────────────────────────────────
function SectionRouter({
  activeSection,
  profile,
  workingHours,
  closures,
  onSaved,
}: {
  activeSection: SectionId;
  profile: PharmacyProfile;
  workingHours: WorkingHourRecord[];
  closures: ClosureRecord[];
  onSaved: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
      {profile.status !== "approved" && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold border",
            profile.status === "rejected"
              ? "bg-destructive/10 border-destructive/25 text-destructive"
              : "bg-amber-500/10 border-amber-500/25 text-amber-500",
          )}
        >
          <AlertCircle size={14} className="shrink-0" />
          {profile.status === "rejected"
            ? "Your profile was rejected. Please edit and resubmit."
            : "Your profile is pending admin approval."}
        </div>
      )}

      {activeSection === "general" && (
        <>
          <GeneralSection profile={profile} onSaved={onSaved} />
          <SystemDetailsCard profile={profile} />
        </>
      )}
      {activeSection === "location" && (
        <LocationSection profile={profile} onSaved={onSaved} />
      )}
      {activeSection === "contact" && (
        <ContactSection profile={profile} onSaved={onSaved} />
      )}
      {activeSection === "hours" && (
        <HoursSection profile={profile} onSaved={onSaved} />
      )}
      {activeSection === "working_hours" && (
        <WorkingHoursSection workingHoursData={workingHours} />
      )}
      {activeSection === "social_links" && (
        <SocialLinksSection profile={profile} onSaved={onSaved} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup Wizard (multi-step create form)
// FIX: All time inputs here also use normalizeTime before sending to API.
// ─────────────────────────────────────────────────────────────────────────────
function SetupWizard({
  workingHoursData,
  onSuccess,
}: {
  workingHoursData: WorkingHourRecord[];
  onSuccess: () => void;
}) {
  const createOrUpdate = useCreateOrUpdateProfile();
  const setWorkingHours = useSetWorkingHours();

  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const currentIdx = SECTIONS.findIndex((s) => s.id === activeSection);
  const isLast = currentIdx === SECTIONS.length - 1;

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PharmacyProfileFormData>({
    defaultValues: {
      is_open_24h: false,
      offers_delivery: true,
      offers_pickup: true,
      delivery_currency: "RWF",
      working_hours: DEFAULT_WORKING_HOURS,
      social_links: DEFAULT_SOCIAL_LINKS,
    },
  });

  const is24h = watch("is_open_24h");
  const offersDelivery = watch("offers_delivery");
  const workingHours = watch("working_hours");
  const socialLinks = watch("social_links");

  const goTo = (id: SectionId) => {
    const idx = SECTIONS.findIndex((s) => s.id === id);
    setVisited((v) => new Set([...v, idx]));
    setActiveSection(id);
  };

  const goNext = async () => {
    if (activeSection === "general") {
      const valid = await trigger(["name_en", "registration_number"]);
      if (!valid) return;
    }
    if (isLast) {
      handleSubmit(onFinalSubmit)();
      return;
    }
    goTo(SECTIONS[currentIdx + 1].id);
  };

  const onFinalSubmit = async (data: PharmacyProfileFormData) => {
    try {
      await createOrUpdate.mutateAsync({
        name_en: data.name_en,
        name_fr: data.name_fr,
        description_en: data.description_en,
        registration_number: data.registration_number,
        address: data.address,
        city: data.city,
        province: data.province,
        country: data.country,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
        phone: data.phone,
        email: data.email,
        website: data.social_links.website || undefined,
        is_open_24h: data.is_open_24h,
        opens_at: data.is_open_24h ? undefined : normalizeTime(data.opens_at),
        closes_at: data.is_open_24h ? undefined : normalizeTime(data.closes_at),
        offers_delivery: data.offers_delivery,
        offers_pickup: data.offers_pickup,
        delivery_fee: data.delivery_fee
          ? parseFloat(data.delivery_fee)
          : undefined,
        delivery_currency: data.delivery_currency,
        delivery_radius_km: data.delivery_radius_km
          ? parseFloat(data.delivery_radius_km)
          : undefined,
        estimated_delivery_minutes: data.estimated_delivery_minutes
          ? parseFloat(data.estimated_delivery_minutes)
          : undefined,
      });

      const hoursPayload: WorkingHourPayload[] = DAYS_OF_WEEK.map((day) => ({
        day_of_week: day,
        // FIX: normalise working hours before sending
        open_time: data.working_hours[day].enabled
          ? normalizeTime(data.working_hours[day].opens_at)
          : null,
        close_time: data.working_hours[day].enabled
          ? normalizeTime(data.working_hours[day].closes_at)
          : null,
        is_closed: !data.working_hours[day].enabled,
      }));
      await setWorkingHours.mutateAsync(hoursPayload);

      toast.success("Profile created! Awaiting admin approval.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    }
  };

  const isPending = createOrUpdate.isPending || setWorkingHours.isPending;
  const section = SECTIONS[currentIdx];

  const timeInputClass =
    "w-full h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary [color-scheme:dark] disabled:opacity-40 transition-all [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer";

  return (
    <div className="flex flex-col sm:flex-row flex-1 min-h-0">
      <Sidebar
        activeSection={activeSection}
        onSelect={goTo}
        mode="setup"
        profile={null}
        visitedSteps={visited}
      />

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 px-5 pt-4 pb-3.5 border-b border-border">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary-foreground">
              {currentIdx + 1}
            </span>
          </div>
          <span className="text-sm font-bold text-foreground">
            {section.label}
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground font-medium">
            Step {currentIdx + 1} of {SECTIONS.length}
          </span>
        </div>

        <div key={activeSection} className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeSection === "general" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Name (English) *"
                error={errors.name_en?.message}
              >
                <Input
                  {...register("name_en", { required: "Required" })}
                  placeholder="MediPharm Kigali"
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField label="Name (French)">
                <Input
                  {...register("name_fr")}
                  placeholder="MediPharmacie Kigali"
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField
                label="Registration Number *"
                error={errors.registration_number?.message}
                className="col-span-1 sm:col-span-2"
              >
                <Input
                  {...register("registration_number", { required: "Required" })}
                  placeholder="RW-PHARM-2024-001"
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField
                label="Description"
                className="col-span-1 sm:col-span-2"
              >
                <Input
                  {...register("description_en")}
                  placeholder="Your trusted neighborhood pharmacy…"
                  className="h-9 text-xs"
                />
              </FormField>
            </div>
          )}

          {activeSection === "location" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Street Address *"
                error={errors.address?.message}
                className="col-span-1 sm:col-span-2"
              >
                <Input
                  {...register("address", { required: "Required" })}
                  placeholder="KN 5 Rd, Nyarugenge"
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField label="City *" error={errors.city?.message}>
                <Input
                  {...register("city", { required: "Required" })}
                  placeholder="Kigali"
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField label="Province">
                <Input
                  {...register("province")}
                  placeholder="Kigali City"
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField
                label="Country *"
                error={errors.country?.message}
                className="col-span-1 sm:col-span-2"
              >
                <Input
                  {...register("country", { required: "Required" })}
                  placeholder="Rwanda"
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField label="Latitude">
                <Input
                  {...register("latitude")}
                  placeholder="-1.9441"
                  className="h-9 text-xs font-mono"
                />
              </FormField>
              <FormField label="Longitude">
                <Input
                  {...register("longitude")}
                  placeholder="30.0619"
                  className="h-9 text-xs font-mono"
                />
              </FormField>
            </div>
          )}

          {activeSection === "contact" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Phone Number *"
                error={errors.phone?.message}
                className="col-span-1 sm:col-span-2"
              >
                <Input
                  type="tel"
                  {...register("phone", { required: "Required" })}
                  placeholder="+250788000200"
                  className="h-9 text-xs"
                />
              </FormField>
              <FormField
                label="Email Address *"
                error={errors.email?.message}
                className="col-span-1 sm:col-span-2"
              >
                <Input
                  type="email"
                  {...register("email", {
                    required: "Required",
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: "Invalid email",
                    },
                  })}
                  placeholder="info@medipharm.rw"
                  className="h-9 text-xs"
                />
              </FormField>
            </div>
          )}

          {activeSection === "hours" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold">Open 24 hours</p>
                  <p className="text-[10px] text-muted-foreground">
                    Overrides open/close times
                  </p>
                </div>
                <Switch
                  checked={is24h}
                  onCheckedChange={(v) => setValue("is_open_24h", v)}
                />
              </div>
              <FormField label="Opens At">
                <input
                  type="time"
                  disabled={is24h}
                  {...register("opens_at")}
                  className={timeInputClass}
                />
              </FormField>
              <FormField label="Closes At">
                <input
                  type="time"
                  disabled={is24h}
                  {...register("closes_at")}
                  className={timeInputClass}
                />
              </FormField>
              <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-3">
                {(["offers_delivery", "offers_pickup"] as const).map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3"
                  >
                    <p className="text-xs font-semibold capitalize">
                      {key.replace("offers_", "Offers ")}
                    </p>
                    <Switch
                      checked={watch(key)}
                      onCheckedChange={(v) => setValue(key, v)}
                    />
                  </div>
                ))}
              </div>
              {offersDelivery && (
                <>
                  <FormField label="Delivery Fee (RWF)">
                    <Input
                      type="number"
                      {...register("delivery_fee")}
                      placeholder="2000"
                      className="h-9 text-xs"
                    />
                  </FormField>
                  <FormField label="Radius (km)">
                    <Input
                      type="number"
                      {...register("delivery_radius_km")}
                      placeholder="10"
                      className="h-9 text-xs"
                    />
                  </FormField>
                  <FormField
                    label="Est. Delivery Time (min)"
                    className="col-span-1 sm:col-span-2"
                  >
                    <Input
                      type="number"
                      {...register("estimated_delivery_minutes")}
                      placeholder="45"
                      className="h-9 text-xs"
                    />
                  </FormField>
                </>
              )}
            </div>
          )}

          {activeSection === "working_hours" && (
            <div className="space-y-2">
              <WorkingHoursGrid
                value={workingHours ?? DEFAULT_WORKING_HOURS}
                onChange={(v) => setValue("working_hours", v)}
              />
              <p className="text-[10px] text-muted-foreground pt-2">
                Use "↓ All" to copy a day's hours across the full week.
              </p>
            </div>
          )}

          {activeSection === "social_links" && (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                All fields are optional.
              </p>
              {SOCIAL_PLATFORMS.map(
                ({ key, label, icon: Icon, placeholder }) => (
                  <FormField key={key} label={label}>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        {...register(`social_links.${key}` as any)}
                        placeholder={placeholder}
                        type="url"
                        className="flex-1 h-9 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                      />
                    </div>
                  </FormField>
                ),
              )}
            </div>
          )}
        </div>

        {/* Wizard footer */}
        <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-t border-border">
          <Button
            variant="outline"
            onClick={() => {
              if (currentIdx > 0) goTo(SECTIONS[currentIdx - 1].id);
            }}
            disabled={currentIdx === 0}
            className="text-xs h-9 px-4"
          >
            ← Back
          </Button>
          <div className="flex items-center gap-1.5">
            {SECTIONS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === currentIdx
                    ? "w-4 h-1.5 bg-primary"
                    : visited.has(i)
                      ? "w-1.5 h-1.5 bg-primary/40"
                      : "w-1.5 h-1.5 bg-muted-foreground/25",
                )}
              />
            ))}
          </div>
          <Button
            onClick={goNext}
            disabled={isPending}
            className="text-xs h-9 px-5 bg-primary text-primary-foreground gap-1.5 shadow-sm shadow-primary/30"
          >
            {isPending && <RefreshCw size={11} className="animate-spin" />}
            {isLast ? "Create profile" : "Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Page
// ─────────────────────────────────────────────────────────────────────────────
type PageMode = "setup" | "view";

const PharmacyProfile = () => {
  const { t, i18n } = useTranslation();
  const {
    data: profile,
    isLoading: profileLoading,
    refetch,
  } = useGetPharmacyProfile();
  const { data: workingHours = [], isLoading: hoursLoading } =
    useGetWorkingHours();
  const { data: closures = [] } = useGetClosures();

  const [pageMode, setPageMode] = useState<PageMode>("view");
  const [activeSection, setActiveSection] = useState<SectionId>("general");

  const hasProfile = !!profile;
  const isLoading = profileLoading || hoursLoading;

  useEffect(() => {
    if (!profileLoading && !hasProfile) setPageMode("setup");
    if (!profileLoading && hasProfile) setPageMode("view");
  }, [profileLoading, hasProfile]);

  const handleSetupSuccess = () => {
    refetch();
    setPageMode("view");
    setActiveSection("general");
  };

  const stats = profile
    ? {
        city: profile.city,
        status:
          profile.status.charAt(0).toUpperCase() + profile.status.slice(1),
        hours: profile.is_open_24h
          ? "24h"
          : `${formatTime(profile.opens_at)} – ${formatTime(profile.closes_at)}`,
        delivery: profile.offers_delivery
          ? formatDeliveryFee(profile.delivery_fee, profile.delivery_currency)
          : "None",
        radius: profile.offers_delivery
          ? `${profile.delivery_radius_km} km`
          : "—",
        eta: profile.offers_delivery
          ? `${profile.estimated_delivery_minutes} min`
          : "—",
      }
    : null;

  return (
    <DashboardLayout role="pharmacy">
      <PageHeader
        title={t("pages.pharmacy.profile_title")}
        subtitle={
          pageMode === "setup"
            ? "Fill in the details below to get started"
            : t("pages.pharmacy.profile_sub")
        }
      />

      <div className="px-3 py-4 sm:px-6 sm:py-8 space-y-4 sm:space-y-5">
        {/* Profile hero — cover photo + logo, always visible in view mode */}
        {profile && pageMode === "view" && <ProfileHero profile={profile} />}

        {/* Stats bar */}
        {stats && pageMode === "view" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <StatCard label="City" value={stats.city} />
            <StatCard
              label="Status"
              value={stats.status}
              accent={profile?.status === "approved"}
            />
            <StatCard label="Hours" value={stats.hours} />
            <StatCard label="Delivery fee" value={stats.delivery} accent />
            <StatCard label="Radius" value={stats.radius} sub="km coverage" />
            <StatCard label="Est. time" value={stats.eta} sub="delivery ETA" />
          </div>
        )}

        {/* Main card */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card overflow-hidden shadow-sm",
            "flex flex-col sm:flex-row min-h-[600px]",
          )}
        >
          {isLoading ? (
            <div className="flex flex-col sm:flex-row flex-1">
              <div className="w-full sm:w-60 border-b sm:border-b-0 sm:border-r border-border bg-card/50 p-3 space-y-2">
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-11 rounded-lg" />
                  ))}
              </div>
              <ProfileSkeleton />
            </div>
          ) : pageMode === "setup" ? (
            <SetupWizard
              workingHoursData={workingHours}
              onSuccess={handleSetupSuccess}
            />
          ) : profile ? (
            <div className="flex flex-col sm:flex-row flex-1 min-h-0">
              <Sidebar
                activeSection={activeSection}
                onSelect={setActiveSection}
                mode="view"
                profile={profile}
                onCreateNew={() => setPageMode("setup")}
              />
              <SectionRouter
                activeSection={activeSection}
                profile={profile}
                workingHours={workingHours}
                closures={closures}
                onSaved={refetch}
              />
            </div>
          ) : (
            <EmptyState onCreate={() => setPageMode("setup")} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyProfile;
