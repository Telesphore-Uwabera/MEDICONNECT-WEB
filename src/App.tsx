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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding/:role" element={<Onboarding />} />

          <Route path="/patient" element={<PatientOverview />} />
          <Route path="/patient/search-doctors" element={<PatientDoctors />} />
          <Route path="/patient/search-hospitals" element={<PatientHospitals />} />
          <Route path="/patient/instant" element={<PatientInstant />} />
          <Route path="/patient/appointments" element={<PatientAppointments />} />
          <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
          <Route path="/patient/fitness-certificates" element={<PatientFitnessCertificates />} />
          <Route path="/patient/pharmacy" element={<PatientPharmacy />} />
          <Route path="/patient/profile" element={<PatientProfile />} />

          <Route path="/doctor" element={<DoctorOverview />} />
          <Route path="/doctor/availability" element={<DoctorAvailability />} />
          <Route path="/doctor/appointments" element={<DoctorAppointments />} />
          <Route path="/doctor/patients" element={<DoctorPatients />} />
          <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
          <Route path="/doctor/fitness-certificates" element={<DoctorFitnessCertificates />} />
          <Route path="/doctor/profile" element={<DoctorProfile/>} />

          <Route path="/hospital" element={<HospitalAnalytics />} />
          <Route path="/hospital/appointments" element={<HospitalAppointments />} />
          <Route path="/hospital/doctors" element={<HospitalDoctors />} />
          <Route path="/hospital/departments" element={<HospitalDepartments />} />
          <Route path="/hospital/schedule" element={<HospitalSchedule />} />
          <Route path="/hospital/prescriptions" element={<HospitalPrescriptions />} />
          <Route path="/hospital/profile" element={<HospitalProfile />} />

          <Route path="/pharmacy/orders" element={<PharmacyOrders />} />
          <Route path="/pharmacy/inventory" element={<PharmacyInventory />} />
          <Route path="/pharmacy/prescriptions" element={<PharmacyPrescriptions />} />
          <Route path="/pharmacy/profile" element={<PharmacyProfile/>} />

          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/moderation" element={<AdminModeration />} />
          <Route path="/admin/profile" element={<AdminProfile />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
