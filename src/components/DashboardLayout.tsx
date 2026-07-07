import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Stethoscope,
  Pill,
  Home,
  Users,
  FileText,
  Package,
  ClipboardList,
  UserCog,
  LucideIcon,
  CheckCircle,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  Building2,
  GraduationCap,
  Award,
  Link2,
  Clock,
  Image,
  HeartPulse,
  Tag,
  Settings,
  Send,
  ShoppingCart,
  Truck,
  AlertTriangle,
  FlaskConical,
  HelpCircle,
  Star,
  Briefcase,
  User,
  Building,
  Wrench,
  History,
  Search,
  Zap,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRightLeft,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";
import { useTheme } from "@/context/ThemeContext";
import { useState, useCallback } from "react";
import { InstantPaidAlertListener } from "@/components/doctor/InstantPaidAlertListener";
import { PatientCallAlertListener } from "@/components/patient/PatientCallAlertListener";
import { RoleSwitcher } from "@/components/RoleSwitcher";

export type Role = "patient" | "doctor" | "hospital" | "pharmacy" | "admin";

type NavItem = { to: string; label: string; icon: LucideIcon; badge?: number };
type NavGroup = { heading?: string; items: NavItem[] };

const buildNav = (t: (k: string) => string): Record<Role, NavGroup[]> => ({
  admin: [
    { items: [{ to: "/admin", label: t("sidebar.dashboard"), icon: Home }] },
    {
      heading: t("sidebar.group.people"),
      items: [
        { to: "/admin/users", label: t("sidebar.users"), icon: Users },
      ],
    },
    {
      heading: t("sidebar.group.facilities"),
      items: [
        {
          to: "/admin/manage-facilities",
          label: t("sidebar.facilities"),
          icon: Building2,
        },
        {
          to: "/admin/manage-pharmacies",
          label: t("sidebar.pharmacies"),
          icon: Pill,
        },
      ],
    },
    {
      heading: t("sidebar.group.medical"),
      items: [
        {
          to: "/admin/manage-appointments",
          label: t("sidebar.appointments"),
          icon: Calendar,
        },
        {
          to: "/admin/manage-specializations",
          label: t("sidebar.specializations"),
          icon: FlaskConical,
        },
        {
          to: "/admin/manage-checklist-questions",
          label: t("sidebar.checklistQuestions"),
          icon: HelpCircle,
        },
        {
          to: "/admin/manage-insurances",
          label: t("sidebar.insurances"),
          icon: Shield,
        },
        // {
        //   to: "/admin/manage-instant-doctors",
        //   label: t("sidebar.instantDoctors"),
        //   icon: Star,
        // },
        // wallet
        { to: "/admin/manage-wallet", label: t("sidebar.wallet"), icon: Star },
      ],
    },
    {
      heading: t("sidebar.group.finance"),
      items: [
        {
          to: "/admin/service-pricing",
          label: t("sidebar.servicePricing"),
          icon: Tag,
        },
      ],
    },
    {
      heading: t("sidebar.group.system"),
      items: [
        { to: "/admin/settings", label: t("sidebar.settings"), icon: User },
        { to: "/admin/reviews", label: t("sidebar.reviews"), icon: History },
        { to: "/admin/our-team", label: t("sidebar.team"), icon: Wrench },
        { to: "/admin/system-settings", label: t("sidebar.system_settings"), icon: Settings},
        { to: "/admin/system-communication", label: t("sidebar.system_communication"), icon: Bell},
      ],
    },
    {
      heading: t("sidebar.group.account"),
      items: [
        { to: "/admin/profile", label: t("sidebar.myProfile"), icon: UserCog },
      ],
    },
  ],

  doctor: [
    { items: [{ to: "/doctor", label: t("sidebar.dashboard"), icon: Home }] },
    {
      heading: t("sidebar.group.myProfile"),
      items: [
        { to: "/doctor/profile", label: t("sidebar.profile"), icon: User },
      ],
    },
    {
      heading: t("sidebar.group.schedule"),
      items: [
        {
          to: "/doctor/availability",
          label: t("sidebar.availability"),
          icon: Clock,
        },
        {
          to: "/doctor/appointments",
          label: t("sidebar.appointments"),
          icon: ClipboardList,
        },
      ],
    },
    {
      heading: t("sidebar.group.clinical"),
      items: [
        {
          to: "/doctor/prescriptions",
          label: t("sidebar.prescriptions"),
          icon: FileText,
        },
        {
          to: "/doctor/consultation-summaries",
          label: t("sidebar.consultationSummaries"),
          icon: Stethoscope,
        },
        {
          to: "/doctor/fitness-certificates",
          label: t("sidebar.fitnessCertificates"),
          icon: CheckCircle,
        },
        { to: "/doctor/referrals", label: t("sidebar.referrals"), icon: Send },
      ],
    },
    {
      heading: t("sidebar.group.account"),
      items: [
        { to: "/doctor/settings", label: t("sidebar.settings"), icon: Settings },
      ],
    },
  ],

  hospital: [
    { items: [{ to: "/hospital", label: t("sidebar.dashboard"), icon: Home }] },
    {
      heading: t("sidebar.group.ourFacility"),
      items: [
        {
          to: "/hospital/profile",
          label: t("sidebar.profile"),
          icon: Building2,
        },
        { to: "/hospital/schedule", label: t("sidebar.schedule"), icon: Clock },
        // { to: "/hospital/gallery", label: t("sidebar.gallery"), icon: Image },
        // { to: "/hospital/social-links", label: t("sidebar.socialLinks"), icon: Link2 },
      ],
    },
    {
      heading: t("sidebar.group.operations"),
      items: [
        {
          to: "/hospital/departments",
          label: t("sidebar.departments"),
          icon: Building,
        },
        {
          to: "/hospital/appointments",
          label: t("sidebar.appointments"),
          icon: HeartPulse,
        },
        // { to: "/hospital/doctors", label: t("sidebar.doctors"), icon: Stethoscope },
        {
          to: "/hospital/insurances",
          label: t("sidebar.insurances"),
          icon: Shield,
        },
      ],
    },
    {
      heading: t("sidebar.group.activity"),
      items: [
        // { to: "/hospital/service-bookings", label: t("sidebar.serviceBookings"), icon: Calendar },
        {
          to: "/hospital/prescriptions",
          label: t("sidebar.prescriptions"),
          icon: Send,
        },
      ],
    },
    {
      heading: t("sidebar.group.account"),
      items: [
        {
          to: "/hospital/settings",
          label: t("sidebar.settings"),
          icon: Settings,
        },
      ],
    },
  ],

  patient: [
    { items: [{ to: "/patient", label: t("sidebar.dashboard"), icon: Home }] },
    {
      heading: t("sidebar.group.myHealth"),
      items: [
        { to: "/patient/profile", label: t("sidebar.profile"), icon: User },
        // { to: "/patient/medical-info", label: t("sidebar.medicalInfo"), icon: HeartPulse },
        // { to: "/patient/insurance", label: t("sidebar.insurance"), icon: Shield },
      ],
    },
    {
      heading: t("sidebar.group.findCare"),
      items: [
        {
          to: "/patient/search-doctors",
          label: t("sidebar.searchDoctors"),
          icon: Search,
        },
        {
          to: "/patient/search-facilities",
          label: t("sidebar.searchHospitals"),
          icon: Building2,
        },
        {
          to: "/patient/search-pharmacy",
          label: t("sidebar.searchPharmacies"),
          icon: Pill,
        },
        {
          to: "/patient/fitness-certificates",
          label: t("sidebar.fitnessCertificates"),
          icon: CheckCircle,
        },
      ],
    },
    {
      heading: t("sidebar.group.appointments"),
      items: [
        // { to: "/patient/quick-appointment", label: t("sidebar.quickAppointment"), icon: Zap },
        {
          to: "/patient/appointments",
          label: t("sidebar.myAppointments"),
          icon: Calendar,
        }
      ],
    },
    {
      heading: t("sidebar.group.records"),
      items: [
        {
          to: "/patient/medical-records",
          label: t("sidebar.medicalRecords"),
          icon: FileText,
        },
        {
          to: "/patient/prescriptions",
          label: t("sidebar.prescriptions"),
          icon: FileText,
        },
        // PatientPharmacyOrders
        {
          to: "/patient/pharmacy/orders",
          label: t("sidebar.orders"),
          icon: FileText,
        },
        {
          to: "/patient/my-reviews",
          label: t("sidebar.myReviews"),
          icon: Star,
        },
      ],
    },
    {
      heading: t("sidebar.group.account"),
      items: [
        { to: "/patient/settings", label: t("sidebar.settings"), icon: Settings },
      ],
    },
  ],

  pharmacy: [
    {
      items: [
        { to: "/pharmacy/overview", label: t("sidebar.dashboard"), icon: Home },
      ],
    },
    {
      heading: t("sidebar.group.ourStore"),
      items: [
        {
          to: "/pharmacy/profile",
          label: t("sidebar.profile"),
          icon: Building2,
        },
        // { to: "/pharmacy/working-hours", label: t("sidebar.workingHours"), icon: Clock },
        // { to: "/pharmacy/social-links", label: t("sidebar.socialLinks"), icon: Link2 },
      ],
    },
    {
      heading: t("sidebar.group.inventory"),
      items: [
        {
          to: "/pharmacy/inventory",
          label: t("sidebar.medicines"),
          icon: Pill,
        },
        {
          to: "/pharmacy/categories",
          label: t("sidebar.categories"),
          icon: Tag,
        },
        // { to: "/pharmacy/orders", label: t("sidebar.orders"), icon: AlertTriangle },
        {
          to: "/pharmacy/restock-requests",
          label: t("sidebar.restockRequests"),
          icon: Package,
        },
      ],
    },
    {
      heading: t("sidebar.group.prescriptions"),
      items: [
        {
          to: "/pharmacy/prescriptions",
          label: t("sidebar.prescriptions"),
          icon: Image,
        },
        // { to: "/pharmacy/dispensed", label: t("sidebar.dispensed"), icon: CheckCircle },
      ],
    },
    {
      heading: t("sidebar.group.orders"),
      items: [
        {
          to: "/pharmacy/orders",
          label: t("sidebar.orders"),
          icon: ShoppingCart,
        },
        // { to: "/pharmacy/deliveries", label: t("sidebar.deliveries"), icon: Truck },
      ],
    },
    {
      heading: t("sidebar.group.account"),
      items: [
        { to: "/pharmacy/settings", label: t("sidebar.settings"), icon: Settings },
      ],
    },
  ],
});

