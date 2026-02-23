import "dotenv/config";
import { z } from "zod";

/**
 * IMPORTANT: Do NOT use z.coerce.boolean() for env flags.
 * In JS, Boolean("false") === true. We must parse string booleans explicitly.
 */
function parseBool(v: unknown): unknown {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(s)) return true;
    if (["0", "false", "no", "n", "off", ""].includes(s)) return false;
  }
  return v;
}

const zBoolOpt = () => z.preprocess(parseBool, z.boolean().optional());
const zBoolDef = (def: boolean) => z.preprocess(parseBool, z.boolean().optional()).default(def);

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.string().default("development"),

  // ===== Observability =====
  LOG_LEVEL: z.string().optional(),
  LOG_PRETTY: zBoolOpt(),
  METRICS_ENABLED: zBoolOpt(),
  METRICS_PATH: z.string().optional(),
  METRICS_REQUIRE_ADMIN: zBoolOpt(),
  SLOW_QUERY_MS: z.coerce.number().int().min(1).max(60000).optional(),
  REDIS_SLOW_OP_MS: z.coerce.number().int().min(1).max(60000).optional(),

  // OpenTelemetry (Phase 3 - optional)
  OTEL_ENABLED: zBoolOpt(),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_TRACES_SAMPLER: z.string().optional(),
  OTEL_TRACES_SAMPLER_ARG: z.string().optional(),
  OTEL_RESOURCE_ATTRIBUTES: z.string().optional(),

  // Support both MYSQL_* (new standard) and DB_* (legacy from earlier docs/scripts)
  MYSQL_HOST: z.string().optional(),
  DB_HOST: z.string().optional(),
  MYSQL_PORT: z.coerce.number().optional(),
  DB_PORT: z.coerce.number().optional(),
  MYSQL_USER: z.string().optional(),
  DB_USER: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  MYSQL_DATABASE: z.string().optional(),
  DB_NAME: z.string().optional(),

  BASE_URL: z.string().default("http://localhost:3001"),

  // ===== Redis / Realtime (optional) =====
  REDIS_URL: z.string().optional().default(""),
  REALTIME_ENABLED: zBoolDef(false),
  SOCKET_PATH: z.string().optional().default("/socket.io"),
  // Use Socket.IO Redis adapter for multi-instance broadcasting (requires @socket.io/redis-adapter)
  SOCKET_REDIS_ADAPTER_ENABLED: zBoolDef(false),
  REALTIME_EVENT_VERSION: z.coerce.number().int().min(1).max(9).default(1),
  REALTIME_ADMIN_AUDIT_ENABLED: zBoolDef(false),

  // Realtime replay / seq gap recovery (Phase 2 hardening)
  REALTIME_REPLAY_ENABLED: zBoolOpt(),
  REALTIME_REPLAY_TTL_SECONDS: z.coerce.number().int().min(30).max(24 * 3600).default(3600),
  REALTIME_REPLAY_MAX_ITEMS: z.coerce.number().int().min(100).max(20000).default(2000),
  REALTIME_REPLAY_MAX_LIMIT: z.coerce.number().int().min(50).max(2000).default(500),

  // ===== Redis menu cache =====
  MENU_CACHE_ENABLED: zBoolDef(true),
  MENU_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(24 * 3600).default(600),

  // ===== Redis session store (Phase 1) =====
  REDIS_SESSION_STORE_ENABLED: zBoolOpt(),
  REDIS_SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(24 * 3600).default(21600),

  // ===== Redis stock holds (Phase 1) =====
  REDIS_STOCK_HOLDS_ENABLED: zBoolOpt(),
  REDIS_STOCK_HOLD_TTL_SECONDS: z.coerce.number().int().min(30).max(24 * 3600).default(300),
  REDIS_STOCK_HOLD_CLEANUP_INTERVAL_SECONDS: z.coerce.number().int().min(5).max(3600).default(15),

  // ===== Inventory drift control (Phase 2) =====
  STOCK_REHYDRATE_ENABLED: zBoolDef(false),
  STOCK_REHYDRATE_INTERVAL_SECONDS: z.coerce.number().int().min(15).max(24 * 3600).default(60),

  // ===== Client OTP + tokens =====
  OTP_HASH_SECRET: z.string().optional().default(""),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
  DEV_OTP_ECHO_ENABLED: zBoolDef(true),
  DEV_OTP_FIXED_CODE: z.string().optional().default("123456"),

  // ===== Rate limit (M3) =====
  RL_OTP_REQUEST_LIMIT: z.coerce.number().int().min(1).max(100).default(3),
  RL_OTP_REQUEST_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
  RL_OTP_VERIFY_LIMIT: z.coerce.number().int().min(1).max(100).default(5),
  RL_OTP_VERIFY_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
  RL_ADMIN_LOGIN_LIMIT: z.coerce.number().int().min(1).max(100).default(3),
  RL_ADMIN_LOGIN_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),

  CLIENT_ACCESS_TOKEN_SECRET: z.string().optional().default(""),
  CLIENT_ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(15),

  CLIENT_REFRESH_TOKEN_SECRET: z.string().optional().default(""),
  CLIENT_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),

  CLIENT_REFRESH_HASH_SECRET: z.string().optional().default(""),

  // ===== Reservation rules (business config) =====
  RESERVATION_MAX_DAYS: z.coerce.number().int().min(1).max(60).default(7),
  RESERVATION_PENDING_MINUTES: z.coerce.number().int().min(1).max(24 * 60).default(45),
  RESERVATION_CHECKIN_EARLY_MINUTES: z.coerce.number().int().min(0).max(24 * 60).default(30),
  RESERVATION_CHECKIN_LATE_MINUTES: z.coerce.number().int().min(0).max(24 * 60).default(15),

  // Table status sync policy
  TABLE_STATUS_LOCK_AHEAD_MINUTES: z.coerce.number().int().min(0).max(24 * 60).default(30),

  // ===== VNPay (optional for local dev) =====
  VNPAY_TMN_CODE: z.string().optional().default(""),
  VNPAY_HASH_SECRET: z.string().optional().default(""),

  // Support both VNPAY_URL (internal) and VNPAY_PAYMENT_URL (docs-friendly)
  VNPAY_URL: z.string().optional(),
  VNPAY_PAYMENT_URL: z.string().optional(),

  // Optional overrides
  VNPAY_RETURN_URL: z.string().optional(),
  VNPAY_IPN_URL: z.string().optional(),

  // Optional VNPay constants
  VNPAY_VERSION: z.string().optional().default("2.1.0"),
  VNPAY_COMMAND: z.string().optional().default("pay"),
  VNPAY_CURR_CODE: z.string().optional().default("VND"),
  VNPAY_LOCALE: z.string().optional().default("vn"),
  VNPAY_ORDER_TYPE: z.string().optional().default("other"),

  // Optional: protect admin endpoints with a simple API key (production should use JWT/RBAC)
  ADMIN_API_KEY: z.string().optional(),

  // Preferred: admin Bearer token (HMAC signed)
  ADMIN_TOKEN_SECRET: z.string().optional(),
  ADMIN_TOKEN_TTL_MINUTES: z.coerce.number().default(60 * 8),

  // ===== Maintenance jobs (optional) =====
  MAINTENANCE_JOBS_ENABLED: zBoolDef(false),
  MAINTENANCE_INTERVAL_SECONDS: z.coerce.number().int().min(10).max(3600).default(120),
  MAINTENANCE_SESSION_STALE_MINUTES: z.coerce.number().int().min(10).max(60 * 24 * 14).default(6 * 60),

  // ===== Dev tools =====
  DEV_RESET_ENABLED: zBoolOpt(),

  // ===== Contract lock (M0) =====
  LEGACY_API_ENABLED: zBoolDef(false),

  // ===== Idempotency (M2) =====
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().min(30).max(24 * 3600).default(600),
});

