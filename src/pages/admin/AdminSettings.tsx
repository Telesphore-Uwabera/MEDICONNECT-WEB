import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { formatDateOnly } from "@/lib/date";
import {  User,
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from "sonner";
 
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
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
      {hint && (
        <p className="mt-1 text-[10px] text-muted-foreground/50">{hint}</p>
      )}
    </div>
  );
}

 // ─── DisplayField — read-only row ─────────────────────────────────────────────

function DisplayField({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string | null;
  badge?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[13px] text-foreground font-medium">
          {value || (
            <span className="text-muted-foreground/40 font-normal italic">
              Not set
            </span>
          )}
        </p>
        {badge}
      </div>
    </div>
  );
}

 
function VerifiedBadge({
  verified,
  date,
}: {
  verified: boolean;
  date?: string | null;
}) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-[6px]">
        <BadgeCheck className="w-3 h-3" />
        Verified{date ? ` · ${formatDate(date)}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-[6px]">
      <Clock className="w-3 h-3" />
      Unverified
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
        {show ? (
          <EyeOff className="w-3.5 h-3.5" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
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
  return (
    <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
        <div className="h-8 w-8 rounded-[6px] bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">
            {title}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {description}
          </p>
        </div>
        {onEdit && !isEditing && (
          <button
            onClick={onEdit}
            className="shrink-0 flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-[6px] border border-border/50 transition-all"
          >
            <Pencil className="w-3 h-3" />
            Edit
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
  const [otp, setOtp] = useState("");
  return (
    <div className="mt-4 p-4 rounded-[6px] border border-primary/20 bg-primary/5 space-y-3">
      <p className="text-[11px] text-foreground font-medium">{label}</p>
      <Field label="OTP code" required>
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
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
          Verify
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-[11px]"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
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
  return (
    <div className="flex items-start justify-between py-3 border-b border-border/40 last:border-0 gap-4">
      <p className="text-[11px] text-muted-foreground/60 font-medium shrink-0 w-36">
        {label}
      </p>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <span className="text-[12px] text-foreground font-medium text-right">
          {value || (
            <span className="text-muted-foreground/40 italic font-normal">
              Not set
            </span>
          )}
        </span>
        {badge}
      </div>
    </div>
  );
}
 
type TabKey = "profile" | "security" | "contact" | "danger";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "Profile", icon: UserCog },
  { key: "security", label: "Security", icon: KeyRound },
  { key: "contact", label: "Contact", icon: Mail },
  { key: "danger", label: "Danger", icon: ShieldAlert },
];

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  rw: "Kinyarwanda",
};
 
function AdminSettings() {
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
      sonnerToast.error("Name is required");
      return;
    }
    try {
      await updateProfile.mutateAsync(profileForm);
      sonnerToast.success("Profile updated.");
      setEditingProfile(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err) || "Failed to update profile.");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      sonnerToast.error("Avatar must be under 2 MB");
      return;
    }
    try {
      await updateAvatar.mutateAsync(file);
      sonnerToast.success("Avatar updated.");
      setAvatarError(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err) || "Failed to update avatar.");
    }
    e.target.value = "";
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatar.mutateAsync();
      sonnerToast.success("Avatar removed.");
    } catch (err) {
      sonnerToast.error(getErrorMessage(err) || "Failed to remove avatar.");
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.current_password || !passwordForm.password) {
      sonnerToast.error("All password fields are required");
      return;
    }
    if (passwordForm.password !== passwordForm.password_confirmation) {
      sonnerToast.error("Passwords do not match");
      return;
    }
    try {
      await updatePassword.mutateAsync(passwordForm);
      sonnerToast.success("Password updated. Other sessions have been logged out.");
 
      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      setEditingPassword(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err) || "Failed to update password.");
    }
  };

  const handleRequestEmail = async () => {
    if (!emailForm.email || !emailForm.current_password) {
      sonnerToast.error("All fields are required");
      return;
    }
    try {
      await requestEmail.mutateAsync(emailForm);
      sonnerToast.success("OTP sent to your new email.");
      setEmailOtpStep(true);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err) || "Failed to request email update.");
    }
  };

  const handleVerifyEmail = async (otp: string) => {
    try {
      await verifyEmail.mutateAsync({ otp });
      sonnerToast.success("Email updated successfully.");
      setEmailOtpStep(false);
      setEmailForm({ email: "", current_password: "" });
      setEditingEmail(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err) || "Failed to verify email.");
    }
  };

  const handleRequestPhone = async () => {
    if (!phoneForm.phone || !phoneForm.current_password) {
      sonnerToast.error("All fields are required");
      return;
    }
    try {
      await requestPhone.mutateAsync(phoneForm);
      sonnerToast.success("OTP sent to your new phone number.");
      setPhoneOtpStep(true);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err) || "Failed to request phone update.");
    }
  };

  const handleVerifyPhone = async (otp: string) => {
    try {
      await verifyPhone.mutateAsync({ otp });
      sonnerToast.success("Phone number updated successfully.");
      setPhoneOtpStep(false);
      setPhoneForm({ phone: "", country_code: "+250", current_password: "" });
      setEditingPhone(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err) || "Failed to verify phone number.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      sonnerToast.error("Password is required");
      return;
    }
    try {
      await deleteAccount.mutateAsync({ password: deletePassword });
    } catch (err) {
      sonnerToast.error(getErrorMessage(err) || "Failed to delete account.");
    }
  };

 const showAvatar = settings?.avatar && !avatarError;

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex flex-col h-full">
          <PageHeader title="Settings" subtitle="Manage your account" />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            <div className="h-36 rounded-[6px] border border-border/60 bg-card animate-pulse" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-[6px] border border-border/60 bg-card animate-pulse"
              />
            ))}
          </main>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.settings_title", { defaultValue: "Settings" })}
          subtitle={t("pages.admin.settings_sub", {
            defaultValue: "Manage your profile, security, and account",
          })}
        />
        <main className="flex-1 overflow-y-auto">
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
                    title="Change photo"
                  >
                    {updateAvatar.isPending ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
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
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-[6px]">
                        <Clock className="w-3 h-3" />
                        Unverified
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
                    {showAvatar ? "Change photo" : "Upload photo"}
                  </Button>
                  {showAvatar && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 text-[11px] rounded-[6px] border border-border/40 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 gap-1.5"
                      onClick={handleDeleteAvatar}
                      disabled={deleteAvatar.isPending}
                    >
                      {deleteAvatar.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-3 sm:px-4 mt-3">
            <div className="flex items-center gap-1 p-1 rounded-[6px] bg-secondary/40 border border-border/40">
              {TABS.map((tab) => {
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
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        tab.key === "danger" && "text-destructive",
                      )}
                    />
                    <span className="hidden sm:inline">{tab.label}</span>
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
                title="Profile"
                description="Your account details and preferences"
                onEdit={openProfileEdit}
                isEditing={editingProfile}
              >
                {!editingProfile ? (
                  <div className="-my-1">
                    {/* ID row */}
                    <div className="flex items-start justify-between py-3 border-b border-border/40 gap-4">
                      <p className="text-[11px] text-muted-foreground/60 font-medium shrink-0 w-36 flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-muted-foreground/40" />
                        User ID
                      </p>
                      <span className="text-[12px] text-foreground font-medium font-mono">
                        {settings?.id ?? (
                          <span className="text-muted-foreground/40 italic font-sans font-normal">
                            Not set
                          </span>
                        )}
                      </span>
                    </div>

                    <InfoRow label="Full name" value={settings?.name} />

                    <InfoRow
                      label="Email address"
                      value={settings?.email}
                      badge={
                        settings?.email ? (
                          <VerifiedBadge
                            verified={!!settings.email_verified_at}
                            date={settings.email_verified_at}
                          />
                        ) : undefined
                      }
                    />

                    <InfoRow
                      label="Phone number"
                      value={
                        settings?.phone
                          ? `${settings?.country_code ?? ""} ${settings?.phone}`.trim()
                          : null
                      }
                      badge={
                        settings?.phone ? (
                          <VerifiedBadge
                            verified={!!settings.phone_verified_at}
                            date={settings.phone_verified_at}
                          />
                        ) : undefined
                      }
                    />

                    <InfoRow
                      label="Preferred language"
                      value={
                        LANGUAGE_LABELS[settings?.preferred_language ?? "en"]
                      }
                    />

                    <InfoRow
                      label="Member since"
                      value={
                        settings?.created_at
                          ? formatDate(settings.created_at)
                          : null
                      }
                    />
                  </div>
                ) : (
                  <>
                    <Field label="Full name" required>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        placeholder="John Doe"
                        className={inputCls}
                        autoFocus
                      />
                    </Field>
                    <Field label="Preferred language" required>
                      <select
                        value={profileForm.preferred_language}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            preferred_language: e.target.value as
                              | "en"
                              | "fr"
                              | "rw",
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
                        Save changes
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 px-4 text-[12px] rounded-[6px]"
                        onClick={() => setEditingProfile(false)}
                        disabled={updateProfile.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </SectionCard>
            )}

           {activeTab === "security" && (
              <SectionCard
                icon={Lock}
                title="Password"
                description="Min 8 characters, mixed case and numbers. Logs out all other devices."
                onEdit={() => setEditingPassword(true)}
                isEditing={editingPassword}
              >
                {!editingPassword ? (
                  <div className="-my-1">
                    <div className="flex items-start justify-between py-3 border-b border-border/40 gap-4">
                      <p className="text-[11px] text-muted-foreground/60 font-medium shrink-0 w-36">
                        Password
                      </p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-foreground/20"
                          />
                        ))}
                        <span className="ml-2 text-[11px] text-muted-foreground/50">
                          Set
                        </span>
                      </div>
                    </div>
                    <InfoRow
                      label="Member since"
                      value={
                        settings?.created_at
                          ? formatDate(settings.created_at)
                          : null
                      }
                    />
                  </div>
                ) : (
                  <>
                    <Field label="Current password" required>
                      <PasswordInput
                        value={passwordForm.current_password}
                        onChange={(v) =>
                          setPasswordForm((p) => ({
                            ...p,
                            current_password: v,
                          }))
                        }
                        placeholder="Your current password"
                      />
                    </Field>
                    <Field label="New password" required>
                      <PasswordInput
                        value={passwordForm.password}
                        onChange={(v) =>
                          setPasswordForm((p) => ({ ...p, password: v }))
                        }
                        placeholder="At least 8 characters"
                      />
                    </Field>
                    <Field label="Confirm new password" required>
                      <PasswordInput
                        value={passwordForm.password_confirmation}
                        onChange={(v) =>
                          setPasswordForm((p) => ({
                            ...p,
                            password_confirmation: v,
                          }))
                        }
                        placeholder="Repeat new password"
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
                        Update password
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 px-4 text-[12px] rounded-[6px]"
                        onClick={() => {
                          setEditingPassword(false);
                          setPasswordForm({
                            current_password: "",
                            password: "",
                            password_confirmation: "",
                          });
                        }}
                        disabled={updatePassword.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
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
                  title="Email address"
                  description="An OTP will be sent to your new address to confirm the change."
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
                        label="Current email"
                        value={settings?.email}
                        badge={
                          settings?.email ? (
                            <VerifiedBadge
                              verified={!!settings.email_verified_at}
                              date={settings.email_verified_at}
                            />
                          ) : undefined
                        }
                      />
                      <InfoRow
                        label="Verified at"
                        value={
                          settings?.email_verified_at
                            ? formatDate(settings.email_verified_at)
                            : null
                        }
                      />
                    </div>
                  ) : (
                    <>
                      {settings?.email && (
                        <div className="px-3 py-2.5 rounded-[6px] bg-secondary/40 border border-border/60">
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">
                            Changing from
                          </p>
                          <p className="text-[12px] font-medium text-foreground mt-1">
                            {settings.email}
                          </p>
                        </div>
                      )}
                      <Field label="New email" required>
                        <input
                          type="email"
                          value={emailForm.email}
                          onChange={(e) =>
                            setEmailForm((p) => ({
                              ...p,
                              email: e.target.value,
                            }))
                          }
                          placeholder="newemail@example.com"
                          className={inputCls}
                          disabled={emailOtpStep}
                          autoFocus
                        />
                      </Field>
                      <Field label="Current password" required>
                        <PasswordInput
                          value={emailForm.current_password}
                          onChange={(v) =>
                            setEmailForm((p) => ({ ...p, current_password: v }))
                          }
                          placeholder="Confirm your identity"
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
                            Send OTP
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-4 text-[12px] rounded-[6px]"
                            onClick={() => setEditingEmail(false)}
                            disabled={requestEmail.isPending}
                          >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <OtpStep
                          label="Enter the 6-digit code sent to your new email."
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
                  title="Phone number"
                  description="An OTP will be sent to your new number to confirm the change."
                  onEdit={() => {
                    setPhoneForm({
                      phone: "",
                      country_code: "+250",
                      current_password: "",
                    });
                    setPhoneOtpStep(false);
                    setEditingPhone(true);
                  }}
                  isEditing={editingPhone}
                >
                  {!editingPhone ? (
                    <div className="-my-1">
                      <InfoRow
                        label="Current phone"
                        value={
                          settings?.phone
                            ? `${settings.country_code ?? ""} ${settings.phone}`.trim()
                            : null
                        }
                        badge={
                          settings?.phone ? (
                            <VerifiedBadge
                              verified={!!settings.phone_verified_at}
                              date={settings.phone_verified_at}
                            />
                          ) : undefined
                        }
                      />
                      <InfoRow
                        label="Country code"
                        value={settings?.country_code}
                      />
                      <InfoRow
                        label="Verified at"
                        value={
                          settings?.phone_verified_at
                            ? formatDate(settings.phone_verified_at)
                            : null
                        }
                      />
                    </div>
                  ) : (
                    <>
                      {settings?.phone && (
                        <div className="px-3 py-2.5 rounded-[6px] bg-secondary/40 border border-border/60">
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">
                            Changing from
                          </p>
                          <p className="text-[12px] font-medium text-foreground mt-1">
                            {settings.country_code} {settings.phone}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-[100px_1fr] gap-3">
                        <Field label="Code" required>
                          <select
                            value={phoneForm.country_code}
                            onChange={(e) =>
                              setPhoneForm((p) => ({
                                ...p,
                                country_code: e.target.value,
                              }))
                            }
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
                        <Field label="Phone number" required>
                          <input
                            type="tel"
                            value={phoneForm.phone}
                            onChange={(e) =>
                              setPhoneForm((p) => ({
                                ...p,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="0781234567"
                            className={inputCls}
                            disabled={phoneOtpStep}
                            autoFocus
                          />
                        </Field>
                      </div>
                      <Field label="Current password" required>
                        <PasswordInput
                          value={phoneForm.current_password}
                          onChange={(v) =>
                            setPhoneForm((p) => ({ ...p, current_password: v }))
                          }
                          placeholder="Confirm your identity"
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
                            Send OTP
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-4 text-[12px] rounded-[6px]"
                            onClick={() => setEditingPhone(false)}
                            disabled={requestPhone.isPending}
                          >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <OtpStep
                          label="Enter the 6-digit code sent to your new phone number."
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
                      Delete account
                    </p>
                    <p className="text-[10px] text-red-500/70 dark:text-red-500/60 mt-0.5">
                      Permanently removes your account and revokes all active
                      sessions
                    </p>
                  </div>
                </div>
                <div className="px-5 py-5 space-y-5">
                  {!showDeleteConfirm ? (
                    <>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        Once you delete your account, all your data will be
                        permanently erased and a farewell email will be sent.
                        This action{" "}
                        <span className="font-semibold text-foreground">
                          cannot be undone
                        </span>
                        .
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-5 text-[12px] rounded-[6px] border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 gap-1.5"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete my account
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-[6px] bg-red-50/70 border border-red-200 dark:bg-red-950/20 dark:border-red-900/60">
                        <p className="text-[11px] text-red-700 dark:text-red-400 font-medium">
                          Enter your password to confirm account deletion.
                        </p>
                      </div>
                      <Field label="Password" required>
                        <PasswordInput
                          value={deletePassword}
                          onChange={setDeletePassword}
                          placeholder="Your current password"
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
                          Permanently delete
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
                          Cancel
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

export default AdminSettings;

