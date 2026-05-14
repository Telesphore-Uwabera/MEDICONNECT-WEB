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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/mediconnect-logo.png";
import { useState, useCallback } from "react";

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
        { to: "/admin/patients", label: t("sidebar.patients"), icon: User },
        { to: "/admin/doctors", label: t("sidebar.doctors"), icon: Stethoscope },
      ],
    },
    {
      heading: t("sidebar.group.facilities"),
      items: [
        { to: "/admin/hospitals", label: t("sidebar.hospitals"), icon: Building2 },
        { to: "/admin/pharmacies", label: t("sidebar.pharmacies"), icon: Pill },
      ],
    },
    {
      heading: t("sidebar.group.medical"),
      items: [
        { to: "/admin/appointments", label: t("sidebar.appointments"), icon: Calendar },
        { to: "/admin/specializations", label: t("sidebar.specializations"), icon: FlaskConical },
        { to: "/admin/checklist-questions", label: t("sidebar.checklistQuestions"), icon: HelpCircle },
        { to: "/admin/insurances", label: t("sidebar.insurances"), icon: Shield },
        { to: "/admin/reviews", label: t("sidebar.reviews"), icon: Star },
      ],
    },
    {
      heading: t("sidebar.group.finance"),
      items: [
        { to: "/admin/service-pricing", label: t("sidebar.servicePricing"), icon: Tag },
      ],
    },
    {
      heading: t("sidebar.group.system"),
      items: [
        { to: "/admin/settings", label: t("sidebar.settings"), icon: Settings },
        { to: "/admin/audit-logs", label: t("sidebar.auditLogs"), icon: History },
        { to: "/admin/maintenance", label: t("sidebar.maintenance"), icon: Wrench },
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
        { to: "/doctor/specializations", label: t("sidebar.specializations"), icon: FlaskConical },
        { to: "/doctor/education", label: t("sidebar.education"), icon: GraduationCap },
        { to: "/doctor/experience", label: t("sidebar.experience"), icon: Briefcase },
        { to: "/doctor/qualifications", label: t("sidebar.qualifications"), icon: Award },
        { to: "/doctor/social-links", label: t("sidebar.socialLinks"), icon: Link2 },
      ],
    },
    {
      heading: t("sidebar.group.schedule"),
      items: [
        { to: "/doctor/availability", label: t("sidebar.availability"), icon: Clock },
        { to: "/doctor/appointments", label: t("sidebar.appointments"), icon: ClipboardList },
      ],
    },
    {
      heading: t("sidebar.group.clinical"),
      items: [
        { to: "/doctor/prescriptions", label: t("sidebar.prescriptions"), icon: FileText },
        { to: "/doctor/fitness-certificates", label: t("sidebar.fitnessCertificates"), icon: CheckCircle },
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
        { to: "/hospital/profile", label: t("sidebar.profile"), icon: Building2 },
        { to: "/hospital/schedule", label: t("sidebar.workingHours"), icon: Clock },
        { to: "/hospital/gallery", label: t("sidebar.gallery"), icon: Image },
        { to: "/hospital/social-links", label: t("sidebar.socialLinks"), icon: Link2 },
      ],
    },
    {
      heading: t("sidebar.group.operations"),
      items: [
        { to: "/hospital/departments", label: t("sidebar.departments"), icon: Building },
        { to: "/hospital/appointments", label: t("sidebar.appointments"), icon: HeartPulse },
        { to: "/hospital/doctors", label: t("sidebar.doctors"), icon: Stethoscope },
        { to: "/hospital/insurances", label: t("sidebar.insurances"), icon: Shield },
      ],
    },
    {
      heading: t("sidebar.group.activity"),
      items: [
        { to: "/hospital/service-bookings", label: t("sidebar.serviceBookings"), icon: Calendar },
        { to: "/hospital/prescriptions", label: t("sidebar.prescriptions"), icon: Send },

      ],
    },
    {
      heading: t("sidebar.group.account"),
      items: [
        { to: "/hospital/settings", label: t("sidebar.settings"), icon: Settings },
      ],
    },
  ],

  patient: [
    { items: [{ to: "/patient", label: t("sidebar.dashboard"), icon: Home }] },
    {
      heading: t("sidebar.group.myHealth"),
      items: [
        { to: "/patient/profile", label: t("sidebar.profile"), icon: User },
        { to: "/patient/medical-info", label: t("sidebar.medicalInfo"), icon: HeartPulse },
        { to: "/patient/insurance", label: t("sidebar.insurance"), icon: Shield },
      ],
    },
    {
      heading: t("sidebar.group.findCare"),
      items: [
        { to: "/patient/search-doctors", label: t("sidebar.searchDoctors"), icon: Search },
        { to: "/patient/search-hospitals", label: t("sidebar.searchHospitals"), icon: Building2 },
        // PatientFitnessCertificates
        { to: "/patient/fitness-certificates", label: t("sidebar.fitnessCertificates"), icon: CheckCircle },
      ],
    },
    {
      heading: t("sidebar.group.appointments"),
      items: [
        { to: "/patient/quick-appointment", label: t("sidebar.quickAppointment"), icon: Zap },
        { to: "/patient/appointments", label: t("sidebar.myAppointments"), icon: Calendar },
        { to: "/patient/service-bookings", label: t("sidebar.serviceBookings"), icon: ClipboardList },

      ],
    },
    {
      heading: t("sidebar.group.records"),
      items: [
        { to: "/patient/prescriptions", label: t("sidebar.prescriptions"), icon: FileText },
        { to: "/patient/reviews", label: t("sidebar.myReviews"), icon: Star },
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
    { items: [{ to: "/pharmacy/orders", label: t("sidebar.dashboard"), icon: Home }] },
    {
      heading: t("sidebar.group.ourStore"),
      items: [
        { to: "/pharmacy/profile", label: t("sidebar.profile"), icon: Building2 },
        { to: "/pharmacy/working-hours", label: t("sidebar.workingHours"), icon: Clock },
        { to: "/pharmacy/prescriptions", label: t("sidebar.prescriptions"), icon: Image },
        { to: "/pharmacy/social-links", label: t("sidebar.socialLinks"), icon: Link2 },
      ],
    },
    {
      heading: t("sidebar.group.inventory"),
      items: [
        { to: "/pharmacy/inventory", label: t("sidebar.medicines"), icon: Pill },
        { to: "/pharmacy/categories", label: t("sidebar.categories"), icon: Tag },
        { to: "/pharmacy/orders", label: t("sidebar.orders"), icon: AlertTriangle },
        { to: "/pharmacy/restock-requests", label: t("sidebar.restockRequests"), icon: Package },
      ],
    },
    {
      heading: t("sidebar.group.prescriptions"),
      items: [
        { to: "/pharmacy/incoming-prescriptions", label: t("sidebar.incomingPrescriptions"), icon: FileText },
        { to: "/pharmacy/dispensed", label: t("sidebar.dispensed"), icon: CheckCircle },
      ],
    },
    {
      heading: t("sidebar.group.orders"),
      items: [
        { to: "/pharmacy/orders", label: t("sidebar.orders"), icon: ShoppingCart },
        { to: "/pharmacy/deliveries", label: t("sidebar.deliveries"), icon: Truck },
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
  patient:  { labelKey: "sidebar.patientPortal",   initials: "PT" },
  doctor:   { labelKey: "sidebar.doctorWorkspace",  initials: "DR" },
  hospital: { labelKey: "sidebar.hospitalAdmin",    initials: "HP" },
  pharmacy: { labelKey: "sidebar.pharmacyConsole",  initials: "PH" },
  admin:    { labelKey: "sidebar.adminConsole",     initials: "AD" },
};

interface Props {
  role: Role;
  children: React.ReactNode;
}

export const DashboardLayout = ({ role, children }: Props) => {
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});

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
            className="h-7 w-auto flex-shrink-0"
          />
          <span className="text-[12px] font-bold tracking-widest text-sidebar-foreground truncate hidden xl:block">
            MEDICONNECT
          </span>
        </NavLink>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <ThemeToggle />
          <LanguageSwitcher compact />
        </div>
      </div>

      {/* ── Role badge ── */}
      <div className="px-4 py-3 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-primary/10 border border-primary/15 w-fit">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-primary/20 text-primary text-[9px] font-black flex-shrink-0">
            {cfg.initials}
          </span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-primary truncate">
            {t(cfg.labelKey)}
          </span>
        </div>
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
                  className="w-full flex items-center justify-between px-2 py-1.5 mb-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors select-none"
                >
                  <span>{group.heading}</span>
                  <ChevronRight
                    className={cn(
                      "h-2.5 w-2.5 transition-transform duration-200",
                      !isCollapsed && "rotate-90"
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
                              "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-[12px] font-medium transition-all duration-150",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/70"
                            )}
                          >
                            {/* Active left bar */}
                            {active && (
                              <motion.div
                                layoutId="activeBar"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 rounded-r-full bg-primary"
                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                              />
                            )}

                            {/* Icon */}
                            <span className={cn(
                              "flex items-center justify-center w-6 h-6 rounded flex-shrink-0 transition-all duration-150",
                              active
                                ? "bg-primary/15 text-primary"
                                : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                            )}>
                              <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.5 : 2} />
                            </span>

                            {/* Label */}
                            <span className="truncate flex-1">{item.label}</span>

                            {/* Badge */}
                            {item.badge && (
                              <span className="ml-auto flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-primary/15 text-primary text-[9px] font-bold">
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
        <RoleSwitcher current={role} t={t} />
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="w-[240px] border-r border-sidebar-border bg-sidebar hidden lg:flex flex-col sticky top-0 h-dvh shrink-0">
        <SidebarContent />
      </aside>

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
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          className="absolute top-4 right-3 p-1.5 rounded-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Mobile Topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
          <button
            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <NavLink to="/" className="flex items-center gap-2">
            <img src={logo} alt="MEDICONNECT" className="h-6 w-auto" />
            <span className="text-[12px] font-bold tracking-widest text-foreground">
              MEDICONNECT
            </span>
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
      </div>
    </div>
  );
};

/* ── Role Switcher ── */
const RoleSwitcher = ({ current, t }: { current: Role; t: (k: string) => string }) => {
  const roles: { role: Role; label: string; to: string; icon: LucideIcon }[] = [
    { role: "patient",  label: t("sidebar.patient"),  to: "/patient",  icon: User },
    { role: "doctor",   label: t("sidebar.doctor"),   to: "/doctor",   icon: Stethoscope },
    { role: "hospital", label: t("sidebar.hospital"), to: "/hospital", icon: Building2 },
    { role: "pharmacy", label: t("sidebar.pharmacy"), to: "/pharmacy/orders", icon: Pill },
    { role: "admin",    label: t("sidebar.admin"),    to: "/admin",    icon: ShieldCheck },
  ];

  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[9px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/35 select-none">
        {t("sidebar.switchRole")}
      </p>
      <div className="grid grid-cols-5 gap-0.5 rounded-sm bg-sidebar-accent/40 p-1 border border-sidebar-border">
        {roles.map((r) => {
          const Icon = r.icon;
          const active = current === r.role;
          return (
            <NavLink
              key={r.role}
              to={r.to}
              title={r.label}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all duration-150",
                active
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent"
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[8px] font-semibold leading-none">{r.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
