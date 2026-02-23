import type { RedisClient } from "../redis/redisClient.js";

/**
 * Monotonic per-room sequence generator.
 *
 * Enterprise mode (Option A): use Redis INCR to keep sequences consistent across instances.
 */
export interface IRoomSequencer {
  next(room: string): Promise<number>;
}

export class RedisRoomSequencer implements IRoomSequencer {
  constructor(
    private redis: RedisClient,
    private keyPrefix = "rt:seq:",
  ) {}

  async next(room: string): Promise<number> {
    // Use one counter per room.
    const key = `${this.keyPrefix}${room}`;
    const n = await this.redis.incr(key);
    return Number(n);
  }
}

export class InMemoryRoomSequencer implements IRoomSequencer {
  private counters = new Map<string, number>();

  async next(room: string): Promise<number> {
    const prev = this.counters.get(room) ?? 0;
    const next = prev + 1;
    this.counters.set(room, next);
    return next;
  }
}
