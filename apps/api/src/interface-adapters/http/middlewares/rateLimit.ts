import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";

function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function normalizeIp(raw: string): string {
  const ip = String(raw || "").trim();
  if (!ip) return "unknown";
  // x-forwarded-for can be a list.
  const first = ip.split(",")[0]?.trim();
  return first || ip;
}

function ipPrefix(ip: string): string {
  const s = normalizeIp(ip);
  if (s === "unknown") return s;
  if (s.includes(":")) {
    // IPv6: keep first 4 hextets (rough /64-ish prefix)
    const parts = s.split(":").filter(Boolean);
    return parts.slice(0, 4).join(":") || s;
  }
  const parts = s.split(".");
  if (parts.length >= 3) return parts.slice(0, 3).join(".");
  return s;
}

function fingerprint(req: Request): string {
  const ua = String(req.header("user-agent") ?? "").trim();
  const al = String(req.header("accept-language") ?? "").trim();
  const ip = normalizeIp(String(req.headers["x-forwarded-for"] ?? req.ip ?? ""));
  const ipp = ipPrefix(ip);
  return sha256Hex(`${ua}|${al}|${ipp}`);
}

async function incrWithTtl(redis: RedisClient, key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
  // Atomic: INCR, if first set EXPIRE; then return TTL.
  const script = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {c, ttl}
`;

  const out: any = await redis.eval(script, { keys: [key], arguments: [String(windowSeconds)] });
  const count = Array.isArray(out) ? Number(out[0] ?? 0) : Number(out ?? 0);
  const ttl = Array.isArray(out) ? Number(out[1] ?? 0) : windowSeconds;
  return { count: Number.isFinite(count) ? count : 0, ttl: Number.isFinite(ttl) ? ttl : windowSeconds };
}

function respondRateLimited(res: Response, input: { limit: number; windowSeconds: number; retryAfterSeconds: number }) {
  const requestId = String((res.locals as any)?.requestId ?? "");
  const body = {
    code: "RATE_LIMITED",
    message: "Rate limited",
    error: {
      code: "RATE_LIMITED",
      message: "Rate limited",
      details: {
        limit: input.limit,
        windowSeconds: input.windowSeconds,
        retryAfterSeconds: Math.max(1, input.retryAfterSeconds),
      },
    },
    meta: requestId ? { requestId } : undefined,
  };

  res.setHeader("Retry-After", String(Math.max(1, input.retryAfterSeconds)));
  return res.status(429).json(body);
}

export type RateLimitSpec = {
  scope: "otp:req" | "otp:verify" | "admin:login";
  limit: number;
  windowSeconds: number;
  getIdentity: (req: Request) => string;
};

/**
 * Redis-backed rate limiter (M3).
 * Key format (spec): rl:{scope}:{ip}:{identity}:{fp}
 */
export function rateLimit(redis: RedisClient | undefined, spec: RateLimitSpec) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      if (!redis) throw new Error("REDIS_REQUIRED");

      const ip = normalizeIp(String(req.headers["x-forwarded-for"] ?? req.ip ?? ""));
      const ipKey = ipPrefix(ip);
      const identityRaw = spec.getIdentity(req);
      const identity = String(identityRaw || "anonymous").trim() || "anonymous";
      const fp = fingerprint(req);

      const key = `rl:${spec.scope}:${ipKey}:${identity}:${fp}`;
      const { count, ttl } = await incrWithTtl(redis, key, spec.windowSeconds);

      if (count > spec.limit) {
        return respondRateLimited(res, { limit: spec.limit, windowSeconds: spec.windowSeconds, retryAfterSeconds: ttl });
      }

      return next();
    } catch (e) {
      return next(e as any);
    }
  };
}
