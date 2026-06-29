import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Loader2,
  Calendar,
  Hash,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Tag,
  ToggleLeft,
  Languages,
  List,
  Flag,
} from "lucide-react";
import {
  useGetChecklistQuestions,
  useCreateChecklistQuestion,
  useUpdateChecklistQuestion,
  useDeleteChecklistQuestion,
  flattenQuestions,
  sectionLabel,
  type QuestionsBySection,
  type ApiChecklistQuestion,
  type CreateChecklistQuestionPayload,
  type UpdateChecklistQuestionPayload,
} from "@/hooks/admin/use-admin-checklist-questions";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{ width: j === 0 ? "24px" : j === 1 ? "260px" : j === 2 ? "80px" : j === 3 ? "60px" : "80px" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── InfoTile ─────────────────────────────────────────────────────────────────

const InfoTile = ({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) => (
  <div className="p-3 rounded-[6px] border border-border/60 bg-secondary/30">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <p className={cn("text-[13px] font-medium text-foreground truncate", valueClassName)}>
      {value}
    </p>
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────

const Badge = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "red" | "green" | "yellow" | "blue";
}) => {
  const styles = {
    default: "bg-secondary/60 text-foreground border-border/60",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    yellow: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", styles[variant])}>
      {children}
    </span>
  );
};

// ─── Desktop row ──────────────────────────────────────────────────────────────

function QuestionRow({
  q,
  index,
  onView,
  onEdit,
  onDelete,
  isDeleting,
}: {
  q: ApiChecklistQuestion;
  index: number;
  onView: (q: ApiChecklistQuestion) => void;
  onEdit: (q: ApiChecklistQuestion) => void;
  onDelete: (q: ApiChecklistQuestion) => void;
  isDeleting: boolean;
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60 tabular-nums w-10">
        {index + 1}
      </td>
      <td className="px-4 py-3 max-w-xs">
        <p className="text-[11px] text-foreground leading-relaxed line-clamp-2">{q.question_en}</p>
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{q.question_key}</p>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {sectionLabel(q.section)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          {q.is_red_flag && <Badge variant="red">Red flag</Badge>}
          {q.is_required && <Badge variant="blue">Required</Badge>}
          {!q.is_active && <Badge variant="yellow">Inactive</Badge>}
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 shrink-0" />
          {new Date(q.created_at).toLocaleDateString()}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onView(q)}
          >
            <Eye className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onEdit(q)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200"
            onClick={() => onDelete(q)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function QuestionCard({
  q,
  index,
  onView,
  onEdit,
  onDelete,
  isDeleting,
}: {
  q: ApiChecklistQuestion;
  index: number;
  onView: (q: ApiChecklistQuestion) => void;
  onEdit: (q: ApiChecklistQuestion) => void;
  onDelete: (q: ApiChecklistQuestion) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[6px] border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-7 w-7 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px] shrink-0 mt-0.5 border border-primary/20 tabular-nums">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-foreground leading-relaxed">{q.question_en}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground/50">{sectionLabel(q.section)}</span>
          {q.is_red_flag && <Badge variant="red">Red flag</Badge>}
          {q.is_required && <Badge variant="blue">Required</Badge>}
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(q.created_at).toLocaleDateString()}
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onView(q)}
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
            onClick={() => onEdit(q)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 px-3 text-[10px] rounded-[6px] border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200"
            onClick={() => onDelete(q)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── View Details Panel ───────────────────────────────────────────────────────

function ViewDetailsPanel({
  question,
  onClose,
  onEdit,
}: {
  question: ApiChecklistQuestion | null;
  onClose: () => void;
  onEdit: (q: ApiChecklistQuestion) => void;
}) {
  const open = !!question;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] lg:w-[480px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {question && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  Question details
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  #{question.id} · {sectionLabel(question.section)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {question.is_red_flag && (
                  <Badge variant="red">
                    <Flag className="w-2.5 h-2.5 mr-1" />
                    Red flag
                  </Badge>
                )}
                {question.is_required && (
                  <Badge variant="blue">Required</Badge>
                )}
                <Badge variant={question.is_active ? "green" : "yellow"}>
                  {question.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="default">{question.answer_type}</Badge>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <InfoTile
                  icon={<Hash className="w-3.5 h-3.5" />}
                  label="Question ID"
                  value={`#${question.id}`}
                />
                <InfoTile
                  icon={<Tag className="w-3.5 h-3.5" />}
                  label="Section"
                  value={sectionLabel(question.section)}
                />
                <InfoTile
                  icon={<Hash className="w-3.5 h-3.5" />}
                  label="Key"
                  value={question.question_key}
                  valueClassName="font-mono text-[11px]"
                />
                <InfoTile
                  icon={<ToggleLeft className="w-3.5 h-3.5" />}
                  label="Answer type"
                  value={question.answer_type}
                />
                <InfoTile
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Created"
                  value={new Date(question.created_at).toLocaleDateString()}
                />
                <InfoTile
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Updated"
                  value={new Date(question.updated_at).toLocaleDateString()}
                />
              </div>

              {/* Translations */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5" />
                  Translations
                </p>
                <div className="space-y-2">
                  {(
                    [
                      { lang: "English", code: "EN", value: question.question_en },
                      { lang: "French", code: "FR", value: question.question_fr },
                      { lang: "Kinyarwanda", code: "RW", value: question.question_kiny },
                    ] as const
                  ).map(({ lang, code, value }) => (
                    <div
                      key={code}
                      className="p-3 rounded-[6px] border border-border/60 bg-secondary/20 space-y-0.5"
                    >
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {lang}
                      </p>
                      <p className="text-[12px] text-foreground leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options (if any) */}
              {question.options && question.options.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <List className="w-3.5 h-3.5" />
                    Options
                  </p>
                  <div className="p-3 rounded-[6px] border border-border/60 bg-secondary/20 flex flex-wrap gap-1.5">
                    {question.options.map((opt) => (
                      <Badge key={opt} variant="default">{opt}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              {question.warning_if_yes && (
                <div className="rounded-[6px] border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5">
                      Warning if yes
                    </p>
                    <p className="text-[12px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      {question.warning_if_yes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <Button
                className="w-full h-10 text-[12px] rounded-[6px] gap-2"
                onClick={() => { onClose(); onEdit(question); }}
              >
                <Pencil className="h-4 w-4" />
                Edit this question
              </Button>
              <Button
                variant="ghost"
                className="w-full h-9 text-[12px] rounded-[6px] text-muted-foreground"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Question Panel (Create / Edit) ──────────────────────────────────────────

function QuestionPanel({
  mode,
  question,
  onClose,
  onSave,
  isSaving,
}: {
  mode: "create" | "edit" | null;
  question: ApiChecklistQuestion | null;
  onClose: () => void;
  onSave: (text: string) => void;
  isSaving: boolean;
}) {
  const open = !!mode;
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === "edit" && question) setText(question.question_en);
    if (mode === "create") setText("");
  }, [mode, question]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] lg:w-[440px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  {mode === "create" ? "Add question" : "Edit question"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {mode === "create"
                    ? "Write a new checklist question"
                    : "Update the question text"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {mode === "edit" && question && (
                <div className="grid grid-cols-2 gap-2.5">
                  <InfoTile
                    icon={<Hash className="w-3.5 h-3.5" />}
                    label="Question ID"
                    value={`#${question.id}`}
                  />
                  <InfoTile
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label="Created"
                    value={new Date(question.created_at).toLocaleDateString()}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">
                  Question text (English)
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="e.g. Do you have a valid medical license?"
                  className="w-full px-3 py-2.5 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all resize-none leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  {text.trim().length} characters
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <Button
                className="w-full h-10 text-[12px] rounded-[6px] gap-2"
                disabled={isSaving || !text.trim()}
                onClick={handleSubmit}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {mode === "create" ? "Create question" : "Save changes"}
              </Button>
              <Button
                variant="ghost"
                className="w-full h-9 text-[12px] rounded-[6px] text-muted-foreground"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Delete Confirm Panel ─────────────────────────────────────────────────────

function DeleteConfirmPanel({
  question,
  onClose,
  onConfirm,
  isDeleting,
}: {
  question: ApiChecklistQuestion | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const open = !!question;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] lg:w-[440px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {question && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  Delete question
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  This action cannot be undone
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div className="rounded-[6px] border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4">
                <p className="text-[12px] text-red-700 dark:text-red-400 font-medium mb-1">
                  Are you sure you want to delete this question?
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  "{question.question_en}"
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <InfoTile
                  icon={<Hash className="w-3.5 h-3.5" />}
                  label="Question ID"
                  value={`#${question.id}`}
                />
                <InfoTile
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Created"
                  value={new Date(question.created_at).toLocaleDateString()}
                />
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <Button
                variant="outline"
                className="w-full h-10 text-[12px] rounded-[6px] gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                disabled={isDeleting}
                onClick={onConfirm}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Yes, delete question
              </Button>
              <Button
                variant="ghost"
                className="w-full h-9 text-[12px] rounded-[6px] text-muted-foreground"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ChecklistQuestions() {
  const { t, i18n } = useTranslation(); 

  const [searchInput, setSearchInput] = useState("");
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<ApiChecklistQuestion | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<ApiChecklistQuestion | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<ApiChecklistQuestion | null>(null);

  // ── API ──
  const { data: questionsBySection = {} as QuestionsBySection, isLoading, isError } =
    useGetChecklistQuestions();

  const questions = flattenQuestions(questionsBySection);

  const createMutation = useCreateChecklistQuestion();
  const updateMutation = useUpdateChecklistQuestion();
  const deleteMutation = useDeleteChecklistQuestion();

  const filtered = questions.filter((q) =>
    q.question_en.toLowerCase().includes(searchInput.toLowerCase()),
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  // ── Handlers ──
  const openCreate = useCallback(() => {
    setSelectedQuestion(null);
    setPanelMode("create");
  }, []);

  const openEdit = useCallback((q: ApiChecklistQuestion) => {
    setSelectedQuestion(q);
    setPanelMode("edit");
  }, []);

  const closePanel = useCallback(() => {
    setPanelMode(null);
    setSelectedQuestion(null);
  }, []);

  const handleSave = useCallback(async (text: string) => {
    try {
      if (panelMode === "create") {
        const payload: CreateChecklistQuestionPayload = {
          section: "symptoms_screening",
          question_key: `q_${Date.now()}`,
          question_en: text,
          question_fr: text,
          question_kiny: text,
          answer_type: "boolean",
        };
        await createMutation.mutateAsync(payload); 
        sonnerToast.success("Question created successfully.");
      } else if (panelMode === "edit" && selectedQuestion) {
        const payload: UpdateChecklistQuestionPayload = {
          id: selectedQuestion.id,
          question_en: text,
        };
        await updateMutation.mutateAsync(payload); 
        sonnerToast.success("Question updated successfully.");
      }
      closePanel();
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error));
    }
  }, [panelMode, selectedQuestion, createMutation, updateMutation, sonnerToast, closePanel]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingQuestion) return;
    try {
      await deleteMutation.mutateAsync(deletingQuestion.id);
      sonnerToast.success("Question deleted successfully.");
      setDeletingQuestion(null);
    } catch (error: unknown) {
      sonnerToast.error(getErrorMessage(error));
    }
  }, [deletingQuestion, deleteMutation, sonnerToast]);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.checklist_questions.overview_title")}
          subtitle={t("pages.checklist_questions.overview_sub")}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            {/* Stats */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-3 gap-2">
              <StatCard
                label="Total questions"
                value={questions.length}
                icon={ClipboardList}
                accent="primary"
              />
              <StatCard
                label="Active today"
                value={questions.filter((q) => q.is_active).length}
                icon={CheckCircle2}
                accent="success"
              />
              <StatCard
                label="Filtered results"
                value={filtered.length}
                icon={Search}
                accent="warning"
              />
            </div>

            {/* Meta bar */}
            <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
              <p className="text-[11px] text-muted-foreground shrink-0">
                {isLoading ? (
                  <span className="text-muted-foreground/50">Loading…</span>
                ) : (
                  <>
                    <span className="font-bold text-foreground">{filtered.length}</span>{" "}
                    {filtered.length === 1 ? "question" : "questions"}
                  </>
                )}
              </p>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search questions…"
                    className="w-40 sm:w-56 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                  {searchInput && (
                    <button
                      onClick={() => setSearchInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <Button
                  size="sm"
                  className="h-[30px] px-3 text-[10px] rounded-[6px] gap-1.5"
                  onClick={openCreate}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add question</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              {isError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <p className="text-[12px] font-semibold text-destructive">
                    Failed to load questions
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Check your connection and try again
                  </p>
                </div>
              ) : !isLoading && filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                    <ClipboardList className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      {searchInput ? "No questions match your search" : "No questions yet"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {searchInput
                        ? "Try a different keyword"
                        : "Add the first checklist question to get started"}
                    </p>
                  </div>
                  {searchInput ? (
                    <button
                      onClick={() => setSearchInput("")}
                      className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                    >
                      Clear search
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      className="mt-1 h-8 px-4 text-[11px] rounded-[6px] gap-1.5"
                      onClick={openCreate}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add first question
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-[11px]">
                      <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold w-10">#</th>
                          <th className="text-left px-4 py-3 font-semibold">Question</th>
                          <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Section</th>
                          <th className="text-left px-4 py-3 font-semibold">Flags</th>
                          <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Created</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <SkeletonRows />
                        ) : (
                          filtered.map((q, i) => (
                            <QuestionRow
                              key={q.id}
                              q={q}
                              index={i}
                              onView={setViewingQuestion}
                              onEdit={openEdit}
                              onDelete={setDeletingQuestion}
                              isDeleting={isDeleting && deletingQuestion?.id === q.id}
                            />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden flex flex-col gap-2">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-28 rounded-[6px] border border-border/60 bg-card animate-pulse"
                        />
                      ))
                      : filtered.map((q, i) => (
                        <QuestionCard
                          key={q.id}
                          q={q}
                          index={i}
                          onView={setViewingQuestion}
                          onEdit={openEdit}
                          onDelete={setDeletingQuestion}
                          isDeleting={isDeleting && deletingQuestion?.id === q.id}
                        />
                      ))}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* View details panel */}
      <ViewDetailsPanel
        question={viewingQuestion}
        onClose={() => setViewingQuestion(null)}
        onEdit={(q) => { setViewingQuestion(null); openEdit(q); }}
      />

      {/* Create / Edit panel */}
      <QuestionPanel
        mode={panelMode}
        question={selectedQuestion}
        onClose={closePanel}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete confirm panel */}
      <DeleteConfirmPanel
        question={deletingQuestion}
        onClose={() => setDeletingQuestion(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
}

export default ChecklistQuestions;

