import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";

import PatientOverview from "./pages/patient/PatientOverview";
import PatientDoctors from "./pages/patient/PatientDoctors";
import PatientHospitals from "./pages/patient/PatientHospitals";
import PatientInstant from "./pages/patient/PatientInstant";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientPrescriptions from "./pages/patient/PatientPrescriptions";
import PatientPharmacy from "./pages/patient/PatientPharmacy";

import DoctorOverview from "./pages/doctor/DoctorOverview";
import DoctorAvailability from "./pages/doctor/DoctorAvailability";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorPrescriptions from "./pages/doctor/DoctorPrescriptions";

import HospitalAnalytics from "./pages/hospital/HospitalAnalytics";
import HospitalAppointments from "./pages/hospital/HospitalAppointments";
import HospitalDoctors from "./pages/hospital/HospitalDoctors";
import HospitalDepartments from "./pages/hospital/HospitalDepartments";
import HospitalSchedule from "./pages/hospital/HospitalSchedule";
import HospitalPrescriptions from "./pages/hospital/HospitalPrescriptions";

import PharmacyOrders from "./pages/pharmacy/PharmacyOrders";
import PharmacyInventory from "./pages/pharmacy/PharmacyInventory";
import PharmacyPrescriptions from "./pages/pharmacy/PharmacyPrescriptions";

