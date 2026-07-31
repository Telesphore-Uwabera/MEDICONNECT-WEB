import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import {
  usePublicLegalDocument,
  type LegalDocument,
  type LegalDocumentType,
} from "@/hooks/Terms/useTerms";

interface TermsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Which admin-managed Legal Document to show — each type gets its own
   *  standalone modal instance rather than combining both into one dialog. */
  type: LegalDocumentType;
  onAccept: () => void;
}

const languageSuffix = (language: string) => {
  const normalized = language.toLowerCase();
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("kiny") || normalized.startsWith("rw")) return "kiny";
  return "en";
};

const localizedField = (
  document: LegalDocument | undefined,
  field: "title" | "content",
  language: string,
) => {
  if (!document) return "";
  const suffix = languageSuffix(language);
  return (
    document[`${field}_${suffix}` as keyof LegalDocument] ||
    document[`${field}_en` as keyof LegalDocument] ||
    document[`${field}_fr` as keyof LegalDocument] ||
    document[`${field}_kiny` as keyof LegalDocument] ||
    ""
  ) as string;
};

const TermsDrawer = ({ open, onClose, type, onAccept }: TermsDrawerProps) => {
  const { t, i18n } = useTranslation();
  const [hasRead, setHasRead] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track if we've already fired the "read" flag for this open to avoid loops
  const firedRef = useRef(false);

  // Same admin-managed Legal Documents shown publicly on /terms and /privacy —
  // not the older, unmanaged role-based "page-setup" terms endpoint.
  const doc = usePublicLegalDocument(type, open);

  const fallbackTitle =
    type === "privacy" ? t("pages.legal.privacy_title") : t("pages.legal.terms_title");
  const title = localizedField(doc.data, "title", i18n.language) || fallbackTitle;
  const content = localizedField(doc.data, "content", i18n.language);

  // Reset read state whenever the modal opens
  useEffect(() => {
    if (open) {
      setHasRead(false);
      firedRef.current = false;
    }
  }, [open, type]);

  const checkIfReadable = useCallback(() => {
    const el = scrollRef.current;
    if (!el || firedRef.current) return;
    const noScrollNeeded = el.scrollHeight <= el.clientHeight;
    const scrolledToBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
    if (noScrollNeeded || scrolledToBottom) {
      firedRef.current = true;
      setHasRead(true);
    }
  }, []);

  // Re-check whenever content finishes loading
  useEffect(() => {
    if (!doc.isLoading && !doc.isError && content) {
      const timer = setTimeout(checkIfReadable, 150);
      return () => clearTimeout(timer);
    }
  }, [doc.isLoading, doc.isError, content, checkIfReadable]);

  const handleAccept = () => {
    if (!hasRead) return;
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

          {/* Centered modal, ~90% of the viewport */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              key="drawer"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[90vw] h-[90vh] max-w-3xl bg-card border border-border rounded-[6px] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-foreground truncate">{title}</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("auth.terms_drawer_sub", "Please scroll through to enable acceptance")}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable content */}
              <div
                ref={scrollRef}
                onScroll={checkIfReadable}
                className="flex-1 min-h-0 overflow-y-auto px-5 py-4 bg-card text-xs text-muted-foreground leading-relaxed"
              >
                {doc.isLoading && (
                  <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("pages.legal.loading_terms", "Loading…")}</span>
                  </div>
                )}
                {doc.isError && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span>
                      {type === "privacy"
                        ? t("pages.legal.no_current_privacy")
                        : t("pages.legal.no_current_terms")}
                    </span>
                  </div>
                )}
                {!doc.isLoading && !doc.isError && content && (
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

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border bg-card shrink-0 space-y-3">
                {!hasRead && (
                  <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                    {t("auth.terms_scroll_hint", "Scroll to the bottom to enable acceptance")}
                    <ChevronDown className="w-3 h-3" />
                  </p>
                )}
                <button
                  onClick={handleAccept}
                  disabled={!hasRead}
                  className="w-full h-10 rounded-[6px] font-semibold text-primary-foreground text-xs transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 bg-gradient-primary"
                >
                  {hasRead ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t("auth.terms_accept", "I Accept")}
                    </>
                  ) : (
                    t("auth.terms_read_all", "Read to continue")
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TermsDrawer;
