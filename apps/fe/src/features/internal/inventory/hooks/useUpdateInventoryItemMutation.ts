import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { updateInventoryItem } from "../services/inventoryIngredientsApi";

export function useUpdateInventoryItemMutation(branchId: string | null) {
  return useAppMutation({
    mutationFn: updateInventoryItem,
    invalidateKeys: [["inventory", "items", branchId]],
  });
}