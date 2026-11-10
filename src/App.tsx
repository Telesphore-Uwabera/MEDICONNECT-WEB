import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { useSessionSync } from "@/hooks/useSessionSync";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CallProvider } from "./context/CallContext.tsx";
import { GlobalCallOverlay } from "./components/consultatioRoom/GlobalCallOverlay.tsx";
import { AppointmentCompletionGate } from "./components/consultatioRoom/AppointmentCompletionGate.tsx";
import { PostCallRejoinBar } from "./components/consultatioRoom/PostCallRejoinBar.tsx";
import { GlobalInstantPill } from "./components/GlobalInstantPill.tsx";
import { WhatsAppFloat } from "./components/WhatsAppFloat.tsx";
import {
  ACCESS_PROMPT_EVENT,
  type AccessPromptDetail,
} from "@/lib/access-events";
import { LogIn, X, ShieldAlert } from "lucide-react";
import { goToSignIn } from "@/lib/auth-session";
import { usePatientProfileLocked } from "@/hooks/use-patient-profile-gate";
import Index from "./pages/Index.tsx"; 
import Auth from "./pages/Auth";
const Onboarding = lazy(() => import("./pages/Onboarding"));
import ConsultationRoomPage from "./pages/ConsultationRoom.tsx"; 
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));

/* ── Patient ── */
const PatientOverview = lazy(() => import("./pages/patient/PatientOverview"));
const PatientDoctors = lazy(() => import("./pages/patient/PatientDoctors"));
const PatientHospitals = lazy(() => import("./pages/patient/PatientHospitals"));
const PatientInstant = lazy(() => import("./pages/patient/PatientInstant"));
const PatientAppointments = lazy(() => import("./pages/patient/PatientAppointments"));
const PatientPrescriptions = lazy(() => import("./pages/patient/PatientPrescriptions"));
const PatientMedicalRecords = lazy(() => import("./pages/patient/PatientMedicalRecords"));
const PatientPharmacy = lazy(() => import("./pages/patient/PatientPharmacy"));
const PatientProfile = lazy(() => import("./pages/patient/PatientProfile"));
const PatientFitnessCertificates = lazy(() => import("./pages/patient/FitnessCertificates"));
const PatientReferrals = lazy(() => import("./pages/patient/PatientReferrals"));
const PatientCareOrders = lazy(() => import("./pages/patient/PatientCareOrders"));
const PatientEpisodes = lazy(() => import("./pages/patient/PatientEpisodes"));
const MedicalInfo = lazy(() => import("./pages/patient/MedicalInfo"));
const PatientInsurence = lazy(() => import("./pages/patient/PatientInsurence"));
const ServiceBookings = lazy(() => import("./pages/patient/ServiceBookings"));
const MyReviews = lazy(() => import("./pages/patient/MyReviews"));
const PatientSettings = lazy(() => import("./pages/patient/PatientSettings"));
const Orders = lazy(() => import("./pages/patient/Orders"));
const PatientDocuments = lazy(() => import("./pages/patient/PatientDocuments"));
const PatientFamily = lazy(() => import("./pages/patient/PatientFamily"));
const PatientBills = lazy(() => import("./pages/patient/PatientBills"));

/* ── Doctor ── */
const DoctorOverview = lazy(() => import("./pages/doctor/DoctorOverview"));
const DoctorAvailability = lazy(() => import("./pages/doctor/DoctorAvailability"));
const DoctorAppointments = lazy(() => import("./pages/doctor/DoctorAppointments"));
const DoctorPatients = lazy(() => import("./pages/doctor/DoctorPatients"));
const DoctorPrescriptions = lazy(() => import("./pages/doctor/DoctorPrescriptions"));
const DoctorConsultationSummaries = lazy(() => import("./pages/doctor/DoctorConsultationSummaries"));
const DoctorProfile = lazy(() => import("./pages/doctor/DoctorProfile"));
const DoctorFitnessCertificates = lazy(() => import("./pages/doctor/FitnessCertificates"));
const MyReferrals = lazy(() => import("./pages/doctor/MyReferrals"));
const DoctorCareOrders = lazy(() => import("./pages/doctor/DoctorCareOrders"));
const DoctorSettings = lazy(() => import("./pages/doctor/DoctorSettings"));
const DoctorEarnings = lazy(() => import("./pages/doctor/DoctorEarnings"));
const DoctorFollowUps = lazy(() => import("./pages/doctor/DoctorFollowUps"));
const DoctorInbox = lazy(() => import("./pages/doctor/DoctorInbox"));

