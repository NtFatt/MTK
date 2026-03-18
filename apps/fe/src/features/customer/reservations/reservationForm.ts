export type ReservationFormState = {
  areaName: string;
  partySize: number;
  contactName: string;
  contactPhone: string;
  note: string;
  reservedFromLocal: string;
  reservedToLocal: string;
};

const MAX_PARTY_SIZE = 50;
const MAX_DAYS_AHEAD = 7;
const DEFAULT_DURATION_MINUTES = 90;
const MAX_DURATION_MINUTES = 4 * 60;

export function toIsoOrNull(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${mm}`;
}

export function addMinutesLocal(raw: string, minutes: number): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() + minutes);
  return toLocalDateTimeValue(d);
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";

  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";

  return new Date(t).toLocaleString("vi-VN");
}

export function createDefaultReservationWindow(now = new Date()) {
  const start = new Date(now);
  start.setMinutes(start.getMinutes() + 10);
  start.setSeconds(0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + DEFAULT_DURATION_MINUTES);

  return {
    reservedFromLocal: toLocalDateTimeValue(start),
    reservedToLocal: toLocalDateTimeValue(end),
  };
}

export function normalizeReservationForm(
  input: ReservationFormState,
): ReservationFormState {
  return {
    areaName: input.areaName.trim(),
    partySize: input.partySize,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    note: input.note.trim(),
    reservedFromLocal: input.reservedFromLocal.trim(),
    reservedToLocal: input.reservedToLocal.trim(),
  };
}

export function validateReservationForm(
  input: ReservationFormState,
): string | null {
  const normalized = normalizeReservationForm(input);

  if (!normalized.areaName) {
    return "Vui lòng nhập khu vực.";
  }

  if (
    !Number.isFinite(normalized.partySize) ||
    normalized.partySize < 1 ||
    normalized.partySize > MAX_PARTY_SIZE
  ) {
    return `Số lượng khách phải từ 1 đến ${MAX_PARTY_SIZE}.`;
  }

  if (!normalized.contactPhone) {
    return "Vui lòng nhập số điện thoại liên hệ.";
  }

  const reservedFromIso = toIsoOrNull(normalized.reservedFromLocal);
  const reservedToIso = toIsoOrNull(normalized.reservedToLocal);

  if (!reservedFromIso || !reservedToIso) {
    return "Vui lòng nhập đầy đủ thời gian đặt bàn.";
  }

  const fromMs = new Date(reservedFromIso).getTime();
  const toMs = new Date(reservedToIso).getTime();

  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    return "Khung giờ đặt bàn không hợp lệ.";
  }

  if (toMs <= fromMs) {
    return "Thời gian kết thúc phải lớn hơn thời gian bắt đầu.";
  }

  const nowMs = Date.now();

  if (fromMs < nowMs) {
    return "Không thể đặt bàn trong quá khứ.";
  }

  const maxAheadMs = nowMs + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
  if (fromMs > maxAheadMs || toMs > maxAheadMs) {
    return `Chỉ được đặt bàn trong ${MAX_DAYS_AHEAD} ngày tới.`;
  }

  const durationMinutes = Math.round((toMs - fromMs) / 60000);

  if (durationMinutes < 15) {
    return "Thời lượng reservation quá ngắn.";
  }

  if (durationMinutes > MAX_DURATION_MINUTES) {
    return "Thời lượng reservation quá dài.";
  }

  return null;
}