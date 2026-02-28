import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { qk } from "@hadilao/contracts";
import { fetchKitchenQueue, type KitchenQueueRow } from "../services/kitchenQueueApi";

const STALE_MS = 2000;

export function useKitchenQueueQuery(input: {
  branchId: string | number | undefined;
  enabled: boolean;
  statuses?: string[];
  limit?: number;
}) {
  const b = input.branchId != null ? String(input.branchId) : "";
  const statuses = (input.statuses ?? []).map((x) => String(x).trim().toUpperCase()).filter(Boolean);
  const limit = Number(input.limit ?? 50);

  return useAppQuery<KitchenQueueRow[], KitchenQueueRow[], readonly unknown[]>({
    // ✅ prefix = qk.orders.kitchenQueue => realtime + mutation invalidate match
    queryKey: [...qk.orders.kitchenQueue({ branchId: b }), { statuses, limit }],
    queryFn: () => fetchKitchenQueue({ branchId: b, statuses, limit }),
    enabled: input.enabled && b.length > 0,
    staleTime: STALE_MS,
  });
}