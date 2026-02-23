import type { RedisClient } from "../../../../infrastructure/redis/redisClient.js";

export type ActiveHoldRow = {
  holdKey: string;
  cartKey: string;
  branchId: string;
  itemId: string;
  optionsHash: string;
  noteHash: string;
  qty: number;
  expireAtMs: number;
};

function parseHoldKey(holdKey: string): Omit<ActiveHoldRow, "qty" | "expireAtMs"> | null {
  // hold:{cartKey}:{branchId}:{itemId}:{optionsHash}:{noteHash}
  const parts = holdKey.split(":");
  if (parts.length < 6) return null;
  if (parts[0] !== "hold") return null;
  const [_, cartKey, branchId, itemId, optionsHash, noteHash] = parts;
  if (!cartKey || !branchId || !itemId) return null;
  return {
    holdKey,
    cartKey,
    branchId,
    itemId,
    optionsHash: optionsHash ?? "",
    noteHash: noteHash ?? "",
  };
}

export class ListActiveHolds {
  constructor(private readonly redis: RedisClient) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId?: string | null;
    limit?: number | null;
  }): Promise<ActiveHoldRow[]> {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = input.branchId === undefined ? null : input.branchId;
    const limit = Math.max(1, Math.min(500, Math.floor(Number(input.limit ?? 200))));

    if (actorRole === "BRANCH_MANAGER") {
      branchId = input.actor.branchId;
    }

    const now = Date.now();
    const keys = await this.redis.zRangeByScore("holdidx", now, "+inf", {
      LIMIT: { offset: 0, count: limit },
    } as any);

    if (!keys.length) return [];

    // Fetch qty + expireAt for each key (best-effort).
    const out: ActiveHoldRow[] = [];
    const qtys = await this.redis.mGet(keys);

    for (let i = 0; i < keys.length; i++) {
      const hk = String(keys[i]);
      const parsed = parseHoldKey(hk);
      if (!parsed) continue;

      // Optional filter
      if (branchId && String(parsed.branchId) !== String(branchId)) continue;

      const qty = Number(qtys?.[i] ?? 0);
      const score = await this.redis.zScore("holdidx", hk);
      const expireAtMs = Number(score ?? 0);

      out.push({
        ...parsed,
        qty: Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0,
        expireAtMs: Number.isFinite(expireAtMs) ? expireAtMs : 0,
      });
    }

    return out;
  }
}
