import type { RedisClient } from "../redisClient.js";
import type { IStockHoldService, StockHoldVariantKey } from "../../../application/ports/services/IStockHoldService.js";
import { MySQLMenuItemStockRepository } from "../../db/mysql/repositories/MySQLMenuItemStockRepository.js";
import { pool } from "../../db/mysql/connection.js";
import crypto from "node:crypto";

const LUA_SET_DESIRED = `
-- KEYS[1] = stockKey
-- KEYS[2] = holdKey
-- KEYS[3] = holdSetKey
-- KEYS[4] = holdIdxKey
-- KEYS[5] = reservedKey
-- ARGV[1] = desiredQty
-- ARGV[2] = holdKeyTtlSeconds (>= logical TTL to avoid losing qty before cleanup)
-- ARGV[3] = expireAtMs
local desired = tonumber(ARGV[1])
if desired < 0 then return {err='INVALID_DESIRED'} end
local current = tonumber(redis.call('GET', KEYS[2]) or '0')
local delta = desired - current
if delta == 0 then
  if desired > 0 then
    redis.call('EXPIRE', KEYS[2], tonumber(ARGV[2]))
    redis.call('SADD', KEYS[3], KEYS[2])
    redis.call('ZADD', KEYS[4], tonumber(ARGV[3]), KEYS[2])
  else
    redis.call('SREM', KEYS[3], KEYS[2])
    redis.call('ZREM', KEYS[4], KEYS[2])
    redis.call('DEL', KEYS[2])
  end
  return {0,current}
end

if delta > 0 then
  local stock = tonumber(redis.call('GET', KEYS[1]) or '0')
  if stock < delta then return {-1,stock,current} end
  redis.call('DECRBY', KEYS[1], delta)
  redis.call('INCRBY', KEYS[2], delta)
  redis.call('INCRBY', KEYS[5], delta)
else
  local release = -delta
  redis.call('INCRBY', KEYS[1], release)
  redis.call('DECRBY', KEYS[2], release)
  local reserved = tonumber(redis.call('GET', KEYS[5]) or '0') - release
  if reserved < 0 then reserved = 0 end
  redis.call('SET', KEYS[5], reserved)
end

local newHold = tonumber(redis.call('GET', KEYS[2]) or '0')
if newHold <= 0 then
  redis.call('DEL', KEYS[2])
  redis.call('SREM', KEYS[3], KEYS[2])
  redis.call('ZREM', KEYS[4], KEYS[2])
else
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[2]))
  redis.call('SADD', KEYS[3], KEYS[2])
  redis.call('ZADD', KEYS[4], tonumber(ARGV[3]), KEYS[2])
end

return {0,newHold}
`;

const LUA_RELEASE_HOLD = `
-- KEYS[1] = stockKey
-- KEYS[2] = holdKey
-- KEYS[3] = holdSetKey
-- KEYS[4] = holdIdxKey
-- KEYS[5] = reservedKey
local current = tonumber(redis.call('GET', KEYS[2]) or '0')
if current <= 0 then
  redis.call('DEL', KEYS[2])
  redis.call('SREM', KEYS[3], KEYS[2])
  redis.call('ZREM', KEYS[4], KEYS[2])
  return {0,0}
end
redis.call('INCRBY', KEYS[1], current)
local reserved = tonumber(redis.call('GET', KEYS[5]) or '0') - current
if reserved < 0 then reserved = 0 end
redis.call('SET', KEYS[5], reserved)
redis.call('DEL', KEYS[2])
redis.call('SREM', KEYS[3], KEYS[2])
redis.call('ZREM', KEYS[4], KEYS[2])
return {0,current}
`;

const LUA_CONSUME_HOLD = `
-- KEYS[1] = holdKey
-- KEYS[2] = holdSetKey
-- KEYS[3] = holdIdxKey
-- KEYS[4] = reservedKey
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], KEYS[1])
redis.call('ZREM', KEYS[3], KEYS[1])
if current > 0 then
  local reserved = tonumber(redis.call('GET', KEYS[4]) or '0') - current
  if reserved < 0 then reserved = 0 end
  redis.call('SET', KEYS[4], reserved)
end
return {0,current}
`;

