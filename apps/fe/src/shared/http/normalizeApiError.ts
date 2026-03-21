import { normalizeApiError as contractsNormalize } from "@hadilao/contracts";
import type { HttpError } from "./errors";

function mapAppErrorMessage(code?: string) {
  switch (code) {
    case "STAFF_USERNAME_ALREADY_EXISTS":
      return "Username đã tồn tại. Vui lòng chọn username khác.";
    case "TABLE_UNPAID_ORDER_EXISTS":
      return "Bàn này vẫn còn đơn chưa thanh toán.";
    case "SESSION_HAS_UNPAID_ORDERS":
      return "Không thể đóng phiên vì bàn vẫn còn đơn chưa thanh toán.";
    default:
      return undefined;
  }
}

function mapNetworkMessage(status: number, fallback: string, details: unknown): string {
  if (status !== 0) return fallback;

  const serializedDetails =
    typeof details === "string"
      ? details
      : details != null
        ? JSON.stringify(details)
        : "";

  const text = `${fallback} ${serializedDetails}`.toLowerCase();

  if (text.includes("econnrefused") || text.includes("failed to fetch") || text.includes("network error")) {
    return "Không kết nối được tới API local. Hãy kiểm tra backend hoặc socket server đang chạy ở cổng 3001.";
  }

  return "Không kết nối được tới máy chủ. Vui lòng thử lại sau.";
}

/**
 * Normalize any thrown error (e.g. from apiFetch) to HttpError.
 * Uses contracts normalizer then maps to app HttpError shape.
 * Does not log token/PII.
 */
export function normalizeApiError(err: unknown): HttpError {
  const normalized = contractsNormalize(err);

  const fallbackMessage =
    normalized.message || (normalized.status ? "Request failed" : "Network error");

  const mappedMessage = mapAppErrorMessage(normalized.code);

  return {
    status: normalized.status ?? 0,
    code: normalized.code,
    message: mappedMessage ?? mapNetworkMessage(normalized.status ?? 0, fallbackMessage, normalized.details),
    details: normalized.details,
    correlationId: normalized.requestId,
  };
}
