/**
 * Menu query — uses useAppQuery, contract-first.
 * TODO: migrate to contracts qk when menu "view" key is available (qk.menu.categories/items used by BE).
 */
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchMenu, type MenuApiParams, type MenuViewModel } from "../services/menuApi";

const MENU_STALE_MS = 5 * 60 * 1000;
const MENU_GC_MS = 30 * 60 * 1000;

function menuViewQueryKey(params: MenuApiParams = {}): readonly ["menu", "view", MenuApiParams] {
  return ["menu", "view", params];
}

export function useMenuQuery(params: MenuApiParams = {}) {
  return useAppQuery<MenuViewModel, MenuViewModel, readonly ["menu", "view", MenuApiParams]>({
    queryKey: menuViewQueryKey(params),
    queryFn: () => fetchMenu(params),
    staleTime: MENU_STALE_MS,
    gcTime: MENU_GC_MS,
  });
}
