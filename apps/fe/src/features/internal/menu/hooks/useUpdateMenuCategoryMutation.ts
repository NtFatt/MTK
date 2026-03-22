import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  type AdminMenuCategory,
  type UpdateMenuCategoryInput,
  updateMenuCategory,
} from "../services/adminMenuApi";

export function useUpdateMenuCategoryMutation() {
  return useAppMutation<AdminMenuCategory, unknown, UpdateMenuCategoryInput>({
    mutationFn: (input) => updateMenuCategory(input),
    invalidateKeys: [["admin", "menu", "categories"], ["admin", "menu", "items"], ["menu", "view"]],
  });
}
