import { useTranslation } from "react-i18next";

export function HeroHeadline() {
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap');

        .hero-headline {
          font-family: 'Bricolage Grotesque', var(--font-display), sans-serif;
          font-size: clamp(1.75rem, 5.5vw, 3.25rem);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -0.03em;
          text-align: left;
          max-width: 100%;
        }

        .hero-line {
          display: block;
          color: var(--foreground);
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
          bottom: -3px;
          height: 3px;
          width: 100%;
          border-radius: 99px;
          background: hsl(var(--primary));
          transform-origin: left;
          animation: hero-underline 3s ease-in-out infinite;
        }

        @keyframes hero-underline {
          0%, 100% { transform: scaleX(1); opacity: 1; }
          50% { transform: scaleX(0.6); opacity: 0.5; }
        }

        @media (min-width: 768px) { .hero-headline { line-height: 1.06; } }

        @media (max-width: 480px) {
          .hero-line-nowrap { white-space: normal; }
          .hero-headline { font-size: clamp(1.5rem, 7vw, 2rem); }
        }

        @media (max-width: 340px) {
          .hero-headline { font-size: clamp(1.25rem, 6.5vw, 1.6rem); letter-spacing: -0.02em; }
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
        <span className="hero-line">
          <span className="hero-accent">
            {t("pages.landing.hero_anywhere", { defaultValue: "Anywhere." })}
          </span>
        </span>
      </h1>
    </>
  );
}