import type { ReservationStatus, TableReservation } from "../../../domain/entities/TableReservation.js";

export type ReservationAvailability = {
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

export type ReservationCreateInput = {
  areaName: string;
  partySize: number;
  contactPhone: string;
  contactName: string | null;
  note: string | null;
  reservedFrom: Date;
  reservedTo: Date;
  expiresAt: Date;
  tableId: string;
  tableCodeSnapshot: string;
  areaNameSnapshot: string;
};

export type ReservationListFilter = {
  branchId?: string;
  status?: ReservationStatus;
  phone?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

export interface ITableReservationRepository {
  /** Mark PENDING -> EXPIRED where expires_at <= now */
  expirePending(now: Date): Promise<number>;

  /** Availability (best-fit) */
  getAvailability(params: {
    areaName: string;
    partySize: number;
    reservedFrom: Date;
    reservedTo: Date;
    now: Date;
  }): Promise<ReservationAvailability>;

  /** Create a PENDING reservation (table already selected) */
  createPending(reservationCode: string, input: ReservationCreateInput): Promise<TableReservation>;

  findByCode(reservationCode: string): Promise<TableReservation | null>;

  cancelByCode(reservationCode: string, now: Date): Promise<TableReservation | null>;

  confirmByCode(reservationCode: string, adminId: string | null, now: Date): Promise<TableReservation | null>;

  markCheckedIn(reservationCode: string, sessionId: string, now: Date): Promise<TableReservation | null>;

  /** Mark CHECKED_IN -> COMPLETED by sessionId (used when closing session). Returns affected rows. */
  completeBySessionId(sessionId: string, now: Date): Promise<number>;

  /** True if there is any CONFIRMED reservation starting within [now, now + windowMinutes]. */
  hasConfirmedStartingSoon(tableId: string, now: Date, windowMinutes: number): Promise<boolean>;

  list(filter: ReservationListFilter): Promise<TableReservation[]>;
}
