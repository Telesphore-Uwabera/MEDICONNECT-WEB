import { useTranslation } from "react-i18next";

export function HeroHeadline() {
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&display=swap');

        .hero-headline {
          font-family: 'Bricolage Grotesque', var(--font-display), sans-serif;
          font-size: clamp(1.5rem, 3vw, 2.75rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
          text-align: left;
        }

        .hero-line {
          display: block;
          color: var(--foreground);
          white-space: normal;
        }

        .hero-line-nowrap {
          white-space: nowrap;
        }

        @media (max-width: 380px) {
          .hero-line-nowrap {
            white-space: normal;
          }
        }

        .hero-accent {
          color: hsl(var(--primary));
        }
      `}</style>

      <h1 className="hero-headline">
        <span className="hero-line hero-line-nowrap">
          {t("pages.landing.hero_instant_virtual", { defaultValue: "Instant Virtual" })}{" "}
          {t("pages.landing.hero_consultation", { defaultValue: "Consultation." })}
        </span>
        <span className="hero-line">
          {t("pages.landing.hero_quality_care", { defaultValue: "Quality Care," })}
        </span>
        <span className="hero-line hero-accent">
          {t("pages.landing.hero_anywhere", { defaultValue: "Anywhere." })}
        </span>
      </h1>
    </>
  );
}

