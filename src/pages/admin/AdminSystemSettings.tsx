import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { LegalDocumentsManager } from "@/pages/admin/components/LegalDocumentsManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"; 
import { cn } from "@/lib/utils";
import { parseLocalizedText, stringifyLocalizedText } from "@/lib/localized-settings";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Globe,
  History,
  Info,
  KeyRound,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Video,
  XCircle,
} from "lucide-react";
import {
  useGetPublicSettings,
  useGetSettingsAuditLogs,
  useGetSettingsGroup,
  useUpdateSettingsGroup,
  type SettingValue,
  type SettingsGroup,
} from "@/hooks/admin/use-admin-system-settings";


import { toast as sonnerToast } from "sonner";
 
type FieldKind =
  | "text"
  | "email"
  | "url"
  | "tel"
  | "password"
  | "number"
  | "boolean"
  | "select"
  | "array"
  | "multilingual-text";

type FormValue = string | boolean;
type SettingsSection = SettingsGroup | "legal";

interface FieldOption {
  value: string;
  label: string;
}

interface FieldConfig {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: FieldOption[];
  secret?: boolean;
  hint?: string;
}

interface GroupConfig {
  group: SettingsSection;
  label: string;
  description: string;
  icon: React.ElementType;
  fields: FieldConfig[];
}
 
