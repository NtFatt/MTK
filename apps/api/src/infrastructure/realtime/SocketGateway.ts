import type { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";

import type { IEventBus } from "../../application/ports/events/IEventBus.js";
import type { DomainEvent } from "../../application/ports/events/DomainEvent.js";
import type { IOrderRepository } from "../../application/ports/repositories/IOrderRepository.js";
import type { ITableSessionRepository } from "../../application/ports/repositories/ITableSessionRepository.js";
import type { IRealtimeAdminAuditRepository } from "../../application/ports/repositories/IRealtimeAdminAuditRepository.js";

import { env } from "../config/env.js";
import { log } from "../observability/logger.js";
import { verifyClientSessionKey } from "../security/sessionKey.js";
import { verifyInternalToken } from "../security/token.js";
import { pool } from "../db/mysql/connection.js";
import type { RedisClient } from "../redis/redisClient.js";
import {
  InMemoryRoomEventStore,
  RedisRoomEventStore,
  type IRoomEventStore,
  type RealtimeEnvelopeV1,
  type ReplayWindow,
} from "./RoomEventStore.js";
import { InMemoryRoomSequencer, RedisRoomSequencer, type IRoomSequencer } from "./RoomSequencer.js";

type InternalCtx = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export type SocketGatewayDeps = {
  orderRepo: IOrderRepository;
  sessionRepo: ITableSessionRepository;
  /** Optional Redis client (enables shared sequencer + replay store) */
  redis?: RedisClient;
  /** Optional: persist admin room audit in MySQL */
  adminAuditRepo?: IRealtimeAdminAuditRepository;
};

// ===== Room policy =====

const ROOM_MAX_LEN = 150;

function normalizeRoom(room: string): string {
  const r = String(room ?? "").trim();
  // Backward-compat alias: sessionId:<id> -> session:<id>
  if (r.startsWith("sessionId:")) return `session:${r.slice("sessionId:".length)}`;
  return r;
}

function isRoomAllowed(roomRaw: string): boolean {
  const room = normalizeRoom(roomRaw);
  if (!room) return false;
  if (room.length > ROOM_MAX_LEN) return false;
  if (room === "admin" || room === "global") return true;
  if (room.startsWith("sessionKey:")) return true;
  if (room.startsWith("session:")) return true;
  if (room.startsWith("order:")) return true;
  if (room.startsWith("branch:")) return true;
  if (room.startsWith("kitchen:")) return true;
  if (room.startsWith("cashier:")) return true;
  return false;
}

function decodeInternal(token: unknown): InternalCtx | null {
  if (!token || typeof token !== "string") return null;
  if (!env.ADMIN_TOKEN_SECRET) return null;
  try {
    const p = verifyInternalToken(token, env.ADMIN_TOKEN_SECRET);
    return {
      actorType: p.actorType,
      role: p.role,
      branchId: p.branchId !== undefined ? (p.branchId === null ? null : String(p.branchId)) : null,
      userId: String(p.sub),
      username: String(p.username),
    };
  } catch {
    return null;
  }
}

async function getSessionBranchId(sessionId: string): Promise<string | null> {
  // table_sessions does NOT carry branch_id; it lives on restaurant_tables.
  const [rows]: any = await pool.query(
    `SELECT rt.branch_id
     FROM table_sessions s
     JOIN restaurant_tables rt ON rt.table_id = s.table_id
     WHERE s.session_id = ?
     LIMIT 1`,
    [sessionId],
  );
  const r = rows?.[0];
  return r?.branch_id ? String(r.branch_id) : null;
}

function getJoinedSessionKey(socket: Socket): string | null {
  for (const r of socket.rooms) {
    if (typeof r === "string" && r.startsWith("sessionKey:")) return r.slice("sessionKey:".length);
  }
  return null;
}

async function authorizeJoinRoom(input: {
  room: string;
  internal: InternalCtx | null;
  socket: Socket;
  deps: SocketGatewayDeps;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const room = normalizeRoom(input.room);
  if (!isRoomAllowed(room)) return { ok: false, code: "ROOM_INVALID" };

  const internal = input.internal;
  const isAdmin = internal?.actorType === "ADMIN";
  const isStaff = internal?.actorType === "STAFF";

  // admin/global
  if (room === "admin" || room === "global") {
    if (!isAdmin) return { ok: false, code: "FORBIDDEN" };
    return { ok: true };
  }

  // branch
  if (room.startsWith("branch:")) {
    const branchId = room.slice("branch:".length);
    if (!branchId) return { ok: false, code: "ROOM_INVALID" };
    if (isAdmin) return { ok: true };
    if (isStaff && internal?.branchId && String(internal.branchId) === String(branchId)) return { ok: true };
    return { ok: false, code: "BRANCH_FORBIDDEN" };
  }

  // kitchen: internal-only (KITCHEN or BRANCH_MANAGER) scoped by branch
  if (room.startsWith("kitchen:")) {
    const branchId = room.slice("kitchen:".length);
    if (!branchId) return { ok: false, code: "ROOM_INVALID" };
    if (!internal) return { ok: false, code: "INTERNAL_REQUIRED" };
    if (isAdmin) return { ok: true };

    if (isStaff) {
      if (!internal.branchId || String(internal.branchId) !== String(branchId)) return { ok: false, code: "BRANCH_FORBIDDEN" };
      const role = String(internal.role ?? "").toUpperCase();
      if (role === "KITCHEN" || role === "BRANCH_MANAGER") return { ok: true };
      return { ok: false, code: "ROLE_FORBIDDEN" };
    }

    return { ok: false, code: "FORBIDDEN" };
  }

  // cashier: internal-only (CASHIER or BRANCH_MANAGER) scoped by branch
  if (room.startsWith("cashier:")) {
    const branchId = room.slice("cashier:".length);
    if (!branchId) return { ok: false, code: "ROOM_INVALID" };
    if (!internal) return { ok: false, code: "INTERNAL_REQUIRED" };
    if (isAdmin) return { ok: true };

    if (isStaff) {
      if (!internal.branchId || String(internal.branchId) !== String(branchId)) return { ok: false, code: "BRANCH_FORBIDDEN" };
      const role = String(internal.role ?? "").toUpperCase();
      if (role === "CASHIER" || role === "BRANCH_MANAGER") return { ok: true };
      return { ok: false, code: "ROLE_FORBIDDEN" };
    }

    return { ok: false, code: "FORBIDDEN" };
  }

  // sessionKey: public (client + internal)
  if (room.startsWith("sessionKey:")) {
    const sessionKey = room.slice("sessionKey:".length);
    if (!verifyClientSessionKey(sessionKey)) return { ok: false, code: "SESSION_INVALID" };
    return { ok: true };
  }

  // session: internal-only; staff must match branch
  if (room.startsWith("session:")) {
    const sessionId = room.slice("session:".length);
    if (!sessionId) return { ok: false, code: "ROOM_INVALID" };
    if (!internal) return { ok: false, code: "INTERNAL_REQUIRED" };
    if (isAdmin) return { ok: true };

    if (!internal.branchId) return { ok: false, code: "BRANCH_FORBIDDEN" };
    const sessionBranchId = await getSessionBranchId(sessionId);
    if (!sessionBranchId) return { ok: false, code: "SESSION_NOT_FOUND" };
    if (String(sessionBranchId) === String(internal.branchId)) return { ok: true };
    return { ok: false, code: "BRANCH_FORBIDDEN" };
  }

  // order:
  // - ADMIN: ok
  // - STAFF: must match order.branch_id
  // - CLIENT: must have joined sessionKey:<uuid> AND order.session_id matches that sessionKey
  if (room.startsWith("order:")) {
    const orderId = room.slice("order:".length);
    if (!orderId) return { ok: false, code: "ROOM_INVALID" };
    if (isAdmin) return { ok: true };

    let scope = await input.deps.orderRepo.getRealtimeScopeByOrderId(orderId);
    if (!scope) scope = await input.deps.orderRepo.getRealtimeScopeByOrderCode(orderId);
    if (!scope) return { ok: false, code: "ORDER_NOT_FOUND" };

    if (isStaff) {
      if (!internal?.branchId || !scope.branchId) return { ok: false, code: "BRANCH_FORBIDDEN" };
      if (String(scope.branchId) === String(internal.branchId)) return { ok: true };
      return { ok: false, code: "BRANCH_FORBIDDEN" };
    }

    // client path
    const sessionKey = getJoinedSessionKey(input.socket);
    if (!sessionKey) return { ok: false, code: "SESSION_REQUIRED" };
    if (!verifyClientSessionKey(sessionKey)) return { ok: false, code: "SESSION_INVALID" };
    if (!scope.sessionId) return { ok: false, code: "ORDER_SESSION_MISSING" };

    const s = await input.deps.sessionRepo.findBySessionKey(sessionKey);
    if (!s) return { ok: false, code: "SESSION_NOT_FOUND" };
    if (String(s.id) !== String(scope.sessionId)) return { ok: false, code: "ORDER_FORBIDDEN" };
    return { ok: true };
  }

  return { ok: false, code: "ROOM_FORBIDDEN" };
}

function clampReplayLimit(limit: unknown): number {
  const req = Number(limit ?? 0);
  const hardMax = env.REALTIME_REPLAY_MAX_LIMIT;
  if (!Number.isFinite(req) || req <= 0) return Math.min(200, hardMax);
  return Math.min(Math.max(1, Math.floor(req)), hardMax);
}

function isSeqGap(lastSeq: number, window: ReplayWindow): boolean {
  if (!Number.isFinite(lastSeq)) return false;
  if (!window || window.earliestSeq <= 0) return false;
  return lastSeq < window.earliestSeq - 1;
}

function gapPayload(room: string, lastSeq: number, window: ReplayWindow) {
  const base = {
    room,
    lastSeq,
    window,
    suggestedLastSeq: window.currentSeq,
  };

  if (room === "admin") {
    return {
      ...base,
      resync: {
        adminReplayGet: "/api/v1/admin/realtime/replay",
        suggestedFromSeq: window.earliestSeq,
        suggestedLastSeq: window.currentSeq,
      },
    };
  }

  if (room.startsWith("branch:")) {
    return {
      ...base,
      resync: {
        supported: false,
        note: "No branch snapshot endpoint yet. Fallback: refetch branch views via REST endpoints.",
      },
    };
  }

  return {
    ...base,
    resync: {
      snapshotGet: `/api/v1/realtime/snapshot?room=${encodeURIComponent(room)}`,
      resyncBatchPost: "/api/v1/realtime/resync",
      suggestedLastSeq: window.currentSeq,
    },
  };
}

type JoinRoomReq = { room: string; lastSeq?: number };
type JoinV1Payload = {
  rooms?: JoinRoomReq[];
  /** Legacy name */
  adminToken?: string;
  /** Preferred */
  internalToken?: string;
  replayLimit?: number;
  /** Backward compat: shortcut to join sessionKey:<uuid> */
  sessionKey?: string;
};

type ReplayReqV1Payload = {
  room: string;
  fromSeq: number;
  limit?: number;
  adminToken?: string;
  internalToken?: string;
};

function pickStoreAndSequencer(deps: SocketGatewayDeps): { store: IRoomEventStore; seq: IRoomSequencer } {
  const canReplay = Boolean(env.REALTIME_REPLAY_ENABLED);
  const hasRedis = Boolean(deps.redis);
  const seq = hasRedis ? new RedisRoomSequencer(deps.redis!) : new InMemoryRoomSequencer();
  const store = canReplay
    ? hasRedis
      ? new RedisRoomEventStore(deps.redis!, {
        ttlSeconds: env.REALTIME_REPLAY_TTL_SECONDS,
        maxItems: env.REALTIME_REPLAY_MAX_ITEMS,
      })
      : new InMemoryRoomEventStore({ maxItems: env.REALTIME_REPLAY_MAX_ITEMS })
    : new InMemoryRoomEventStore({ maxItems: 1 });
  return { store, seq };
}

function roomsForEvent(evt: DomainEvent): string[] {
  const out: string[] = [];
  const scope: any = evt?.scope ?? {};
  const payload: any = (evt as any)?.payload ?? {};

  if (scope?.sessionKey) out.push(`sessionKey:${String(scope.sessionKey)}`);
  if (scope?.sessionId) out.push(`session:${String(scope.sessionId)}`);

  // Order room: prefer orderCode (spec), keep legacy orderId for backward compat
  if (payload?.orderCode) out.push(`order:${String(payload.orderCode)}`);
  if (scope?.orderId) out.push(`order:${String(scope.orderId)}`);

  if (scope?.branchId) {
    const branchId = String(scope.branchId);
    out.push(`branch:${branchId}`);

    // Ops rooms by role
    const t = String(evt?.type ?? "");
    if (t.startsWith("order.")) out.push(`kitchen:${branchId}`);
    if (t.startsWith("payment.")) out.push(`cashier:${branchId}`);
  }

  // Always feed admin room for operational dashboards (audit + monitoring).
  out.push("admin");

  // De-dup while preserving order.
  return Array.from(new Set(out.map(normalizeRoom).filter(isRoomAllowed)));
}

export function attachSocketGateway(io: Server, eventBus: IEventBus, deps: SocketGatewayDeps) {
  const { store, seq } = pickStoreAndSequencer(deps);

  // ===== Broadcast hook (publisher instance only) =====
  // IMPORTANT:
  // - We generate per-room seq + replay log items here.
  // - For multi-instance, use socket.io redis-adapter; do NOT broadcast the same domain event
  //   from every instance or seq/log will diverge.
  const origPublish = eventBus.publish.bind(eventBus);
  (eventBus as any).publish = async (evt: DomainEvent) => {
    await origPublish(evt);
    try {
      const rooms = roomsForEvent(evt);
      if (rooms.length === 0) return;

      const eventId = String((evt as any)?.meta?.eventId ?? randomUUID());
      const at = String(evt?.at ?? new Date().toISOString());

      for (const room of rooms) {
        const nextSeq = await seq.next(room);
        const envelope: RealtimeEnvelopeV1 = {
          v: env.REALTIME_EVENT_VERSION,
          room,
          seq: nextSeq,
          event: String(evt.type),
          at,
          meta: { ...(evt.meta ?? {}), eventId },
          data: { scope: evt.scope ?? null, payload: evt.payload ?? null },
        };

        if (env.REALTIME_REPLAY_ENABLED) await store.append(room, nextSeq, envelope);

        // v1 stream
        io.to(room).emit("realtime:event.v1", envelope);

        // legacy stream
        io.to(room).emit("event", {
          type: evt.type,
          at,
          scope: evt.scope ?? null,
          payload: evt.payload ?? null,
          meta: { ...(evt.meta ?? {}), eventId },
        });

        // admin audit (MySQL) - only for admin room
        if (room === "admin" && deps.adminAuditRepo && env.REALTIME_ADMIN_AUDIT_ENABLED) {
          await deps.adminAuditRepo.appendAdminEvent({
            room,
            eventId,
            version: env.REALTIME_EVENT_VERSION,
            seq: nextSeq,
            type: String(evt.type),
            at,
            scope: evt.scope ?? null,
            payload: evt.payload ?? null,
            meta: { ...(evt.meta ?? {}), eventId },
          });
        }
      }
    } catch (e: any) {
      log.warn("realtime.broadcast.failed", { error: String(e?.message ?? e) });
    }
  };

  // ===== Socket handlers =====
  io.on("connection", (socket: Socket) => {
    // Correlation id for logs
    (socket.data as any).cid = randomUUID();

    const logBase = (extra: Record<string, any>) => ({
      sid: socket.id,
      cid: (socket.data as any).cid,
      ...extra,
    });

    socket.emit("realtime:hello.v1", {
      v: 1,
      eventVersion: env.REALTIME_EVENT_VERSION,
      replay: {
        enabled: Boolean(env.REALTIME_REPLAY_ENABLED),
        maxLimit: env.REALTIME_REPLAY_MAX_LIMIT,
        maxItems: env.REALTIME_REPLAY_MAX_ITEMS,
        ttlSeconds: env.REALTIME_REPLAY_TTL_SECONDS,
      },
      rooms: {
        allowed: ["admin", "branch:<branchId>", "order:<orderCode>", "order:<orderId>", "session:<sessionId>", "sessionKey:<sessionKey>", "kitchen:<branchId>", "cashier:<branchId>"],
        aliases: ["sessionId:<sessionId> -> session:<sessionId>"],
      },
      events: {
        join: "realtime:join.v1",
        replayRequest: "realtime:replay.request.v1",
        stream: "realtime:event.v1",
        replay: "realtime:replay.v1",
        gap: "realtime:gap.v1",
      },
    });

    const handleJoinV1 = async (payload: JoinV1Payload, ack?: Function) => {
      try {
        const internal = decodeInternal(payload?.internalToken ?? payload?.adminToken);
        if (internal) (socket.data as any).internal = internal;

        const joined: string[] = [];
        const rejected: Array<{ room: string; code: string }> = [];

        const rooms: JoinRoomReq[] = [];
        const inputRooms = Array.isArray(payload?.rooms) ? payload.rooms : [];
        for (const r of inputRooms) rooms.push(r);

        // Backward-compat shortcut
        const sessionKey = typeof payload?.sessionKey === "string" ? payload.sessionKey.trim() : "";
        if (sessionKey) rooms.push({ room: `sessionKey:${sessionKey}`, lastSeq: 0 });

        const replayLimit = clampReplayLimit(payload?.replayLimit);

        for (const entry of rooms) {
          const rawRoom = String(entry?.room ?? "").trim();
          const room = normalizeRoom(rawRoom);
          if (!room) continue;

          const res = await authorizeJoinRoom({
            room,
            internal: (socket.data as any).internal ?? null,
            socket,
            deps,
          });

          if (!res.ok) {
            rejected.push({ room, code: res.code });
            continue;
          }

          await socket.join(room);
          joined.push(room);
          socket.emit("joined", { room }); // legacy

          // Optional replay on join
          const lastSeq = Number(entry?.lastSeq ?? NaN);
          if (env.REALTIME_REPLAY_ENABLED && Number.isFinite(lastSeq)) {
            const window = await store.getWindow(room);
            if (isSeqGap(lastSeq, window)) {
              socket.emit("realtime:gap.v1", gapPayload(room, lastSeq, window));
            } else {
              const items = await store.replayAfter(room, lastSeq, replayLimit);
              socket.emit("realtime:replay.v1", {
                room,
                fromSeq: lastSeq,
                count: items.length,
                window,
                items,
              });
            }
          }
        }

        if (ack) ack({ ok: true, joined, rejected });
        log.info("socket.realtime_join_v1", logBase({ joinedCount: joined.length, rejectedCount: rejected.length }));
      } catch (e: any) {
        log.warn("socket.realtime_join_v1.failed", logBase({ error: String(e?.message ?? e) }));
        if (ack) ack({ ok: false, error: "JOIN_FAILED" });
      }
    };

    const handleReplayRequestV1 = async (payload: ReplayReqV1Payload, ack?: Function) => {
      try {
        const room = normalizeRoom(String(payload?.room ?? "").trim());
        if (!isRoomAllowed(room)) {
          if (ack) ack({ ok: false, error: "ROOM_INVALID" });
          return;
        }

        // allow caller to provide internal token per-request
        const internal =
          decodeInternal(payload?.internalToken ?? payload?.adminToken) ?? (socket.data as any).internal ?? null;
        if (internal) (socket.data as any).internal = internal;

        const authz = await authorizeJoinRoom({ room, internal, socket, deps });
        if (!authz.ok) {
          if (ack) ack({ ok: false, error: authz.code });
          return;
        }

        const fromSeq = Number(payload?.fromSeq ?? 0);
        const limit = clampReplayLimit(payload?.limit);

        const window = await store.getWindow(room);
        if (env.REALTIME_REPLAY_ENABLED && isSeqGap(fromSeq, window)) {
          const g = gapPayload(room, fromSeq, window);
          socket.emit("realtime:gap.v1", g);
          if (ack) ack({ ok: false, error: "SEQ_GAP", gap: g });
          return;
        }

        const items = env.REALTIME_REPLAY_ENABLED ? await store.replayAfter(room, fromSeq, limit) : [];
        if (ack) ack({ ok: true, room, fromSeq, count: items.length, window, items });
      } catch (e: any) {
        log.warn("socket.realtime_replay_request_v1.failed", logBase({ error: String(e?.message ?? e) }));
        if (ack) ack({ ok: false, error: "REPLAY_FAILED" });
      }
    };

    socket.on("realtime:join.v1", handleJoinV1);

    socket.on("realtime:replay.request.v1", handleReplayRequestV1);

    // ===== Legacy compatibility =====
    socket.on("join", async (payload: any, ack?: Function) => {
      // payload: { sessionKey?, adminToken?, internalToken?, admin?, branchId?, sessionId?, orderId? }
      const rooms: JoinRoomReq[] = [];

      if (payload?.admin === true) rooms.push({ room: "admin", lastSeq: 0 });
      if (payload?.branchId) rooms.push({ room: `branch:${String(payload.branchId)}`, lastSeq: 0 });
      if (payload?.sessionId) rooms.push({ room: `session:${String(payload.sessionId)}`, lastSeq: 0 });
      if (payload?.orderId) rooms.push({ room: `order:${String(payload.orderId)}`, lastSeq: 0 });
      if (payload?.orderCode) rooms.push({ room: `order:${String(payload.orderCode)}`, lastSeq: 0 });
      if (payload?.sessionKey) rooms.push({ room: `sessionKey:${String(payload.sessionKey)}`, lastSeq: 0 });

      await handleJoinV1(
        {
          rooms,
          internalToken: payload?.internalToken,
          adminToken: payload?.adminToken,
          replayLimit: payload?.replayLimit,
        },
        ack,
      );
    });

    socket.on("realtime:replay.request", async (payload: any, ack?: Function) => {
      await handleReplayRequestV1(
        {
          room: payload?.room,
          fromSeq: payload?.fromSeq ?? 0,
          limit: payload?.limit,
          internalToken: payload?.internalToken,
          adminToken: payload?.adminToken,
        },
        ack,
      );
    });

    socket.on("disconnect", () => {
      // no-op
    });
  });
}
