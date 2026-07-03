// ─────────────────────────────────────────────────────────────────────────────
// FileUploadBox
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { useTranslation } from "react-i18next";
import { Check, Upload } from "lucide-react";

interface FileUploadBoxProps {
  label: string;
  accept: string;
  file?: File | null;
  onChange: (f: File | null) => void;
}

export const FileUploadBox = React.memo(function FileUploadBox({
  label,
  accept,
  file,
  onChange,
}: FileUploadBoxProps) {
  const { t } = useTranslation();
  return (
    <label className="flex flex-col items-center justify-center gap-2 rounded-[6px] border-2 border-dashed border-border bg-muted/50 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer px-4 py-6 text-center">
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <>
          <Check className="h-5 w-5 text-primary" />
          <p className="text-xs font-medium text-primary">{file.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {(file.size / 1024).toFixed(1)} KB · {t("doctorProfile.click_to_replace")}
          </p>
        </>
      ) : (
        <>
          <Upload className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">
            {t("doctorProfile.file_hint_image")}
          </p>
        </>
      )}
    </label>
  );
});
