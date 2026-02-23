import type { ITableReservationRepository } from "../../ports/repositories/ITableReservationRepository.js";

export class GetReservationAvailability {
  constructor(private reservationRepo: ITableReservationRepository) {}

  async execute(params: {
    areaName: string;
    partySize: number;
    reservedFrom: Date;
    reservedTo: Date;
  }) {
    const now = new Date();
    await this.reservationRepo.expirePending(now);
    return this.reservationRepo.getAvailability({ ...params, now });
  }
}
