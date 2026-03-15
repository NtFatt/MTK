import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  getObservabilitySlowQueries,
  type ObservabilityResult,
} from "../services/observabilityApi";

type SlowQueriesQueryKey = ReturnType<typeof qk.observability.slowQueries>;

export function useObservabilitySlowQueriesQuery(
  branchId: string | number | undefined,
  enabled: boolean,
) {
  return useAppQuery<ObservabilityResult, ObservabilityResult, SlowQueriesQueryKey>({
    queryKey: qk.observability.slowQueries({ branchId }),
    queryFn: () => getObservabilitySlowQueries(),
    enabled,
    staleTime: 10_000,
  });
}