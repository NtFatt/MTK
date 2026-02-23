import http from "node:http";
import { Server as SocketIOServer } from "socket.io";

import { createApp } from "../infrastructure/http/express/app.js";
import { env } from "../infrastructure/config/env.js";
import { log } from "../infrastructure/observability/logger.js";

// Realtime + event bus
import type { IEventBus } from "../application/ports/events/IEventBus.js";
import { InMemoryEventBus } from "../infrastructure/realtime/InMemoryEventBus.js";
import { RedisEventBus } from "../infrastructure/realtime/RedisEventBus.js";
import { attachSocketGateway } from "../infrastructure/realtime/SocketGateway.js";
import { MySQLRealtimeAdminAuditRepository } from "../infrastructure/db/mysql/repositories/MySQLRealtimeAdminAuditRepository.js";
import { connectRedis, disconnectRedis, type RedisClient } from "../infrastructure/redis/redisClient.js";

// Optional background jobs (P0 stabilization)
import { MySQLMaintenanceRepository } from "../infrastructure/db/mysql/repositories/MySQLMaintenanceRepository.js";
import { RunMaintenanceJobs } from "../application/use-cases/maintenance/RunMaintenanceJobs.js";

// Repos for socket join verification
import { MySQLOrderRepository } from "../infrastructure/db/mysql/repositories/MySQLOrderRepository.js";
import { MySQLTableSessionRepository } from "../infrastructure/db/mysql/repositories/MySQLTableSessionRepository.js";

// Phase-1 performance patch
import { RedisTableSessionRepository } from "../infrastructure/redis/repositories/RedisTableSessionRepository.js";
import { MySQLMenuItemStockRepository } from "../infrastructure/db/mysql/repositories/MySQLMenuItemStockRepository.js";
import { RedisStockHoldService } from "../infrastructure/redis/stock/RedisStockHoldService.js";
import { RedisStockRehydrateJob } from "../infrastructure/redis/stock/RedisStockRehydrateJob.js";

/**
 * FIX TS2375 with exactOptionalPropertyTypes:
 * Không được return { stack: undefined } khi stack là optional.
 */
function toErr(e: unknown): { message: string; stack?: string } {
  if (e instanceof Error) {
    const out: { message: string; stack?: string } = { message: e.message };
    if (e.stack) out.stack = e.stack;
    return out;
  }
  return { message: String(e) };
}

function onOff(v: boolean) {
  return v ? "on" : "off";
}

function padLine(s: string, width = 61) {
  return s.length >= width ? s.slice(0, width) : s.padEnd(width, " ");
}

