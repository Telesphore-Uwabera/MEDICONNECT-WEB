import { useTranslation } from "react-i18next";

export function HeroHeadline() {
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        .hero-headline {
          font-family: "Plus Jakarta Sans", Inter, sans-serif;
          font-size: clamp(2.25rem, 4.6vw, 4.25rem);
          font-weight: 700;
          line-height: 1.08;
          letter-spacing: -0.04em;
          text-align: left;
          max-width: 14ch;
        }

        .hero-line {
          display: block;
          color: hsl(var(--foreground));
          white-space: normal;
          word-break: break-word;
        }

        .hero-line-nowrap { white-space: nowrap; }

        .hero-line + .hero-line { margin-top: 0.05em; }

        .hero-accent {
          color: hsl(var(--primary));
          position: relative;
          display: inline-block;
        }

        .hero-accent::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0.04em;
          height: 0.12em;
          width: 100%;
          border-radius: 99px;
          background: hsl(var(--primary) / 0.22);
          z-index: -1;
        }

        @media (min-width: 768px) { .hero-headline { line-height: 1.05; } }

        @media (max-width: 480px) {
          .hero-line-nowrap { white-space: normal; }
          .hero-headline { font-size: clamp(2rem, 9vw, 2.5rem); max-width: 12ch; }
        }

        @media (max-width: 340px) {
          .hero-headline { font-size: clamp(1.25rem, 6.5vw, 1.6rem); letter-spacing: -0.02em; }
        }
      `}</style>

      <h1 className="hero-headline">
        <span className="hero-line">
          {t("pages.landing.hero_instant_virtual", { defaultValue: "Instant Virtual" })}{" "}
          {t("pages.landing.hero_consultation", { defaultValue: "Consultation." })}
        </span>
        <span className="hero-line">
          {t("pages.landing.hero_quality_care", { defaultValue: "Quality Care," })}
        </span>
        <span className="hero-line">
          <span className="hero-accent">
            {t("pages.landing.hero_anywhere", { defaultValue: "Anywhere." })}
          </span>
        </span>
      </h1>
    </>
  );
}