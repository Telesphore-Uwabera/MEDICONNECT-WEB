// import { ReactNode, useRef, useState } from "react";
// import { useTranslation } from "react-i18next";
// import { Bell, Search, Settings, LogOut, User, ChevronDown, HelpCircle } from "lucide-react";
// import { Input } from "@/components/ui/input";
// import { NavLink } from "react-router-dom";
// import { cn } from "@/lib/utils";

// interface Props {
//   title: string;
//   subtitle?: string;
//   actions?: ReactNode;
//   user?: {
//     name?: string;
//     email?: string;
//     role?: string;
//     initials?: string;
//   };
//   notificationCount?: number;
// }

// export const PageHeader = ({
//   title,
//   subtitle,
//   actions,
//   user = { name: "Med Connect", email: "user@mediconnect.com", role: "Patient", initials: "MC" },
//   notificationCount = 3,
// }: Props) => {
//   const { t } = useTranslation();
//   const [profileOpen, setProfileOpen] = useState(false);
//   const [searchFocused, setSearchFocused] = useState(false);
//   const profileRef = useRef<HTMLDivElement>(null);

//   return (
//     <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-20">
//       <div className="px-6 py-3 flex items-center justify-between gap-4">

//         {/* Title */}
//         <div className="min-w-0">
//           <h1 className="text-base font-semibold tracking-tight text-foreground truncate leading-tight">
//             {title}
//           </h1>
//           {subtitle && (
//             <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
//           )}
//         </div>

//         {/* Right controls */}
//         <div className="flex items-center gap-1.5 shrink-0">

//           {/* Search */}
//           <div className={cn(
//             "relative hidden md:flex items-center transition-all duration-200",
//             searchFocused ? "w-56" : "w-44"
//           )}>
//             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
//             <Input
//               placeholder={t("pages.header.search")}
//               className="pl-8 pr-3 h-8 text-xs bg-muted/60 border-transparent rounded-md focus:bg-background focus:border-border/80 transition-all"
//               onFocus={() => setSearchFocused(true)}
//               onBlur={() => setSearchFocused(false)}
//             />
//           </div>

//           {/* Custom actions */}
//           {actions}

//           {/* Bell */}
//           <button className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
//             <Bell className="h-4 w-4" />
//             {notificationCount > 0 && (
//               <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-primary ring-1 ring-background" />
//             )}
//           </button>

//           {/* Profile */}
//           <div className="relative" ref={profileRef}>
//             <button
//               onClick={() => setProfileOpen((o) => !o)}
//               className={cn(
//                 "flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-md transition-colors",
//                 profileOpen ? "bg-muted" : "hover:bg-muted"
//               )}
//             >
//               <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold ring-1 ring-primary/20">
//                 {user.initials}
//               </div>
//               <ChevronDown className={cn(
//                 "h-3 w-3 text-muted-foreground transition-transform duration-200",
//                 profileOpen && "rotate-180"
//               )} />
//             </button>

//             {/* Popover */}
//             {profileOpen && (
//               <>
//                 <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
//                 <div className="absolute right-0 top-full mt-2 w-52 z-20 bg-card border border-border/60 rounded-xl shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-100">

//                   {/* User info */}
//                   <div className="px-3.5 py-3 border-b border-border/50">
//                     <div className="flex items-center gap-2.5">
//                       <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold ring-1 ring-primary/20 shrink-0">
//                         {user.initials}
//                       </div>
//                       <div className="min-w-0">
//                         <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
//                         <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
//                       </div>
//                     </div>
//                     {user.role && (
//                       <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-sm bg-primary/8 text-primary text-[10px] font-medium">
//                         {user.role}
//                       </span>
//                     )}
//                   </div>

//                   {/* Menu items */}
//                   <div className="p-1.5 space-y-0.5">
//                     <PopItem icon={User} label={t("header.profile")} to="./profile" onClick={() => setProfileOpen(false)} />
//                     <PopItem icon={Settings} label={t("header.settings")} to="./settings" onClick={() => setProfileOpen(false)} />
//                     <PopItem icon={HelpCircle} label={t("header.help")} to="./help" onClick={() => setProfileOpen(false)} />
//                   </div>

//                   {/* Sign out */}
//                   <div className="p-1.5 border-t border-border/50">
//                     <button
//                       className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-medium"
//                       onClick={() => { setProfileOpen(false); /* trigger logout */ }}
//                     >
//                       <LogOut className="h-3.5 w-3.5" />
//                       {t("header.signOut")}
//                     </button>
//                   </div>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </header>
//   );
// };

// const PopItem = ({
//   icon: Icon,
//   label,
//   to,
//   onClick,
// }: {
//   icon: React.ElementType;
//   label: string;
//   to: string;
//   onClick: () => void;
// }) => (
//   <NavLink
//     to={to}
//     onClick={onClick}
//     className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
//   >
//     <Icon className="h-3.5 w-3.5" />
//     {label}
//   </NavLink>
// );

import { ReactNode, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Search,
  Settings,
  LogOut,
  User,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  user?: {
    name?: string;
    email?: string;
    role?: string;
    initials?: string;
  };
  notificationCount?: number;
}

export const PageHeader = ({
  title,
  subtitle,
  actions,
  user = {
    name: "Med Connect",
    email: "user@mediconnect.com",
    role: "Patient",
    initials: "MC",
  },
  notificationCount = 3,
}: Props) => {
  const { t } = useTranslation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-20">
      <div className="px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-foreground truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <div
            className={cn(
              "relative hidden md:flex items-center transition-all duration-300",
              searchFocused ? "w-64" : "w-48",
            )}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("pages.header.search")}
              className="pl-9 pr-4 h-9 text-sm rounded-xl border-transparent bg-secondary focus:bg-background focus:border-primary/30 transition-all shadow-sm"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>

          {/* Custom actions */}
          {actions}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Bell */}
          <button className="relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card animate-pulse" />
            )}
          </button>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className={cn(
                "flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl transition-all border",
                profileOpen
                  ? "bg-secondary border-border text-foreground"
                  : "border-transparent hover:bg-secondary hover:border-border/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold ring-1 ring-primary/20">
                {user.initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {user.role}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                  profileOpen && "rotate-180",
                )}
              />
            </button>

            {/* Popover */}
            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 z-20 bg-card border border-border rounded-md shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">
                  {/* User info */}
                  <div className="px-4 py-4 border-b border-border bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold ring-2 ring-primary/20 shrink-0">
                        {user.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {user.role && (
                      <span className="mt-2.5 inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">
                        {user.role}
                      </span>
                    )}
                  </div>

                  {/* Menu items */}
                  <div className="p-2 space-y-0.5">
                    <PopItem
                      icon={User}
                      label={t("header.profile")}
                      to="./profile"
                      onClick={() => setProfileOpen(false)}
                    />
                    <PopItem
                      icon={Settings}
                      label={t("header.settings")}
                      to="./settings"
                      onClick={() => setProfileOpen(false)}
                    />
                    <PopItem
                      icon={HelpCircle}
                      label={t("header.help")}
                      to="./help"
                      onClick={() => setProfileOpen(false)}
                    />
                  </div>

                  {/* Sign out */}
                  <div className="p-2 border-t border-border">
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium"
                      onClick={() => {
                        setProfileOpen(false); /* trigger logout */
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      {t("header.signOut")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const PopItem = ({
  icon: Icon,
  label,
  to,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  to: string;
  onClick: () => void;
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium"
  >
    <Icon className="h-4 w-4" />
    {label}
  </NavLink>
);
