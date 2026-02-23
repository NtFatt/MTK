import type { NextFunction, Request, Response } from "express";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import { env } from "../../../infrastructure/config/env.js";

type StoredResponse =
  | { state: "PENDING"; startedAt: string }
  | { state: "DONE"; status: number; type: "json" | "text"; body: any; finishedAt: string };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Redis-backed idempotency wrapper (M2).
 *
 * Key format (spec): idempotency:{endpoint}:{orderCode}:{Idempotency-Key}
 */
export function withIdempotency(opts: {
  redis?: RedisClient;
  endpoint: string;
  ttlSeconds?: number;
  headerName?: string;
  paramName?: string;
}) {
  const headerName = opts.headerName ?? "Idempotency-Key";
  const paramName = opts.paramName ?? "orderCode";
  const ttlSeconds = opts.ttlSeconds ?? env.IDEMPOTENCY_TTL_SECONDS;

  return function <T extends (req: Request, res: Response, next?: NextFunction) => any>(handler: T) {
    return async function (req: Request, res: Response, next: NextFunction) {
      try {
        if (!opts.redis) throw new Error("REDIS_REQUIRED");

        const idemKey = req.header(headerName);
        if (!idemKey || String(idemKey).trim().length === 0) throw new Error("IDEMPOTENCY_KEY_REQUIRED");

        const code = String((req.params as any)?.[paramName] ?? "");
        const redisKey = `idempotency:${opts.endpoint}:${code}:${idemKey}`;

        // 1) Fast path: already done
        const existing = await opts.redis.get(redisKey);
        if (existing) {
          const parsed: StoredResponse = JSON.parse(existing);
          if (parsed.state === "DONE") {
            if (parsed.type === "json") return res.status(parsed.status).json(parsed.body);
            return res.status(parsed.status).send(String(parsed.body));
          }
        }

        // 2) Acquire lock (PENDING)
        const pending: StoredResponse = { state: "PENDING", startedAt: new Date().toISOString() };
        const ok = await opts.redis.set(redisKey, JSON.stringify(pending), {
          NX: true,
          EX: ttlSeconds,
        });

        if (!ok) {
          // Another request is processing or already stored; poll briefly.
          for (const ms of [80, 160, 320, 640, 800]) {
            await sleep(ms);
            const v = await opts.redis.get(redisKey);
            if (!v) break;
            const parsed: StoredResponse = JSON.parse(v);
            if (parsed.state === "DONE") {
              if (parsed.type === "json") return res.status(parsed.status).json(parsed.body);
              return res.status(parsed.status).send(String(parsed.body));
            }
          }
          throw new Error("IDEMPOTENCY_IN_PROGRESS");
        }

        // 3) We are the leader: capture response and persist.
        let captured: { status: number; type: "json" | "text"; body: any } | null = null;
        const origJson = res.json.bind(res);
        const origSend = res.send.bind(res);

        (res as any).json = (body: any) => {
          captured = { status: res.statusCode || 200, type: "json", body };
          return origJson(body);
        };

        (res as any).send = (body: any) => {
          captured = { status: res.statusCode || 200, type: "text", body };
          return origSend(body);
        };

        try {
          await handler(req, res, next);

          // If the handler already sent response, persist it.
          if (captured) {
            const done: StoredResponse = {
              state: "DONE",
              status: captured.status,
              type: captured.type,
              body: captured.body,
              finishedAt: new Date().toISOString(),
            };
            await opts.redis.set(redisKey, JSON.stringify(done), { EX: ttlSeconds });
          } else {
            // No response captured; drop the key so client can retry.
            await opts.redis.del(redisKey);
          }
        } catch (e) {
          await opts.redis.del(redisKey);
          return next(e as any);
        }
      } catch (e) {
        return next(e as any);
      }
    };
  };
}
