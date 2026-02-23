import { useAppQuery } from "../../../shared/http/useAppQuery";
import { qk } from "@hadilao/contracts";
import { getSession } from "./sessionApi";

const STALE_MS = 30 * 1000;

export function useSessionQuery(sessionKey: string | null) {
  return useAppQuery({
    queryKey: qk.sessions.detail(sessionKey ?? ""),
    queryFn: () => getSession(sessionKey!),
    enabled: !!sessionKey,
    staleTime: STALE_MS,
  });
}
