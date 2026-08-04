import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { useLogin } from "@/hooks/useAuth";
import ForgotPasswordForm from "./ForgotPasswordForm";
import { validatePhoneForCountry } from "@/lib/phone-validation";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";

// SignInForm
const SignInForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t, i18n } = useTranslation();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [showForgot, setShowForgot] = useState(false);

  // email fields
  const [email, setEmail] = useState("");

  // phone fields
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+250");

  // shared
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const login = useLogin();
  const isLoading = login.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (method === "email") {
      login.mutate(
        { email, auth_method: "password" as const, password },
        {
          onSuccess: (_data) => {
            // token is saved in the hook's onSuccess; navigate is handled by useMe
          },
          onError: (err: any) => {
            const msg = err?.message ?? t("auth.errors.unknown");
            toast.error(msg);
          },
        },
      );
      return;
    }

    // method === "phone"
    const phoneValidation = validatePhoneForCountry(phone, phoneCountryCode);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.message);
      return;
    }

    login.mutate(
      {
        phone: phoneValidation.normalizedPhone,
        country_code: phoneValidation.normalizedCountryCode,
        auth_method: "password" as const,
        password,
      },
      {
        onSuccess: (_data) => {
          // token is saved in the hook's onSuccess; navigate is handled by useMe
        },
        onError: (err: any) => {
          const msg = err?.message ?? t("auth.errors.unknown");
          toast.error(msg);
        },
      },
    );
  };

  const inputCls =
    "h-10 rounded-[6px] border-border bg-muted/50 text-xs focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 pl-9 text-foreground placeholder:text-muted-foreground";

  return (
    <AnimatePresence mode="wait">
      {showForgot ? (
        <motion.div
          key="forgot"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          <ForgotPasswordForm onBack={() => setShowForgot(false)} />
        </motion.div>
      ) : (
        <motion.div
          key="signin-methods"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          {/* Method toggle */}
          <div className="relative flex bg-muted/80 rounded-[6px] p-1.5 border border-border mb-4">
            <motion.div
              className="absolute top-1.5 bottom-1.5 rounded-[6px] bg-card border border-border"
              animate={{
                left: method === "email" ? "6px" : "50%",
                width: "calc(50% - 6px)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 33 }}
            />
            {(["email", "phone"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold rounded-[6px] transition-colors duration-200 flex items-center justify-center gap-1 ${method === m
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {m === "email" ? (
                  <>
                    <Mail className="w-3 h-3" />
                    {t("auth.method_email", "Email")}
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3 h-3" />
                    {t("auth.method_phone", "Phone Number")}
                  </>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={method}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              onSubmit={onSubmit}
              className="space-y-3"
            >
              {method === "email" ? (
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
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("auth.phone")}
                  </label>
                  <div className="flex gap-2">
                    <div className="w-24">
                      <CountryCodeSelect
                        value={phoneCountryCode}
                        onChange={setPhoneCountryCode}
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputCls}
                        placeholder="0781234567"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

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
                    placeholder="Password"
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
                  onClick={() => setShowForgot(true)}
                  className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {t("auth.forgot_password", "Forgot password?")}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 mt-1 rounded-[6px] font-semibold text-primary-foreground text-xs transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 group bg-gradient-primary"
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
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SignInForm;