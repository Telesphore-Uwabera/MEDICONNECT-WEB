import { useRef, useState } from "react";
import { X, Upload, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
      className="w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
    />
  );
}

interface AdminAddTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdminAddTeamMemberModal({ open, onClose }: AdminAddTeamMemberModalProps) {
  const [name,     setName]     = useState("");
  const [title,    setTitle]    = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [photo,    setPhoto]    = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);
  const create  = useCreateTeamMember();

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleClose() {
    setName(""); setTitle(""); setJoinedAt("");
    setIsActive(true); setPhoto(null); setPreview(null); setErrors({});
    onClose();
  }

  async function handleSubmit() {
    setErrors({});
    const fd = new FormData();
    fd.append("name",      name);
    fd.append("title",     title);
    fd.append("joined_at", joinedAt);
   fd.append("is_active", isActive ? "1" : "0");
    if (photo) fd.append("photo", photo);

    try {
      await create.mutateAsync(fd);
      handleClose();
    } catch (err: any) {
      // Handle 422 validation errors
      if (err?.errors) {
        const flat: Record<string, string> = {};
        Object.entries(err.errors).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? (v as string[])[0] : String(v);
        });
        setErrors(flat);
      }
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-card border border-border/60 rounded-lg shadow-xl flex flex-col max-h-[90dvh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground leading-tight">Add team member</p>
                <p className="text-[10px] text-muted-foreground">Fill in the details below</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Photo upload */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-14 h-14 rounded-full border-2 border-dashed border-border/60 hover:border-primary/40 bg-secondary/30 flex items-center justify-center transition-colors overflow-hidden flex-shrink-0"
              >
                {preview ? (
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground/50" />
                )}
              </button>
              <div>
                <p className="text-[11px] font-medium text-foreground">Profile photo</p>
                <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP — max 2 MB</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-[11px] text-primary hover:text-primary/80 font-medium mt-0.5 transition-colors"
                >
                  {photo ? "Change photo" : "Upload photo"}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            <div className="border-t border-border/60" />

            <Field label="Full name">
              <TextInput value={name} onChange={setName} placeholder="Dr. Jane Smith" />
              {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name}</p>}
            </Field>

            <Field label="Title / specialty">
              <TextInput value={title} onChange={setTitle} placeholder="Cardiologist" />
              {errors.title && <p className="text-[10px] text-destructive mt-0.5">{errors.title}</p>}
            </Field>

            <Field label="Joined date">
              <TextInput value={joinedAt} onChange={setJoinedAt} type="date" />
              {errors.joined_at && <p className="text-[10px] text-destructive mt-0.5">{errors.joined_at}</p>}
            </Field>

            <Field label="Status">
              <div className="flex items-center gap-3">
                {(["true", "false"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setIsActive(v === "true")}
                    className={cn(
                      "flex-1 py-1.5 rounded-sm border text-[11px] font-medium transition-all",
                      String(isActive) === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {v === "true" ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-[11px] rounded-sm border-border/60"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-[11px] rounded-sm gap-1.5"
              onClick={handleSubmit}
              disabled={create.isPending || !name || !title || !joinedAt}
            >
              {create.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <UserPlus className="w-3 h-3" />
              )}
              {create.isPending ? "Adding…" : "Add member"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
