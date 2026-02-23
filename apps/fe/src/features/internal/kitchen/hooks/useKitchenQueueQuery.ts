import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchKitchenQueue, type KitchenQueueRow } from "../services/kitchenQueueApi";
import { kitchenQueueQueryKey } from "./queryKeys";

const STALE_MS = 2000;

export function useKitchenQueueQuery(input: {
  branchId: string | number | undefined;
  enabled: boolean;
  statuses?: string[];
  limit?: number;
}) {
  const b = input.branchId != null ? String(input.branchId) : "";

  return useAppQuery<KitchenQueueRow[], KitchenQueueRow[], ReturnType<typeof kitchenQueueQueryKey>>({
    queryKey: kitchenQueueQueryKey({ branchId: b, statuses: input.statuses, limit: input.limit }),
    queryFn: () => fetchKitchenQueue({ branchId: b, statuses: input.statuses, limit: input.limit }),
    enabled: input.enabled && b.length > 0,
    staleTime: STALE_MS,
  });
}