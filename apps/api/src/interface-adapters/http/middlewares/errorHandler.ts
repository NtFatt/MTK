import type { NextFunction, Request, Response } from "express";
import { log } from "../../../infrastructure/observability/logger.js";
import { ZodError } from "zod";

type ErrorMapping = { status: number; code: string; message: string; details?: any };

const MAP: Record<string, ErrorMapping> = {
  // ===== 404 =====
  ORDER_NOT_FOUND: { status: 404, code: "ORDER_NOT_FOUND", message: "Order not found" },
  CART_NOT_FOUND: { status: 404, code: "CART_NOT_FOUND", message: "Cart not found" },
  SESSION_NOT_FOUND: { status: 404, code: "SESSION_NOT_FOUND", message: "Session not found" },
  TABLE_NOT_FOUND: { status: 404, code: "TABLE_NOT_FOUND", message: "Table not found" },
  MENU_ITEM_NOT_FOUND: { status: 404, code: "MENU_ITEM_NOT_FOUND", message: "Menu item not found" },
  COMBO_NOT_FOUND: { status: 404, code: "COMBO_NOT_FOUND", message: "Combo not found" },
  MEAT_PROFILE_NOT_FOUND: { status: 404, code: "MEAT_PROFILE_NOT_FOUND", message: "Meat profile not found" },
  ITEM_NOT_FOUND: { status: 404, code: "ITEM_NOT_FOUND", message: "Item not found" },
  STOCK_NOT_FOUND: { status: 404, code: "STOCK_NOT_FOUND", message: "Stock not found" },
  RESERVATION_NOT_FOUND: { status: 404, code: "RESERVATION_NOT_FOUND", message: "Reservation not found" },

  // ===== 409 / domain conflicts =====
  ORDER_NOT_PAYABLE: { status: 409, code: "ORDER_NOT_PAYABLE", message: "Order not payable" },
  CART_NOT_ACTIVE: { status: 409, code: "CART_NOT_ACTIVE", message: "Cart is not active" },
  CART_EMPTY: { status: 409, code: "CART_EMPTY", message: "Cart is empty" },
  OUT_OF_STOCK: { status: 409, code: "OUT_OF_STOCK", message: "Out of stock" },
  SESSION_CLOSED: { status: 409, code: "SESSION_CLOSED", message: "Session is closed" },
  TABLE_NOT_AVAILABLE: { status: 409, code: "TABLE_NOT_AVAILABLE", message: "Table is not available" },
  TABLE_OUT_OF_SERVICE: { status: 409, code: "TABLE_OUT_OF_SERVICE", message: "Table is out of service" },
  NO_TABLE_AVAILABLE: { status: 409, code: "NO_TABLE_AVAILABLE", message: "No table available" },
  RESERVATION_EXPIRED: { status: 409, code: "RESERVATION_EXPIRED", message: "Reservation expired" },
  RESERVATION_NOT_PENDING: { status: 409, code: "RESERVATION_NOT_PENDING", message: "Reservation is not pending" },
  RESERVATION_CANCELED: { status: 409, code: "RESERVATION_CANCELED", message: "Reservation canceled" },
  RESERVATION_NOT_CONFIRMED: { status: 409, code: "RESERVATION_NOT_CONFIRMED", message: "Reservation not confirmed" },
  RESERVATION_NOT_IN_TIME_WINDOW: {
    status: 409,
    code: "RESERVATION_NOT_IN_TIME_WINDOW",
    message: "Reservation not in check-in window",
  },

  // ===== 400 / validation & bad requests =====
  INVALID_TRANSITION: { status: 409, code: "INVALID_TRANSITION", message: "Invalid status transition" },
  FORBIDDEN_STATUS: { status: 403, code: "FORBIDDEN_STATUS", message: "Forbidden status" },

  INVALID_QUANTITY: { status: 400, code: "INVALID_QUANTITY", message: "quantity must be an integer >= 0" },
  INVALID_RESERVED_FROM: { status: 400, code: "INVALID_RESERVED_FROM", message: "reservedFrom is invalid" },
  INVALID_RESERVED_TO: { status: 400, code: "INVALID_RESERVED_TO", message: "reservedTo is invalid" },
  INVALID_RESERVATION_TIME: {
    status: 400,
    code: "INVALID_RESERVATION_TIME",
    message: "reservedTo must be after reservedFrom",
  },
  RESERVATION_IN_PAST: { status: 400, code: "RESERVATION_IN_PAST", message: "Reservation time is in the past" },
  RESERVATION_TOO_FAR: { status: 400, code: "RESERVATION_TOO_FAR", message: "Reservation can be max 7 days ahead" },
  AREA_REQUIRED: { status: 400, code: "AREA_REQUIRED", message: "areaName is required" },
  PARTY_SIZE_INVALID: { status: 400, code: "PARTY_SIZE_INVALID", message: "partySize is invalid" },
  PHONE_REQUIRED: { status: 400, code: "PHONE_REQUIRED", message: "contactPhone is required" },
  BRANCH_REQUIRED: { status: 400, code: "BRANCH_REQUIRED", message: "branchId is required" },
  BRANCH_SCOPE_REQUIRED: { status: 403, code: "BRANCH_SCOPE_REQUIRED", message: "This token is branch-scoped and requires a branchId" },

  INVALID_FROM: { status: 400, code: "INVALID_FROM", message: "from is invalid" },
  INVALID_TO: { status: 400, code: "INVALID_TO", message: "to is invalid" },
  INVALID_LIMIT: { status: 400, code: "INVALID_LIMIT", message: "limit must be an integer" },
  INVALID_FROM_SEQ: { status: 400, code: "INVALID_FROM_SEQ", message: "fromSeq must be an integer" },

  INVALID_DIRECTION_ID: {
    status: 400,
    code: "INVALID_DIRECTION_ID",
    message: "directionId or tableId is required",
  },

  // ===== external dependencies =====
  VNPAY_NOT_CONFIGURED: { status: 503, code: "VNPAY_NOT_CONFIGURED", message: "VNPay is not configured" },

  // ===== admin/auth =====
  INVALID_CREDENTIALS: { status: 401, code: "INVALID_CREDENTIALS", message: "Invalid username or password" },

  // ===== client/auth (OTP) =====
  OTP_SECRET_MISSING: { status: 500, code: "OTP_SECRET_MISSING", message: "OTP_HASH_SECRET is not configured" },
  CLIENT_TOKEN_SECRET_MISSING: { status: 500, code: "CLIENT_TOKEN_SECRET_MISSING", message: "Client token secrets are not configured" },
  CLIENT_REFRESH_HASH_SECRET_MISSING: { status: 500, code: "CLIENT_REFRESH_HASH_SECRET_MISSING", message: "CLIENT_REFRESH_HASH_SECRET is not configured" },

  OTP_REQUIRED: { status: 400, code: "OTP_REQUIRED", message: "OTP is required" },
  OTP_NOT_FOUND: { status: 404, code: "OTP_NOT_FOUND", message: "OTP not found or expired" },
  OTP_TOO_MANY_ATTEMPTS: { status: 429, code: "OTP_TOO_MANY_ATTEMPTS", message: "Too many OTP attempts" },
  RATE_LIMITED: { status: 429, code: "RATE_LIMITED", message: "Rate limited" },
  OTP_INVALID: { status: 400, code: "OTP_INVALID", message: "Invalid OTP" },

  CLIENT_NOT_FOUND: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found" },
  CLIENT_ALREADY_EXISTS: { status: 409, code: "CLIENT_ALREADY_EXISTS", message: "Client already exists" },
  CLIENT_BLOCKED: { status: 403, code: "CLIENT_BLOCKED", message: "Client is blocked" },
  REFRESH_TOKEN_REUSED: { status: 401, code: "REFRESH_TOKEN_REUSED", message: "Refresh token reused" },
  ADMIN_TOKEN_SECRET_MISSING: {
    status: 500,
    code: "ADMIN_TOKEN_SECRET_MISSING",
    message: "ADMIN_TOKEN_SECRET is not configured",
  },
  INVALID_TOKEN: { status: 401, code: "UNAUTHORIZED", message: "Unauthorized" },
  TOKEN_EXPIRED: { status: 401, code: "UNAUTHORIZED", message: "Unauthorized" },
  UNAUTHORIZED: { status: 401, code: "UNAUTHORIZED", message: "Unauthorized" },
  FEATURE_DISABLED: { status: 403, code: "FEATURE_DISABLED", message: "Feature disabled" },
  FORBIDDEN: { status: 403, code: "FORBIDDEN", message: "Forbidden" },
  REDIS_REQUIRED: { status: 503, code: "REDIS_REQUIRED", message: "Redis is required for this endpoint" },

  // ===== idempotency (M2) =====
  IDEMPOTENCY_KEY_REQUIRED: {
    status: 400,
    code: "VALIDATION_ERROR",
    message: "Idempotency-Key header is required",
    details: { field: "Idempotency-Key" },
  },
  IDEMPOTENCY_IN_PROGRESS: {
    status: 409,
    code: "CONFLICT",
    message: "Request with same Idempotency-Key is still processing",
  },

  INVALID_MODE: { status: 400, code: "INVALID_MODE", message: "mode is invalid" },

  // ===== dev tools =====
  DEV_RESET_DISABLED: { status: 403, code: "DEV_RESET_DISABLED", message: "Dev reset is disabled" },
  CONFIRM_RESET_REQUIRED: { status: 400, code: "CONFIRM_RESET_REQUIRED", message: "confirm=RESET is required" },

  // ===== realtime snapshot/resync (HTTP) =====
  ROOM_REQUIRED: { status: 400, code: "ROOM_REQUIRED", message: "room is required" },
  ROOMS_REQUIRED: { status: 400, code: "ROOMS_REQUIRED", message: "rooms[] is required" },
  ROOM_NOT_SUPPORTED: { status: 400, code: "ROOM_NOT_SUPPORTED", message: "room type is not supported" },
  SESSION_KEY_REQUIRED: { status: 400, code: "SESSION_KEY_REQUIRED", message: "sessionKey is required" },
};

