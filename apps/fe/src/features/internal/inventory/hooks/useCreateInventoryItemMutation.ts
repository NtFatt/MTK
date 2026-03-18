import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  createInventoryItem,
  type CreateInventoryIngredientInput,
  type InventoryIngredientRow,
} from "../services/inventoryIngredientsApi";

export function useCreateInventoryItemMutation(branchId: string | null) {
  return useAppMutation<InventoryIngredientRow, unknown, CreateInventoryIngredientInput>({
    mutationFn: (input) => createInventoryItem(input),
    invalidateKeys: [
      ["inventory-ingredients", branchId],
      ["inventory-ingredient-alerts", branchId],
    ],
  });
}