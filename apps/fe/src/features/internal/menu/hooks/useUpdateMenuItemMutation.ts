import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  updateMenuItem,
  type AdminMenuItem,
  type UpdateMenuItemInput,
} from "../services/adminMenuApi";

export function useUpdateMenuItemMutation() {
  return useAppMutation<AdminMenuItem, unknown, UpdateMenuItemInput>({
    mutationFn: (input) => updateMenuItem(input),
    invalidateKeys: [["admin", "menu", "items"], ["menu", "view"]],
  });
}