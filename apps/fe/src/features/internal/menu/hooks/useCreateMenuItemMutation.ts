import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  createMenuItem,
  type AdminMenuItem,
  type CreateMenuItemInput,
} from "../services/adminMenuApi";

export function useCreateMenuItemMutation() {
  return useAppMutation<AdminMenuItem, unknown, CreateMenuItemInput>({
    mutationFn: (input) => createMenuItem(input),
    invalidateKeys: [["admin", "menu", "items"], ["menu", "view"]],
  });
}