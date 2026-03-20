import { pool } from "../../db/mysql/connection.js";
import type { RedisClient } from "../redisClient.js";

function toNonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function uniqueStrings(values: unknown[]): string[] {
  const out = new Set<string>();

  for (const value of values) {
    const next = String(value ?? "").trim();
    if (next) out.add(next);
  }

  return Array.from(out);
}

export class RedisMenuStockProjectionSync {
  private readonly stockPrefix: string;
  private readonly reservedPrefix: string;
  private readonly menuVersionKey: string;

  constructor(
    private readonly redis: RedisClient,
    private readonly opts: {
      stockHoldsEnabled: boolean;
      menuCacheEnabled: boolean;
      stockPrefix?: string;
      reservedPrefix?: string;
      menuVersionKey?: string;
    },
  ) {
    this.stockPrefix = opts.stockPrefix ?? "stock";
    this.reservedPrefix = opts.reservedPrefix ?? "reserved";
    this.menuVersionKey = opts.menuVersionKey ?? "menu:ver";
  }

  async syncItems(input: {
    branchId: string;
    itemIds: string[];
  }): Promise<{
    branchId: string;
    itemIds: string[];
    menuVersion: string | null;
  }> {
    const branchId = String(input.branchId ?? "").trim();
    const itemIds = uniqueStrings(input.itemIds);

    if (!branchId || itemIds.length === 0) {
      return {
        branchId,
        itemIds,
        menuVersion: null,
      };
    }

    const placeholders = itemIds.map(() => "?").join(",");
    const [rows]: any = await pool.query(
      `
        SELECT item_id, quantity
        FROM menu_item_stock
        WHERE branch_id = ?
          AND item_id IN (${placeholders})
      `,
      [branchId, ...itemIds],
    );

    const dbQtyByItem = new Map<string, number>(
      (rows ?? []).map((row: any) => [String(row.item_id), toNonNegativeInt(row.quantity)]),
    );

    const reservedValues = this.opts.stockHoldsEnabled
      ? await this.redis.mGet(
          itemIds.map((itemId) => `${this.reservedPrefix}:${branchId}:${itemId}`),
        )
      : itemIds.map(() => null);

    for (let index = 0; index < itemIds.length; index += 1) {
      const itemId = itemIds[index]!;
      const dbQty = dbQtyByItem.get(itemId) ?? 0;
      const reserved = this.opts.stockHoldsEnabled
        ? toNonNegativeInt(reservedValues[index])
        : 0;
      const available = this.opts.stockHoldsEnabled
        ? Math.max(0, dbQty - reserved)
        : dbQty;

      await this.redis.set(`${this.stockPrefix}:${branchId}:${itemId}`, String(available));
    }

    let menuVersion: string | null = null;
    if (this.opts.menuCacheEnabled) {
      const nextVersion = await this.redis.incr(this.menuVersionKey);
      menuVersion = String(nextVersion);
    }

    return {
      branchId,
      itemIds,
      menuVersion,
    };
  }
}
