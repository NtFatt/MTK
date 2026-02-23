export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELED"
  | "EXPIRED"
  | "CHECKED_IN"
  | "NO_SHOW"
  | "COMPLETED";

export class TableReservation {
  constructor(
    public readonly id: string,
    public readonly reservationCode: string,
    public readonly tableId: string,
    public readonly tableCodeSnapshot: string,
    public readonly areaNameSnapshot: string,
    public readonly partySize: number,
    public readonly contactPhone: string,
    public readonly contactName: string | null,
    public readonly note: string | null,
    public readonly status: ReservationStatus,
    public readonly reservedFrom: Date,
    public readonly reservedTo: Date,
    public readonly expiresAt: Date | null,
    public readonly confirmedAt: Date | null,
    public readonly confirmedByAdminId: string | null,
    public readonly canceledAt: Date | null,
    public readonly checkedInAt: Date | null,
    public readonly sessionId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
