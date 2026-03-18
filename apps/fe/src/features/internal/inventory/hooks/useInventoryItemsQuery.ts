import { useQuery } from "@tanstack/react-query";
import { fetchInventoryItems } from "../services/inventoryIngredientsApi";

export function useInventoryItemsQuery(branchId: string | null) {
  return useQuery({
    queryKey: ["inventory-ingredients", branchId],
    queryFn: () => fetchInventoryItems(String(branchId)),
    enabled: Boolean(branchId),
  });
}