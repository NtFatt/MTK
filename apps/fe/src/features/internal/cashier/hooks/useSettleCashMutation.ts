import { qk } from "@hadilao/contracts";

import { apiFetchAuthed } from "../../../../shared/http/authedFetch";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  clearCashierIdempotencyKey,
  getCashierIdempotencyKey,
} from "../utils/idempotency";

export type SettleCashResponse = {
  orderCode: string;
  txnRef?: string;
  changed: boolean;
  alreadyPaid?: boolean;
};

export function useSettleCashMutation(branchId: string) {
  const listKey = qk.orders.cashierUnpaid({ branchId });

  return useAppMutation<SettleCashResponse, any, { orderCode: string }>({
    invalidateKeys: [[...listKey] as unknown as unknown[]],
    mutationFn: async ({ orderCode }) => {
      const scope = `cashier.settle:${orderCode}`;
      const idempotencyKey = getCashierIdempotencyKey(scope);

      const response = await apiFetchAuthed<SettleCashResponse>(
        `/admin/cashier/settle-cash/${encodeURIComponent(orderCode)}`,
        {
          method: "POST",
          idempotencyKey,
        },
      );

      clearCashierIdempotencyKey(scope);
      return response;
    },
  });
}