/* ── Hospital ── */
const HospitalAnalytics = lazy(() => import("./pages/hospital/HospitalAnalytics"));
const HospitalAppointments = lazy(() => import("./pages/hospital/HospitalAppointments"));
const HospitalDoctors = lazy(() => import("./pages/hospital/HospitalDoctors"));
const HospitalDepartments = lazy(() => import("./pages/hospital/HospitalDepartments"));
const HospitalSchedule = lazy(() => import("./pages/hospital/HospitalSchedule"));
const HospitalPrescriptions = lazy(() => import("./pages/hospital/HospitalPrescriptions"));
const HospitalProfile = lazy(() => import("./pages/hospital/HospitalProfile"));
const HospitalInsurances = lazy(() => import("./pages/hospital/HospitalInsurances"));
const HospitalServiceBookings = lazy(() => import("./pages/hospital/HospitalServiceBookings"));
const HospitalReferrals = lazy(() => import("./pages/hospital/HospitalReferrals"));
const HospitalCareOrders = lazy(() => import("./pages/hospital/HospitalCareOrders"));
const HospitalSettings = lazy(() => import("./pages/hospital/HospitalSettings"));

/* ── Pharmacy ── */
const PharmacyOverview = lazy(() => import("./pages/pharmacy/PharmacyOverview"));
const PharmacyOrders = lazy(() => import("./pages/pharmacy/PharmacyOrders"));
const PharmacyInventory = lazy(() => import("./pages/pharmacy/PharmacyInventory"));
const PharmacyPrescriptions = lazy(() => import("./pages/pharmacy/PharmacyPrescriptions"));
const PharmacyProfile = lazy(() => import("./pages/pharmacy/PmarmacyProfile"));
const PharmacyCategories = lazy(() => import("./pages/pharmacy/PharmacyCategories"));
const PharmacyDeliveries = lazy(() => import("./pages/pharmacy/PharmacyDeliveries"));
const PharmacySettings = lazy(() => import("./pages/pharmacy/PharmacySettings"));
const RestockRequests = lazy(() => import("./pages/pharmacy/RestockRequests"));
const PharmacyCareOrders = lazy(() => import("./pages/pharmacy/PharmacyCareOrders"));

