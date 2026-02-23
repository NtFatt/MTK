import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from "../../../../shared/http/idempotency";
import { changeAdminOrderStatus, type AdminChangeOrderStatusBody } from "../services/adminOrderApi";
import { kitchenQueueBaseKey } from "./queryKeys";

export function useChangeOrderStatusMutation() {
  return useAppMutation({
    mutationFn: async (p: { orderCode: string; body: AdminChangeOrderStatusBody }) => {
      const scope = `admin.order.status.${p.orderCode}.${p.body.toStatus}`;
      const idem = getOrCreateIdempotencyKey(scope);
      const out = await changeAdminOrderStatus(p.orderCode, p.body, idem);
      clearIdempotencyKey(scope);
      return out;
    },
    invalidateKeys: [[...kitchenQueueBaseKey]],
  });
}