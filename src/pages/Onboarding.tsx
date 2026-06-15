import { useState, ReactNode } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  currentUser,
  updateProfile,
  dashboardPath,
  Role,
} from "@/lib/auth-store";
import { toast } from "sonner";
import logo from "@/assets/mediconnect-logo.png";

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);

const Onboarding = () => {
  const { role } = useParams<{ role: Role }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = currentUser();

  if (!user) return <Navigate to="/auth" replace />;
  if (role && role !== user.role)
    return <Navigate to={`/onboarding/${user.role}`} replace />;

  const [form, setForm] = useState<Record<string, any>>({});
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(user.id, form, true);
    toast.success(t("auth.onboarding.title") + " ✓");
    navigate(dashboardPath(user.role));
  };
  const skip = () => navigate(dashboardPath(user.role));

  return (
    <div className="min-h-dvh bg-gradient-soft">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-9 w-auto" />
          </div>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="container max-w-2xl py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-border bg-card shadow-large p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t(`auth.role_${user.role}`)}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            {t("auth.onboarding.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("auth.onboarding.sub")}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {user.role === "patient" && (
              <PatientFields t={t} form={form} set={set} />
            )}
            {user.role === "doctor" && (
              <DoctorFields t={t} form={form} set={set} />
            )}
            {user.role === "hospital" && (
              <HospitalFields t={t} form={form} set={set} />
            )}
            {user.role === "pharmacy" && (
              <PharmacyFields t={t} form={form} set={set} />
            )}

            <div className="flex justify-between gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={skip}>
                {t("auth.onboarding.skip")}
              </Button>
              <Button type="submit" className="bg-gradient-primary">
                {t("auth.onboarding.save_continue")}
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

