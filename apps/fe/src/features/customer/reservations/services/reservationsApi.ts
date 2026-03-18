import { apiFetch } from "../../../../lib/apiFetch";

export type PublicReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELED"
  | "EXPIRED"
  | "CHECKED_IN"
  | "NO_SHOW"
  | "COMPLETED";

export type PublicReservationRow = {
  reservationId: string;
  reservationCode: string;
  status: PublicReservationStatus;
  tableId: string | null;
  tableCode: string | null;
  areaName: string | null;
  partySize: number;
  contactPhone: string | null;
  contactName: string | null;
  note: string | null;
  reservedFrom: string | null;
  reservedTo: string | null;
  expiresAt: string | null;
  confirmedAt: string | null;
  canceledAt: string | null;
  checkedInAt: string | null;
  sessionId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ReservationAvailabilityInput = {
  areaName: string;
  partySize: number;
  reservedFrom: string;
  reservedTo: string;
};

export type ReservationAvailabilityResult = {
  available: boolean;
  availableCount: number;
  suggestedTable: null | {
    tableId: string;
    branchId: string;
    tableCode: string;
    seats: number;
    areaName: string;
  };
};

export type CreateReservationInput = {
  areaName: string;
  partySize: number;
  contactPhone: string;
  contactName?: string | null;
  note?: string | null;
  reservedFrom: string;
  reservedTo: string;
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

function normalizeReservationRow(raw: any): PublicReservationRow | null {
  if (!raw || typeof raw !== "object") return null;

  const reservationCode = toText(raw.reservationCode ?? raw.code);
  if (!reservationCode) return null;

  return {
    reservationId: String(raw.reservationId ?? raw.id ?? reservationCode),
    reservationCode,
    status: String(raw.status ?? "PENDING") as PublicReservationStatus,
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
    canceledAt: toText(raw.canceledAt),
    checkedInAt: toText(raw.checkedInAt),
    sessionId: raw.sessionId != null ? String(raw.sessionId) : null,
    createdAt: toText(raw.createdAt),
    updatedAt: toText(raw.updatedAt),
  };
}

function normalizeAvailability(raw: any): ReservationAvailabilityResult {
  const suggested = raw?.suggestedTable && typeof raw.suggestedTable === "object"
    ? {
        tableId: String(raw.suggestedTable.tableId ?? ""),
        branchId: String(raw.suggestedTable.branchId ?? ""),
        tableCode: String(raw.suggestedTable.tableCode ?? ""),
        seats: toNum(raw.suggestedTable.seats, 0),
        areaName: String(raw.suggestedTable.areaName ?? ""),
      }
    : null;

  return {
    available: Boolean(raw?.available),
    availableCount: toNum(raw?.availableCount, 0),
    suggestedTable: suggested && suggested.tableId ? suggested : null,
  };
}

export async function getReservationAvailability(
  input: ReservationAvailabilityInput,
): Promise<ReservationAvailabilityResult> {
  const qs = new URLSearchParams();
  qs.set("areaName", input.areaName.trim());
  qs.set("partySize", String(input.partySize));
  qs.set("reservedFrom", input.reservedFrom);
  qs.set("reservedTo", input.reservedTo);

  const res = await apiFetch<unknown>(`/reservations/availability?${qs.toString()}`);
  return normalizeAvailability(res);
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<PublicReservationRow> {
  const res = await apiFetch<unknown>("/reservations", {
    method: "POST",
    body: JSON.stringify({
      areaName: input.areaName.trim(),
      partySize: input.partySize,
      contactPhone: input.contactPhone.trim(),
      contactName: input.contactName?.trim() || null,
      note: input.note?.trim() || null,
      reservedFrom: input.reservedFrom,
      reservedTo: input.reservedTo,
    }),
  });

  const row = normalizeReservationRow(res);
  if (!row) throw new Error("INVALID_CREATE_RESERVATION_RESPONSE");
  return row;
}

export async function getReservationByCode(
  reservationCode: string,
): Promise<PublicReservationRow> {
  const res = await apiFetch<unknown>(
    `/reservations/${encodeURIComponent(reservationCode)}`,
  );

  const row = normalizeReservationRow(res);
  if (!row) throw new Error("INVALID_GET_RESERVATION_RESPONSE");
  return row;
}

export async function cancelReservationByCode(
  reservationCode: string,
): Promise<PublicReservationRow> {
  const res = await apiFetch<unknown>(
    `/reservations/${encodeURIComponent(reservationCode)}/cancel`,
    {
      method: "POST",
    },
  );

  const row = normalizeReservationRow(res);
  if (!row) throw new Error("INVALID_CANCEL_RESERVATION_RESPONSE");
  return row;
}