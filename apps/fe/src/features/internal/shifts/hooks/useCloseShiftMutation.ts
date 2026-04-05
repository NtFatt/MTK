import { qk } from "@duong-hanh-phuc/contracts";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { clearShiftIdempotencyKey, getShiftIdempotencyKey } from "../utils/idempotency";
import { closeShift, type CloseShiftPayload, type ShiftRunView } from "../services/shiftApi";

export function useCloseShiftMutation(branchId: string) {
  return useAppMutation<ShiftRunView, any, { shiftRunId: string; payload: CloseShiftPayload }>({
    invalidateKeys: [
      ["shifts", "current"],
      ["shifts", "history"],
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
