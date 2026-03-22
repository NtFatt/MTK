import { useEffect, useMemo, useState } from "react";

import type { AuthSession } from "../../../../shared/auth/types";
import {
  getRealtimeStatus,
  subscribeRealtime,
  type EventEnvelope,
  type SocketStatus,
  useRealtimeRoom,
} from "../../../../shared/realtime";

function extractBranchIdFromRealtime(env: EventEnvelope): string | null {
  const prefixes = ["kitchen:", "branch:", "ops:"];
  for (const prefix of prefixes) {
    if (env.room.startsWith(prefix)) {
      const rest = env.room.slice(prefix.length).trim();
      if (rest) return rest;
    }
  }

  const scope =
    env.scope && typeof env.scope === "object"
      ? (env.scope as Record<string, unknown>)
      : null;
  const payload =
    env.payload && typeof env.payload === "object"
      ? (env.payload as Record<string, unknown>)
      : null;
  const raw = scope?.branchId ?? scope?.branch_id ?? payload?.branchId ?? payload?.branch_id;
  return raw != null && String(raw).trim() ? String(raw).trim() : null;
}

function extractOrderCode(env: EventEnvelope): string | null {
  if (env.room.startsWith("order:")) {
    const raw = env.room.slice("order:".length).trim();
    if (raw) return raw;
  }

  const scope =
    env.scope && typeof env.scope === "object"
      ? (env.scope as Record<string, unknown>)
      : null;
  const payload =
    env.payload && typeof env.payload === "object"
      ? (env.payload as Record<string, unknown>)
      : null;
  const raw = scope?.orderCode ?? scope?.order_code ?? payload?.orderCode ?? payload?.order_code;
  return raw != null && String(raw).trim() ? String(raw).trim() : null;
}

function isKitchenRealtimeEvent(env: EventEnvelope, branchId: string): boolean {
  if (!branchId) return false;
  if (env.type === "realtime.gap" && env.room.startsWith(`kitchen:${branchId}`)) return true;
  if (env.room.startsWith(`kitchen:${branchId}`)) return true;

  const branchFromEvent = extractBranchIdFromRealtime(env);
  if (branchFromEvent !== branchId) return false;

  return (
    env.type === "order.created" ||
    env.type === "order.updated" ||
    env.type === "order.status_changed" ||
    env.type === "order.status.changed" ||
    env.type === "order.statusChanged"
  );
}

type UseKitchenRealtimeInput = {
  branchId: string;
  enabled: boolean;
  session: AuthSession | null;
  refetch: () => Promise<unknown> | void;
};

export function useKitchenRealtime({
  branchId,
  enabled,
  session,
  refetch,
}: UseKitchenRealtimeInput) {
  useRealtimeRoom(
    branchId ? `kitchen:${branchId}` : null,
    enabled && !!branchId,
    session
      ? {
          kind: "internal",
          userKey: session.user?.id ? String(session.user.id) : "internal",
          branchId: branchId || (session.branchId != null ? String(session.branchId) : undefined),
          token: session.accessToken,
        }
      : undefined,
  );

  const [status, setStatus] = useState<SocketStatus>(() => getRealtimeStatus().status);
  const [lastError, setLastError] = useState<string | null>(() => getRealtimeStatus().lastError);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [updatedAtByOrder, setUpdatedAtByOrder] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => {
      const next = getRealtimeStatus();
      setStatus(next.status);
      setLastError(next.lastError);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !branchId) return;

    let timer: number | null = null;
    const unsubscribe = subscribeRealtime((env) => {
      if (!isKitchenRealtimeEvent(env, branchId)) return;

      const nowIso = new Date().toISOString();
      const orderCode = extractOrderCode(env);

      setLastEventAt(nowIso);
      if (orderCode) {
        setUpdatedAtByOrder((prev) => ({ ...prev, [orderCode]: nowIso }));
      }

      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void Promise.resolve(refetch()).finally(() => {
          setLastSyncedAt(new Date().toISOString());
        });
      }, 90);
    });

    return () => {
      if (timer) window.clearTimeout(timer);
      unsubscribe();
    };
  }, [branchId, enabled, refetch]);

  useEffect(() => {
    const cleanup = window.setInterval(() => {
      const cutoff = Date.now() - 2 * 60_000;
      setUpdatedAtByOrder((prev) => {
        let changed = false;
        const next: Record<string, string> = {};

        for (const [orderCode, iso] of Object.entries(prev)) {
          const ts = Date.parse(iso);
          if (Number.isFinite(ts) && ts >= cutoff) {
            next[orderCode] = iso;
          } else {
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 30_000);

    return () => window.clearInterval(cleanup);
  }, []);

  const recentlyUpdatedOrderCodes = useMemo(
    () => new Set(Object.keys(updatedAtByOrder)),
    [updatedAtByOrder],
  );

  return {
    connectionStatus: status,
    lastError,
    lastSyncedAt,
    lastEventAt,
    recentlyUpdatedOrderCodes,
  };
}
