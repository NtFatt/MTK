import type { ReservationStatus } from "../../../../domain/entities/TableReservation.js";
import type { ITableReservationRepository } from "../../../ports/repositories/ITableReservationRepository.js";

export class ListReservations {
  constructor(private reservationRepo: ITableReservationRepository) {}

  async execute(filter: {
    branchId?: string;
    status?: ReservationStatus;
    phone?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const now = new Date();
    await this.reservationRepo.expirePending(now);
    return this.reservationRepo.list(filter);
  }
}
