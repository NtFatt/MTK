import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchCurrentShift, type ShiftCurrentPayload } from "../services/shiftApi";

function shiftCurrentKey(branchId: string) {
  return ["shifts", "current", { branchId }] as const;
}

export function useCurrentShiftQuery(branchId: string | number | undefined, enabled: boolean) {
  const resolvedBranchId = branchId != null ? String(branchId).trim() : "";

  return useAppQuery<
    ShiftCurrentPayload,
    ShiftCurrentPayload,
    ReturnType<typeof shiftCurrentKey>
  >({
    queryKey: shiftCurrentKey(resolvedBranchId),
    queryFn: () => fetchCurrentShift(resolvedBranchId),
    enabled: enabled && resolvedBranchId.length > 0,
    staleTime: 3_000,
    refetchInterval: enabled && resolvedBranchId.length > 0 ? 15_000 : false,
    refetchIntervalInBackground: true,
  });
}
