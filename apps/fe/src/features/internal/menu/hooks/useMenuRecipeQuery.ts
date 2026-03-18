import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchMenuRecipe, type MenuRecipeLine } from "../services/menuRecipesApi";

export function useMenuRecipeQuery(branchId: string | null, menuItemId: string | null) {
  return useAppQuery<MenuRecipeLine[]>({
    queryKey: ["menu-recipe", branchId, menuItemId] as const,
    queryFn: () => fetchMenuRecipe(String(branchId), String(menuItemId)),
    enabled: Boolean(branchId && menuItemId),
    staleTime: 3_000,
  });
}