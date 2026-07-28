import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ExternalLink, ImageIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  RichTextRenderer,
  richTextToPlainText,
} from "@/components/ui/rich-textarea";
import { useGetPublicServices, type ApiService } from "@/hooks/use-services";
import { cn } from "@/lib/utils";

function fieldForLanguage(
  service: ApiService,
  field: "title" | "description",
  language: string,
) {
  const normalized = language.toLowerCase();
  const suffix = normalized.startsWith("fr")
    ? "fr"
    : normalized.startsWith("rw") || normalized.startsWith("kiny")
      ? "kiny"
      : "en";

  return (service[`${field}_${suffix}` as keyof ApiService] ||
    service[`${field}_en` as keyof ApiService] ||
    service[`${field}_fr` as keyof ApiService] ||
    service[`${field}_kiny` as keyof ApiService] ||
    "") as string;
}

function isExternalUrl(value?: string | null) {
  return /^https?:\/\//i.test(value ?? "");
}

function ServiceImage({
  service,
  title,
  className,
}: {
  service: ApiService;
  title: string;
  className?: string;
}) {
  if (service.image_url) {
    return (
      <img
        src={service.image_url}
        alt={title}
        className={cn("h-full w-full object-cover", className)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-primary/10 text-primary",
        className,
      )}
    >
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

  const selectedTitle = selected
    ? fieldForLanguage(selected, "title", i18n.language)
    : "";
  const selectedDescription = selected
    ? fieldForLanguage(selected, "description", i18n.language)
    : "";

  const onClose = () => {
    setSelected(null);
  };
  
  return (
    <div className="mt-10">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            {t("pages.landing.services_eyebrow", {
              defaultValue: "Our Services",
            })}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("pages.landing.services_showcase_title", {
              defaultValue: "Everything you need in one place",
            })}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
            {t("pages.landing.services_showcase_subtitle", {
              defaultValue:
                "Explore MediConnect services and choose the care path that fits your need.",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[260px] animate-pulse rounded-[6px] border border-border bg-card"
              />
            ))
          : services.map((service) => {
              const title = fieldForLanguage(service, "title", i18n.language);
              const description = richTextToPlainText(
                fieldForLanguage(service, "description", i18n.language),
              );

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelected(service)}
                  className="group overflow-hidden rounded-[6px] border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-primary/10">
                    <ServiceImage
                      service={service}
                      title={title}
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-base font-black leading-snug text-foreground">
                        {title}
                      </h3>
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {description ||
                        t("pages.landing.service_no_description", {
                          defaultValue: "View service details and continue.",
                        })}
                    </p>
                  </div>
                </button>
              );
            })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/80 bg-card shadow-2xl animate-slideUp sm:max-h-[85vh] sm:max-w-lg sm:rounded-[6px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 z-10 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Photo area — changed to portrait-friendly 4/5 ratio */}
            <div className="relative aspect-[5/3] w-full shrink-0 overflow-hidden bg-muted">
              {selected.image_url ? (
                <>
                  <img
                    src={selected.image_url}
                    alt={selectedTitle}
                    className={`absolute inset-0 h-full w-full object-contain  object-center transition-opacity duration-300 ${
                      selected.image_url ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {/* Skeleton loader */}
                  {!selected.image_url && (
                    <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
                  )}
                </>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary/10">
                  <span className="text-5xl font-medium text-primary">
                    {t("pages.landing.service_details", {
                      defaultValue: "Service details",
                    })}
                  </span>
                </div>
              )}

              {/* Bottom gradient for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Name + title overlaid on photo */}
              <div className="absolute bottom-4 left-4 right-10">
                <h3 className="text-lg font-semibold text-white leading-tight drop-shadow-sm">
                  {selectedTitle}
                </h3>
              </div>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3.5 pb-5">
              <RichTextRenderer
                value={selectedDescription}
                fallback={
                  <p className="text-sm text-muted-foreground">
                    {t("pages.landing.service_no_description")}
                  </p>
                }
                className="prose prose-sm max-w-none text-foreground dark:prose-invert"
              />

              {/* Stats */}
              <div className="mt-4 grid grid-cols-1 gap-2">
                {selected.redirect_url && (
                  <Button asChild className="rounded-[6px]">
                    {isExternalUrl(selected.redirect_url) ? (
                      <a
                        href={selected.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("pages.landing.explore_service", {
                          defaultValue: "Explore service",
                        })}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    ) : (
                      <Link to={selected.redirect_url}>
                        {t("pages.landing.explore_service", {
                          defaultValue: "Explore service",
                        })}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .animate-fadeIn { animation: fadeIn 0.15s ease; }
        .animate-slideUp { animation: slideUp 0.2s ease; }
      `}</style>
        </div>
      )}
    </div>
  );
}
