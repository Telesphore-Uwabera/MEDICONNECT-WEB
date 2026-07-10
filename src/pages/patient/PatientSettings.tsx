

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

import { toast as sonnerToast } from "sonner";
import {
  User,
  Lock,
  Mail,
  Phone,
  Trash2,
  Camera,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  KeyRound,
  UserCog,
  Upload,
  Pencil,
  X,
  BadgeCheck,
  Clock,
  Hash,
  Globe,
} from "lucide-react";
import {
  useGetMySettings,
  useUpdateProfile,
  useUpdateAvatar,
  useDeleteAvatar,
  useUpdatePassword,
  useRequestEmailChange,
  useVerifyEmailChange,
  useRequestPhoneChange,
  useVerifyPhoneChange,
  useDeleteAccount,
  type UpdateProfilePayload,
  type UpdatePasswordPayload,
  type RequestEmailChangePayload,
  type RequestPhoneChangePayload,
} from "@/hooks/admin/use-admin-settings"; 
import { cn } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { formatDateOnly } from "@/lib/date";

 
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return i18n.t("pages.patient.generic_error");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return formatDateOnly(iso, undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

 
const inputCls =
  "w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";

const selectCls =
  "w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all";
 
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted-foreground/50">{hint}</p>}
    </div>
  );
}
 
