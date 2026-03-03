import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchInventoryStock, type InventoryStockRow } from "../services/inventoryApi";

type QK = ReturnType<typeof qk.inventory.stock>;
const STALE_MS = 3 * 1000;

export function useInventoryStockQuery(branchId: string | number, enabled: boolean) {
  return useAppQuery<InventoryStockRow[], InventoryStockRow[], QK>({
    queryKey: qk.inventory.stock({ branchId }),
    queryFn: () => fetchInventoryStock(branchId),
    enabled: enabled && branchId != null && String(branchId).trim().length > 0,
    staleTime: STALE_MS,
  });
}