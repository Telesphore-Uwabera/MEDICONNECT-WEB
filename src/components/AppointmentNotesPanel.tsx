// components/AppointmentNotesPanel.tsx
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { RichTextarea, richTextToPlainText } from "@/components/ui/rich-textarea";
import {
  FileText, X, Video, MapPin, Calendar, Clock,
  ChevronDown, ChevronUp, Save, Clipboard,
} from "lucide-react";
import { AppointmentContext, useCallStore } from "@/context/CallStore";

interface AppointmentNotesPanelProps {
  appt: AppointmentContext;
  onClose: () => void;
}

const TEMPLATES = [
  { label: "Chief complaint", text: "Chief complaint:\n" },
  { label: "History", text: "History of present illness:\n" },
  { label: "Medications", text: "Current medications:\n" },
  { label: "Allergies", text: "Allergies:\n" },
  { label: "Examination", text: "Physical examination:\n" },
  { label: "Assessment", text: "Assessment:\n" },
  { label: "Plan", text: "Plan:\n" },
  { label: "Follow-up", text: "Follow-up:\n" },
];

export function AppointmentNotesPanel({ appt, onClose }: AppointmentNotesPanelProps) {
  const call = useCallStore();
  const notes = call.appointmentNotes[appt.id] ?? "";
  const textRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const plainNotes = richTextToPlainText(notes);

  useEffect(() => { textRef.current?.focus(); }, []);

  const update = (v: string) => call.updateAppointmentNotes(appt.id, v);

  const insertTemplate = (text: string) => {
    const safeText = text.replace(/:?\s*$/, "");
    const nextBlock = `<p><strong>${safeText}:</strong></p>`;
    const next = notes ? `${notes}${nextBlock}` : nextBlock;
    update(next);
    setTimeout(() => textRef.current?.focus(), 0);
  };

  const handleCopy = async () => {
    if (!plainNotes) return;
    await navigator.clipboard.writeText(plainNotes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = plainNotes.trim() ? plainNotes.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[12px] font-semibold leading-tight">Consultation notes</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{appt.specialty}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copy notes"
            className={cn(
              "h-7 w-7 rounded-[6px] flex items-center justify-center transition-colors text-muted-foreground",
              copied
                ? "bg-emerald-500/10 text-emerald-600"
                : "hover:bg-muted hover:text-foreground",
            )}
          >
            {copied
              ? <Save className="h-3.5 w-3.5" />
              : <Clipboard className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Patient info card (collapsible) ── */}
      <div className="shrink-0 border-b border-border/60">
        <button
          onClick={() => setInfoOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Appointment info
          </span>
          {infoOpen
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />}
        </button>
        {infoOpen && (
          <div className="px-4 pb-3 space-y-2">
            <div className="rounded-[6px] bg-muted/40 border border-border/60 p-3 space-y-2">
              {/* Patient */}
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {appt.specialty.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{appt.patientLabel}</p>
                  <p className="text-[10px] text-muted-foreground">{appt.specialty}</p>
                </div>
              </div>
              {/* Meta */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{appt.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{appt.time}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground col-span-2">
                  {appt.type === "video"
                    ? <Video className="h-3 w-3 shrink-0 text-sky-500" />
                    : <MapPin className="h-3 w-3 shrink-0 text-amber-500" />}
                  <span className="capitalize">{appt.type} consultation</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick-insert templates ── */}
      <div className="px-4 py-2.5 border-b border-border/60 shrink-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Quick insert
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map(({ label, text }) => (
            <button
              key={label}
              onClick={() => insertTemplate(text)}
              className="text-[10px] px-2 py-1 rounded-[6px] border border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Textarea ── */}
      <RichTextarea
        ref={textRef}
        value={notes}
        onChange={update}
        placeholder={`Consultation notes for ${appt.specialty}…\n\nUse Quick insert above to add structured sections, or type freely.\n\nNotes are saved automatically per appointment.`}
        className="flex-1 min-h-0 border-0 rounded-none focus-within:ring-0 focus-within:ring-offset-0"
        editorClassName="h-full text-[12px] leading-relaxed"
        minHeight={280}
      />

      {/* ── Footer ── */}
      <div className="px-4 py-2.5 border-t border-border/60 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground/50">
          <span>{plainNotes.length} chars</span>
          <span>·</span>
          <span>{wordCount} words</span>
          <span>·</span>
          <span className="text-emerald-600 dark:text-emerald-500">auto-saved</span>
        </div>
        <button
          onClick={() => update("")}
          disabled={!plainNotes}
          className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
