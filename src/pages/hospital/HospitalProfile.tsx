
import {
  useGetHospitalProfile,
  useUpsertHospitalProfile,
  useUploadLogo,
  useUploadCoverImage,
  useGetHospitalImages,
  useUploadHospitalImages,
  useDeleteHospitalImage,
  useDeleteHospitalImagesBulk,
  type HospitalImage,
  type UpsertProfilePayload,
} from "@/hooks/hospital/use-hospital-profile";
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Clock,
  Mail,
  Plus,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  User,
  Pill,
  Send,
  Smartphone,
  Link2,
  Images,
  Upload,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
} from "lucide-react";
import { usePrescriptions, type RxStatus } from "@/lib/prescription-store";
import { cn } from "@/lib/utils";


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface HospitalData {
  name_en: string;
  name_fr: string;
  name_kiny: string;
  description_en: string;
  type: string;
  registration_number: string;
  address: string;
  city: string;
  province: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  website: string;
  opens_at: string;
  closes_at: string;
  is_open_24h: boolean;
}

interface SocialLinksInfo {
  linkedin: string;
  twitter: string;
  facebook: string;
  instagram: string;
  youtube: string;
  whatsapp: string;
  tiktok: string;
  website: string;
}

// Local gallery image used only while staging uploads (before they hit the API)
export interface GalleryImageLocal {
  id: string; // temp local id — negative or prefixed
  dataUrl: string;
  caption: string;
  file: File;
  uploadedAt: string;
}

// Adapter so GalleryView/Lightbox can work with both local & remote images
export interface GalleryImageDisplay {
  id: string;
  src: string;
  caption: string;
  uploadedAt: string;
}

interface HospitalFormData {
  hospital: HospitalData;
  linksSection: SocialLinksInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const HOSPITAL_TYPES = ["hospital", "clinic", "health_center", "dispensary"];

const SOCIAL_PLATFORMS: Array<{
  key: keyof SocialLinksInfo;
  label: string;
  placeholder: string;
}> = [
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/your-hospital",
  },
  {
    key: "twitter",
    label: "X / Twitter",
    placeholder: "https://x.com/your-handle",
  },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/your-page",
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/your-handle",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@your-channel",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    placeholder: "https://wa.me/250788000001",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@your-handle",
  },
  {
    key: "website",
    label: "Official website",
    placeholder: "https://yourhospital.rw",
  },
];

const DEFAULT_SOCIAL_LINKS: SocialLinksInfo = {
  linkedin: "",
  twitter: "",
  facebook: "",
  instagram: "",
  youtube: "",
  whatsapp: "",
  tiktok: "",
  website: "",
};

const STEPS = [
  {
    id: "identity" as const,
    label: "Identity",
    icon: Building2,
    sectionTitle: "Hospital identity",
    description: "Names, type & registration",
    fields: [
      "name_en",
      "name_fr",
      "name_kiny",
      "description_en",
      "type",
      "registration_number",
    ] as (keyof HospitalData)[],
  },
  {
    id: "location" as const,
    label: "Location",
    icon: MapPin,
    sectionTitle: "Location & address",
    description: "Address, city, province & coordinates",
    fields: [
      "address",
      "city",
      "province",
      "country",
      "latitude",
      "longitude",
    ] as (keyof HospitalData)[],
  },
  {
    id: "contact" as const,
    label: "Contact",
    icon: Phone,
    sectionTitle: "Contact information",
    description: "Phone, email & website",
    fields: ["phone", "email", "website"] as (keyof HospitalData)[],
  },
  {
    id: "hours" as const,
    label: "Hours",
    icon: Clock,
    sectionTitle: "Operating hours",
    description: "Opening hours & availability",
    fields: ["opens_at", "closes_at", "is_open_24h"] as (keyof HospitalData)[],
  },
  {
    id: "linksSection" as const,
    label: "Social Links",
    icon: Link2,
    sectionTitle: "Social & online presence",
    description: "Facebook, LinkedIn, WhatsApp & more",
    fields: [] as (keyof HospitalData)[],
  },
  {
    id: "gallery" as const,
    label: "Gallery",
    icon: Images,
    sectionTitle: "Photo gallery",
    description: "Facility photos & images",
    fields: [] as (keyof HospitalData)[],
  },
];

const channelIcon = { app: User, email: Mail, sms: Smartphone } as const;
const HOSPITAL_CONST = "King Faisal Hospital";
const MAX_GALLERY_IMAGES = 10; // API limit

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function isOpenNow(opens: string, closes: string, open24h: boolean): boolean {
  if (open24h) return true;
  if (!opens || !closes) return false;
  const now = new Date();
  const [oh, om] = opens.split(":").map(Number);
  const [ch, cm] = closes.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= oh * 60 + om && nowMin < ch * 60 + cm;
}

const humanType = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Convert API social_links object → SocialLinksInfo shape */
function normaliseSocialLinks(raw: Record<string, string> | null): SocialLinksInfo {
  return { ...DEFAULT_SOCIAL_LINKS, ...(raw ?? {}) };
}

