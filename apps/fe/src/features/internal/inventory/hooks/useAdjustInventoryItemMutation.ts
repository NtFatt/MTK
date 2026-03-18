import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  adjustInventoryItem,
  type AdjustInventoryIngredientInput,
} from "../services/inventoryIngredientsApi";

export function useAdjustInventoryItemMutation(branchId: string | null) {
  return useAppMutation<unknown, unknown, AdjustInventoryIngredientInput>({
    mutationFn: (input) => adjustInventoryItem(input),
    invalidateKeys: [
      ["inventory-ingredients", branchId],
      ["inventory-ingredient-alerts", branchId],
    ],
  });
}