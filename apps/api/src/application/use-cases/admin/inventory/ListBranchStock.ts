import type { IInventoryRepository } from "../../../ports/repositories/IInventoryRepository.js";
import type { RedisClient } from "../../../../infrastructure/redis/redisClient.js";

export type BranchStockVisibilityRow = Awaited<
  ReturnType<IInventoryRepository["listBranchStock"]>
>[number] & {
  dbQty: number;
  reservedQty: number;
  availableQty: number;
  available: number;
  onHold: number;
  stockSource: "mysql" | "redis";
};

function toNonNegativeInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

export class ListBranchStock {
  constructor(
    private readonly repo: IInventoryRepository,
    private readonly deps?: {
      redis?: RedisClient | null;
      stockHoldsEnabled?: boolean;
    },
  ) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId: string | null;
  }): Promise<BranchStockVisibilityRow[]> {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = input.branchId;

    if (actorRole === "BRANCH_MANAGER") {
      branchId = input.actor.branchId;
    }

    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const rows = await this.repo.listBranchStock(branchId);
    const fallbackRows = rows.map((row) => ({
      ...row,
      dbQty: row.quantity,
      reservedQty: 0,
      availableQty: row.quantity,
      available: row.quantity,
      onHold: 0,
      stockSource: "mysql" as const,
    }));

    const redis = this.deps?.redis ?? null;
    if (!redis || !this.deps?.stockHoldsEnabled || rows.length === 0) {
      return fallbackRows;
    }

    const keys = rows.flatMap((row) => [
      `stock:${branchId}:${row.itemId}`,
      `reserved:${branchId}:${row.itemId}`,
    ]);

    let values: Array<string | null> | null = null;
    try {
      values = await redis.mGet(keys);
    } catch {
      return fallbackRows;
    }

    return rows.map((row, index) => {
      const availableIdx = index * 2;
      const reservedIdx = availableIdx + 1;

      const redisAvailable = toNonNegativeInt(values?.[availableIdx]);
      const redisReserved = toNonNegativeInt(values?.[reservedIdx]);
      const dbQty = row.quantity;

      const reservedQty =
        redisReserved ??
        (redisAvailable != null ? Math.max(0, dbQty - redisAvailable) : 0);

      const availableQty =
        redisAvailable ??
        Math.max(0, dbQty - reservedQty);

      return {
        ...row,
        dbQty,
        reservedQty,
        availableQty,
        available: availableQty,
        onHold: reservedQty,
        stockSource:
          redisAvailable != null || redisReserved != null ? "redis" : "mysql",
      };
    });
  }
}
