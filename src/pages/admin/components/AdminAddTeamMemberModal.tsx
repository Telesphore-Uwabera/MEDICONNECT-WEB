import { useCallback, useRef, useState } from "react";
import { Bold, Italic, Link, List, Loader2, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { useTranslation } from "react-i18next";
import { useCreateTeamMember } from "@/hooks/admin/use-admin-ourteam";

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
      className="w-full rounded-[6px] border border-border/60 bg-background px-3 py-2 text-[12px] text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
    />
  );
}

function RichBioEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
   const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);

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
        dangerouslySetInnerHTML={value ? { __html: value } : undefined}
      />
    </div>
  );
}

interface AdminAddTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdminAddTeamMemberModal({ open, onClose }: AdminAddTeamMemberModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [level, setLevel] = useState("2");
  const [order, setOrder] = useState("1");
  const [colorCode, setColorCode] = useState("#16A34A");
  const [isActive, setIsActive] = useState(true);
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [icon, setIcon] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});


  const create = useCreateTeamMember();

  function handleFileSelect(value: File | File[] | null, kind: "photo" | "icon") {
    const file = Array.isArray(value) ? value[0] ?? null : value;
    if (kind === "photo") {
      setPhoto(file);
    } else {
      setIcon(file);
    }
  }

  function handleClose() {
    setName("");
    setTitle("");
    setJoinedAt("");
    setLevel("2");
    setOrder("1");
    setColorCode("#16A34A");
    setIsActive(true);
    setBio("");
    setPhoto(null);
    setIcon(null);
    setErrors({});
    onClose();
  }

  async function handleSubmit() {
    setErrors({});
    const fd = new FormData();
    fd.append("name", name);
    fd.append("title", title);
    fd.append("joined_at", joinedAt);
    fd.append("bio", bio);
    fd.append("level", level);
    fd.append("order", order);
    fd.append("color_code", colorCode);
    fd.append("is_active", isActive ? "1" : "0");
    if (photo) fd.append("photo", photo);
    if (icon) fd.append("icon", icon);

    try {
      await create.mutateAsync(fd);
      handleClose();
    } catch (err: any) {
      if (err?.errors) {
        const flat: Record<string, string> = {};
        Object.entries(err.errors).forEach(([key, value]) => {
          flat[key] = Array.isArray(value) ? (value as string[])[0] : String(value);
        });
        setErrors(flat);
      }
    }
  }

  return (
    <>
      <div
        onClick={handleClose}
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
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-primary/10">
              <UserPlus className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-tight text-foreground">{t("admin.team.add_member", { defaultValue: "Add team member" })}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t("admin.team.add_subtitle", { defaultValue: "Create a public leadership profile" })}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-secondary/50 transition-colors hover:bg-secondary"
            aria-label={t("admin.team.close_panel", { defaultValue: "Close panel" })}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FileUploader
              label={photo ? t("admin.team.change_photo", { defaultValue: "Change photo" }) : t("admin.team.upload_photo", { defaultValue: "Upload photo" })}
              accept="image/jpeg,image/png,image/webp"
              value={photo}
              onChange={(value) => handleFileSelect(value, "photo")}
              maxSizeMb={2}
              className="min-h-[104px] px-3 py-3"
              helperText={t("common.fileUploader.imageHelper", { defaultValue: "Drop or browse an image. Max 2 MB." })}
            />

            <FileUploader
              label={icon ? t("admin.team.change_icon", { defaultValue: "Change icon" }) : t("admin.team.upload_icon", { defaultValue: "Upload icon" })}
              accept="image/jpeg,image/png,image/webp"
              value={icon}
              onChange={(value) => handleFileSelect(value, "icon")}
              maxSizeMb={1}
              className="min-h-[104px] px-3 py-3"
              helperText={t("common.fileUploader.iconHelper", { defaultValue: "Drop or browse an icon. Max 1 MB." })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("admin.team.full_name", { defaultValue: "Full name" })}>
              <TextInput value={name} onChange={setName} placeholder="Jane Smith" />
              {errors.name && <p className="mt-0.5 text-[10px] text-destructive">{errors.name}</p>}
            </Field>
            <Field label={t("admin.team.member_title", { defaultValue: "Title" })}>
              <TextInput value={title} onChange={setTitle} placeholder="Head of Nursing" />
              {errors.title && <p className="mt-0.5 text-[10px] text-destructive">{errors.title}</p>}
            </Field>
            <Field label={t("admin.team.joined_date", { defaultValue: "Joined date" })}>
              <TextInput value={joinedAt} onChange={setJoinedAt} type="date" />
              {errors.joined_at && <p className="mt-0.5 text-[10px] text-destructive">{errors.joined_at}</p>}
            </Field>
            <Field label={t("admin.team.color_code", { defaultValue: "Color code" })}>
              <div className="flex gap-2">
                <input type="color" value={colorCode} onChange={(e) => setColorCode(e.target.value)} className="h-9 w-12 rounded-[6px] border border-border/60 bg-background p-1" />
                <TextInput value={colorCode} onChange={setColorCode} placeholder="#16A34A" />
              </div>
              {errors.color_code && <p className="mt-0.5 text-[10px] text-destructive">{errors.color_code}</p>}
            </Field>
            <Field label={t("admin.team.level", { defaultValue: "Level" })}>
              <TextInput value={level} onChange={setLevel} type="number" placeholder="2" />
              {errors.level && <p className="mt-0.5 text-[10px] text-destructive">{errors.level}</p>}
            </Field>
            <Field label={t("admin.team.display_order", { defaultValue: "Display order" })}>
              <TextInput value={order} onChange={setOrder} type="number" placeholder="3" />
              {errors.order && <p className="mt-0.5 text-[10px] text-destructive">{errors.order}</p>}
            </Field>
          </div>

          <Field label={t("admin.team.status", { defaultValue: "Status" })}>
            <div className="flex items-center gap-3">
              {(["true", "false"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIsActive(value === "true")}
                  className={cn(
                    "flex-1 rounded-[6px] border py-1.5 text-[11px] font-medium transition-all",
                    String(isActive) === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {value === "true" ? t("admin.team.active", { defaultValue: "Active" }) : t("admin.team.inactive", { defaultValue: "Inactive" })}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t("admin.team.bio", { defaultValue: "Bio" })}>
            <RichBioEditor value={bio} onChange={setBio} />
            {errors.bio && <p className="mt-0.5 text-[10px] text-destructive">{errors.bio}</p>}
          </Field>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
          <Button variant="outline" size="sm" className="h-8 rounded-[6px] border-border/60 px-4 text-[11px]" onClick={handleClose}>
            Discard
          </Button>
          <Button size="sm" className="h-8 gap-1.5 rounded-[6px] px-4 text-[11px]" onClick={handleSubmit} disabled={create.isPending || !name || !title}>
            {create.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
            {create.isPending ? t("admin.team.adding", { defaultValue: "Adding..." }) : t("admin.team.add_member_short", { defaultValue: "Add member" })}
          </Button>
        </div>
      </div>
    </>
  );
}


