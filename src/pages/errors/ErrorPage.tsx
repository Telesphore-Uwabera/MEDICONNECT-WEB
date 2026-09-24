import { Link, useNavigate } from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    Clock,
    Home,
    LockKeyhole,
    RefreshCw,
    SearchX,
    ServerCrash,
    ShieldAlert,
    WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Footer from "@/components/landing/Footer";
import { useState } from "react"; 
import { useTranslation } from "react-i18next";

import {
    ArrowRight,
    ChevronRight,

    Mail,
    MapPin,
    Phone,
} from "lucide-react";

 
import { useTheme } from "@/context/ThemeContext";

import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";

import TopBar from "@/components/landing/TopBar";

import { HeroHeader } from "@/components/landing/HeroHeader";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { localizedText } from "@/lib/localized-settings";
import { notifyAccessPrompt } from "@/lib/access-events";
 
export type ErrorStatus = 400 | 401 | 403 | 404 | 419 | 422 | 429 | 500 | 502 | 503 | 504;

interface ErrorPageProps {
    statusCode?: number;
    title?: string;
    description?: string;
    error?: unknown;
    showBackButton?: boolean;
    className?: string;
}

const ERROR_CONTENT: Record<number, { title: string; description: string; icon: React.ElementType }> = {
    400: {
        title: "Bad request",
        description: "The request could not be processed. Please check your input and try again.",
        icon: AlertTriangle,
    },
    401: {
        title: "Authentication required",
        description: "Please sign in again to continue using MediConnect.",
        icon: LockKeyhole,
    },
    403: {
        title: "Access denied",
        description: "You do not have permission to access this page or resource.",
        icon: ShieldAlert,
    },
    404: {
        title: "Page not found",
        description: "The page you are looking for does not exist or has been moved.",
        icon: SearchX,
    },
    419: {
        title: "Session expired",
        description: "Your session has expired. Please refresh the page or sign in again.",
        icon: Clock,
    },
    422: {
        title: "Invalid data",
        description: "Some submitted information is invalid. Please review the form and try again.",
        icon: AlertTriangle,
    },
    429: {
        title: "Too many requests",
        description: "You are sending requests too quickly. Please wait a moment and try again.",
        icon: Clock,
    },
    500: {
        title: "Server error",
        description: "Something went wrong on our side. Please try again in a moment.",
        icon: ServerCrash,
    },
    502: {
        title: "Bad gateway",
        description: "The server received an invalid response. Please try again shortly.",
        icon: WifiOff,
    },
    503: {
        title: "Service unavailable",
        description: "The service is temporarily unavailable. Please try again later.",
        icon: WifiOff,
    },
    504: {
        title: "Gateway timeout",
        description: "The request took too long to complete. Please try again.",
        icon: Clock,
    },
};

export function getErrorStatus(error: unknown): number {
    if (!error) return 500;

    if (error instanceof Response) return error.status || 500;

    if (error && typeof error === "object") {
        const candidate = error as {
            status?: unknown;
            statusCode?: unknown;
            code?: unknown;
            response?: { status?: unknown };
            data?: { status?: unknown; statusCode?: unknown };
        };

        const possibleStatus =
            candidate.status ??
            candidate.statusCode ??
            candidate.response?.status ??
            candidate.data?.status ??
            candidate.data?.statusCode;

        if (typeof possibleStatus === "number") return possibleStatus;
        if (typeof possibleStatus === "string" && /^\d+$/.test(possibleStatus)) {
            return Number(possibleStatus);
        }
    }

    return 500;
}

export function getErrorMessage(error: unknown): string | undefined {
    if (!error) return undefined;

    if (error instanceof Error && error.message) return error.message;

    if (error && typeof error === "object") {
        const candidate = error as {
            message?: unknown;
            data?: { message?: unknown; errors?: Record<string, string[]> | string[] };
        };

        if (candidate.data?.errors) {
            const flat = Array.isArray(candidate.data.errors)
                ? candidate.data.errors
                : Object.values(candidate.data.errors).flat();
            if (flat.length) return flat.join(" · ");
        }

        if (typeof candidate.data?.message === "string") return candidate.data.message;
        if (typeof candidate.message === "string") return candidate.message;
    }

    return undefined;
}