function printStartupBanner(opts: {
  httpUrl: string;
  redisUrl?: string;
  realtimeMode: "redis" | "inmemory" | "off";
  socketEnabled: boolean;
  socketPath: string;
}) {
  const lines: string[] = [];

  lines.push("╭─────────────────────────────────────────────────────────────╮");
  lines.push(`│ ${padLine(`Hadilao API (${env.NODE_ENV})`, 59)} │`);
  lines.push("├─────────────────────────────────────────────────────────────┤");
  lines.push(`│ ${padLine(`HTTP      : ${opts.httpUrl}`, 59)} │`);
  lines.push(
    `│ ${padLine(
      `Socket.IO : ${opts.socketEnabled ? "enabled" : "disabled"}  path=${opts.socketPath}`,
      59,
    )} │`,
  );
  lines.push(
    `│ ${padLine(
      `Redis     : ${opts.redisUrl ? "connected" : "disabled"}${opts.redisUrl ? ` url=${opts.redisUrl}` : ""}`,
      59,
    )} │`,
  );
  lines.push(
    `│ ${padLine(
      `DB        : mysql ${env.MYSQL_HOST}:${env.MYSQL_PORT}/${env.MYSQL_DATABASE}`,
      59,
    )} │`,
  );
  lines.push("├─────────────────────────────────────────────────────────────┤");
  lines.push(`│ ${padLine("Features", 59)} │`);
  lines.push(
    `│ ${padLine(
      ` - Realtime event bus     : ${opts.realtimeMode}${env.REALTIME_EVENT_VERSION ? ` (v=${env.REALTIME_EVENT_VERSION})` : ""}`,
      59,
    )} │`,
  );
  lines.push(`│ ${padLine(` - Admin audit            : ${onOff(env.REALTIME_ADMIN_AUDIT_ENABLED)}`, 59)} │`);
  lines.push(
    `│ ${padLine(
      ` - Session store (Redis)  : ${onOff(env.REDIS_SESSION_STORE_ENABLED)} (ttl=${env.REDIS_SESSION_TTL_SECONDS}s)`,
      59,
    )} │`,
  );
  lines.push(
    `│ ${padLine(
      ` - Stock holds (Redis)    : ${onOff(env.REDIS_STOCK_HOLDS_ENABLED)} (ttl=${env.REDIS_STOCK_HOLD_TTL_SECONDS}s, cleanup=${env.REDIS_STOCK_HOLD_CLEANUP_INTERVAL_SECONDS}s)`,
      59,
    )} │`,
  );
  lines.push(
    `│ ${padLine(
      ` - Menu cache (Redis)     : ${onOff(env.MENU_CACHE_ENABLED)} (ttl=${env.MENU_CACHE_TTL_SECONDS}s)`,
      59,
    )} │`,
  );
  lines.push(
    `│ ${padLine(
      ` - Stock rehydrate        : ${onOff(env.STOCK_REHYDRATE_ENABLED)} (interval=${env.STOCK_REHYDRATE_INTERVAL_SECONDS}s)`,
      59,
    )} │`,
  );
  lines.push(
    `│ ${padLine(
      ` - Maintenance jobs       : ${onOff(env.MAINTENANCE_JOBS_ENABLED)} (interval=${env.MAINTENANCE_INTERVAL_SECONDS}s)`,
      59,
    )} │`,
  );
  // Các env observability có thể có/không tuỳ branch của bạn
  if ((env as any).METRICS_ENABLED !== undefined) {
    lines.push(
      `│ ${padLine(
        ` - Metrics                : ${onOff((env as any).METRICS_ENABLED)} (${(env as any).METRICS_PATH ?? "/metrics"})`,
        59,
      )} │`,
    );
  }
  if ((env as any).SLOW_QUERY_MS !== undefined) {
    lines.push(`│ ${padLine(` - Slow query threshold   : ${(env as any).SLOW_QUERY_MS}ms`, 59)} │`);
  }

  lines.push("╰─────────────────────────────────────────────────────────────╯");

  log.info("startup_banner", { banner: lines.join("\n") });
}

