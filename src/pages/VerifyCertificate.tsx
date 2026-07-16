// Public fitness-certificate verification page.
// URL: /fitness-certificates/verify/:certificateNumber
// API: GET /public/verify/{certificateNumber} — no auth required.
// Anyone with the QR code / certificate number (employer, school, official)
// lands here to confirm the certificate is real and see its key details.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldX,
  Loader2,
  FileText,
  User,
  Stethoscope,
  Calendar,
  CalendarX,
  Building2,
  Search,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";
import { useVerifyCertificate } from "@/hooks/public/use-verify-certificate";
import TopBar from "@/components/landing/TopBar";
import { HeroHeader } from "@/components/landing/HeroHeader";
import { usePublicSettings } from "@/hooks/use-public-settings";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-[13px] font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export default function VerifyCertificate() {
  const { t } = useTranslation();
  const params = useParams<{ certificateNumber: string }>();
  const routeNumber = params.certificateNumber
    ? decodeURIComponent(params.certificateNumber).trim()
    : undefined;
  const { resolvedTheme, theme } = useTheme();
  const logo = (resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT;

  // Lets a visitor look up a different number from the same page without
  // needing to re-navigate — pre-filled with whatever was in the URL.
  const [lookupInput, setLookupInput] = useState(routeNumber ?? "");
  const [activeNumber, setActiveNumber] = useState(routeNumber);

  useEffect(() => {
    if (!routeNumber) return;
    setLookupInput(routeNumber);
    setActiveNumber(routeNumber);
  }, [routeNumber]);

  const { data, isLoading, isError, error, refetch } = useVerifyCertificate(activeNumber);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupInput.trim();
    if (!trimmed) return;
    if (trimmed === activeNumber) {
      refetch();
    } else {
      setActiveNumber(trimmed);
    }
  };

  // Backend may either throw a non-2xx for an unknown certificate, or return
  // 200 with { valid: false }. Treat both the same way.
  const isValid = data?.valid === true && !!data.certificate;
  const isKnownInvalid = data?.valid === false || (isError && !!activeNumber);
  const cert = data?.certificate;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

const { data: publicSettings } = usePublicSettings();
  const publicPayload = publicSettings as any;

 const generalSettings =publicPayload?.general ?? publicPayload?.settings ?? publicPayload ?? {};

  return (
    <>
      <TopBar settings={generalSettings} />
      <HeroHeader
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background flex flex-col items-center px-4 py-10 sm:py-16">
  
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <h1 className="text-lg font-bold text-foreground">{t("pages.verify_certificate.title")}</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("pages.verify_certificate.subtitle")}
          </p>
        </div>

        {/* Lookup box */}
        <form
          onSubmit={handleLookup}
          className="mb-4 flex items-center gap-2 rounded-[6px] border border-border bg-card p-1.5 shadow-sm"
        >
          <Search className="h-4 w-4 text-muted-foreground ml-1.5 shrink-0" />
          <input
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder={t("pages.verify_certificate.placeholder")}
            className="flex-1 h-8 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
          />
          <button
            type="submit"
            className="h-8 px-3 rounded-[5px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors shrink-0"
          >
            {t("pages.verify_certificate.verify")}
          </button>
        </form>

        {/* Result card */}
        {!activeNumber ? (
          <div className="rounded-[6px] border border-border bg-card p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-[12px] text-muted-foreground">
              {t("pages.verify_certificate.enter_number")}
            </p>
          </div>
        ) : isLoading ? (
          <div className="rounded-[6px] border border-border bg-card p-10 flex flex-col items-center gap-2 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-[12px] text-muted-foreground">{t("pages.verify_certificate.verifying")}</p>
          </div>
        ) : isValid && cert ? (
          <div className="rounded-[6px] border border-emerald-500/30 bg-card overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-4 bg-emerald-500/8 border-b border-emerald-500/20">
              <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-emerald-700">{t("pages.verify_certificate.valid_title")}</p>
                <p className="text-[11px] text-emerald-700/80">
                  {data.message || t("pages.verify_certificate.valid_message")}
                </p>
              </div>
            </div>

            <div className="px-4 py-2">
              <DetailRow icon={BadgeCheck} label={t("pages.verify_certificate.certificate_number")} value={cert.certificate_number} />
              <DetailRow icon={User} label={t("pages.verify_certificate.patient")} value={cert.patient_name} />
              <DetailRow icon={FileText} label={t("pages.verify_certificate.purpose")} value={cert.purpose} />
              <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <Stethoscope className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("pages.verify_certificate.decision")}
                  </p>
                  <span
                    className={cn(
                      "inline-flex mt-0.5 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                      cert.decision === "fit"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {cert.decision?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <DetailRow icon={Stethoscope} label={t("pages.verify_certificate.issued_by")} value={cert.issued_by} />
              <DetailRow icon={Calendar} label={t("pages.verify_certificate.issued_at")} value={cert.issued_at} />
              <DetailRow icon={CalendarX} label={t("pages.verify_certificate.valid_until")} value={cert.valid_until} />
              <DetailRow icon={Building2} label={t("pages.verify_certificate.platform")} value={cert.platform} />
            </div>
          </div>
        ) : isKnownInvalid ? (
          <div className="rounded-[6px] border border-destructive/30 bg-card overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-4 bg-destructive/8">
              <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                <ShieldX className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-destructive">{t("pages.verify_certificate.invalid_title")}</p>
                <p className="text-[11px] text-destructive/80">
                  {data?.message ||
                    (error as Error | undefined)?.message ||
                    t("pages.verify_certificate.not_found")}
                </p>
              </div>
            </div>
            <div className="px-4 py-3 text-[11px] text-muted-foreground">
              {t("pages.verify_certificate.invalid_help")}
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          {t("pages.verify_certificate.powered_by")}</p>
      </div>
    </div></>
    
  );
}
