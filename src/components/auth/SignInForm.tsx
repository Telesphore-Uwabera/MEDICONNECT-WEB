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
import { loginPassword, requestOtp, verifyOtp } from "@/lib/auth-store";
import { Eye, EyeOff, Mail, Lock, Smartphone, ArrowRight } from "lucide-react";

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "auth.errors.unknown";
};

const SignInForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      loginPassword(identifier, password);
      onSuccess();
    } catch (err: unknown) {
      toast.error(t(getErrorMessage(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const onSendOtp = async () => {
    setIsLoading(true);
    try {
      const { code } = requestOtp(phone);
      setOtpSent(true);
      toast.success(t("auth.otp_sent") + ` (${code})`);
    } catch (err: unknown) {
      toast.error(t(getErrorMessage(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      verifyOtp(phone, otp);
      onSuccess();
    } catch (err: unknown) {
      toast.error(t(getErrorMessage(err)));
    } finally {
      setIsLoading(false);
    }
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
              className="w-full h-10 mt-1 rounded-sm font-semibold text-primary-foreground text-xs transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 group bg-gradient-primary"
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
                    placeholder="+250788..."
                    className={inputCls}
                    required
                  />
                </div>
                {!otpSent && (
                  <button
                    type="button"
                    onClick={onSendOtp}
                    disabled={isLoading || !phone}
                    className="px-3 h-10 rounded-sm text-[11px] font-semibold text-primary-foreground whitespace-nowrap transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-primary"
                  >
                    {isLoading ? (
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
                      className="font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      {t("auth.resend", "Resend")}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="w-full h-10 rounded-sm font-semibold text-primary-foreground text-xs transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 group bg-gradient-primary"
                  >
                    {isLoading ? (
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
