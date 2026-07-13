import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  Search,
  Send, 
  X,
  XCircle,
} from "lucide-react";
import { toast as sonnerToast } from "sonner";
import {
  useSendMultiNotification,
  type MultiNotificationRole,
  type MultiNotificationTarget,
  type SendMultiNotificationResponse,
} from "@/hooks/admin/use-admin-multi-notifications";
import { useGetAdminUsers, type ApiUser } from "@/hooks/admin/use-admin-users";
import { getErrorMessage } from "@/lib/getErrorMessage";
import {
  hasRichTextContent,
  prepareRichTextForSave,
  RichTextarea,
  sanitizeRichText,
} from "@/components/ui/rich-textarea";

const INPUT_CLASS =
  "w-full h-9 rounded-[6px] border border-border/60 bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40 transition-all";

const ROLES = [
  { value: "all", label: "Everyone" },
  { value: "doctor", label: "Doctors" },
  { value: "patient", label: "Patients" },
  { value: "pharmacy", label: "Pharmacies" },
  { value: "hospital", label: "Health Facilities" },
] satisfies Array<{ value: MultiNotificationRole; label: string }>;


const EMAIL_PAGE_BACKGROUND = "#f6f9fc";
const EMAIL_PANEL_BACKGROUND = "#ffffff";
const EMAIL_TEXT_COLOR = "#111827";
const EMAIL_MUTED_COLOR = "#4b5563";
const EMAIL_LINK_COLOR = "#0f766e";

function stripThemeStyles(html: string) {
  if (typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll<HTMLElement>("*").forEach((element) => {
    element.removeAttribute("class");
    element.removeAttribute("bgcolor");
    element.style.removeProperty("background");
    element.style.removeProperty("background-color");
    element.style.removeProperty("background-image");
    element.style.removeProperty("color");

    if (element.tagName.toLowerCase() === "a") {
      element.style.color = EMAIL_LINK_COLOR;
      element.style.textDecoration = "underline";
    }
  });

  return doc.body.innerHTML;
}

function buildEmailMessageHtml(value: string) {
  const body = stripThemeStyles(sanitizeRichText(value));

  return `
<div style="margin:0;padding:0;background:${EMAIL_PAGE_BACKGROUND};color:${EMAIL_TEXT_COLOR};font-family:Arial,Helvetica,sans-serif;color-scheme:light only;supported-color-schemes:light;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:${EMAIL_PAGE_BACKGROUND};color-scheme:light only;supported-color-schemes:light;">
    <tr>
      <td style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;margin:0 auto;border-collapse:collapse;background:${EMAIL_PANEL_BACKGROUND};border:1px solid #e5e7eb;border-radius:8px;">
          <tr>
            <td style="padding:24px;color:${EMAIL_TEXT_COLOR};font-size:14px;line-height:1.65;">
              <div style="color:${EMAIL_TEXT_COLOR};background:${EMAIL_PANEL_BACKGROUND};">
                ${body}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px;border-top:1px solid #e5e7eb;color:${EMAIL_MUTED_COLOR};font-size:12px;">
              MediConnect
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`.trim();
}

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
        {value || "—"}
      </p>
    </div>
  );
}

