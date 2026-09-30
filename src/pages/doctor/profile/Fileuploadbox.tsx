import React from "react";
import { useTranslation } from "react-i18next";
import { CropToCardConfig, FileUploader } from "@/components/ui/file-uploader";

interface FileUploadBoxProps {
  label: string;
  accept: string;
  file?: File | null;
  onChange: (f: File | null) => void;
  maxSizeMb?: number;
  existingUrl?: string | null;
  cropToCard?: boolean | CropToCardConfig;
  helperText?: string;
}

export const FileUploadBox = React.memo(function FileUploadBox({
  label,
  accept,
  file,
  onChange,
  maxSizeMb = 10,
  existingUrl,
  cropToCard,
  helperText,
}: FileUploadBoxProps) {
  const { t } = useTranslation();

  return (
    <FileUploader
      label={label}
      accept={accept}
      value={file}
      onChange={(value) => onChange(Array.isArray(value) ? value[0] ?? null : value)}
      maxSizeMb={maxSizeMb}
      existingUrl={existingUrl}
      cropToCard={cropToCard}
      helperText={helperText ?? t("doctorProfile.file_hint_image")}
    />
  );
});

