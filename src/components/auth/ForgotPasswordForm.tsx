import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import { useForgotPassword, useResetPassword } from "@/hooks/useAuth";

type Step = "email" | "reset";

const ForgotPasswordForm = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("email");

  // Step 1 — email
  const [email, setEmail] = useState("");

  // Step 2 — reset
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();

  const isLoading = forgotPassword.isPending || resetPassword.isPending;

  const inputCls =
    "h-10 rounded-sm border-border bg-muted/50 text-xs focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 pl-9 text-foreground placeholder:text-muted-foreground";

  // ── Step 1: send OTP to email ──
  const onSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate(
      { email },
      {
        onSuccess: (data) => {
          toast.success(data.message ?? t("auth.otp_sent"));
          setStep("reset");
        },
        onError: (err: any) => {
          const msg = err?.message ?? t("auth.errors.unknown");
          toast.error(msg);
        },
      },
    );
  };

  // ── Step 2: verify OTP + set new password ──
  const onReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast.error(t("auth.errors.password_mismatch", "Passwords do not match"));
      return;
    }
    resetPassword.mutate(
      { email, otp, password, password_confirmation: passwordConfirmation },
      {
        onSuccess: (data) => {
          toast.success(data.message ?? t("auth.reset_success", "Password reset successfully"));
          onBack(); // return to sign-in
        },
        onError: (err: any) => {
          const msg = err?.message ?? t("auth.errors.unknown");
          toast.error(msg);
        },
      },
    );
  };

  return (
    <div>
      {/* ── Back button + heading ── */}
      <button
        type="button"
        onClick={step === "reset" ? () => setStep("email") : onBack}
        className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-3 h-3" />
        {step === "reset" ? t("auth.back_to_email", "Change email") : t("auth.back_to_signin", "Back to sign in")}
      </button>

      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.form
            key="email-step"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            onSubmit={onSendOtp}
            className="space-y-3"
          >
            <div className="mb-4">
              <h2 className="text-base font-bold text-foreground tracking-tight">
                {t("auth.forgot_title", "Reset your password")}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t("auth.forgot_sub", "Enter your email and we'll send you a reset code")}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full h-10 mt-1 rounded-sm font-semibold text-primary-foreground text-xs transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 group bg-gradient-primary"
            >
              {forgotPassword.isPending ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {t("auth.send_reset_code", "Send reset code")}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="reset-step"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            onSubmit={onReset}
            className="space-y-3"
          >
            <div className="mb-4">
              <h2 className="text-base font-bold text-foreground tracking-tight">
                {t("auth.reset_title", "Enter new password")}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t("auth.reset_sub", "Enter the code sent to")} <span className="font-semibold text-foreground">{email}</span>
              </p>
            </div>

            {/* OTP */}
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

            {/* New password */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("auth.new_password", "New password")}
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
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("auth.confirm_password", "Confirm password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className={`${inputCls} pr-9`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Resend link */}
            <div className="flex items-center justify-end text-[10px]">
              <button
                type="button"
                onClick={() =>
                  forgotPassword.mutate(
                    { email },
                    {
                      onSuccess: () => toast.success(t("auth.otp_sent")),
                      onError: (err: any) => toast.error(err?.message ?? t("auth.errors.unknown")),
                    },
                  )
                }
                disabled={forgotPassword.isPending}
                className="font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {t("auth.resend", "Resend code")}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6 || !password || !passwordConfirmation}
              className="w-full h-10 rounded-sm font-semibold text-primary-foreground text-xs transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 group bg-gradient-primary"
            >
              {resetPassword.isPending ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {t("auth.reset_password", "Reset password")}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForgotPasswordForm;
