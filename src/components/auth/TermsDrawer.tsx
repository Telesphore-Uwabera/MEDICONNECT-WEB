import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import {
  usePublicLegalDocument,
  type LegalDocument,
} from "@/hooks/Terms/useTerms";

interface TermsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called once both Terms & Conditions and Privacy Policy have been scrolled through and accepted. */
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

const TermsDrawer = ({ open, onClose, onAccept }: TermsDrawerProps) => {
  const { t, i18n } = useTranslation();
  const [hasRead, setHasRead] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  // Same admin-managed Legal Documents shown publicly on /terms and /privacy —
  // fetched together so both render in one continuous scroll.
  const termsDoc = usePublicLegalDocument("terms", open);
  const privacyDoc = usePublicLegalDocument("privacy", open);

  const termsTitle =
    localizedField(termsDoc.data, "title", i18n.language) || t("pages.legal.terms_title");
  const termsContent = localizedField(termsDoc.data, "content", i18n.language);

  const privacyTitle =
    localizedField(privacyDoc.data, "title", i18n.language) || t("pages.legal.privacy_title");
  const privacyContent = localizedField(privacyDoc.data, "content", i18n.language);

  const isLoading = termsDoc.isLoading || privacyDoc.isLoading;
  const isError = termsDoc.isError && privacyDoc.isError;
  const bothLoaded = !isLoading && (termsContent || privacyContent);

  // Reset read-state every time the modal is freshly opened
  useEffect(() => {
    if (open) {
      setHasRead(false);
      firedRef.current = false;
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [open]);

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

  // Re-check once content has actually rendered
  useEffect(() => {
    if (bothLoaded) {
      const timer = setTimeout(checkIfReadable, 150);
      return () => clearTimeout(timer);
    }
  }, [bothLoaded, checkIfReadable]);

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
                  <h2 className="text-sm font-bold text-foreground truncate">
                    {t("auth.terms_privacy_label", "Terms & Conditions and Privacy Policy")}
                  </h2>
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

              {/* Scrollable content — both documents, one continuous scroll */}
              <div
                ref={scrollRef}
                onScroll={checkIfReadable}
                className="flex-1 min-h-0 overflow-y-auto px-5 py-4 bg-card text-xs text-muted-foreground leading-relaxed"
              >
                {isLoading && (
                  <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("pages.legal.loading_terms", "Loading…")}</span>
                  </div>
                )}

                {isError && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span>{t("pages.legal.no_current_terms")}</span>
                  </div>
                )}

                {!isLoading && !isError && (
                  <>
                    {/* ── Terms & Conditions section ── */}
                    <section>
                      <h3 className="text-sm font-bold text-foreground mb-3">
                        {termsTitle}
                      </h3>
                      {termsDoc.isError || !termsContent ? (
                        <p className="text-muted-foreground">
                          {t("pages.legal.no_current_terms")}
                        </p>
                      ) : (
                        <div
                          className="prose prose-xs dark:prose-invert max-w-none
                            prose-headings:text-foreground prose-headings:text-xs prose-headings:font-semibold
                            prose-p:text-muted-foreground prose-p:text-xs prose-p:leading-relaxed
                            prose-li:text-muted-foreground prose-li:text-xs
                            prose-strong:text-foreground"
                          dangerouslySetInnerHTML={{ __html: termsContent }}
                        />
                      )}
                    </section>

                    {/* ── Separator between the two documents ── */}
                    <div className="flex items-center gap-3 my-6">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                        {privacyTitle}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* ── Privacy Policy section ── */}
                    <section>
                      <h3 className="text-sm font-bold text-foreground mb-3">
                        {privacyTitle}
                      </h3>
                      {privacyDoc.isError || !privacyContent ? (
                        <p className="text-muted-foreground">
                          {t("pages.legal.no_current_privacy")}
                        </p>
                      ) : (
                        <div
                          className="prose prose-xs dark:prose-invert max-w-none
                            prose-headings:text-foreground prose-headings:text-xs prose-headings:font-semibold
                            prose-p:text-muted-foreground prose-p:text-xs prose-p:leading-relaxed
                            prose-li:text-muted-foreground prose-li:text-xs
                            prose-strong:text-foreground"
                          dangerouslySetInnerHTML={{ __html: privacyContent }}
                        />
                      )}
                    </section>
                  </>
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
                      {t("auth.terms_accept_all", "I Accept Both")}
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