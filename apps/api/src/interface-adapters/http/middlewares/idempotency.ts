import type { NextFunction, Request, Response } from "express";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import { env } from "../../../infrastructure/config/env.js";

type StoredResponse =
  | { state: "PENDING"; startedAt: string }
  | {
    state: "DONE";
    status: number;
    type: "json" | "text";
    body: unknown;
    finishedAt: string;
  };

type CapturedResponse = {
  status: number;
  type: "json" | "text";
  body: unknown;
};

function isCapturedResponse(value: unknown): value is CapturedResponse {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;
  return (
    typeof v.status === "number" &&
    (v.type === "json" || v.type === "text") &&
    "body" in v
  );
}
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Redis-backed idempotency wrapper (M2).
 *
 * Key format:
 * idempotency:{endpoint}:{orderCode}:{Idempotency-Key}
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

  return function <T extends (req: Request, res: Response, next?: NextFunction) => unknown>(handler: T) {
    return async function (req: Request, res: Response, next: NextFunction) {
      const redis = opts.redis;

      try {
        if (!redis) throw new Error("REDIS_REQUIRED");

        const idemKey = req.header(headerName);
        if (!idemKey || String(idemKey).trim().length === 0) {
          throw new Error("IDEMPOTENCY_KEY_REQUIRED");
        }

        const code = String((req.params as Record<string, unknown> | undefined)?.[paramName] ?? "");
        const redisKey = `idempotency:${opts.endpoint}:${code}:${idemKey}`;

        // 1) Fast path: already done
        const existing = await redis.get(redisKey);
        if (existing) {
          const parsed = JSON.parse(existing) as StoredResponse;
          if (parsed.state === "DONE") {
            if (parsed.type === "json") {
              return res.status(parsed.status).json(parsed.body);
            }
            return res.status(parsed.status).send(String(parsed.body));
          }
        }

        // 2) Acquire lock (PENDING)
        const pending: StoredResponse = {
          state: "PENDING",
          startedAt: new Date().toISOString(),
        };

        const ok = await redis.set(redisKey, JSON.stringify(pending), {
          NX: true,
          EX: ttlSeconds,
        });

        if (!ok) {
          for (const ms of [80, 160, 320, 640, 800]) {
            await sleep(ms);

            const v = await redis.get(redisKey);
            if (!v) break;

            const parsed = JSON.parse(v) as StoredResponse;
            if (parsed.state === "DONE") {
              if (parsed.type === "json") {
                return res.status(parsed.status).json(parsed.body);
              }
              return res.status(parsed.status).send(String(parsed.body));
            }
          }

          throw new Error("IDEMPOTENCY_IN_PROGRESS");
        }

        // 3) We are the leader: capture response and persist.
        let captured: CapturedResponse | null = null;

        const origJson = res.json.bind(res);
        const origSend = res.send.bind(res);

        (res as Response & { json: typeof res.json }).json = (body: unknown) => {
          captured = {
            status: res.statusCode || 200,
            type: "json",
            body,
          };
          return origJson(body);
        };

        (res as Response & { send: typeof res.send }).send = (body: unknown) => {
          captured = {
            status: res.statusCode || 200,
            type: "text",
            body,
          };
          return origSend(body);
        };

        try {
          await handler(req, res, next);

          const snapshot: unknown = captured;

          if (isCapturedResponse(snapshot)) {
            const done: StoredResponse = {
              state: "DONE",
              status: snapshot.status,
              type: snapshot.type,
              body: snapshot.body,
              finishedAt: new Date().toISOString(),
            };

            await redis.set(redisKey, JSON.stringify(done), {
              EX: ttlSeconds,
            });
          } else {
            await redis.del(redisKey);
          }
        } catch (error) {
          await redis.del(redisKey);
          return next(error);
        }
      } catch (error) {
        return next(error);
      }
    };
  };
}