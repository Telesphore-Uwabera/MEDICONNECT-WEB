import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, Smartphone, ArrowRight } from "lucide-react";
import { useLogin, useSendOtp, useVerifyOtp } from "@/hooks/useAuth";

const SignInForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState<"password" | "otp">("password");

  // password fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // otp fields
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const login = useLogin();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const isLoading = login.isPending || sendOtp.isPending || verifyOtp.isPending;

  // ── Password login ──────────────────────────────────
  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEmail = identifier.includes("@");
    // const payload = isEmail
    //   ? { email: identifier, auth_method: "password" as const, password }
    //   : { phone: identifier, country_code: "+250", auth_method: "password" as const, password };
    const payload = {
      email: "pharmacy@mediconnect.rw",
      auth_method: "password",
      password: "Pharmacy@2026!",
    };

    login.mutate(payload, {
      onSuccess: () => onSuccess(),
      onError: (err: any) => {
        const msg = err?.response?.data?.message ?? t("auth.errors.unknown");
        toast.error(msg);
      },
    });
  };

  // ── Send OTP ────────────────────────────────────────
  const onSendOtp = () => {
    sendOtp.mutate(
      { phone, country_code: "+250", type: "login" },
      {
        onSuccess: () => {
          setOtpSent(true);
          toast.success(t("auth.otp_sent"));
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? t("auth.errors.unknown");
          toast.error(msg);
        },
      },
    );
  };

  // ── Verify OTP ──────────────────────────────────────
  const onVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtp.mutate(
      { phone, country_code: "+250", code: otp, type: "login" },
      {
        onSuccess: () => onSuccess(),
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? t("auth.errors.unknown");
          const attemptsLeft = err?.response?.data?.attempts_remaining;
          toast.error(
            attemptsLeft ? `${msg} (${attemptsLeft} attempts left)` : msg,
          );
        },
      },
    );
  };

  const inputCls =
    "h-10 rounded-sm border-border bg-muted/50 text-xs focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 pl-9 text-foreground placeholder:text-muted-foreground";

  return (
    <div>
      {/* ── Method toggle ── */}
      <div className="relative flex bg-muted/80 rounded-sm p-1.5 border border-border mb-4">
        <motion.div
          className="absolute top-1.5 bottom-1.5 rounded-sm bg-card border border-border"
          animate={{
            left: method === "password" ? "6px" : "50%",
            width: "calc(50% - 6px)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 33 }}
        />
        {(["password", "otp"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold rounded-sm transition-colors duration-200 flex items-center justify-center gap-1 ${
              method === m
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "password" ? (
              <>
                <Lock className="w-3 h-3" />
                {t("auth.method_password")}
              </>
            ) : (
              <>
                <Smartphone className="w-3 h-3" />
                {t("auth.method_otp")}
              </>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {method === "password" ? (
          <motion.form
            key="password"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            onSubmit={onPassword}
            className="space-y-3"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("auth.email")} / {t("auth.phone")}
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={inputCls}
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("auth.password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-9`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 bg-card"
                />
                <span className="text-[10px] text-muted-foreground">
                  {t("auth.remember_me", "Remember me")}
                </span>
              </label>
              <button
                type="button"
                className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {t("auth.forgot_password", "Forgot password?")}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-1 rounded-sm font-semibold text-primary-foreground text-xs transition-all duration-200  active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 group bg-gradient-primary"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {t("auth.submit_signin")}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="otp"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            onSubmit={onVerify}
            className="space-y-3"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("auth.phone")}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0781234567"
                    className={inputCls}
                    required
                  />
                </div>
                {!otpSent && (
                  <button
                    type="button"
                    onClick={onSendOtp}
                    disabled={isLoading || !phone}
                    className="px-3 h-10 rounded-sm text-[11px] font-semibold text-primary-foreground whitespace-nowrap transition-all  active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-primary"
                  >
                    {sendOtp.isPending ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      t("auth.send_otp")
                    )}
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {otpSent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("auth.otp_label")}
                    </label>
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup className="gap-1.5">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className="h-10 w-10 rounded-sm border-border bg-muted/50 text-sm font-bold focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">
                      {t("auth.code_sent_to", "Code sent to")} {phone}
                    </span>
                    <button
                      type="button"
                      onClick={onSendOtp}
                      disabled={sendOtp.isPending}
                      className="font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                      {t("auth.resend", "Resend")}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="w-full h-10 rounded-sm font-semibold text-primary-foreground text-xs transition-all duration-200  active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 group bg-gradient-primary"
                  >
                    {verifyOtp.isPending ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        {t("auth.verify_otp")}
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignInForm;
