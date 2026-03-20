export type SocketStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

/**
 * Normalized envelope used by FE.
 *
 * BE source-of-truth (SocketGateway.ts):
 * - stream event: "realtime:event.v1"
 * - envelope: { v, room, seq, event, at, meta, data:{ scope, payload } }
 */
export type EventEnvelope<TPayload = unknown, TScope = unknown> = {
  type: string;
  room: string;
  seq: number;
  ts: string;
  payload: TPayload;
  scope?: TScope;
  meta?: Record<string, unknown> | null;
  v?: number;
};

/** Raw BE v1 envelope shape */
export type RealtimeEnvelopeV1 = {
  v: number;
  room: string;
  seq: number;
  event: string;
  at: string;
  meta?: Record<string, unknown> | null;
  data?: {
    scope?: unknown;
    payload?: unknown;
  } | null;
};

export type RealtimeContext = {
  kind: "internal" | "customer";
  userKey: string; // internal userId hoặc customer sessionKey
  branchId?: string | number;
  token?: string; // internal accessToken nếu BE yêu cầu
  sessionKey?: string; // customer-only auth room for session/order/branch
};

export type CursorValue = {
  seq: number;
  ts: string;
};

export type JoinRoomInput = {
  room: string;
  branchId?: string | number;
};

export type ReplayInput = {
  room: string;
  afterSeq?: number;
};

export type JoinRoomAck = {
  ok: boolean;
  room: string;
  joined?: boolean;
  reason?: string | null;
};

export type ReplayAck = {
  ok: boolean;
  room: string;
  fromSeq?: number;
  replayed?: number;
  reason?: string | null;
};

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object";
}

function getObjectField<T = unknown>(obj: Record<string, unknown>, key: string): T | undefined {
  return obj[key] as T | undefined;
}

export function isRealtimeEnvelopeV1(x: unknown): x is RealtimeEnvelopeV1 {
  if (!isPlainObject(x)) return false;

  return (
    typeof x.v === "number" &&
    typeof x.room === "string" &&
    typeof x.seq === "number" &&
    typeof x.event === "string" &&
    typeof x.at === "string"
  );
}

export function isJoinRoomAck(x: unknown): x is JoinRoomAck {
  if (!isPlainObject(x)) return false;
  return typeof x.ok === "boolean" && typeof x.room === "string";
}

export function isReplayAck(x: unknown): x is ReplayAck {
  if (!isPlainObject(x)) return false;
  return typeof x.ok === "boolean" && typeof x.room === "string";
}

/**
 * Normalize incoming payload into FE EventEnvelope.
 * Only accepts payloads that contain {room, seq} to keep cursor/replay semantics correct.
 */
export function normalizeEnvelope(x: unknown): EventEnvelope | null {
  if (isRealtimeEnvelopeV1(x)) {
    const data = isPlainObject(x.data) ? x.data : null;
    const payload = data ? getObjectField(data, "payload") ?? null : null;
    const scope = data ? getObjectField(data, "scope") ?? null : null;

    return {
      type: x.event,
      room: x.room,
      seq: x.seq,
      ts: x.at,
      payload,
      scope,
      meta: x.meta ?? null,
      v: x.v,
    };
  }

  // Backward-compat: accept legacy FE envelope only if it has room+seq.
  if (isPlainObject(x)) {
    const type = getObjectField<unknown>(x, "type");
    const room = getObjectField<unknown>(x, "room");
    const seq = getObjectField<unknown>(x, "seq");
    const ts = getObjectField<unknown>(x, "ts");

    if (
      typeof type === "string" &&
      typeof room === "string" &&
      typeof seq === "number" &&
      typeof ts === "string" &&
      "payload" in x
    ) {
      return {
        type,
        room,
        seq,
        ts,
        payload: getObjectField(x, "payload") ?? null,
        scope: getObjectField(x, "scope") ?? null,
        meta: (getObjectField<Record<string, unknown> | null>(x, "meta")) ?? null,
      };
    }
  }

  return null;
}
