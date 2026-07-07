// Public fitness-certificate verification page.
// URL: /verify/:certificateNumber
// API: GET /public/verify/{certificateNumber} — no auth required.
// Anyone with the QR code / certificate number (employer, school, official)
// lands here to confirm the certificate is real and see its key details.

import { useState } from "react";
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
  const params = useParams<{ certificateNumber: string }>();
  const routeNumber = params.certificateNumber?.trim();
  const { resolvedTheme, theme } = useTheme();
  const logo = (resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT;

  // Lets a visitor look up a different number from the same page without
  // needing to re-navigate — pre-filled with whatever was in the URL.
  const [lookupInput, setLookupInput] = useState(routeNumber ?? "");
  const [activeNumber, setActiveNumber] = useState(routeNumber);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background flex flex-col items-center px-4 py-10 sm:py-16">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <img src={logo} alt="MediConnect" className="h-9 w-auto" />
      </Link>

      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <h1 className="text-lg font-bold text-foreground">Certificate Verification</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Confirm the authenticity of a MediConnect fitness certificate.
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
            placeholder="e.g. MC-FIT-3BEU-20260706-7290"
            className="flex-1 h-8 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
          />
          <button
            type="submit"
            className="h-8 px-3 rounded-[5px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors shrink-0"
          >
            Verify
          </button>
        </form>

        {/* Result card */}
        {!activeNumber ? (
          <div className="rounded-[6px] border border-border bg-card p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-[12px] text-muted-foreground">
              Enter a certificate number above to verify it.
            </p>
          </div>
        ) : isLoading ? (
          <div className="rounded-[6px] border border-border bg-card p-10 flex flex-col items-center gap-2 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-[12px] text-muted-foreground">Verifying certificate…</p>
          </div>
        ) : isValid && cert ? (
          <div className="rounded-[6px] border border-emerald-500/30 bg-card overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-4 bg-emerald-500/8 border-b border-emerald-500/20">
              <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-emerald-700">Certificate is valid</p>
                <p className="text-[11px] text-emerald-700/80">
                  {data.message || "This certificate is authentic."}
                </p>
              </div>
            </div>

            <div className="px-4 py-2">
              <DetailRow icon={BadgeCheck} label="Certificate Number" value={cert.certificate_number} />
              <DetailRow icon={User} label="Patient" value={cert.patient_name} />
              <DetailRow icon={FileText} label="Purpose" value={cert.purpose} />
              <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <Stethoscope className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Decision
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
              <DetailRow icon={Stethoscope} label="Issued By" value={cert.issued_by} />
              <DetailRow icon={Calendar} label="Issued At" value={cert.issued_at} />
              <DetailRow icon={CalendarX} label="Valid Until" value={cert.valid_until} />
              <DetailRow icon={Building2} label="Platform" value={cert.platform} />
            </div>
          </div>
        ) : isKnownInvalid ? (
          <div className="rounded-[6px] border border-destructive/30 bg-card overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-4 bg-destructive/8">
              <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                <ShieldX className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-destructive">Certificate not valid</p>
                <p className="text-[11px] text-destructive/80">
                  {data?.message ||
                    (error as Error | undefined)?.message ||
                    "We couldn't find a certificate matching this number."}
                </p>
              </div>
            </div>
            <div className="px-4 py-3 text-[11px] text-muted-foreground">
              Double-check the certificate number and try again, or contact the issuing doctor if you
              believe this is a mistake.
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Powered by MediConnect · Bringing care to your fingertips
        </p>
      </div>
    </div>
  );
}
