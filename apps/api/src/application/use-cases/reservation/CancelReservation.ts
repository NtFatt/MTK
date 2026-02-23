import type { ITableReservationRepository } from "../../ports/repositories/ITableReservationRepository.js";
import type { ITableRepository } from "../../ports/repositories/ITableRepository.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";

export class CancelReservation {
  constructor(
    private reservationRepo: ITableReservationRepository,
    private tableRepo: ITableRepository,
    private eventBus: IEventBus = new NoopEventBus(),
  ) {}

  async execute(reservationCode: string) {
    const now = new Date();
    await this.reservationRepo.expirePending(now);

    const r = await this.reservationRepo.cancelByCode(reservationCode, now);
    if (!r) return null;

    const table = await this.tableRepo.findById(r.tableId);
    const branchId = table?.branchId ?? null;

    await this.eventBus.publish({
      type: "reservation.status.changed",
      at: new Date().toISOString(),
      scope: { reservationId: r.id, tableId: r.tableId, branchId },
      payload: {
        reservationCode: r.reservationCode,
        toStatus: r.status,
        canceledAt: r.canceledAt ? r.canceledAt.toISOString() : null,
      },
    });

    return r;
  }
}