async function main() {
  let eventBus: IEventBus = new InMemoryEventBus();
  let redisPub: RedisClient | null = null;
  let redisSub: RedisClient | null = null;
  let redisIoPub: RedisClient | null = null;
  let redisIoSub: RedisClient | null = null;

  // ===== Event bus init =====
  if (env.REDIS_URL) {
    redisPub = await connectRedis(env.REDIS_URL);
    redisSub = await connectRedis(env.REDIS_URL);
    eventBus = new RedisEventBus(redisPub, redisSub, "hadilao:events");
  }

  // ===== Express app =====
  const app = createApp(redisPub ? { eventBus, redis: redisPub } : { eventBus });
  const server = http.createServer(app);

  // ===== Socket.IO =====
  let io: SocketIOServer | null = null;
  if (env.REALTIME_ENABLED) {
    io = new SocketIOServer(
      server,
      ({
        path: env.SOCKET_PATH,
        cors: { origin: "*", methods: ["GET", "POST"] },
      } as any),
    );

    // Multi-instance scaling: share Socket.IO rooms/events via Redis adapter
    if (redisPub && env.SOCKET_REDIS_ADAPTER_ENABLED) {
      // IMPORTANT: dùng dynamic import để tránh crash nếu chưa pnpm install dependency.
      // Khi dependency có mặt, adapter sẽ bật bình thường.
      try {
        const mod: any = await import("@socket.io/redis-adapter");
        const createAdapter: any = mod?.createAdapter ?? mod?.default?.createAdapter;
        if (!createAdapter) throw new Error("@socket.io/redis-adapter: missing createAdapter export");

        // Use dedicated pub/sub clients for Socket.IO adapter (do NOT reuse event-bus sub client)
        redisIoPub = await connectRedis(env.REDIS_URL);
        redisIoSub = await connectRedis(env.REDIS_URL);
        io.adapter(createAdapter(redisIoPub as any, redisIoSub as any));
        log.info("socketio.redis_adapter.enabled");
      } catch (e) {
        log.warn("socketio.redis_adapter.unavailable", { err: toErr(e) });
      }
    }

    const sessionRepoBase = new MySQLTableSessionRepository();
    const sessionRepo =
      redisPub && env.REDIS_SESSION_STORE_ENABLED
        ? new RedisTableSessionRepository(sessionRepoBase, redisPub, env.REDIS_SESSION_TTL_SECONDS)
        : sessionRepoBase;

    // FIX TS2379 (exactOptionalPropertyTypes):
    // Không truyền redis/adminAuditRepo với value undefined. Chỉ add field nếu có.
    const gatewayDeps: any = {
      orderRepo: new MySQLOrderRepository(),
      sessionRepo,
    };
    if (redisPub) gatewayDeps.redis = redisPub;
    if (env.REALTIME_ADMIN_AUDIT_ENABLED) gatewayDeps.adminAuditRepo = new MySQLRealtimeAdminAuditRepository();

    attachSocketGateway(io, eventBus, gatewayDeps);
  }

  // ===== Listen + Banner =====
  server.listen(env.PORT, () => {
    const httpUrl = `http://localhost:${env.PORT}`;
    const realtimeMode: "redis" | "inmemory" | "off" =
      env.REALTIME_ENABLED ? (redisPub ? "redis" : "inmemory") : "off";

    printStartupBanner({
      httpUrl,
      redisUrl: env.REDIS_URL ?? undefined,
      realtimeMode,
      socketEnabled: env.REALTIME_ENABLED,
      socketPath: env.SOCKET_PATH,
    });
  });

  // ===== Phase-1: Release expired stock-holds back to Redis stock. =====
  if (redisPub && env.REDIS_STOCK_HOLDS_ENABLED) {
    const stockRepo = new MySQLMenuItemStockRepository();
    const holds = new RedisStockHoldService(redisPub, stockRepo, {
      holdTtlSeconds: env.REDIS_STOCK_HOLD_TTL_SECONDS,
    });

    const tick = async () => {
      try {
        const result = await holds.cleanupExpired(new Date(), 300);
        if (result.released > 0) {
          log.info("stock_holds_cleanup", { released: result.released });
        }
      } catch {
        // ignore
      }
    };

    void tick();
    const intervalMs = env.REDIS_STOCK_HOLD_CLEANUP_INTERVAL_SECONDS * 1000;
    const timer = setInterval(() => void tick(), intervalMs);
    timer.unref();
  }

  // ===== Phase-2: Inventory drift control (rehydrate Redis stock from MySQL SoT). =====
  if (redisPub && env.STOCK_REHYDRATE_ENABLED) {
    const job = new RedisStockRehydrateJob(redisPub);

    const tick = async () => {
      try {
        const r = await job.runOnce();
        if (r.skipped) {
          log.info("stock_rehydrate_skipped", { lockKey: "lock:stock_rehydrate" });
        } else {
          log.info("stock_rehydrate", {
            scanned: r.scanned,
            corrected: r.corrected,
            maxAbsDrift: r.maxAbsDrift,
            totalAbsDrift: r.totalAbsDrift,
          });
        }
      } catch (e) {
        log.error("stock_rehydrate_failed", { err: toErr(e) });
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), env.STOCK_REHYDRATE_INTERVAL_SECONDS * 1000);
    timer.unref();
  }

  // ===== Optional background jobs (P0 stabilization) =====
  if (env.MAINTENANCE_JOBS_ENABLED) {
    const repo = new MySQLMaintenanceRepository();
    const runner = new RunMaintenanceJobs(repo);

    const tick = async () => {
      try {
        const result = await runner.execute({
          branchId: null,
          lockAheadMinutes: env.TABLE_STATUS_LOCK_AHEAD_MINUTES,
          noShowGraceMinutes: env.RESERVATION_CHECKIN_LATE_MINUTES,
          sessionStaleMinutes: env.MAINTENANCE_SESSION_STALE_MINUTES,
        });
        log.info("maintenance_ok", result);
      } catch (e: unknown) {
        log.error("maintenance_failed", { err: toErr(e) });
      }
    };

    void tick();
    const intervalMs = env.MAINTENANCE_INTERVAL_SECONDS * 1000;
    const timer = setInterval(() => void tick(), intervalMs);
    timer.unref();
  }

  function shutdown(signal: string) {
    log.info("shutdown", { signal });

    try {
      io?.close();
    } catch {
      // ignore
    }

    server.close(() => {
      Promise.all([
        disconnectRedis(redisIoSub),
        disconnectRedis(redisIoPub),
        disconnectRedis(redisSub),
        disconnectRedis(redisPub),
      ]).finally(() => process.exit(0));
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((e) => {
  log.error("fatal", { err: toErr(e) });
  process.exit(1);
});
