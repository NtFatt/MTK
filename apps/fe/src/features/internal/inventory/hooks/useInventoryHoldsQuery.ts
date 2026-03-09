import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchInventoryHolds, type InventoryHoldRow } from "../services/inventoryApi";

type QK = ReturnType<typeof qk.inventory.holds>;
const STALE_MS = 3 * 1000;

export function useInventoryHoldsQuery(
  branchId: string | number,
  enabled: boolean,
  limit: number = 200
) {
  return useAppQuery<InventoryHoldRow[], InventoryHoldRow[], QK>({
    queryKey: qk.inventory.holds({ branchId }),
    queryFn: () => fetchInventoryHolds({ branchId, limit }),
    enabled: enabled && branchId != null && String(branchId).trim().length > 0,
    staleTime: STALE_MS,
  });
}