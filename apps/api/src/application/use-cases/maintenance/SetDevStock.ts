import type { IMaintenanceRepository } from "../../ports/repositories/IMaintenanceRepository.js";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import { env } from "../../../infrastructure/config/env.js";

export type SetDevStockInput = {
  branchId: string;
  itemId: string;
  quantity: number;
};

export type SetDevStockOutput = {
  branchId: string;
  itemId: string;
  quantity: number;
  updatedStockRows: number;
  updatedMenuItems: number;
  redis?: {
    stockKey: string;
    reservedKey: string;
    clearedHolds: number;
  };
};

export class SetDevStock {
  constructor(private readonly repo: IMaintenanceRepository, private readonly redis?: RedisClient | null) {}

  async exec(input: SetDevStockInput): Promise<SetDevStockOutput> {
    if (!env.DEV_RESET_ENABLED) {
      // Project-wide convention: throw Error(messageCode) and let errorHandler map it.
      throw new Error("DEV_RESET_DISABLED");
    }

    const branchId = String(input.branchId);
    const itemId = String(input.itemId);
    const quantity = Number.isFinite(Number(input.quantity)) ? Math.max(0, Math.floor(Number(input.quantity))) : 0;

    const r = await this.repo.setDevStock(branchId, itemId, quantity);

    // Best-effort Redis sync for deterministic smoke.
    if (!this.redis || !env.REDIS_STOCK_HOLDS_ENABLED) {
      return {
        branchId: r.branchId,
        itemId: r.itemId,
        quantity: r.quantity,
        updatedStockRows: r.updatedStockRows,
        updatedMenuItems: r.updatedMenuItems,
      };
    }

    const stockKey = `stock:${branchId}:${itemId}`;
    const reservedKey = `reserved:${branchId}:${itemId}`;
    let clearedHolds = 0;

    try {
      // Clear any existing holds for this item.
      const pattern = `hold:*:${branchId}:${itemId}:*`;
      let cursor = "0";
      do {
        const res: any = await this.redis.scan(cursor, { MATCH: pattern, COUNT: 200 } as any);
        const nextCursor = Array.isArray(res) ? String(res[0]) : String(res?.cursor ?? "0");
        const keys = Array.isArray(res) ? (res[1] ?? []) : (res?.keys ?? []);
        cursor = nextCursor;

        for (const k of keys ?? []) {
          const key = String(k);
          clearedHolds++;
          const parts = key.split(":");
          const cartKey = parts.length >= 2 ? parts[1] : "";
          // Remove from indexes/sets (best-effort)
          await Promise.allSettled([
            this.redis.del(key),
            cartKey ? this.redis.sRem(`holds:${cartKey}`, key) : Promise.resolve(0 as any),
            this.redis.zRem("holdidx", key),
          ]);
        }
      } while (cursor !== "0");

      await Promise.all([
        this.redis.set(stockKey, String(quantity)),
        this.redis.set(reservedKey, "0"),
      ]);
    } catch {
      // ignore
    }

    return {
      branchId: r.branchId,
      itemId: r.itemId,
      quantity: r.quantity,
      updatedStockRows: r.updatedStockRows,
      updatedMenuItems: r.updatedMenuItems,
      redis: { stockKey, reservedKey, clearedHolds },
    };
  }
}
