import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/checklist-questions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnswerType = "boolean" | "text" | "scale" | "options";

export type QuestionSection =
  | "symptoms_screening"
  | "past_medical_history"
  | "functional_assessment"
  | "video_examination"
  | "red_flags"
  | (string & {}); // allow unknown sections from the API without breaking types

export interface ApiChecklistQuestion {
  id: number;
  section: QuestionSection;
  question_key: string;
  question_en: string;
  question_fr: string;
  question_kiny: string;
  answer_type: AnswerType;
  options: string[] | null;
  is_red_flag: boolean;
  is_required: boolean;
  warning_if_yes: string | null;
  sort_order: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// The API returns { questions: { [section]: ApiChecklistQuestion[] } }
export type QuestionsBySection = Record<QuestionSection, ApiChecklistQuestion[]>;

interface ListResponse {
  questions: QuestionsBySection;
}

interface SingleResponse {
  question: ApiChecklistQuestion;
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Flatten all sections into a single sorted array. */
export function flattenQuestions(bySection: QuestionsBySection): ApiChecklistQuestion[] {
  return Object.values(bySection).flat();
}

/** Human-readable label for a section key. */
export function sectionLabel(section: QuestionSection): string {
  return section
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── GET /admin/checklist-questions ──────────────────────────────────────────

export function useGetChecklistQuestions() {
  return useQuery({
    queryKey: ["checklist-questions"],
    queryFn: (): Promise<ListResponse> => apiFetch(BASE),
    // Expose the nested map directly; consumers can flatten if needed.
    select: (data: ListResponse) => data.questions,
  });
}

// ─── POST /admin/checklist-questions ─────────────────────────────────────────

export interface CreateChecklistQuestionPayload {
  section: QuestionSection;
  question_key: string;
  question_en: string;
  question_fr: string;
  question_kiny: string;
  answer_type: AnswerType;
  options?: string[] | null;
  is_red_flag?: boolean;
  is_required?: boolean;
  warning_if_yes?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export function useCreateChecklistQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateChecklistQuestionPayload): Promise<SingleResponse> =>
      apiFetch(BASE, { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-questions"] });
    },
  });
}

// ─── PUT /admin/checklist-questions/{id} ─────────────────────────────────────

export type UpdateChecklistQuestionPayload = Partial<CreateChecklistQuestionPayload> & {
  id: number;
};

export function useUpdateChecklistQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateChecklistQuestionPayload): Promise<SingleResponse> =>
      apiFetch(`${BASE}/${id}`, { method: "PUT", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-questions"] });
    },
  });
}

// ─── DELETE /admin/checklist-questions/{id} ───────────────────────────────────

export function useDeleteChecklistQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number): Promise<{ message: string }> =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-questions"] });
    },
  });
}
