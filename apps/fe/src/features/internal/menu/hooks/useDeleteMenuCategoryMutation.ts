import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  deleteMenuCategory,
  type DeleteMenuCategoryInput,
} from "../services/adminMenuApi";

export function useDeleteMenuCategoryMutation() {
  return useAppMutation<void, unknown, DeleteMenuCategoryInput>({
    mutationFn: (input) => deleteMenuCategory(input),
    invalidateKeys: [["admin", "menu", "categories"], ["admin", "menu", "items"], ["menu", "view"]],
  });
}
