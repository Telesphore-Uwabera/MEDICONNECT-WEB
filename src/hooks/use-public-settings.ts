import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface PublicGeneralSettings {
  app_name?: string | null;
  app_tagline?: string | Record<string, string | null | undefined> | null;
  app_logo_url?: string | null;
  app_favicon_url?: string | null;
  app_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  default_language?: string | null;
  supported_languages?: string[] | null;
  timezone?: string | null;
  default_currency?: string | null;
  terms_url?: string | null;
  privacy_url?: string | null;
}

export interface PublicSettings {
  general?: PublicGeneralSettings;
  video?: {
    session_duration_minutes?: number | null;
    waiting_room_enabled?: boolean | null;
  };
  security?: {
    otp_enabled?: boolean | null;
    guest_access_enabled?: boolean | null;
    require_phone_verification?: boolean | null;
    require_email_verification?: boolean | null;
  };
}

interface PublicSettingsResponse {
  settings?: PublicSettings;
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const res = await apiFetch<PublicSettingsResponse>("/public/settings");
      return res.settings ?? {};
    },
    staleTime: 10 * 60 * 1000,
  });
}
