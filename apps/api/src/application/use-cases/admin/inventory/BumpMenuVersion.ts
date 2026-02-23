import type { RedisClient } from "../../../../infrastructure/redis/redisClient.js";

export class BumpMenuVersion {
  constructor(private readonly redis: RedisClient, private readonly key: string = "menu:ver") {}

  async execute(): Promise<{ key: string; version: string }> {
    const v = await this.redis.incr(this.key);
    return { key: this.key, version: String(v) };
  }
}
