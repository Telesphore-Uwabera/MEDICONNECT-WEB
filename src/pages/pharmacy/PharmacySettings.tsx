
import { toast as sonnerToast } from "sonner";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SkeletonCard } from "@/components/SkeletonCard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
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
  Pencil,
  X,
  BadgeCheck,
  Clock,
  Hash,
  Globe,
  Database,
  ServerCog,
  PlugZap,
  RefreshCw,
  FileClock,
  Power,
  PowerOff,
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
import {
  useGetInventoryMode,
  useSwitchInventoryMode,
  useGetExternalProviders,
  useConnectExternalProvider,
  useUpdateExternalProvider,
  useDeleteExternalProvider,
  useSyncExternalProvider,
  useGetExternalProviderSyncLogs,
  type PharmacyInventoryMode,
  type PharmacyExternalAuthType,
} from "@/hooks/pharmacy/use-pharmacy-profile";
import { cn } from "@/lib/utils";
import { validatePhoneForCountry } from "@/lib/phone-validation";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { formatDateOnly } from "@/lib/date";
 
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
          {value || <span className="text-muted-foreground/40 font-normal italic">{t("pages.pharmacy.not_set")}</span>}
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
        {t("pages.pharmacy.verified")}{date ? ` ? ${formatDate(date)}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-[6px]">
      <Clock className="w-3 h-3" />
      {t("pages.pharmacy.unverified")}
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
            {t("pages.pharmacy.edit")}
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
      <Field label={t("pages.pharmacy.otp_code")} required>
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
          {t("pages.pharmacy.verify")}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={onCancel} disabled={isPending}>
          {t("pages.pharmacy.cancel")}
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
          {value || <span className="text-muted-foreground/40 italic font-normal">{t("pages.pharmacy.not_set")}</span>}
        </span>
        {badge}
      </div>
    </div>
  );
}

 
type TabKey = "profile" | "security" | "contact" | "inventory_mode" | "danger";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "pages.pharmacy.settings_tab_profile", icon: UserCog },
  { key: "security", label: "pages.pharmacy.settings_tab_security", icon: KeyRound },
  { key: "contact", label: "pages.pharmacy.settings_tab_contact", icon: Mail },
  { key: "inventory_mode", label: "pages.pharmacy.settings_tab_inventory_mode", icon: Database },
  { key: "danger", label: "pages.pharmacy.settings_tab_danger", icon: ShieldAlert },
];

const LANGUAGE_LABELS: Record<string, string> = {
  en: "pages.pharmacy.settings_lang_en",
  fr: "Français",
  rw: "pages.pharmacy.settings_lang_rw",
};

 
function PharmacySettings() {
  const { t, i18n } = useTranslation(); 
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

  // Inventory provider form. Kept in memory until backend exposes provider connection.
  const [selectedInventoryMode, setSelectedInventoryMode] =
    useState<PharmacyInventoryMode>("internal");
  const [externalProviderForm, setExternalProviderForm] = useState({
    name: "",
    api_url: "",
    auth_type: "api_key" as PharmacyExternalAuthType,
    api_key: "",
    secret_key: "",
    extra_headers: "",
    sync_interval_minutes: 30,
  });
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  const { data: settingsResponse, isLoading } = useGetMySettings();
  const settings = settingsResponse?.data;
  const {
    data: inventoryModeResponse,
    isLoading: inventoryModeLoading,
    isError: inventoryModeError,
    refetch: refetchInventoryMode,
  } = useGetInventoryMode();
  const {
    data: externalProviders = [],
    isLoading: providersLoading,
    isError: providersError,
    refetch: refetchProviders,
  } = useGetExternalProviders();
  const selectedProvider =
    externalProviders.find((provider) => provider.id === selectedProviderId) ?? externalProviders[0] ?? null;
  const { data: syncLogsResponse, isLoading: syncLogsLoading } =
    useGetExternalProviderSyncLogs(selectedProvider?.id ?? null);

  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();
  const deleteAvatar = useDeleteAvatar();
  const updatePassword = useUpdatePassword();
  const requestEmail = useRequestEmailChange();
  const verifyEmail = useVerifyEmailChange();
  const requestPhone = useRequestPhoneChange();
  const verifyPhone = useVerifyPhoneChange();
  const deleteAccount = useDeleteAccount();
  const switchInventoryMode = useSwitchInventoryMode();
  const connectExternalProvider = useConnectExternalProvider();
  const updateExternalProvider = useUpdateExternalProvider();
  const deleteExternalProvider = useDeleteExternalProvider();
  const syncExternalProvider = useSyncExternalProvider();

  const currentInventoryMode = inventoryModeResponse?.inventory_mode ?? "internal";

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

  useEffect(() => {
    if (inventoryModeResponse?.inventory_mode) {
      setSelectedInventoryMode(inventoryModeResponse.inventory_mode);
    }
  }, [inventoryModeResponse?.inventory_mode]);

  useEffect(() => {
    if (!selectedProviderId && externalProviders.length > 0) {
      setSelectedProviderId(externalProviders[0].id);
    }
    if (selectedProviderId && externalProviders.length > 0 && !externalProviders.some((provider) => provider.id === selectedProviderId)) {
      setSelectedProviderId(externalProviders[0].id);
    }
  }, [externalProviders, selectedProviderId]);

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
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleAvatarChange = async (value: File | File[] | null) => {
    const file = Array.isArray(value) ? value[0] : value;
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
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatar.mutateAsync();
      sonnerToast.success("Avatar removed.");
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
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
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
      setEditingPassword(false);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
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
      sonnerToast.error(getErrorMessage(err));
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
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleRequestPhone = async () => {
    if (!phoneForm.phone || !phoneForm.current_password) {
      sonnerToast.error("All fields are required");
      return;
    }
    const phoneValidation = validatePhoneForCountry(phoneForm.phone, phoneForm.country_code);
    if (!phoneValidation.isValid) {
      sonnerToast.error(phoneValidation.message);
      return;
    }
    try {
      await requestPhone.mutateAsync({ ...phoneForm, phone: phoneValidation.normalizedPhone, country_code: phoneValidation.normalizedCountryCode });
      sonnerToast.success("OTP sent to your new phone number.");
      setPhoneOtpStep(true);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
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
      sonnerToast.error(getErrorMessage(err));
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
      sonnerToast.error(getErrorMessage(err));
    }
  };

  //  Avatar display helper
  const handleSwitchInventoryMode = async (mode: PharmacyInventoryMode) => {
    try {
      const response = await switchInventoryMode.mutateAsync(mode);
      sonnerToast.success(response.message ?? `Inventory mode switched to ${mode}.`);
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const parseExtraHeaders = () => {
    if (!externalProviderForm.extra_headers.trim()) return null;
    try {
      const parsed = JSON.parse(externalProviderForm.extra_headers);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Extra headers must be a JSON object.");
      }
      return parsed as Record<string, string>;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Extra headers must be valid JSON.");
    }
  };

  const resetExternalProviderForm = () => {
    setExternalProviderForm({
      name: "",
      api_url: "",
      auth_type: "api_key",
      api_key: "",
      secret_key: "",
      extra_headers: "",
      sync_interval_minutes: 30,
    });
  };

  const handleConnectExternalProvider = async () => {
    if (
      !externalProviderForm.name.trim() ||
      !externalProviderForm.api_url.trim() ||
      !externalProviderForm.api_key.trim() ||
      !externalProviderForm.auth_type
    ) {
      sonnerToast.error("Provider name, API URL, API key and auth type are required.");
      return;
    }
    try {
      const response = await connectExternalProvider.mutateAsync({
        name: externalProviderForm.name.trim(),
        api_url: externalProviderForm.api_url.trim(),
        api_key: externalProviderForm.api_key.trim(),
        api_secret: externalProviderForm.secret_key.trim() || undefined,
        auth_type: externalProviderForm.auth_type,
        extra_headers: parseExtraHeaders(),
        sync_interval_minutes: Number(externalProviderForm.sync_interval_minutes) || 30,
      });
      sonnerToast.success(response.message ?? "External provider connected.");
      setSelectedProviderId(response.provider.id);
      resetExternalProviderForm();
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleToggleProviderActive = async (id: number, isActive: boolean) => {
    try {
      const response = await updateExternalProvider.mutateAsync({
        id,
        payload: { is_active: !isActive },
      });
      sonnerToast.success(response.message ?? "Provider updated.");
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleUpdateProviderInterval = async (id: number, syncInterval: number) => {
    try {
      const response = await updateExternalProvider.mutateAsync({
        id,
        payload: { sync_interval_minutes: syncInterval },
      });
      sonnerToast.success(response.message ?? "Provider updated.");
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleDeleteProvider = async (id: number) => {
    try {
      const response = await deleteExternalProvider.mutateAsync(id);
      sonnerToast.success(response.message ?? "Provider removed.");
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const handleSyncProvider = async (id: number) => {
    try {
      const response = await syncExternalProvider.mutateAsync(id);
      sonnerToast.success(response.message ?? "Sync queued.");
    } catch (err) {
      sonnerToast.error(getErrorMessage(err));
    }
  };

  const showAvatar = settings?.avatar && !avatarError;

 
  if (isLoading) {
    return (
      <DashboardLayout role="pharmacy">
        <div className="flex flex-col h-full">
          <PageHeader title={t("pages.pharmacy.settings_title")} subtitle={t("pages.pharmacy.settings_manage_account")} />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            <SkeletonCard />
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </main>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.settings_title", { defaultValue: "Settings" })}
          subtitle={t("pages.pharmacy.settings_sub", { defaultValue: "Manage your profile, security, and account" })}
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
                        {t("pages.pharmacy.verified")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-[6px]">
                        <Clock className="w-3 h-3" />
                        {t("pages.pharmacy.unverified")}
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
                  <FileUploader
                    label={showAvatar ? t("pages.pharmacy.change_photo") : t("pages.pharmacy.upload_photo")}
                    accept=".jpg,.jpeg,.png,.webp"
                    value={null}
                    onChange={handleAvatarChange}
                    maxSizeMb={2}
                    existingUrl={showAvatar ? settings?.avatar : null}
                    className="w-[220px] min-h-[76px] px-3 py-3"
                    helperText={t("common.fileUploader.avatarHelper", { defaultValue: "Click or drag a JPG, PNG, or WebP image. Max 2 MB." })}
                  />
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
                    <Icon className={cn("w-3.5 h-3.5", tab.key === "danger" && "text-destructive")} />
                    <span className="hidden sm:inline">{t(tab.label)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 space-y-4 max-w-4xl">

            {activeTab === "profile" && (
              <SectionCard
                icon={UserCog}
                title={t("pages.pharmacy.profile_section_title")}
                description={t("pages.pharmacy.profile_section_desc")}
                onEdit={openProfileEdit}
                isEditing={editingProfile}
              >
                {!editingProfile ? (
                  <div className="-my-1">
                    {/* ID row */}
                    <div className="flex items-start justify-between py-3 border-b border-border/40 gap-4">
                      <p className="text-[11px] text-muted-foreground/60 font-medium shrink-0 w-36 flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-muted-foreground/40" />
                        {t("pages.pharmacy.user_id")}
                      </p>
                      <span className="text-[12px] text-foreground font-medium font-mono">
                        {settings?.id ?? <span className="text-muted-foreground/40 italic font-sans font-normal">{t("pages.pharmacy.not_set")}</span>}
                      </span>
                    </div>

                    <InfoRow label={t("pages.pharmacy.full_name")} value={settings?.name} />

                    <InfoRow
                      label={t("pages.pharmacy.email_address")}
                      value={settings?.email}
                      badge={
                        settings?.email ? (
                          <VerifiedBadge verified={!!settings.email_verified_at} date={settings.email_verified_at} />
                        ) : undefined
                      }
                    />

                    <InfoRow
                      label={t("pages.pharmacy.phone_number")}
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
                      label={t("pages.pharmacy.preferred_language")}
                      value={t(LANGUAGE_LABELS[settings?.preferred_language ?? "en"])}
                    />

                    <InfoRow
                      label={t("pages.pharmacy.member_since")}
                      value={settings?.created_at ? formatDate(settings.created_at) : null}
                    />
                  </div>
                ) : (
                  <>
                    <Field label={t("pages.pharmacy.full_name")} required>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="John Doe"
                        className={inputCls}
                        autoFocus
                      />
                    </Field>
                    <Field label={t("pages.pharmacy.preferred_language")} required>
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
                        <option value="en">{t("pages.pharmacy.settings_lang_en")}</option>
                        <option value="fr">Français</option>
                        <option value="rw">{t("pages.pharmacy.settings_lang_rw")}</option>
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
                        {t("pages.pharmacy.save_changes")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 px-4 text-[12px] rounded-[6px]"
                        onClick={() => setEditingProfile(false)}
                        disabled={updateProfile.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        {t("pages.pharmacy.cancel")}
                      </Button>
                    </div>
                  </>
                )}
              </SectionCard>
            )}

             {activeTab === "security" && (
              <SectionCard
                icon={Lock}
                title={t("pages.pharmacy.password")}
                description={t("pages.pharmacy.password_section_desc")}
                onEdit={() => setEditingPassword(true)}
                isEditing={editingPassword}
              >
                {!editingPassword ? (
                  <div className="-my-1">
                    <div className="flex items-start justify-between py-3 border-b border-border/40 gap-4">
                      <p className="text-[11px] text-muted-foreground/60 font-medium shrink-0 w-36">{t("pages.pharmacy.password")}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                        ))}
                        <span className="ml-2 text-[11px] text-muted-foreground/50">{t("pages.pharmacy.password_set")}</span>
                      </div>
                    </div>
                    <InfoRow
                      label={t("pages.pharmacy.member_since")}
                      value={settings?.created_at ? formatDate(settings.created_at) : null}
                    />
                  </div>
                ) : (
                  <>
                    <Field label={t("pages.pharmacy.current_password")} required>
                      <PasswordInput
                        value={passwordForm.current_password}
                        onChange={(v) => setPasswordForm((p) => ({ ...p, current_password: v }))}
                        placeholder={t("pages.pharmacy.current_password_placeholder")}
                      />
                    </Field>
                    <Field label={t("pages.pharmacy.new_password")} required>
                      <PasswordInput
                        value={passwordForm.password}
                        onChange={(v) => setPasswordForm((p) => ({ ...p, password: v }))}
                        placeholder={t("pages.pharmacy.new_password_placeholder")}
                      />
                    </Field>
                    <Field label={t("pages.pharmacy.confirm_new_password")} required>
                      <PasswordInput
                        value={passwordForm.password_confirmation}
                        onChange={(v) => setPasswordForm((p) => ({ ...p, password_confirmation: v }))}
                        placeholder={t("pages.pharmacy.confirm_new_password_placeholder")}
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
                          setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
                        }}
                        disabled={updatePassword.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        {t("pages.pharmacy.cancel")}
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
                  title={t("pages.pharmacy.email_address")}
                  description={t("pages.pharmacy.email_change_desc")}
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
                        label={t("pages.pharmacy.current_email")}
                        value={settings?.email}
                        badge={
                          settings?.email ? (
                            <VerifiedBadge verified={!!settings.email_verified_at} date={settings.email_verified_at} />
                          ) : undefined
                        }
                      />
                      <InfoRow
                        label={t("pages.pharmacy.verified_at")}
                        value={settings?.email_verified_at ? formatDate(settings.email_verified_at) : null}
                      />
                    </div>
                  ) : (
                    <>
                      {settings?.email && (
                        <div className="px-3 py-2.5 rounded-[6px] bg-secondary/40 border border-border/60">
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">{t("pages.pharmacy.changing_from")}</p>
                          <p className="text-[12px] font-medium text-foreground mt-1">{settings.email}</p>
                        </div>
                      )}
                      <Field label={t("pages.pharmacy.new_email")} required>
                        <input
                          type="email"
                          value={emailForm.email}
                          onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder={t("pages.pharmacy.new_email_placeholder")}
                          className={inputCls}
                          disabled={emailOtpStep}
                          autoFocus
                        />
                      </Field>
                      <Field label={t("pages.pharmacy.current_password")} required>
                        <PasswordInput
                          value={emailForm.current_password}
                          onChange={(v) => setEmailForm((p) => ({ ...p, current_password: v }))}
                          placeholder={t("pages.pharmacy.confirm_identity")}
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
                            {t("pages.pharmacy.cancel")}
                          </Button>
                        </div>
                      ) : (
                        <OtpStep
                          label={t("pages.pharmacy.email_otp_hint")}
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
                  title={t("pages.pharmacy.phone_number")}
                  description={t("pages.pharmacy.phone_change_desc")}
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
                        label={t("pages.pharmacy.current_phone")}
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
                      <InfoRow label={t("pages.pharmacy.country_code")} value={settings?.country_code} />
                      <InfoRow
                        label={t("pages.pharmacy.verified_at")}
                        value={settings?.phone_verified_at ? formatDate(settings.phone_verified_at) : null}
                      />
                    </div>
                  ) : (
                    <>
                      {settings?.phone && (
                        <div className="px-3 py-2.5 rounded-[6px] bg-secondary/40 border border-border/60">
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">{t("pages.pharmacy.changing_from")}</p>
                          <p className="text-[12px] font-medium text-foreground mt-1">
                            {settings.country_code} {settings.phone}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-[100px_1fr] gap-3">
                        <Field label={t("pages.pharmacy.code")} required>
                          <CountryCodeSelect
                            value={phoneForm.country_code}
                            onChange={(dialCode) => setPhoneForm((p) => ({ ...p, country_code: dialCode }))}
                            className={selectCls}
                            disabled={phoneOtpStep}
                          />
                        </Field>
                        <Field label={t("pages.pharmacy.phone_number")} required>
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
                      <Field label={t("pages.pharmacy.current_password")} required>
                        <PasswordInput
                          value={phoneForm.current_password}
                          onChange={(v) => setPhoneForm((p) => ({ ...p, current_password: v }))}
                          placeholder={t("pages.pharmacy.confirm_identity")}
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
                            {t("pages.pharmacy.cancel")}
                          </Button>
                        </div>
                      ) : (
                        <OtpStep
                          label={t("pages.pharmacy.phone_otp_hint")}
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

              {activeTab === "inventory_mode" && (
              <SectionCard
                icon={Database}
                title={t("pages.pharmacy.inventory_mode_title")}
                description={t("pages.pharmacy.inventory_mode_desc")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {t("pages.pharmacy.current_mode")}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-1 text-[11px] font-semibold capitalize",
                      currentInventoryMode === "external"
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-500"
                        : "border-primary/25 bg-primary/10 text-primary",
                    )}
                  >
                    {inventoryModeLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Database className="h-3 w-3" />
                    )}
                    {currentInventoryMode}
                  </span>
                  {inventoryModeError && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-[6px] px-2 text-[11px]"
                      onClick={() => refetchInventoryMode()}
                    >
                      {t("pages.pharmacy.retry")}
                    </Button>
                  )}
                </div>

                {inventoryModeError && (
                  <div className="rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                    Pharmacy profile was not found or is inactive, so the inventory mode could not be loaded.
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInventoryMode("internal");
                      if (currentInventoryMode !== "internal") void handleSwitchInventoryMode("internal");
                    }}
                    disabled={switchInventoryMode.isPending}
                    className={cn(
                      "rounded-[6px] border p-4 text-left transition-all hover:border-primary/45 hover:bg-primary/5 disabled:opacity-60",
                      selectedInventoryMode === "internal"
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/70 bg-background",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
                        <Database className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-foreground">{t("pages.pharmacy.internal_inventory")}</span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                          {t("pages.pharmacy.internal_inventory_desc")}
                        </span>
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedInventoryMode("external")}
                    disabled={switchInventoryMode.isPending}
                    className={cn(
                      "rounded-[6px] border p-4 text-left transition-all hover:border-blue-500/45 hover:bg-blue-500/5 disabled:opacity-60",
                      selectedInventoryMode === "external"
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-border/70 bg-background",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-blue-500/20 bg-blue-500/10 text-blue-500">
                        <PlugZap className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-foreground">{t("pages.pharmacy.external_provider")}</span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                          {t("pages.pharmacy.external_provider_desc")}
                        </span>
                      </span>
                    </div>
                  </button>
                </div>

                {selectedInventoryMode === "external" && (
                  <div className="rounded-[6px] border border-border/70 bg-background p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-border/60 bg-secondary/50 text-primary">
                        <ServerCog className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{t("pages.pharmacy.connect_external_provider")}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {t("pages.pharmacy.connect_external_provider_desc")}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={t("pages.pharmacy.provider_name")} required>
                        <input
                          value={externalProviderForm.name}
                          onChange={(e) => setExternalProviderForm((prev) => ({ ...prev, name: e.target.value }))}
                          className={inputCls}
                          placeholder={t("pages.pharmacy.provider_name_placeholder")}
                        />
                      </Field>
                      <Field label={t("pages.pharmacy.api_url")} required>
                        <input
                          value={externalProviderForm.api_url}
                          onChange={(e) => setExternalProviderForm((prev) => ({ ...prev, api_url: e.target.value }))}
                          className={inputCls}
                          placeholder={t("pages.pharmacy.api_url_placeholder")}
                          inputMode="url"
                        />
                      </Field>
                      <Field label={t("pages.pharmacy.auth_type")} required>
                        <select
                          value={externalProviderForm.auth_type}
                          onChange={(e) =>
                            setExternalProviderForm((prev) => ({
                              ...prev,
                              auth_type: e.target.value as PharmacyExternalAuthType,
                            }))
                          }
                          className={selectCls}
                        >
                          <option value="api_key">{t("pages.pharmacy.api_key")}</option>
                          <option value="bearer">{t("pages.pharmacy.bearer_token")}</option>
                          <option value="basic">{t("pages.pharmacy.basic_auth")}</option>
                        </select>
                      </Field>
                      <Field label={t("pages.pharmacy.api_key")} required>
                        <input
                          value={externalProviderForm.api_key}
                          onChange={(e) => setExternalProviderForm((prev) => ({ ...prev, api_key: e.target.value }))}
                          className={inputCls}
                          placeholder={t("pages.pharmacy.api_key_placeholder")}
                          autoComplete="off"
                        />
                      </Field>
                      <Field label={t("pages.pharmacy.secret_key")} required>
                        <PasswordInput
                          value={externalProviderForm.secret_key}
                          onChange={(secret_key) => setExternalProviderForm((prev) => ({ ...prev, secret_key }))}
                          placeholder={t("pages.pharmacy.secret_key_placeholder")}
                        />
                      </Field>
                      <Field label={t("pages.pharmacy.sync_interval")} required>
                        <input
                          type="number"
                          min={5}
                          step={5}
                          value={externalProviderForm.sync_interval_minutes}
                          onChange={(e) =>
                            setExternalProviderForm((prev) => ({
                              ...prev,
                              sync_interval_minutes: Number(e.target.value),
                            }))
                          }
                          className={inputCls}
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label={t("pages.pharmacy.extra_headers")} hint={t("pages.pharmacy.extra_headers_hint")}>
                          <textarea
                            value={externalProviderForm.extra_headers}
                            onChange={(e) =>
                              setExternalProviderForm((prev) => ({ ...prev, extra_headers: e.target.value }))
                            }
                            className={cn(inputCls, "min-h-[76px] resize-y")}
                            placeholder='{"X-Client-Id":"mediconnect"}'
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row">
                      <Button
                        className="h-9 rounded-[6px] px-4 text-[12px] gap-1.5"
                        onClick={handleConnectExternalProvider}
                        disabled={connectExternalProvider.isPending}
                      >
                        {connectExternalProvider.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" />
                        )}
                        Connect provider
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 rounded-[6px] px-4 text-[12px] gap-1.5"
                        onClick={() => handleSwitchInventoryMode("external")}
                        disabled={switchInventoryMode.isPending}
                      >
                        {switchInventoryMode.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PlugZap className="h-3.5 w-3.5" />
                        )}
                        Switch to external
                      </Button>
                    </div>
                  </div>
                )}

                <div className="rounded-[6px] border border-border/70 bg-background overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{t("pages.pharmacy.connected_providers")}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {t("pages.pharmacy.connected_providers_desc")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-[6px] px-3 text-[11px] gap-1.5 self-start sm:self-auto"
                      onClick={() => refetchProviders()}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t("pages.pharmacy.refresh")}
                    </Button>
                  </div>

                  <div className="p-4 space-y-3">
                    {providersLoading ? (
                      <div className="flex items-center gap-2 py-6 text-[12px] text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("pages.pharmacy.loading_providers")}
                      </div>
                    ) : providersError ? (
                      <div className="rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                        {t("pages.pharmacy.providers_load_failed")}
                      </div>
                    ) : externalProviders.length === 0 ? (
                      <div className="rounded-[6px] border border-dashed border-border/70 px-4 py-8 text-center">
                        <ServerCog className="mx-auto h-6 w-6 text-muted-foreground/50" />
                        <p className="mt-2 text-[12px] font-semibold text-foreground">{t("pages.pharmacy.no_external_provider")}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t("pages.pharmacy.no_external_provider_desc")}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                        <div className="space-y-2">
                          {externalProviders.map((provider) => (
                            <button
                              key={provider.id}
                              type="button"
                              onClick={() => setSelectedProviderId(provider.id)}
                              className={cn(
                                "w-full rounded-[6px] border p-3 text-left transition-all hover:border-primary/40",
                                selectedProvider?.id === provider.id
                                  ? "border-primary/50 bg-primary/10"
                                  : "border-border/70 bg-card",
                              )}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-[13px] font-semibold text-foreground">{provider.name}</p>
                                    <span
                                      className={cn(
                                        "rounded-[6px] border px-1.5 py-0.5 text-[10px] font-semibold",
                                        provider.is_active
                                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
                                          : "border-muted-foreground/25 bg-muted text-muted-foreground",
                                      )}
                                    >
                                      {provider.is_active ? "Active" : "Inactive"}
                                    </span>
                                    <span className="rounded-[6px] border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                      {provider.auth_type.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <p className="mt-1 truncate text-[11px] text-muted-foreground">{provider.api_url}</p>
                                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                                    {provider.inventory_count ?? 0} inventory items · sync every {provider.sync_interval_minutes} min
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-[6px] px-2 text-[10px] gap-1"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleSyncProvider(provider.id);
                                    }}
                                    disabled={syncExternalProvider.isPending || !provider.is_active}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    {t("pages.pharmacy.sync")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 rounded-[6px] px-2 text-[10px] gap-1"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleToggleProviderActive(provider.id, provider.is_active);
                                    }}
                                    disabled={updateExternalProvider.isPending}
                                  >
                                    {provider.is_active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                                    {provider.is_active ? t("pages.pharmacy.disable") : t("pages.pharmacy.enable")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 rounded-[6px] px-2 text-[10px] text-red-500 hover:text-red-500"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDeleteProvider(provider.id);
                                    }}
                                    disabled={deleteExternalProvider.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-2">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                  {t("pages.pharmacy.interval")}
                                </span>
                                <select
                                  value={provider.sync_interval_minutes}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) =>
                                    handleUpdateProviderInterval(provider.id, Number(event.target.value))
                                  }
                                  className="h-7 rounded-[6px] border border-border/60 bg-background px-2 text-[11px] text-foreground"
                                >
                                  <option value={15}>15 min</option>
                                  <option value={30}>30 min</option>
                                  <option value={60}>60 min</option>
                                  <option value={120}>2 hours</option>
                                </select>
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="rounded-[6px] border border-border/70 bg-card">
                          <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
                            <FileClock className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-[12px] font-semibold text-foreground">{t("pages.pharmacy.sync_logs")}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {selectedProvider?.name ?? t("pages.pharmacy.select_provider")}
                              </p>
                            </div>
                          </div>
                          <div className="max-h-[260px] overflow-y-auto p-3">
                            {!selectedProvider ? (
                              <p className="py-6 text-center text-[11px] text-muted-foreground">{t("pages.pharmacy.no_provider_selected")}</p>
                            ) : syncLogsLoading ? (
                              <div className="flex items-center gap-2 py-6 text-[11px] text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {t("pages.pharmacy.loading_logs")}
                              </div>
                            ) : !syncLogsResponse?.data?.length ? (
                              <p className="py-6 text-center text-[11px] text-muted-foreground">{t("pages.pharmacy.no_sync_logs")}</p>
                            ) : (
                              <div className="space-y-2">
                                {syncLogsResponse.data.map((log) => (
                                  <div key={log.id} className="rounded-[6px] border border-border/60 bg-background px-3 py-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span
                                        className={cn(
                                          "rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                                          log.status === "success"
                                            ? "bg-emerald-500/10 text-emerald-500"
                                            : log.status === "failed"
                                              ? "bg-red-500/10 text-red-500"
                                              : "bg-amber-500/10 text-amber-500",
                                        )}
                                      >
                                        {log.status}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {log.created_at ? formatDate(log.created_at) : ""}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                      {log.items_synced ?? 0} items synced
                                      {log.message ? ` · ${log.message}` : ""}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
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
                      {t("pages.pharmacy.delete_account")}
                    </p>
                    <p className="text-[10px] text-red-500/70 dark:text-red-500/60 mt-0.5">
                      {t("pages.pharmacy.delete_account_desc")}
                    </p>
                  </div>
                </div>
                <div className="px-5 py-5 space-y-5">
                  {!showDeleteConfirm ? (
                    <>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        Once you delete your account, all your data will be permanently erased and a farewell email
                        will be sent. This action{" "}
                        <span className="font-semibold text-foreground">{t("pages.pharmacy.cannot_be_undone")}</span>.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-5 text-[12px] rounded-[6px] border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 gap-1.5"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("pages.pharmacy.delete_my_account")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-[6px] bg-red-50/70 border border-red-200 dark:bg-red-950/20 dark:border-red-900/60">
                        <p className="text-[11px] text-red-700 dark:text-red-400 font-medium">
                          {t("pages.pharmacy.confirm_delete_desc")}
                        </p>
                      </div>
                      <Field label={t("pages.pharmacy.password")} required>
                        <PasswordInput
                          value={deletePassword}
                          onChange={setDeletePassword}
                          placeholder={t("pages.pharmacy.current_password_placeholder")}
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
                          {t("pages.pharmacy.cancel")}
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

export default PharmacySettings;

