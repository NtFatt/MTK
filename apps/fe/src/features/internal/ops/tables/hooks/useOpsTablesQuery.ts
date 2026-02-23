import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../../shared/http/useAppQuery";
import { fetchOpsTables, type OpsTableDto } from "../services/opsTablesApi";

const STALE_MS = 3 * 1000;
type OpsTablesQK = ReturnType<typeof qk.ops.tables.list>;

export function useOpsTablesQuery(branchId: string | number | undefined, enabled: boolean) {
  return useAppQuery<OpsTableDto[], OpsTableDto[], OpsTablesQK>({
    queryKey: qk.ops.tables.list({ branchId }),
    queryFn: () => fetchOpsTables({ branchId: branchId! }),
    enabled: enabled && branchId != null && String(branchId).length > 0,
    staleTime: STALE_MS,
  });
}