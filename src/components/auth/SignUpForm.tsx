import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Role, signup } from "@/lib/auth-store";
import {
  User,
  Mail,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  UserRound,
  Stethoscope,
  Building2,
  Pill,
} from "lucide-react";

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "auth.errors.unknown";
};

interface SignUpFormState {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  role: Role;
  password: string;
  confirm: string;
}

const ROLE_CONFIG = {
  patient: {
    icon: <UserRound className="w-3.5 h-3.5" />,
    color: "bg-primary/10 text-primary border-primary/30",
  },
  doctor: {
    icon: <Stethoscope className="w-3.5 h-3.5" />,
    color:
      "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/30",
  },
  hospital: {
    icon: <Building2 className="w-3.5 h-3.5" />,
    color:
      "bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-500/30",
  },
  pharmacy: {
    icon: <Pill className="w-3.5 h-3.5" />,
    color:
      "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/30",
  },
};

const SignUpForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<SignUpFormState>({
    name: "",
    email: "",
    phone: "",
    countryCode: "+250",
    role: "patient",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const set =
    (k: keyof SignUpFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password)
      return toast.error(t("auth.errors.required"));
    if (form.password !== form.confirm)
      return toast.error(t("auth.errors.passwords_mismatch"));

    setIsLoading(true);
    try {
      signup({
        name: form.name,
        email: form.email,
        phone: form.phone,
        countryCode: form.countryCode,
        role: form.role,
        password: form.password,
      });
      onSuccess();
    } catch (err: unknown) {
      toast.error(t(getErrorMessage(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    "h-10 rounded-sm border-border bg-muted/50 text-xs focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 pl-9 text-foreground placeholder:text-muted-foreground";

  const inputNoIconCls =
    "h-10 rounded-sm border-border bg-muted/50 text-xs focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-foreground placeholder:text-muted-foreground";

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={onSubmit}
      className="space-y-3"
    >
      {/* Role selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("auth.role")}
        </label>
        <RadioGroup
          value={form.role}
          onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
          className="grid grid-cols-2 gap-1.5"
        >
          {(["patient", "doctor", "hospital", "pharmacy"] as Role[]).map(
            (r) => {
              const config = ROLE_CONFIG[r];
              const isSelected = form.role === r;
              return (
                <label
                  key={r}
                  className={`flex items-center gap-2 rounded-sm px-2.5 py-2 cursor-pointer border-2 transition-all duration-200 ${
                    isSelected
                      ? `${config.color} shadow-sm`
                      : "border-border bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted"
                  }`}
                >
                  <RadioGroupItem value={r} className="sr-only" />
                  <div
                    className={`w-6 h-6 rounded-sm flex items-center justify-center ${isSelected ? "bg-card/60" : "bg-muted"}`}
                  >
                    {config.icon}
                  </div>
                  <span className="text-[11px] font-semibold">
                    {t(`auth.role_${r}`)}
                  </span>
                  {isSelected && (
                    <motion.div
                      layoutId="role-check"
                      className="ml-auto w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center"
                    >
                      <svg
                        className="w-2 h-2 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  )}
                </label>
              );
            },
          )}
        </RadioGroup>
      </div>

      {/* Name */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("auth.name")}
        </label>
        <div className="relative">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={form.name}
            onChange={set("name")}
            className={inputCls}
            placeholder="John Doe"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("auth.email")}
        </label>
        <div className="relative">
          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="email"
            value={form.email}
            onChange={set("email")}
            className={inputCls}
            placeholder="email@example.com"
            required
          />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("auth.phone")}
        </label>
        <div className="flex gap-2">
          <div className="w-20">
            <Input
              value={form.countryCode}
              onChange={set("countryCode")}
              className={`${inputNoIconCls} text-center font-medium`}
              placeholder="+250"
            />
          </div>
          <div className="relative flex-1">
            <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={form.phone}
              onChange={set("phone")}
              placeholder="0781234567"
              className={inputCls}
              required
            />
          </div>
        </div>
      </div>

      {/* Password row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("auth.password")}
          </label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
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
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("auth.confirm_password")}
          </label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type={showConfirm ? "text" : "password"}
              value={form.confirm}
              onChange={set("confirm")}
              className={`${inputCls} pr-9`}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 accent-primary shrink-0 cursor-pointer"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          {t("auth.terms_prefix")}{" "}
          <a href="#" className="text-primary font-semibold no-underline hover:text-primary/80 transition-colors">
            {t("auth.terms_link")}
          </a>{" "}
          {t("auth.terms_and")}{" "}
          <a href="#" className="text-primary font-semibold no-underline hover:text-primary/80 transition-colors">
            {t("auth.privacy_link")}
          </a>
        </span>
      </label>

      <button
        type="submit"
        disabled={isLoading || !acceptedTerms}
        className="w-full h-10 mt-1 rounded-sm font-semibold text-primary-foreground text-xs transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 group bg-gradient-primary"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
        ) : (
          <>
            {t("auth.submit_signup")}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </motion.form>
  );
};

export default SignUpForm;
