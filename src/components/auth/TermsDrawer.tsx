import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { Role } from "@/types/auth";
import { useTerms } from "@/hooks/Terms/useTerms";

interface TermsDrawerProps {
  open: boolean;
  onClose: () => void;
  role: Role;
  onAccept: () => void;
}

const ROLE_LABELS = {
  patient: "Patient",
  doctor: "Doctor",
  hospital: "Health Facility",
  pharmacy: "Pharmacy",
};

// Single terms section with scroll tracking
const TermsSection = ({
  title,
  content,
  isLoading,
  isError,
  sectionIndex,
  readSections,
  onRead,
}: {
  title: string;
  content?: string;
  isLoading: boolean;
  isError: boolean;
  sectionIndex: number;
  readSections: Set<number>;
  onRead: (idx: number) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRead = readSections.has(sectionIndex);
  // Track if we've already fired onRead for this mount to avoid loops
  const firedRef = useRef(false);

  const checkIfReadable = useCallback(() => {
    const el = scrollRef.current;
    if (!el || firedRef.current) return;
    const noScrollNeeded = el.scrollHeight <= el.clientHeight;
    const scrolledToBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
    if (noScrollNeeded || scrolledToBottom) {
      firedRef.current = true;
      onRead(sectionIndex);
    }
  }, [onRead, sectionIndex]);

  // Reset firedRef whenever readSections no longer contains this section
  // (happens when role changes and parent resets readSections)
  useEffect(() => {
    if (!isRead) {
      firedRef.current = false;
    }
  }, [isRead]);

  // Re-check whenever content finishes loading
  useEffect(() => {
    if (!isLoading && !isError && content) {
      const timer = setTimeout(checkIfReadable, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isError, content, checkIfReadable]);

  return (
    <div className="rounded-[6px] border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/60 border-b border-border">
        <div className="flex items-center gap-2">
          {isRead ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
          )}
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        {!isRead && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            Scroll to read <ChevronDown className="w-3 h-3" />
          </span>
        )}
        {isRead && (
          <span className="text-[10px] text-emerald-500 font-medium">Read ✓</span>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={checkIfReadable}
        className="h-52 overflow-y-auto px-4 py-3 bg-card text-xs text-muted-foreground leading-relaxed"
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading terms…</span>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center h-full gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load terms. Please try again.</span>
          </div>
        )}
        {!isLoading && !isError && content && (
          <div
            className="prose prose-xs dark:prose-invert max-w-none
              prose-headings:text-foreground prose-headings:text-xs prose-headings:font-semibold
              prose-p:text-muted-foreground prose-p:text-xs prose-p:leading-relaxed
              prose-li:text-muted-foreground prose-li:text-xs
              prose-strong:text-foreground"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </div>
  );
};

const TermsDrawer = ({ open, onClose, role, onAccept }: TermsDrawerProps) => {
  const { t, i18n } = useTranslation();
  const [readSections, setReadSections] = useState<Set<number>>(new Set());

  const roleTerms = useTerms(role, open);
  const generalTerms = useTerms("general", open);

  // Reset read state when drawer opens or role changes
  useEffect(() => {
    if (open) setReadSections(new Set());
  }, [open, role]);

  const onRead = (idx: number) =>
    setReadSections((prev) => new Set([...prev, idx]));

  const allRead = readSections.has(0) && readSections.has(1);

  const handleAccept = () => {
    if (!allRead) return;
    onAccept();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {t("auth.terms_drawer_title", "Terms & Conditions")}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("auth.terms_drawer_sub", "Please read and scroll through all sections to accept")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress indicator */}
            <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${(readSections.size / 2) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                  {readSections.size}/2 read
                </span>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Role-specific terms */}
              <TermsSection
                title={`${ROLE_LABELS[role]} Terms & Conditions`}
                content={roleTerms.data?.content}
                isLoading={roleTerms.isLoading}
                isError={roleTerms.isError}
                sectionIndex={0}
                readSections={readSections}
                onRead={onRead}
              />

              {/* General terms */}
              <TermsSection
                title="General Terms & Conditions"
                content={generalTerms.data?.content}
                isLoading={generalTerms.isLoading}
                isError={generalTerms.isError}
                sectionIndex={1}
                readSections={readSections}
                onRead={onRead}
              />
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border bg-card shrink-0 space-y-3">
              {!allRead && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Scroll through both sections above to enable acceptance
                </p>
              )}
              <button
                onClick={handleAccept}
                disabled={!allRead}
                className="w-full h-10 rounded-[6px] font-semibold text-primary-foreground text-xs transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 bg-gradient-primary"
              >
                {allRead ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("auth.terms_accept", "I Accept All Terms")}
                  </>
                ) : (
                  t("auth.terms_read_all", "Read all sections to continue")
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TermsDrawer;
