import type { ITableReservationRepository } from "../../ports/repositories/ITableReservationRepository.js";

export class GetReservation {
  constructor(private reservationRepo: ITableReservationRepository) {}

  async execute(reservationCode: string) {
    const now = new Date();
    await this.reservationRepo.expirePending(now);
    return this.reservationRepo.findByCode(reservationCode);
  }
}
