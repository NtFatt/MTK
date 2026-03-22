import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  fetchPayrollSummary,
  type PayrollSummaryRow,
} from "../services/payrollApi";

export function usePayrollSummaryQuery(input: {
  branchId: string;
  month: string;
  q?: string;
  enabled?: boolean;
}) {
  const query = (input.q ?? "").trim();
  return useAppQuery<PayrollSummaryRow[]>({
    queryKey: ["payroll", "summary", { branchId: input.branchId, month: input.month, q: query || undefined }] as const,
    queryFn: () =>
      fetchPayrollSummary({
        branchId: input.branchId,
        month: input.month,
        q: query || null,
      }),
    enabled: input.enabled ?? true,
    staleTime: 20_000,
  });
}
