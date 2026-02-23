import { useAppQuery } from "../../../../../shared/http/useAppQuery";
import { fetchOpsTables, type OpsTableDto } from "../services/opsTablesApi";
import { opsTablesQueryKey } from "./queryKeys";

const STALE_MS = 3 * 1000;

export function useOpsTablesQuery(branchId: string | number | undefined, enabled: boolean) {
  return useAppQuery<OpsTableDto[], OpsTableDto[], ReturnType<typeof opsTablesQueryKey>>({
    queryKey: opsTablesQueryKey({ branchId: branchId ?? "" }),
    queryFn: () => fetchOpsTables({ branchId: branchId! }),
    enabled: enabled && branchId != null && String(branchId).length > 0,
    staleTime: STALE_MS,
  });
}
