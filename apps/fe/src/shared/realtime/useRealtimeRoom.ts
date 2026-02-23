import { useEffect } from "react";
import { getRealtimeContext, joinRoom, startRealtime } from "./realtimeManager";
import type { RealtimeContext } from "./types";

/**
 * Hook để feature đăng ký 1 room theo vòng đời page.
 * - Không connect/disconnect theo mount/unmount.
 * - Nếu truyền ctx, hook sẽ best-effort start socket (chỉ khi chưa start hoặc cùng kind).
 */
export function useRealtimeRoom(
  room: string | null,
  enabled: boolean,
  ctxOverride?: RealtimeContext
) {
  // Pull primitives out for stable deps (avoid exhaustive-deps warning).
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
  }, [enabled, room, kind, userKey, branchId, token]);
}
