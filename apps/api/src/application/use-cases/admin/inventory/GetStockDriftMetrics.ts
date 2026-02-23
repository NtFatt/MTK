import type { RedisClient } from "../../../../infrastructure/redis/redisClient.js";

export type StockDriftMetrics = {
  runAt: string;
  scanned: number;
  corrected: number;
  maxAbsDrift: number;
  totalAbsDrift: number;
};

function toInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export class GetStockDriftMetrics {
  private readonly key: string;

  constructor(private readonly redis: RedisClient, key: string = "metrics:stock_drift:last") {
    this.key = key;
  }

  async execute(): Promise<StockDriftMetrics | null> {
    const data: any = await this.redis.hGetAll(this.key);
    if (!data || Object.keys(data).length === 0) return null;

    return {
      runAt: String(data.runAt ?? ""),
      scanned: toInt(data.scanned),
      corrected: toInt(data.corrected),
      maxAbsDrift: toInt(data.maxAbsDrift),
      totalAbsDrift: toInt(data.totalAbsDrift),
    };
  }
}
