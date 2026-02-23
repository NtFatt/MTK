export type SocketStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

/**
 * Normalized envelope used by FE.
 *
 * BE source-of-truth (SocketGateway.ts):
 * - stream event: "realtime:event.v1"
 * - envelope: { v, room, seq, event, at, meta, data:{ scope, payload } }
 */
export type EventEnvelope<TPayload = unknown, TScope = unknown> = {
  /** Domain event type (e.g. "order.created", "table.session.closed") */
  type: string;
  /** Room name (e.g. "branch:1", "order:OD123", "sessionKey:<uuid>") */
  room: string;
  /** Per-room sequence (monotonic) */
  seq: number;
  /** ISO timestamp */
  ts: string;
  /** Domain payload */
  payload: TPayload;
  /** Domain scope (may contain sessionKey, sessionId, branchId, orderId...) */
  scope?: TScope;
  /** Metadata (eventId, correlationId...) */
  meta?: Record<string, unknown> | null;
  /** Wire version */
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
  data?: { scope?: unknown; payload?: unknown } | null;
};

export type RealtimeContext = {
  kind: "internal" | "customer";
  userKey: string; // internal userId hoặc customer sessionKey
  branchId?: string | number;
  token?: string; // internal accessToken nếu BE yêu cầu
};

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object";
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

/**
 * Normalize incoming payload into FE EventEnvelope.
 * Only accepts payloads that contain {room, seq} to keep cursor/replay semantics correct.
 */
export function normalizeEnvelope(x: unknown): EventEnvelope | null {
  if (isRealtimeEnvelopeV1(x)) {
    return {
      type: x.event,
      room: x.room,
      seq: x.seq,
      ts: x.at,
      payload: (x.data && (x.data as any).payload) ?? null,
      scope: (x.data && (x.data as any).scope) ?? null,
      meta: x.meta ?? null,
      v: x.v,
    };
  }

  // Backward-compat: accept legacy FE envelope only if it has room+seq.
  if (isPlainObject(x)) {
    const o = x as Record<string, unknown>;
    if (
      typeof o.type === "string" &&
      typeof o.room === "string" &&
      typeof o.seq === "number" &&
      typeof o.ts === "string" &&
      "payload" in o
    ) {
      return {
        type: String(o.type),
        room: String(o.room),
        seq: Number(o.seq),
        ts: String(o.ts),
        payload: (o as any).payload,
        scope: (o as any).scope,
        meta: (o as any).meta,
      };
    }
  }

  return null;
}
