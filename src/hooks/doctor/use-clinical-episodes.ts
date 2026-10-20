import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface EpisodeTask {
  id: number;
  task_type: string;
  task_status: string;
  assigned_role?: string | null;
  subject_id?: number | null;
  created_at?: string;
  completed_at?: string | null;
}

export interface ClinicalEpisode {
  id: number;
  episode_id?: number;
  patient_id: number;
  doctor_id?: number | null;
  appointment_id?: number | null;
  instant_consultation_id?: number | null;
  episode_status: string;
  note_finalized_at?: string | null;
  closed_at?: string | null;
  tasks?: EpisodeTask[];
  pending_count?: number;
  next_action?: { task_type: string; assigned_role?: string | null; subject_id?: number | null } | null;
  clinically_open?: boolean;
}

export function useDoctorEpisodes(status?: string) {
  return useQuery({
    queryKey: ["doctor-episodes", status || "all"],
    queryFn: async () => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await apiFetch<{ episodes?: ClinicalEpisode[]; data?: ClinicalEpisode[] }>(`/doctor/episodes${qs}`);
      return Array.isArray(res.episodes) ? res.episodes : Array.isArray(res.data) ? res.data : [];
    },
  });
}

export function usePatientEpisodes() {
  return useQuery({
    queryKey: ["patient-episodes"],
    queryFn: async () => {
      const res = await apiFetch<{ episodes?: ClinicalEpisode[]; data?: ClinicalEpisode[] }>("/patient/episodes");
      return Array.isArray(res.episodes) ? res.episodes : Array.isArray(res.data) ? res.data : [];
    },
  });
}

export function useEpisodeTimeline(scope: "doctor" | "patient", episodeId: number | null) {
  return useQuery({
    queryKey: [`${scope}-episode-timeline`, episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const res = await apiFetch<{ timeline?: Array<{ at?: string; kind: string; label: string }> }>(
        `/${scope}/episodes/${episodeId}/timeline`,
      );
      return Array.isArray(res.timeline) ? res.timeline : [];
    },
  });
}
