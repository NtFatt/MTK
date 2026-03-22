import type { NextFunction, Request, Response } from "express";
import { log } from "../../../infrastructure/observability/logger.js";
import { ZodError } from "zod";

type ErrorMapping = { status: number; code: string; message: string; details?: any };

const MAP: Record<string, ErrorMapping> = {
  VALIDATION_ERROR: {
    status: 400,
    code: "VALIDATION_ERROR",
    message: "Invalid request",
  },

  INSUFFICIENT_INGREDIENT: {
    status: 409,
    code: "INSUFFICIENT_INGREDIENT",
    message: "Không đủ nguyên liệu trong kho để xác nhận đơn hàng",
  },
  RECIPE_NOT_CONFIGURED: {
    status: 409,
    code: "RECIPE_NOT_CONFIGURED",
    message: "Món chưa có công thức nguyên liệu",
  },
  RECIPE_INGREDIENT_NOT_FOUND: {
    status: 409,
    code: "RECIPE_INGREDIENT_NOT_FOUND",
    message: "Công thức đang tham chiếu nguyên liệu không hợp lệ trong chi nhánh",
  },
  DUPLICATE_CONSUMPTION: {
    status: 409,
    code: "DUPLICATE_CONSUMPTION",
    message: "Thao tác trừ kho nguyên liệu đã được xử lý trước đó",
  },
  ORDER_ITEMS_EMPTY: {
    status: 409,
    code: "ORDER_ITEMS_EMPTY",
    message: "Đơn hàng không có món để tiêu hao nguyên liệu",
  },
  DUPLICATE_RECIPE_INGREDIENT: {
    status: 409,
    code: "DUPLICATE_RECIPE_INGREDIENT",
    message: "Nguyên liệu bị lặp trong công thức món",
  },

  ORDER_NOT_FOUND: { status: 404, code: "ORDER_NOT_FOUND", message: "Order not found" },
  CART_NOT_FOUND: { status: 404, code: "CART_NOT_FOUND", message: "Cart not found" },
  SESSION_NOT_FOUND: { status: 404, code: "SESSION_NOT_FOUND", message: "Session not found" },
  TABLE_NOT_FOUND: { status: 404, code: "TABLE_NOT_FOUND", message: "Table not found" },
  MENU_CATEGORY_NOT_FOUND: {
    status: 404,
    code: "MENU_CATEGORY_NOT_FOUND",
    message: "Không tìm thấy danh mục món",
  },
  MENU_ITEM_NOT_FOUND: { status: 404, code: "MENU_ITEM_NOT_FOUND", message: "Menu item not found" },
  COMBO_NOT_FOUND: { status: 404, code: "COMBO_NOT_FOUND", message: "Combo not found" },
  MEAT_PROFILE_NOT_FOUND: { status: 404, code: "MEAT_PROFILE_NOT_FOUND", message: "Meat profile not found" },
  ITEM_NOT_FOUND: { status: 404, code: "ITEM_NOT_FOUND", message: "Item not found" },
  STOCK_NOT_FOUND: { status: 404, code: "STOCK_NOT_FOUND", message: "Stock not found" },
  RESERVATION_NOT_FOUND: { status: 404, code: "RESERVATION_NOT_FOUND", message: "Reservation not found" },

  ORDER_NOT_PAYABLE: { status: 409, code: "ORDER_NOT_PAYABLE", message: "Order not payable" },
  CART_NOT_ACTIVE: { status: 409, code: "CART_NOT_ACTIVE", message: "Cart is not active" },
  CART_EMPTY: { status: 409, code: "CART_EMPTY", message: "Cart is empty" },
  OUT_OF_STOCK: { status: 409, code: "OUT_OF_STOCK", message: "Out of stock" },
  SESSION_CLOSED: { status: 409, code: "SESSION_CLOSED", message: "Session is closed" },
  SESSION_HAS_UNPAID_ORDERS: {
    status: 409,
    code: "SESSION_HAS_UNPAID_ORDERS",
    message: "Không thể đóng phiên vì bàn vẫn còn đơn chưa thanh toán",
  },
  TABLE_NOT_AVAILABLE: { status: 409, code: "TABLE_NOT_AVAILABLE", message: "Table is not available" },
  TABLE_OUT_OF_SERVICE: { status: 409, code: "TABLE_OUT_OF_SERVICE", message: "Table is out of service" },
  TABLE_UNPAID_ORDER_EXISTS: {
    status: 409,
    code: "TABLE_UNPAID_ORDER_EXISTS",
    message: "Bàn này vẫn còn đơn chưa thanh toán",
  },
  SHIFT_NOT_FOUND: {
    status: 404,
    code: "SHIFT_NOT_FOUND",
    message: "Không tìm thấy ca làm việc",
  },
  SHIFT_NOT_OPEN: {
    status: 409,
    code: "SHIFT_NOT_OPEN",
    message: "Hiện không có ca đang mở cho chi nhánh này",
  },
  SHIFT_ALREADY_OPEN: {
    status: 409,
    code: "SHIFT_ALREADY_OPEN",
    message: "Chi nhánh đã có một ca đang mở",
  },
  SHIFT_ALREADY_EXISTS: {
    status: 409,
    code: "SHIFT_ALREADY_EXISTS",
    message: "Ca này đã được mở trước đó trong ngày làm việc này",
  },
  SHIFT_PREVIOUS_NOT_CLOSED: {
    status: 409,
    code: "SHIFT_PREVIOUS_NOT_CLOSED",
    message: "Ca trước vẫn chưa được đóng",
  },
  SHIFT_HAS_UNPAID_ORDERS: {
    status: 409,
    code: "SHIFT_HAS_UNPAID_ORDERS",
    message: "Không thể kết ca khi vẫn còn bill chưa thanh toán",
  },
  SHIFT_OPENING_FLOAT_MISMATCH: {
    status: 400,
    code: "SHIFT_OPENING_FLOAT_MISMATCH",
    message: "Tổng breakdown đầu ca không khớp với quỹ đầu ca",
  },
  SHIFT_CLOSE_NOTE_REQUIRED: {
    status: 400,
    code: "SHIFT_CLOSE_NOTE_REQUIRED",
    message: "Vui lòng nhập ghi chú khi kết ca có chênh lệch",
  },
  SHIFT_TEMPLATE_INVALID: {
    status: 400,
    code: "SHIFT_TEMPLATE_INVALID",
    message: "Loại ca không hợp lệ",
  },
  SHIFT_BREAKDOWN_DENOMINATION_INVALID: {
    status: 400,
    code: "SHIFT_BREAKDOWN_DENOMINATION_INVALID",
    message: "Mệnh giá tiền không hợp lệ",
  },
  SHIFT_BREAKDOWN_QUANTITY_INVALID: {
    status: 400,
    code: "SHIFT_BREAKDOWN_QUANTITY_INVALID",
    message: "Số lượng tiền theo mệnh giá không hợp lệ",
  },
  SHIFT_STALE: {
    status: 409,
    code: "SHIFT_STALE",
    message: "Dữ liệu ca đã thay đổi, vui lòng tải lại rồi thử lại",
  },
  ATTENDANCE_NOT_FOUND: {
    status: 404,
    code: "ATTENDANCE_NOT_FOUND",
    message: "Không tìm thấy bản ghi chấm công",
  },
  ATTENDANCE_ALREADY_OPEN: {
    status: 409,
    code: "ATTENDANCE_ALREADY_OPEN",
    message: "Nhân viên đang có một bản ghi chấm công chưa checkout",
  },
  ATTENDANCE_ALREADY_CHECKED_IN: {
    status: 409,
    code: "ATTENDANCE_ALREADY_CHECKED_IN",
    message: "Nhân viên đã check-in cho ca này",
  },
  ATTENDANCE_ALREADY_CHECKED_OUT: {
    status: 409,
    code: "ATTENDANCE_ALREADY_CHECKED_OUT",
    message: "Bản ghi chấm công này đã checkout",
  },
  ATTENDANCE_ALREADY_MARKED_ABSENT: {
    status: 409,
    code: "ATTENDANCE_ALREADY_MARKED_ABSENT",
    message: "Nhân viên đã được đánh dấu vắng cho ca này",
  },
  ATTENDANCE_CHECKOUT_BEFORE_CHECKIN: {
    status: 409,
    code: "ATTENDANCE_CHECKOUT_BEFORE_CHECKIN",
    message: "Thời gian checkout không hợp lệ so với check-in",
  },
  ATTENDANCE_NOTE_REQUIRED: {
    status: 400,
    code: "ATTENDANCE_NOTE_REQUIRED",
    message: "Vui lòng nhập ghi chú cho thao tác chấm công thủ công",
  },
  ATTENDANCE_STALE: {
    status: 409,
    code: "ATTENDANCE_STALE",
    message: "Bản ghi chấm công đã thay đổi, vui lòng tải lại rồi thử lại",
  },
  PAYROLL_PROFILE_NOT_FOUND: {
    status: 404,
    code: "PAYROLL_PROFILE_NOT_FOUND",
    message: "Không tìm thấy cấu hình lương của nhân sự này",
  },
  PAYROLL_BONUS_NOT_FOUND: {
    status: 404,
    code: "PAYROLL_BONUS_NOT_FOUND",
    message: "Không tìm thấy khoản thưởng/phạt cần thao tác",
  },
  PAYROLL_PROFILE_ALREADY_EXISTS: {
    status: 409,
    code: "PAYROLL_PROFILE_ALREADY_EXISTS",
    message: "Nhân sự này đã có cấu hình lương trong chi nhánh",
  },
  PAYROLL_BONUS_VOIDED: {
    status: 409,
    code: "PAYROLL_BONUS_VOIDED",
    message: "Khoản thưởng/phạt này đã bị vô hiệu trước đó",
  },
  PAYROLL_STALE: {
    status: 409,
    code: "PAYROLL_STALE",
    message: "Dữ liệu tính lương đã thay đổi, vui lòng tải lại rồi thử lại",
  },
  PAYROLL_MONTH_INVALID: {
    status: 400,
    code: "PAYROLL_MONTH_INVALID",
    message: "Tháng tính lương không hợp lệ",
  },
  PAYROLL_AMOUNT_INVALID: {
    status: 400,
    code: "PAYROLL_AMOUNT_INVALID",
    message: "Giá trị tiền lương hoặc thưởng/phạt không hợp lệ",
  },
  PAYROLL_BUSINESS_DATE_INVALID: {
    status: 400,
    code: "PAYROLL_BUSINESS_DATE_INVALID",
    message: "Ngày áp dụng thưởng/phạt không hợp lệ",
  },
  PAYROLL_BONUS_NOTE_REQUIRED: {
    status: 400,
    code: "PAYROLL_BONUS_NOTE_REQUIRED",
    message: "Vui lòng nhập ghi chú cho khoản thưởng/phạt",
  },
  PAYROLL_VOID_REASON_REQUIRED: {
    status: 400,
    code: "PAYROLL_VOID_REASON_REQUIRED",
    message: "Vui lòng nhập lý do vô hiệu khoản thưởng/phạt",
  },
  INVALID_ATTENDANCE_TIME: {
    status: 400,
    code: "INVALID_ATTENDANCE_TIME",
    message: "Thời gian chấm công không hợp lệ",
  },
  STAFF_NOT_FOUND: {
    status: 404,
    code: "STAFF_NOT_FOUND",
    message: "Không tìm thấy nhân viên",
  },
  STAFF_NOT_ACTIVE: {
    status: 409,
    code: "STAFF_NOT_ACTIVE",
    message: "Nhân viên hiện không ở trạng thái hoạt động",
  },
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
  STAFF_USERNAME_ALREADY_EXISTS: {
    status: 409,
    code: "STAFF_USERNAME_ALREADY_EXISTS",
    message: "Staff username already exists",
  },
  VOUCHER_NOT_FOUND: { status: 404, code: "VOUCHER_NOT_FOUND", message: "Voucher not found" },
  VOUCHER_CODE_ALREADY_EXISTS: {
    status: 409,
    code: "VOUCHER_CODE_ALREADY_EXISTS",
    message: "Voucher code already exists in this branch",
  },
  VOUCHER_INACTIVE: { status: 409, code: "VOUCHER_INACTIVE", message: "Voucher is inactive" },
  VOUCHER_NOT_STARTED: { status: 409, code: "VOUCHER_NOT_STARTED", message: "Voucher is not active yet" },
  VOUCHER_EXPIRED: { status: 409, code: "VOUCHER_EXPIRED", message: "Voucher has expired" },
  VOUCHER_MIN_SUBTOTAL_NOT_REACHED: {
    status: 409,
    code: "VOUCHER_MIN_SUBTOTAL_NOT_REACHED",
    message: "Cart subtotal does not meet voucher minimum",
  },
  VOUCHER_USAGE_LIMIT_REACHED: {
    status: 409,
    code: "VOUCHER_USAGE_LIMIT_REACHED",
    message: "Voucher usage limit reached",
  },
  VOUCHER_SESSION_LIMIT_REACHED: {
    status: 409,
    code: "VOUCHER_SESSION_LIMIT_REACHED",
    message: "Voucher session usage limit reached",
  },

  INVALID_TRANSITION: { status: 409, code: "INVALID_TRANSITION", message: "Invalid status transition" },
  INVALID_KITCHEN_TRANSITION: {
    status: 409,
    code: "INVALID_KITCHEN_TRANSITION",
    message: "Nhóm món hiện tại không cho phép chuyển sang bước bếp này",
  },
  KITCHEN_TICKET_NOT_FOUND: {
    status: 404,
    code: "KITCHEN_TICKET_NOT_FOUND",
    message: "Không tìm thấy nhóm món cần thao tác trong queue bếp",
  },
  FORBIDDEN_STATUS: { status: 403, code: "FORBIDDEN_STATUS", message: "Forbidden status" },

  INVALID_QUANTITY: { status: 400, code: "INVALID_QUANTITY", message: "quantity must be an integer >= 0" },
  INVALID_SHIFT_RUN_ID: {
    status: 400,
    code: "INVALID_SHIFT_RUN_ID",
    message: "shiftRunId is invalid",
  },
  CATEGORY_NAME_REQUIRED: {
    status: 400,
    code: "CATEGORY_NAME_REQUIRED",
    message: "Vui lòng nhập tên danh mục",
  },
  CATEGORY_NAME_TOO_LONG: {
    status: 400,
    code: "CATEGORY_NAME_TOO_LONG",
    message: "Tên danh mục quá dài",
  },
  CATEGORY_NAME_ALREADY_EXISTS: {
    status: 409,
    code: "CATEGORY_NAME_ALREADY_EXISTS",
    message: "Tên danh mục đã tồn tại",
  },
  CATEGORY_HAS_ITEMS: {
    status: 409,
    code: "CATEGORY_HAS_ITEMS",
    message: "Không thể xóa danh mục khi vẫn còn món bên trong",
  },
  INVALID_SORT_ORDER: {
    status: 400,
    code: "INVALID_SORT_ORDER",
    message: "Thứ tự hiển thị không hợp lệ",
  },
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
  BRANCH_SCOPE_REQUIRED: {
    status: 403,
    code: "BRANCH_SCOPE_REQUIRED",
    message: "This token is branch-scoped and requires a branchId",
  },

  INVALID_FROM: { status: 400, code: "INVALID_FROM", message: "from is invalid" },
  INVALID_TO: { status: 400, code: "INVALID_TO", message: "to is invalid" },
  INVALID_LIMIT: { status: 400, code: "INVALID_LIMIT", message: "limit must be an integer" },
  INVALID_FROM_SEQ: { status: 400, code: "INVALID_FROM_SEQ", message: "fromSeq must be an integer" },

  INVALID_DIRECTION_ID: {
    status: 400,
    code: "INVALID_DIRECTION_ID",
    message: "directionId or tableId is required",
  },

  VNPAY_NOT_CONFIGURED: { status: 503, code: "VNPAY_NOT_CONFIGURED", message: "VNPay is not configured" },

  INVALID_CREDENTIALS: { status: 401, code: "INVALID_CREDENTIALS", message: "Invalid username or password" },

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
  INVALID_VOUCHER_DATETIME: {
    status: 400,
    code: "INVALID_VOUCHER_DATETIME",
    message: "Thời gian voucher không hợp lệ",
  },
  VOUCHER_TIME_RANGE_INVALID: {
    status: 400,
    code: "VOUCHER_TIME_RANGE_INVALID",
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
  },

  DEV_RESET_DISABLED: { status: 403, code: "DEV_RESET_DISABLED", message: "Dev reset is disabled" },
  CONFIRM_RESET_REQUIRED: { status: 400, code: "CONFIRM_RESET_REQUIRED", message: "confirm=RESET is required" },

  ROOM_REQUIRED: { status: 400, code: "ROOM_REQUIRED", message: "room is required" },
  ROOMS_REQUIRED: { status: 400, code: "ROOMS_REQUIRED", message: "rooms[] is required" },
  ROOM_NOT_SUPPORTED: { status: 400, code: "ROOM_NOT_SUPPORTED", message: "room type is not supported" },
  SESSION_KEY_REQUIRED: { status: 400, code: "SESSION_KEY_REQUIRED", message: "sessionKey is required" },
  INVALID_VOUCHER_CODE: { status: 400, code: "INVALID_VOUCHER_CODE", message: "voucherCode is invalid" },
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
  const rawMessage = String(err?.message ?? "");

  if (
    rawMessage.includes("shift_runs") &&
    rawMessage.includes("doesn't exist")
  ) {
    return respond(
      res,
      503,
      "SHIFT_SCHEMA_MISSING",
      "Shift schema is not installed",
      isDev ? { debug: { message: rawMessage, stack: err?.stack } } : undefined,
    );
  }

  if (
    rawMessage.includes("attendance_records") &&
    rawMessage.includes("doesn't exist")
  ) {
    return respond(
      res,
      503,
      "ATTENDANCE_SCHEMA_MISSING",
      "Attendance schema is not installed",
      isDev ? { debug: { message: rawMessage, stack: err?.stack } } : undefined,
    );
  }

  if (
    rawMessage.includes("shift_cash_breakdowns") &&
    rawMessage.includes("doesn't exist")
  ) {
    return respond(
      res,
      503,
      "SHIFT_SCHEMA_MISSING",
      "Shift schema is not installed",
      isDev ? { debug: { message: rawMessage, stack: err?.stack } } : undefined,
    );
  }

  if (
    (rawMessage.includes("payroll_profiles") || rawMessage.includes("payroll_bonus_entries")) &&
    rawMessage.includes("doesn't exist")
  ) {
    return respond(
      res,
      503,
      "PAYROLL_SCHEMA_MISSING",
      "Payroll schema is not installed",
      isDev ? { debug: { message: rawMessage, stack: err?.stack } } : undefined,
    );
  }

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

  const key = rawMessage;

  const mapped = MAP[key];
  if (mapped) {
    const details = err?.details ?? mapped.details;
    const extra = details ? { details } : undefined;
    return respond(res, mapped.status, mapped.code, mapped.message, extra);
  }

  if (
    Number.isInteger(err?.status) &&
    err.status >= 400 &&
    err.status < 600 &&
    typeof err?.code === "string" &&
    err.code.trim()
  ) {
    const extra = err?.details ? { details: err.details } : undefined;
    return respond(
      res,
      err.status,
      String(err.code),
      String(err.message || err.code),
      extra,
    );
  }

  if (key.startsWith("INVALID_")) {
    const fieldToken = key.slice("INVALID_".length);
    const fieldName = toLowerCamelFromUpperSnake(fieldToken);
    return respond(res, 400, key, `${fieldName} is required`);
  }

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
