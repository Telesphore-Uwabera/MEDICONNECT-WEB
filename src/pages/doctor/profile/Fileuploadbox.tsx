import React from "react";
import { useTranslation } from "react-i18next";
import { FileUploader } from "@/components/ui/file-uploader";

interface FileUploadBoxProps {
  label: string;
  accept: string;
  file?: File | null;
  onChange: (f: File | null) => void;
  maxSizeMb?: number;
  existingUrl?: string | null;
}

export const FileUploadBox = React.memo(function FileUploadBox({
  label,
  accept,
  file,
  onChange,
  maxSizeMb = 4,
  existingUrl,
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
      helperText={t("doctorProfile.file_hint_image")}
    />
  );
});

