// Admin — role-specific profile editor.
// Opened from AdminUsers.tsx for doctor/patient/pharmacy/hospital accounts.
// Talks to /admin/manageusers/{role}s/... (see hooks/admin/use-admin-manage-users.ts).

import { useEffect, useState } from "react";
import { X, Loader2, Save, Upload, Check, AlertCircle } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/getErrorMessage";
import {
  type ManagedRole,
  useGetDoctorProfile,
  useSaveDoctorProfile,
  useUploadDoctorImage,
  useUploadDoctorDocument,
  type DoctorDocumentType,
  useGetPatientProfile,
  useSavePatientProfile,
  useUploadPatientAvatar,
  useGetPatientMedicalInfo,
  useSavePatientMedicalInfo,
  useGetPatientInsurance,
  useUpdatePatientInsurance,
  useGetPharmacyProfile,
  useSavePharmacyProfile,
  useUploadPharmacyLogo,
  useUploadPharmacyImage,
  useGetHospitalProfile,
  useSaveHospitalProfile,
  useUploadHospitalLogo,
  useUploadHospitalImage,
  useUploadHospitalGallery,
} from "@/hooks/admin/use-admin-manage-users";

/* ── Small shared field primitives ─────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "h-9 w-full rounded-[6px] border border-border bg-background px-3 text-[12px] outline-none focus:border-primary/50";

function Text({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}

function Area({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className={cn(inputCls, "h-auto py-2 resize-y")}
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2 h-9 px-3 rounded-[6px] border text-[11px] font-medium transition-colors",
        checked ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground",
      )}
    >
      <span className={cn("h-3.5 w-3.5 rounded-full border flex items-center justify-center", checked ? "bg-primary border-primary" : "border-border")}>
        {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
      </span>
      {label}
    </button>
  );
}

function TagList({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (v) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((tag, i) => (
          <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px]">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        className={inputCls}
      />
    </div>
  );
}

function FileField({
  label,
  onSelect,
  isPending,
  currentUrl,
}: {
  label: string;
  onSelect: (file: File) => void;
  isPending: boolean;
  currentUrl?: string | null;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-between gap-2 h-9 rounded-[6px] border border-dashed border-border px-3 text-[11px] text-muted-foreground cursor-pointer hover:border-primary/50">
          <span className="truncate">{currentUrl ? "Replace file…" : "Choose file…"}</span>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Upload className="h-3.5 w-3.5 shrink-0" />}
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelect(f);
              e.target.value = "";
            }}
          />
        </div>
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline shrink-0">
            View
          </a>
        )}
      </div>
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-semibold text-foreground pt-2">{children}</p>;
}

/* ── Modal shell ─────────────────────────────────────────────────────────── */

export function ManageProfileModal({
  userId,
  role,
  userName,
  onClose,
}: {
  userId: number | null;
  role: ManagedRole | null;
  userName?: string;
  onClose: () => void;
}) {
  if (!userId || !role) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <div>
            <p className="text-[14px] font-semibold text-foreground capitalize">{role} profile</p>
            <p className="text-[11px] text-muted-foreground">{userName ?? `User #${userId}`}</p>
          </div>
          <button onClick={onClose} className="rounded-[6px] border border-border p-2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {role === "doctor" && <DoctorProfileForm userId={userId} />}
          {role === "patient" && <PatientProfileForm userId={userId} />}
          {role === "pharmacy" && <PharmacyProfileForm userId={userId} />}
          {role === "hospital" && <HospitalProfileForm userId={userId} />}
        </div>
      </div>
    </div>
  );
}

/* ── Doctor ─────────────────────────────────────────────────────────────── */

