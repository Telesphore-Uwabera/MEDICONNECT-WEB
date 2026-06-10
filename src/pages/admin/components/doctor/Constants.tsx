import { Video, UserRound, MonitorSmartphone } from "lucide-react";

// Kept in a .tsx file because it contains JSX
export const ConsultationIcon: Record<string, React.ReactNode> = {
  online:    <Video className="w-3 h-3" />,
  in_person: <UserRound className="w-3 h-3" />,
  both:      <MonitorSmartphone className="w-3 h-3" />,
};
