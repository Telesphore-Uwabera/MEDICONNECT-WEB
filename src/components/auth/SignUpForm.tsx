import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useRegister } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/getErrorMessage";
import TermsDrawer from "@/components/auth/TermsDrawer";
import type { Role } from "@/types/auth";
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
  ShieldCheck,
  CircleDashed,
  PersonStanding,
  Users,
} from "lucide-react";

const ROLE_CONFIG = {
  patient: {
    icon: <UserRound className="w-3.5 h-3.5" />,
    color: "bg-primary/10 text-primary border-primary/30",
  },
  doctor: {
    icon: <Stethoscope className="w-3.5 h-3.5" />,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/30",
  },
  hospital: {
    icon: <Building2 className="w-3.5 h-3.5" />,
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-500/30",
  },
  pharmacy: {
    icon: <Pill className="w-3.5 h-3.5" />,
    color: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/30",
  },
};

type Gender = "male" | "female" | "other";

const GENDER_CONFIG: Record<Gender, { icon: React.ReactNode; color: string; label: string }> = {
  male: {
    icon: <PersonStanding className="w-3.5 h-3.5" />,
    color: "bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-500/30",
    label: "auth.gender_male",
  },
  female: {
    icon: <Users className="w-3.5 h-3.5" />,
    color: "bg-pink-500/10 text-pink-600 border-pink-200 dark:border-pink-500/30",
    label: "auth.gender_female",
  },
  other: {
    icon: <CircleDashed className="w-3.5 h-3.5" />,
    color: "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-500/30",
    label: "auth.gender_other",
  },
};

// Simple, permissive email shape check — good enough to catch obvious typos
// without rejecting valid-but-unusual addresses. Only used for non-patient
// roles, where email is mandatory.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  role: Role;
  gender: Gender | "";
  password: string;
  confirm: string;
}

const SignUpForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t, i18n } = useTranslation();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    countryCode: "+250",
    role: "patient",
    gender: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const register = useRegister();

  // Email is optional for patients, required (and validated) for every other role.
  const emailRequired = form.role !== "patient";

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onRoleChange = (v: string) => {
    setForm((f) => ({ ...f, role: v as Role }));
    setAcceptedTerms(false);
  };

  const onGenderChange = (v: string) => {
    setForm((f) => ({ ...f, gender: v as Gender }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Email rules: mandatory + format-checked for everyone except patients.
    // Patients may submit with email left blank, but if they did type
    // something in, it still has to look like a real address.
    if (emailRequired && !form.email.trim()) {
      return toast.error(t("auth.errors.email_required", "Email is required for this role"));
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      return toast.error(t("auth.errors.email_invalid", "Please enter a valid email address"));
    }

    if (form.password !== form.confirm)
      return toast.error(t("auth.errors.passwords_mismatch"));
    if (!acceptedTerms)
      return toast.error(t("auth.errors.accept_terms", "Please accept the terms and conditions"));
    if (!form.gender)
      return toast.error(t("auth.errors.gender_required", "Please select your gender"));

    register.mutate(
      {
        name: form.name,
        email: form.email.trim() || undefined,
        phone: form.phone,
        country_code: form.countryCode,
        role: form.role,
        gender: form.gender,
        password: form.password,
        password_confirmation: form.confirm,
        accepted_terms: acceptedTerms,
      },
      {
        onSuccess: () => {
          toast.success(t("auth.signup_success", "Account created! Please sign in."));
          onSuccess();
        },
        onError: (err: unknown) => {
          toast.error(getErrorMessage(err)) 
        },
      }
    );
  };

  const inputCls =
    "h-10 rounded-[6px] border-border bg-muted/50 text-xs focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 pl-9 text-foreground placeholder:text-muted-foreground";

  const inputNoIconCls =
    "h-10 rounded-[6px] border-border bg-muted/50 text-xs focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-foreground placeholder:text-muted-foreground";

  return (
    <>
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
            onValueChange={onRoleChange}
            className="grid grid-cols-2 gap-1.5"
          >
            {(["patient", "doctor", "hospital", "pharmacy"] as Role[]).map((r) => {
              const config = ROLE_CONFIG[r as keyof typeof ROLE_CONFIG];
              const isSelected = form.role === r;
              return (
                <label
                  key={r}
                  className={`flex items-center gap-2 rounded-[6px] px-2.5 py-2 cursor-pointer border-2 transition-all duration-200 ${isSelected
                      ? `${config.color}`
                      : "border-border bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted"
                    }`}
                >
                  <RadioGroupItem value={r} className="sr-only" />
                  <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center ${isSelected ? "bg-card/60" : "bg-muted"}`}>
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
                      <svg className="w-2 h-2 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </label>
              );
            })}
          </RadioGroup>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("auth.name")}
          </label>
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={form.name} onChange={set("name")} className={inputCls} placeholder="ISHIMWE Jean" required />
          </div>
        </div>

        {/* Email — required for every role except patient */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("auth.email")}
            {!emailRequired && (
              <span className="ml-1 font-normal text-muted-foreground/70 normal-case tracking-normal">
                ({t("auth.optional", "optional")})
              </span>
            )}
          </label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="text"
              inputMode="email"
              value={form.email}
              onChange={set("email")}
              className={inputCls}
              placeholder="email@example.com"
              required={emailRequired}
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
                maxLength={10}
                minLength={10}
                required
              />
            </div>
          </div>
        </div>

        {/* Gender selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("auth.gender", "Gender")}
          </label>
          <RadioGroup
            value={form.gender}
            onValueChange={onGenderChange}
            className="grid grid-cols-3 gap-1.5"
          >
            {(["male", "female", "other"] as Gender[]).map((g) => {
              const config = GENDER_CONFIG[g];
              const isSelected = form.gender === g;
              return (
                <label
                  key={g}
                  className={`flex items-center gap-2 rounded-[6px] px-2.5 py-2 cursor-pointer border-2 transition-all duration-200 ${isSelected
                      ? config.color
                      : "border-border bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted"
                    }`}
                >
                  <RadioGroupItem value={g} className="sr-only" />
                  <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 ${isSelected ? "bg-card/60" : "bg-muted"}`}>
                    {config.icon}
                  </div>
                  <span className="text-[11px] font-semibold truncate">
                    {t(config.label, g.charAt(0).toUpperCase() + g.slice(1))}
                  </span>
                  {isSelected && (
                    <motion.div
                      layoutId="gender-check"
                      className="ml-auto w-3.5 h-3.5 rounded-full bg-current opacity-70 flex items-center justify-center shrink-0"
                    >
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </label>
              );
            })}
          </RadioGroup>
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
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Terms acceptance row */}
        {acceptedTerms ? (
          <div className="flex items-center justify-between rounded-[6px] px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {t("auth.terms_accepted", "Terms & conditions accepted")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAcceptedTerms(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors"
            >
              {t("auth.terms_revoke", "Revoke")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-full flex items-center gap-2.5 rounded-[6px] px-3 py-2.5 border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group text-left"
          >
            <div className="w-6 h-6 rounded-[6px] bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {t("auth.terms_read_prompt", "Read & accept terms")}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {t("auth.terms_read_sub", "Role-specific + general terms required")}
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        )}

        <button
          type="submit"
          disabled={register.isPending || !acceptedTerms}
          className="w-full h-10 mt-1 rounded-[6px] font-semibold text-primary-foreground text-xs transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 group bg-gradient-primary"
        >
          {register.isPending ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              {t("auth.submit_signup")}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </motion.form>

      <TermsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        role={form.role}
        onAccept={() => setAcceptedTerms(true)}
      />
    </>
  );
};

export default SignUpForm;