const raw = EnvSchema.parse(process.env);

export const env = {
  ...raw,

  MYSQL_HOST: raw.MYSQL_HOST ?? raw.DB_HOST ?? "localhost",
  MYSQL_PORT: raw.MYSQL_PORT ?? raw.DB_PORT ?? 3306,
  MYSQL_USER: raw.MYSQL_USER ?? raw.DB_USER ?? "root",
  MYSQL_PASSWORD: raw.MYSQL_PASSWORD ?? raw.DB_PASSWORD ?? "",
  MYSQL_DATABASE: raw.MYSQL_DATABASE ?? raw.DB_NAME ?? "hadilao_online",

  // VNPay URL fallback chain
  VNPAY_URL: raw.VNPAY_URL ?? raw.VNPAY_PAYMENT_URL ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",

  // If REDIS_URL exists, enable realtime by default unless explicitly disabled.
  REALTIME_ENABLED: raw.REALTIME_ENABLED || Boolean(raw.REDIS_URL),

  // Realtime replay: enable by default whenever realtime is enabled.
  REALTIME_REPLAY_ENABLED: raw.REALTIME_REPLAY_ENABLED ?? (raw.REALTIME_ENABLED || Boolean(raw.REDIS_URL)),

  // Phase-1 toggles: auto-enable when REDIS_URL is present, unless explicitly set.
  REDIS_SESSION_STORE_ENABLED: raw.REDIS_SESSION_STORE_ENABLED ?? Boolean(raw.REDIS_URL),
  REDIS_STOCK_HOLDS_ENABLED: raw.REDIS_STOCK_HOLDS_ENABLED ?? Boolean(raw.REDIS_URL),

  // ===== Observability defaults =====
  LOG_LEVEL: raw.LOG_LEVEL ?? (raw.NODE_ENV !== "production" ? "debug" : "info"),
  LOG_PRETTY: raw.LOG_PRETTY ?? raw.NODE_ENV !== "production",
  METRICS_ENABLED: raw.METRICS_ENABLED ?? raw.NODE_ENV !== "production",
  METRICS_PATH: raw.METRICS_PATH ?? "/api/v1/metrics",
  METRICS_REQUIRE_ADMIN: raw.METRICS_REQUIRE_ADMIN ?? true,
  SLOW_QUERY_MS: raw.SLOW_QUERY_MS ?? 200,
  REDIS_SLOW_OP_MS: raw.REDIS_SLOW_OP_MS ?? 50,

  // OpenTelemetry: off by default, can be enabled per environment.
  OTEL_ENABLED: raw.OTEL_ENABLED ?? false,
  OTEL_SERVICE_NAME: raw.OTEL_SERVICE_NAME ?? "hadilao-api",
  OTEL_EXPORTER_OTLP_ENDPOINT: raw.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
  OTEL_TRACES_SAMPLER: raw.OTEL_TRACES_SAMPLER ?? "parentbased_traceidratio",
  OTEL_TRACES_SAMPLER_ARG: raw.OTEL_TRACES_SAMPLER_ARG ?? "1.0",
  OTEL_RESOURCE_ATTRIBUTES: raw.OTEL_RESOURCE_ATTRIBUTES ?? "",

  // Dev reset: enabled by default for non-production environments.
  DEV_RESET_ENABLED: raw.DEV_RESET_ENABLED ?? raw.NODE_ENV !== "production",
};
