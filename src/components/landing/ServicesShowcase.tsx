import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ExternalLink, ImageIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RichTextRenderer, richTextToPlainText } from "@/components/ui/rich-textarea";
import { useGetPublicServices, type ApiService } from "@/hooks/use-services";
import { cn } from "@/lib/utils";

function fieldForLanguage(service: ApiService, field: "title" | "description", language: string) {
  const normalized = language.toLowerCase();
  const suffix = normalized.startsWith("fr")
    ? "fr"
    : normalized.startsWith("rw") || normalized.startsWith("kiny")
      ? "kiny"
      : "en";

  return (
    service[`${field}_${suffix}` as keyof ApiService] ||
    service[`${field}_en` as keyof ApiService] ||
    service[`${field}_fr` as keyof ApiService] ||
    service[`${field}_kiny` as keyof ApiService] ||
    ""
  ) as string;
}

function isExternalUrl(value?: string | null) {
  return /^https?:\/\//i.test(value ?? "");
}

function ServiceImage({ service, title, className }: { service: ApiService; title: string; className?: string }) {
  if (service.image_url) {
    return <img src={service.image_url} alt={title} className={cn("h-full w-full object-cover", className)} loading="lazy" />;
  }

  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-primary/10 text-primary", className)}>
      <ImageIcon className="h-10 w-10" />
    </div>
  );
}

export default function ServicesShowcase() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useGetPublicServices({ per_page: 12 });
  const [selected, setSelected] = useState<ApiService | null>(null);

  const services = useMemo(
    () =>
      (data?.data ?? [])
        .filter((service) => service.is_active)
        .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.id - b.id),
    [data],
  );

  if (!isLoading && services.length === 0) return null;

  const selectedTitle = selected ? fieldForLanguage(selected, "title", i18n.language) : "";
  const selectedDescription = selected ? fieldForLanguage(selected, "description", i18n.language) : "";

  return (
    <div className="mt-10">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            {t("pages.landing.services_eyebrow", { defaultValue: "Our Services" })}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("pages.landing.services_showcase_title", { defaultValue: "Everything you need in one place" })}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
            {t("pages.landing.services_showcase_subtitle", {
              defaultValue: "Explore MediConnect services and choose the care path that fits your need.",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[260px] animate-pulse rounded-[6px] border border-border bg-card" />
            ))
          : services.map((service) => {
              const title = fieldForLanguage(service, "title", i18n.language);
              const description = richTextToPlainText(fieldForLanguage(service, "description", i18n.language));

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelected(service)}
                  className="group overflow-hidden rounded-[6px] border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-primary/10">
                    <ServiceImage service={service} title={title} className="transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-base font-black leading-snug text-foreground">{title}</h3>
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {description || t("pages.landing.service_no_description", { defaultValue: "View service details and continue." })}
                    </p>
                  </div>
                </button>
              );
            })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                  {t("pages.landing.service_details", { defaultValue: "Service details" })}
                </p>
                <h3 className="mt-1 text-xl font-black text-foreground">{selectedTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-[6px] p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={t("pages.landing.close", { defaultValue: "Close" })}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-150px)] overflow-y-auto">
              <div className="aspect-[21/8] min-h-[170px] overflow-hidden bg-primary/10">
                <ServiceImage service={selected} title={selectedTitle} />
              </div>
              <div className="p-5">
                <RichTextRenderer
                  value={selectedDescription}
                  fallback={<p className="text-sm text-muted-foreground">{t("pages.landing.service_no_description")}</p>}
                  className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border p-5 sm:flex-row sm:justify-end">
              <Button variant="outline" className="rounded-[6px]" onClick={() => setSelected(null)}>
                {t("pages.landing.close", { defaultValue: "Close" })}
              </Button>
              {selected.redirect_url && (
                <Button asChild className="rounded-[6px]">
                  {isExternalUrl(selected.redirect_url) ? (
                    <a href={selected.redirect_url} target="_blank" rel="noopener noreferrer">
                      {t("pages.landing.explore_service", { defaultValue: "Explore service" })}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  ) : (
                    <Link to={selected.redirect_url}>
                      {t("pages.landing.explore_service", { defaultValue: "Explore service" })}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
