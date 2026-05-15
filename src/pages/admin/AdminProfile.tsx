import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  User,
  ShieldCheck,
  Bell,
  KeyRound,
  Check,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Phone,
  Clock,
  ActivitySquare,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface PersonalInfo {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  department: string;
  language: string;
  timezone: string;
}

interface SecurityInfo {
  current_password: string;
  new_password: string;
  confirm_password: string;
  two_factor_enabled: boolean;
  session_timeout_minutes: string;
}

interface PermissionsInfo {
  role: string;
  can_manage_users: boolean;
  can_manage_hospitals: boolean;
  can_manage_pharmacies: boolean;
  can_manage_prescriptions: boolean;
  can_view_reports: boolean;
  can_export_data: boolean;
}

interface NotificationsInfo {
  email_alerts: boolean;
  sms_alerts: boolean;
  new_prescription_alert: boolean;
  system_alerts: boolean;
  weekly_report: boolean;
  login_alerts: boolean;
}

interface AdminProfileData {
  personal: PersonalInfo;
  security: SecurityInfo;
  permissions: PermissionsInfo;
  notifications: NotificationsInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "kiny", label: "Kinyarwanda" },
];

const TIMEZONES = [
  { value: "Africa/Kigali", label: "Africa/Kigali (UTC+2)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+1/+2)" },
];

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "viewer", label: "Viewer" },
];

const SESSION_TIMEOUTS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "240", label: "4 hours" },
  { value: "480", label: "8 hours" },
];

