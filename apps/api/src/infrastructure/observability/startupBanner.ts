// src/infrastructure/observability/startupBanner.ts
import { env } from "../config/env.js";

type Flags = {
  redisUrl?: string;
  realtimeMode: "redis" | "inmemory" | "off";
  socketEnabled: boolean;
  socketPath: string;
};

function onOff(v: boolean) {
  return v ? "on" : "off";
}

export function printStartupBanner(
  logger: { info: (obj: any, msg?: string) => void },
  opts: {
    httpUrl: string;
    mysql: { host: string; port: number; db: string };
    flags: Flags;
  }
) {
  const lines: string[] = [];

  lines.push("╭─────────────────────────────────────────────────────────────╮");
  lines.push(`│ Hadilao API (${env.NODE_ENV})`.padEnd(61) + "│");
  lines.push("├─────────────────────────────────────────────────────────────┤");
  lines.push(`│ HTTP      : ${opts.httpUrl}`.padEnd(61) + "│");
  lines.push(
    `│ Socket.IO : ${opts.flags.socketEnabled ? "enabled" : "disabled"}  path=${opts.flags.socketPath}`
      .padEnd(61) + "│"
  );
  lines.push(
    `│ Redis     : ${opts.flags.redisUrl ? "connected" : "disabled"}${opts.flags.redisUrl ? ` url=${opts.flags.redisUrl}` : ""}`
      .padEnd(61) + "│"
  );
  lines.push(
    `│ DB        : mysql ${opts.mysql.host}:${opts.mysql.port}/${opts.mysql.db}`
      .padEnd(61) + "│"
  );
  lines.push("├─────────────────────────────────────────────────────────────┤");
  lines.push("│ Features".padEnd(61) + "│");
  lines.push(
    `│  - Realtime event bus     : ${opts.flags.realtimeMode}${env.REALTIME_EVENT_VERSION ? ` (v=${env.REALTIME_EVENT_VERSION})` : ""}`
      .padEnd(61) + "│"
  );
  lines.push(
    `│  - Admin audit            : ${onOff(env.REALTIME_ADMIN_AUDIT_ENABLED)}`
      .padEnd(61) + "│"
  );
  lines.push(
    `│  - Session store (Redis)  : ${onOff(env.REDIS_SESSION_STORE_ENABLED)} (ttl=${env.REDIS_SESSION_TTL_SECONDS}s)`
      .padEnd(61) + "│"
  );
  lines.push(
    `│  - Stock holds (Redis)    : ${onOff(env.REDIS_STOCK_HOLDS_ENABLED)} (ttl=${env.REDIS_STOCK_HOLD_TTL_SECONDS}s, cleanup=${env.REDIS_STOCK_HOLD_CLEANUP_INTERVAL_SECONDS}s)`
      .padEnd(61) + "│"
  );
  lines.push(
    `│  - Menu cache (Redis)     : ${onOff(env.MENU_CACHE_ENABLED)} (ttl=${env.MENU_CACHE_TTL_SECONDS}s)`
      .padEnd(61) + "│"
  );
  lines.push(
    `│  - Stock rehydrate        : ${onOff(env.STOCK_REHYDRATE_ENABLED)} (interval=${env.STOCK_REHYDRATE_INTERVAL_SECONDS}s)`
      .padEnd(61) + "│"
  );
  lines.push(
    `│  - Maintenance jobs       : ${onOff(env.MAINTENANCE_JOBS_ENABLED)} (interval=${env.MAINTENANCE_INTERVAL_SECONDS}s)`
      .padEnd(61) + "│"
  );
  lines.push(
    `│  - Metrics                : ${onOff(env.METRICS_ENABLED)} (${env.METRICS_PATH})`
      .padEnd(61) + "│"
  );
  lines.push(
    `│  - Slow query threshold   : ${env.SLOW_QUERY_MS}ms`
      .padEnd(61) + "│"
  );
  lines.push("╰─────────────────────────────────────────────────────────────╯");

  logger.info({ banner: lines.join("\n") }, "startup_banner");
}
