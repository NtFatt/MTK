import { useEffect } from "react";
import { getRealtimeContext, joinRoom, leaveRoom, startRealtime } from "./realtimeManager";
import type { RealtimeContext } from "./types";

export function useRealtimeRoom(
  room: string | null,
  enabled: boolean,
  ctxOverride?: RealtimeContext
) {
  const kind = ctxOverride?.kind;
  const userKey = ctxOverride?.userKey;
  const branchId = ctxOverride?.branchId;
  const token = ctxOverride?.token;

  useEffect(() => {
    if (!enabled || !room) return;

    const current = getRealtimeContext();
    const hasOverride = !!(kind && userKey);
    const needStart = hasOverride && (current == null || current.kind === kind);

    if (needStart) {
      void startRealtime({ kind: kind!, userKey: userKey!, branchId, token });
    }

    void joinRoom(room);

    return () => {
      void leaveRoom(room);
    };
  }, [enabled, room, kind, userKey, branchId, token]);
}