const STEPS = [
  {
    id: "personal" as const,
    label: "Personal",
    icon: User,
    sectionTitle: "Personal information",
    description: "Name, contact & preferences",
  },
  {
    id: "security" as const,
    label: "Security",
    icon: KeyRound,
    sectionTitle: "Security & authentication",
    description: "Password, 2FA & session",
  },
  {
    id: "permissions" as const,
    label: "Permissions",
    icon: ShieldCheck,
    sectionTitle: "Role & permissions",
    description: "Access control & capabilities",
  },
  {
    id: "notifications" as const,
    label: "Notifications",
    icon: Bell,
    sectionTitle: "Notification preferences",
    description: "Alerts, emails & reports",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const humanRole = (r: string) =>
  r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// Shared FormField
// ─────────────────────────────────────────────────────────────────────────────
function FormField({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle row (used for permissions & notifications)
// ─────────────────────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2.5">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {sub && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
        {label}
      </span>
      <span
        className={cn(
          "text-xl font-semibold tabular-nums truncate",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ViewField
// ─────────────────────────────────────────────────────────────────────────────
function ViewField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium text-foreground",
          mono && "font-mono",
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Sidebar — mirrors DoctorProfile / PharmacyProfile / HospitalProfile
// ─────────────────────────────────────────────────────────────────────────────
function UnifiedSidebar({
  currentStep,
  visited,
  onSelect,
  mode,
  profileData,
  onEdit,
  onDelete,
}: {
  currentStep: number;
  visited: Set<number>;
  onSelect: (i: number) => void;
  mode: "create" | "edit" | "view";
  profileData: AdminProfileData | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isForm = mode === "create" || mode === "edit";
  const visitedCount = visited.size;
  const pct = Math.round((visitedCount / STEPS.length) * 100);

  return (
    <div className="w-56 shrink-0 flex flex-col border-r border-border bg-card/50">
      {/* ── Progress header (form) or mini-card (view) ── */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        {isForm ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Profile setup
              </span>
              <span className="text-[11px] font-bold text-primary tabular-nums">
                {pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {visitedCount} of {STEPS.length} sections visited
            </p>
          </div>
        ) : profileData ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
                {getInitials(
                  profileData.personal.first_name,
                  profileData.personal.last_name,
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {profileData.personal.first_name}{" "}
                  {profileData.personal.last_name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {humanRole(profileData.permissions.role)}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: "Department", value: profileData.personal.department },
                {
                  label: "2FA",
                  value: profileData.security.two_factor_enabled
                    ? "Enabled"
                    : "Disabled",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-[10px] font-medium text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Step nav ── */}
      <div className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep && isForm;
          const isDone = visited.has(i) && (!isForm || i !== currentStep);

          return (
            <button
              key={step.id}
              onClick={() => (isForm ? onSelect(i) : undefined)}
              disabled={!isForm}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-left transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isForm
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    : "text-muted-foreground cursor-default",
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold border transition-all",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-muted border-border text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-xs font-medium leading-tight truncate",
                      isActive ? "text-primary" : "",
                    )}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-primary shrink-0">
                      editing
                    </span>
                  )}
                  {isDone && isForm && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">
                      done
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                  {step.description}
                </p>
                {isForm && (
                  <div className="h-0.5 rounded-full bg-muted overflow-hidden mt-1.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isActive
                          ? "bg-primary w-1/2"
                          : isDone
                            ? "bg-primary w-full"
                            : "bg-transparent w-0",
                      )}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Footer actions (view) ── */}
      {!isForm && profileData && (
        <div className="p-3 border-t border-border space-y-2">
          <Button
            onClick={onEdit}
            className="w-full text-primary-foreground bg-primary hover:bg-primary/90 text-xs gap-1.5 h-8"
          >
            <Pencil size={12} />
            Edit profile
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 h-8"
          >
            <Trash2 size={12} />
            Delete profile
          </Button>
        </div>
      )}

      {/* ── Footer hint (form) ── */}
      {isForm && (
        <div className="px-3.5 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {mode === "edit"
              ? "Click any section to jump directly"
              : "Jump between sections freely — no order needed"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Form — step bodies
// ─────────────────────────────────────────────────────────────────────────────
function AdminForm({
  mode,
  defaultData,
  onSubmit,
  onCancel,
  currentStep,
  onStepChange,
  visited,
  onVisitedChange,
}: {
  mode: "create" | "edit";
  defaultData?: Partial<AdminProfileData>;
  onSubmit: (data: AdminProfileData) => void;
  onCancel: () => void;
  currentStep: number;
  onStepChange: (i: number) => void;
  visited: Set<number>;
  onVisitedChange: (v: Set<number>) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Permissions state
  const [permissions, setPermissions] = useState<PermissionsInfo>({
    role: "admin",
    can_manage_users: true,
    can_manage_hospitals: true,
    can_manage_pharmacies: true,
    can_manage_prescriptions: true,
    can_view_reports: true,
    can_export_data: false,
    ...defaultData?.permissions,
  });

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationsInfo>({
    email_alerts: true,
    sms_alerts: false,
    new_prescription_alert: true,
    system_alerts: true,
    weekly_report: true,
    login_alerts: true,
    ...defaultData?.notifications,
  });

  // Security toggles
  const [twoFactor, setTwoFactor] = useState(
    defaultData?.security?.two_factor_enabled ?? false,
  );

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PersonalInfo & SecurityInfo>({
    defaultValues: {
      ...defaultData?.personal,
      ...defaultData?.security,
    },
  });

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isEdit = mode === "edit";

  const goTo = (i: number) => {
    onVisitedChange(new Set([...visited, i]));
    onStepChange(i);
  };

  const goNext = async () => {
    if (step.id === "personal") {
      const valid = await trigger([
        "first_name",
        "last_name",
        "email",
        "phone",
        "job_title",
        "department",
      ]);
      if (!valid) return;
    }
    if (isLast) {
      handleSubmit((formData) => {
        onSubmit({
          personal: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            job_title: formData.job_title,
            department: formData.department,
            language: formData.language,
            timezone: formData.timezone,
          },
          security: {
            current_password: formData.current_password,
            new_password: formData.new_password,
            confirm_password: formData.confirm_password,
            two_factor_enabled: twoFactor,
            session_timeout_minutes: formData.session_timeout_minutes,
          },
          permissions,
          notifications,
        });
      })();
      return;
    }
    goTo(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep === 0) {
      onCancel();
      return;
    }
    goTo(currentStep - 1);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Section label bar */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {step.sectionTitle}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
      </div>

      <div key={currentStep} className="flex-1 overflow-y-auto p-5">
        {/* ── Step 1: Personal ── */}
        {step.id === "personal" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First name" error={errors.first_name?.message}>
              <Input
                {...register("first_name", { required: "Required" })}
                placeholder="Jean"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="Last name" error={errors.last_name?.message}>
              <Input
                {...register("last_name", { required: "Required" })}
                placeholder="Uwimana"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label="Email address"
              error={errors.email?.message}
              className="col-span-2"
            >
              <Input
                type="email"
                {...register("email", {
                  required: "Required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email",
                  },
                })}
                placeholder="admin@medisystem.rw"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label="Phone number"
              error={errors.phone?.message}
              className="col-span-2"
            >
              <Input
                type="tel"
                {...register("phone", { required: "Required" })}
                placeholder="+250788000001"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="Job title" error={errors.job_title?.message}>
              <Input
                {...register("job_title", { required: "Required" })}
                placeholder="System Administrator"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="Department" error={errors.department?.message}>
              <Input
                {...register("department", { required: "Required" })}
                placeholder="IT & Operations"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="Preferred language">
              <Select
                defaultValue={defaultData?.personal?.language ?? "en"}
                onValueChange={(v) => setValue("language", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Timezone">
              <Select
                defaultValue={
                  defaultData?.personal?.timezone ?? "Africa/Kigali"
                }
                onValueChange={(v) => setValue("timezone", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {/* ── Step 2: Security ── */}
        {step.id === "security" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Current password" className="col-span-2">
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  {...register("current_password")}
                  placeholder={
                    isEdit
                      ? "Enter current password"
                      : "Leave blank if new account"
                  }
                  className="border-border focus-visible:ring-primary text-xs h-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </FormField>

            <FormField
              label="New password"
              error={errors.new_password?.message}
            >
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  {...register("new_password", {
                    minLength: { value: 8, message: "Min 8 characters" },
                  })}
                  placeholder="Min 8 characters"
                  className="border-border focus-visible:ring-primary text-xs h-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPw ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </FormField>

            <FormField
              label="Confirm new password"
              error={errors.confirm_password?.message}
            >
              <Input
                type="password"
                {...register("confirm_password", {
                  validate: (v) =>
                    !watch("new_password") ||
                    v === watch("new_password") ||
                    "Passwords don't match",
                })}
                placeholder="Repeat new password"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <div className="col-span-2 border-t border-border pt-4 space-y-3">
              <ToggleRow
                label="Two-factor authentication"
                sub="Require a verification code on login"
                checked={twoFactor}
                onChange={setTwoFactor}
              />
            </div>

            <FormField label="Session timeout" className="col-span-2">
              <Select
                defaultValue={
                  defaultData?.security?.session_timeout_minutes ?? "60"
                }
                onValueChange={(v) => setValue("session_timeout_minutes", v)}
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TIMEOUTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {/* ── Step 3: Permissions ── */}
        {step.id === "permissions" && (
          <div className="space-y-4">
            <FormField label="Role">
              <Select
                value={permissions.role}
                onValueChange={(v) =>
                  setPermissions((p) => ({ ...p, role: v }))
                }
              >
                <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <div className="border-t border-border pt-3 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Access capabilities
              </p>
              {(
                [
                  {
                    key: "can_manage_users",
                    label: "Manage users",
                    sub: "Create, edit & delete user accounts",
                  },
                  {
                    key: "can_manage_hospitals",
                    label: "Manage hospitals",
                    sub: "Full hospital profile access",
                  },
                  {
                    key: "can_manage_pharmacies",
                    label: "Manage pharmacies",
                    sub: "Full pharmacy profile access",
                  },
                  {
                    key: "can_manage_prescriptions",
                    label: "Manage prescriptions",
                    sub: "View and update prescriptions",
                  },
                  {
                    key: "can_view_reports",
                    label: "View reports",
                    sub: "Access analytics and statistics",
                  },
                  {
                    key: "can_export_data",
                    label: "Export data",
                    sub: "Download CSV / Excel exports",
                  },
                ] as const
              ).map(({ key, label, sub }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  sub={sub}
                  checked={permissions[key]}
                  onChange={(v) => setPermissions((p) => ({ ...p, [key]: v }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: Notifications ── */}
        {step.id === "notifications" && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Delivery channels
              </p>
              <ToggleRow
                label="Email alerts"
                sub="Receive notifications via email"
                checked={notifications.email_alerts}
                onChange={(v) =>
                  setNotifications((n) => ({ ...n, email_alerts: v }))
                }
              />
              <ToggleRow
                label="SMS alerts"
                sub="Receive notifications via SMS"
                checked={notifications.sms_alerts}
                onChange={(v) =>
                  setNotifications((n) => ({ ...n, sms_alerts: v }))
                }
              />
            </div>

            <div className="border-t border-border pt-3 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Event triggers
              </p>
              {(
                [
                  {
                    key: "new_prescription_alert",
                    label: "New prescription",
                    sub: "Alert on every new prescription",
                  },
                  {
                    key: "system_alerts",
                    label: "System alerts",
                    sub: "Critical system events & errors",
                  },
                  {
                    key: "login_alerts",
                    label: "Login alerts",
                    sub: "Notify on new login from unknown device",
                  },
                  {
                    key: "weekly_report",
                    label: "Weekly report",
                    sub: "Summary email every Monday",
                  },
                ] as const
              ).map(({ key, label, sub }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  sub={sub}
                  checked={notifications[key]}
                  onChange={(v) =>
                    setNotifications((n) => ({ ...n, [key]: v }))
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-muted/50 border-t border-border">
        <Button
          variant="outline"
          onClick={goBack}
          className="border-border text-xs"
        >
          {currentStep === 0 ? "Cancel" : "← Back"}
        </Button>
        <Button
          onClick={goNext}
          className="text-primary-foreground text-xs bg-primary hover:bg-primary/90"
        >
          {isLast ? (isEdit ? "Save changes" : "Create profile") : "Next →"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View mode — inline panels
// ─────────────────────────────────────────────────────────────────────────────
function AdminProfileView({ profile }: { profile: AdminProfileData }) {
  const activePermissions = Object.entries(profile.permissions)
    .filter(([k, v]) => k !== "role" && v === true)
    .map(([k]) =>
      k
        .replace(/^can_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    );

  const activeNotifications = Object.entries(profile.notifications)
    .filter(([, v]) => v === true)
    .map(([k]) =>
      k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    );

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* ── Personal ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User size={15} className="text-primary" />
          Personal information
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <ViewField label="First name" value={profile.personal.first_name} />
          <ViewField label="Last name" value={profile.personal.last_name} />
          <ViewField label="Job title" value={profile.personal.job_title} />
          <ViewField label="Department" value={profile.personal.department} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary">
              <Mail size={13} />
            </div>
            <span className="text-[11px] font-medium text-primary truncate">
              {profile.personal.email}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
              <Phone size={13} />
            </div>
            <span className="text-[11px] font-medium text-foreground font-mono">
              {profile.personal.phone}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
              <Globe size={13} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-foreground">
                {profile.personal.language.toUpperCase()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {profile.personal.timezone}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Security ── */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <KeyRound size={15} className="text-primary" />
          Security
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Two-factor auth
            </span>
            <span
              className={cn(
                "text-[11px] font-medium",
                profile.security.two_factor_enabled
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              {profile.security.two_factor_enabled ? "✓ Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Session timeout
            </span>
            <span className="text-[11px] font-medium text-foreground">
              {SESSION_TIMEOUTS.find(
                (s) => s.value === profile.security.session_timeout_minutes,
              )?.label ?? `${profile.security.session_timeout_minutes} min`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Permissions ── */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck size={15} className="text-primary" />
          Role & permissions
        </h3>
        <div className="flex items-center gap-3 mb-2">
          <Badge className="text-[11px] font-medium rounded-full px-3 bg-primary/15 text-primary border-primary/30 border">
            {humanRole(profile.permissions.role)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {activePermissions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No capabilities enabled.
            </p>
          ) : (
            activePermissions.map((p) => (
              <span
                key={p}
                className="text-[11px] font-medium rounded-full px-2.5 py-0.5 bg-muted text-foreground border border-border"
              >
                ✓ {p}
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell size={15} className="text-primary" />
          Notification preferences
        </h3>
        <div className="flex flex-wrap gap-2">
          {activeNotifications.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              All notifications disabled.
            </p>
          ) : (
            activeNotifications.map((n) => (
              <span
                key={n}
                className="text-[11px] font-medium rounded-full px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20"
              >
                ✓ {n}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
function EmptyAdminProfile({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mb-3">
        <User className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-sm font-semibold text-foreground mb-2">
        No admin profile found
      </h2>
      <p className="text-[11px] text-muted-foreground mb-5 max-w-xs">
        Set up your admin profile to configure your account, security settings,
        and notification preferences.
      </p>
      <Button
        onClick={onCreate}
        className="text-primary-foreground bg-primary hover:bg-primary/90"
      >
        Create Profile
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
type Mode = "view" | "create" | "edit";

const AdminProfile = () => {
  const { t } = useTranslation();
  const [profileData, setProfileData] = useState<AdminProfileData | null>(null);
  const [mode, setMode] = useState<Mode>("create");

  // Hoisted sidebar state — mirrors DoctorProfile
  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  const isForm = mode === "create" || mode === "edit";

  const handleSubmit = (data: AdminProfileData) => {
    setProfileData(data);
    setMode("view");
    // TODO: POST /admin/profile or PATCH /admin/profile
  };

  const handleDelete = () => {
    setProfileData(null);
    setCurrentStep(0);
    setVisited(new Set([0]));
    setMode("create");
    // TODO: DELETE /admin/profile
  };

  const openEdit = () => {
    setCurrentStep(0);
    setVisited(new Set([0]));
    setMode("edit");
  };

  const stats = profileData
    ? {
        name: `${profileData.personal.first_name} ${profileData.personal.last_name}`,
        role: humanRole(profileData.permissions.role),
        department: profileData.personal.department,
        twoFa: profileData.security.two_factor_enabled ? "Enabled" : "Disabled",
        permissions: Object.entries(profileData.permissions).filter(
          ([k, v]) => k !== "role" && v === true,
        ).length,
        notifications: Object.values(profileData.notifications).filter(Boolean)
          .length,
      }
    : null;

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={t("admin.profile.title", "Admin Profile")}
        subtitle={
          isForm
            ? mode === "edit"
              ? "Update your admin account information"
              : "Fill in the details below to configure your account"
            : t(
                "admin.profile.subtitle",
                "Manage your account, security & preferences",
              )
        }
      />

      <div className="px-6 py-8 space-y-5">
        {/* ── Stats bar (view mode only) ── */}
        {stats && !isForm && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <StatCard label="Name" value={stats.name} />
            <StatCard label="Role" value={stats.role} accent />
            <StatCard label="Department" value={stats.department} />
            <StatCard label="2FA" value={stats.twoFa} />
            <StatCard
              label="Permissions"
              value={stats.permissions}
              sub="active"
            />
            <StatCard
              label="Alerts"
              value={stats.notifications}
              sub="enabled"
            />
          </div>
        )}

        {/* ── Unified card: sidebar + content ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex min-h-[560px]">
          {/* ── Sidebar ── */}
          <UnifiedSidebar
            currentStep={currentStep}
            visited={visited}
            onSelect={(i) => {
              setVisited(new Set([...visited, i]));
              setCurrentStep(i);
            }}
            mode={mode}
            profileData={profileData}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {/* ── Content area ── */}
          {isForm ? (
            <AdminForm
              mode={mode === "edit" ? "edit" : "create"}
              defaultData={
                mode === "edit" && profileData ? profileData : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => {
                if (profileData) setMode("view");
              }}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              visited={visited}
              onVisitedChange={setVisited}
            />
          ) : profileData ? (
            <AdminProfileView profile={profileData} />
          ) : (
            <EmptyAdminProfile onCreate={() => setMode("create")} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminProfile;
