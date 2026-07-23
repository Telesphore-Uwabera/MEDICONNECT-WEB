import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { PatientRefund, RefundPayment, RefundStatus } from "@/hooks/patient/use-patient-refunds";

export interface RefundUser {
  id?: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  [key: string]: unknown;
}

export interface AdminRefund extends PatientRefund {
  requestedBy?: RefundUser | null;
  requested_by?: RefundUser | null;
  payment?: RefundPayment | null;
  status: RefundStatus;
}

export interface AdminRefundsResponse {
  current_page?: number;
  data: AdminRefund[];
  last_page?: number;
  per_page?: number;
  total?: number;
}

export interface AdminRefundFilters {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

function buildQuery(filters?: AdminRefundFilters) {
  const query = new URLSearchParams();
  if (filters?.status && filters.status !== "all") query.set("status", filters.status);
  if (filters?.search) query.set("search", filters.search);
  if (filters?.from) query.set("from", filters.from);
  if (filters?.to) query.set("to", filters.to);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export function useAdminRefunds(filters?: AdminRefundFilters) {
  return useQuery<AdminRefundsResponse>({
    queryKey: ["admin-refunds", filters],
    queryFn: () => apiFetch(`/admin/refunds${buildQuery(filters)}`),
  });
}

function useRefundAction(
  action: "approve" | "reject" | "complete",
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin-refund", action],
    mutationFn: ({ id, admin_note }: { id: number; admin_note?: string }) =>
      apiFetch<{ message: string; data: AdminRefund }>(
        `/admin/refunds/${id}/${action}`,
        {
          method: "POST",
          body: admin_note ? { admin_note } : {},
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
    },
  });
}

export function useApproveRefund() {
  return useRefundAction("approve");
}

export function useRejectRefund() {
  return useRefundAction("reject");
}

export function useCompleteRefund() {
  return useRefundAction("complete");
}
