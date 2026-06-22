import { useEffect, useRef, useState } from "react";
import { X, Upload, Loader2, Trash2, ToggleLeft, ToggleRight, Save, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useGetAdminTeamMember,
  useUpdateTeamMember,
  useUploadTeamPhoto,
  useToggleTeamMemberActive,
  useDeleteTeamMember,
} from "@/hooks/admin/use-admin-ourteam";

// ── Helpers ──────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatDate(date: string): string {
  if (!date) return "—";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

// ── Field ────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    />
  );
}

// ── Panel ────────────────────────────────────────────────────

interface AdminTeamMemberPanelProps {
  memberId: number | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function AdminTeamMemberPanel({
  memberId,
  onClose,
  onDeleted,
}: AdminTeamMemberPanelProps) {
  const open = !!memberId;

  const { data, isLoading } = useGetAdminTeamMember(memberId);
  const member = data?.member;

  const updateMutation = useUpdateTeamMember(memberId ?? 0);
  const uploadPhoto    = useUploadTeamPhoto(memberId ?? 0);
  const toggleActive   = useToggleTeamMemberActive(memberId ?? 0);
  const deleteMember   = useDeleteTeamMember();

  const [name,     setName]     = useState("");
  const [title,    setTitle]    = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // Sync form when member loads
  useEffect(() => {
    if (member) {
      setName(member.name);
      setTitle(member.title ?? "");
      setJoinedAt(member.joined_at?.slice(0, 10) ?? "");
    }
  }, [member]);

  // Reset confirm on close
  useEffect(() => {
    if (!open) setConfirmDelete(false);
  }, [open]);

  // Keyboard close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock
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
    fd.append("name",      name);
    fd.append("title",     title);
    fd.append("joined_at", joinedAt);
    try {
      await updateMutation.mutateAsync(fd);
      showToast("Member updated successfully.");
    } catch {
      showToast("Failed to update member.", "error");
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !memberId) return;
    const fd = new FormData();
    fd.append("photo", file);
    try {
      await uploadPhoto.mutateAsync(fd);
      showToast("Photo updated.");
    } catch {
      showToast("Failed to upload photo.", "error");
    }
  }

  async function handleToggle() {
    try {
      await toggleActive.mutateAsync();
      showToast(`Member ${member?.is_active ? "deactivated" : "activated"}.`);
    } catch {
      showToast("Failed to update status.", "error");
    }
  }

  async function handleDelete() {
    if (!memberId) return;
    try {
      await deleteMember.mutateAsync(memberId);
      showToast("Member removed.");
      onDeleted?.();
      onClose();
    } catch {
      showToast("Failed to delete member.", "error");
    }
  }

  const isSaving   = updateMutation.isPending;
  const isUploading = uploadPhoto.isPending;
  const isToggling = toggleActive.isPending;
  const isDeleting = deleteMember.isPending;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] lg:w-[520px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  Team member
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Edit details, photo or status
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : !member ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-6">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                  <p className="text-[12px] text-muted-foreground">Member not found.</p>
                </div>
              ) : (
                <div className="p-5 space-y-6">
                  {/* Photo */}
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-16 h-16 rounded-full object-cover border border-border/60"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-base border border-border/40">
                          {getInitials(member.name)}
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{member.title}</p>
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={isUploading}
                        className="mt-1.5 flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        {isUploading ? "Uploading…" : "Change photo"}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </div>
                    {/* Active toggle */}
                    <button
                      onClick={handleToggle}
                      disabled={isToggling}
                      className="ml-auto flex items-center gap-1.5 shrink-0"
                      title={member.is_active ? "Deactivate" : "Activate"}
                    >
                      {isToggling ? (
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      ) : member.is_active ? (
                        <ToggleRight className="w-7 h-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-muted-foreground/50" />
                      )}
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/60" />

                  {/* Edit form */}
                  <div className="space-y-4">
                    <Field label="Full name">
                      <TextInput value={name} onChange={setName} placeholder="Dr. John Doe" />
                    </Field>
                    <Field label="Title / specialty">
                      <TextInput value={title} onChange={setTitle} placeholder="Lead Surgeon" />
                    </Field>
                    <Field label="Joined date">
                      <TextInput value={joinedAt} onChange={setJoinedAt} type="date" />
                    </Field>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/60" />

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-sm border border-border/60 bg-secondary/20 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">Added</p>
                      <p className="text-[11px] font-medium text-foreground">{formatDate(member.created_at)}</p>
                    </div>
                    <div className="rounded-sm border border-border/60 bg-secondary/20 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">Updated</p>
                      <p className="text-[11px] font-medium text-foreground">{formatDate(member.updated_at)}</p>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="border border-red-200 dark:border-red-900/50 rounded-sm p-3.5 bg-red-50/50 dark:bg-red-950/10">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500 mb-2">
                      Danger zone
                    </p>
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400 font-medium hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove this member
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-red-600 dark:text-red-400">
                          This action cannot be undone. Are you sure?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-3 text-[10px] rounded-sm"
                            onClick={handleDelete}
                            disabled={isDeleting}
                          >
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes, remove"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-[10px] rounded-sm border-border/60"
                            onClick={() => setConfirmDelete(false)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {member && (
              <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-4 text-[11px] rounded-sm border-border/60 hover:bg-secondary/30"
                  onClick={onClose}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-4 text-[11px] rounded-sm gap-1.5"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            )}

            {/* Toast */}
            {toast && (
              <div
                className={cn(
                  "absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-sm text-[11px] font-medium shadow-lg border transition-all",
                  toast.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
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
