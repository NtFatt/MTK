import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  getObservabilityLogs,
  type ObservabilityResult,
} from "../services/observabilityApi";

type LogsQueryKey = ReturnType<typeof qk.observability.logs>;

export function useObservabilityLogsQuery(
  branchId: string | number | undefined,
  enabled: boolean,
) {
  return useAppQuery<ObservabilityResult, ObservabilityResult, LogsQueryKey>({
    queryKey: qk.observability.logs({ branchId }),
    queryFn: () => getObservabilityLogs(),
    enabled,
    staleTime: 10_000,
  });
}