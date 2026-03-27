import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../../shared/http/useAppQuery";
import { fetchOpsTables, type OpsTableDto } from "../services/opsTablesApi";

const STALE_MS = 3 * 1000;
const FALLBACK_REFRESH_MS = 15 * 1000;
type OpsTablesQK = ReturnType<typeof qk.ops.tables.list>;

export function useOpsTablesQuery(branchId: string | number, enabled: boolean) {
  return useAppQuery<OpsTableDto[], OpsTableDto[], OpsTablesQK>({
    queryKey: qk.ops.tables.list({ branchId }),
    queryFn: () => fetchOpsTables({ branchId }),
    enabled: enabled && branchId != null && String(branchId).length > 0,
    staleTime: STALE_MS,
    // Socket realtime should be the primary driver; keep a light safety-net only.
    refetchInterval: enabled && branchId != null && String(branchId).length > 0 ? FALLBACK_REFRESH_MS : false,
    refetchIntervalInBackground: true,
  });
}
