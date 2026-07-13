import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Smartphone } from "lucide-react";
import { useForgotPassword, useResetPassword, type PasswordResetIdentifier } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Step = "contact" | "reset";
type ResetMethod = "email" | "phone";

function buildIdentifier(method: ResetMethod, email: string, phone: string, countryCode: string): PasswordResetIdentifier {
  return method === "email"
    ? { email: email.trim() }
    : { phone: phone.trim(), country_code: countryCode.trim() || "+250" };
}

const ForgotPasswordForm = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("contact");
  const [method, setMethod] = useState<ResetMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+250");

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();

  const isLoading = forgotPassword.isPending || resetPassword.isPending;
  const identifier = useMemo(
    () => buildIdentifier(method, email, phone, countryCode),
    [method, email, phone, countryCode],
  );
  const contactLabel = method === "email" ? email.trim() : `${countryCode.trim() || "+250"} ${phone.trim()}`.trim();
  const canSend = method === "email" ? email.trim().length > 0 : phone.trim().length > 0;

  const inputCls =
    "h-10 rounded-[6px] border-border bg-muted/50 text-xs focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 pl-9 text-foreground placeholder:text-muted-foreground";

  const onSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    forgotPassword.mutate(identifier, {
      onSuccess: (data) => {
        toast.success(data.message ?? t("auth.otp_sent"));
        setStep("reset");
      },
      onError: (err: any) => toast.error(err?.message ?? t("auth.errors.unknown")),
    });
  };

  const onResend = () => {
    if (!canSend) return;
    forgotPassword.mutate(identifier, {
      onSuccess: () => toast.success(t("auth.otp_sent")),
      onError: (err: any) => toast.error(err?.message ?? t("auth.errors.unknown")),
    });
  };

  const onReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast.error(t("auth.errors.password_mismatch", "Passwords do not match"));
      return;
    }

    resetPassword.mutate(
      { ...identifier, otp, password, password_confirmation: passwordConfirmation },
      {
        onSuccess: (data) => {
          toast.success(data.message ?? t("auth.reset_success", "Password reset successfully"));
          onBack();
        },
        onError: (err: any) => toast.error(err?.message ?? t("auth.errors.unknown")),
      },
    );
  };

  return (
    <div>
      <button
        type="button"
        onClick={step === "reset" ? () => setStep("contact") : onBack}
        className="mb-4 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        {step === "reset"
          ? t("auth.back_to_contact", "Change email or phone")
          : t("auth.back_to_signin", "Back to sign in")}
      </button>

      <AnimatePresence mode="wait">
        {step === "contact" ? (
          <motion.form
            key="contact-step"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            onSubmit={onSendOtp}
            className="space-y-3"
          >
            <div className="mb-4">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                {t("auth.forgot_title", "Reset your password")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("auth.forgot_sub", "Enter your email or phone number and we'll send you a reset code")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-[6px] border border-border/60 bg-muted/30 p-1">
              {(["email", "phone"] as ResetMethod[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMethod(option)}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1.5 rounded-[5px] text-[11px] font-semibold transition-colors",
                    method === option
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                >
                  {option === "email" ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                  {option === "email" ? t("auth.email") : t("auth.phone")}
                </button>
              ))}
            </div>

            {method === "email" ? (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("auth.phone")}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    value={countryCode}
                    hidden
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-10 rounded-[6px] border-border bg-muted/50 px-3 text-xs text-foreground outline-none transition-all duration-200 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20"
                    placeholder="+250"
                    required
                  />
                  <div className="relative">
                    <Smartphone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputCls}
                      placeholder="0786420000"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !canSend}
              className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-[6px] bg-gradient-primary text-xs font-semibold text-primary-foreground transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 group"
            >
              {forgotPassword.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <>
                  {t("auth.send_reset_code", "Send reset code")}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
              <h2 className="text-base font-bold tracking-tight text-foreground">
                {t("auth.reset_title", "Enter new password")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("auth.reset_sub", "Enter the code sent to")} <span className="font-semibold text-foreground">{contactLabel}</span>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("auth.otp_label")}
              </label>
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup className="gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-10 w-10 rounded-[6px] border-border bg-muted/50 text-sm font-bold text-foreground transition-all focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {[
              {
                label: t("auth.new_password", "New password"),
                value: password,
                onChange: setPassword,
                show: showPassword,
                setShow: setShowPassword,
              },
              {
                label: t("auth.confirm_password", "Confirm password"),
                value: passwordConfirmation,
                onChange: setPasswordConfirmation,
                show: showConfirm,
                setShow: setShowConfirm,
              },
            ].map((field) => (
              <div key={field.label} className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={field.show ? "text" : "password"}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className={`${inputCls} pr-9`}
                    placeholder="********"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => field.setShow(!field.show)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {field.show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-end text-[10px]">
              <button
                type="button"
                onClick={onResend}
                disabled={forgotPassword.isPending}
                className="font-semibold text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
              >
                {t("auth.resend", "Resend code")}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6 || !password || !passwordConfirmation}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[6px] bg-gradient-primary text-xs font-semibold text-primary-foreground transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 group"
            >
              {resetPassword.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <>
                  {t("auth.reset_password", "Reset password")}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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