import AdminOverview from "./pages/admin/AdminOverview";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminModeration from "./pages/admin/AdminModeration";
import PharmacyProfile from "./pages/pharmacy/PmarmacyProfile.tsx";
import HospitalProfile from "./pages/hospital/HospitalProfile.tsx";
import PatientProfile from "./pages/patient/PatientProfile.tsx";
import AdminProfile from "./pages/admin/AdminProfile.tsx";
import DoctorProfile from "./pages/doctor/DoctorProfile.tsx";
import DoctorFitnessCertificates from "./pages/doctor/FitnessCertificates.tsx";
import HospitalFitnessCertificates from "./pages/patient/FitnessCertificates.tsx";
import PatientFitnessCertificates from "./pages/patient/FitnessCertificates.tsx";
import MedicalInfo from "./pages/patient/MedicalInfo.tsx";
import PatientInsurence from "./pages/patient/PatientInsurence.tsx";
import ServiceBookings from "./pages/patient/ServiceBookings.tsx";
import MyReviews from "./pages/patient/MyReviews.tsx";
import Settings from "./pages/doctor/Settings.tsx";
import Gallery from "./pages/hospital/HospitalInsurances.tsx";
import HospitalInsurances from "./pages/hospital/HospitalInsurances.tsx";
import HospitalServiceBookings from "./pages/hospital/HospitalServiceBookings.tsx";
import HospitalSettings from "./pages/hospital/HospitalSettings.tsx";
import PharmacyOverview from "./pages/pharmacy/PharmacyOverview.tsx";
import PharmacyDashboard from "./pages/pharmacy/PharmacyOverview.tsx";
import PharmacyCategories from "./pages/pharmacy/PharmacyCategories.tsx";
import PharmacyDeliveries from "./pages/pharmacy/PharmacyDeliveries.tsx";
import PharmacySettings from "./pages/pharmacy/PharmacySettings.tsx";
import RestockRequests from "./pages/pharmacy/RestockRequests.tsx";
import ManageDoctors from "./pages/admin/ManageDoctors.tsx";
import ManagePatients from "./pages/admin/ManagePatients.tsx";
import ManagePharmacies from "./pages/admin/ManagePharmacies.tsx";
import ManageHospitals from "./pages/admin/ManageHospitals.tsx";
import ManageApointments from "./pages/admin/ManageApointments.tsx";
import ManageReviews from "./pages/admin/ManageReviews.tsx";
import ManageInsurances from "./pages/admin/ManageInsurances.tsx";
import ManageAppointments from "./pages/admin/ManageApointments.tsx";
import MyReferrals from "./pages/doctor/MyReferrals.tsx";
import ManageServicePricing from "./pages/admin/ManageServicePricing.tsx";
import ManageInstantDoctors from "./pages/admin/ManageInstantDoctors.tsx";
import ManageSpecializations from "./pages/admin/ManageSpecializations.tsx";
import ChecklistQuestions from "./pages/admin/ChecklistQuestions.tsx";
import ConsultationRoomPage from "./pages/ConsultationRoom.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import ManageAdminWallet from "./pages/admin/ManageAdminWallet.tsx";
import { CallProvider } from "./context/CallContext.tsx";
import { GlobalCallOverlay } from "./components/consultatioRoom/GlobalCallOverlay.tsx";
import PatientSettings from "./pages/patient/PatientSettings.tsx";
import DoctorSettings from "./pages/doctor/DoctorSettings.tsx";
import { AppointmentCompletionGate } from "./components/consultatioRoom/AppointmentCompletionGate.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <CallProvider>
          <Toaster />
          <Sonner />
          <GlobalCallOverlay />
          <AppointmentCompletionGate />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/consultation/:roomName"
              element={<ConsultationRoomPage />}
            />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding/:role" element={<Onboarding />} />

            <Route path="/patient" element={<PatientOverview />} />
            <Route
              path="/patient/search-doctors"
              element={<PatientDoctors />}
            />
            <Route
              path="/patient/search-facilities"
              element={<PatientHospitals />}
            />
            <Route path="/patient/instant" element={<PatientInstant />} />
            <Route
              path="/patient/appointments"
              element={<PatientAppointments />}
            />
            <Route
              path="/patient/prescriptions"
              element={<PatientPrescriptions />}
            />
            <Route
              path="/patient/fitness-certificates"
              element={<PatientFitnessCertificates />}
            />
            <Route
              path="/patient/search-pharmacy"
              element={<PatientPharmacy />}
            />
            <Route path="/patient/profile" element={<PatientProfile />} />
            <Route path="/patient/medical-info" element={<MedicalInfo />} />
            <Route path="/patient/insurance" element={<PatientInsurence />} />
            <Route
              path="/patient/service-bookings"
              element={<ServiceBookings />}
            />
            <Route path="/patient/my-reviews" element={<MyReviews />} />
            <Route path="/patient" element={<PatientOverview />} />
            <Route
              path="/patient/search-doctors"
              element={<PatientDoctors />}
            />
            <Route
              path="/patient/search-facilities"
              element={<PatientHospitals />}
            />
            <Route path="/patient/instant" element={<PatientInstant />} />
            <Route
              path="/patient/appointments"
              element={<PatientAppointments />}
            />
            <Route
              path="/patient/prescriptions"
              element={<PatientPrescriptions />}
            />
            <Route
              path="/patient/fitness-certificates"
              element={<PatientFitnessCertificates />}
            />
            <Route
              path="/patient/search-pharmacy"
              element={<PatientPharmacy />}
            />
            <Route path="/patient/profile" element={<PatientProfile />} />
            <Route path="/patient/medical-info" element={<MedicalInfo />} />
            <Route path="/patient/settings" element={<PatientSettings />} />
            <Route path="/patient/insurance" element={<PatientInsurence />} />
            <Route
              path="/patient/service-bookings"
              element={<ServiceBookings />}
            />
            <Route path="/patient/my-reviews" element={<MyReviews />} />
            <Route path="/patient" element={<PatientOverview />} />
            <Route path="/patient/search-doctors" element={<PatientDoctors />} />
            <Route path="/patient/search-hospitals" element={<PatientHospitals />} />
            <Route path="/patient/instant" element={<PatientInstant />} />
            <Route path="/patient/appointments" element={<PatientAppointments />} />
            <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
            <Route path="/patient/fitness-certificates" element={<PatientFitnessCertificates />} />
            <Route path="/patient/search-pharmacy" element={<PatientPharmacy />} />
            <Route path="/patient/profile" element={<PatientProfile />} />
            <Route path="/patient/medical-info" element={<MedicalInfo />} />
            <Route path="/patient/insurance" element={<PatientInsurence />} />
            <Route path="/patient/service-bookings" element={<ServiceBookings />} />
            <Route path="/patient/my-reviews" element={<MyReviews />} />

            <Route path="/doctor" element={<DoctorOverview />} />
            <Route
              path="/doctor/availability"
              element={<DoctorAvailability />}
            />
            <Route
              path="/doctor/appointments"
              element={<DoctorAppointments />}
            />
            <Route path="/doctor/patients" element={<DoctorPatients />} />
            <Route
              path="/doctor/prescriptions"
              element={<DoctorPrescriptions />}
            />
            <Route
              path="/doctor/fitness-certificates"
              element={<DoctorFitnessCertificates />}
            />
            <Route path="/doctor/profile" element={<DoctorProfile />} />
            <Route path="/doctor/referrals" element={<MyReferrals />} />

            {/* Settings */}
            <Route path="/doctor" element={<DoctorOverview />} />
            <Route
              path="/doctor/availability"
              element={<DoctorAvailability />}
            />
            <Route
              path="/doctor/appointments"
              element={<DoctorAppointments />}
            />
            <Route path="/doctor/patients" element={<DoctorPatients />} />
            <Route
              path="/doctor/prescriptions"
              element={<DoctorPrescriptions />}
            />
            <Route
              path="/doctor/fitness-certificates"
              element={<DoctorFitnessCertificates />}
            />
            <Route path="/doctor/profile" element={<DoctorProfile />} />
            <Route path="/doctor/referrals" element={<MyReferrals />} />

            {/* Settings */}
            <Route path="/doctor/settings" element={<Settings />} />
            <Route path="/doctor" element={<DoctorOverview />} />
            <Route path="/doctor/availability" element={<DoctorAvailability />} />
            <Route path="/doctor/appointments" element={<DoctorAppointments />} />
            <Route path="/doctor/patients" element={<DoctorPatients />} />
            <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
            <Route path="/doctor/fitness-certificates" element={<DoctorFitnessCertificates />} />
            <Route path="/doctor/profile" element={<DoctorProfile />} />
            <Route path="/doctor/referrals" element={<MyReferrals />} />

            {/* Settings */}
            <Route path="/doctor/settings" element={<DoctorSettings />} />

            <Route path="/hospital" element={<HospitalAnalytics />} />
            <Route
              path="/hospital/appointments"
              element={<HospitalAppointments />}
            />
            <Route path="/hospital/doctors" element={<HospitalDoctors />} />
            <Route
              path="/hospital/departments"
              element={<HospitalDepartments />}
            />
            <Route path="/hospital/schedule" element={<HospitalSchedule />} />
            <Route
              path="/hospital/prescriptions"
              element={<HospitalPrescriptions />}
            />
            <Route path="/hospital/profile" element={<HospitalProfile />} />
            <Route
              path="/hospital/insurances"
              element={<HospitalInsurances />}
            />
            {/* ServiceBookings */}
            <Route
              path="/hospital/service-bookings"
              element={<HospitalServiceBookings />}
            />
            {/* HospitalSettings */}
            <Route path="/hospital/settings" element={<HospitalSettings />} />
            <Route path="/hospital" element={<HospitalAnalytics />} />
            <Route
              path="/hospital/appointments"
              element={<HospitalAppointments />}
            />
            <Route path="/hospital/doctors" element={<HospitalDoctors />} />
            <Route
              path="/hospital/departments"
              element={<HospitalDepartments />}
            />
            <Route path="/hospital/schedule" element={<HospitalSchedule />} />
            <Route
              path="/hospital/prescriptions"
              element={<HospitalPrescriptions />}
            />
            <Route path="/hospital/profile" element={<HospitalProfile />} />
            <Route
              path="/hospital/insurances"
              element={<HospitalInsurances />}
            />
            {/* ServiceBookings */}
            <Route
              path="/hospital/service-bookings"
              element={<HospitalServiceBookings />}
            />
            {/* HospitalSettings */}
            <Route path="/hospital/settings" element={<HospitalSettings />} />
            <Route path="/hospital" element={<HospitalAnalytics />} />
            <Route path="/hospital/appointments" element={<HospitalAppointments />} />
            <Route path="/hospital/doctors" element={<HospitalDoctors />} />
            <Route path="/hospital/departments" element={<HospitalDepartments />} />
            <Route path="/hospital/schedule" element={<HospitalSchedule />} />
            <Route path="/hospital/prescriptions" element={<HospitalPrescriptions />} />
            <Route path="/hospital/profile" element={<HospitalProfile />} />
            <Route path="/hospital/insurances" element={<HospitalInsurances />} />
            {/* ServiceBookings */}
            <Route path="/hospital/service-bookings" element={<HospitalServiceBookings />} />
            {/* HospitalSettings */}
            <Route path="/hospital/settings" element={<HospitalSettings />} />

            <Route path="/pharmacy/orders" element={<PharmacyOrders />} />
            <Route path="/pharmacy/inventory" element={<PharmacyInventory />} />
            <Route
              path="/pharmacy/prescriptions"
              element={<PharmacyPrescriptions />}
            />
            <Route path="/pharmacy/profile" element={<PharmacyProfile />} />
            <Route path="/pharmacy/overview" element={<PharmacyDashboard />} />
            {/* PharmacyCategories */}
            <Route
              path="/pharmacy/categories"
              element={<PharmacyCategories />}
            />
            {/* PharmacyDeliveries */}
            <Route
              path="/pharmacy/deliveries"
              element={<PharmacyDeliveries />}
            />
            {/* PharmacySettings */}
            <Route path="/pharmacy/settings" element={<PharmacySettings />} />
            {/* RestockRequests */}
            <Route
              path="/pharmacy/restock-requests"
              element={<RestockRequests />}
            />
            <Route path="/pharmacy/orders" element={<PharmacyOrders />} />
            <Route path="/pharmacy/inventory" element={<PharmacyInventory />} />
            <Route
              path="/pharmacy/prescriptions"
              element={<PharmacyPrescriptions />}
            />
            <Route path="/pharmacy/profile" element={<PharmacyProfile />} />
            <Route path="/pharmacy/overview" element={<PharmacyDashboard />} />
            {/* PharmacyCategories */}
            <Route
              path="/pharmacy/categories"
              element={<PharmacyCategories />}
            />
            {/* PharmacyDeliveries */}
            <Route
              path="/pharmacy/deliveries"
              element={<PharmacyDeliveries />}
            />
            {/* PharmacySettings */}
            <Route path="/pharmacy/settings" element={<PharmacySettings />} />
            {/* RestockRequests */}
            <Route
              path="/pharmacy/restock-requests"
              element={<RestockRequests />}
            />
            <Route path="/pharmacy/orders" element={<PharmacyOrders />} />
            <Route path="/pharmacy/inventory" element={<PharmacyInventory />} />
            <Route path="/pharmacy/prescriptions" element={<PharmacyPrescriptions />} />
            <Route path="/pharmacy/profile" element={<PharmacyProfile />} />
            <Route path="/pharmacy/overview" element={<PharmacyDashboard />} />
            {/* PharmacyCategories */}
            <Route path="/pharmacy/categories" element={<PharmacyCategories />} />
            {/* PharmacyDeliveries */}
            <Route path="/pharmacy/deliveries" element={<PharmacyDeliveries />} />
            {/* PharmacySettings */}
            <Route path="/pharmacy/settings" element={<PharmacySettings />} />
            {/* RestockRequests */}
            <Route path="/pharmacy/restock-requests" element={<RestockRequests />} />

            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/moderation" element={<AdminModeration />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route
              path="/admin/service-pricing"
              element={<ManageServicePricing />}
            />
            <Route path="/admin/manage-doctors" element={<ManageDoctors />} />
            <Route path="/admin/manage-patients" element={<ManagePatients />} />
            <Route path="/admin/manage-hospitals" element={<ManageHospitals />} />
            <Route
              path="/admin/manage-pharmacies"
              element={<ManagePharmacies />}
            />
            <Route
              path="/admin/manage-appointments"
              element={<ManageAppointments />}
            />
            <Route
              path="/admin/manage-insurances"
              element={<ManageInsurances />}
            />
            <Route
              path="/admin/manage-instant-doctors"
              element={<ManageInstantDoctors />}
            />
            <Route
              path="/admin/manage-specializations"
              element={<ManageSpecializations />}
            />
            <Route
              path="/admin/manage-checklist-questions"
              element={<ChecklistQuestions />}
            />
            {/* AdminSettings */}
            <Route path="/settings" element={<AdminSettings />} />
            {/* ManageAdminWallet */}
            <Route path="/admin/manage-wallet" element={<ManageAdminWallet />} />
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/moderation" element={<AdminModeration />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route
              path="/admin/service-pricing"
              element={<ManageServicePricing />}
            />
            <Route path="/admin/manage-doctors" element={<ManageDoctors />} />
            <Route path="/admin/manage-patients" element={<ManagePatients />} />
            <Route
              path="/admin/manage-facilities"
              element={<ManageHospitals />}
            />
            <Route
              path="/admin/manage-pharmacies"
              element={<ManagePharmacies />}
            />
            <Route
              path="/admin/manage-appointments"
              element={<ManageAppointments />}
            />
            <Route
              path="/admin/manage-insurances"
              element={<ManageInsurances />}
            />
            <Route
              path="/admin/manage-instant-doctors"
              element={<ManageInstantDoctors />}
            />
            <Route
              path="/admin/manage-specializations"
              element={<ManageSpecializations />}
            />
            <Route
              path="/admin/manage-checklist-questions"
              element={<ChecklistQuestions />}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </CallProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