const roleConfig: Record<Role, { labelKey: string; initials: string }> = {
  patient: { labelKey: "sidebar.patientPortal", initials: "PT" },
  doctor: { labelKey: "sidebar.doctorWorkspace", initials: "DR" },
  hospital: { labelKey: "sidebar.hospitalAdmin", initials: "HP" },
  pharmacy: { labelKey: "sidebar.pharmacyConsole", initials: "PH" },
  admin: { labelKey: "sidebar.adminConsole", initials: "AD" },
};

interface Props {
  role: Role;
  children: React.ReactNode;
}

export const DashboardLayout = ({ role, children }: Props) => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { resolvedTheme, theme } = useTheme();
  const logo = (resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<number, boolean>
  >({});

  const groups = buildNav(t)[role];
  const cfg = roleConfig[role];

  const toggleGroup = useCallback((gi: number) => {
    setCollapsedGroups((prev) => ({ ...prev, [gi]: !prev[gi] }));
  }, []);

  const isActive = (to: string) => {
    if (to === `/${role}`) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-4 border-b border-sidebar-border flex items-center justify-between gap-2 flex-shrink-0">
        <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
          <img
            src={logo}
            alt="MEDICONNECT"
            className="h-12 w-[80%] flex-shrink-0 rounded-[6px]"
          />
        </NavLink>

      </div>

  

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-0.5 scrollbar-thin">
        {groups.map((group, gi) => {
          const hasHeading = !!group.heading;
          const isCollapsed = collapsedGroups[gi];

          return (
            <div key={gi} className={cn(hasHeading && "mt-4 first:mt-0")}>
              {hasHeading && (
                <button
                  onClick={() => toggleGroup(gi)}
                  className="w-full flex items-center justify-between px-3 py-2 mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors select-none"
                >
                  <span>{group.heading}</span>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      !isCollapsed && "rotate-90",
                    )}
                  />
                </button>
              )}

              <AnimatePresence initial={false}>
                {(!hasHeading || !isCollapsed) && (
                  <motion.ul
                    initial={hasHeading ? { height: 0, opacity: 0 } : false}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="space-y-0.5 overflow-hidden"
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.to);
                      return (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            end={item.to === `/${role}`}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "group relative flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-all duration-150",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/70",
                            )}
                          >
                            {/* Active left bar */}
                            {active && (
                              <motion.div
                                layoutId="activeBar"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary"
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 35,
                                }}
                              />
                            )}

                            {/* Icon */}
                            <span
                              className={cn(
                                "flex items-center justify-center w-7 h-7 rounded flex-shrink-0 transition-all duration-150",
                                active
                                  ? "bg-primary/15 text-primary"
                                  : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
                              )}
                            >
                              <Icon
                                className="h-4 w-4"
                                strokeWidth={active ? 2.5 : 2}
                              />
                            </span>

                            {/* Label */}
                            <span className="truncate flex-1">
                              {item.label}
                            </span>

                            {/* Badge */}
                            {item.badge && (
                              <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* ── Role Switcher ── */}
      <div className="px-3 py-3 border-t border-sidebar-border flex-shrink-0">
        <ActiveRoleBadge role={role} t={t} onClick={() => setRoleSwitcherOpen(true)} />
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background flex">
      {/* Role switcher (add + switch active role) */}
      <RoleSwitcher open={roleSwitcherOpen} onClose={() => setRoleSwitcherOpen(false)} />

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 0 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className="border-r border-sidebar-border bg-sidebar hidden lg:flex flex-col sticky top-0 h-dvh shrink-0 overflow-hidden"
      >
        <div className="w-[240px] h-full">
          <SidebarContent />
        </div>
      </motion.aside>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[240px] bg-sidebar border-r border-sidebar-border flex flex-col lg:hidden transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          className="absolute top-4 right-3 p-1.5 rounded-[6px] text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? t("sidebar.hideSidebar") : t("sidebar.showSidebar")}
          title={sidebarOpen ? t("sidebar.hideSidebar") : t("sidebar.showSidebar")}
          className={cn(
            "hidden lg:flex fixed top-0 left-0 z-[99] h-16 w-16 items-center justify-center rounded-full hover:bg-sidebar-accent text-primary",
            sidebarOpen ? "left-[202px]" : "left-0",
          )}
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>

        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
          <button
            className="p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <NavLink to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="MEDICONNECT"
              className="h-12 w-auto rounded-[6px]"
            />

          </NavLink>
        </div>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex-1 min-w-0"
        >
          {children}
        </motion.main>
        {role === "doctor" && <InstantPaidAlertListener />}
        {role === "patient" && <PatientCallAlertListener />}
      </div>
    </div>
  );
};

/* ── Active Role Badge ── */
const ActiveRoleBadge = ({
  role,
  t,
  onClick,
}: {
  role: Role;
  t: (k: string) => string;
  onClick?: () => void;
}) => {
  const roleMap: Record<Role, { label: string; icon: LucideIcon }> = {
    patient: { label: t("sidebar.patient"), icon: User },
    doctor: { label: t("sidebar.doctor"), icon: Stethoscope },
    hospital: { label: t("sidebar.hospital"), icon: Building2 },
    pharmacy: { label: t("sidebar.pharmacy"), icon: Pill },
    admin: { label: t("sidebar.admin"), icon: ShieldCheck },
  };

  const { label, icon: Icon } = roleMap[role];

  return (
    <button
      type="button"
      onClick={onClick}
      title={t("sidebar.switchRole")}
      className="group w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[6px] bg-primary/10 border border-primary/15 hover:bg-primary/15 hover:border-primary/30 transition-colors"
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-[6px] bg-primary/20 text-primary flex-shrink-0">
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40 leading-none mb-1">
          {t("sidebar.activeRole")}
        </span>
        <span className="text-sm font-semibold text-primary truncate leading-none">
          {label}
        </span>
      </div>
      <ArrowRightLeft className="h-3.5 w-3.5 text-primary/50 group-hover:text-primary shrink-0" />
    </button>
  );
};