function toLowerCamelFromUpperSnake(s: string): string {
  const parts = s.split("_").filter(Boolean);
  if (parts.length === 0) return s.toLowerCase();
  const first = parts[0]!.toLowerCase();
  const rest = parts
    .slice(1)
    .map((p) => p.toLowerCase())
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return [first, ...rest].join("");
}

function respond(res: Response, status: number, code: string, message: string, extra?: any) {
  const requestId = String(res.locals.requestId ?? "");
  const ts = new Date().toISOString();

  return res.status(status).json({
    code,
    message,
    error: { code, message },
    ...(extra ?? {}),
    meta: { ts, requestId },
  });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const isDev = String(process.env.NODE_ENV ?? "development") !== "production";

  // express.json() invalid JSON => SyntaxError with type='entity.parse.failed'
  if (err instanceof SyntaxError && (err as any)?.type === "entity.parse.failed") {
    return respond(
      res,
      400,
      "INVALID_JSON",
      "Request body must be valid JSON",
      isDev ? { debug: { message: err.message, stack: err.stack } } : undefined,
    );
  }

  if (err instanceof ZodError) {
    return respond(res, 400, "VALIDATION_ERROR", "Invalid request", { details: err.issues });
  }

  const key = String(err?.message ?? "");

  const mapped = MAP[key];
  if (mapped) {
    const extra = isDev && err?.details ? { details: err.details } : undefined;
    return respond(res, mapped.status, mapped.code, mapped.message, extra);
  }

  // Generic INVALID_* -> 400 with readable field name
  if (key.startsWith("INVALID_")) {
    const fieldToken = key.slice("INVALID_".length);
    const fieldName = toLowerCamelFromUpperSnake(fieldToken);
    return respond(res, 400, key, `${fieldName} is required`);
  }

  // Unknown errors: log once server-side (demo OK). Keep response stable.
  const rid = String(res.locals.requestId ?? "");
  log.error("unhandled_error", { rid, err: { message: String(key || err), stack: (err as any)?.stack } });

  return respond(
    res,
    500,
    "INTERNAL_SERVER_ERROR",
    "Internal server error",
    isDev ? { debug: { message: key || String(err), stack: err?.stack } } : undefined,
  );
}
