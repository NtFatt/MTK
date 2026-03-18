import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchInventoryAlerts, type InventoryAlertRow } from "../services/inventoryIngredientsApi";

export function useInventoryAlertsQuery(branchId: string | null) {
  return useAppQuery<InventoryAlertRow[]>({
    queryKey: ["inventory-ingredient-alerts", branchId] as const,
    queryFn: () => fetchInventoryAlerts(String(branchId)),
    enabled: Boolean(branchId),
    staleTime: 3_000,
  });
}