import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  saveMenuRecipe,
  type MenuRecipeLine,
  type SaveMenuRecipeLineInput,
} from "../services/menuRecipesApi";

export function useSaveMenuRecipeMutation(branchId: string | null, menuItemId: string | null) {
  return useAppMutation<
    MenuRecipeLine[],
    unknown,
    { branchId: string; menuItemId: string; lines: SaveMenuRecipeLineInput[] }
  >({
    mutationFn: (input) => saveMenuRecipe(input),
    invalidateKeys: [["menu-recipe", branchId, menuItemId]],
  });
}