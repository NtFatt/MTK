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

function getCursorInput(room: string) {
  return {
    room,
    branchId: ctx?.branchId,
    userKey: ctx?.userKey ?? "",
  };
}

function wireSocket(s: Socket) {
  if (wired) return;
  wired = true;

  s.on("connect", () => {
    status = "CONNECTED";
    lastError = null;

    for (const room of joinedRooms) {
      void joinRoom(room).catch(() => {});
    }
  });

  s.on("disconnect", () => {
    status = "DISCONNECTED";
  });

  s.on("connect_error", (err: unknown) => {
    status = "ERROR";
    lastError = err instanceof Error ? err.message : "connect_error";
  });

  s.on("realtime:event.v1", (payload: unknown) => handleMaybeEnvelope(payload));
  s.on("event", (payload: unknown) => handleMaybeEnvelope(payload));

  s.on("realtime:replay.v1", (payload: unknown) => handleMaybeReplay(payload));
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

  const cur = getCursor(getCursorInput(env.room));
  if (cur && env.seq <= cur.seq) return;

  routeRealtimeEvent(env);

  for (const fn of listeners) {
    fn(env);
  }

  setCursor(getCursorInput(env.room), { seq: env.seq, ts: env.ts });
}

function handleMaybeReplay(payload: unknown) {
  if (!ctx) return;
  if (!payload || typeof payload !== "object") return;

  const o = payload as Record<string, unknown>;
  const items = Array.isArray(o.items) ? o.items : Array.isArray(o.events) ? o.events : null;
  if (!items) return;

  for (const it of items) {
    handleMaybeEnvelope(it);
  }
}

function handleGap(payload: unknown) {
  if (!ctx) return;
  if (!payload || typeof payload !== "object") return;

  const o = payload as Record<string, unknown>;
  const room = typeof o.room === "string" ? o.room : null;
  const windowObj =
    o.window && typeof o.window === "object" ? (o.window as Record<string, unknown>) : null;
  const currentSeq =
    typeof windowObj?.currentSeq === "number" ? windowObj.currentSeq : null;

  if (!room || currentSeq == null) return;

  setCursor(getCursorInput(room), {
    seq: currentSeq,
    ts: new Date().toISOString(),
  });

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

  joinedRooms.add(room);

  if (!ctx) return;

  socket = socket ?? getSocket();
  applySocketAuth(ctx);
  wireSocket(socket);

  if (!socket.connected) return;

  const existing = joining.get(room);
  if (existing) return existing;

  const run = (async () => {
    if (ctx!.kind === "customer" && ctx!.sessionKey) {
      const skRoom = `sessionKey:${ctx!.sessionKey}`;
      if (room !== skRoom) {
        await joinRoom(skRoom);
      }
    }

    const cur = getCursor(getCursorInput(room));
    const cursorSeq = cur?.seq ?? 0;

    try {
      await joinV1(socket!, room, cursorSeq, ctx!);
      await replayV1(socket!, room, cursorSeq, ctx!, handleMaybeEnvelope);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "join_failed";
      lastError = msg;
      status = "ERROR";

      if (msg === "FORBIDDEN_JOIN") {
        joinedRooms.delete(room);
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

  if (!socket || !socket.connected) return;

  try {
    socket.emit("leave.v1", { room });
  } catch {
    // ignore
  }
}
