import type { Socket } from "socket.io-client";

import { getCursor, setCursor } from "./cursorStore";
import { normalizeEnvelope, type EventEnvelope, type RealtimeContext, type SocketStatus } from "./types";
import { getSocket, applySocketAuth, destroySocket } from "./socketClient";
import { joinV1, replayV1 } from "./joinReplay";
import { routeRealtimeEvent } from "./eventRouter";

type Listener = (env: EventEnvelope) => void;

let socket: Socket | null = null;
let status: SocketStatus = "DISCONNECTED";
let lastError: string | null = null;
let ctx: RealtimeContext | null = null;

const joinedRooms = new Set<string>();
const joining = new Map<string, Promise<void>>();
const listeners = new Set<Listener>();

let wired = false;

function wireSocket(s: Socket) {
  if (wired) return;
  wired = true;

  s.on("connect", () => {
    status = "CONNECTED";
    lastError = null;
    // Re-join rooms best-effort (and replay per room)
    for (const room of joinedRooms) {
      joinRoom(room).catch(() => {});
    }
  });

  s.on("disconnect", () => {
    status = "DISCONNECTED";
  });

  s.on("connect_error", (err: unknown) => {
    status = "ERROR";
    lastError = err instanceof Error ? err.message : "connect_error";
  });

  // BE truth: "realtime:event.v1" + legacy "event"
  s.on("realtime:event.v1", (payload: unknown) => handleMaybeEnvelope(payload));
  s.on("event", (payload: unknown) => handleMaybeEnvelope(payload));

  // Replay batch event (server can push after join/replay).
  s.on("realtime:replay.v1", (payload: unknown) => handleMaybeReplay(payload));
  // Gap signal (out of retention window)
  s.on("realtime:gap.v1", (payload: unknown) => handleGap(payload));

  s.onAny((eventName, payload) => {
    if (
      eventName === "realtime:event.v1" ||
      eventName === "event" ||
      eventName === "realtime:replay.v1" ||
      eventName === "realtime:gap.v1"
    ) {
      return;
    }
    handleMaybeEnvelope(payload);
  });
}

function handleMaybeEnvelope(payload: unknown) {
  if (!ctx) return;

  const env = normalizeEnvelope(payload);
  if (!env) return;

  // seq drop + cursor persistence
  const cur = getCursor(env.room, ctx.branchId, ctx.userKey);
  if (cur && env.seq <= cur.seq) return;

  // 1) route → invalidate matrix (debounced)
  routeRealtimeEvent(env);

  // 2) notify feature listeners
  for (const fn of listeners) fn(env);

  // 3) advance cursor
  setCursor(env.room, ctx.branchId, ctx.userKey, { seq: env.seq, ts: env.ts });
}

function handleMaybeReplay(payload: unknown) {
  if (!ctx) return;
  if (!payload || typeof payload !== "object") return;
  const o: any = payload as any;
  const items = Array.isArray(o.items) ? o.items : Array.isArray(o.events) ? o.events : null;
  if (!items) return;
  for (const it of items) {
    handleMaybeEnvelope(it);
  }
}

function handleGap(payload: unknown) {
  if (!ctx) return;
  if (!payload || typeof payload !== "object") return;
  const o: any = payload as any;
  const room = typeof o.room === "string" ? o.room : null;
  const window = o.window;
  const currentSeq = typeof window?.currentSeq === "number" ? window.currentSeq : null;
  if (!room || currentSeq == null) return;

  // Treat as "resync required": advance cursor to currentSeq to stop repeated gaps,
  // and invalidate data for that room (hard refetch via query keys).
  setCursor(room, ctx.branchId, ctx.userKey, { seq: currentSeq, ts: new Date().toISOString() });
  try {
    routeRealtimeEvent({
      type: "realtime.gap",
      room,
      seq: currentSeq,
      ts: new Date().toISOString(),
      payload: { reason: o.reason ?? "SEQ_GAP" },
    } as EventEnvelope);
  } catch {
    // ignore
  }
}

export function getRealtimeStatus() {
  return { status, lastError };
}

export function getRealtimeContext() {
  return ctx;
}

export function subscribeRealtime(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function startRealtime(nextCtx: RealtimeContext) {
  ctx = nextCtx;

  socket = getSocket();
  applySocketAuth(ctx);
  wireSocket(socket);

  if (socket.connected) {
    status = "CONNECTED";
    return;
  }

  status = "CONNECTING";
  lastError = null;
  socket.connect();
}

export async function stopRealtime() {
  joinedRooms.clear();
  joining.clear();
  listeners.clear();

  destroySocket();
  socket = null;

  status = "DISCONNECTED";
  lastError = null;
  ctx = null;
  wired = false;
}

export async function joinRoom(room: string) {
  if (!room) return;

  // Always remember the room; join after connect.
  joinedRooms.add(room);

  if (!ctx) return;

  socket = socket ?? getSocket();
  applySocketAuth(ctx);
  wireSocket(socket);

  if (!socket.connected) return;

  // de-dupe join per room
  const existing = joining.get(room);
  if (existing) return existing;

  const run = (async () => {
    // Customer policy (BE): order:* requires that socket already joined sessionKey:<sessionKey>.
    if (ctx!.kind === "customer" && ctx!.userKey) {
      const skRoom = `sessionKey:${ctx!.userKey}`;
      if (room !== skRoom) {
        // Always ensure sessionKey room is joined first (even if it was already scheduled).
        await joinRoom(skRoom);
      }
    }

    const cur = getCursor(room, ctx!.branchId, ctx!.userKey);
    const cursorSeq = cur?.seq ?? 0;

    try {
      await joinV1(socket!, room, cursorSeq, ctx!);
      // Replay after join: best-effort (BE expects fromSeq=cursorSeq).
      await replayV1(socket!, room, cursorSeq, ctx!, handleMaybeEnvelope);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "join_failed";
      lastError = msg;
      status = "ERROR";

      // If join forbidden, disconnect to avoid leaking cross-branch data.
      if (msg === "FORBIDDEN_JOIN") {
        await stopRealtime();
      }
    } finally {
      joining.delete(room);
    }
  })();

  joining.set(room, run);
  return run;
}

export async function leaveRoom(room: string) {
  joinedRooms.delete(room);
  // optional: tell server leave
  if (!socket || !socket.connected) return;
  try {
    socket.emit("leave.v1", { room });
  } catch {
    // ignore
  }
}