const GROUPS: GroupConfig[] = [
  {
    group: "general",
    label: "General",
    description: "Brand, language, contacts and public URLs",
    icon: Globe,
    fields: [
      { key: "app_name", label: "App name", kind: "text", placeholder: "MediConnect" },
      { key: "app_tagline", label: "App tagline", kind: "multilingual-text", placeholder: "Bringing care to your fingertips" },
      { key: "contact_email", label: "Contact email", kind: "email", placeholder: "info@mediconnect.rw" },
      { key: "contact_phone", label: "Contact phone", kind: "tel", placeholder: "+250788000000" },
      { key: "contact_address", label: "Contact address", kind: "text", placeholder: "Kigali, Rwanda" },
      {
        key: "default_language",
        label: "Default language",
        kind: "select",
        options: [
          { value: "en", label: "English" },
          { value: "fr", label: "French" },
          { value: "rw", label: "Kinyarwanda" },
        ],
      },
      {
        key: "supported_languages",
        label: "Supported languages",
        kind: "array",
        placeholder: "en, fr, rw",
        hint: "Comma-separated language codes",
      },
      {
        key: "timezone",
        label: "Timezone",
        kind: "select",
        options: [
          { value: "Africa/Kigali", label: "Africa/Kigali" },
          { value: "UTC", label: "UTC" },
          { value: "Europe/Paris", label: "Europe/Paris" },
        ],
      },
      {
        key: "default_currency",
        label: "Default currency",
        kind: "select",
        options: [
          { value: "RWF", label: "RWF" },
          { value: "USD", label: "USD" },
          { value: "EUR", label: "EUR" },
        ],
      },
      { key: "terms_url", label: "Terms URL", kind: "url", placeholder: "https://mediconnect.rw/terms" },
      { key: "privacy_url", label: "Privacy URL", kind: "url", placeholder: "https://mediconnect.rw/privacy" },
    ],
  },
  {
    group: "sms",
    label: "SMS",
    description: "SMS gateway, OTP and test mode configuration",
    icon: MessageSquare,
    fields: [
      { key: "enabled", label: "Enable SMS", kind: "boolean" },
      {
        key: "provider",
        label: "Provider",
        kind: "select",
        options: [
          { value: "africas_talking", label: "Africa's Talking" },
          { value: "twilio", label: "Twilio" },
          { value: "custom", label: "Custom" },
        ],
      },
      { key: "sender_id", label: "Sender ID", kind: "text", placeholder: "MediConnect" },
      { key: "api_key", label: "API key", kind: "password", secret: true },
      { key: "api_secret", label: "API secret", kind: "password", secret: true },
      { key: "test_mode", label: "Test mode", kind: "boolean" },
      { key: "test_number", label: "Test number", kind: "tel", placeholder: "+250788000000" },
      { key: "otp_expiry_minutes", label: "OTP expiry minutes", kind: "number", placeholder: "10" },
    ],
  },
  {
    group: "email",
    label: "Email",
    description: "SMTP driver and outgoing email identity",
    icon: Mail,
    fields: [
      { key: "enabled", label: "Enable email", kind: "boolean" },
      {
        key: "driver",
        label: "Driver",
        kind: "select",
        options: [
          { value: "smtp", label: "SMTP" },
          { value: "mailgun", label: "Mailgun" },
          { value: "ses", label: "Amazon SES" },
          { value: "log", label: "Log only" },
        ],
      },
      { key: "host", label: "Host", kind: "text", placeholder: "smtp.mailtrap.io" },
      { key: "port", label: "Port", kind: "number", placeholder: "587" },
      {
        key: "encryption",
        label: "Encryption",
        kind: "select",
        options: [
          { value: "tls", label: "TLS" },
          { value: "ssl", label: "SSL" },
          { value: "none", label: "None" },
        ],
      },
      { key: "username", label: "Username", kind: "text" },
      { key: "password", label: "Password", kind: "password", secret: true },
      { key: "from_address", label: "From address", kind: "email", placeholder: "no-reply@mediconnect.rw" },
      { key: "from_name", label: "From name", kind: "text", placeholder: "MediConnect" },
    ],
  },
  {
    group: "payment",
    label: "Payment",
    description: "Mobile money, Stripe and callback configuration",
    icon: CreditCard,
    fields: [
      {
        key: "default_gateway",
        label: "Default gateway",
        kind: "select",
        options: [
          { value: "mtn_momo", label: "MTN MoMo" },
          { value: "airtel_money", label: "Airtel Money" },
          { value: "stripe", label: "Stripe" },
        ],
      },
      { key: "mtn_enabled", label: "MTN enabled", kind: "boolean" },
      {
        key: "mtn_environment",
        label: "MTN environment",
        kind: "select",
        options: [
          { value: "sandbox", label: "Sandbox" },
          { value: "production", label: "Production" },
        ],
      },
      { key: "mtn_api_user", label: "MTN API user", kind: "text" },
      { key: "mtn_api_key", label: "MTN API key", kind: "password", secret: true },
      { key: "mtn_subscription_key", label: "MTN subscription key", kind: "password", secret: true },
      { key: "mtn_callback_url", label: "MTN callback URL", kind: "url", placeholder: "https://mediconnect.rw/api/callbacks/mtn" },
      { key: "airtel_enabled", label: "Airtel enabled", kind: "boolean" },
      { key: "stripe_enabled", label: "Stripe enabled", kind: "boolean" },
      { key: "stripe_public_key", label: "Stripe public key", kind: "text", placeholder: "pk_test_xxx" },
      { key: "stripe_secret_key", label: "Stripe secret key", kind: "password", secret: true },
      { key: "stripe_webhook_secret", label: "Stripe webhook secret", kind: "password", secret: true },
    ],
  },
  {
    group: "video",
    label: "Video",
    description: "Teleconsultation provider and session rules",
    icon: Video,
    fields: [
      { key: "enabled", label: "Enable video", kind: "boolean" },
      {
        key: "provider",
        label: "Provider",
        kind: "select",
        options: [
          { value: "daily_co", label: "Daily.co" },
          { value: "zoom", label: "Zoom" },
          { value: "jitsi", label: "Jitsi" },
        ],
      },
      { key: "daily_api_key", label: "Daily API key", kind: "password", secret: true },
      { key: "daily_domain", label: "Daily domain", kind: "text", placeholder: "mediconnect.daily.co" },
      { key: "session_duration_minutes", label: "Session duration minutes", kind: "number", placeholder: "30" },
      { key: "waiting_room_enabled", label: "Waiting room enabled", kind: "boolean" },
    ],
  },
  {
    group: "notifications",
    label: "Notifications",
    description: "SMS, email and push notification triggers",
    icon: Bell,
    fields: [
      { key: "sms_on_booking", label: "SMS on booking", kind: "boolean" },
      { key: "sms_on_appointment_confirmed", label: "SMS on appointment confirmed", kind: "boolean" },
      { key: "sms_on_appointment_cancelled", label: "SMS on appointment cancelled", kind: "boolean" },
      { key: "sms_on_payment", label: "SMS on payment", kind: "boolean" },
      { key: "sms_on_otp", label: "SMS on OTP", kind: "boolean" },
      { key: "sms_on_session_reminder", label: "SMS on session reminder", kind: "boolean" },
      { key: "email_on_registration", label: "Email on registration", kind: "boolean" },
      { key: "email_on_booking", label: "Email on booking", kind: "boolean" },
      { key: "email_on_appointment_confirmed", label: "Email on appointment confirmed", kind: "boolean" },
      { key: "push_enabled", label: "Push enabled", kind: "boolean" },
      { key: "fcm_server_key", label: "FCM server key", kind: "password", secret: true },
    ],
  },
  {
    group: "security",
    label: "Security",
    description: "OTP, login lockout and verification rules",
    icon: ShieldCheck,
    fields: [
      { key: "otp_enabled", label: "OTP enabled", kind: "boolean" },
      { key: "otp_length", label: "OTP length", kind: "number", placeholder: "6" },
      { key: "otp_expiry_minutes", label: "OTP expiry minutes", kind: "number", placeholder: "10" },
      { key: "max_login_attempts", label: "Max login attempts", kind: "number", placeholder: "5" },
      { key: "lockout_duration_minutes", label: "Lockout duration minutes", kind: "number", placeholder: "15" },
      { key: "token_expiry_days", label: "Token expiry days", kind: "number", placeholder: "30" },
      { key: "guest_access_enabled", label: "Guest access enabled", kind: "boolean" },
      { key: "require_phone_verification", label: "Require phone verification", kind: "boolean" },
      { key: "require_email_verification", label: "Require email verification", kind: "boolean" },
    ],
  },
  {
    group: "legal",
    label: "Legal",
    description: "Terms and privacy policy versions",
    icon: FileText,
    fields: [],
  },
];

