/**
 * errorCodes.ts
 *
 * Chuẩn hoá error code phía FE.
 *
 * Ghi chú:
 * - Backend có thể trả nhiều shape khác nhau; FE normalize về 1 format.
 * - Danh sách "domain codes" (NO_TABLE_AVAILABLE, OUT_OF_STOCK...) để ở dạng mở,
 *   không ép union quá sớm nếu chưa có OpenAPI chính thức.
 */

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,

  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

/**
 * AppErrorCode: nhóm code ổn định để UI xử lý.
 * - domain code cụ thể (nếu có) sẽ nằm ở ApiErrorNormalized.code.
 */
export type AppErrorCode =
  | "NETWORK_ERROR"
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "UNKNOWN";

export const appErrorCodeFromStatus = (status?: number): AppErrorCode => {
  if (!status) return "UNKNOWN";
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN";
};

export const defaultUserMessageByAppCode: Record<AppErrorCode, string> = {
  NETWORK_ERROR: "Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  UNAUTHENTICATED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không đủ quyền để thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy tài nguyên yêu cầu.",
  CONFLICT: "Dữ liệu xung đột hoặc trạng thái đã thay đổi. Vui lòng tải lại.",
  RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
  SERVER_ERROR: "Hệ thống đang bận. Vui lòng thử lại sau.",
  UNKNOWN: "Có lỗi xảy ra. Vui lòng thử lại.",
};
