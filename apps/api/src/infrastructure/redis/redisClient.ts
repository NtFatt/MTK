import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env.js";
import { log } from "../observability/logger.js";
import { requestContext } from "../observability/context.js";
import { addSpanEvent } from "../observability/tracing.js";
import { observeRedis, observeRedisSlow } from "../observability/metrics.js";
import { fingerprintRedis, pushSlowRedisSample } from "../observability/slowRedisStore.js";

export type RedisClient = RedisClientType;

function truncate(s: string, max = 500): string {
  const v = String(s ?? "");
  return v.length <= max ? v : `${v.slice(0, max)}...`;
}

function instrumentSendCommand(client: RedisClient): void {
  const anyClient: any = client as any;
  const raw = anyClient.sendCommand?.bind(client);
  if (typeof raw !== "function") return;

  anyClient.sendCommand = async (args: any, ...rest: any[]) => {
    const cmd = Array.isArray(args) && args.length ? String(args[0] ?? "").toUpperCase() : "UNKNOWN";
    const start = process.hrtime.bigint();
    try {
      return await raw(args, ...rest);
    } finally {
      const end = process.hrtime.bigint();
      const ms = Number(end - start) / 1_000_000;
      observeRedis(cmd, ms);

      if (ms >= env.REDIS_SLOW_OP_MS) {
        const rid = requestContext.getRequestId();
        const argv: unknown[] = Array.isArray(args) ? args.slice(1) : [];
        const fingerprint = fingerprintRedis(cmd, argv);
        observeRedisSlow(cmd);

        const argsPreview = Array.isArray(args)
          ? args
              .slice(0, 12)
              .map((x: any) => (typeof x === "string" ? x : String(x)))
              .join(" ")
          : "";

        pushSlowRedisSample({
          rid: rid ?? undefined,
          cmd,
          durationMs: Math.round(ms * 1000) / 1000,
          fingerprint,
          argsPreview,
        });

        log.warn("redis_slow_command", {
          rid,
          cmd,
          durationMs: Math.round(ms * 1000) / 1000,
          fingerprint,
          args: truncate(argsPreview),
        });

        addSpanEvent("redis.slow_command", {
          "db.system": "redis",
          "db.operation": cmd,
          "hadilao.rid": rid ?? "",
          "hadilao.redis_fingerprint": fingerprint,
          "hadilao.duration_ms": Math.round(ms * 1000) / 1000,
          "db.statement": truncate(argsPreview, 500),
        } as any);
      }
    }
  };
}

export async function connectRedis(url: string): Promise<RedisClient> {
  const client = createClient({ url });

  client.on("error", (err: unknown) => {
    // keep boot resilient
    log.error("redis_error", { err: String((err as any)?.message ?? err) });
  });

  await client.connect();
  instrumentSendCommand(client);
  return client;
}

export async function disconnectRedis(client: RedisClient | null | undefined): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
  }
}