function noteHash(note?: string | null): string {
  if (!note) return "";
  return crypto.createHash("sha1").update(String(note)).digest("hex");
}

function parseHoldKey(holdKey: string): { cartKey: string; branchId: string; itemId: string } | null {
  // hold:{cartKey}:{branchId}:{itemId}:{optionsHash}:{noteHash}
  const parts = holdKey.split(":");
  if (parts.length < 4) return null;
  if (parts[0] !== "hold") return null;
  const cartKey = parts[1];
  const branchId = parts[2];
  const itemId = parts[3];
  if (!cartKey || !branchId || !itemId) return null;
  return { cartKey, branchId, itemId };
}

export class RedisStockHoldService implements IStockHoldService {
  private readonly holdSetPrefix = "holds";
  private readonly holdIdxKey = "holdidx";
  private readonly stockPrefix = "stock";
  private readonly reservedPrefix = "reserved";

  private readonly holdKeyTtlSeconds: number;

  constructor(
    private readonly redis: RedisClient,
    private readonly stockRepo: MySQLMenuItemStockRepository,
    private readonly opts: { holdTtlSeconds: number; holdKeyTtlGraceSeconds?: number },
  ) {
    // IMPORTANT: holdKey must outlive the logical hold TTL, otherwise TTL eviction can erase qty
    // before cleanup runs, leaving reserved/stock drifted forever.
    const grace = this.opts.holdKeyTtlGraceSeconds ?? 24 * 3600; // 24h grace by default
    this.holdKeyTtlSeconds = Math.max(this.opts.holdTtlSeconds, 1) + Math.max(grace, 0);
  }

  private kStock(branchId: string, itemId: string) {
    return `${this.stockPrefix}:${branchId}:${itemId}`;
  }

  private kReserved(branchId: string, itemId: string) {
    return `${this.reservedPrefix}:${branchId}:${itemId}`;
  }

  private kHoldSet(cartKey: string) {
    return `${this.holdSetPrefix}:${cartKey}`;
  }

  private kHold(input: StockHoldVariantKey) {
    const nHash = noteHash(input.note ?? null);
    return `hold:${input.cartKey}:${input.branchId}:${input.itemId}:${input.optionsHash}:${nHash}`;
  }

  private async ensureStockKey(branchId: string, itemId: string): Promise<void> {
    const key = this.kStock(branchId, itemId);
    const rKey = this.kReserved(branchId, itemId);
    try {
      const exists = await this.redis.exists(key);
      if (Number(exists) > 0) return;
      await this.stockRepo.ensureStockRow(branchId, itemId);
      const qty = await this.stockRepo.getQuantity(branchId, itemId);
      await this.redis.set(key, String(qty), { NX: true });
      await this.redis.set(rKey, "0", { NX: true });
    } catch {
      // ignore (fallback: lua will treat missing as 0)
    }
  }

  async setDesiredQty(input: StockHoldVariantKey & { desiredQty: number }): Promise<void> {
    const desiredQty = Number(input.desiredQty);
    if (!Number.isInteger(desiredQty) || desiredQty < 0) throw new Error("INVALID_QUANTITY");

    await this.ensureStockKey(input.branchId, input.itemId);

    const stockKey = this.kStock(input.branchId, input.itemId);
    const reservedKey = this.kReserved(input.branchId, input.itemId);
    const holdKey = this.kHold(input);
    const holdSetKey = this.kHoldSet(input.cartKey);

    const expireAt = Date.now() + this.opts.holdTtlSeconds * 1000;

    const res: any = await this.redis.eval(LUA_SET_DESIRED, {
      keys: [stockKey, holdKey, holdSetKey, this.holdIdxKey, reservedKey],
      arguments: [String(desiredQty), String(this.holdKeyTtlSeconds), String(expireAt)],
    });

    // When stock < delta -> returns [-1,stock,current]
    if (Array.isArray(res) && Number(res[0]) === -1) {
      throw new Error("OUT_OF_STOCK");
    }
  }

