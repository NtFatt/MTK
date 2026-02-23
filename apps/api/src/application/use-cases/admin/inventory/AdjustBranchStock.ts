import type { IInventoryRepository, AdjustStockMode } from "../../../ports/repositories/IInventoryRepository.js";
import type { RedisClient } from "../../../../infrastructure/redis/redisClient.js";

export type AdjustBranchStockResult = {
  branchId: string;
  itemId: string;
  mode: AdjustStockMode;
  prevQty: number;
  newQty: number;
  redis?: {
    stockKey: string;
    reservedKey: string;
    reserved: number;
    available: number;
    menuVer?: string;
  };
};

export class AdjustBranchStock {
  constructor(
    private readonly repo: IInventoryRepository,
    private readonly deps: {
      redis?: RedisClient | null;
      stockHoldsEnabled: boolean;
      menuCacheEnabled: boolean;
      menuVersionKey?: string;
    },
  ) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId: string;
    itemId: string;
    mode: AdjustStockMode;
    quantity: number;
  }): Promise<AdjustBranchStockResult> {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = String(input.branchId);

    if (actorRole === "BRANCH_MANAGER") {
      branchId = String(input.actor.branchId ?? "");
    }
    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const out = await this.repo.adjustBranchStock({
      branchId,
      itemId: String(input.itemId),
      mode: input.mode,
      quantity: input.quantity,
    });

    const redis = this.deps.redis ?? null;
    if (!redis) return out;

    // Best-effort: synchronize Redis available stock with DB SoT (respect reserved ledger).
    let reserved = 0;
    let available = out.newQty;
    const reservedKey = `reserved:${branchId}:${out.itemId}`;
    const stockKey = `stock:${branchId}:${out.itemId}`;

    try {
      if (this.deps.stockHoldsEnabled) {
        const r = await redis.get(reservedKey);
        reserved = Number(r ?? 0);
        if (!Number.isFinite(reserved) || reserved < 0) reserved = 0;
        available = out.newQty - reserved;
        if (available < 0) available = 0;
        await redis.set(stockKey, String(available));
      }
    } catch {
      // ignore redis sync errors
    }

    // Best-effort: bump menu cache version so clients get fresh menu/stock snapshot.
    let menuVer: string | undefined;
    try {
      if (this.deps.menuCacheEnabled) {
        const vKey = this.deps.menuVersionKey ?? "menu:ver";
        const v = await redis.incr(vKey);
        menuVer = String(v);
      }
    } catch {
      // ignore
    }

    return {
      ...out,
      redis: {
        stockKey,
        reservedKey,
        reserved,
        available,
        ...(menuVer ? { menuVer } : {}),
      },
    };
  }
}
