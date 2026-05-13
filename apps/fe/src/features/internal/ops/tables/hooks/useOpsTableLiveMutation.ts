import { useMemo } from "react";

import { useAppMutation } from "../../../../../shared/http/useAppMutation";
import {
  loadOpsTableLiveDetail,
  OPS_TABLE_NO_SESSION_ERROR,
  type LoadOpsTableLiveInput,
  type OpsTableLiveDetail,
} from "../services/opsTableLiveApi";
import { useOpsMenuQuery } from "./useOpsMenuQuery";

export { OPS_TABLE_NO_SESSION_ERROR };

export type OpsTableLiveInfo = OpsTableLiveDetail;

type UseOpsTableLiveMutationOptions = {
  onSuccess?: (data: OpsTableLiveInfo) => void;
};

export function useOpsTableLiveMutation(
  branchId: string | number | undefined,
  enabled: boolean,
  options: UseOpsTableLiveMutationOptions = {},
) {
  const menuQuery = useOpsMenuQuery(branchId, enabled);
  const menuItemsById = useMemo(
    () => new Map((menuQuery.data ?? []).map((item) => [item.id, item.name])),
    [menuQuery.data],
  );

  return useAppMutation<OpsTableLiveInfo, unknown, LoadOpsTableLiveInput>({
    mutationFn: async (input) => {
      const liveDetail = await loadOpsTableLiveDetail(input);

      return {
        ...liveDetail,
        items: liveDetail.items.map((item) => ({
          ...item,
          name: item.name ?? menuItemsById.get(String(item.itemId)) ?? undefined,
        })),
      };
    },
    onSuccess: options.onSuccess,
  });
}