/* ── Admin ── */
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const ManageDoctors = lazy(() => import("./pages/admin/ManageDoctors"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminModeration = lazy(() => import("./pages/admin/AdminModeration"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const ManagePharmacies = lazy(() => import("./pages/admin/ManagePharmacies"));
const ManageHospitals = lazy(() => import("./pages/admin/ManageHospitals"));
const ManageAppointments = lazy(() => import("./pages/admin/ManageApointments"));
const ManageInsurances = lazy(() => import("./pages/admin/ManageInsurances"));
const ManageServicePricing = lazy(() => import("./pages/admin/ManageServicePricing"));
const ManageInstantDoctors = lazy(() => import("./pages/admin/ManageInstantDoctors"));
const ManageCertificationDoctor = lazy(() => import("./pages/admin/ManageCertificationDoctor"));
const ManageFitnessCertificates = lazy(() => import("./pages/admin/ManageFitnessCertificates"));
const ManageHelpCenterLinks = lazy(() => import("./pages/admin/ManageHelpCenterLinks"));
const ManageSpecialities = lazy(() => import("./pages/admin/ManageSpecialities"));
const ChecklistQuestions = lazy(() => import("./pages/admin/ChecklistQuestions"));
const ManageAdminWallet = lazy(() => import("./pages/admin/ManageAdminWallet"));
const AdminOurTeam = lazy(() => import("./pages/admin/AdminOurTeam"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminRefunds = lazy(() => import("./pages/admin/AdminRefunds"));
const AdminSystemSettings = lazy(() => import("./pages/admin/AdminSystemSettings"));
const Help = lazy(() => import("./pages/Help"));
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/errors/NotFound";
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const AdminSystemCommunication = lazy(() => import("./pages/admin/AdminSystemCommunication"));
const Terms = lazy(() => import("./pages/terms"));
const Privacy = lazy(() => import("./pages/privacy"));
/* ─────────────────────────────────────────────────────────────────
   RequireAuth
   Shows a confirmation dialog instead of hard-redirecting.
   User chooses: go to /auth (preserving return path) or go back.
───────────────────────────────────────────────────────────────── */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("auth_token");
  const [dismissed, setDismissed] = useState(false);

  if (isAuthenticated) return <>{children}</>;

  // User chose "Go back" — navigate away, render nothing
  if (dismissed) return null;

  const handleSignIn = () => {
    goToSignIn(location);
  };

  const handleGoBack = () => {
    setDismissed(true);
    navigate(-1);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleGoBack}
      />

      {/* Sheet — bottom on mobile, centered on sm+ */}
      <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center px-4 pb-4 sm:pb-0">
        <div className="w-full sm:w-[420px] bg-card border border-border/60 rounded-t-[16px] sm:rounded-[6px] shadow-2xl shadow-black/30 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[6px] bg-primary/10">
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[13px] font-bold text-foreground">
                {t("admin.ui.sign_in_required")}
              </p>
            </div>
            <button
              onClick={handleGoBack}
              className="p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              aria-label={t("pages.cards.dismiss")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {t("admin.ui.sign_in_required_body")}
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleSignIn}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[6px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              {t("common.signIn")}
            </button>
            <button
              onClick={handleGoBack}
              className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-[6px] border border-border/60 text-muted-foreground text-[12px] font-semibold hover:bg-secondary/70 hover:text-foreground transition-colors"
            >
              {t("admin.ui.go_back")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const AccessPromptManager = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [loginPrompt, setLoginPrompt] = useState<AccessPromptDetail | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AccessPromptDetail>).detail;
      if (detail.reason !== "login") return;
      setLoginPrompt(detail);
    };

    window.addEventListener(ACCESS_PROMPT_EVENT, handler);
    return () => window.removeEventListener(ACCESS_PROMPT_EVENT, handler);
  }, []);

  const signIn = () => {
    setLoginPrompt(null);
    goToSignIn(location);
  };

  return (
    <>
      {loginPrompt && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {t("admin.ui.sign_in_required")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("admin.ui.continue_account")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLoginPrompt(null)}
                className="rounded-[6px] p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {loginPrompt.message ?? t("admin.ui.please_sign_in")}
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={signIn}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[6px] bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="h-3.5 w-3.5" />
                {t("common.signIn")}
              </button>
              <button
                onClick={() => setLoginPrompt(null)}
                className="h-10 rounded-[6px] border border-border px-4 text-[12px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const profileAllowedPath = (path: string) =>
  path === "/patient/profile" ||
  path.startsWith("/auth") ||
  path.startsWith("/onboarding") ||
  path === "/help" ||
  path === "/contact" ||
  path === "/privacy" ||
  path === "/terms" ||
  path === "/delete-account";

/** Incomplete patients stay on the profile form. Search and the rest of the app are closed. */
const RequirePatientProfile = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { locked, pending } = usePatientProfileLocked();
  if (profileAllowedPath(location.pathname)) return <>{children}</>;
  if (pending) return null;
  if (locked) {
    return <Navigate to="/patient/profile" replace state={{ from: location, reason: "complete_profile" }} />;
  }
  return <>{children}</>;
};

const IdleLogoutGuard = () => {
  useIdleLogout();
  useSessionSync();
  return null;
};

const App = () => (
    <TooltipProvider>
      <BrowserRouter>
        <CallProvider>
          <Toaster />
          <Sonner />
          <IdleLogoutGuard />
          <GlobalCallOverlay />
          <AppointmentCompletionGate />
          <PostCallRejoinBar />
          <GlobalInstantPill />
          <WhatsAppFloat />
          <AccessPromptManager />
          <ErrorBoundary>
          <RequirePatientProfile>
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <Routes>
            {/* ── Public ──────────────────────────────────────── */}
            <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/register" element={<Auth />} />
            <Route path="/help" element={<Help />} /> 
            <Route path="/contact" element={<Help />} /> 
            <Route path="/privacy" element={<Privacy />} /> 
            <Route path="/terms" element={<Terms />} /> 
            <Route path="/delete-account" element={<DeleteAccount />} />
            <Route path="/onboarding/:role" element={<Onboarding />} />
            <Route
              path="/consultation/:roomName"
              element={<ConsultationRoomPage />}
            />

          {/* verify certificate */}
            <Route path="/verify-certificate" element={<VerifyCertificate />} />
            <Route path="/fitness-certificates/verify/:certificateNumber" element={<VerifyCertificate />} />
            
            {/* ── Patient: PUBLIC (no login needed) ───────────── */}
            <Route
              path="/patient/search-doctors"
              element={<PatientDoctors />}
            />

            <Route
              path="/patient/search-facilities"
              element={<PatientHospitals />}
            />
            <Route
              path="/patient/search-pharmacy"
              element={<PatientPharmacy />}
            />

            {/* ── Patient: PROTECTED ──────────────────────────── */}
            <Route
              path="/patient"
              element={
                <RequireAuth>
                  <PatientOverview />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/instant"
              element={
                <RequireAuth>
                  <PatientInstant />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/appointments"
              element={
                <RequireAuth>
                  <PatientAppointments />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/prescriptions"
              element={
                <RequireAuth>
                  <PatientPrescriptions />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/fitness-certificates"
              element={
                <RequireAuth>
                  <PatientFitnessCertificates />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/profile"
              element={
                <RequireAuth>
                  <PatientProfile />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/medical-info"
              element={
                <RequireAuth>
                  <MedicalInfo />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/medical-records"
              element={
                <RequireAuth>
                  <PatientMedicalRecords />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/insurance"
              element={
                <RequireAuth>
                  <PatientInsurence />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/service-bookings"
              element={
                <RequireAuth>
                  <ServiceBookings />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/referrals"
              element={
                <RequireAuth>
                  <PatientReferrals />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/care-orders"
              element={
                <RequireAuth>
                  <PatientCareOrders />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/episodes"
              element={
                <RequireAuth>
                  <PatientEpisodes />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/my-reviews"
              element={
                <RequireAuth>
                  <MyReviews />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/settings"
              element={
                <RequireAuth>
                  <PatientSettings />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/documents"
              element={
                <RequireAuth>
                  <PatientDocuments />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/family"
              element={
                <RequireAuth>
                  <PatientFamily />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/billing"
              element={
                <RequireAuth>
                  <PatientBills />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/pharmacy/orders"
              element={
                <RequireAuth>
                  <Orders />
                </RequireAuth>
              }
            />

            {/* ── Doctor: PROTECTED ───────────────────────────── */}
            <Route
              path="/doctor"
              element={
                <RequireAuth>
                  <DoctorOverview />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/availability"
              element={
                <RequireAuth>
                  <DoctorAvailability />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/appointments"
              element={
                <RequireAuth>
                  <DoctorAppointments />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/patients"
              element={
                <RequireAuth>
                  <DoctorPatients />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/earnings"
              element={
                <RequireAuth>
                  <DoctorEarnings />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/follow-ups"
              element={
                <RequireAuth>
                  <DoctorFollowUps />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/inbox"
              element={
                <RequireAuth>
                  <DoctorInbox />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/prescriptions"
              element={
                <RequireAuth>
                  <DoctorPrescriptions />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/consultation-summaries"
              element={
                <RequireAuth>
                  <DoctorConsultationSummaries />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/fitness-certificates"
              element={
                <RequireAuth>
                  <DoctorFitnessCertificates />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/profile"
              element={
                <RequireAuth>
                  <DoctorProfile />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/referrals"
              element={
                <RequireAuth>
                  <MyReferrals />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/care-orders"
              element={
                <RequireAuth>
                  <DoctorCareOrders />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/settings"
              element={
                <RequireAuth>
                  <DoctorSettings />
                </RequireAuth>
              }
            />

            {/* ── Hospital: PROTECTED ─────────────────────────── */}
            <Route
              path="/hospital"
              element={
                <RequireAuth>
                  <HospitalAnalytics />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/appointments"
              element={
                <RequireAuth>
                  <HospitalAppointments />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/doctors"
              element={
                <RequireAuth>
                  <HospitalDoctors />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/departments"
              element={
                <RequireAuth>
                  <HospitalDepartments />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/schedule"
              element={
                <RequireAuth>
                  <HospitalSchedule />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/prescriptions"
              element={
                <RequireAuth>
                  <HospitalPrescriptions />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/profile"
              element={
                <RequireAuth>
                  <HospitalProfile />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/insurances"
              element={
                <RequireAuth>
                  <HospitalInsurances />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/service-bookings"
              element={
                <RequireAuth>
                  <HospitalServiceBookings />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/referrals"
              element={
                <RequireAuth>
                  <HospitalReferrals />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/care-orders"
              element={
                <RequireAuth>
                  <HospitalCareOrders />
                </RequireAuth>
              }
            />
            <Route
              path="/hospital/settings"
              element={
                <RequireAuth>
                  <HospitalSettings />
                </RequireAuth>
              }
            />

            {/* ── Pharmacy: PROTECTED ─────────────────────────── */}
            <Route
              path="/pharmacy"
              element={
                <RequireAuth>
                  <PharmacyOverview />
                </RequireAuth>
              }
            />
              <Route
                path="/pharmacy/overview"
                element={
                  <RequireAuth>
                    <PharmacyOverview />
                  </RequireAuth>
                }
              />
            <Route
              path="/pharmacy/orders"
              element={
                <RequireAuth>
                  <PharmacyOrders />
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/inventory"
              element={
                <RequireAuth>
                  <PharmacyInventory />
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/prescriptions"
              element={
                <RequireAuth>
                  <PharmacyPrescriptions />
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/care-orders"
              element={
                <RequireAuth>
                  <PharmacyCareOrders />
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/profile"
              element={
                <RequireAuth>
                  <PharmacyProfile />
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/categories"
              element={
                <RequireAuth>
                  <PharmacyCategories />
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/deliveries"
              element={
                <RequireAuth>
                  <PharmacyDeliveries />
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/settings"
              element={
                <RequireAuth>
                  <PharmacySettings />
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/restock-requests"
              element={
                <RequireAuth>
                  <RestockRequests />
                </RequireAuth>
              }
            />

            {/* ── Admin: PROTECTED ────────────────────────────── */}
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminOverview />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/approvals"
              element={
                <RequireAuth>
                  <AdminApprovals />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAuth>
                  <AdminUsers />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <RequireAuth>
                  <AdminAnalytics />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/moderation"
              element={
                <RequireAuth>
                  <AdminModeration />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <RequireAuth>
                  <AdminProfile />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <RequireAuth>
                  <AdminSettings />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/reviews"
              element={
                <RequireAuth>
                  <AdminReviews />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/service-pricing"
              element={
                <RequireAuth>
                  <ManageServicePricing />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/refunds"
              element={
                <RequireAuth>
                  <AdminRefunds />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/manage-doctors"
              element={
                <RequireAuth>
                  <ManageDoctors />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/manage-patients"
              element={
                <RequireAuth>
                  <Navigate to="/admin/users?tab=patient" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/manage-facilities"
              element={
                <RequireAuth>
                  <ManageHospitals />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/manage-pharmacies"
              element={
                <RequireAuth>
                  <ManagePharmacies />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/manage-appointments"
              element={
                <RequireAuth>
                  <ManageAppointments />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/manage-insurances"
              element={
                <RequireAuth>
                  <ManageInsurances />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/manage-instant-doctors"
              element={
                <RequireAuth>
                  <ManageInstantDoctors />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/help-center-links"
              element={
                <RequireAuth>
                  <ManageHelpCenterLinks />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/certification-doctor"
              element={
                <RequireAuth>
                  <ManageCertificationDoctor />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/fitness-certificates"
              element={
                <RequireAuth>
                  <ManageFitnessCertificates />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/manage-specializations"
              element={
                <RequireAuth>
                  <ManageSpecialities />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/manage-checklist-questions"
              element={
                <RequireAuth>
                  <ChecklistQuestions />
                </RequireAuth>
              }
            />

            <Route
              path="/admin/manage-wallet"
              element={
                <RequireAuth>
                  <ManageAdminWallet />
                </RequireAuth>
              }
            />

            <Route
              path="/admin/our-team"
              element={
                <RequireAuth>
                  <AdminOurTeam />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/services"
              element={
                <RequireAuth>
                  <AdminServices />
                </RequireAuth>
              }
            />
            <Route path="/admin/system-settings" element={<AdminSystemSettings />} />
            <Route path="/admin/system-communication" element={<AdminSystemCommunication />} />
            {/* ── 404 ─────────────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </RequirePatientProfile>
        </ErrorBoundary>
        </CallProvider>
      </BrowserRouter>
    </TooltipProvider>
);

export default App;
