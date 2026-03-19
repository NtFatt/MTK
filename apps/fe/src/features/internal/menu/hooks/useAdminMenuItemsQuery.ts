import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  fetchAdminMenuItems,
  type AdminMenuItemsQuery,
  type AdminMenuItemsResult,
} from "../services/adminMenuApi";

function adminMenuItemsQueryKey(params: AdminMenuItemsQuery = {}) {
  return ["admin", "menu", "items", params] as const;
}

export function useAdminMenuItemsQuery(params: AdminMenuItemsQuery = {}) {
  return useAppQuery<
    AdminMenuItemsResult,
    AdminMenuItemsResult,
    ReturnType<typeof adminMenuItemsQueryKey>
  >({
    queryKey: adminMenuItemsQueryKey(params),
    queryFn: () => fetchAdminMenuItems(params),
    staleTime: 5_000,
    gcTime: 5 * 60 * 1000,
  });
}