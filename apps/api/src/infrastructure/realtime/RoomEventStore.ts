import type { RedisClient } from "../redis/redisClient.js";

/**
 * Ephemeral per-room replay log used for seq gap recovery.
 *
 * Design goals:
 * - low overhead (Redis ZSET per room)
 * - bounded retention (max items + TTL)
 * - never blocks the live stream (best-effort)
 */

export type RealtimeEnvelopeV1 = {
  v: number;
  room: string;
  seq: number;
  event: string;
  at: string;
  meta: any;
  data: any;
};

export type ReplayWindow = {
  earliestSeq: number;
  currentSeq: number;
};

export interface IRoomEventStore {
  append(room: string, seq: number, envelope: RealtimeEnvelopeV1): Promise<void>;
  replayAfter(room: string, afterSeq: number, limit: number): Promise<RealtimeEnvelopeV1[]>;
  getWindow(room: string): Promise<ReplayWindow>;
}

export class InMemoryRoomEventStore implements IRoomEventStore {
  private rooms = new Map<string, { items: RealtimeEnvelopeV1[]; max: number }>();
  constructor(private readonly opts: { maxItems: number }) {}

  async append(room: string, _seq: number, envelope: RealtimeEnvelopeV1): Promise<void> {
    const entry = this.rooms.get(room) ?? { items: [], max: this.opts.maxItems };
    entry.items.push(envelope);
    if (entry.items.length > entry.max) {
      entry.items.splice(0, entry.items.length - entry.max);
    }
    this.rooms.set(room, entry);
  }

  async replayAfter(room: string, afterSeq: number, limit: number): Promise<RealtimeEnvelopeV1[]> {
    const entry = this.rooms.get(room);
    if (!entry) return [];
    const out = entry.items.filter((e) => Number(e?.seq ?? 0) > afterSeq);
    return out.slice(0, limit);
  }

  async getWindow(room: string): Promise<ReplayWindow> {
    const entry = this.rooms.get(room);
    if (!entry || entry.items.length === 0) return { earliestSeq: 0, currentSeq: 0 };
    const earliestSeq = Number(entry.items[0]!.seq);
    const currentSeq = Number(entry.items[entry.items.length - 1]!.seq);
    return {
      earliestSeq: Number.isFinite(earliestSeq) ? earliestSeq : 0,
      currentSeq: Number.isFinite(currentSeq) ? currentSeq : 0,
    };
  }
}

export class RedisRoomEventStore implements IRoomEventStore {
  constructor(
    private readonly redis: RedisClient,
    private readonly opts: { ttlSeconds: number; maxItems: number },
  ) {}

  private kLog(room: string) {
    return `rt:log:${room}`;
  }

  private kSeq(room: string) {
    // RoomSequencer uses this key too.
    return `rt:seq:${room}`;
  }

  async append(room: string, seq: number, envelope: RealtimeEnvelopeV1): Promise<void> {
    const logKey = this.kLog(room);
    const json = JSON.stringify(envelope);
    try {
      await this.redis.sendCommand(["ZADD", logKey, String(seq), json]);
      // Keep last N items.
      await this.redis.sendCommand([
        "ZREMRANGEBYRANK",
        logKey,
        "0",
        String(-(this.opts.maxItems + 1)),
      ]);
      // Ephemeral retention.
      await this.redis.expire(logKey, this.opts.ttlSeconds);
      // Best effort to avoid leaking seq keys forever.
      await this.redis.expire(this.kSeq(room), this.opts.ttlSeconds);
    } catch {
      // never break live stream
    }
  }

  async replayAfter(room: string, afterSeq: number, limit: number): Promise<RealtimeEnvelopeV1[]> {
    const logKey = this.kLog(room);
    try {
      const raw = (await this.redis.sendCommand([
        "ZRANGEBYSCORE",
        logKey,
        `(${afterSeq}`,
        "+inf",
        "LIMIT",
        "0",
        String(limit),
      ])) as unknown as string[];
      if (!Array.isArray(raw) || raw.length === 0) return [];
      const out: RealtimeEnvelopeV1[] = [];
      for (const s of raw) {
        try {
          out.push(JSON.parse(String(s)) as RealtimeEnvelopeV1);
        } catch {
          // skip bad item
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  async getWindow(room: string): Promise<ReplayWindow> {
    const logKey = this.kLog(room);
    try {
      const first = (await this.redis.sendCommand(["ZRANGE", logKey, "0", "0", "WITHSCORES"])) as unknown as string[];
      const last = (await this.redis.sendCommand(["ZREVRANGE", logKey, "0", "0", "WITHSCORES"])) as unknown as string[];
      const earliestSeq = Array.isArray(first) && first.length >= 2 ? Number(first[1]) : 0;
      const currentSeq = Array.isArray(last) && last.length >= 2 ? Number(last[1]) : 0;
      return {
        earliestSeq: Number.isFinite(earliestSeq) ? earliestSeq : 0,
        currentSeq: Number.isFinite(currentSeq) ? currentSeq : 0,
      };
    } catch {
      return { earliestSeq: 0, currentSeq: 0 };
    }
  }
}