/** Filter out empty values so we don't send nulls to the API */
function buildSocialLinksPayload(
  links: SocialLinksInfo,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(links).filter(([, v]) => v && v.trim() !== ""),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components (unchanged from original)
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
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
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
    <div className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
        {label}
      </span>
      <span
        className={cn(
          "text-[12px] font-semibold tabular-nums truncate",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SocialLinksStep
// ─────────────────────────────────────────────────────────────────────────────
function SocialLinksStep({
  data,
  onChange,
}: {
  data: SocialLinksInfo;
  onChange: (v: SocialLinksInfo) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
        Add your hospital's social media and online profiles. All fields are
        optional.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
          <FormField key={key} label={label}>
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                value={data[key]}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                placeholder={placeholder}
                className="border-border focus-visible:ring-primary text-xs h-9"
                type="url"
              />
            </div>
          </FormField>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GalleryStep — manages staged (local) images + existing remote images
// On submit, uploads staged files; on remove, deletes via API if remote
// ─────────────────────────────────────────────────────────────────────────────
function GalleryStep({
  remoteImages,
  stagedImages,
  onStagedChange,
  onRemoteDelete,
  uploading,
}: {
  remoteImages: HospitalImage[];
  stagedImages: GalleryImageLocal[];
  onStagedChange: (imgs: GalleryImageLocal[]) => void;
  onRemoteDelete: (id: number) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);

  const totalCount = remoteImages.length + stagedImages.length;
  const canAddMore = totalCount < MAX_GALLERY_IMAGES;

  const processFiles = async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_GALLERY_IMAGES - totalCount;
    const toProcess = Array.from(files).slice(0, remaining);
    const newImgs: GalleryImageLocal[] = await Promise.all(
      toProcess.map(async (file) => ({
        id: `staged-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        dataUrl: await readFileAsDataUrl(file),
        caption: file.name.replace(/\.[^.]+$/, ""),
        file,
        uploadedAt: new Date().toLocaleDateString(),
      })),
    );
    onStagedChange([...stagedImages, ...newImgs]);
  };

  const removeStaged = (id: string) =>
    onStagedChange(stagedImages.filter((img) => img.id !== id));

  const updateStagedCaption = (id: string, caption: string) =>
    onStagedChange(
      stagedImages.map((img) => (img.id === id ? { ...img, caption } : img)),
    );

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground -mt-1">
        Upload up to {MAX_GALLERY_IMAGES} photos of your facility — wards,
        reception, equipment, etc.
      </p>

      {/* Drop zone */}
      {canAddMore && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragging(false);
            await processFiles(e.dataTransfer.files);
          }}
          className={cn(
            "w-full rounded-lg border-2 border-dashed transition-all duration-200 py-8 flex flex-col items-center gap-2 cursor-pointer",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50",
          )}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              dragging
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Upload className="h-4 w-4" />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-foreground">
              {dragging ? "Drop images here" : "Click or drag & drop"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              PNG, JPG, WEBP up to 5 MB each · {totalCount}/{MAX_GALLERY_IMAGES}{" "}
              uploaded
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => processFiles(e.target.files)}
          />
        </button>
      )}

      {/* Thumbnail grid — remote images first, then staged */}
      {(remoteImages.length > 0 || stagedImages.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Remote (already uploaded) */}
          {remoteImages.map((img, idx) => (
            <div
              key={`remote-${img.id}`}
              className="group relative rounded-md overflow-hidden border border-border bg-muted aspect-video"
            >
              <img
                src={img.image_url}
                alt={img.caption}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex flex-col justify-between p-1.5">
                <button
                  type="button"
                  onClick={() => onRemoteDelete(img.id)}
                  disabled={uploading}
                  className="self-end opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-destructive/90 text-white flex items-center justify-center disabled:opacity-50"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="w-full text-left text-[10px] text-white/80 truncate">
                    {img.caption || "No caption"}
                  </p>
                </div>
              </div>
              <span className="absolute top-1 left-1 text-[9px] font-bold tabular-nums bg-black/50 text-white rounded px-1 py-0.5 leading-none">
                {idx + 1}
              </span>
              <span className="absolute bottom-1 right-1 text-[8px] bg-emerald-500/80 text-white rounded px-1 py-0.5 leading-none">
                saved
              </span>
            </div>
          ))}

          {/* Staged (pending upload) */}
          {stagedImages.map((img, idx) => (
            <div
              key={img.id}
              className="group relative rounded-md overflow-hidden border border-primary/40 bg-muted aspect-video"
            >
              <img
                src={img.dataUrl}
                alt={img.caption}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex flex-col justify-between p-1.5">
                <button
                  type="button"
                  onClick={() => removeStaged(img.id)}
                  className="self-end opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-destructive/90 text-white flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingCaption === img.id ? (
                    <input
                      autoFocus
                      value={img.caption}
                      onChange={(e) =>
                        updateStagedCaption(img.id, e.target.value)
                      }
                      onBlur={() => setEditingCaption(null)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && setEditingCaption(null)
                      }
                      className="w-full text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5 outline-none border-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingCaption(img.id)}
                      className="w-full text-left text-[10px] text-white/80 truncate hover:text-white transition-colors"
                    >
                      {img.caption || "Add caption…"}
                    </button>
                  )}
                </div>
              </div>
              <span className="absolute top-1 left-1 text-[9px] font-bold tabular-nums bg-black/50 text-white rounded px-1 py-0.5 leading-none">
                {remoteImages.length + idx + 1}
              </span>
              <span className="absolute bottom-1 right-1 text-[8px] bg-amber-500/80 text-white rounded px-1 py-0.5 leading-none">
                pending
              </span>
            </div>
          ))}
        </div>
      )}

      {remoteImages.length === 0 && stagedImages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 gap-1.5 rounded-md border border-dashed border-border text-center">
          <ImageOff className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-[11px] text-muted-foreground">
            No images uploaded yet
          </p>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-[11px] text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Uploading images…
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gallery Lightbox
// ─────────────────────────────────────────────────────────────────────────────
function GalleryLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: GalleryImageDisplay[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(initialIndex);

  const prev = () =>
    setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const img = images[current];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
      >
        <X className="h-4 w-4" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-2 sm:left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-2 sm:right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        className="max-w-3xl w-full mx-6 sm:mx-16 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={img.src}
          alt={img.caption}
          className="w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
        />
        <div className="flex items-center justify-between px-1">
          <div>
            {img.caption && (
              <p className="text-sm font-medium text-white">{img.caption}</p>
            )}
            <p className="text-[11px] text-white/50 mt-0.5">
              Uploaded {img.uploadedAt}
            </p>
          </div>
          <span className="text-[11px] text-white/40 tabular-nums">
            {current + 1} / {images.length}
          </span>
        </div>

        {images.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 justify-center">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setCurrent(i)}
                className={cn(
                  "w-10 h-10 rounded shrink-0 overflow-hidden border-2 transition-all",
                  i === current
                    ? "border-white scale-105"
                    : "border-white/20 opacity-60 hover:opacity-90",
                )}
              >
                <img
                  src={img.src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GalleryView — shown in the profile view, reads from API images
// ─────────────────────────────────────────────────────────────────────────────
function GalleryView({
  images,
  onEdit,
}: {
  images: GalleryImageDisplay[];
  onEdit?: () => void;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Images size={15} className="text-primary" />
          Photo gallery
          {images.length > 0 && (
            <span className="text-[10px] font-normal text-muted-foreground">
              ({images.length} photo{images.length !== 1 ? "s" : ""})
            </span>
          )}
        </h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            <Pencil className="h-2.5 w-2.5" /> Manage
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-md border border-dashed border-border text-center">
          <ImageOff className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No photos added yet.</p>
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-[11px] text-primary hover:underline mt-0.5"
            >
              Add photos
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {images[0] && (
              <button
                onClick={() => setLightboxIndex(0)}
                className="col-span-2 row-span-2 relative group rounded-md overflow-hidden aspect-video"
              >
                <img
                  src={images[0].src}
                  alt={images[0].caption}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {images[0].caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-white font-medium truncate">
                      {images[0].caption}
                    </p>
                  </div>
                )}
              </button>
            )}

            {images.slice(1, 5).map((img, i) => {
              const realIdx = i + 1;
              const isLast = realIdx === 4 && images.length > 5;
              return (
                <button
                  key={img.id}
                  onClick={() => setLightboxIndex(realIdx)}
                  className="relative group rounded-md overflow-hidden aspect-square"
                >
                  <img
                    src={img.src}
                    alt={img.caption}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isLast ? (
                    <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-0.5">
                      <span className="text-lg font-bold text-white tabular-nums">
                        +{images.length - 4}
                      </span>
                      <span className="text-[10px] text-white/70">more</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {images.length > 5 && (
            <button
              onClick={() => setLightboxIndex(0)}
              className="w-full text-[11px] text-primary hover:underline text-center py-1"
            >
              View all {images.length} photos
            </button>
          )}
        </>
      )}

      {lightboxIndex !== null && (
        <GalleryLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function UnifiedSidebar({
  currentStep,
  visited,
  onSelect,
  mode,
  hospitalName,
  hospitalType,
  hospitalCity,
  hospitalReg,
  onEdit,
  onDelete,
}: {
  currentStep: number;
  visited: Set<number>;
  onSelect: (i: number) => void;
  mode: "create" | "edit" | "view";
  hospitalName?: string;
  hospitalType?: string;
  hospitalCity?: string;
  hospitalReg?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isForm = mode === "create" || mode === "edit";
  const visitedCount = visited.size;
  const pct = Math.round((visitedCount / STEPS.length) * 100);

  return (
    <div className="w-full sm:w-56 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        {isForm ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Profile setup
              </span>
              <span className="text-[11px] font-bold text-primary tabular-nums">
                {pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {visitedCount} of {STEPS.length} sections visited
            </p>
          </div>
        ) : hospitalName ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {hospitalName}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                  {hospitalReg}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: "Type", value: humanType(hospitalType ?? "") },
                { label: "City", value: hospitalCity ?? "" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-[10px] font-medium text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden overflow-y-hidden sm:overflow-y-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep && isForm;
          const isDone = visited.has(i) && (!isForm || i !== currentStep);

          return (
            <button
              key={step.id}
              onClick={() => (isForm ? onSelect(i) : undefined)}
              disabled={!isForm}
              className={cn(
                "flex shrink-0 sm:shrink sm:w-full items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-md text-left transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isForm
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    : "text-muted-foreground cursor-default",
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold border transition-all",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-muted border-border text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>

              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-xs font-medium leading-tight truncate",
                      isActive ? "text-primary" : "",
                    )}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary shrink-0">
                      editing
                    </span>
                  )}
                  {isDone && isForm && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">
                      done
                    </span>
                  )}
                </div>
                <p className="hidden sm:block text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                  {step.description}
                </p>
                {isForm && (
                  <div className="hidden sm:block h-0.5 rounded-full bg-muted overflow-hidden mt-1.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isActive
                          ? "bg-primary w-1/2"
                          : isDone
                            ? "bg-primary w-full"
                            : "bg-transparent w-0",
                      )}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!isForm && hospitalName && (
        <div className="p-2 sm:p-3 border-t border-border flex flex-row sm:flex-col gap-2">
          <Button
            onClick={onEdit}
            className="flex-1 sm:w-full text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-8"
          >
            <Pencil size={12} /> Edit profile
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="flex-1 sm:w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 h-8"
          >
            <Trash2 size={12} /> Delete profile
          </Button>
        </div>
      )}

      {isForm && (
        <div className="hidden sm:block px-3.5 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {mode === "edit"
              ? "Click any section to jump directly"
              : "Jump between sections freely — no order needed"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-step Hospital Form
// ─────────────────────────────────────────────────────────────────────────────
function HospitalForm({
  mode,
  defaultValues,
  remoteImages,
  onSubmit,
  onCancel,
  currentStep,
  onStepChange,
  visited,
  onVisitedChange,
  submitting,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<HospitalFormData>;
  remoteImages: HospitalImage[];
  onSubmit: (data: HospitalFormData, staged: GalleryImageLocal[]) => void;
  onCancel: () => void;
  currentStep: number;
  onStepChange: (i: number) => void;
  visited: Set<number>;
  onVisitedChange: (v: Set<number>) => void;
  submitting: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [open24h, setOpen24h] = useState(
    defaultValues?.hospital?.is_open_24h ?? false,
  );
  const [linksSection, setLinksSection] = useState<SocialLinksInfo>(
    defaultValues?.linksSection ?? DEFAULT_SOCIAL_LINKS,
  );
  const [stagedImages, setStagedImages] = useState<GalleryImageLocal[]>([]);

  const deleteImageMutation = useDeleteHospitalImage();

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<HospitalData>({ defaultValues: defaultValues?.hospital });

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isEdit = mode === "edit";

  const goTo = (i: number) => {
    const next = new Set([...visited, i]);
    onVisitedChange(next);
    onStepChange(i);
  };

  const goNext = async () => {
    if (step.id !== "linksSection" && step.id !== "gallery") {
      const valid = await trigger(step.fields);
      if (!valid) return;
    }
    if (isLast) {
      handleSubmit((hospital) => {
        onSubmit({ hospital, linksSection }, stagedImages);
      })();
      return;
    }
    goTo(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep === 0) {
      onCancel();
      return;
    }
    goTo(currentStep - 1);
  };

  const handleRemoteDelete = (id: number) => {
    deleteImageMutation.mutate(id);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {step.sectionTitle}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
      </div>

      <div key={currentStep} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* ── Step 1: Identity ── */}
        {step.id === "identity" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={t("hospital.field.name_en", "Name (English)")}
              error={errors.name_en?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("name_en", { required: "Required" })}
                placeholder="King Faisal Hospital"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.name_fr", "Name (French)")}
              error={errors.name_fr?.message}
            >
              <Input
                {...register("name_fr")}
                placeholder="Hôpital King Faisal"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.name_kiny", "Name (Kinyarwanda)")}
              error={errors.name_kiny?.message}
            >
              <Input
                {...register("name_kiny")}
                placeholder="Ibitaro bya King Faisal"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.description", "Description")}
              error={errors.description_en?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("description_en")}
                placeholder="Leading referral hospital in Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.type", "Type")}
              error={errors.type?.message}
            >
              <Select
                defaultValue={defaultValues?.hospital?.type}
                onValueChange={(v) => setValue("type", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {HOSPITAL_TYPES.map((ht) => (
                    <SelectItem key={ht} value={ht}>
                      {humanType(ht)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label={t("hospital.field.reg_number", "Registration Number")}
              error={errors.registration_number?.message}
            >
              <Input
                {...register("registration_number")}
                placeholder="RW-HOSP-2024-001"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 2: Location ── */}
        {step.id === "location" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={t("hospital.field.address", "Street address")}
              error={errors.address?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("address")}
                placeholder="KG 544 St"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.city", "City")}
              error={errors.city?.message}
            >
              <Input
                {...register("city")}
                placeholder="Kigali"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.province", "Province")}
              error={errors.province?.message}
            >
              <Input
                {...register("province")}
                placeholder="Kigali City"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.country", "Country")}
              error={errors.country?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                {...register("country")}
                placeholder="Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.latitude", "Latitude")}
              error={errors.latitude?.message}
            >
              <Input
                {...register("latitude", {
                  pattern: { value: /^-?\d+(\.\d+)?$/, message: "Invalid" },
                })}
                placeholder="-1.9441"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.longitude", "Longitude")}
              error={errors.longitude?.message}
            >
              <Input
                {...register("longitude", {
                  pattern: { value: /^-?\d+(\.\d+)?$/, message: "Invalid" },
                })}
                placeholder="30.0619"
                className="border-border focus-visible:ring-primary font-mono text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 3: Contact ── */}
        {step.id === "contact" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={t("hospital.field.phone", "Phone number")}
              error={errors.phone?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                type="tel"
                {...register("phone")}
                placeholder="+250788000001"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.email", "Email address")}
              error={errors.email?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                type="email"
                {...register("email", {
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email",
                  },
                })}
                placeholder="info@kingfaisal.rw"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("hospital.field.website", "Website")}
              error={errors.website?.message}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                type="url"
                {...register("website")}
                placeholder="https://kingfaisal.rw"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 4: Hours ── */}
        {step.id === "hours" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-foreground">
                  {t("hospital.field.open_24h", "Open 24 hours")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Overrides opening & closing times
                </p>
              </div>
              <Switch
                checked={open24h}
                onCheckedChange={(v) => {
                  setOpen24h(v);
                  setValue("is_open_24h", v);
                }}
              />
            </div>

            <FormField
              label={t("hospital.field.opens_at", "Opens at")}
              error={errors.opens_at?.message}
            >
              <Input
                type="time"
                {...register("opens_at")}
                disabled={open24h}
                className="border-border focus-visible:ring-primary text-xs h-9 disabled:opacity-40"
              />
            </FormField>

            <FormField
              label={t("hospital.field.closes_at", "Closes at")}
              error={errors.closes_at?.message}
            >
              <Input
                type="time"
                {...register("closes_at")}
                disabled={open24h}
                className="border-border focus-visible:ring-primary text-xs h-9 disabled:opacity-40"
              />
            </FormField>

            {open24h && (
              <div className="col-span-1 sm:col-span-2 flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-[11px] text-primary">
                  This facility is available around the clock.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Social Links ── */}
        {step.id === "linksSection" && (
          <SocialLinksStep data={linksSection} onChange={setLinksSection} />
        )}

        {/* ── Step 6: Gallery ── */}
        {step.id === "gallery" && (
          <GalleryStep
            remoteImages={remoteImages}
            stagedImages={stagedImages}
            onStagedChange={setStagedImages}
            onRemoteDelete={handleRemoteDelete}
            uploading={submitting}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={submitting}
          className="border-border text-xs"
        >
          {currentStep === 0 ? "Cancel" : "← Back"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
        <Button
          onClick={goNext}
          disabled={submitting}
          className="text-primary-foreground text-xs bg-primary hover:bg-primary/90"
        >
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Saving…
            </>
          ) : isLast ? (
            isEdit ? "Save changes" : "Create profile"
          ) : (
            "Next →"
          )}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View field helper
// ─────────────────────────────────────────────────────────────────────────────
function ViewField({
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
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium text-foreground",
          mono && "font-mono",
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prescription status styles
// ─────────────────────────────────────────────────────────────────────────────
const statusStyle = {
  pending: {
    badge:
      "border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  active: {
    badge:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  dispensed: {
    badge: "border-blue-400/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  expired: {
    badge: "border-rose-400/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  cancelled: { badge: "border-border bg-muted text-muted-foreground" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab header helper — section title + edit button
// ─────────────────────────────────────────────────────────────────────────────
function TabSectionHeader({
  icon: Icon,
  title,
  onEdit,
  editLabel = "Edit",
}: {
  icon: React.ElementType;
  title: string;
  onEdit: () => void;
  editLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Icon size={15} className="text-primary" />
        {title}
      </h3>
      <button
        onClick={onEdit}
        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors border border-primary/25 bg-primary/5 hover:bg-primary/10 rounded-md px-2.5 py-1"
      >
        <Pencil className="h-2.5 w-2.5" />
        {editLabel}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View tab definitions (mirrors STEPS order)
// ─────────────────────────────────────────────────────────────────────────────
const VIEW_TABS = [
  { id: "identity",     label: "Identity",     icon: Building2, stepIndex: 0 },
  { id: "location",     label: "Location",     icon: MapPin,    stepIndex: 1 },
  { id: "contact",      label: "Contact",      icon: Phone,     stepIndex: 2 },
  { id: "hours",        label: "Hours",        icon: Clock,     stepIndex: 3 },
  { id: "social",       label: "Social",       icon: Link2,     stepIndex: 4 },
  { id: "gallery",      label: "Gallery",      icon: Images,    stepIndex: 5 },
  { id: "prescriptions",label: "Prescriptions",icon: Pill,      stepIndex: -1 },
] as const;

type ViewTabId = (typeof VIEW_TABS)[number]["id"];

// ─────────────────────────────────────────────────────────────────────────────
// Hospital Profile View  — tabbed layout
// ─────────────────────────────────────────────────────────────────────────────
function HospitalProfileView({
  hospital,
  galleryImages,
  rxList,
  onNewRx,
  onEditStep,
}: {
  hospital: HospitalProfileResponse["hospital"];
  galleryImages: GalleryImageDisplay[];
  rxList: ReturnType<typeof usePrescriptions>;
  onNewRx: () => void;
  onEditStep: (stepIndex: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<ViewTabId>("identity");

  const socialLinks = normaliseSocialLinks(hospital.social_links);
  const currentlyOpen = isOpenNow(
    hospital.opens_at,
    hospital.closes_at,
    hospital.is_open_24h,
  );
  const socialLinksCount = Object.values(socialLinks).filter(Boolean).length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Tab bar ── */}
      <div className="flex items-center gap-0.5 px-3 sm:px-4 pt-3 border-b border-border overflow-x-auto">
        {VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all duration-150 shrink-0",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">

        {/* ── Identity tab ── */}
        {activeTab === "identity" && (
          <div>
            <TabSectionHeader
              icon={Building2}
              title="Hospital identity"
              onEdit={() => onEditStep(0)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <ViewField label="Name (EN)" value={hospital.name_en} />
              <ViewField label="Name (FR)" value={hospital.name_fr} />
              <ViewField label="Kinyarwanda" value={hospital.name_kiny} />
              <ViewField label="Type" value={humanType(hospital.type)} />
              <ViewField
                label="Registration"
                value={hospital.registration_number ?? "—"}
                mono
              />
            </div>
            {hospital.description_en && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Description
                </p>
                <p className="text-[11px] text-foreground leading-relaxed">
                  {hospital.description_en}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Location tab ── */}
        {activeTab === "location" && (
          <div>
            <TabSectionHeader
              icon={MapPin}
              title="Location & address"
              onEdit={() => onEditStep(1)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="col-span-1 sm:col-span-2">
                <ViewField
                  label="Full address"
                  value={[
                    hospital.address,
                    hospital.city,
                    hospital.province,
                    hospital.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
              </div>
              <ViewField label="City" value={hospital.city} />
              <ViewField label="Province" value={hospital.province} />
              <ViewField label="Country" value={hospital.country} />
              <ViewField label="Latitude" value={String(hospital.latitude ?? "—")} mono />
              <ViewField label="Longitude" value={String(hospital.longitude ?? "—")} mono />
            </div>
          </div>
        )}

        {/* ── Contact tab ── */}
        {activeTab === "contact" && (
          <div>
            <TabSectionHeader
              icon={Phone}
              title="Contact information"
              onEdit={() => onEditStep(2)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hospital.phone && (
                <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary">
                    <Phone size={13} />
                  </div>
                  <span className="text-[11px] font-medium font-mono text-primary truncate">
                    {hospital.phone}
                  </span>
                </div>
              )}
              {hospital.email && (
                <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                    <Mail size={13} />
                  </div>
                  <span className="text-[11px] font-medium text-foreground truncate">
                    {hospital.email}
                  </span>
                </div>
              )}
              {hospital.website && (
                <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                    <Globe size={13} />
                  </div>
                  <a
                    href={hospital.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-primary hover:underline truncate"
                  >
                    {hospital.website.replace("https://", "")}
                  </a>
                </div>
              )}
            </div>
            {!hospital.phone && !hospital.email && !hospital.website && (
              <p className="text-xs text-muted-foreground">No contact details added.</p>
            )}
          </div>
        )}

        {/* ── Hours tab ── */}
        {activeTab === "hours" && (
          <div>
            <TabSectionHeader
              icon={Clock}
              title="Operating hours"
              onEdit={() => onEditStep(3)}
            />
            <div className="flex items-center gap-4 flex-wrap mb-4">
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0",
                  currentlyOpen ? "bg-primary" : "bg-muted-foreground",
                )}
              >
                {currentlyOpen ? "OPEN" : "CLSD"}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {hospital.is_open_24h
                    ? "Open 24 hours"
                    : `${hospital.opens_at} – ${hospital.closes_at}`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {currentlyOpen ? "Currently open" : "Currently closed"}
                </p>
              </div>
              {hospital.is_open_24h && (
                <span className="text-[11px] font-medium rounded-full px-3 py-1 bg-primary/15 text-primary border border-primary/20">
                  ✓ Available 24 hours
                </span>
              )}
            </div>
            {!hospital.is_open_24h && (
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                <ViewField label="Opens at" value={hospital.opens_at || "—"} mono />
                <ViewField label="Closes at" value={hospital.closes_at || "—"} mono />
              </div>
            )}
          </div>
        )}

        {/* ── Social tab ── */}
        {activeTab === "social" && (
          <div>
            <TabSectionHeader
              icon={Link2}
              title="Social & online presence"
              onEdit={() => onEditStep(4)}
            />
            {socialLinksCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-md border border-dashed border-border text-center">
                <Link2 className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No social links added yet.</p>
                <button
                  onClick={() => onEditStep(4)}
                  className="text-[11px] text-primary hover:underline mt-0.5"
                >
                  Add social links
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SOCIAL_PLATFORMS.filter(({ key }) => !!socialLinks[key]).map(
                  ({ key, label }) => (
                    <a
                      key={key}
                      href={socialLinks[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-md border border-border bg-muted/30 hover:bg-muted/60 px-3 py-2 transition-colors group"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Link2 className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {label}
                        </p>
                        <p className="text-[11px] text-primary group-hover:underline truncate">
                          {socialLinks[key]}
                        </p>
                      </div>
                    </a>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Gallery tab ── */}
        {activeTab === "gallery" && (
          <div>
            <TabSectionHeader
              icon={Images}
              title={`Photo gallery${galleryImages.length > 0 ? ` (${galleryImages.length})` : ""}`}
              onEdit={() => onEditStep(5)}
              editLabel="Manage photos"
            />
            <GalleryView images={galleryImages} />
          </div>
        )}

        {/* ── Prescriptions tab ── */}
        {activeTab === "prescriptions" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Pill size={15} className="text-primary" />
                {t("pages.hospital.rx_title", "Prescriptions")}
              </h3>
              <Button
                size="sm"
                className="text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-7"
                onClick={onNewRx}
              >
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </div>

            {rxList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center rounded-md border border-dashed border-border">
                <Pill className="h-7 w-7 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  No prescriptions issued yet.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 text-xs"
                  onClick={onNewRx}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Issue first prescription
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
                {rxList.map((rx) => {
                  const Icon =
                    channelIcon[
                      (rx.channels?.[0] as keyof typeof channelIcon) ?? "app"
                    ] ?? User;
                  const style =
                    statusStyle[rx.status as RxStatus] ?? statusStyle["active"];
                  return (
                    <li
                      key={rx.id}
                      className="flex items-center gap-3 py-2.5 px-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-foreground truncate">
                          {rx.patientName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {rx.medications?.[0]?.name ?? "—"} · {rx.createdAt}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0 text-[10px]", style.badge)}
                      >
                        {rx.status}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
function EmptyHospital({ onCreate }: { onCreate: () => void }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mb-3">
        <Building2 className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-sm font-semibold text-foreground mb-2">
        {t("hospital.empty.title", "No hospital profile")}
      </h2>
      <p className="text-[11px] text-muted-foreground mb-5 max-w-xs">
        {t(
          "hospital.empty.sub",
          "Create your hospital profile to manage contact details, location, and operating hours",
        )}
      </p>
      <Button
        onClick={onCreate}
        className="text-primary-foreground bg-primary hover:bg-primary/90"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        {t("hospital.empty.cta", "Create Hospital Profile")}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export the response type for use in this file
// ─────────────────────────────────────────────────────────────────────────────
type HospitalProfileResponse = import("@/hooks/useHospitalProfile").HospitalProfileResponse;

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
type Mode = "view" | "create" | "edit";

const GALLERY_STEP_INDEX = STEPS.findIndex((s) => s.id === "gallery");

const HospitalProfile = () => {
  const { t, i18n } = useTranslation();

  // ── API hooks ──────────────────────────────────────────────────────────────
  const profileQuery = useGetHospitalProfile();
  const imagesQuery = useGetHospitalImages(); // GET /hospital/images
  const upsertProfile = useUpsertHospitalProfile();
  const uploadImages = useUploadHospitalImages();

  // Derived data
  const serverHospital = profileQuery.data?.hospital ?? null;
  const remoteImages: HospitalImage[] = imagesQuery.data?.images ?? [];

  // ── UI state ───────────────────────────────────────────────────────────────
  // Determine initial mode based on whether a profile exists
  const [mode, setMode] = useState<Mode>("create");
  const [rxOpen, setRxOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  // Once profile loads, switch to view mode
  useEffect(() => {
    if (serverHospital) {
      setMode("view");
    }
  }, [serverHospital]);

  const isForm = mode === "create" || mode === "edit";

  const rxList = usePrescriptions().filter(
    (p) =>
      p.issuer === "hospital" &&
      p.issuerOrg === (serverHospital?.name_en ?? HOSPITAL_CONST),
  );

  // ── Gallery display adapter ────────────────────────────────────────────────
  const galleryDisplayImages: GalleryImageDisplay[] = remoteImages.map(
    (img) => ({
      id: String(img.id),
      src: img.image_url,
      caption: img.caption,
      uploadedAt: "—",
    }),
  );

  // ── Default form values from server ───────────────────────────────────────
  const defaultFormValues: Partial<HospitalFormData> | undefined =
    serverHospital
      ? {
          hospital: {
            name_en: serverHospital.name_en,
            name_fr: serverHospital.name_fr,
            name_kiny: serverHospital.name_kiny,
            description_en: serverHospital.description_en ?? "",
            type: serverHospital.type,
            registration_number: serverHospital.registration_number ?? "",
            address: serverHospital.address,
            city: serverHospital.city,
            province: serverHospital.province,
            country: serverHospital.country,
            latitude: String(serverHospital.latitude ?? ""),
            longitude: String(serverHospital.longitude ?? ""),
            phone: serverHospital.phone,
            email: serverHospital.email,
            website: serverHospital.website,
            opens_at: serverHospital.opens_at,
            closes_at: serverHospital.closes_at,
            is_open_24h: serverHospital.is_open_24h,
          },
          linksSection: normaliseSocialLinks(serverHospital.social_links),
        }
      : undefined;

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (
    formData: HospitalFormData,
    staged: GalleryImageLocal[],
  ) => {
    const { hospital, linksSection } = formData;

    // Build profile payload
    const payload: UpsertProfilePayload = {
      name_en: hospital.name_en,
      name_fr: hospital.name_fr,
      name_kiny: hospital.name_kiny,
      description_en: hospital.description_en,
      type: hospital.type,
      registration_number: hospital.registration_number,
      address: hospital.address,
      city: hospital.city,
      province: hospital.province,
      country: hospital.country,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      phone: hospital.phone,
      email: hospital.email,
      website: hospital.website,
      opens_at: hospital.opens_at,
      closes_at: hospital.closes_at,
      is_open_24h: hospital.is_open_24h,
      social_links: buildSocialLinksPayload(linksSection),
    };

    try {
      // 1. Upsert the profile first
      await upsertProfile.mutateAsync(payload);

      // 2. Upload any staged gallery images
      if (staged.length > 0) {
        await uploadImages.mutateAsync({
          files: staged.map((s) => s.file),
          captions: staged.map((s) => s.caption),
          type: "gallery",
        });
      }

      setMode("view");
    } catch {
      // errors are surfaced via mutation.error; do nothing extra here
    }
  };

  const handleDelete = () => {
    // There is no DELETE /hospital/profile endpoint in the provided API.
    // This resets local UI state to create mode so the user can re-create.
    setMode("create");
    setCurrentStep(0);
    setVisited(new Set([0]));
  };

  const openEdit = () => {
    setCurrentStep(0);
    setVisited(new Set([0]));
    setMode("edit");
  };

  /** Jump to a specific step in the edit form */
  const openEditAtStep = (stepIndex: number) => {
    const goTo = stepIndex >= 0 ? stepIndex : 0;
    setCurrentStep(goTo);
    setVisited(new Set(STEPS.map((_, i) => i)));
    setMode("edit");
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = serverHospital
    ? {
        type: humanType(serverHospital.type),
        city: serverHospital.city,
        hours: serverHospital.is_open_24h
          ? "24 hours"
          : `${serverHospital.opens_at} – ${serverHospital.closes_at}`,
        status: isOpenNow(
          serverHospital.opens_at,
          serverHospital.closes_at,
          serverHospital.is_open_24h,
        )
          ? "Open"
          : "Closed",
        prescriptions: rxList.length,
        country: serverHospital.country,
        photos: remoteImages.length,
      }
    : null;

  const submitting = upsertProfile.isPending || uploadImages.isPending;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (profileQuery.isLoading) {
    return (
      <DashboardLayout role="hospital">
        <PageHeader
          title={t("pages.hospital.rx_title")}
          subtitle="Loading your profile…"
        />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="hospital">
      <PageHeader
        title={t("pages.hospital.rx_title")}
        subtitle={
          isForm
            ? t(
                "hospital.form.subtitle",
                mode === "edit"
                  ? "Update your hospital information"
                  : "Fill in the details below to register your hospital",
              )
            : t("pages.hospital.rx_sub", {
                name: serverHospital?.name_en ?? HOSPITAL_CONST,
              })
        }
      />

      {/* API error banner */}
      {(upsertProfile.error || uploadImages.error) && (
        <div className="mx-3 sm:mx-6 mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
          {upsertProfile.error?.message ??
            uploadImages.error?.message ??
            "Something went wrong"}
        </div>
      )}

      <div className="px-3 py-4 sm:px-6 sm:py-8 space-y-4 sm:space-y-5">
        {/* Stats bar (view mode only) */}
        {stats && !isForm && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
            <StatCard label="Type" value={stats.type} />
            <StatCard label="City" value={stats.city} />
            <StatCard label="Country" value={stats.country} />
            <StatCard label="Hours" value={stats.hours} />
            <StatCard label="Status" value={stats.status} accent />
            <StatCard
              label="Prescriptions"
              value={stats.prescriptions}
              sub="issued"
            />
            <StatCard label="Photos" value={stats.photos} sub="in gallery" />
          </div>
        )}

        {/* Unified card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col sm:flex-row min-h-[560px]">
          <UnifiedSidebar
            currentStep={currentStep}
            visited={visited}
            onSelect={(i) => {
              const next = new Set([...visited, i]);
              setVisited(next);
              setCurrentStep(i);
            }}
            mode={mode}
            hospitalName={serverHospital?.name_en}
            hospitalType={serverHospital?.type}
            hospitalCity={serverHospital?.city}
            hospitalReg={serverHospital?.registration_number}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {/* Right content area */}
          {isForm ? (
            <HospitalForm
              mode={mode === "edit" ? "edit" : "create"}
              defaultValues={
                mode === "edit" ? defaultFormValues : undefined
              }
              remoteImages={remoteImages}
              onSubmit={handleSubmit}
              onCancel={() => {
                if (serverHospital) setMode("view");
              }}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              visited={visited}
              onVisitedChange={setVisited}
              submitting={submitting}
            />
          ) : serverHospital ? (
            <HospitalProfileView
              hospital={serverHospital}
              galleryImages={galleryDisplayImages}
              rxList={rxList}
              onNewRx={() => setRxOpen(true)}
              onEditStep={openEditAtStep}
            />
          ) : (
            <EmptyHospital onCreate={() => setMode("create")} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HospitalProfile;