export default function ErrorPage({
    statusCode,
    title,
    description,
    error,
    showBackButton = true,
    className,
}: ErrorPageProps) {
    const navigate = useNavigate();
    const status = statusCode ?? getErrorStatus(error);
    const fallback = ERROR_CONTENT[status] ?? ERROR_CONTENT[500];
    const Icon = fallback.icon;
    const technicalMessage = getErrorMessage(error);
    const isAuthenticated = !!localStorage.getItem("auth_token");

    const { t, i18n } = useTranslation();
    const { resolvedTheme, theme } = useTheme();
    const { data: publicSettings } = usePublicSettings();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("doctors");

    const publicPayload = publicSettings as any;

    const generalSettings =
        publicPayload?.general ?? publicPayload?.settings ?? publicPayload ?? {};

    const logo =
        generalSettings?.app_logo_url ||
        ((resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT);

    const appName = generalSettings?.app_name || "MEDICONNECT";

    const appTagline =
        localizedText(generalSettings?.app_tagline, i18n.language, t("pages.landing.footer_desc"));

    const contactEmail =
        generalSettings?.contact_email || "support@mediconnect.com";

    const contactPhone =
        generalSettings?.contact_phone || "+250 782 168 650";

    const contactAddress =
        generalSettings?.contact_address || "Kigali, Rwanda";

    const appUrl =
        generalSettings?.app_url || "https://mediconnect.rw";

    const defaultLanguage =
        generalSettings?.default_language || "en";

    const timezone =
        generalSettings?.timezone || "Africa/Kigali";

    const defaultCurrency =
        generalSettings?.default_currency || "RWF";
    return (
        <>  
            <div className="sticky top-0 z-50">
                <TopBar settings={generalSettings} />
                <HeroHeader
                    mobileMenuOpen={mobileMenuOpen}
                    setMobileMenuOpen={setMobileMenuOpen}
                    activeSection={activeSection}
                    settings={generalSettings}
                />
            </div>
        <main
            className={cn(
                "min-h-[50vh] bg-background text-foreground flex items-center justify-center px-4 py-10",
                className,
            )}
        >
            <div className="w-full max-w-xl "> 

                <div className="p-6 sm:p-8 text-center">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-7 w-7" />
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        Error {status}
                    </p>

                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        {title ?? fallback.title}
                    </h1>

                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {description ?? technicalMessage ?? fallback.description}
                    </p>

                    {technicalMessage && description && (
                        <div className="mt-5 rounded-[6px] border border-border bg-muted/40 px-4 py-3 text-left">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Details
                            </p>
                            <p className="mt-1 break-words text-xs text-muted-foreground">
                                {technicalMessage}
                            </p>
                        </div>
                    )}

                    <div className="mt-7 grid gap-2 sm:grid-cols-2">
                        {status === 401 && (
                            <Button
                                className="h-10 rounded-[6px] sm:col-span-2"
                                onClick={() => navigate("/auth")}
                            >
                                Sign in
                            </Button>
                        )}

                        {status === 403 && isAuthenticated && (
                            <Button
                                className="h-10 rounded-[6px] sm:col-span-2"
                                onClick={() =>
                                    notifyAccessPrompt({
                                        reason: "role",
                                        message:
                                            "Your current role does not have access to this resource. Switch roles to continue.",
                                    })
                                }
                            >
                                Switch role
                            </Button>
                        )}

                        {status === 403 && !isAuthenticated && (
                            <Button
                                className="h-10 rounded-[6px] sm:col-span-2"
                                onClick={() => navigate("/auth")}
                            >
                                Sign in
                            </Button>
                        )}

                        {showBackButton && (
                            <Button
                                variant="outline"
                                className="h-10 rounded-[6px] sm:col-span-1"
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        )}

                        <Link to="/" className="sm:col-span-1">
                            <Button variant="outline" className="h-10 w-full rounded-[6px]">
                                <Home className="mr-2 h-4 w-4" />
                                Home
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </main>
        
            <Footer/>
            
            </>
      
    );
}
