import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { qk } from "@hadilao/contracts";
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from "../../../../shared/http/idempotency";
import { changeAdminOrderStatus, type AdminChangeOrderStatusBody } from "../services/adminOrderApi";

export function useChangeOrderStatusMutation(branchId: string | number | undefined) {
  const b = branchId ?? "";

  return useAppMutation({
    mutationFn: async (p: { orderCode: string; body: AdminChangeOrderStatusBody }) => {
      const scope = `admin.order.status.${p.orderCode}.${p.body.toStatus}`;
      const idem = getOrCreateIdempotencyKey(scope);
      const out = await changeAdminOrderStatus(p.orderCode, p.body, idem);
      clearIdempotencyKey(scope);
      return out;
    },
    invalidateKeys: branchId != null ? [[...qk.orders.kitchenQueue({ branchId: b })]] : [],
  });
}