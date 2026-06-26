// ─────────────────────────────────────────────────────────────────────────────
// Shared primitive UI components for Doctor Profile step forms
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

// ── FormField ────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField = ({
  label,
  error,
  children,
  className = "",
}: FormFieldProps) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <Label className="text-[10px] text-muted-foreground">{label}</Label>
    {children}
    {error && <p className="text-[10px] text-destructive">{error}</p>}
  </div>
);

// ── EntryCard ────────────────────────────────────────────────────────────────
interface EntryCardProps {
  children: React.ReactNode;
  onRemove: () => void;
}

export const EntryCard = React.memo(function EntryCard({
  children,
  onRemove,
}: EntryCardProps) {
  return (
    <div className="relative rounded-[6px] border border-border bg-muted/50 p-4 pr-10">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});