const SETTINGS_GROUPS = GROUPS.filter((item): item is GroupConfig & { group: SettingsGroup } => item.group !== "legal");

const INPUT_CLASS =
  "w-full h-9 rounded-[6px] border border-border/60 bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40 transition-all";

const MASK = "********";

 
function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const data = "data" in error ? (error as { data?: unknown }).data : null;
    if (data && typeof data === "object") {
      const payload = data as { message?: unknown; errors?: Record<string, string[]> | string[] };
      if (payload.errors) {
        const flat = Array.isArray(payload.errors)
          ? payload.errors
          : Object.values(payload.errors).flat();
        if (flat.length > 0) return flat.join(" - ");
      }
      if (typeof payload.message === "string") return payload.message;
    }
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  return false;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayValue(value?: string | null) {
  if (value === null || value === undefined || value === "") return "-";
  return value.length > 42 ? `${value.slice(0, 42)}...` : value;
}

function isMaskedSecret(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Backends commonly return encrypted values as bullets, asterisks, or dots.
  return /^[\u2022\u25cf*\u00b7.]{4,}$/.test(trimmed) || trimmed === MASK;
}

function settingValueToString(value: SettingValue | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return String(value);
}

function groupConfig(group: SettingsSection) {
  return GROUPS.find((item) => item.group === group) ?? GROUPS[0];
}

