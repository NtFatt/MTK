import { qk } from "@duong-hanh-phuc/contracts";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { clearShiftIdempotencyKey, getShiftIdempotencyKey } from "../utils/idempotency";
import { openShift, type OpenShiftPayload, type ShiftRunView } from "../services/shiftApi";

export function useOpenShiftMutation(branchId: string) {
  return useAppMutation<ShiftRunView, any, OpenShiftPayload>({
    invalidateKeys: [
      ["shifts", "current"],
      ["shifts", "history"],
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