function DisplayField({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string | null;
  badge?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[13px] text-foreground font-medium">
          {value || <span className="text-muted-foreground/40 font-normal italic">{t("pages.patient.set_not_set")}</span>}
        </p>
        {badge}
      </div>
    </div>
  );
}

 
function VerifiedBadge({ verified, date }: { verified: boolean; date?: string | null }) {
  const { t } = useTranslation();
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-[6px]">
        <BadgeCheck className="w-3 h-3" />
        {t("pages.cards.verified")}{date ? ` · ${formatDate(date)}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-[6px]">
      <Clock className="w-3 h-3" />
      {t("pages.patient.set_unverified")}
    </span>
  );
}

 
function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputCls, "pr-9")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

 
function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  onEdit,
  isEditing,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  onEdit?: () => void;
  isEditing?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
        <div className="h-8 w-8 rounded-[6px] bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">{title}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{description}</p>
        </div>
        {onEdit && !isEditing && (
          <button
            onClick={onEdit}
            className="shrink-0 flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-[6px] border border-border/50 transition-all"
          >
            <Pencil className="w-3 h-3" />
            {t("common.edit")}
          </button>
        )}
      </div>
      <div className="px-5 py-5 space-y-5">{children}</div>
    </div>
  );
}

 
function OtpStep({
  label,
  onVerify,
  onCancel,
  isPending,
}: {
  label: string;
  onVerify: (otp: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  return (
    <div className="mt-4 p-4 rounded-[6px] border border-primary/20 bg-primary/5 space-y-3">
      <p className="text-[11px] text-foreground font-medium">{label}</p>
      <Field label={t("pages.patient.set_otp_code")} required>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className={inputCls}
        />
      </Field>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-[11px] rounded-[6px] gap-1.5"
          onClick={() => onVerify(otp)}
          disabled={isPending || otp.length < 6}
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          {t("pages.patient.set_verify")}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={onCancel} disabled={isPending}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

 
function InfoRow({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string | null;
  badge?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between py-3 border-b border-border/40 last:border-0 gap-4">
      <p className="text-[11px] text-muted-foreground/60 font-medium shrink-0 w-36">{label}</p>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <span className="text-[12px] text-foreground font-medium text-right">
          {value || <span className="text-muted-foreground/40 italic font-normal">{t("pages.patient.set_not_set")}</span>}
        </span>
        {badge}
      </div>
    </div>
  );
}
 
type TabKey = "profile" | "security" | "contact" | "danger";

const TAB_DEFS: { key: TabKey; labelKey: string; icon: React.ElementType }[] = [
  { key: "profile", labelKey: "pages.patient.set_tab_profile", icon: UserCog },
  { key: "security", labelKey: "pages.patient.set_tab_security", icon: KeyRound },
  { key: "contact", labelKey: "pages.patient.set_tab_contact", icon: Mail },
  { key: "danger", labelKey: "pages.patient.set_tab_danger", icon: ShieldAlert },
];

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "FranÃ§ais",
  rw: "Kinyarwanda",
};

 
function PatientSettings() {
  const { t, i18n } = useTranslation(); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Edit mode toggles
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState<UpdateProfilePayload>({
    name: "",
    preferred_language: "en",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState<UpdatePasswordPayload>({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  // Email change
  const [emailForm, setEmailForm] = useState<RequestEmailChangePayload>({
    email: "",
    current_password: "",
  });
  const [emailOtpStep, setEmailOtpStep] = useState(false);

  // Phone change
  const [phoneForm, setPhoneForm] = useState<RequestPhoneChangePayload>({
    phone: "",
    country_code: "+250",
    current_password: "",
  });
  const [phoneOtpStep, setPhoneOtpStep] = useState(false);

  // Delete account
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: settingsResponse, isLoading } = useGetMySettings();
  const settings = settingsResponse?.data;

  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();
  const deleteAvatar = useDeleteAvatar();
  const updatePassword = useUpdatePassword();
  const requestEmail = useRequestEmailChange();
  const verifyEmail = useVerifyEmailChange();
  const requestPhone = useRequestPhoneChange();
  const verifyPhone = useVerifyPhoneChange();
  const deleteAccount = useDeleteAccount();

  // Reset avatar error when URL changes
  useEffect(() => {
    setAvatarError(false);
  }, [settings?.avatar]);

  // Seed form when data loads
  useEffect(() => {
    if (settings) {
      setProfileForm({
        name: settings.name ?? "",
        preferred_language: settings.preferred_language ?? "en",
      });
    }
  }, [settings]);

  const openProfileEdit = () => {
    setProfileForm({
      name: settings?.name ?? "",
      preferred_language: settings?.preferred_language ?? "en",
    });
    setEditingProfile(true);
  };
 
  const handleProfileSave = async () => {
    if (!profileForm.name.trim()) {
      sonnerToast.error(t("pages.patient.set_name_required"));
      return;
    }
    try {
      await updateProfile.mutateAsync(profileForm);
      sonnerToast.success(t("pages.patient.set_profile_updated"));
      setEditingProfile(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      sonnerToast.error(t("pages.patient.set_avatar_too_big"));
      return;
    }
    try {
      await updateAvatar.mutateAsync(file);
      sonnerToast.success(t("pages.patient.set_avatar_updated"));
      setAvatarError(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
    e.target.value = "";
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatar.mutateAsync();
      sonnerToast.success(t("pages.patient.set_avatar_removed"));
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.current_password || !passwordForm.password) {
      sonnerToast.error(t("pages.patient.set_all_password_required"));
      return;
    }
    if (passwordForm.password !== passwordForm.password_confirmation) {
      sonnerToast.error(t("pages.patient.set_passwords_mismatch"));
      return;
    }
    try {
      await updatePassword.mutateAsync(passwordForm);
      sonnerToast.success(t("pages.patient.set_password_updated"));
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
      setEditingPassword(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleRequestEmail = async () => {
    if (!emailForm.email || !emailForm.current_password) {
      sonnerToast.error(t("pages.patient.set_all_fields_required"));
      return;
    }
    try {
      await requestEmail.mutateAsync(emailForm);
      sonnerToast.success(t("pages.patient.set_otp_sent_email"));
      setEmailOtpStep(true);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleVerifyEmail = async (otp: string) => {
    try {
      await verifyEmail.mutateAsync({ otp });
      sonnerToast.success(t("pages.patient.set_email_updated"));
      setEmailOtpStep(false);
      setEmailForm({ email: "", current_password: "" });
      setEditingEmail(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleRequestPhone = async () => {
    if (!phoneForm.phone || !phoneForm.current_password) {
      sonnerToast.error(t("pages.patient.set_all_fields_required"));
      return;
    }
    try {
      await requestPhone.mutateAsync(phoneForm);
      sonnerToast.success(t("pages.patient.set_otp_sent_phone"));
      setPhoneOtpStep(true);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleVerifyPhone = async (otp: string) => {
    try {
      await verifyPhone.mutateAsync({ otp });
      sonnerToast.success(t("pages.patient.set_phone_updated"));
      setPhoneOtpStep(false);
      setPhoneForm({ phone: "", country_code: "+250", current_password: "" });
      setEditingPhone(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      sonnerToast.error(t("pages.patient.set_password_required"));
      return;
    }
    try {
      await deleteAccount.mutateAsync({ password: deletePassword });
    } catch (err) {
      sonnerToast.error(getErrorMessage(err)  );
    }
  };

  const showAvatar = settings?.avatar && !avatarError;

 if (isLoading) {
    return (
      <DashboardLayout role="patient">
        <div className="flex flex-col h-full">
          <PageHeader title={t("pages.patient.set_title")} subtitle={t("pages.patient.set_loading_sub")} />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            <div className="h-36 rounded-[6px] border border-border/60 bg-card animate-pulse" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-40 rounded-[6px] border border-border/60 bg-card animate-pulse" />
            ))}
          </main>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.set_title")}
          subtitle={t("pages.patient.set_sub")}
        />

        <main className="flex-1 overflow-y-auto">

          {/* Identity Hero Banner  */}
          <div className="px-3 sm:px-4 mt-3 sm:mt-4">
            <div className="rounded-[6px] border border-border/60 bg-card shadow-sm overflow-hidden">
              {/* Subtle teal gradient top strip */}
              <div className="px-5 py-4 flex items-center gap-4">
                {/* Avatar  large, prominent */}
                <div className="relative shrink-0 group">
                  {showAvatar ? (
                    <img
                      src={settings!.avatar!}
                      alt={settings?.name ?? "Avatar"}
                      onError={() => setAvatarError(true)}
                      className="h-[72px] w-[72px] rounded-[6px] object-cover border-2 border-primary/30 shadow-md"
                    />
                  ) : (
                    <div className="h-[72px] w-[72px] rounded-[6px] bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-md">
                      <User className="w-8 h-8 text-primary/60" />
                    </div>
                  )}
                  {/* Upload overlay on hover */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={updateAvatar.isPending}
                    className="absolute inset-0 rounded-[6px] bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t("pages.patient.set_change_photo")}
                  >
                    {updateAvatar.isPending
                      ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                      : <Camera className="w-5 h-5 text-white" />
                    }
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground leading-tight truncate">
                    {settings?.name ?? "-"}
                  </p>
                  <p className="text-[12px] text-muted-foreground/70 mt-0.5 truncate">
                    {settings?.email ?? ""}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Account status */}
                    {settings?.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-[6px]">
                        <BadgeCheck className="w-3 h-3" />
                        {t("pages.cards.verified")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-[6px]">
                        <Clock className="w-3 h-3" />
                        {t("pages.patient.set_unverified")}
                      </span>
                    )}
                    {/* Roles */}
                    {settings?.roles?.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick avatar actions */}
                <div className="shrink-0 flex flex-col gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] rounded-[6px] gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={updateAvatar.isPending}
                  >
                    <Upload className="w-3 h-3" />
                    {showAvatar ? t("pages.patient.set_change_photo") : t("pages.patient.set_upload_photo")}
                  </Button>
                  {showAvatar && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 text-[11px] rounded-[6px] border border-border/40 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 gap-1.5"
                      onClick={handleDeleteAvatar}
                      disabled={deleteAvatar.isPending}
                    >
                      {deleteAvatar.isPending
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />
                      }
                      {t("pages.patient.set_remove")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-3 sm:px-4 mt-3">
            <div className="flex items-center gap-1 p-1 rounded-[6px] bg-secondary/40 border border-border/40">
              {TAB_DEFS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 h-8 text-[11px] font-medium rounded-[6px] transition-all duration-200",
                      active
                        ? "bg-card text-foreground shadow-sm border border-border/40"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                      tab.key === "danger" && active && "text-destructive",
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", tab.key === "danger" && "text-destructive")} />
                    <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 space-y-4 max-w-2xl">

             {activeTab === "profile" && (
              <SectionCard
                icon={UserCog}
                title={t("pages.patient.set_tab_profile")}
                description={t("pages.patient.set_profile_desc")}
                onEdit={openProfileEdit}
                isEditing={editingProfile}
              >
                {!editingProfile ? (
                  <div className="-my-1">
                    {/* ID row */}
                    <div className="flex items-start justify-between py-3 border-b border-border/40 gap-4">
                      <p className="text-[11px] text-muted-foreground/60 font-medium shrink-0 w-36 flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-muted-foreground/40" />
                        {t("pages.patient.set_user_id")}
                      </p>
                      <span className="text-[12px] text-foreground font-medium font-mono">
                        {settings?.id ?? <span className="text-muted-foreground/40 italic font-sans font-normal">{t("pages.patient.set_not_set")}</span>}
                      </span>
                    </div>

                    <InfoRow label={t("pages.patient.set_full_name")} value={settings?.name} />

                    <InfoRow
                      label={t("consult.connect.email_address")}
                      value={settings?.email}
                      badge={
                        settings?.email ? (
                          <VerifiedBadge verified={!!settings.email_verified_at} date={settings.email_verified_at} />
                        ) : undefined
                      }
                    />

                    <InfoRow
                      label={t("consult.connect.phone_number")}
                      value={
                        settings?.phone
                          ? `${settings?.country_code ?? ""} ${settings?.phone}`.trim()
                          : null
                      }
                      badge={
                        settings?.phone ? (
                          <VerifiedBadge verified={!!settings.phone_verified_at} date={settings.phone_verified_at} />
                        ) : undefined
                      }
                    />

                    <InfoRow
                      label={t("pages.patient.set_preferred_language")}
                      value={LANGUAGE_LABELS[settings?.preferred_language ?? "en"]}
                    />

                    <InfoRow
                      label={t("pages.patient.set_member_since")}
                      value={settings?.created_at ? formatDate(settings.created_at) : null}
                    />
                  </div>
                ) : (
                  <>
                    <Field label={t("pages.patient.set_full_name")} required>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="John Doe"
                        className={inputCls}
                        autoFocus
                      />
                    </Field>
                    <Field label={t("pages.patient.set_preferred_language")} required>
                      <select
                        value={profileForm.preferred_language}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            preferred_language: e.target.value as "en" | "fr" | "rw",
                          }))
                        }
                        className={selectCls}
                      >
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                        <option value="rw">Kinyarwanda</option>
                      </select>
                    </Field>
                    <div className="flex gap-2">
                      <Button
                        className="h-9 px-5 text-[12px] rounded-[6px] gap-1.5"
                        onClick={handleProfileSave}
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {t("pages.patient.set_save_changes")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 px-4 text-[12px] rounded-[6px]"
                        onClick={() => setEditingProfile(false)}
                        disabled={updateProfile.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </>
                )}
              </SectionCard>
            )}
   {activeTab === "security" && (
              <SectionCard
                icon={Lock}
                title={t("consult.connect.password")}
                description={t("pages.patient.set_password_desc")}
                onEdit={() => setEditingPassword(true)}
                isEditing={editingPassword}
              >
                {!editingPassword ? (
                  <div className="-my-1">
                    <div className="flex items-start justify-between py-3 border-b border-border/40 gap-4">
                      <p className="text-[11px] text-muted-foreground/60 font-medium shrink-0 w-36">{t("consult.connect.password")}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                        ))}
                        <span className="ml-2 text-[11px] text-muted-foreground/50">{t("pages.patient.set_password_set")}</span>
                      </div>
                    </div>
                    <InfoRow
                      label={t("pages.patient.set_member_since")}
                      value={settings?.created_at ? formatDate(settings.created_at) : null}
                    />
                  </div>
                ) : (
                  <>
                    <Field label={t("pages.patient.set_current_password")} required>
                      <PasswordInput
                        value={passwordForm.current_password}
                        onChange={(v) => setPasswordForm((p) => ({ ...p, current_password: v }))}
                        placeholder={t("pages.patient.set_current_password_placeholder")}
                      />
                    </Field>
                    <Field label={t("pages.patient.set_new_password")} required>
                      <PasswordInput
                        value={passwordForm.password}
                        onChange={(v) => setPasswordForm((p) => ({ ...p, password: v }))}
                        placeholder={t("pages.patient.set_new_password_placeholder")}
                      />
                    </Field>
                    <Field label={t("pages.patient.set_confirm_password")} required>
                      <PasswordInput
                        value={passwordForm.password_confirmation}
                        onChange={(v) => setPasswordForm((p) => ({ ...p, password_confirmation: v }))}
                        placeholder={t("pages.patient.set_confirm_password_placeholder")}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button
                        className="h-9 px-5 text-[12px] rounded-[6px] gap-1.5"
                        onClick={handlePasswordSave}
                        disabled={updatePassword.isPending}
                      >
                        {updatePassword.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <KeyRound className="w-3.5 h-3.5" />
                        )}
                        {t("pages.patient.set_update_password")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 px-4 text-[12px] rounded-[6px]"
                        onClick={() => {
                          setEditingPassword(false);
                          setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
                        }}
                        disabled={updatePassword.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </>
                )}
              </SectionCard>
            )}

             {activeTab === "contact" && (
              <>
                {/* Email */}
                <SectionCard
                  icon={Mail}
                  title={t("consult.connect.email_address")}
                  description={t("pages.patient.set_email_section_desc")}
                  onEdit={() => {
                    setEmailForm({ email: "", current_password: "" });
                    setEmailOtpStep(false);
                    setEditingEmail(true);
                  }}
                  isEditing={editingEmail}
                >
                  {!editingEmail ? (
                    <div className="-my-1">
                      <InfoRow
                        label={t("pages.patient.set_current_email")}
                        value={settings?.email}
                        badge={
                          settings?.email ? (
                            <VerifiedBadge verified={!!settings.email_verified_at} date={settings.email_verified_at} />
                          ) : undefined
                        }
                      />
                      <InfoRow
                        label={t("pages.patient.set_verified_at")}
                        value={settings?.email_verified_at ? formatDate(settings.email_verified_at) : null}
                      />
                    </div>
                  ) : (
                    <>
                      {settings?.email && (
                        <div className="px-3 py-2.5 rounded-[6px] bg-secondary/40 border border-border/60">
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">{t("pages.patient.set_changing_from")}</p>
                          <p className="text-[12px] font-medium text-foreground mt-1">{settings.email}</p>
                        </div>
                      )}
                      <Field label={t("pages.patient.set_new_email")} required>
                        <input
                          type="email"
                          value={emailForm.email}
                          onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder="newemail@example.com"
                          className={inputCls}
                          disabled={emailOtpStep}
                          autoFocus
                        />
                      </Field>
                      <Field label={t("pages.patient.set_current_password")} required>
                        <PasswordInput
                          value={emailForm.current_password}
                          onChange={(v) => setEmailForm((p) => ({ ...p, current_password: v }))}
                          placeholder={t("pages.patient.set_confirm_identity")}
                        />
                      </Field>
                      {!emailOtpStep ? (
                        <div className="flex gap-2">
                          <Button
                            className="h-9 px-5 text-[12px] rounded-[6px] gap-1.5"
                            onClick={handleRequestEmail}
                            disabled={requestEmail.isPending}
                          >
                            {requestEmail.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                            {t("pages.patient.set_send_otp")}
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-4 text-[12px] rounded-[6px]"
                            onClick={() => setEditingEmail(false)}
                            disabled={requestEmail.isPending}
                          >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            {t("common.cancel")}
                          </Button>
                        </div>
                      ) : (
                        <OtpStep
                          label={t("pages.patient.set_email_otp_label")}
                          onVerify={handleVerifyEmail}
                          onCancel={() => setEmailOtpStep(false)}
                          isPending={verifyEmail.isPending}
                        />
                      )}
                    </>
                  )}
                </SectionCard>

                {/* Phone */}
                <SectionCard
                  icon={Phone}
                  title={t("consult.connect.phone_number")}
                  description={t("pages.patient.set_phone_section_desc")}
                  onEdit={() => {
                    setPhoneForm({ phone: "", country_code: "+250", current_password: "" });
                    setPhoneOtpStep(false);
                    setEditingPhone(true);
                  }}
                  isEditing={editingPhone}
                >
                  {!editingPhone ? (
                    <div className="-my-1">
                      <InfoRow
                        label={t("pages.patient.set_current_phone")}
                        value={
                          settings?.phone
                            ? `${settings.country_code ?? ""} ${settings.phone}`.trim()
                            : null
                        }
                        badge={
                          settings?.phone ? (
                            <VerifiedBadge verified={!!settings.phone_verified_at} date={settings.phone_verified_at} />
                          ) : undefined
                        }
                      />
                      <InfoRow label={t("pages.patient.set_country_code")} value={settings?.country_code} />
                      <InfoRow
                        label={t("pages.patient.set_verified_at")}
                        value={settings?.phone_verified_at ? formatDate(settings.phone_verified_at) : null}
                      />
                    </div>
                  ) : (
                    <>
                      {settings?.phone && (
                        <div className="px-3 py-2.5 rounded-[6px] bg-secondary/40 border border-border/60">
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">{t("pages.patient.set_changing_from")}</p>
                          <p className="text-[12px] font-medium text-foreground mt-1">
                            {settings.country_code} {settings.phone}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-[100px_1fr] gap-3">
                        <Field label={t("pages.patient.set_code")} required>
                          <select
                            value={phoneForm.country_code}
                            onChange={(e) => setPhoneForm((p) => ({ ...p, country_code: e.target.value }))}
                            className={selectCls}
                            disabled={phoneOtpStep}
                          >
                            <option value="+250">+250</option>
                            <option value="+1">+1</option>
                            <option value="+33">+33</option>
                            <option value="+44">+44</option>
                            <option value="+254">+254</option>
                            <option value="+255">+255</option>
                            <option value="+256">+256</option>
                            <option value="+243">+243</option>
                          </select>
                        </Field>
                        <Field label={t("consult.connect.phone_number")} required>
                          <input
                            type="tel"
                            value={phoneForm.phone}
                            onChange={(e) => setPhoneForm((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="0781234567"
                            className={inputCls}
                            disabled={phoneOtpStep}
                            autoFocus
                          />
                        </Field>
                      </div>
                      <Field label={t("pages.patient.set_current_password")} required>
                        <PasswordInput
                          value={phoneForm.current_password}
                          onChange={(v) => setPhoneForm((p) => ({ ...p, current_password: v }))}
                          placeholder={t("pages.patient.set_confirm_identity")}
                        />
                      </Field>
                      {!phoneOtpStep ? (
                        <div className="flex gap-2">
                          <Button
                            className="h-9 px-5 text-[12px] rounded-[6px] gap-1.5"
                            onClick={handleRequestPhone}
                            disabled={requestPhone.isPending}
                          >
                            {requestPhone.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Phone className="w-3.5 h-3.5" />
                            )}
                            {t("pages.patient.set_send_otp")}
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-4 text-[12px] rounded-[6px]"
                            onClick={() => setEditingPhone(false)}
                            disabled={requestPhone.isPending}
                          >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            {t("common.cancel")}
                          </Button>
                        </div>
                      ) : (
                        <OtpStep
                          label={t("pages.patient.set_phone_otp_label")}
                          onVerify={handleVerifyPhone}
                          onCancel={() => setPhoneOtpStep(false)}
                          isPending={verifyPhone.isPending}
                        />
                      )}
                    </>
                  )}
                </SectionCard>
              </>
            )}
  {activeTab === "danger" && (
              <div className="rounded-[6px] border border-red-200 bg-card overflow-hidden shadow-sm dark:border-red-900/50">
                <div className="h-0.5 bg-gradient-to-r from-red-400/60 via-red-500 to-red-400/40" />
                <div className="px-5 py-4 border-b border-red-200/80 dark:border-red-900/50 flex items-center gap-3 bg-red-50/50 dark:bg-red-950/20">
                  <div className="h-8 w-8 rounded-[6px] bg-red-100 flex items-center justify-center border border-red-200 shrink-0 dark:bg-red-950/40 dark:border-red-900">
                    <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-red-700 dark:text-red-400 leading-tight">
                      {t("pages.patient.set_delete_account")}
                    </p>
                    <p className="text-[10px] text-red-500/70 dark:text-red-500/60 mt-0.5">
                      {t("pages.patient.set_delete_desc")}
                    </p>
                  </div>
                </div>
                <div className="px-5 py-5 space-y-5">
                  {!showDeleteConfirm ? (
                    <>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        {t("pages.patient.set_delete_warning_pre")}{" "}
                        <span className="font-semibold text-foreground">{t("pages.patient.set_delete_warning_bold")}</span>.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-5 text-[12px] rounded-[6px] border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 gap-1.5"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("pages.patient.set_delete_my_account")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-[6px] bg-red-50/70 border border-red-200 dark:bg-red-950/20 dark:border-red-900/60">
                        <p className="text-[11px] text-red-700 dark:text-red-400 font-medium">
                          {t("pages.patient.set_delete_confirm_note")}
                        </p>
                      </div>
                      <Field label={t("consult.connect.password")} required>
                        <PasswordInput
                          value={deletePassword}
                          onChange={setDeletePassword}
                          placeholder={t("pages.patient.set_current_password_placeholder")}
                        />
                      </Field>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 h-9 text-[12px] rounded-[6px] gap-1.5"
                          onClick={handleDeleteAccount}
                          disabled={deleteAccount.isPending || !deletePassword}
                        >
                          {deleteAccount.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          {t("pages.patient.set_permanently_delete")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-4 text-[12px] rounded-[6px]"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeletePassword("");
                          }}
                          disabled={deleteAccount.isPending}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}

export default PatientSettings;