const PatientFields = ({ t, form, set }: any) => (
  <>
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={t("auth.onboarding.patient.dob")}>
        <Input
          type="date"
          onChange={(e) => set("date_of_birth", e.target.value)}
        />
      </Field>
      <Field label={t("auth.onboarding.patient.gender")}>
        <Select onValueChange={(v) => set("gender", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">
              {t("auth.onboarding.patient.male")}
            </SelectItem>
            <SelectItem value="female">
              {t("auth.onboarding.patient.female")}
            </SelectItem>
            <SelectItem value="other">
              {t("auth.onboarding.patient.other")}
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("auth.onboarding.patient.national_id")}>
        <Input onChange={(e) => set("national_id", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.patient.blood_type")}>
        <Input
          placeholder="O+"
          onChange={(e) => set("blood_type", e.target.value)}
        />
      </Field>
    </div>
    <Field label={t("auth.onboarding.patient.address")}>
      <Input onChange={(e) => set("address", e.target.value)} />
    </Field>
    <div className="grid sm:grid-cols-3 gap-4">
      <Field label={t("auth.onboarding.patient.city")}>
        <Input onChange={(e) => set("city", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.patient.province")}>
        <Input onChange={(e) => set("province", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.patient.country")}>
        <Input
          defaultValue="Rwanda"
          onChange={(e) => set("country", e.target.value)}
        />
      </Field>
    </div>
    <div className="grid sm:grid-cols-3 gap-4">
      <Field label={t("auth.onboarding.patient.ec_name")}>
        <Input
          onChange={(e) => set("emergency_contact_name", e.target.value)}
        />
      </Field>
      <Field label={t("auth.onboarding.patient.ec_phone")}>
        <Input
          onChange={(e) => set("emergency_contact_phone", e.target.value)}
        />
      </Field>
      <Field label={t("auth.onboarding.patient.ec_relation")}>
        <Input
          onChange={(e) => set("emergency_contact_relation", e.target.value)}
        />
      </Field>
    </div>
  </>
);

const DoctorFields = ({ t, form, set }: any) => (
  <>
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={t("auth.onboarding.doctor.specialization")}>
        <Input onChange={(e) => set("specialization", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.doctor.degree")}>
        <Input
          placeholder="MBBS"
          onChange={(e) => set("doctor_degree", e.target.value)}
        />
      </Field>
      <Field label={t("auth.onboarding.doctor.license")}>
        <Input onChange={(e) => set("medical_license", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.doctor.designations")}>
        <Input onChange={(e) => set("designations", e.target.value)} />
      </Field>
    </div>
    <Field label={t("auth.onboarding.doctor.bio_en")}>
      <Textarea rows={2} onChange={(e) => set("bio_en", e.target.value)} />
    </Field>
    <Field label={t("auth.onboarding.doctor.bio_fr")}>
      <Textarea rows={2} onChange={(e) => set("bio_fr", e.target.value)} />
    </Field>
    <Field label={t("auth.onboarding.doctor.bio_kiny")}>
      <Textarea rows={2} onChange={(e) => set("bio_kiny", e.target.value)} />
    </Field>
    <div className="grid sm:grid-cols-3 gap-4">
      <Field label={t("auth.onboarding.doctor.fee")}>
        <Input
          type="number"
          onChange={(e) => set("consultation_fee", Number(e.target.value))}
        />
      </Field>
      <Field label={t("auth.onboarding.doctor.currency")}>
        <Input
          defaultValue="RWF"
          onChange={(e) => set("currency", e.target.value)}
        />
      </Field>
      <Field label={t("auth.onboarding.doctor.preferred_language")}>
        <Select onValueChange={(v) => set("preferred_language", v)}>
          <SelectTrigger>
            <SelectValue placeholder="en" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="rw">Kinyarwanda</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
    <Field label={t("auth.onboarding.doctor.consultation_type")}>
      <Select onValueChange={(v) => set("consultation_type", v)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="in_person">
            {t("auth.onboarding.doctor.in_person")}
          </SelectItem>
          <SelectItem value="online">
            {t("auth.onboarding.doctor.online")}
          </SelectItem>
          <SelectItem value="both">
            {t("auth.onboarding.doctor.both")}
          </SelectItem>
        </SelectContent>
      </Select>
    </Field>
  </>
);

const HospitalFields = ({ t, form, set }: any) => (
  <>
    <div className="grid sm:grid-cols-3 gap-4">
      <Field label={t("auth.onboarding.hospital.name_en")}>
        <Input onChange={(e) => set("name_en", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.hospital.name_fr")}>
        <Input onChange={(e) => set("name_fr", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.hospital.name_kiny")}>
        <Input onChange={(e) => set("name_kiny", e.target.value)} />
      </Field>
    </div>
    <Field label={t("auth.onboarding.hospital.description_en")}>
      <Textarea
        rows={2}
        onChange={(e) => set("description_en", e.target.value)}
      />
    </Field>
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={t("auth.onboarding.hospital.type")}>
        <Input
          defaultValue="hospital"
          onChange={(e) => set("type", e.target.value)}
        />
      </Field>
      <Field label={t("auth.onboarding.hospital.registration_number")}>
        <Input onChange={(e) => set("registration_number", e.target.value)} />
      </Field>
    </div>
    <Field label={t("auth.onboarding.hospital.address")}>
      <Input onChange={(e) => set("address", e.target.value)} />
    </Field>
    <div className="grid sm:grid-cols-3 gap-4">
      <Field label={t("auth.onboarding.hospital.city")}>
        <Input onChange={(e) => set("city", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.hospital.province")}>
        <Input onChange={(e) => set("province", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.hospital.country")}>
        <Input
          defaultValue="Rwanda"
          onChange={(e) => set("country", e.target.value)}
        />
      </Field>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={t("auth.onboarding.hospital.latitude")}>
        <Input
          type="number"
          step="any"
          onChange={(e) => set("latitude", Number(e.target.value))}
        />
      </Field>
      <Field label={t("auth.onboarding.hospital.longitude")}>
        <Input
          type="number"
          step="any"
          onChange={(e) => set("longitude", Number(e.target.value))}
        />
      </Field>
    </div>
    <div className="grid sm:grid-cols-3 gap-4">
      <Field label={t("auth.onboarding.hospital.phone")}>
        <Input onChange={(e) => set("phone", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.hospital.email")}>
        <Input type="email" onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.hospital.website")}>
        <Input onChange={(e) => set("website", e.target.value)} />
      </Field>
    </div>
    <div className="grid sm:grid-cols-3 gap-4 items-end">
      <Field label={t("auth.onboarding.hospital.opens_at")}>
        <Input type="time" onChange={(e) => set("opens_at", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.hospital.closes_at")}>
        <Input type="time" onChange={(e) => set("closes_at", e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 pb-2">
        <Switch onCheckedChange={(v) => set("is_open_24h", v)} />
        <span className="text-sm">
          {t("auth.onboarding.hospital.open_24h")}
        </span>
      </label>
    </div>
  </>
);

const PharmacyFields = ({ t, form, set }: any) => (
  <>
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={t("auth.onboarding.pharmacy.name_en")}>
        <Input onChange={(e) => set("name_en", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.pharmacy.name_fr")}>
        <Input onChange={(e) => set("name_fr", e.target.value)} />
      </Field>
    </div>
    <Field label={t("auth.onboarding.pharmacy.description_en")}>
      <Textarea
        rows={2}
        onChange={(e) => set("description_en", e.target.value)}
      />
    </Field>
    <Field label={t("auth.onboarding.pharmacy.registration_number")}>
      <Input onChange={(e) => set("registration_number", e.target.value)} />
    </Field>
    <Field label={t("auth.onboarding.pharmacy.address")}>
      <Input onChange={(e) => set("address", e.target.value)} />
    </Field>
    <div className="grid sm:grid-cols-3 gap-4">
      <Field label={t("auth.onboarding.pharmacy.city")}>
        <Input onChange={(e) => set("city", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.pharmacy.province")}>
        <Input onChange={(e) => set("province", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.pharmacy.country")}>
        <Input
          defaultValue="Rwanda"
          onChange={(e) => set("country", e.target.value)}
        />
      </Field>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={t("auth.onboarding.pharmacy.latitude")}>
        <Input
          type="number"
          step="any"
          onChange={(e) => set("latitude", Number(e.target.value))}
        />
      </Field>
      <Field label={t("auth.onboarding.pharmacy.longitude")}>
        <Input
          type="number"
          step="any"
          onChange={(e) => set("longitude", Number(e.target.value))}
        />
      </Field>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={t("auth.onboarding.pharmacy.phone")}>
        <Input onChange={(e) => set("phone", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.pharmacy.email")}>
        <Input type="email" onChange={(e) => set("email", e.target.value)} />
      </Field>
    </div>
    <div className="grid sm:grid-cols-3 gap-4 items-end">
      <Field label={t("auth.onboarding.pharmacy.opens_at")}>
        <Input type="time" onChange={(e) => set("opens_at", e.target.value)} />
      </Field>
      <Field label={t("auth.onboarding.pharmacy.closes_at")}>
        <Input type="time" onChange={(e) => set("closes_at", e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 pb-2">
        <Switch onCheckedChange={(v) => set("is_open_24h", v)} />
        <span className="text-sm">
          {t("auth.onboarding.pharmacy.open_24h")}
        </span>
      </label>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="flex items-center gap-2">
        <Switch onCheckedChange={(v) => set("offers_delivery", v)} />
        <span className="text-sm">
          {t("auth.onboarding.pharmacy.offers_delivery")}
        </span>
      </label>
      <label className="flex items-center gap-2">
        <Switch onCheckedChange={(v) => set("offers_pickup", v)} />
        <span className="text-sm">
          {t("auth.onboarding.pharmacy.offers_pickup")}
        </span>
      </label>
    </div>
    <div className="grid sm:grid-cols-4 gap-4">
      <Field label={t("auth.onboarding.pharmacy.delivery_fee")}>
        <Input
          type="number"
          onChange={(e) => set("delivery_fee", Number(e.target.value))}
        />
      </Field>
      <Field label={t("auth.onboarding.pharmacy.delivery_currency")}>
        <Input
          defaultValue="RWF"
          onChange={(e) => set("delivery_currency", e.target.value)}
        />
      </Field>
      <Field label={t("auth.onboarding.pharmacy.delivery_radius_km")}>
        <Input
          type="number"
          onChange={(e) => set("delivery_radius_km", Number(e.target.value))}
        />
      </Field>
      <Field label={t("auth.onboarding.pharmacy.estimated_delivery_minutes")}>
        <Input
          type="number"
          onChange={(e) =>
            set("estimated_delivery_minutes", Number(e.target.value))
          }
        />
      </Field>
    </div>
  </>
);

export default Onboarding;
