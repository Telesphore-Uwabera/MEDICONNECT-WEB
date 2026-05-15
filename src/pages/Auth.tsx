import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { dashboardPath, onboardingPath, currentUser } from "@/lib/auth-store";
import logo from "@/assets/mediconnect-logo.png";
import doctors from "@/assets/images/doctors.png";
import SignUpForm from "@/components/auth/SignUpForm";
import SignInForm from "@/components/auth/SignInForm";

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get("mode") === "signup" ? "signup" : "signin";
  const [tab, setTab] = useState<"signin" | "signup">(initialTab);

  const goAfterAuth = () => {
    const u = currentUser();
    if (!u) return;
    navigate(u.profileComplete ? dashboardPath(u.role) : dashboardPath(u.role));
  };

  const tabs = [
    { id: "signin" as const, label: t("auth.tab_signin") },
    { id: "signup" as const, label: t("auth.tab_signup") },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-border bg-card/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src={logo}
              alt="MEDICONNECT"
              className="h-7 w-auto transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="
            w-full max-w-6xl rounded-[2rem] overflow-hidden
            bg-card ring-1 ring-border
            flex flex-col
            md:grid md:grid-cols-[640px_1fr] 
            md:h-[720px] md:max-h-[87vh]
          "
        >
          {/* ── LEFT: Hero image panel — hidden on mobile ── */}
          <div className="relative overflow-hidden hidden md:block">
            <img
              src={doctors}
              alt="Healthcare professionals"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

            <svg
              className="absolute inset-0 w-full h-full opacity-[0.06]"
              viewBox="0 0 500 700"
              preserveAspectRatio="xMidYMid slice"
            >
              {[40, 80, 130, 190, 260, 340, 430].map((r, i) => (
                <ellipse
                  key={i}
                  cx="200"
                  cy="180"
                  rx={r}
                  ry={r * 0.6}
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                />
              ))}
            </svg>

            <div className="relative z-10 flex flex-col justify-end h-full p-6 pb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="mb-4"
              >
                <h2 className="text-lg font-bold text-white/95 leading-tight mb-1.5">
                  {t("auth.hero_title", "Healthcare at your fingertips")}
                </h2>
                <p className="text-xs text-white/60 leading-relaxed max-w-[260px]">
                  {t(
                    "auth.hero_sub",
                    "Connect with top medical professionals and manage your health journey seamlessly",
                  )}
                </p>
              </motion.div>

              <div className="flex flex-col gap-2.5">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="self-start bg-white/10 backdrop-blur-md rounded-sm px-3.5 py-2 flex items-center gap-2.5 border border-white/15 shadow-lg"
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-sm">💉</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white">
                      {t("auth.stat_patients_value")}
                    </p>
                    <p className="text-[9px] text-white/50">
                      {t("auth.stat_patients_label")}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75, duration: 0.5 }}
                  className="self-start bg-white/10 backdrop-blur-md rounded-sm px-3.5 py-2 flex items-center gap-2.5 border border-white/15 shadow-lg"
                >
                  <div className="w-7 h-7 rounded-md bg-teal-500/20 flex items-center justify-center">
                    <span className="text-sm">🩺</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white">
                      {t("auth.stat_recovery_value")}
                    </p>
                    <p className="text-[9px] text-white/50">
                      {t("auth.stat_recovery_label")}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            <span className="absolute top-6 right-10 text-white/30 text-sm animate-pulse">
              ✦
            </span>
            <span className="absolute top-28 left-8 text-white/20 text-xs">
              ✦
            </span>
          </div>

          {/* ── RIGHT: Auth form panel ── */}
          <div className="flex flex-col overflow-hidden bg-card">
            <div className="flex-1 flex flex-col overflow-y-auto px-6 py-6 md:px-8 md:py-8">
              {/* ── Tab Switcher ── */}
              <div className="relative mb-6">
                <div className="relative flex bg-muted/80 rounded-sm p-1.5 border border-border">
                  <motion.div
                    className="absolute top-1.5 bottom-1.5 rounded-sm bg-card border border-border"
                    initial={false}
                    animate={{
                      left: tab === "signin" ? "6px" : "50%",
                      width: "calc(50% - 6px)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 33 }}
                  />
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-sm transition-colors duration-200 ${
                        tab === t.id
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex items-center">
                <div className="w-full">
                  <AnimatePresence mode="wait">
                    {tab === "signin" ? (
                      <motion.div
                        key="signin"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="mb-14">
                          <h1 className="text-base font-bold text-foreground tracking-tight">
                            {t("auth.signin_title")}
                          </h1>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("auth.signin_sub")}
                          </p>
                        </div>
                        <SignInForm onSuccess={goAfterAuth} />
                        <p className="mt-4 text-xs text-center text-muted-foreground">
                          {t("auth.no_account")}{" "}
                          <button
                            onClick={() => setTab("signup")}
                            className="text-primary font-semibold hover:text-primary/80 transition-colors"
                          >
                            {t("auth.tab_signup")}
                          </button>
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="signup"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="mb-4">
                          <h1 className="text-base font-bold text-foreground tracking-tight">
                            {t("auth.signup_title")}
                          </h1>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("auth.signup_sub")}
                          </p>
                        </div>
                        <SignUpForm onSuccess={goAfterAuth} />
                        <p className="mt-4 text-xs text-center text-muted-foreground">
                          {t("auth.have_account")}{" "}
                          <button
                            onClick={() => setTab("signin")}
                            className="text-primary font-semibold hover:text-primary/80 transition-colors"
                          >
                            {t("auth.tab_signin")}
                          </button>
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Auth;
