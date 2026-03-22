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
    case "SHIFT_NOT_OPEN":
      return "Chi nhánh chưa mở ca nên chưa thể thao tác nghiệp vụ thu ngân.";
    case "SHIFT_ALREADY_OPEN":
      return "Chi nhánh này đã có một ca đang mở.";
    case "SHIFT_PREVIOUS_NOT_CLOSED":
      return "Ca trước vẫn chưa được đóng. Hãy kết ca trước khi mở ca mới.";
    case "SHIFT_OPENING_FLOAT_MISMATCH":
      return "Tổng breakdown đầu ca chưa khớp với quỹ đầu ca.";
    case "SHIFT_HAS_UNPAID_ORDERS":
      return "Không thể kết ca khi vẫn còn bill chưa thanh toán.";
    case "SHIFT_CLOSE_NOTE_REQUIRED":
      return "Hãy nhập ghi chú khi kết ca có chênh lệch.";
    case "SHIFT_STALE":
      return "Dữ liệu ca vừa thay đổi. Vui lòng tải lại rồi thử lại.";
    case "SHIFT_SCHEMA_MISSING":
      return "CSDL local chưa có bảng ca làm việc. Hãy chạy migration mới rồi tải lại màn hình.";
    case "ATTENDANCE_SCHEMA_MISSING":
      return "CSDL local chưa có bảng chấm công. Hãy chạy migration mới rồi tải lại màn hình.";
    case "PAYROLL_SCHEMA_MISSING":
      return "CSDL local chưa có bảng tính lương/thưởng. Hãy chạy migration mới rồi tải lại màn hình.";
    case "ATTENDANCE_ALREADY_OPEN":
      return "Nhân sự này đang có một bản ghi chấm công mở. Hãy check-out trước khi tạo lượt mới.";
    case "ATTENDANCE_ALREADY_CHECKED_IN":
      return "Bản ghi này đã được check-in trước đó.";
    case "ATTENDANCE_ALREADY_CHECKED_OUT":
      return "Bản ghi này đã được check-out rồi.";
    case "ATTENDANCE_ALREADY_MARKED_ABSENT":
      return "Nhân sự này đã được đánh dấu vắng cho ca hiện tại.";
    case "ATTENDANCE_CHECKOUT_BEFORE_CHECKIN":
      return "Giờ check-out không thể sớm hơn giờ check-in.";
    case "ATTENDANCE_NOTE_REQUIRED":
      return "Hãy nhập ghi chú để lưu lại lý do thao tác chấm công.";
    case "ATTENDANCE_STALE":
      return "Bản ghi chấm công vừa thay đổi ở nơi khác. Hãy tải lại rồi thao tác lại.";
    case "INVALID_ATTENDANCE_TIME":
      return "Thời điểm chấm công không hợp lệ với ca làm việc hiện tại.";
    case "STAFF_NOT_FOUND":
      return "Không tìm thấy nhân sự phù hợp trong chi nhánh này.";
    case "STAFF_NOT_ACTIVE":
      return "Nhân sự này đang không ở trạng thái hoạt động nên không thể chấm công.";
    case "PAYROLL_MONTH_INVALID":
      return "Tháng tính lương không hợp lệ.";
    case "PAYROLL_AMOUNT_INVALID":
      return "Giá trị lương hoặc thưởng/phạt không hợp lệ.";
    case "PAYROLL_BUSINESS_DATE_INVALID":
      return "Ngày áp dụng thưởng/phạt không hợp lệ.";
    case "PAYROLL_BONUS_NOTE_REQUIRED":
      return "Hãy nhập ghi chú cho khoản thưởng/phạt để lưu audit rõ ràng.";
    case "PAYROLL_VOID_REASON_REQUIRED":
      return "Hãy nhập lý do vô hiệu khoản thưởng/phạt.";
    case "PAYROLL_BONUS_NOT_FOUND":
      return "Không tìm thấy khoản thưởng/phạt cần thao tác.";
    case "PAYROLL_BONUS_VOIDED":
      return "Khoản thưởng/phạt này đã bị vô hiệu trước đó.";
    case "PAYROLL_STALE":
      return "Dữ liệu tính lương vừa thay đổi. Hãy tải lại rồi thao tác lại.";
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