function coerceToFormValue(field: FieldConfig, value: SettingValue | undefined): FormValue {
  if (field.secret && isMaskedSecret(value)) return "";
  if (field.kind === "boolean") return toBool(value);
  if (field.kind === "array") return Array.isArray(value) ? value.join(", ") : String(value ?? "");
  if (field.kind === "number") return value === null || value === undefined ? "" : String(value);
  return String(value ?? "");
}

function buildPayload(fields: FieldConfig[], form: Record<string, FormValue>) {
  const payload: Record<string, SettingValue> = {};

  fields.forEach((field) => {
    const raw = form[field.key];

    // Do not send masked/unchanged encrypted values.
    if (field.secret && (String(raw ?? "").trim() === "" || isMaskedSecret(raw))) return;

    if (field.kind === "boolean") {
      payload[field.key] = Boolean(raw);
      return;
    }

    if (field.kind === "number") {
      const value = String(raw ?? "").trim();
      if (value === "") return;
      payload[field.key] = Number(value);
      return;
    }

    if (field.kind === "array") {
      payload[field.key] = String(raw ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      return;
    }

    if (field.kind === "multilingual-text") {
      payload[field.key] = String(raw ?? "").trim();
      return;
    }

    payload[field.key] = String(raw ?? "").trim();
  });

  return payload;
}

// Small UI components

function MiniStat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[6px] border border-border/60 bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        <Icon className={cn("h-3.5 w-3.5", accent && "text-primary")} />
        {label}
      </div>
      <p className={cn("mt-2 truncate text-[15px] font-semibold", accent ? "text-primary" : "text-foreground")}>
        {value || "-"}
      </p>
    </div>
  );
}

