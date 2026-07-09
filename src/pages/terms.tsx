import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, CalendarDays, FileText, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import TopBar from "@/components/landing/TopBar";
import { HeroHeader } from "@/components/landing/HeroHeader";
import Footer from "@/components/landing/Footer";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { usePublicLegalDocument, type LegalDocument } from "@/hooks/Terms/useTerms";

const languageSuffix = (language: string) => {
  const normalized = language.toLowerCase();
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("kiny") || normalized.startsWith("rw")) return "kiny";
  return "en";
};

const localizedField = (document: LegalDocument | undefined, field: "title" | "content", language: string) => {
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

const formatEffectiveDate = (value?: string | null) => {
  if (!value) return null;
  const [datePart] = value.split("T");
  return datePart || value;
};

const Terms = () => {
  const { i18n } = useTranslation();
  const { data: publicSettings } = usePublicSettings();
  const { data: document, isLoading, isError, refetch, isFetching } = usePublicLegalDocument("terms");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection] = useState("doctors");

  const publicPayload = publicSettings as any;
  const generalSettings = publicPayload?.general ?? publicPayload?.settings ?? publicPayload ?? {};
  const title = localizedField(document, "title", i18n.language) || "Terms & Conditions";
  const content = localizedField(document, "content", i18n.language);
  const effectiveDate = formatEffectiveDate(document?.effective_date);
  const privacyUrl = generalSettings?.privacy_url || "/privacy";
  const termsUrl = generalSettings?.terms_url || "/terms";

  return (
    <section className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TopBar settings={generalSettings} />
        <HeroHeader
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          activeSection={activeSection}
          settings={generalSettings}
        />
      </div>

      <main>
        <div className="border-b border-border bg-muted/30">
          <div className="container py-14 lg:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                Terms
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                {document?.version && (
                  <span className="inline-flex items-center gap-2 rounded-[6px] border border-border bg-background px-3 py-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Version {document.version}
                  </span>
                )}
                {effectiveDate && (
                  <span className="inline-flex items-center gap-2 rounded-[6px] border border-border bg-background px-3 py-2">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    Effective {effectiveDate}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container py-10 lg:py-14">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
            <article className="min-h-[360px] rounded-[6px] border border-border bg-card p-5 shadow-sm sm:p-8">
              {isLoading ? (
                <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                  Loading terms and conditions...
                </div>
              ) : isError ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Unable to load terms and conditions</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Please try again in a moment.</p>
                  </div>
                  <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCw className={isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                    Retry
                  </Button>
                </div>
              ) : content ? (
                <div
                  className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <div className="flex min-h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
                  No current terms and conditions document is available yet.
                </div>
              )}
            </article>

            <aside className="space-y-3">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-foreground">Legal URLs</p>
                <div className="mt-4 grid gap-2 text-sm">
                  <a href={termsUrl} className="text-primary hover:underline">Terms & conditions URL</a>
                  <a href={privacyUrl} className="text-primary hover:underline">Privacy URL</a>
                </div>
              </div>
              <Link to="/privacy">
                <Button variant="outline" className="w-full justify-between rounded-[6px]">
                  Privacy policy
                  <FileText className="h-4 w-4" />
                </Button>
              </Link>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </section>
  );
};

export default Terms;

