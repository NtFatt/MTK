import type { Request, Response } from "express";
import { listSlowQuerySamples } from "../../../infrastructure/observability/slowQueryStore.js";
import { listSlowRedisSamples } from "../../../infrastructure/observability/slowRedisStore.js";

function toInt(raw: unknown, fallback: number): number {
  const n = Number(raw ?? NaN);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

/**
 * Admin-only observability endpoints.
 * Enterprise goal: provide fast triage without ssh/log digging.
 */
export class AdminObservabilityController {
  slowQueries = async (req: Request, res: Response) => {
    const limit = Math.min(toInt(req.query.limit, 100), 500);
    const minMs = toInt(req.query.minMs, 0);
    const items = listSlowQuerySamples({ limit, minMs });
    return res.json({ limit, minMs, count: items.length, items });
  };

  slowRedis = async (req: Request, res: Response) => {
    const limit = Math.min(toInt(req.query.limit, 100), 500);
    const minMs = toInt(req.query.minMs, 0);
    const items = listSlowRedisSamples({ limit, minMs });
    return res.json({ limit, minMs, count: items.length, items });
  };
}
