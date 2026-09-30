import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, Crop, FileText, ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "./image-crop-dialog";
import { autoCropLargeImageToCard } from "@/lib/image-cropper";

type FileValue = File | File[] | null | undefined;

export interface CropToCardConfig {
  aspectRatio?: number;
  targetWidth?: number;
  targetHeight?: number;
  title?: string;
  subtitle?: string;
}

interface FileUploaderProps {
  label: string;
  value?: FileValue;
  onChange: (value: File | File[] | null) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  helperText?: string;
  existingUrl?: string | null;
  existingLabel?: string;
  disabled?: boolean;
  className?: string;
  preview?: boolean;
  cropToCard?: boolean | CropToCardConfig;
}

const formatSize = (bytes: number) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (file?: File | null) => !!file?.type?.startsWith("image/");

const acceptParts = (accept?: string) =>
  (accept ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

const fileMatchesAccept = (file: File, accept?: string) => {
  const parts = acceptParts(accept);
  if (!parts.length) return true;
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return parts.some((part) => {
    if (part.endsWith("/*")) return mime.startsWith(part.slice(0, -1));
    if (part.startsWith(".")) return name.endsWith(part);
    return mime === part;
  });
};

export const FileUploader = React.memo(function FileUploader({
  label,
  value,
  onChange,
  accept,
  multiple = false,
  maxSizeMb = 4,
  helperText,
  existingUrl,
  existingLabel,
  disabled = false,
  className,
  preview = true,
  cropToCard = false,
}: FileUploaderProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Crop dialog state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [originalRawFile, setOriginalRawFile] = useState<File | null>(null);

  const cropConfig = useMemo(() => {
    if (!cropToCard) return null;
    if (typeof cropToCard === "object") {
      return {
        aspectRatio: cropToCard.aspectRatio ?? 4 / 3,
        targetWidth: cropToCard.targetWidth ?? 800,
        targetHeight: cropToCard.targetHeight ?? 600,
        title: cropToCard.title ?? t("common.fileUploader.cropTitle", { defaultValue: "Fit Doctor Photo to Card" }),
        subtitle: cropToCard.subtitle ?? t("common.fileUploader.cropSubtitle", { defaultValue: "Cut to card pixels (800 × 600 px · 4:3) so the image displays fully." }),
      };
    }
    return {
      aspectRatio: 4 / 3,
      targetWidth: 800,
      targetHeight: 600,
      title: t("common.fileUploader.cropTitle", { defaultValue: "Fit Doctor Photo to Card" }),
      subtitle: t("common.fileUploader.cropSubtitle", { defaultValue: "Cut to card pixels (800 × 600 px · 4:3) so the image displays fully." }),
    };
  }, [cropToCard, t]);

  const files = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value.filter(Boolean) : [value];
  }, [value]);

  const firstFile = files[0] ?? null;
  const hasFile = files.length > 0;

  useEffect(() => {
    if (!preview || !isImageFile(firstFile)) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(firstFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [firstFile, preview]);

  const helper =
    helperText ??
    (cropConfig
      ? t("common.fileUploader.cardHelper", {
          defaultValue: "Click or drag photo. Cut to 800 × 600 px (4:3) to fully display on cards.",
        })
      : t("common.fileUploader.helper", {
          defaultValue: "Click to upload or drag and drop. Max {{size}} MB.",
          size: maxSizeMb,
        }));

  const rejectFiles = useCallback(
    (incoming: File[]) => {
      const maxBytes = maxSizeMb * 1024 * 1024;
      const valid: File[] = [];

      for (const file of incoming) {
        if (!fileMatchesAccept(file, accept)) {
          toast.error(
            t("common.fileUploader.invalidType", {
              defaultValue: "{{name}} is not an accepted file type.",
              name: file.name,
            }),
          );
          continue;
        }
        if (file.size > maxBytes) {
          toast.error(
            t("common.fileUploader.tooLarge", {
              defaultValue: "{{name}} is larger than {{size}} MB.",
              name: file.name,
              size: maxSizeMb,
            }),
          );
          continue;
        }
        valid.push(file);
      }

      return valid;
    },
    [accept, maxSizeMb, t],
  );

  const selectFiles = useCallback(
    (fileList: FileList | null) => {
      if (disabled || !fileList?.length) return;
      const valid = rejectFiles(Array.from(fileList));
      if (!valid.length) return;

      const primary = valid[0];
      if (cropConfig && isImageFile(primary)) {
        setOriginalRawFile(primary);
        setFileToCrop(primary);
        setCropModalOpen(true);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      onChange(multiple ? valid : valid[0]);
      if (inputRef.current) inputRef.current.value = "";
    },
    [cropConfig, disabled, multiple, onChange, rejectFiles],
  );

  const handleCropApply = useCallback(
    (croppedFile: File) => {
      onChange(multiple ? [croppedFile] : croppedFile);
      setCropModalOpen(false);
    },
    [multiple, onChange],
  );

  const openReCrop = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = originalRawFile || firstFile;
      if (target && isImageFile(target)) {
        setFileToCrop(target);
        setCropModalOpen(true);
      }
    },
    [firstFile, originalRawFile],
  );

  const clear = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setOriginalRawFile(null);
      setFileToCrop(null);
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onChange],
  );

  return (
    <>
      <label
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFiles(event.dataTransfer.files);
        }}
        className={cn(
          "group relative flex min-h-[118px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[6px] border-2 border-dashed bg-muted/40 px-4 py-5 text-center transition-all duration-200",
          dragging
            ? "border-primary bg-primary/10 shadow-sm"
            : "border-border hover:border-primary/60 hover:bg-primary/5",
          disabled && "pointer-events-none cursor-not-allowed opacity-60",
          className,
        )}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => selectFiles(event.target.files)}
        />

        {hasFile ? (
          <>
            <div className="relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={firstFile?.name ?? label}
                  className="h-14 w-14 rounded-[6px] border border-border object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </span>
              )}

              {/* Crop indicator badge */}
              {cropConfig && isImageFile(firstFile) && (
                <button
                  type="button"
                  onClick={openReCrop}
                  title="Adjust card crop"
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-110 transition-transform"
                >
                  <Crop className="h-2.5 w-2.5" />
                </button>
              )}
            </div>

            <div className="min-w-0 max-w-full">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <p className="truncate text-xs font-semibold text-primary max-w-[200px]">
                  {multiple
                    ? t("common.fileUploader.filesSelected", {
                        defaultValue: "{{count}} files selected",
                        count: files.length,
                      })
                    : firstFile?.name}
                </p>
                {cropConfig && isImageFile(firstFile) && (
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {cropConfig.targetWidth}×{cropConfig.targetHeight} px
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
                <span>
                  {multiple
                    ? files.map((file) => formatSize(file.size)).join(", ")
                    : `${formatSize(firstFile?.size ?? 0)}`}
                </span>
                {cropConfig && isImageFile(firstFile) && (
                  <>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={openReCrop}
                      className="font-semibold text-primary hover:underline"
                    >
                      Adjust crop
                    </button>
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-[6px] border border-border bg-background/90 text-muted-foreground opacity-0 shadow-sm transition hover:text-destructive group-hover:opacity-100"
              aria-label={t("common.fileUploader.remove", { defaultValue: "Remove file" })}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : existingUrl ? (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <a
              href={existingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {existingLabel ?? t("common.fileUploader.viewCurrent", { defaultValue: "View current file" })}
            </a>
            <p className="text-[10px] text-muted-foreground">
              {t("common.fileUploader.dropToReplace", { defaultValue: "Drop a new file here to replace it." })}
            </p>
          </>
        ) : (
          <>
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-[6px] transition-colors",
                dragging ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {accept?.includes("image") && !accept?.includes("pdf") ? (
                <ImageIcon className="h-5 w-5" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </span>
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="max-w-sm text-[10px] leading-4 text-muted-foreground">{helper}</p>
            {dragging && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                <AlertCircle className="h-3 w-3" />
                {t("common.fileUploader.dropNow", { defaultValue: "Drop file to upload" })}
              </p>
            )}
          </>
        )}
      </label>

      {/* Image Crop Dialog */}
      {cropConfig && (
        <ImageCropDialog
          open={cropModalOpen}
          onClose={() => setCropModalOpen(false)}
          file={fileToCrop}
          onApply={handleCropApply}
          aspectRatio={cropConfig.aspectRatio}
          targetWidth={cropConfig.targetWidth}
          targetHeight={cropConfig.targetHeight}
          title={cropConfig.title}
          subtitle={cropConfig.subtitle}
        />
      )}
    </>
  );
});

