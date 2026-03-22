import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  fetchPayrollStaffDetail,
  type PayrollStaffDetailView,
} from "../services/payrollApi";

export function usePayrollStaffDetailQuery(input: {
  branchId: string;
  month: string;
  staffId?: string;
  enabled?: boolean;
}) {
  const staffId = String(input.staffId ?? "").trim();
  return useAppQuery<PayrollStaffDetailView>({
    queryKey: ["payroll", "staffDetail", { branchId: input.branchId, month: input.month, staffId: staffId || undefined }] as const,
    queryFn: () =>
      fetchPayrollStaffDetail({
        branchId: input.branchId,
        month: input.month,
        staffId,
      }),
    enabled: (input.enabled ?? true) && Boolean(staffId),
    staleTime: 15_000,
  });
}
