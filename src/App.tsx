import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
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
import { GlobalInstantPill } from "./components/GlobalInstantPill.tsx";
import { LogIn, X, ShieldAlert } from "lucide-react";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import ConsultationRoomPage from "./pages/ConsultationRoom.tsx";

/* ── Patient ── */
import PatientOverview from "./pages/patient/PatientOverview";
import PatientDoctors from "./pages/patient/PatientDoctors";
import PatientHospitals from "./pages/patient/PatientHospitals";
import PatientInstant from "./pages/patient/PatientInstant";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientPrescriptions from "./pages/patient/PatientPrescriptions";
import PatientMedicalRecords from "./pages/patient/PatientMedicalRecords.tsx";
import PatientPharmacy from "./pages/patient/PatientPharmacy";
import PatientProfile from "./pages/patient/PatientProfile.tsx";
import PatientFitnessCertificates from "./pages/patient/FitnessCertificates.tsx";
import MedicalInfo from "./pages/patient/MedicalInfo.tsx";
import PatientInsurence from "./pages/patient/PatientInsurence.tsx";
import ServiceBookings from "./pages/patient/ServiceBookings.tsx";
import MyReviews from "./pages/patient/MyReviews.tsx";
import PatientSettings from "./pages/patient/PatientSettings.tsx";
import Orders from "./pages/patient/Orders.tsx";

/* ── Doctor ── */
import DoctorOverview from "./pages/doctor/DoctorOverview";
import DoctorAvailability from "./pages/doctor/DoctorAvailability";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorPrescriptions from "./pages/doctor/DoctorPrescriptions";
import DoctorProfile from "./pages/doctor/DoctorProfile.tsx";
import DoctorFitnessCertificates from "./pages/doctor/FitnessCertificates.tsx";
import MyReferrals from "./pages/doctor/MyReferrals.tsx";
import DoctorSettings from "./pages/doctor/DoctorSettings.tsx";

/* ── Hospital ── */
import HospitalAnalytics from "./pages/hospital/HospitalAnalytics";
import HospitalAppointments from "./pages/hospital/HospitalAppointments";
import HospitalDoctors from "./pages/hospital/HospitalDoctors";
import HospitalDepartments from "./pages/hospital/HospitalDepartments";
import HospitalSchedule from "./pages/hospital/HospitalSchedule";
import HospitalPrescriptions from "./pages/hospital/HospitalPrescriptions";
import HospitalProfile from "./pages/hospital/HospitalProfile.tsx";
import HospitalInsurances from "./pages/hospital/HospitalInsurances.tsx";
import HospitalServiceBookings from "./pages/hospital/HospitalServiceBookings.tsx";
import HospitalSettings from "./pages/hospital/HospitalSettings.tsx";

/* ── Pharmacy ── */
import PharmacyOverview from "./pages/pharmacy/PharmacyOverview.tsx";
import PharmacyOrders from "./pages/pharmacy/PharmacyOrders";
import PharmacyInventory from "./pages/pharmacy/PharmacyInventory";
import PharmacyPrescriptions from "./pages/pharmacy/PharmacyPrescriptions";
import PharmacyProfile from "./pages/pharmacy/PmarmacyProfile.tsx";
import PharmacyCategories from "./pages/pharmacy/PharmacyCategories.tsx";
import PharmacyDeliveries from "./pages/pharmacy/PharmacyDeliveries.tsx";
import PharmacySettings from "./pages/pharmacy/PharmacySettings.tsx";
import RestockRequests from "./pages/pharmacy/RestockRequests.tsx";

/* ── Admin ── */
import AdminOverview from "./pages/admin/AdminOverview";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminModeration from "./pages/admin/AdminModeration";
import AdminProfile from "./pages/admin/AdminProfile.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminReviews from "./pages/admin/AdminReviews.tsx";
import ManageDoctors from "./pages/admin/ManageDoctors.tsx";
import ManagePatients from "./pages/admin/ManagePatients.tsx";
import ManagePharmacies from "./pages/admin/ManagePharmacies.tsx";
import ManageHospitals from "./pages/admin/ManageHospitals.tsx";
import ManageAppointments from "./pages/admin/ManageApointments.tsx";
import ManageInsurances from "./pages/admin/ManageInsurances.tsx";
import ManageServicePricing from "./pages/admin/ManageServicePricing.tsx";
import ManageInstantDoctors from "./pages/admin/ManageInstantDoctors.tsx";
import ManageSpecializations from "./pages/admin/ManageSpecializations.tsx";
import ChecklistQuestions from "./pages/admin/ChecklistQuestions.tsx";
import ManageAdminWallet from "./pages/admin/ManageAdminWallet.tsx";
import AdminOurTeam from "./pages/admin/AdminOurTeam.tsx";

/* ─────────────────────────────────────────────────────────────────
   RequireAuth
   Shows a confirmation dialog instead of hard-redirecting.
   User chooses: go to /auth (preserving return path) or go back.
───────────────────────────────────────────────────────────────── */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("auth_token");
  const [dismissed, setDismissed] = useState(false);

  // Authenticated — render normally
  if (isAuthenticated) return <>{children}</>;

  // User chose "Go back" — navigate away, render nothing
  if (dismissed) return null;

  const handleSignIn = () => {
    navigate("/auth", { state: { from: location }, replace: true });
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
        <div className="w-full sm:w-[420px] bg-card border border-border/60 rounded-t-[16px] sm:rounded-[12px] shadow-2xl shadow-black/30 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[8px] bg-primary/10">
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[13px] font-bold text-foreground">
                Sign in required
              </p>
            </div>
            <button
              onClick={handleGoBack}
              className="p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              This page requires an account. Sign in or create a free account to
              continue — or go back and keep browsing without signing in.
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSignIn}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </button>
            <button
              onClick={handleGoBack}
              className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-[8px] border border-border/60 text-muted-foreground text-[12px] font-semibold hover:bg-secondary/70 hover:text-foreground transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Query client
───────────────────────────────────────────────────────────────── */
const queryClient = new QueryClient();

/* ─────────────────────────────────────────────────────────────────
   App
───────────────────────────────────────────────────────────────── */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <CallProvider>
          <Toaster />
          <Sonner />
          <GlobalCallOverlay />
          <AppointmentCompletionGate />
          <GlobalInstantPill />
          <Routes>
            {/* ── Public ──────────────────────────────────────── */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding/:role" element={<Onboarding />} />
            <Route
              path="/consultation/:roomName"
              element={<ConsultationRoomPage />}
            />

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
              path="/doctor/prescriptions"
              element={
                <RequireAuth>
                  <DoctorPrescriptions />
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
              path="/hospital/settings"
              element={
                <RequireAuth>
                  <HospitalSettings />
                </RequireAuth>
              }
            />

            {/* ── Pharmacy: PROTECTED ─────────────────────────── */}
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
                  <ManagePatients />
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
              path="/admin/manage-specializations"
              element={
                <RequireAuth>
                  <ManageSpecializations />
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

            {/* ── 404 ─────────────────────────────────────────── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CallProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
