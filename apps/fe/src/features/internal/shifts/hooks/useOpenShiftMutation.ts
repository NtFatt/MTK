import { qk } from "@hadilao/contracts";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { clearShiftIdempotencyKey, getShiftIdempotencyKey } from "../utils/idempotency";
import { openShift, type OpenShiftPayload, type ShiftRunView } from "../services/shiftApi";

function shiftCurrentKey(branchId: string) {
  return ["shifts", "current", { branchId }] as const;
}

function shiftHistoryKey(branchId: string, limit: number) {
  return ["shifts", "history", { branchId, limit }] as const;
}

export function useOpenShiftMutation(branchId: string) {
  return useAppMutation<ShiftRunView, any, OpenShiftPayload>({
    invalidateKeys: [
      [...shiftCurrentKey(branchId)] as unknown as unknown[],
      [...shiftHistoryKey(branchId, 12)] as unknown as unknown[],
      [...qk.orders.cashierUnpaid({ branchId })] as unknown as unknown[],
      [...qk.dashboard.overview({ branchId })] as unknown as unknown[],
    ],
    mutationFn: async (payload) => {
      const scope = `open:${branchId}:${payload.businessDate}:${payload.shiftCode}`;
      const idempotencyKey = getShiftIdempotencyKey(scope);
      const response = await openShift(branchId, payload, idempotencyKey);
      clearShiftIdempotencyKey(scope);
      return response;
    },
  });
}
