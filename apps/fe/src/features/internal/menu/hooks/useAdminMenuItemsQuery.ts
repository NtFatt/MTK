import {
  useAppQuery,
  type UseAppQueryOptions,
} from "../../../../shared/http/useAppQuery";
import {
  fetchAdminMenuItems,
  type AdminMenuItemsQuery,
  type AdminMenuItemsResult,
} from "../services/adminMenuApi";

function adminMenuItemsQueryKey(params: AdminMenuItemsQuery = {}) {
  return ["admin", "menu", "items", params] as const;
}

type AdminMenuItemsQueryOptions = Omit<
  UseAppQueryOptions<
    AdminMenuItemsResult,
    unknown,
    AdminMenuItemsResult,
    ReturnType<typeof adminMenuItemsQueryKey>
  >,
  "queryKey" | "queryFn"
>;

export function useAdminMenuItemsQuery(
  params: AdminMenuItemsQuery = {},
  options: AdminMenuItemsQueryOptions = {},
) {
  return useAppQuery<
    AdminMenuItemsResult,
    AdminMenuItemsResult,
    ReturnType<typeof adminMenuItemsQueryKey>
  >({
    ...options,
    queryKey: adminMenuItemsQueryKey(params),
    queryFn: () => fetchAdminMenuItems(params),
    staleTime: 5_000,
    gcTime: 5 * 60 * 1000,
  });
}
