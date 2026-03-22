import { qk } from "@hadilao/contracts";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { clearShiftIdempotencyKey, getShiftIdempotencyKey } from "../utils/idempotency";
import { closeShift, type CloseShiftPayload, type ShiftRunView } from "../services/shiftApi";

function shiftCurrentKey(branchId: string) {
  return ["shifts", "current", { branchId }] as const;
}

function shiftHistoryKey(branchId: string, limit: number) {
  return ["shifts", "history", { branchId, limit }] as const;
}

export function useCloseShiftMutation(branchId: string) {
  return useAppMutation<ShiftRunView, any, { shiftRunId: string; payload: CloseShiftPayload }>({
    invalidateKeys: [
      [...shiftCurrentKey(branchId)] as unknown as unknown[],
      [...shiftHistoryKey(branchId, 12)] as unknown as unknown[],
      [...qk.orders.cashierUnpaid({ branchId })] as unknown as unknown[],
      [...qk.dashboard.overview({ branchId })] as unknown as unknown[],
    ],
    mutationFn: async ({ shiftRunId, payload }) => {
      const scope = `close:${shiftRunId}`;
      const idempotencyKey = getShiftIdempotencyKey(scope);
      const response = await closeShift(shiftRunId, payload, idempotencyKey);
      clearShiftIdempotencyKey(scope);
      return response;
    },
  });
}
