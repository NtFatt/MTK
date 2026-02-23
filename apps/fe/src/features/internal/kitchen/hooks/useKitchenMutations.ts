import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@hadilao/contracts";
import { changeKitchenOrderStatus } from "../services/adminOrderApi";

const KITCHEN_QUEUE_BASE_KEY = ["admin", "kitchen", "queue"] as const;

function makeIdemKey(scope: string) {
    const uuid = globalThis.crypto?.randomUUID?.();
    return uuid ? `${scope}:${uuid}` : `${scope}:${Date.now()}-${Math.random()}`;
}
export function useUpdateKitchenOrderStatus(_branchId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: { orderCode: string; toStatus: "RECEIVED" | "READY"; note?: string | null }) => {
            const idem = makeIdemKey(`kitchen.order.status.${input.orderCode}.${input.toStatus}`);
            return changeKitchenOrderStatus(input.orderCode, input.toStatus, {
                note: input.note ?? null,
                idempotencyKey: idem,
            });
        },

        onSuccess: async (_data, vars) => {
            // Invalidate prefix để khỏi lệch params (statuses/limit)
            await qc.invalidateQueries({ queryKey: KITCHEN_QUEUE_BASE_KEY, exact: false });

            // Optional: nếu bạn có view theo dõi order
            await qc.invalidateQueries({ queryKey: qk.orders.byCode(vars.orderCode), exact: true });
        },
    });
}