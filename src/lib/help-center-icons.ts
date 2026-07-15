// Shared icon-name → lucide-react component map for Help Center links.
// The API stores the icon as a plain string (e.g. "calendar"); this resolves
// it to an actual component for both the admin editor and the public page.

import {
  Calendar,
  Building2,
  Pill,
  User,
  Heart,
  Shield,
  Phone,
  Mail,
  MapPin,
  FileText,
  Stethoscope,
  Search,
  HelpCircle,
  Lock,
  CreditCard,
  Bell,
  Settings,
  ClipboardList,
  Package,
  Truck,
  Star,
  type LucideIcon,
} from "lucide-react";

export const HELP_CENTER_ICON_MAP: Record<string, LucideIcon> = {
  calendar: Calendar,
  building: Building2,
  hospital: Building2,
  pharmacy: Pill,
  pill: Pill,
  user: User,
  heart: Heart,
  shield: Shield,
  phone: Phone,
  mail: Mail,
  "map-pin": MapPin,
  location: MapPin,
  document: FileText,
  "file-text": FileText,
  stethoscope: Stethoscope,
  doctor: Stethoscope,
  search: Search,
  help: HelpCircle,
  "help-circle": HelpCircle,
  lock: Lock,
  payment: CreditCard,
  "credit-card": CreditCard,
  bell: Bell,
  notification: Bell,
  settings: Settings,
  checklist: ClipboardList,
  package: Package,
  orders: Package,
  delivery: Truck,
  truck: Truck,
  star: Star,
  review: Star,
};

export const HELP_CENTER_ICON_NAMES = Object.keys(HELP_CENTER_ICON_MAP);

export function resolveHelpCenterIcon(name?: string | null): LucideIcon {
  if (!name) return HelpCircle;
  return HELP_CENTER_ICON_MAP[name.toLowerCase()] ?? HelpCircle;
}
