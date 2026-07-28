import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast as sonnerToast } from "sonner";
import { CheckCircle2, ExternalLink, FileText, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/getErrorMessage";
import type { LegalDocument, LegalDocumentType } from "@/hooks/Terms/useTerms";
import {
  type LegalDocumentPayload,
  useAdminLegalDocuments,
  useCreateLegalDocument,
  useDeleteLegalDocument,
  useSetCurrentLegalDocument,
  useUpdateLegalDocument,
} from "@/hooks/admin/use-admin-legal-documents";
import { prepareRichTextForSave, RichTextarea } from "@/components/ui/rich-textarea";
import { Label } from "@/components/ui/label";

type FormState = LegalDocumentPayload;

const inputClass =
  "h-9 w-full rounded-[6px] border border-border/60 bg-background px-3 text-[12px] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20";


const emptyForm = (type: LegalDocumentType): FormState => ({
  type,
  title_en: type === "terms" ? "Terms of Service" : "Privacy Policy",
  title_fr: "",
  title_kiny: "",
  content_en: "",
  content_fr: "",
  content_kiny: "",
  version: "1.0",
  effective_date: new Date().toISOString().slice(0, 10),
  is_current: true,
  is_active: true,
});

const formFromDocument = (document: LegalDocument): FormState => ({
  type: document.type,
  title_en: document.title_en ?? "",
  title_fr: document.title_fr ?? "",
  title_kiny: document.title_kiny ?? "",
  content_en: document.content_en ?? "",
  content_fr: document.content_fr ?? "",
  content_kiny: document.content_kiny ?? "",
  version: document.version ?? "1.0",
  effective_date: (document.effective_date ?? new Date().toISOString()).split("T")[0],
  is_current: Boolean(document.is_current),
  is_active: document.is_active !== false,
});

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</span>
      {children}
    </label>
  );
}

