import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  setMenuItemActive,
  type AdminMenuItem,
  type SetMenuItemActiveInput,
} from "../services/adminMenuApi";

export function useSetMenuItemActiveMutation() {
  return useAppMutation<AdminMenuItem, unknown, SetMenuItemActiveInput>({
    mutationFn: (input) => setMenuItemActive(input),
    invalidateKeys: [["admin", "menu", "items"], ["menu", "view"]],
  });
}