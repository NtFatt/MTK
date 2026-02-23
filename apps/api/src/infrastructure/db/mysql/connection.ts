import mysql from "mysql2/promise";
import { env } from "../../config/env.js";
import { log } from "../../observability/logger.js";
import { observeDb, observeDbSlow } from "../../observability/metrics.js";
import { requestContext } from "../../observability/context.js";
import { addSpanEvent } from "../../observability/tracing.js";
import { fingerprintSql, pushSlowQuerySample } from "../../observability/slowQueryStore.js";

// Single source of truth for DB config: MYSQL_* in .env
// - bigNumberStrings avoids precision loss for BIGINT UNSIGNED
// - decimalNumbers converts DECIMAL -> number
export const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  supportBigNumbers: true,
  bigNumberStrings: true,
  decimalNumbers: true,
});

function extractSql(arg0: any): string {
  if (!arg0) return "";
  if (typeof arg0 === "string") return arg0;
  if (typeof arg0 === "object" && typeof arg0.sql === "string") return arg0.sql;
  return "";
}

function truncate(s: string, max = 600): string {
  const v = String(s ?? "");
  return v.length <= max ? v : `${v.slice(0, max)}...`;
}

// ===== Observability: slow query logging + basic metrics =====
// Patch pool.query/execute so all repositories are automatically instrumented.
const _query = pool.query.bind(pool);
const _execute = pool.execute.bind(pool);

async function instrumented(op: "query" | "execute", fn: Function, args: any[]) {
  const start = process.hrtime.bigint();
  try {
    return await fn(...args);
  } finally {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    observeDb(op, ms);

    if (ms >= env.SLOW_QUERY_MS) {
      const rid = requestContext.getRequestId();
      const sql = extractSql(args[0]);
      const fingerprint = fingerprintSql(sql);
      observeDbSlow(op);
      pushSlowQuerySample({
        rid: rid ?? undefined,
        op,
        durationMs: Math.round(ms * 1000) / 1000,
        fingerprint,
        sqlPreview: sql,
      });

      log.warn("slow_query", {
        rid,
        op,
        durationMs: Math.round(ms * 1000) / 1000,
        fingerprint,
        sql: truncate(sql),
      });

      addSpanEvent("db.slow_query", {
        "db.system": "mysql",
        "db.operation": op,
        "db.statement": truncate(sql, 500),
        "hadilao.rid": rid ?? "",
        "hadilao.sql_fingerprint": fingerprint,
        "hadilao.duration_ms": Math.round(ms * 1000) / 1000,
      } as any);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pool as any).query = (...args: any[]) => instrumented("query", _query, args);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pool as any).execute = (...args: any[]) => instrumented("execute", _execute, args);
