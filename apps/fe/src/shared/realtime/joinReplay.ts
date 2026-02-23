import type { Socket } from "socket.io-client";
import type { RealtimeContext } from "./types";
import { realtimeConfig } from "./config";

type Ack = any;

type JoinRoomReq = { room: string; lastSeq: number };

function looksForbiddenMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("forbidden") ||
    m.includes("unauthorized") ||
    m.includes("permission") ||
    m.includes("session_required") ||
    m.includes("session required")
  );
}

function looksForbiddenJoinAck(ack: Ack, room: string): boolean {
  if (!ack) return false;
  const code = ack?.code ?? ack?.status;
  if (code === 401 || code === 403) return true;

  if (ack?.ok === false) {
    const msg = String(ack?.error ?? ack?.message ?? "");
    if (looksForbiddenMessage(msg)) return true;
  }

  if (Array.isArray(ack?.rejected)) {
    const r = ack.rejected.find((x: any) => x && x.room === room);
    const c = String(r?.code ?? r?.error ?? "");
    if (looksForbiddenMessage(c) || c.toUpperCase().includes("FORBIDDEN") || c.toUpperCase().includes("SESSION")) {
      return true;
    }
  }

  const msg = String(ack?.error ?? ack?.message ?? "");
  return looksForbiddenMessage(msg);
}

function emitWithAck(socket: Socket, event: string, payload: unknown, timeoutMs: number): Promise<Ack | null> {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(null);
    }, timeoutMs);

    try {
      socket.emit(event, payload, (ack: Ack) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(ack);
      });
    } catch {
      clearTimeout(t);
      resolve(null);
    }
  });
}

function buildJoinPayload(room: string, lastSeq: number, ctx: RealtimeContext): {
  sessionKey?: string;
  internalToken?: string;
  rooms: JoinRoomReq[];
  replayLimit?: number;
} {
  const rooms: JoinRoomReq[] = [{ room, lastSeq }];

  const payload: any = {
    rooms,
    replayLimit: 200,
  };

  if (ctx.kind === "customer") {
    payload.sessionKey = ctx.userKey;
  } else if (ctx.token) {
    payload.internalToken = ctx.token;
  }

  return payload;
}

function buildReplayPayload(room: string, fromSeq: number, ctx: RealtimeContext): {
  room: string;
  fromSeq: number;
  limit?: number;
  internalToken?: string;
} {
  const payload: any = { room, fromSeq, limit: 200 };
  if (ctx.kind === "internal" && ctx.token) payload.internalToken = ctx.token;
  return payload;
}

/**
 * Join a room using BE protocol:
 * - emit: "realtime:join.v1"
 * - payload: { sessionKey?, internalToken?, rooms:[{room,lastSeq}], replayLimit? }
 */
export async function joinV1(socket: Socket, room: string, lastSeq: number, ctx: RealtimeContext) {
  const ack = await emitWithAck(
    socket,
    "realtime:join.v1",
    buildJoinPayload(room, lastSeq, ctx),
    realtimeConfig.joinAckTimeoutMs
  );

  if (ack && looksForbiddenJoinAck(ack, room)) {
    const err = new Error("FORBIDDEN_JOIN");
    (err as any).ack = ack;
    throw err;
  }

  return ack;
}

/**
 * Request replay using BE protocol:
 * - emit: "realtime:replay.request.v1"
 * - ack may contain { items: EventEnvelopeV1[] }
 */
export async function replayV1(
  socket: Socket,
  room: string,
  fromSeq: number,
  ctx: RealtimeContext,
  onEvent: (payload: unknown) => void
) {
  const ack = await emitWithAck(
    socket,
    "realtime:replay.request.v1",
    buildReplayPayload(room, fromSeq, ctx),
    realtimeConfig.replayAckTimeoutMs
  );

  const items =
    (ack && Array.isArray(ack.items) && ack.items) ||
    (ack && Array.isArray(ack.events) && ack.events) ||
    null;

  if (items) {
    for (const e of items) {
      onEvent(e);
    }
  }

  return ack;
}