function DocumentCard({
  document,
  active,
  onEdit,
  onSetCurrent,
  onDelete,
  isSettingCurrent,
  isDeleting,
}: {
  document: LegalDocument;
  active: boolean;
  onEdit: () => void;
  onSetCurrent: () => void;
  onDelete: () => void;
  isSettingCurrent: boolean;
  isDeleting: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit();
        }
      }}
      className={cn(
        "w-full rounded-[6px] border p-3 text-left transition-colors cursor-pointer",
        active ? "border-primary/40 bg-primary/10" : "border-border/60 bg-background hover:bg-secondary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {document.title_en || document.title_fr || document.title_kiny || `Version ${document.version ?? document.id}`}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            v{document.version ?? "-"} {document.effective_date ? `- effective ${document.effective_date.split("T")[0]}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {document.is_current && (
            <Badge className="rounded-[6px] bg-primary/10 text-primary hover:bg-primary/10">Current</Badge>
          )}
          {!document.is_active && <Badge variant="outline" className="rounded-[6px]">Inactive</Badge>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!document.is_current && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-[6px] text-[10px]"
            onClick={(event) => {
              event.stopPropagation();
              onSetCurrent();
            }}
            disabled={isSettingCurrent}
          >
            {isSettingCurrent ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
            Set current
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-[6px] text-[10px] text-destructive hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          disabled={Boolean(document.is_current) || isDeleting}
        >
          {isDeleting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
          Delete
        </Button>
      </div>
    </div>
  );
}

export function LegalDocumentsManager() {
  const [type, setType] = useState<LegalDocumentType>("terms");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm("terms"));

  const documentsQuery = useAdminLegalDocuments({ type, per_page: 50 });
  const createDocument = useCreateLegalDocument();
  const updateDocument = useUpdateLegalDocument();
  const deleteDocument = useDeleteLegalDocument();
  const setCurrentDocument = useSetCurrentLegalDocument();

  const documents = documentsQuery.data?.data ?? [];
  const editingDocument = useMemo(
    () => documents.find((document) => document.id === editingId) ?? null,
    [documents, editingId],
  );

  useEffect(() => {
    const current = documents.find((document) => document.is_current) ?? documents[0] ?? null;
    if (current) {
      setEditingId(current.id);
      setForm(formFromDocument(current));
    } else {
      setEditingId(null);
      setForm(emptyForm(type));
    }
  }, [type, documentsQuery.data]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startNewVersion = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...emptyForm(type),
      title_en: prev.title_en,
      title_fr: prev.title_fr,
      title_kiny: prev.title_kiny,
      content_en: prev.content_en,
      content_fr: prev.content_fr,
      content_kiny: prev.content_kiny,
      version: "",
      is_current: false,
    }));
  };

  const handleSave = async () => {
    const payload: LegalDocumentPayload = {
      ...form,
      type,
      title_en: form.title_en.trim(),
      title_fr: form.title_fr.trim(),
      title_kiny: form.title_kiny.trim(),
      content_en: prepareRichTextForSave(form.content_en) ?? "",
      content_fr: prepareRichTextForSave(form.content_fr) ?? "",
      content_kiny: prepareRichTextForSave(form.content_kiny) ?? "",
      version: form.version.trim(),
      effective_date: form.effective_date,
    };

    try {
      const shouldSetCurrentAfterCreate = !editingId && payload.is_current;

     const response = editingId
      ? await updateDocument.mutateAsync({ id: editingId, payload })
      : await createDocument.mutateAsync({
          ...payload,
          is_current: shouldSetCurrentAfterCreate ? false : payload.is_current,
        });

      if (shouldSetCurrentAfterCreate) {
        await setCurrentDocument.mutateAsync(response.data.id);
      }

      setEditingId(response.data.id);
      sonnerToast.success(response.message ?? "Legal document saved.");
    } catch (error) {
      sonnerToast.error("Could not save legal document.", { description: getErrorMessage(error) });
    }
  };

  const handleDelete = async (document: LegalDocument) => {
    if (document.is_current) {
      sonnerToast.error("Current active versions cannot be deleted.");
      return;
    }
    try {
      const response = await deleteDocument.mutateAsync(document.id);
      sonnerToast.success(response.message ?? "Legal document deleted.");
    } catch (error) {
      sonnerToast.error("Could not delete legal document.", { description: getErrorMessage(error) });
    }
  };

  const handleSetCurrent = async (document: LegalDocument) => {
    try {
      const response = await setCurrentDocument.mutateAsync(document.id);
      setEditingId(response.data.id);
      sonnerToast.success(response.message ?? "Version set as current.");
    } catch (error) {
      sonnerToast.error("Could not set current version.", { description: getErrorMessage(error) });
    }
  };

  const saving = createDocument.isPending || updateDocument.isPending;

  return (
    <section className="rounded-[6px] border border-border/70 bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">Legal documents</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              Manage current Terms and Privacy documents shown on the public pages.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/${type}`} target="_blank">
            <Button type="button" size="sm" variant="outline" className="h-8 rounded-[6px] text-[11px]">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open public page
            </Button>
          </Link>
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-[6px] text-[11px]" onClick={startNewVersion}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New version
          </Button>
          <Button type="button" size="sm" className="h-8 rounded-[6px] text-[11px]" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save document
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["terms", "privacy"] as LegalDocumentType[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={cn(
                  "rounded-[6px] border px-3 py-2 text-[11px] font-semibold capitalize transition-colors",
                  type === item ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 hover:bg-secondary/40",
                )}
              >
                {item === "terms" ? "Terms" : "Privacy"}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{documentsQuery.data?.total ?? 0} versions</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-[6px] px-2 text-[10px]"
              onClick={() => documentsQuery.refetch()}
              disabled={documentsQuery.isFetching}
            >
              <RefreshCw className={cn("mr-1 h-3 w-3", documentsQuery.isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="space-y-2">
            {documentsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-[6px] border border-border/60 bg-secondary/30" />
              ))
            ) : documents.length ? (
              documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  active={editingId === document.id}
                  onEdit={() => {
                    setEditingId(document.id);
                    setForm(formFromDocument(document));
                  }}
                  onSetCurrent={() => handleSetCurrent(document)}
                  onDelete={() => handleDelete(document)}
                  isSettingCurrent={setCurrentDocument.isPending}
                  isDeleting={deleteDocument.isPending}
                />
              ))
            ) : (
              <div className="rounded-[6px] border border-dashed border-border/70 px-4 py-8 text-center text-[12px] text-muted-foreground">
                No {type} documents yet.
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Document type">
              <select value={type} onChange={(event) => setType(event.target.value as LegalDocumentType)} className={inputClass}>
                <option value="terms">Terms</option>
                <option value="privacy">Privacy</option>
              </select>
            </Field>
            <Field label="Version">
              <input value={form.version} onChange={(event) => setField("version", event.target.value)} className={inputClass} placeholder="1.0" />
            </Field>
            <Field label="Effective date">
              <input type="date" value={form.effective_date} onChange={(event) => setField("effective_date", event.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="English title">
              <input value={form.title_en} onChange={(event) => setField("title_en", event.target.value)} className={inputClass} />
            </Field>
            <Field label="French title">
              <input value={form.title_fr} onChange={(event) => setField("title_fr", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Kinyarwanda title">
              <input value={form.title_kiny} onChange={(event) => setField("title_kiny", event.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4">
            <Field label="English content"/>
              <RichTextarea
                value={form.content_en}
                onChange={(value) => setField("content_en", value)}
                placeholder="Write the English legal content..."
                 minHeight={220}
                   maxHeight={450}
                 />
            <Field label="French content"/>
              <RichTextarea
                value={form.content_fr}
                onChange={(value) => setField("content_fr", value)}
                placeholder="Write the French legal content..."
                minHeight={220}
                maxHeight={450}
              /> 
            <Field label="Kinyarwanda content" />
              <RichTextarea
                value={form.content_kiny}
                onChange={(value) => setField("content_kiny", value)}
                placeholder="Write the Kinyarwanda legal content..."
                minHeight={220}
                maxHeight={450}
              /> 
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-secondary/20 px-3 py-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground">Current version</p>
                <p className="text-[10px] text-muted-foreground">This version is served by /{type} when active.</p>
              </div>
              <Switch checked={form.is_current} onCheckedChange={(checked) => setField("is_current", checked)} />
            </div>
            <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-secondary/20 px-3 py-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground">Active</p>
                <p className="text-[10px] text-muted-foreground">Inactive documents remain saved but hidden publicly.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(checked) => setField("is_active", checked)} />
            </div>
          </div>
   <Button type="button" size="sm" className="h-8 rounded-[6px] text-[11px]" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save document
          </Button>
          {editingDocument && (
            <p className="text-[10px] text-muted-foreground">
              Editing document #{editingDocument.id}. Public route: /{editingDocument.type}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
