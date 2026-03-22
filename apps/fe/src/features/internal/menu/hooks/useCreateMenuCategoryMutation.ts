import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  createMenuCategory,
  type AdminMenuCategory,
  type CreateMenuCategoryInput,
} from "../services/adminMenuApi";

export function useCreateMenuCategoryMutation() {
  return useAppMutation<AdminMenuCategory, unknown, CreateMenuCategoryInput>({
    mutationFn: (input) => createMenuCategory(input),
    invalidateKeys: [["admin", "menu", "categories"], ["admin", "menu", "items"], ["menu", "view"]],
  });
}
