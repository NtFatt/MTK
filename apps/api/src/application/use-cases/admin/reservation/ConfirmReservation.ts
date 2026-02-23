import type { ITableReservationRepository } from "../../../ports/repositories/ITableReservationRepository.js";
import type { ITableRepository } from "../../../ports/repositories/ITableRepository.js";
import type { IEventBus } from "../../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../../ports/events/NoopEventBus.js";
import { addMinutes } from "../../reservation/reservationTime.js";

export class ConfirmReservation {
  constructor(
    private reservationRepo: ITableReservationRepository,
    private tableRepo: ITableRepository,
    private lockAheadMinutes: number = 30,
    private eventBus: IEventBus = new NoopEventBus(),
  ) {}

  async execute(params: {
    reservationCode: string;
    adminId: string | null;
    actor: { actorType: "ADMIN" | "STAFF"; branchId: string | null };
  }) {
    const now = new Date();
    await this.reservationRepo.expirePending(now);

    // Branch-scope guard (pro-grade): STAFF tokens are restricted to their branch.
    const current = await this.reservationRepo.findByCode(params.reservationCode);
    if (!current) return null;

    const tableBefore = await this.tableRepo.findById(current.tableId);
    const branchIdBefore = tableBefore?.branchId ?? null;

    if (params.actor.actorType === "STAFF") {
      if (!params.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      if (!branchIdBefore || String(branchIdBefore) !== String(params.actor.branchId)) {
        throw new Error("FORBIDDEN");
      }
    }

    const updated = await this.reservationRepo.confirmByCode(params.reservationCode, params.adminId, now);
    if (!updated) return null;

    const table = tableBefore ?? (await this.tableRepo.findById(updated.tableId));
    const branchId = table?.branchId ?? null;

    // Policy: only set table RESERVED when start time is within <= lockAheadMinutes minutes (clean lifecycle).
    const withinWindow = updated.reservedFrom.getTime() <= addMinutes(now, this.lockAheadMinutes).getTime();
    if (withinWindow && table && table.status === "AVAILABLE") {
      await this.tableRepo.updateStatus(updated.tableId, "RESERVED");
    }

    await this.eventBus.publish({
      type: "reservation.status.changed",
      at: new Date().toISOString(),
      scope: { reservationId: updated.id, tableId: updated.tableId, branchId },
      payload: {
        reservationCode: updated.reservationCode,
        toStatus: updated.status,
        confirmedAt: updated.confirmedAt ? updated.confirmedAt.toISOString() : null,
        confirmedByAdminId: updated.confirmedByAdminId,
      },
    });

    return updated;
  }
}
