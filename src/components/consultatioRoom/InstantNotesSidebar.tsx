import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, X, Check, Loader2 } from "lucide-react";
import { useSaveInstantNotes } from "@/hooks/doctor/use-doctor-appointment";
import { useDebounce } from "@/hooks/use-debounce";

interface Props {
  onClose: () => void;
  consultationId?: number;
  patientName?: string;
}

const TEMPLATE_KEYS = [
  "tpl_chief_complaint",
  "tpl_current_medications",
  "tpl_allergies",
  "tpl_assessment",
  "tpl_plan",
];

// Notes are kept per-consultation in localStorage so they survive a page
// refresh (the call itself now persists too) and never bleed between different
// consultations. There is no GET endpoint for instant notes, so this local copy
// is also what we re-open with.
const notesKey = (id?: number) => (id != null ? `instant_notes:${id}` : null);

function readLocalNotes(id?: number): string {
  const key = notesKey(id);
  if (!key) return "";
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function InstantNotesSidebar({ onClose, consultationId, patientName }: Props) {
  const { t } = useTranslation();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const saveNotes = useSaveInstantNotes();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Local, consultation-scoped notes (seeded from localStorage).
  const [notes, setNotes] = useState<string>(() => readLocalNotes(consultationId));

  // Re-seed when switching to a different consultation.
  useEffect(() => {
    setNotes(readLocalNotes(consultationId));
    setSaveStatus("idle");
    // We only want this when the consultation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId]);

  // Track whether the user has actually edited, so the initial seeded value is
  // never auto-saved (which previously could PUT an empty string and wipe
  // server-side notes).
  const dirtyRef = useRef(false);

  const debouncedNotes = useDebounce(notes, 1500);

  useEffect(() => {
    if (!dirtyRef.current) return;
    if (consultationId == null) return;

    // Mirror locally first so a refresh restores the latest text immediately.
    const key = notesKey(consultationId);
    if (key) {
      try {
        localStorage.setItem(key, debouncedNotes);
      } catch {
        /* storage unavailable — saving to the server still proceeds */
      }
    }

    setSaveStatus("saving");
    saveNotes.mutate(
      { id: consultationId, notes: debouncedNotes },
      {
        onSuccess: () => setSaveStatus("saved"),
        onError: () => setSaveStatus("error"),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedNotes, consultationId]);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  const updateNotes = (next: string) => {
    dirtyRef.current = true;
    setNotes(next);
  };

  const insertTemplate = (tpl: string) => {
    const prefix = `${tpl}:\n`;
    const next = notes ? `${notes}\n\n${prefix}` : prefix;
    updateNotes(next);
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.focus();
        textRef.current.setSelectionRange(next.length, next.length);
      }
    }, 0);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[12px] font-semibold">{t("consult.notes.title")}</span>
          {patientName && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              — {patientName}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close notes"
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quick insert templates */}
      <div className="px-3 py-2.5 border-b border-border/60 shrink-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          {t("consult.notes.quick_insert")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_KEYS.map((key) => {
            const label = t(`consult.notes.${key}`);
            return (
              <button
                key={key}
                onClick={() => insertTemplate(label)}
                className="text-[10px] px-2 py-1 rounded-md border border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textRef}
        value={notes}
        onChange={(e) => updateNotes(e.target.value)}
        placeholder={t("consult.notes.placeholder")}
        className="flex-1 w-full resize-none bg-transparent text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 outline-none px-4 py-3 font-mono"
      />

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border/60 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
          <span>{t("consult.notes.chars", { count: notes.length })}</span>
          <span>·</span>
          {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> {t("consult.notes.saving")}</>}
          {saveStatus === "saved" && <><Check className="w-3 h-3 text-emerald-500" /> {t("consult.notes.saved")}</>}
          {saveStatus === "error" && <span className="text-red-400">{t("consult.notes.save_failed")}</span>}
          {saveStatus === "idle" && <span>{t("consult.notes.autosaved")}</span>}
        </div>
        <button
          onClick={() => updateNotes("")}
          className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
        >
          {t("consult.notes.clear")}
        </button>
      </div>
    </div>
  );
}