  async consumeCart(cartKey: string): Promise<void> {
    const setKey = this.kHoldSet(cartKey);
    const holds = await this.redis.sMembers(setKey);
    if (!holds.length) {
      await this.redis.del(setKey);
      return;
    }

    for (const holdKey of holds) {
      const parsed = parseHoldKey(holdKey);
      if (!parsed) continue;
      const reservedKey = this.kReserved(parsed.branchId, parsed.itemId);
      await this.redis.eval(LUA_CONSUME_HOLD, {
        keys: [holdKey, setKey, this.holdIdxKey, reservedKey],
        arguments: [],
      });
    }
    await this.redis.del(setKey);
  }

  async releaseCart(cartKey: string): Promise<void> {
    const setKey = this.kHoldSet(cartKey);
    const holds = await this.redis.sMembers(setKey);
    if (!holds.length) {
      await this.redis.del(setKey);
      return;
    }

    for (const holdKey of holds) {
      const parsed = parseHoldKey(holdKey);
      if (!parsed) continue;
      const stockKey = this.kStock(parsed.branchId, parsed.itemId);
      const reservedKey = this.kReserved(parsed.branchId, parsed.itemId);
      await this.redis.eval(LUA_RELEASE_HOLD, {
        keys: [stockKey, holdKey, setKey, this.holdIdxKey, reservedKey],
        arguments: [],
      });
    }
    await this.redis.del(setKey);
  }

  async cleanupExpired(now: Date = new Date(), limit: number = 200): Promise<{ released: number }> {
  const cutoff = now.getTime();
  // expired = zrangebyscore holdidx -inf cutoff LIMIT 0 limit
  const expired = await this.redis.zRangeByScore(this.holdIdxKey, 0, cutoff, { LIMIT: { offset: 0, count: limit } });
  if (!expired.length) return { released: 0 };

  // Enterprise hardening:
  // If checkout succeeded but consumeCart failed (Redis down), the hold may later expire.
  // We MUST NOT "release" that hold back into stock (would refund sold items).
  // Strategy: batch lookup cart status; if CHECKED_OUT => consume hold (decrease reserved only),
  // else => release hold (increase stock + decrease reserved).
  const cartKeys = new Set<string>();
  const parsedByHold = new Map<string, { cartKey: string; branchId: string; itemId: string }>();
  for (const hk of expired) {
    const p = parseHoldKey(hk);
    if (!p) continue;
    parsedByHold.set(hk, p);
    cartKeys.add(p.cartKey);
  }

  const statusByCart = new Map<string, string>();
  if (cartKeys.size > 0) {
    const arr = Array.from(cartKeys);
    const placeholders = arr.map(() => "?").join(", ");
    const [rows]: any = await pool.query(
      `SELECT cart_key, cart_status FROM carts WHERE cart_key IN (${placeholders})`,
      arr,
    );
    for (const r of (rows ?? [])) {
      statusByCart.set(String(r.cart_key), String(r.cart_status));
    }
  }

  let cleaned = 0;

  for (const holdKey of expired) {
    const parsed = parsedByHold.get(holdKey) ?? parseHoldKey(holdKey);
    if (!parsed) {
      // Best-effort remove corrupted member so we don't loop forever.
      try {
        await this.redis.zRem(this.holdIdxKey, holdKey);
      } catch {
        // ignore
      }
      continue;
    }

    const setKey = this.kHoldSet(parsed.cartKey);
    const reservedKey = this.kReserved(parsed.branchId, parsed.itemId);
    const cartStatus = statusByCart.get(parsed.cartKey) ?? "UNKNOWN";

    try {
      if (cartStatus === "CHECKED_OUT") {
        const out: any = await this.redis.eval(LUA_CONSUME_HOLD, {
          keys: [holdKey, setKey, this.holdIdxKey, reservedKey],
          arguments: [],
        });
        if (Array.isArray(out) && Number(out[1]) > 0) cleaned += 1;
      } else {
        const stockKey = this.kStock(parsed.branchId, parsed.itemId);
        const out: any = await this.redis.eval(LUA_RELEASE_HOLD, {
          keys: [stockKey, holdKey, setKey, this.holdIdxKey, reservedKey],
          arguments: [],
        });
        if (Array.isArray(out) && Number(out[1]) > 0) cleaned += 1;
      }
    } catch {
      // ignore per-hold failure; next tick will retry
    }
  }

  // "released" means "holds cleared" (either released or consumed) for operational visibility.
  return { released: cleaned };
}
}