function DoctorProfileForm({ userId }: { userId: number }) {
  const { data, isLoading, isError } = useGetDoctorProfile(userId);
  const save = useSaveDoctorProfile(userId);
  const uploadImage = useUploadDoctorImage(userId);
  const uploadDoc = useUploadDoctorDocument(userId);
  const [docType, setDocType] = useState<DoctorDocumentType>("medical_license_document");

  const [form, setForm] = useState({
    specialization: "",
    doctor_degree: "",
    medical_license: "",
    designations: "",
    bio_en: "",
    is_available: false,
    status: "active",
  });

  useEffect(() => {
    if (!data?.doctor) return;
    setForm({
      specialization: data.doctor.specialization ?? "",
      doctor_degree: (data.doctor.doctor_degree as string) ?? "",
      medical_license: (data.doctor.medical_license as string) ?? "",
      designations: (data.doctor.designations as string) ?? "",
      bio_en: (data.doctor.bio_en as string) ?? "",
      is_available: !!data.doctor.is_active,
      status: data.doctor.status ?? "active",
    });
  }, [data]);

  const onSave = () => {
    save.mutate(form, {
      onSuccess: (res) => sonnerToast.success(res.message ?? "Doctor profile saved."),
      onError: (err) => sonnerToast.error("Could not save profile.", { description: getErrorMessage(err) }),
    });
  };

  if (isLoading) return <LoadingState />;
  return (
    <>
      {isError && <NotFoundBanner />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Specialization"><Text value={form.specialization} onChange={(v) => setForm((f) => ({ ...f, specialization: v }))} /></Field>
        <Field label="Degree"><Text value={form.doctor_degree} onChange={(v) => setForm((f) => ({ ...f, doctor_degree: v }))} /></Field>
        <Field label="Medical license"><Text value={form.medical_license} onChange={(v) => setForm((f) => ({ ...f, medical_license: v }))} /></Field>
        <Field label="Designations"><Text value={form.designations} onChange={(v) => setForm((f) => ({ ...f, designations: v }))} /></Field>
      </div>
      <Field label="Bio (EN)"><Area value={form.bio_en} onChange={(v) => setForm((f) => ({ ...f, bio_en: v }))} /></Field>
      <Toggle checked={form.is_available} onChange={(v) => setForm((f) => ({ ...f, is_available: v }))} label="Available for bookings" />

      <SaveBar onSave={onSave} isPending={save.isPending} />

      <SectionTitle>Documents & photo</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <FileField
          label="Profile photo"
          isPending={uploadImage.isPending}
          currentUrl={data?.doctor.image ?? undefined}
          onSelect={(f) =>
            uploadImage.mutate(f, {
              onSuccess: () => sonnerToast.success("Image uploaded."),
              onError: (err) => sonnerToast.error("Upload failed.", { description: getErrorMessage(err) }),
            })
          }
        />
        <div className="space-y-1">
          <Field label="Document type">
            <select value={docType} onChange={(e) => setDocType(e.target.value as DoctorDocumentType)} className={inputCls}>
              <option value="degree_document">Degree document</option>
              <option value="medical_license_document">Medical license</option>
              <option value="national_id_document">National ID</option>
              <option value="cv_document">CV</option>
            </select>
          </Field>
          <FileField
            label="Upload document"
            isPending={uploadDoc.isPending}
            currentUrl={data?.doctor.documents?.[docType]?.url ?? undefined}
            onSelect={(f) =>
              uploadDoc.mutate(
                { type: docType, file: f },
                {
                  onSuccess: () => sonnerToast.success("Document uploaded."),
                  onError: (err) => sonnerToast.error("Upload failed.", { description: getErrorMessage(err) }),
                },
              )
            }
          />
        </div>
      </div>
    </>
  );
}

/* ── Patient ────────────────────────────────────────────────────────────── */

function PatientProfileForm({ userId }: { userId: number }) {
  const { data, isLoading, isError } = useGetPatientProfile(userId);
  const save = useSavePatientProfile(userId);
  const uploadAvatar = useUploadPatientAvatar(userId);
  const { data: medicalData } = useGetPatientMedicalInfo(userId);
  const saveMedical = useSavePatientMedicalInfo(userId);
  const { data: insuranceData } = useGetPatientInsurance(userId);
  const updateInsurance = useUpdatePatientInsurance(userId);

  const [form, setForm] = useState({
    date_of_birth: "",
    gender: "",
    blood_type: "",
    address: "",
    city: "",
    province: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });
  const [medical, setMedical] = useState({
    allergies: [] as string[],
    chronic_conditions: [] as string[],
    current_medications: [] as string[],
    notes: "",
  });
  const [insuranceId, setInsuranceId] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");

  useEffect(() => {
    if (!data?.patient) return;
    setForm({
      date_of_birth: "",
      gender: (data.patient.gender as string) ?? "",
      blood_type: (data.patient.blood_type as string) ?? "",
      address: "",
      city: "",
      province: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
    });
  }, [data]);

  useEffect(() => {
    if (!medicalData?.medical_info) return;
    setMedical({
      allergies: medicalData.medical_info.allergies ?? [],
      chronic_conditions: medicalData.medical_info.chronic_conditions ?? [],
      current_medications: medicalData.medical_info.current_medications ?? [],
      notes: medicalData.medical_info.notes ?? "",
    });
  }, [medicalData]);

  const insurance = insuranceData && "insurance" in insuranceData ? insuranceData.insurance : null;

  if (isLoading) return <LoadingState />;
  return (
    <>
      {isError && <NotFoundBanner />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth"><Text type="date" value={form.date_of_birth} onChange={(v) => setForm((f) => ({ ...f, date_of_birth: v }))} /></Field>
        <Field label="Gender">
          <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className={inputCls}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="Blood type"><Text value={form.blood_type} onChange={(v) => setForm((f) => ({ ...f, blood_type: v }))} placeholder="O+" /></Field>
        <Field label="City"><Text value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} /></Field>
        <Field label="Province"><Text value={form.province} onChange={(v) => setForm((f) => ({ ...f, province: v }))} /></Field>
        <Field label="Address"><Text value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} /></Field>
        <Field label="Emergency contact name"><Text value={form.emergency_contact_name} onChange={(v) => setForm((f) => ({ ...f, emergency_contact_name: v }))} /></Field>
        <Field label="Emergency contact phone"><Text value={form.emergency_contact_phone} onChange={(v) => setForm((f) => ({ ...f, emergency_contact_phone: v }))} /></Field>
      </div>
      <SaveBar
        onSave={() =>
          save.mutate(form, {
            onSuccess: (res) => sonnerToast.success(res.message ?? "Patient profile saved."),
            onError: (err) => sonnerToast.error("Could not save profile.", { description: getErrorMessage(err) }),
          })
        }
        isPending={save.isPending}
      />

      <SectionTitle>Avatar</SectionTitle>
      <FileField
        label="Avatar"
        isPending={uploadAvatar.isPending}
        currentUrl={data?.patient.avatar ?? undefined}
        onSelect={(f) =>
          uploadAvatar.mutate(f, {
            onSuccess: () => sonnerToast.success("Avatar uploaded."),
            onError: (err) => sonnerToast.error("Upload failed.", { description: getErrorMessage(err) }),
          })
        }
      />

      <SectionTitle>Medical info</SectionTitle>
      <Field label="Allergies"><TagList value={medical.allergies} onChange={(v) => setMedical((m) => ({ ...m, allergies: v }))} placeholder="Add and press Enter" /></Field>
      <Field label="Chronic conditions"><TagList value={medical.chronic_conditions} onChange={(v) => setMedical((m) => ({ ...m, chronic_conditions: v }))} placeholder="Add and press Enter" /></Field>
      <Field label="Current medications"><TagList value={medical.current_medications} onChange={(v) => setMedical((m) => ({ ...m, current_medications: v }))} placeholder="Add and press Enter" /></Field>
      <Field label="Notes"><Area value={medical.notes} onChange={(v) => setMedical((m) => ({ ...m, notes: v }))} /></Field>
      <SaveBar
        label="Save medical info"
        onSave={() =>
          saveMedical.mutate(medical, {
            onSuccess: (res) => sonnerToast.success(res.message ?? "Medical info saved."),
            onError: (err) => sonnerToast.error("Could not save medical info.", { description: getErrorMessage(err) }),
          })
        }
        isPending={saveMedical.isPending}
      />

      <SectionTitle>Insurance</SectionTitle>
      {insurance ? (
        <p className="text-[11px] text-muted-foreground">
          Currently linked: <span className="font-medium text-foreground">{insurance.name}</span> ({insurance.coverage_percentage}% coverage)
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground/70">No insurance linked to this patient.</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Insurance ID"><Text value={insuranceId} onChange={setInsuranceId} placeholder="e.g. 3" /></Field>
        <Field label="Insurance number"><Text value={insuranceNumber} onChange={setInsuranceNumber} placeholder="RSSB-2024-88213" /></Field>
      </div>
      <SaveBar
        label="Update insurance"
        onSave={() => {
          const id = Number(insuranceId);
          if (!Number.isInteger(id) || id <= 0 || !insuranceNumber.trim()) {
            sonnerToast.error("Provide a valid insurance ID and number.");
            return;
          }
          updateInsurance.mutate(
            { insurance_id: id, insurance_number: insuranceNumber.trim() },
            {
              onSuccess: (res) => sonnerToast.success(res.message ?? "Insurance updated."),
              onError: (err) => sonnerToast.error("Could not update insurance.", { description: getErrorMessage(err) }),
            },
          );
        }}
        isPending={updateInsurance.isPending}
      />
    </>
  );
}

/* ── Pharmacy ───────────────────────────────────────────────────────────── */

function PharmacyProfileForm({ userId }: { userId: number }) {
  const { data, isLoading, isError } = useGetPharmacyProfile(userId);
  const save = useSavePharmacyProfile(userId);
  const uploadLogo = useUploadPharmacyLogo(userId);
  const uploadImage = useUploadPharmacyImage(userId);

  const [form, setForm] = useState({
    name_en: "",
    description_en: "",
    registration_number: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    opens_at: "",
    closes_at: "",
    is_open_24h: false,
    offers_delivery: false,
    offers_pickup: false,
  });

  useEffect(() => {
    if (!data?.pharmacy) return;
    setForm((f) => ({ ...f, name_en: data.pharmacy.name_en ?? "" }));
  }, [data]);

  if (isLoading) return <LoadingState />;
  return (
    <>
      {isError && <NotFoundBanner />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name (EN)"><Text value={form.name_en} onChange={(v) => setForm((f) => ({ ...f, name_en: v }))} /></Field>
        <Field label="Registration number"><Text value={form.registration_number} onChange={(v) => setForm((f) => ({ ...f, registration_number: v }))} /></Field>
        <Field label="Phone"><Text value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} /></Field>
        <Field label="Email"><Text value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} /></Field>
        <Field label="City"><Text value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} /></Field>
        <Field label="Address"><Text value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} /></Field>
        <Field label="Opens at"><Text type="time" value={form.opens_at} onChange={(v) => setForm((f) => ({ ...f, opens_at: v }))} /></Field>
        <Field label="Closes at"><Text type="time" value={form.closes_at} onChange={(v) => setForm((f) => ({ ...f, closes_at: v }))} /></Field>
      </div>
      <Field label="Description (EN)"><Area value={form.description_en} onChange={(v) => setForm((f) => ({ ...f, description_en: v }))} /></Field>
      <div className="flex flex-wrap gap-2">
        <Toggle checked={form.is_open_24h} onChange={(v) => setForm((f) => ({ ...f, is_open_24h: v }))} label="Open 24h" />
        <Toggle checked={form.offers_delivery} onChange={(v) => setForm((f) => ({ ...f, offers_delivery: v }))} label="Offers delivery" />
        <Toggle checked={form.offers_pickup} onChange={(v) => setForm((f) => ({ ...f, offers_pickup: v }))} label="Offers pickup" />
      </div>

      <SaveBar
        onSave={() =>
          save.mutate(form, {
            onSuccess: (res) => sonnerToast.success(res.message ?? "Pharmacy profile saved."),
            onError: (err) => sonnerToast.error("Could not save profile.", { description: getErrorMessage(err) }),
          })
        }
        isPending={save.isPending}
      />

      <SectionTitle>Branding</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <FileField
          label="Logo"
          isPending={uploadLogo.isPending}
          currentUrl={data?.pharmacy.logo ?? undefined}
          onSelect={(f) =>
            uploadLogo.mutate(f, {
              onSuccess: () => sonnerToast.success("Logo uploaded."),
              onError: (err) => sonnerToast.error("Upload failed.", { description: getErrorMessage(err) }),
            })
          }
        />
        <FileField
          label="Cover image"
          isPending={uploadImage.isPending}
          currentUrl={data?.pharmacy.image ?? undefined}
          onSelect={(f) =>
            uploadImage.mutate(f, {
              onSuccess: () => sonnerToast.success("Cover image uploaded."),
              onError: (err) => sonnerToast.error("Upload failed.", { description: getErrorMessage(err) }),
            })
          }
        />
      </div>
    </>
  );
}

