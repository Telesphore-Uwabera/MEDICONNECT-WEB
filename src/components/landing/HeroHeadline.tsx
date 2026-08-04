import { useTranslation } from "react-i18next";

export function HeroHeadline() {
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&display=swap');

        .hero-headline {
          font-family: 'Bricolage Grotesque', var(--font-display), sans-serif;
          font-size: clamp(1.375rem, 5vw, 2.75rem);
          font-weight: 700;
          line-height: 1.12;
          letter-spacing: clamp(-0.02em, -0.015em, -0.01em);
          text-align: left;
          max-width: 100%;
        }

        .hero-line {
          display: block;
          color: var(--foreground);
          white-space: normal;
          word-break: break-word;
        }

        .hero-line-nowrap {
          white-space: nowrap;
        }

        /* Tablets and small laptops: font can afford a touch more room */
        @media (min-width: 768px) {
          .hero-headline {
            line-height: 1.1;
          }
        }

        /* Small phones: force wrap on the normally-nowrap line */
        @media (max-width: 480px) {
          .hero-line-nowrap {
            white-space: normal;
          }
        }

        /* Very small / narrow phones: tighten further so nothing overflows */
        @media (max-width: 340px) {
          .hero-headline {
            font-size: clamp(1.2rem, 6vw, 1.5rem);
            letter-spacing: -0.01em;
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