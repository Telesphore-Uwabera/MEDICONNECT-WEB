import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Image as ImageIcon, X } from "lucide-react";

export interface ClinicalResultFile {
  url: string;
  name?: string;
}

function isImage(url: string, name?: string) {
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(url) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name || "");
}

function isPdf(url: string, name?: string) {
  return /\.pdf($|\?)/i.test(url) || /\.pdf$/i.test(name || "");
}

export function ClinicalResultViewer({
  files = [],
  fallbackUrl,
}: {
  files?: ClinicalResultFile[];
  fallbackUrl?: string | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<ClinicalResultFile | null>(null);
  const list: ClinicalResultFile[] = files.length
    ? files
    : fallbackUrl
      ? [{ url: fallbackUrl, name: "Result" }]
      : [];
  if (!list.length) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {t("clinical.results.title", "Results and images")}
      </p>
      <div className="flex flex-wrap gap-2">
        {list.map((file) => (
          <button
            key={file.url}
            type="button"
            onClick={() => setOpen(file)}
            className="flex items-center gap-1.5 rounded-[5px] border border-border px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/5"
          >
            {isImage(file.url, file.name) ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {file.name || t("clinical.results.file", "Result file")}
          </button>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[6px] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="truncate text-xs font-semibold">{open.name || open.url}</p>
              <button type="button" onClick={() => setOpen(null)} className="rounded-[5px] p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto bg-black/80 p-3">
              {isImage(open.url, open.name) ? (
                <img src={open.url} alt={open.name || "Result"} className="mx-auto max-h-[76vh] max-w-full object-contain" />
              ) : isPdf(open.url, open.name) ? (
                <iframe title={open.name || "PDF"} src={open.url} className="h-[76vh] w-full rounded-[4px] bg-white" />
              ) : (
                <a href={open.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  {t("clinical.results.open", "Open file")}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
