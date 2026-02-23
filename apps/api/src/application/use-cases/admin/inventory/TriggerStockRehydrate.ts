import type { RedisClient } from "../../../../infrastructure/redis/redisClient.js";
import { RedisStockRehydrateJob, type StockRehydrateResult } from "../../../../infrastructure/redis/stock/RedisStockRehydrateJob.js";

export class TriggerStockRehydrate {
  constructor(private readonly redis: RedisClient) {}

  async execute(): Promise<StockRehydrateResult> {
    const job = new RedisStockRehydrateJob(this.redis);
    return await job.runOnce();
  }
}
