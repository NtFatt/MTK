import { randomUUID } from "crypto";
import { pool } from "../../db/mysql/connection.js";
import type { RedisClient } from "../redisClient.js";
import { observeInventoryRehydrate } from "../../observability/metrics.js";

const LUA_REHYDRATE_STOCK = `
-- KEYS[1] = stockKey
-- KEYS[2] = reservedKey
-- ARGV[1] = dbQty
local prev = tonumber(redis.call('GET', KEYS[1]) or '0')
local reserved = tonumber(redis.call('GET', KEYS[2]) or '0')
local dbQty = tonumber(ARGV[1]) or 0
if dbQty < 0 then dbQty = 0 end
local desired = dbQty - reserved
if desired < 0 then desired = 0 end
redis.call('SET', KEYS[1], desired)
return {prev, desired, reserved}
`;

export type StockRehydrateResult = {
  scanned: number;
  corrected: number;
  maxAbsDrift: number;
  totalAbsDrift: number;
  runAt: string;
  skipped?: boolean;
};

export class RedisStockRehydrateJob {
  private readonly stockPrefix = "stock";
  private readonly reservedPrefix = "reserved";
  private readonly driftMetricsKey = "metrics:stock_drift:last";
  private readonly lockKey = "lock:stock_rehydrate";

  constructor(private readonly redis: RedisClient) {}

  private kStock(branchId: string, itemId: string) {
    return `${this.stockPrefix}:${branchId}:${itemId}`;
  }

  private kReserved(branchId: string, itemId: string) {
    return `${this.reservedPrefix}:${branchId}:${itemId}`;
  }

  /**
   * Rehydrate Redis available stock from MySQL SoT, while respecting reserved (holds) ledger.
   * This corrects drift after manual restock in DB.
   *
   * Enterprise hardening:
   * - distributed lock so only 1 instance runs at a time in multi-instance deployments.
   */
  async runOnce(): Promise<StockRehydrateResult> {
    const runAt = new Date().toISOString();
    const lockId = randomUUID();

    // Acquire lock (30s) to prevent concurrent runs across instances
    const ok = await this.redis.set(this.lockKey, lockId, { NX: true, PX: 30_000 });
    if (!ok) {
      observeInventoryRehydrate({
        ok: true,
        skipped: true,
        scanned: 0,
        corrected: 0,
        maxAbsDrift: 0,
        totalAbsDrift: 0,
        runAtIso: runAt,
      });
      return { runAt, scanned: 0, corrected: 0, maxAbsDrift: 0, totalAbsDrift: 0, skipped: true };
    }

    let scanned = 0;
    let corrected = 0;
    let maxAbsDrift = 0;
    let totalAbsDrift = 0;

    try {
      const [rows] = await pool.query(
        `SELECT branch_id as branchId, item_id as itemId, quantity as qty FROM menu_item_stock`,
      );

      for (const r of (rows as any[])) {
        const branchId = String(r.branchId);
        const itemId = String(r.itemId);
        const qty = Number(r.qty ?? 0);
        const stockKey = this.kStock(branchId, itemId);
        const reservedKey = this.kReserved(branchId, itemId);

        const out: any = await this.redis.eval(LUA_REHYDRATE_STOCK, {
          keys: [stockKey, reservedKey],
          arguments: [String(qty)],
        });

        const prev = Array.isArray(out) ? Number(out[0]) : 0;
        const desired = Array.isArray(out) ? Number(out[1]) : 0;
        const drift = prev - desired;
        const abs = Math.abs(drift);

        scanned += 1;
        if (abs > 0) corrected += 1;
        if (abs > maxAbsDrift) maxAbsDrift = abs;
        totalAbsDrift += abs;
      }

      // Persist last-run metrics to Redis for quick inspection.
      try {
        await this.redis.hSet(this.driftMetricsKey, {
          runAt,
          scanned: String(scanned),
          corrected: String(corrected),
          maxAbsDrift: String(maxAbsDrift),
          totalAbsDrift: String(totalAbsDrift),
        });
        await this.redis.expire(this.driftMetricsKey, 24 * 3600);
      } catch {
        // ignore
      }

      observeInventoryRehydrate({
        ok: true,
        scanned,
        corrected,
        maxAbsDrift,
        totalAbsDrift,
        runAtIso: runAt,
      });

      return { runAt, scanned, corrected, maxAbsDrift, totalAbsDrift };
    } catch (e) {
      observeInventoryRehydrate({
        ok: false,
        scanned,
        corrected,
        maxAbsDrift,
        totalAbsDrift,
        runAtIso: runAt,
      });
      throw e;
    } finally {
      // Best-effort unlock: only unlock if we still own the lock
      const LUA_UNLOCK = `
local key = KEYS[1]
local expected = ARGV[1]
local cur = redis.call('GET', key)
if cur == expected then
  redis.call('DEL', key)
  return 1
end
return 0
`;
      try {
        await this.redis.eval(LUA_UNLOCK, { keys: [this.lockKey], arguments: [lockId] });
      } catch {
        // ignore
      }
    }
  }
}
