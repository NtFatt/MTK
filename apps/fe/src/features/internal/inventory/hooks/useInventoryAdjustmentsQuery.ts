import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  fetchInventoryAdjustments,
  type InventoryAdjustmentsPage,
} from "../services/inventoryApi";

type Params = {
  branchId: string | number;
  itemId?: string | number;
  actorId?: string | number;
  mode?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string | number;
};

type QK = ReturnType<typeof qk.inventory.adjustments>;
const STALE_MS = 3 * 1000;

export function useInventoryAdjustmentsQuery(params: Params, enabled: boolean) {
  return useAppQuery<InventoryAdjustmentsPage, InventoryAdjustmentsPage, QK>({
    queryKey: qk.inventory.adjustments(params),
    queryFn: () => fetchInventoryAdjustments(params),
    enabled:
      enabled &&
      params.branchId != null &&
      String(params.branchId).trim().length > 0,
    staleTime: STALE_MS,
  });
}