import type { HttpError } from "../../../shared/http/errors";

const PUBLIC_RESERVATION_ERROR_MAP: Record<string, string> = {
  INVALID_RESERVATION_TIME: "Khung giờ đặt bàn không hợp lệ.",
  RESERVATION_IN_PAST: "Không thể đặt bàn trong quá khứ.",
  RESERVATION_TOO_FAR: "Chỉ được đặt bàn trong 7 ngày tới.",
  PARTY_SIZE_INVALID: "Số lượng khách không hợp lệ.",
  PHONE_REQUIRED: "Vui lòng nhập số điện thoại liên hệ.",
  AREA_REQUIRED: "Vui lòng nhập khu vực.",
  INVALID_RESERVED_FROM: "Thời gian bắt đầu không hợp lệ.",
  INVALID_RESERVED_TO: "Thời gian kết thúc không hợp lệ.",
  NO_TABLE_AVAILABLE: "Hiện không còn bàn phù hợp cho khung giờ này.",
  RESERVATION_NOT_FOUND: "Không tìm thấy reservation.",
  RESERVATION_CANCELED: "Reservation này đã bị hủy.",
  RESERVATION_EXPIRED: "Reservation này đã hết hạn.",
  RESERVATION_NOT_PENDING: "Reservation này không còn ở trạng thái có thể hủy.",
  RESERVATION_NOT_CONFIRMED: "Reservation chưa được xác nhận nên chưa thể check-in.",
  RESERVATION_NOT_IN_TIME_WINDOW: "Chưa nằm trong khung giờ check-in hợp lệ.",
};

export function getReservationErrorMessage(
  error: unknown,
  fallback = "Không thể xử lý reservation lúc này.",
) {
  const e = error as HttpError | null | undefined;
  const code = e?.code;

  if (code && PUBLIC_RESERVATION_ERROR_MAP[code]) {
    return PUBLIC_RESERVATION_ERROR_MAP[code];
  }

  if (e?.message?.trim()) return e.message;
  return fallback;
}