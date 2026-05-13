/**
 * useOpsMenuQuery.ts
 *
 * Query hook for fetching menu items used in Internal Ops (Tables page).
 * Menu items are used to resolve item names from cart previews.
 *
 * Pattern: mirrors useOpsTablesQuery.ts — service → hook → component.
 */

import { qk } from "@duong-hanh-phuc/contracts";
import { useAppQuery } from "../../../../../shared/http/useAppQuery";
import { fetchOpsMenuItems, type MenuItemDto } from "../services/opsMenuApi";

type OpsMenuQK = ReturnType<typeof qk.menu.items>;

export function useOpsMenuQuery(branchId: string | number | undefined, enabled: boolean) {
  return useAppQuery<MenuItemDto[], MenuItemDto[], OpsMenuQK>({
    queryKey: qk.menu.items({ branchId }),
    queryFn: () => fetchOpsMenuItems({ branchId }),
    enabled: enabled && branchId != null && String(branchId).length > 0,
    staleTime: 30 * 1000,
  });
}
