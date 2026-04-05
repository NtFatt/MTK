import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchCurrentShift, type ShiftCurrentPayload } from "../services/shiftApi";

export function useCurrentShiftQuery(
  branchId: string | number | undefined,
  enabled: boolean,
  businessDate?: string | null,
) {
  const resolvedBranchId = branchId != null ? String(branchId).trim() : "";
  const resolvedBusinessDate = String(businessDate ?? "").trim();

  return useAppQuery<
    ShiftCurrentPayload,
    ShiftCurrentPayload,
    readonly ["shifts", "current", { branchId: string; businessDate?: string }]
  >({
    queryKey: ["shifts", "current", { branchId: resolvedBranchId, ...(resolvedBusinessDate ? { businessDate: resolvedBusinessDate } : {}) }],
    queryFn: () => fetchCurrentShift(resolvedBranchId, resolvedBusinessDate || null),
    enabled: enabled && resolvedBranchId.length > 0,
    staleTime: 3_000,
    refetchInterval: enabled && resolvedBranchId.length > 0 ? 15_000 : false,
    refetchIntervalInBackground: true,
  });
}
