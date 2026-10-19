import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Building2, FileText, FlaskConical, Pill, Stethoscope } from "lucide-react";
import { useGetPatientReferrals } from "@/hooks/patient/use-patient-referrals";
import { useGetPatientServiceBookings } from "@/hooks/patient/use-patient-service";
import { useGetPatientPrescriptions } from "@/hooks/patient/use-patient-prescriptions";
import { useGetCareOrders } from "@/hooks/doctor/use-care-orders";

export function PatientCareNext() {
  const { t } = useTranslation();
  const { data: referralData } = useGetPatientReferrals();
  const { data: bookingData } = useGetPatientServiceBookings();
  const { data: rxData } = useGetPatientPrescriptions();
  const { data: careOrders } = useGetCareOrders("patient");

  const referrals = (referralData?.referrals ?? []).filter((row) =>
    ["pending", "accepted"].includes(String(row.status)),
  );
  const bookings = (bookingData?.data ?? []).filter((row) =>
    ["pending", "accepted"].includes(String(row.status)),
  );
  const prescriptions = (rxData?.prescriptions ?? []).filter((row) =>
    ["issued", "sent_to_pharmacy", "active", "pending"].includes(String(row.status)),
  );

  const orders = (careOrders ?? []).filter((row) => ["pending", "accepted"].includes(String(row.status)));

  if (!referrals.length && !bookings.length && !prescriptions.length && !orders.length) return null;

  return (
    <section className="rounded-[6px] border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("pages.patient.care_from_doctor", "Care from your doctor")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {t("pages.patient.care_from_doctor_hint", "Stay on MediConnect for the next visit, specialist, or pharmacy.")}
          </p>
        </div>
        <Link to="/patient/care-orders" className="text-[11px] font-semibold text-primary hover:underline">
          {t("common.view_all", "View all")}
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {referrals.slice(0, 3).map((row) => {
          const target = row.hospital?.name || row.pharmacy?.name || t("pages.patient.partner", "Partner");
          const to = row.hospital?.name
            ? `/patient/search-facilities?q=${encodeURIComponent(row.hospital.name)}`
            : row.pharmacy?.name
              ? `/patient/search-pharmacy?q=${encodeURIComponent(row.pharmacy.name)}`
              : "/patient/search-facilities";
          const Icon = row.hospital ? Building2 : row.pharmacy ? Pill : Stethoscope;
          return (
            <Link key={`r-${row.id}`} to={to} className="flex items-start gap-2 rounded-[6px] border border-border bg-card p-3 hover:border-primary/40">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground">{target}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground line-clamp-2">{row.reason}</span>
              </span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
        {bookings.slice(0, 2).map((row) => (
          <Link key={`b-${row.id}`} to="/patient/service-bookings" className="flex items-start gap-2 rounded-[6px] border border-border bg-card p-3 hover:border-primary/40">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">{row.hospital?.name_en || t("pages.patient.facility_visit", "Facility visit")}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {row.preferred_date} · {row.preferred_time} · {row.status}
              </span>
            </span>
          </Link>
        ))}
        {prescriptions.slice(0, 2).map((row: { id: number; diagnosis?: string; pharmacy?: { name?: string } }) => (
          <Link key={`p-${row.id}`} to="/patient/prescriptions" className="flex items-start gap-2 rounded-[6px] border border-border bg-card p-3 hover:border-primary/40">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">
                {row.pharmacy?.name || t("pages.patient.prescription", "Prescription")}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground line-clamp-2">{row.diagnosis}</span>
            </span>
          </Link>
        ))}
        {orders.slice(0, 3).map((row) => (
          <Link key={`c-${row.id}`} to="/patient/care-orders" className="flex items-start gap-2 rounded-[6px] border border-border bg-card p-3 hover:border-primary/40">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">{row.title || row.order_type}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground line-clamp-2">
                {(row.items || []).slice(0, 3).join(", ") || row.clinical_notes}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
