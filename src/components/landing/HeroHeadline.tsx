import { useState, useEffect } from "react";

const slides = [
  { dynamic: "in expert hands" },
  { dynamic: "on your screen" },
  { dynamic: "at your pharmacy" },
  { dynamic: "one click away" },
  { dynamic: "certified" },
  { dynamic: "there for you" },
];

export function HeroHeadline() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
        setAnimating(false);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&display=swap');

        .hero-headline {
          font-family: 'Bricolage Grotesque', var(--font-display), sans-serif;
          font-size: clamp(1.55rem, 4.5vw, 3.1rem);
          font-weight: 650;
          line-height: 1.13;
          letter-spacing: -0.02em;
          text-align: center;
        }

        @media (min-width: 1024px) {
          .hero-headline {
            text-align: left;
          }
        }

        .hero-line2 {
          display: flex;
          align-items: baseline;
          gap: 0.45ch;
          justify-content: center;
          margin-top: clamp(0.25rem, 1vw, 0.5rem);
          flex-wrap: nowrap;
        }

        @media (min-width: 1024px) {
          .hero-line2 {
            justify-content: flex-start;
          }
        }

        .hero-static {
          color: var(--foreground);
          white-space: nowrap;
          font-weight: 650;
        }

        .hero-dynamic {
          color: hsl(var(--primary));
          display: inline-block;
          white-space: nowrap;
          font-weight: 700;
          font-style: italic;
        }
      `}</style>

      <h1 className="hero-headline">
        Your health —
        <span className="hero-line2">
          <span className="hero-static">always</span>
          <span
            className="hero-dynamic"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(12px)" : "translateY(0px)",
              transition: "opacity 0.35s ease, transform 0.35s ease",
            }}
          >
            {slides[current].dynamic}
          </span>
        </span>
      </h1>
    </>
  );
}