/* ── Hospital ───────────────────────────────────────────────────────────── */

function HospitalProfileForm({ userId }: { userId: number }) {
  const { data, isLoading, isError } = useGetHospitalProfile(userId);
  const save = useSaveHospitalProfile(userId);
  const uploadLogo = useUploadHospitalLogo(userId);
  const uploadImage = useUploadHospitalImage(userId);
  const uploadGallery = useUploadHospitalGallery(userId);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryCaption, setGalleryCaption] = useState("");

  const [form, setForm] = useState({
    name_en: "",
    description_en: "",
    type: "hospital",
    registration_number: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    is_open_24h: false,
  });

  useEffect(() => {
    if (!data?.hospital) return;
    setForm((f) => ({ ...f, name_en: data.hospital.name_en ?? "", type: data.hospital.type ?? "hospital" }));
  }, [data]);

  if (isLoading) return <LoadingState />;
  return (
    <>
      {isError && <NotFoundBanner />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name (EN)"><Text value={form.name_en} onChange={(v) => setForm((f) => ({ ...f, name_en: v }))} /></Field>
        <Field label="Type"><Text value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} /></Field>
        <Field label="Registration number"><Text value={form.registration_number} onChange={(v) => setForm((f) => ({ ...f, registration_number: v }))} /></Field>
        <Field label="Phone"><Text value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} /></Field>
        <Field label="Email"><Text value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} /></Field>
        <Field label="City"><Text value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} /></Field>
        <Field label="Address"><Text value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} /></Field>
      </div>
      <Field label="Description (EN)"><Area value={form.description_en} onChange={(v) => setForm((f) => ({ ...f, description_en: v }))} /></Field>
      <Toggle checked={form.is_open_24h} onChange={(v) => setForm((f) => ({ ...f, is_open_24h: v }))} label="Open 24h" />

      <SaveBar
        onSave={() =>
          save.mutate(form, {
            onSuccess: (res) => sonnerToast.success(res.message ?? "Hospital profile saved."),
            onError: (err) => sonnerToast.error("Could not save profile.", { description: getErrorMessage(err) }),
          })
        }
        isPending={save.isPending}
      />

      <SectionTitle>Branding</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <FileField
          label="Logo"
          isPending={uploadLogo.isPending}
          currentUrl={data?.hospital.logo ?? undefined}
          onSelect={(f) =>
            uploadLogo.mutate(f, {
              onSuccess: () => sonnerToast.success("Logo uploaded."),
              onError: (err) => sonnerToast.error("Upload failed.", { description: getErrorMessage(err) }),
            })
          }
        />
        <FileField
          label="Cover image"
          isPending={uploadImage.isPending}
          currentUrl={data?.hospital.image ?? undefined}
          onSelect={(f) =>
            uploadImage.mutate(f, {
              onSuccess: () => sonnerToast.success("Cover image uploaded."),
              onError: (err) => sonnerToast.error("Upload failed.", { description: getErrorMessage(err) }),
            })
          }
        />
      </div>

      <SectionTitle>Gallery</SectionTitle>
      <div className="flex items-center gap-2">
        <input
          type="file"
          onChange={(e) => setGalleryFile(e.target.files?.[0] ?? null)}
          className="text-[11px] flex-1"
        />
        <input
          value={galleryCaption}
          onChange={(e) => setGalleryCaption(e.target.value)}
          placeholder="Caption (optional)"
          className={cn(inputCls, "flex-1")}
        />
        <button
          type="button"
          disabled={!galleryFile || uploadGallery.isPending}
          onClick={() => {
            if (!galleryFile) return;
            uploadGallery.mutate([{ file: galleryFile, caption: galleryCaption || undefined }], {
              onSuccess: (res) => {
                sonnerToast.success(res.message ?? "Image(s) uploaded.");
                setGalleryFile(null);
                setGalleryCaption("");
              },
              onError: (err) => sonnerToast.error("Upload failed.", { description: getErrorMessage(err) }),
            });
          }}
          className="h-9 px-3 rounded-[6px] bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-50 shrink-0"
        >
          {uploadGallery.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
        </button>
      </div>
    </>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function SaveBar({ onSave, isPending, label = "Save" }: { onSave: () => void; isPending: boolean; label?: string }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="h-9 px-4 rounded-[6px] bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {label}
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
    </div>
  );
}

function NotFoundBanner() {
  return (
    <div className="flex items-center gap-2 rounded-[6px] border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      No profile found yet for this user — fill in the fields below and save to create one.
    </div>
  );
}
