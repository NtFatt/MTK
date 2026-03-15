import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELED"
  | "EXPIRED"
  | "CHECKED_IN"
  | "NO_SHOW"
  | "COMPLETED";

export type ReservationRow = {
  reservationId: string;
  reservationCode: string;
  status: ReservationStatus;
  tableId: string | null;
  tableCode?: string | null;
  areaName?: string | null;
  partySize: number;
  contactPhone?: string | null;
  contactName?: string | null;
  note?: string | null;
  reservedFrom?: string | null;
  reservedTo?: string | null;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  checkedInAt?: string | null;
  sessionId?: string | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListReservationsInput = {
  branchId?: string | number;
  status?: ReservationStatus | "";
  phone?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type CheckinReservationResult = {
  reservation: ReservationRow;
  sessionKey?: string | null;
  tableId?: string | number | null;
};

function toText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeReservationRow(raw: any): ReservationRow | null {
  if (!raw || typeof raw !== "object") return null;

  const reservationCode = toText(raw.reservationCode ?? raw.code);
  if (!reservationCode) return null;

  return {
    reservationId: String(raw.reservationId ?? raw.id ?? reservationCode),
    reservationCode,
    status: String(raw.status ?? "PENDING") as ReservationStatus,
    tableId: raw.tableId != null ? String(raw.tableId) : null,
    tableCode: toText(raw.tableCode),
    areaName: toText(raw.areaName),
    partySize: toNum(raw.partySize, 0),
    contactPhone: toText(raw.contactPhone),
    contactName: toText(raw.contactName),
    note: toText(raw.note),
    reservedFrom: toText(raw.reservedFrom),
    reservedTo: toText(raw.reservedTo),
    expiresAt: toText(raw.expiresAt),
    confirmedAt: toText(raw.confirmedAt),
    checkedInAt: toText(raw.checkedInAt),
    sessionId: raw.sessionId != null ? raw.sessionId : null,
    createdAt: toText(raw.createdAt),
    updatedAt: toText(raw.updatedAt),
  };
}

function normalizeReservationList(raw: unknown): ReservationRow[] {
  if (Array.isArray(raw)) {
    return raw
      .map(normalizeReservationRow)
      .filter((x): x is ReservationRow => x !== null);
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const list = Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.data)
        ? obj.data
        : null;

    if (list) {
      return list
        .map(normalizeReservationRow)
        .filter((x): x is ReservationRow => x !== null);
    }
  }

  return [];
}

function buildListQuery(input: ListReservationsInput) {
  const qs = new URLSearchParams();

  if (input.branchId != null && String(input.branchId).trim()) {
    qs.set("branchId", String(input.branchId));
  }

  if (input.status) qs.set("status", input.status);
  if (input.phone?.trim()) qs.set("phone", input.phone.trim());
  if (input.from?.trim()) qs.set("from", input.from.trim());
  if (input.to?.trim()) qs.set("to", input.to.trim());
  if (input.limit != null && Number.isFinite(input.limit)) {
    qs.set("limit", String(input.limit));
  }

  return qs.toString();
}

export async function listAdminReservations(
  input: ListReservationsInput,
): Promise<ReservationRow[]> {
  const query = buildListQuery(input);
  const path = query
    ? `/admin/reservations?${query}`
    : "/admin/reservations";

  const res = await apiFetchAuthed<unknown>(path);
  return normalizeReservationList(res);
}

export async function confirmAdminReservation(
  reservationCode: string,
): Promise<ReservationRow> {
  const res = await apiFetchAuthed<unknown>(
    `/admin/reservations/${encodeURIComponent(reservationCode)}/confirm`,
    {
      method: "PATCH",
    },
  );

  const row = normalizeReservationRow(res);
  if (!row) throw new Error("INVALID_CONFIRM_RESERVATION_RESPONSE");
  return row;
}

export async function checkinAdminReservation(
  reservationCode: string,
): Promise<CheckinReservationResult> {
  const res = await apiFetchAuthed<any>(
    `/admin/reservations/${encodeURIComponent(reservationCode)}/checkin`,
    {
      method: "POST",
    },
  );

  const reservation = normalizeReservationRow(res?.reservation);
  if (!reservation) throw new Error("INVALID_CHECKIN_RESERVATION_RESPONSE");

  return {
    reservation,
    sessionKey: toText(res?.sessionKey),
    tableId: res?.tableId != null ? res.tableId : null,
  };
}