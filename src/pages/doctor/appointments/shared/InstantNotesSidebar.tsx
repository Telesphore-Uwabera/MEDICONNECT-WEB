import { useRef, useEffect } from "react";
import { FileText, X } from "lucide-react";
import { useCallStore } from "@/context/CallStore";

interface Props {
  onClose: () => void;
}

const TEMPLATES = ["Chief complaint", "Current medications", "Allergies", "Assessment", "Plan"];

export function InstantNotesSidebar({ onClose }: Props) {
  const call = useCallStore();
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const insertTemplate = (tpl: string) => {
    const prefix = `${tpl}:\n`;
    const next = call.callNotes ? `${call.callNotes}\n\n${prefix}` : prefix;
    call.updateCallNotes(next);
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
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] font-semibold">Call notes</span>
          {call.activeRequest && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              — {call.activeRequest.patientName.split(" ")[0]}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-[6px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quick insert templates */}
      <div className="px-3 py-2.5 border-b border-border/60 shrink-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Quick insert
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl}
              onClick={() => insertTemplate(tpl)}
              className="text-[10px] px-2 py-1 rounded-[6px] border border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
            >
              {tpl}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textRef}
        value={call.callNotes}
        onChange={(e) => call.updateCallNotes(e.target.value)}
        placeholder={`Type consultation notes here…\n\nNotes are auto-saved and attached to this appointment.`}
        className="flex-1 w-full resize-none bg-transparent text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 outline-none px-4 py-3 font-mono"
      />

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border/60 shrink-0 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground/50">{call.callNotes.length} chars · auto-saved</span>
        <button
          onClick={() => call.updateCallNotes("")}
          className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
