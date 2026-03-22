import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchShiftHistory, type ShiftRunView } from "../services/shiftApi";

function shiftHistoryKey(branchId: string, limit: number) {
  return ["shifts", "history", { branchId, limit }] as const;
}

export function useShiftHistoryQuery(input: {
  branchId: string | number | undefined;
  enabled: boolean;
  limit?: number;
}) {
  const branchId = input.branchId != null ? String(input.branchId).trim() : "";
  const limit = Number(input.limit ?? 12);

  return useAppQuery<
    ShiftRunView[],
    ShiftRunView[],
    ReturnType<typeof shiftHistoryKey>
  >({
    queryKey: shiftHistoryKey(branchId, limit),
    queryFn: () => fetchShiftHistory(branchId, limit),
    enabled: input.enabled && branchId.length > 0,
    staleTime: 5_000,
    refetchInterval: input.enabled && branchId.length > 0 ? 30_000 : false,
    refetchIntervalInBackground: true,
  });
}
