import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  getRealtimeReplay,
  type RealtimeAdminResult,
  type RealtimeReplayInput,
} from "../services/realtimeAdminApi";

type ReplayQueryKey = ReturnType<typeof qk.realtime.replay>;

export function useRealtimeReplayQuery(
  branchId: string | number | undefined,
  input: RealtimeReplayInput | null,
  enabled: boolean,
) {
  return useAppQuery<RealtimeAdminResult, RealtimeAdminResult, ReplayQueryKey>({
    queryKey: qk.realtime.replay({
      branchId,
      room: input?.room,
      fromSeq: input?.fromSeq,
      limit: input?.limit,
    }),
    queryFn: () => {
      if (!input) return Promise.resolve(null);
      return getRealtimeReplay(input);
    },
    enabled,
    staleTime: 0,
  });
}