function EmptyCard({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[6px] border border-dashed border-border/70 bg-card px-4 py-12 text-center">
      <Info className="h-7 w-7 text-muted-foreground/40" />
      <p className="mt-3 text-[12px] font-semibold text-foreground">{message}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

function SecretInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Leave blank to keep current value"}
        className={cn(INPUT_CLASS, "pr-9")}
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  isPublic,
}: {
  label: string;
  description?: string | null;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isPublic?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[6px] border border-border/60 bg-secondary/20 px-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-medium text-foreground">{label}</p>
          {isPublic && (
            <Badge variant="outline" className="h-5 rounded-[6px] px-1.5 text-[9px]">
              Public
            </Badge>
          )}
        </div>
        {description && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function MultilingualTextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseLocalizedText(value);
  const update = (key: "en" | "fr" | "kiny", nextValue: string) => {
    onChange(stringifyLocalizedText({ ...parsed, [key]: nextValue }));
  };

  return (
    <div className="grid gap-2">
      {[
        { key: "en" as const, label: "English", placeholder },
        { key: "fr" as const, label: "French", placeholder: "Votre sante au bout des doigts" },
        { key: "kiny" as const, label: "Kinyarwanda", placeholder: "Ubuvuzi hafi yawe" },
      ].map((item) => (
        <div key={item.key} className="grid gap-1">
          <span className="text-[10px] font-medium text-muted-foreground/70">{item.label}</span>
          <input
            type="text"
            value={parsed[item.key] ?? ""}
            onChange={(event) => update(item.key, event.target.value)}
            placeholder={item.placeholder}
            className={INPUT_CLASS}
          />
        </div>
      ))}
    </div>
  );
}

function FieldEditor({
  field,
  value,
  description,
  isPublic,
  onChange,
}: {
  field: FieldConfig;
  value: FormValue;
  description?: string | null;
  isPublic?: boolean;
  onChange: (value: FormValue) => void;
}) {
  if (field.kind === "boolean") {
    return (
      <ToggleRow
        label={field.label}
        description={description ?? field.hint}
        checked={Boolean(value)}
        onChange={onChange}
        isPublic={isPublic}
      />
    );
  }

  return (
    <label className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {field.label}
        </span>
        {isPublic && (
          <Badge variant="outline" className="h-5 rounded-[6px] px-1.5 text-[9px]">
            Public
          </Badge>
        )}
      </div>

      {field.kind === "select" ? (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS}>
          <option value="">Select</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.secret || field.kind === "password" ? (
        <SecretInput value={String(value ?? "")} onChange={onChange as (v: string) => void} />
      ) : field.kind === "multilingual-text" ? (
        <MultilingualTextInput
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={onChange as (v: string) => void}
        />
      ) : (
        <input
          type={field.kind === "array" ? "text" : field.kind}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={INPUT_CLASS}
        />
      )}

      {(description || field.hint || field.secret) && (
        <p className="text-[10px] text-muted-foreground/60">
          {field.secret ? "Encrypted field. Leave blank to keep the existing value." : description || field.hint}
        </p>
      )}
    </label>
  );
}

// Page

function AdminSystemSettings() {
  const { t } = useTranslation(); 

  const [activeGroup, setActiveGroup] = useState<SettingsSection>("general");
  const [form, setForm] = useState<Record<string, FormValue>>({});
  const [auditGroup, setAuditGroup] = useState<"all" | SettingsGroup>("all");
  const [auditAction, setAuditAction] = useState("updated");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPerPage, setAuditPerPage] = useState(25);

  const activeConfig = useMemo(() => groupConfig(activeGroup), [activeGroup]);
  const ActiveGroupIcon = activeConfig.icon;
  const isLegalTab = activeGroup === "legal";
  const activeSettingsGroup: SettingsGroup = isLegalTab ? "general" : activeGroup;

  const publicSettings = useGetPublicSettings();
  const generalSettingsQuery = useGetSettingsGroup("general");
  const settingsQuery = useGetSettingsGroup(activeSettingsGroup);
  const auditLogs = useGetSettingsAuditLogs({
    group: auditGroup === "all" ? undefined : auditGroup,
    action: auditAction || undefined,
    per_page: auditPerPage,
    page: auditPage,
  });
  const updateSettings = useUpdateSettingsGroup();

  const settings = settingsQuery.data?.settings ?? {};

  useEffect(() => {
    setAuditPage(1);
  }, [auditGroup, auditAction, auditPerPage]);

  useEffect(() => {
    const next: Record<string, FormValue> = {};
    activeConfig.fields.forEach((field) => {
      next[field.key] = coerceToFormValue(field, settings[field.key]?.value);
    });
    setForm(next);
  }, [activeConfig, settingsQuery.data]);

  const publicData = publicSettings.data?.settings;
  const generalSettings = generalSettingsQuery.data?.settings ?? {};

  const summaryValue = (key: string) => {
    const publicValue = publicData?.[key];
    if (publicValue !== undefined && publicValue !== null && String(publicValue).trim() !== "") {
      return String(publicValue);
    }

    return settingValueToString(generalSettings[key]?.value);
  };

  const auditTotal = auditLogs.data?.total ?? 0;
  const auditCurrentPage = auditLogs.data?.current_page ?? auditPage;
  const auditPageSize = auditLogs.data?.per_page ?? auditPerPage;
  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditPageSize));
  const auditStart = auditTotal === 0 ? 0 : (auditCurrentPage - 1) * auditPageSize + 1;
  const auditEnd = Math.min(auditCurrentPage * auditPageSize, auditTotal);
  const updatedCount = settingsQuery.data
    ? Object.keys(settingsQuery.data.settings).filter((key) => settingsQuery.data?.settings[key]?.value !== null).length
    : 0;
  const publicCount = settingsQuery.data
    ? Object.values(settingsQuery.data.settings).filter((item) => item.is_public).length
    : 0;

  const setValue = (key: string, value: FormValue) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };







  // import { toast as sonnerToast } from "sonner";




  const handleSave = async () => {
    if (isLegalTab) return;
    const payload = buildPayload(activeConfig.fields, form);

    if (Object.keys(payload).length === 0) { 
      sonnerToast.error("Nothing to save. Secret fields were empty, so no values were sent.");
      return;
    }

    try {
      const res = await updateSettings.mutateAsync({ group: activeSettingsGroup, payload });
      const skipped = res.skipped?.length ? ` Skipped: ${res.skipped.join(", ")}` : "";
      sonnerToast.success(`Settings saved successfully.${skipped}`);
    } catch (error) {
      sonnerToast.error("Could not save settings" + (error instanceof Error ? `: ${error.message}` : "."));
    }
  };

  // const handleReset = () => {
  //   const next: Record<string, FormValue> = {};
  //   activeConfig.fields.forEach((field) => {
  //     next[field.key] = coerceToFormValue(field, settings[field.key]?.value);
  //   });
  //   setForm(next);
  // };

  return (
    <DashboardLayout role="admin">
      <div className="flex h-full flex-col">
        <PageHeader
          title={t("admin.system_settings.title", "System Settings")}
          subtitle={t(
            "admin.system_settings.subtitle",
            "Configure public app details, integrations, notifications, payments and security",
          )}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Public summary */}
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <MiniStat label="App" value={summaryValue("app_name")} icon={Globe} accent />
              <MiniStat label="Timezone" value={summaryValue("timezone")} icon={Clock} />
              <MiniStat label="Currency" value={summaryValue("default_currency")} icon={CreditCard} />
              <MiniStat label="Contact" value={summaryValue("contact_email")} icon={Mail} />
            </div>
          </div>

          {/* Group tabs */}
          <div className="sticky top-0 z-20 mt-3 border-y border-border/60 bg-background/90 px-2 backdrop-blur-md sm:px-4">
            <div className="flex items-center gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {GROUPS.map((item) => {
                const Icon = item.icon;
                const active = activeGroup === item.group;
                return (
                  <button
                    key={item.group}
                    type="button"
                    onClick={() => setActiveGroup(item.group)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-[6px] border px-3 py-2 text-[11px] font-medium transition-all",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                        : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isLegalTab ? (
            <div className="p-3 sm:p-4">
              <LegalDocumentsManager />
            </div>
          ) : (
          <div className="grid gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            {/* Main settings card */}
            <section className="rounded-[6px] border border-border/70 bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
                    <ActiveGroupIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{activeConfig.label} settings</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">{activeConfig.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="rounded-[6px] text-[10px]">
                        {updatedCount} configured
                      </Badge>
                      <Badge variant="outline" className="rounded-[6px] text-[10px]">
                        {publicCount} public
                      </Badge>
                      {settingsQuery.isFetching && (
                        <Badge variant="outline" className="rounded-[6px] text-[10px]">
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Refreshing
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  
                  <Button
                    size="sm"
                    className="h-8 rounded-[6px] text-[11px]"
                    onClick={handleSave}
                    disabled={settingsQuery.isLoading || updateSettings.isPending}
                  >
                    {updateSettings.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Save changes
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {settingsQuery.isLoading ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-[6px] border border-border/60 bg-secondary/30" />
                    ))}
                  </div>
                ) : settingsQuery.isError ? (
                  <EmptyCard message="Failed to load settings" sub="Check your connection or confirm the settings group exists." />
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {activeConfig.fields.map((field) => {
                      const meta = settings[field.key];
                      return (
                        <FieldEditor
                          key={field.key}
                          field={field}
                          value={form[field.key] ?? (field.kind === "boolean" ? false : "")}
                          description={meta?.description}
                          isPublic={meta?.is_public}
                          onChange={(value) => setValue(field.key, value)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Side panel */}
            <aside className="space-y-4 xl:sticky xl:top-[58px] xl:self-start">
              <div className="rounded-[6px] border border-border/70 bg-card shadow-sm">
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <KeyRound className="h-4 w-4 text-primary" /> Secret fields
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    API keys and passwords are encrypted on the backend.
                  </p>
                </div>
                <div className="space-y-2 px-4 py-4 text-[11px] text-muted-foreground/80">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-500" />
                    Existing encrypted values are shown as empty inputs.
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-500" />
                    Leaving them blank keeps the current backend value.
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                    Enter a new value only when you want to replace it.
                  </div>
                </div>
              </div>            
            </aside>
          </div>
          )}
             <div className="mx-4 rounded-[6px] mt-1 border border-border/70 bg-card shadow-sm">
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <History className="h-4 w-4 text-primary" /> Audit logs
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">Recent setting changes by admins</p>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-border/60 px-4 py-3">
                  <select
                    value={auditGroup}
                    onChange={(e) => setAuditGroup(e.target.value as "all" | SettingsGroup)}
                    className="h-8 rounded-[6px] border border-border/60 bg-background px-2 text-[11px] outline-none focus:border-primary/50"
                  >
                    <option value="all">All groups</option>
                    {SETTINGS_GROUPS.map((item) => (
                      <option key={item.group} value={item.group}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={auditAction}
                    onChange={(e) => setAuditAction(e.target.value)}
                    className="h-8 rounded-[6px] border border-border/60 bg-background px-2 text-[11px] outline-none focus:border-primary/50"
                  >
                    <option value="updated">Updated</option>
                    <option value="created">Created</option>
                    <option value="deleted">Deleted</option>
                    <option value="">All actions</option>
                  </select>
                  <select
                    value={auditPerPage}
                    onChange={(e) => setAuditPerPage(Number(e.target.value))}
                    className="col-span-2 h-8 rounded-[6px] border border-border/60 bg-background px-2 text-[11px] outline-none focus:border-primary/50"
                  >
                    <option value={10}>10 logs per page</option>
                    <option value={25}>25 logs per page</option>
                    <option value={50}>50 logs per page</option>
                    <option value={100}>100 logs per page</option>
                  </select>
                </div>

                <div className=" overflow-y-auto">
                  {auditLogs.isLoading ? (
                    <div className="space-y-2 p-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-[6px] bg-secondary/40" />
                      ))}
                    </div>
                  ) : auditLogs.isError ? (
                    <div className="p-4">
                      <EmptyCard message="Could not load audit logs" />
                    </div>
                  ) : !auditLogs.data?.data?.length ? (
                    <div className="p-4">
                      <EmptyCard message="No audit logs found" />
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {auditLogs.data.data.map((log) => (
                        <div key={log.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-foreground">
                                {log.setting_key}
                              </p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                                {log.setting_group} - {log.action} - {log.admin?.name ?? "Unknown admin"}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0 rounded-[6px] text-[9px]">
                              #{log.id}
                            </Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded-[6px] bg-secondary/30 px-2 py-1.5">
                              <span className="text-muted-foreground">Old: </span>
                              <span className="font-medium text-foreground">{displayValue(log.old_value)}</span>
                            </div>
                            <div className="rounded-[6px] bg-secondary/30 px-2 py-1.5">
                              <span className="text-muted-foreground">New: </span>
                              <span className="font-medium text-foreground">{displayValue(log.new_value)}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-[10px] text-muted-foreground/60">{formatDateTime(log.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3">
                  <p className="text-[10px] text-muted-foreground/70">
                    {auditLogs.isFetching ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading logs...
                      </span>
                    ) : auditTotal > 0 ? (
                      <>Showing {auditStart}-{auditEnd} of {auditTotal}</>
                    ) : (
                      "No logs"
                    )}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 rounded-[6px] p-0"
                      onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
                      disabled={auditLogs.isFetching || auditCurrentPage <= 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="min-w-10 text-center text-[10px] text-muted-foreground">
                      {auditCurrentPage}/{auditTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 rounded-[6px] p-0"
                      onClick={() => setAuditPage((page) => Math.min(auditTotalPages, page + 1))}
                      disabled={auditLogs.isFetching || auditCurrentPage >= auditTotalPages}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
        </main>
      </div>
    </DashboardLayout>
  );
}

export default AdminSystemSettings;
