import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  getRealtimeAudit,
  type RealtimeAdminResult,
} from "../services/realtimeAdminApi";

type AuditQueryKey = ReturnType<typeof qk.realtime.audit>;

export function useRealtimeAuditQuery(
  branchId: string | number | undefined,
  enabled: boolean,
) {
  return useAppQuery<RealtimeAdminResult, RealtimeAdminResult, AuditQueryKey>({
    queryKey: qk.realtime.audit({ branchId }),
    queryFn: () => getRealtimeAudit(),
    enabled,
    staleTime: 10_000,
  });
}