import { env } from "../config/env.js";
import { requestContext } from "./context.js";
import { getTraceContext } from "./tracing.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getConfiguredLevel(): LogLevel {
  const v = String(env.LOG_LEVEL ?? "info").toLowerCase();
  if (v === "debug" || v === "info" || v === "warn" || v === "error") return v;
  return "info";
}

const configuredRank = LEVEL_RANK[getConfiguredLevel()];

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= configuredRank;
}

function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return JSON.stringify({ msg: "<unserializable>" });
  }
}

function write(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const rid = requestContext.getRequestId();
  const base: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
  };

  if (rid) base.rid = rid;

  const tc = getTraceContext();
  if (tc) {
    base.traceId = tc.traceId;
    base.spanId = tc.spanId;
  }

  const line = { ...base, ...(extra ?? {}) };

  // Pretty logs for local dev, but keep structure.
  if (env.LOG_PRETTY) {
    const prefix = `[${String(line.ts)}] ${String(level).toUpperCase()}${rid ? ` rid=${rid}` : ""}${(line as any).traceId ? ` trace=${String((line as any).traceId).slice(0,8)}` : ""}`;
    if (level === "error") {
      // eslint-disable-next-line no-console
      console.error(prefix, msg, extra ?? "");
    } else if (level === "warn") {
      // eslint-disable-next-line no-console
      console.warn(prefix, msg, extra ?? "");
    } else {
      // eslint-disable-next-line no-console
      console.log(prefix, msg, extra ?? "");
    }
    return;
  }

  const payload = safeJsonStringify(line);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(payload);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(payload);
  } else {
    // eslint-disable-next-line no-console
    console.log(payload);
  }
}

export const log = {
  debug: (msg: string, extra?: Record<string, unknown>) => write("debug", msg, extra),
  info: (msg: string, extra?: Record<string, unknown>) => write("info", msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => write("warn", msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => write("error", msg, extra),
};