function ResultCard({ result }: { result: SendMultiNotificationResponse | null }) {
  if (!result) {
    return (
      <div className="rounded-[6px] border border-dashed border-border/70 bg-card px-4 py-8 text-center">
        <Mail className="mx-auto h-7 w-7 text-muted-foreground/40" />
        <p className="mt-3 text-[12px] font-semibold text-foreground">No notification sent yet</p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          After sending, delivery totals will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-border/70 bg-card shadow-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          {result.message}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/70">Target: {result.target}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4">
        <div className="rounded-[6px] bg-secondary/30 px-3 py-3">
          <p className="text-[10px] text-muted-foreground">Matched</p>
          <p className="mt-1 text-[16px] font-semibold text-foreground">{result.total_matched}</p>
        </div>
        <div className="rounded-[6px] bg-secondary/30 px-3 py-3">
          <p className="text-[10px] text-muted-foreground">Sent</p>
          <p className="mt-1 text-[16px] font-semibold text-emerald-600">{result.emails_sent}</p>
        </div>
        <div className="rounded-[6px] bg-secondary/30 px-3 py-3">
          <p className="text-[10px] text-muted-foreground">Failed</p>
          <p className="mt-1 text-[16px] font-semibold text-red-600">{result.emails_failed}</p>
        </div>
      </div>
    </div>
  );
}

function AdminSystemCommunication() {
  const { t } = useTranslation();

  const [target, setTarget] = useState<MultiNotificationTarget>("roles");
  const [selectedRoles, setSelectedRoles] = useState<MultiNotificationRole[]>(["doctor"]);
  const [selectedUsers, setSelectedUsers] = useState<ApiUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [result, setResult] = useState<SendMultiNotificationResponse | null>(null);
  const sanitizedMessage = useMemo(() => sanitizeRichText(message), [message]);
  const emailPreviewHtml = useMemo(() => (sanitizedMessage ? buildEmailMessageHtml(sanitizedMessage) : ""), [sanitizedMessage]);
  const hasMessageContent = useMemo(() => hasRichTextContent(sanitizedMessage), [sanitizedMessage]);

  const sendNotification = useSendMultiNotification();
  const userIds = useMemo(() => selectedUsers.map((u) => u.id), [selectedUsers]);

  const userSearchQuery = userSearch.trim();
  const { data: userSearchResults, isFetching: isSearchingUsers } = useGetAdminUsers({
    search: userSearchQuery,
    enabled: target === "users" && userSearchQuery.length >= 2,
  });
  const selectedUserIdSet = useMemo(() => new Set(selectedUsers.map((u) => u.id)), [selectedUsers]);
  const userSearchMatches = useMemo(
    () => (userSearchResults?.data ?? []).filter((u) => !selectedUserIdSet.has(u.id)),
    [userSearchResults, selectedUserIdSet],
  );

  const addUser = (user: ApiUser) => {
    setSelectedUsers((prev) => (prev.some((u) => u.id === user.id) ? prev : [...prev, user]));
    setUserSearch("");
  };

  const removeUser = (id: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const canSend = useMemo(() => {
    if (!subject.trim() || !hasMessageContent) return false;
    if (target === "roles") return selectedRoles.length > 0;
    return userIds.length > 0;
  }, [subject, hasMessageContent, target, selectedRoles, userIds]);

  const toggleRole = (role: MultiNotificationRole) => {
    setSelectedRoles((prev) => {
      if (role === "all") return prev.includes("all") ? [] : ["all"];

      const withoutAll = prev.filter((item) => item !== "all");

      if (withoutAll.includes(role)) {
        return withoutAll.filter((item) => item !== role);
      }

      return [...withoutAll, role];
    });
  };

  const loadTemplate = (template: "doctors" | "everyone" | "users" | "patientsDoctors") => {
    if (template === "doctors") {
      setTarget("roles");
      setSelectedRoles(["doctor"]);
      setSubject("Platform Update");
      setMessage(
        "<h1>New Feature</h1><p>You can now view <strong>patient history</strong> directly from your dashboard.</p><img src='https://mediconnect.rw/images/update-banner.png'>",
      );
      return;
    }

    if (template === "everyone") {
      setTarget("roles");
      setSelectedRoles(["all"]);
      setSubject("Scheduled Maintenance");
      setMessage(
        "<p>MediConnect will be briefly unavailable tonight from <strong>11PM to 1AM</strong>.</p>",
      );
      return;
    }

    if (template === "users") {
      setTarget("users");
      setSelectedUsers([]);
      setSubject("Account Review Required");
      setMessage("<p>Please log in and update your profile within 7 days.</p>");
      return;
    }

    setTarget("roles");
    setSelectedRoles(["patient", "doctor"]);
    setSubject("Important Update for Patients & Doctors");
    setMessage(
      "<h1>Service Update</h1><p>We've improved the booking experience for both <strong>patients</strong> and <strong>doctors</strong>.</p>",
    );
  };

const handleSend = async () => {
    const htmlMessage = prepareRichTextForSave(message);

  if (!subject.trim() || !htmlMessage) {
    sonnerToast.error("Subject and message are required.");
    return;
  }

  if (target === "roles" && selectedRoles.length === 0) {
    sonnerToast.error("Please select at least one role.");
    return;
  }

  if (target === "users" && userIds.length === 0) {
    sonnerToast.error("Please select at least one user.");
    return;
  }

  const payload =
    target === "roles"
      ? {
          target,
          roles: selectedRoles,
          subject: subject.trim(),
          message: buildEmailMessageHtml(htmlMessage),
        }
      : {
          target,
          user_ids: userIds,
          subject: subject.trim(),
          message: buildEmailMessageHtml(htmlMessage),
        };

  try {
    const response = await sendNotification.mutateAsync(payload);
    setResult(response); 
    sonnerToast.success(
      `${response.message} Sent: ${response.emails_sent}, Failed: ${response.emails_failed}`,
    );
  } catch (error) {
    sonnerToast.error("Could not send notification.", { description: getErrorMessage(error) });
  }
};
  return (
    <DashboardLayout role="admin">
      <div className="flex h-full flex-col">
        <PageHeader
          title={t("admin.communication.title", "Multi Notification")}
          subtitle={t(
            "admin.communication.subtitle",
            "Send bulk email notifications to doctors, patients, all users, or selected user IDs",
          )}
        />

        <main className="flex-1 overflow-y-auto">
        

          <div className="grid gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-[6px] border border-border/70 bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">Compose bulk email</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    This sends sanitized HTML email.
                  </p>
                </div>

                <Button
                  size="sm"
                  className="h-8 rounded-[6px] text-[11px]"
                  onClick={handleSend}
                  disabled={!canSend || sendNotification.isPending}
                >
                  {sendNotification.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Send notification
                </Button>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Quick templates
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="h-8 rounded-[6px] text-[11px]" onClick={() => loadTemplate("doctors")}>
                      Notify doctors
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 rounded-[6px] text-[11px]" onClick={() => loadTemplate("everyone")}>
                      Notify everyone
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 rounded-[6px] text-[11px]" onClick={() => loadTemplate("users")}>
                      Specific users
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 rounded-[6px] text-[11px]" onClick={() => loadTemplate("patientsDoctors")}>
                      Patients & doctors
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      Target
                    </span>
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value as MultiNotificationTarget)}
                      className={INPUT_CLASS}
                    >
                      <option value="roles">Roles</option>
                      <option value="users">Specific users</option>
                    </select>
                  </label>

                  {target === "users" ? (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        Recipients
                      </span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search by name or email…"
                          className={cn(INPUT_CLASS, "pl-8")}
                        />
                        {isSearchingUsers && (
                          <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                        )}

                        {userSearchQuery.length >= 2 && (
                          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-[6px] border border-border/70 bg-card shadow-lg">
                            {userSearchMatches.length > 0 ? (
                              userSearchMatches.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => addUser(user)}
                                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-[11px] hover:bg-secondary/50"
                                >
                                  <span className="font-medium text-foreground">{user.name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {user.email} · {user.roles?.map((r) => r.name).join(", ") || "—"}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-[11px] text-muted-foreground/70">
                                {isSearchingUsers ? "Searching…" : "No matching users."}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {selectedUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedUsers.map((user) => (
                            <Badge
                              key={user.id}
                              variant="secondary"
                              className="flex items-center gap-1 text-[10px]"
                            >
                              {user.name}
                              <button
                                type="button"
                                onClick={() => removeUser(user.id)}
                                aria-label={`Remove ${user.name}`}
                                className="rounded-full hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/70">
                          Search and pick recipients by name.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        Roles
                      </span>
                      <div className="flex flex-wrap gap-2 rounded-[6px] border border-border/60 bg-background p-2">
                        {ROLES.map((role) => {
                          const active = selectedRoles.includes(role.value);

                          return (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => toggleRole(role.value)}
                              className={cn(
                                "rounded-[6px] border px-3 py-1.5 text-[11px] font-medium transition-all",
                                active
                                  ? "border-primary/30 bg-primary/10 text-primary"
                                  : "border-border/60 text-muted-foreground hover:bg-secondary/50",
                              )}
                            >
                              {role.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Subject
                  </span>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Platform Update"
                    className={INPUT_CLASS}
                  />
                </label> 
                <label className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                   Message
                  </span>
                </label> 
                <RichTextarea
                  value={message}
                  onChange={setMessage}
                  placeholder="Write your notification message..."
                /> 
              </div>
            </section>

            <aside className="space-y-4 xl:sticky xl:top-[58px] xl:self-start">
              <ResultCard result={result} />

              <div className="rounded-[6px] border border-border/70 bg-card shadow-sm">
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <Eye className="h-4 w-4 text-primary" />
                    Preview
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    Basic preview of the HTML message.
                  </p>
                </div>

                <div className="p-4">
                  <div className="rounded-[6px] border border-border/60 bg-background p-3">
                    <p className="mb-3 border-b border-border/50 pb-2 text-[12px] font-semibold text-foreground">
                      {subject || "No subject"}
                    </p>

                    {sanitizedMessage ? (
                      <div
                        className="overflow-hidden rounded-[6px] border border-border/50 bg-white text-[12px] text-slate-900"
                        dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
                      />
                    ) : (
                      <p className="text-[11px] text-muted-foreground/70">Your message preview will appear here.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border/70 bg-card shadow-sm">
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Validation handled
                  </p>
                </div>

                <div className="space-y-2 px-4 py-4 text-[11px] text-muted-foreground/80">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-500" />
                    Missing roles when target is roles returns backend validation.
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-500" />
                    Non-existent user IDs return backend validation.
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 text-red-500" />
                    Non-admin token returns 403 and displays the API message.
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 text-red-500" />
                    Empty target emails return the backend “No users with a valid email” message.
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}

export default AdminSystemCommunication;