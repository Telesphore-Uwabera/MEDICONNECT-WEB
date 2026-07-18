import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bold, Italic, Link, List, Loader2, Palette, Save, Trash2, ToggleLeft, ToggleRight, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  useDeleteTeamMember,
  useGetAdminTeamMember,
  useToggleTeamMemberActive,
  useUpdateTeamMember,
  useUploadTeamIcon,
  useUploadTeamPhoto,
} from "@/hooks/admin/use-admin-ourteam";

function getInitials(name: string): string {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(date?: string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-[6px] border border-border/60 bg-background px-2 py-2 text-[12px] text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
    />
  );
}

function RichBioEditor({ value, onChange, seedKey }: { value: string; onChange: (v: string) => void; seedKey: number | null }) {
  
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value ?? "";
  }, [seedKey, value]);

  const exec = useCallback((command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  return (
    <div className="overflow-hidden rounded-[6px] border border-border/60 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex items-center gap-0.5 border-b border-border/60 bg-secondary/30 px-2 py-1.5">
        <button type="button" title={t("admin.team.editor_bold", { defaultValue: "Bold" })} onClick={() => exec("bold")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><Bold className="h-3 w-3" /></button>
        <button type="button" title={t("admin.team.editor_italic", { defaultValue: "Italic" })} onClick={() => exec("italic")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><Italic className="h-3 w-3" /></button>
        <button type="button" title={t("admin.team.editor_bullet_list", { defaultValue: "Bullet list" })} onClick={() => exec("insertUnorderedList")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><List className="h-3 w-3" /></button>
        <div className="mx-1 h-4 w-px bg-border/60" />
        <button
          type="button"
          title={t("admin.team.editor_insert_link", { defaultValue: "Insert link" })}
          onClick={() => {
            const url = prompt(t("admin.team.enter_url", { defaultValue: "Enter URL" }));
            if (url) exec("createLink", url);
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Link className="h-3 w-3" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => editorRef.current && onChange(editorRef.current.innerHTML)}
        data-placeholder={t("admin.team.bio_placeholder", { defaultValue: "Write a short bio..." })}
        className={cn(
          "min-h-[120px] max-h-[200px] overflow-y-auto px-3 py-2 text-[12px] text-foreground outline-none",
          "prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40",
        )}
      />
    </div>
  );
}

interface AdminTeamMemberPanelProps {
  memberId: number | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function AdminTeamMemberPanel({ memberId, onClose, onDeleted }: AdminTeamMemberPanelProps) {
  const { t } = useTranslation();
  const open = !!memberId;
  const { data, isLoading } = useGetAdminTeamMember(memberId);
  const member = data?.member;

  const updateMutation = useUpdateTeamMember(memberId ?? 0);
  const uploadPhoto = useUploadTeamPhoto(memberId ?? 0);
  const uploadIcon = useUploadTeamIcon(memberId ?? 0);
  const toggleActive = useToggleTeamMemberActive(memberId ?? 0);
  const deleteMember = useDeleteTeamMember();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [level, setLevel] = useState("2");
  const [order, setOrder] = useState("1");
  const [colorCode, setColorCode] = useState("#16A34A");
  const [bio, setBio] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const photoRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (member) {
      setName(member.name ?? "");
      setTitle(member.title ?? "");
      setJoinedAt(member.joined_at?.slice(0, 10) ?? "");
      setLevel(String(member.level ?? 2));
      setOrder(String(member.order ?? 1));
      setColorCode(member.color_code || "#16A34A");
      setBio(member.bio ?? "");
    }
  }, [member]);

  useEffect(() => {
    if (!open) setConfirmDelete(false);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    if (!memberId) return;
    const fd = new FormData();
    fd.append("name", name);
    fd.append("title", title);
    fd.append("joined_at", joinedAt);
    fd.append("bio", bio);
    fd.append("level", level);
    fd.append("order", order);
    fd.append("color_code", colorCode);

    try {
      await updateMutation.mutateAsync(fd);
      showToast(t("admin.team.updated_success", { defaultValue: "Member updated successfully." }));
    } catch {
      showToast(t("admin.team.updated_error", { defaultValue: "Failed to update member." }), "error");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, kind: "photo" | "icon") {
    const file = e.target.files?.[0];
    if (!file || !memberId) return;
    const fd = new FormData();
    fd.append(kind, file);

    try {
      if (kind === "photo") {
        await uploadPhoto.mutateAsync(fd);
        showToast(t("admin.team.photo_uploaded", { defaultValue: "Photo uploaded." }));
      } else {
        await uploadIcon.mutateAsync(fd);
        showToast(t("admin.team.icon_uploaded", { defaultValue: "Icon uploaded." }));
      }
    } catch {
      showToast(t("admin.team.upload_error", { defaultValue: "Failed to upload {{kind}}.", kind }), "error");
    } finally {
      e.target.value = "";
    }
  }

  async function handleToggle() {
    try {
      await toggleActive.mutateAsync();
      showToast(member?.is_active ? t("admin.team.deactivated", { defaultValue: "Member deactivated." }) : t("admin.team.activated", { defaultValue: "Member activated." }));
    } catch {
      showToast(t("admin.team.status_error", { defaultValue: "Failed to update status." }), "error");
    }
  }

  async function handleDelete() {
    if (!memberId) return;
    try {
      await deleteMember.mutateAsync(memberId);
      showToast(t("admin.team.removed", { defaultValue: "Member removed." }));
      onDeleted?.();
      onClose();
    } catch {
      showToast(t("admin.team.delete_error", { defaultValue: "Failed to delete member." }), "error");
    }
  }

  const isSaving = updateMutation.isPending;
  const isUploadingPhoto = uploadPhoto.isPending;
  const isUploadingIcon = uploadIcon.isPending;
  const isToggling = toggleActive.isPending;
  const isDeleting = deleteMember.isPending;

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border/60 bg-card sm:w-[420px] lg:w-[560px]",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <p className="text-[14px] font-semibold leading-tight text-foreground">{t("admin.team.member", { defaultValue: "Team member" })}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t("admin.team.edit_subtitle", { defaultValue: "Edit public profile, hierarchy, media, or status" })}</p>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-secondary/50 transition-colors hover:bg-secondary" aria-label={t("admin.team.close_panel", { defaultValue: "Close panel" })}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !member ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <p className="text-[12px] text-muted-foreground">{t("admin.team.not_found", { defaultValue: "Member not found." })}</p>
                </div>
              ) : (
                <div className="space-y-6 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-4 rounded-[8px] border border-border/60 bg-secondary/20 p-3">
                      <div className="relative shrink-0">
                        {member.photo_url ? (
                          <img src={member.photo_url} alt={member.name} className="h-16 w-16 rounded-full border border-border/60 object-cover object-top" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/40 bg-primary/10 text-base font-semibold text-primary">
                            {getInitials(member.name)}
                          </div>
                        )}
                        {isUploadingPhoto && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40"><Loader2 className="h-4 w-4 animate-spin text-white" /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-foreground">{t("admin.team.profile_photo", { defaultValue: "Profile photo" })}</p>
                        <button onClick={() => photoRef.current?.click()} disabled={isUploadingPhoto} className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-50">
                          <Upload className="h-3 w-3" />
                          {isUploadingPhoto ? t("admin.team.uploading", { defaultValue: "Uploading..." }) : t("admin.team.change_photo", { defaultValue: "Change photo" })}
                        </button>
                        <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleUpload(e, "photo")} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-[8px] border border-border/60 bg-secondary/20 p-3">
                      <div className="relative shrink-0">
                        {member.icon_url ? (
                          <img src={member.icon_url} alt={t("admin.team.role_icon", { defaultValue: "Role icon" })} className="h-16 w-16 rounded-full border border-border/60 object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/40 bg-primary/10 text-primary">
                            <Palette className="h-6 w-6" />
                          </div>
                        )}
                        {isUploadingIcon && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40"><Loader2 className="h-4 w-4 animate-spin text-white" /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-foreground">{t("admin.team.role_icon", { defaultValue: "Role icon" })}</p>
                        <button onClick={() => iconRef.current?.click()} disabled={isUploadingIcon} className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-50">
                          <Upload className="h-3 w-3" />
                          {isUploadingIcon ? t("admin.team.uploading", { defaultValue: "Uploading..." }) : t("admin.team.change_icon", { defaultValue: "Change icon" })}
                        </button>
                        <input ref={iconRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleUpload(e, "icon")} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60" />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("admin.team.full_name", { defaultValue: "Full name" })}><TextInput value={name} onChange={setName} placeholder="Jane Smith" /></Field>
                    <Field label={t("admin.team.member_title", { defaultValue: "Title" })}><TextInput value={title} onChange={setTitle} placeholder="Head of Nursing" /></Field>
                    <Field label={t("admin.team.joined_date", { defaultValue: "Joined date" })}><TextInput value={joinedAt} onChange={setJoinedAt} type="date" /></Field>
                    <Field label={t("admin.team.color_code", { defaultValue: "Color code" })}>
                      <div className="flex gap-2">
                        <input type="color" value={colorCode} onChange={(e) => setColorCode(e.target.value)} className="h-9 w-12 rounded-[6px] border border-border/60 bg-background p-1" />
                        <TextInput value={colorCode} onChange={setColorCode} placeholder="#16A34A" />
                      </div>
                    </Field>
                    <Field label={t("admin.team.level", { defaultValue: "Level" })}><TextInput value={level} onChange={setLevel} type="number" /></Field>
                    <Field label={t("admin.team.display_order", { defaultValue: "Display order" })}><TextInput value={order} onChange={setOrder} type="number" /></Field>
                  </div>

                  <Field label={t("admin.team.bio", { defaultValue: "Bio" })}><RichBioEditor seedKey={memberId} value={bio} onChange={setBio} /></Field>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[6px] border border-border/60 bg-secondary/20 px-3 py-2">
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">{t("admin.team.added", { defaultValue: "Added" })}</p>
                      <p className="text-[11px] font-medium text-foreground">{formatDate(member.created_at)}</p>
                    </div>
                    <div className="rounded-[6px] border border-border/60 bg-secondary/20 px-3 py-2">
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">{t("admin.team.updated", { defaultValue: "Updated" })}</p>
                      <p className="text-[11px] font-medium text-foreground">{formatDate(member.updated_at)}</p>
                    </div>
                  </div>

                  <div className="rounded-[6px] border border-red-200 bg-red-50/50 p-3.5 dark:border-red-900/50 dark:bg-red-950/10">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-red-500">{t("admin.team.danger_zone", { defaultValue: "Danger zone" })}</p>
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 transition-colors hover:text-red-700 dark:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("admin.team.remove_member", { defaultValue: "Remove this member" })}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-red-600 dark:text-red-400">{t("admin.team.delete_confirm", { defaultValue: "This action cannot be undone. Are you sure?" })}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" className="h-7 rounded-[6px] px-3 text-[10px]" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : t("admin.team.yes_remove", { defaultValue: "Yes, remove" })}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 rounded-[6px] border-border/60 px-3 text-[10px]" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>{t("admin.common.cancel", { defaultValue: "Cancel" })}</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {member && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
                <button onClick={handleToggle} disabled={isToggling} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
                  {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : member.is_active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5" />}
                  {member.is_active ? t("admin.team.active", { defaultValue: "Active" }) : t("admin.team.inactive", { defaultValue: "Inactive" })}
                </button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 rounded-[6px] border-border/60 px-4 text-[11px]" onClick={onClose}>{t("admin.team.discard", { defaultValue: "Discard" })}</Button>
                  <Button size="sm" className="h-8 gap-1.5 rounded-[6px] px-4 text-[11px]" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    {isSaving ? t("admin.team.saving", { defaultValue: "Saving..." }) : t("admin.team.save_changes", { defaultValue: "Save changes" })}
                  </Button>
                </div>
              </div>
            )}

            {toast && (
              <div
                className={cn(
                  "absolute bottom-20 left-1/2 -translate-x-1/2 rounded-[6px] border px-4 py-2 text-[11px] font-medium shadow-lg transition-all",
                  toast.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300",
                )}
              >
                {toast.msg}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

